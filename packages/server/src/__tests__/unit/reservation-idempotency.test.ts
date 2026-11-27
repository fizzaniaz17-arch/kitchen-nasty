import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';

vi.mock('../../lib/db.js', () => {
  const db = {
    $transaction: vi.fn(), $queryRaw: vi.fn(), $executeRaw: vi.fn(),
    reservationCreateRequest: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { create: vi.fn() }, location: { findUnique: vi.fn() },
  };
  db.$transaction.mockImplementation(async (callback: (tx: typeof db) => unknown) => callback(db));
  return { default: db };
});
import prisma from '../../lib/db.js';
import { cleanupExpiredIdempotencyBatch, createIdempotentReservation, encryptLegacySnapshotsBatch } from '../../lib/reservation-idempotency.js';

const db = vi.mocked(prisma, true);
const booking = { locationId: 'location', date: '2099-06-15', time: '19:00', partySize: 2 };
const hash = createHash('sha256').update(JSON.stringify({ ...booking, comment: null })).digest('hex');
const keyHash = createHash('sha256').update('retry').digest('hex');
const row = { id: 'key-row', customerId: 'customer', keyHash, payloadHash: hash, response: { id: 'booking' }, responseEncrypted: false, expiresAt: new Date('2099-01-01'), createdAt: new Date() };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.IDEMPOTENCY_ACTIVE_KEY_ID = 'test';
  process.env.IDEMPOTENCY_ENCRYPTION_KEYS = JSON.stringify({ test: randomBytes(32).toString('base64') });
  db.$queryRaw.mockImplementation(((sql: TemplateStringsArray) => {
    const text = sql.join('');
    return Promise.resolve(text.includes('AS active') ? [{ active: true }] : text.includes('clock_timestamp') ? [{ now: new Date('2026-01-01') }] : []);
  }) as never);
  db.$executeRaw.mockResolvedValue(1);
  db.reservationCreateRequest.findUnique.mockResolvedValue(null);
  db.location.findUnique.mockResolvedValue({ id: 'location', isActive: true } as never);
  db.reservation.create.mockResolvedValue({ id: 'booking' } as never);
});

describe('customer-scoped idempotency transaction', () => {
  it('creates one booking and encrypts the stored snapshot', async () => {
    expect(await createIdempotentReservation('customer', 'retry', booking)).toEqual({ kind: 'created', data: { id: 'booking' } });
    expect(db.reservationCreateRequest.create).toHaveBeenCalledOnce();
    expect(db.reservationCreateRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ responseEncrypted: true }) }));
  });
  it('replays and encrypts a legacy snapshot without creating another booking', async () => {
    db.reservationCreateRequest.findUnique.mockResolvedValueOnce(row as never);
    expect(await createIdempotentReservation('customer', 'retry', booking)).toEqual({ kind: 'replay', data: { id: 'booking' } });
    expect(db.reservation.create).not.toHaveBeenCalled();
  });
  it('rejects a different payload and a missing snapshot', async () => {
    db.reservationCreateRequest.findUnique.mockResolvedValueOnce({ ...row, payloadHash: 'different' } as never);
    expect((await createIdempotentReservation('customer', 'retry', booking)).kind).toBe('conflict');
    db.reservationCreateRequest.findUnique.mockResolvedValueOnce({ ...row, response: null } as never);
    await expect(createIdempotentReservation('customer', 'retry', booking)).rejects.toThrow('unavailable');
  });
  it('fails closed for malformed encrypted snapshots and missing locked rows', async () => {
    db.reservationCreateRequest.findUnique.mockResolvedValueOnce({ ...row, responseEncrypted: true } as never);
    await expect(createIdempotentReservation('customer', 'retry', booking)).rejects.toThrow('Invalid encrypted');
    db.reservationCreateRequest.findUnique.mockResolvedValueOnce(row as never);
    db.$queryRaw.mockImplementation(((sql: TemplateStringsArray) => Promise.resolve(sql.join('').includes('AS active') ? [] : sql.join('').includes('clock_timestamp') ? [{ now: new Date('2026-01-01') }] : [])) as never);
    await expect(createIdempotentReservation('customer', 'retry', booking)).rejects.toThrow('Locked idempotency record');
  });
  it('replaces an expired key and rejects inactive locations or past dates', async () => {
    db.reservationCreateRequest.findUnique.mockResolvedValueOnce(row as never);
    db.$queryRaw.mockImplementation(((sql: TemplateStringsArray) => Promise.resolve(sql.join('').includes('AS active') ? [{ active: false }] : sql.join('').includes('clock_timestamp') ? [{ now: new Date('2026-01-01') }] : [])) as never);
    expect((await createIdempotentReservation('customer', 'retry', booking)).kind).toBe('created');
    expect(db.reservationCreateRequest.delete).toHaveBeenCalledOnce();
    db.location.findUnique.mockResolvedValueOnce(null);
    expect((await createIdempotentReservation('customer', 'other', booking)).kind).toBe('invalid');
    expect((await createIdempotentReservation('customer', 'other', { ...booking, date: '2020-01-01' })).kind).toBe('invalid');
  });
  it('retries a unique-key race and propagates unrelated database failures', async () => {
    db.reservationCreateRequest.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('collision', { code: 'P2002', clientVersion: '5.22.0' }));
    db.reservationCreateRequest.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(row as never);
    expect((await createIdempotentReservation('customer', 'retry', booking)).kind).toBe('replay');
    db.reservationCreateRequest.create.mockRejectedValueOnce(new Error('synthetic failure'));
    await expect(createIdempotentReservation('customer', 'other', booking)).rejects.toThrow('synthetic failure');
  });
  it('bounds maintenance batches and encrypts selected legacy records', async () => {
    await expect(cleanupExpiredIdempotencyBatch(0)).rejects.toThrow('batch size');
    await expect(encryptLegacySnapshotsBatch(1001)).rejects.toThrow('batch size');
    expect(await cleanupExpiredIdempotencyBatch(1)).toBe(1);
    db.$queryRaw.mockResolvedValueOnce([row] as never);
    expect(await encryptLegacySnapshotsBatch(1)).toBe(1);
    expect(db.reservationCreateRequest.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: row.id }, data: expect.objectContaining({ responseEncrypted: true }) }));
  });
});
