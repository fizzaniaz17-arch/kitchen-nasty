import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from './db.js';
import { decryptSnapshot, encryptSnapshot, isEncryptedSnapshot } from './idempotency-crypto.js';

type Booking = { locationId: string; date: string; time: string; partySize: number; comment?: string };
type Result = { kind: 'created'; data: unknown } | { kind: 'replay'; data: unknown } | { kind: 'invalid'; message: string } | { kind: 'conflict'; message: string };

export async function createIdempotentReservation(customerId: string, key: string, booking: Booking): Promise<Result> {
  const keyHash = createHash('sha256').update(key).digest('hex');
  const payloadHash = createHash('sha256').update(JSON.stringify({ ...booking, comment: booking.comment ?? null })).digest('hex');
  const context = JSON.stringify([customerId, keyHash, payloadHash]);
  const attempt = (): Promise<Result> => prisma.$transaction<Result>(async (tx) => {
    // Advisory locks also serialize requests when no idempotency row exists yet.
    const lockKey = createHash('sha256').update(JSON.stringify([customerId, keyHash])).digest('hex');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
    await tx.$queryRaw`SELECT "id" FROM "reservation_create_requests" WHERE "customerId" = ${customerId} AND "keyHash" = ${keyHash} FOR UPDATE`;
    const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const where = { customerId_keyHash: { customerId, keyHash } };
    const previous = await tx.reservationCreateRequest.findUnique({ where });
    if (previous && previous.expiresAt > clock.now) {
      if (previous.payloadHash !== payloadHash) return { kind: 'conflict', message: 'Idempotency key already used for different reservation details' };
      if (previous.response === null) throw new Error('Stored idempotency response is unavailable');
      if (previous.responseEncrypted && !isEncryptedSnapshot(previous.response)) throw new Error('Invalid encrypted idempotency response');
      const data = previous.responseEncrypted && isEncryptedSnapshot(previous.response) ? decryptSnapshot(previous.response, context) : previous.response;
      // Pre-upgrade plaintext remains replayable and is encrypted on first successful access.
      if (!previous.responseEncrypted) await tx.reservationCreateRequest.update({ where, data: { response: encryptSnapshot(data, context), responseEncrypted: true } });
      return { kind: 'replay', data };
    }
    if (previous) await tx.reservationCreateRequest.delete({ where });
    if (booking.date < clock.now.toISOString().slice(0, 10)) return { kind: 'invalid', message: 'Cannot reserve in the past' };
    const location = await tx.location.findUnique({ where: { id: booking.locationId } });
    if (!location || !location.isActive) return { kind: 'invalid', message: 'Location not found or inactive' };
    const expiresAt = new Date(clock.now.getTime() + 24 * 60 * 60 * 1000);
    await tx.reservationCreateRequest.create({ data: { customerId, keyHash, payloadHash, expiresAt } });
    const data = await tx.reservation.create({
      data: { ...booking, customerId, date: new Date(booking.date) },
      include: { location: { select: { id: true, name: true } }, customer: { select: { id: true, name: true, email: true } }, table: true },
    });
    await tx.reservationCreateRequest.update({ where, data: { response: encryptSnapshot(data, context), responseEncrypted: true } });
    return { kind: 'created', data };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  try { return await attempt(); }
  catch (error) {
    // A writer outside the advisory-lock protocol can still win the unique key race.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return attempt();
    throw error;
  }
}

export async function cleanupExpiredIdempotencyBatch(limit = 500): Promise<number> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Cleanup batch size must be between 1 and 1000');
  return prisma.$executeRaw`DELETE FROM "reservation_create_requests" WHERE "id" IN (
    SELECT "id" FROM "reservation_create_requests" WHERE "expiresAt" <= clock_timestamp()
    ORDER BY "expiresAt", "id" FOR UPDATE SKIP LOCKED LIMIT ${limit}
  )`;
}

export async function encryptLegacySnapshotsBatch(limit = 500): Promise<number> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Encryption batch size must be between 1 and 1000');
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; customerId: string; keyHash: string; payloadHash: string; response: Prisma.JsonValue }[]>`
      SELECT "id", "customerId", "keyHash", "payloadHash", "response"
      FROM "reservation_create_requests"
      WHERE NOT "responseEncrypted" AND "response" IS NOT NULL AND "expiresAt" > clock_timestamp()
      ORDER BY "id" FOR UPDATE SKIP LOCKED LIMIT ${limit}`;
    for (const row of rows) {
      const context = JSON.stringify([row.customerId, row.keyHash, row.payloadHash]);
      await tx.reservationCreateRequest.update({ where: { id: row.id }, data: { response: encryptSnapshot(row.response, context), responseEncrypted: true } });
    }
    return rows.length;
  });
}
