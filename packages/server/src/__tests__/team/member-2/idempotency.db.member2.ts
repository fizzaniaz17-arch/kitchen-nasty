import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55432' || url.pathname !== '/kitchenasty_member2_test' || url.username !== 'member2') throw new Error('Idempotency tests require the dedicated Member 2 database');
const { createApp } = await import('../../../app.js');
const { generateToken } = await import('../../../middleware/auth.js');
const { default: db } = await import('../../../lib/db.js');
const { cleanupExpiredIdempotencyBatch, encryptLegacySnapshotsBatch } = await import('../../../lib/reservation-idempotency.js');
const app = createApp(), suffix = randomUUID();
const customers = [`idem-a-${suffix}`, `idem-b-${suffix}`], locationId = `idem-location-${suffix}`;
const tokens = customers.map(id => generateToken({ id, email: 'customer@example.test', type: 'customer' }));
const body = { locationId, date: '2099-06-15', time: '19:00', partySize: 4, comment: 'synthetic' };
const create = (customer: number, payload: object, key?: string) => {
  const result = request(app).post('/api/reservations').set('Authorization', `Bearer ${tokens[customer]}`);
  if (key !== undefined) result.set('Idempotency-Key', key);
  return result.send(payload);
};
const rows = () => db.reservation.findMany({ where: { customerId: { in: customers } }, orderBy: { id: 'asc' } });
const keys = () => db.reservationCreateRequest.findMany({ where: { customerId: { in: customers } }, orderBy: { id: 'asc' } });
beforeAll(async () => {
  await db.customer.createMany({ data: customers.map((id, index) => ({ id, email: `${suffix}-${index}@example.test`, name: 'Synthetic customer' })) });
  await db.location.create({ data: { id: locationId, name: 'Idempotency tests', slug: `idem-${suffix}`, address: 'Test', city: 'Test', postalCode: '00000' } });
});
beforeEach(async () => {
  await db.reservationCreateRequest.deleteMany({ where: { customerId: { in: customers } } });
  await db.reservation.deleteMany({ where: { customerId: { in: customers } } });
  await db.location.update({ where: { id: locationId }, data: { isActive: true } });
});
afterAll(async () => {
  await db.reservationCreateRequest.deleteMany({ where: { customerId: { in: customers } } });
  await db.reservation.deleteMany({ where: { customerId: { in: customers } } });
  await db.location.deleteMany({ where: { id: locationId } });
  await db.customer.deleteMany({ where: { id: { in: customers } } });
  await db.$disconnect();
});
describe('customer-scoped reservation idempotency', () => {
  it('replays identical sequential requests without modifying the booking or key', async () => {
    const first = await create(0, body, 'same-request');
    const beforeRows = await rows(), beforeKeys = await keys();
    const second = await create(0, body, 'same-request');
    expect([first.status, second.status]).toEqual([201, 201]);
    expect(second.body).toEqual(first.body);
    expect(beforeRows).toHaveLength(1); expect(beforeKeys).toHaveLength(1);
    expect(await rows()).toEqual(beforeRows); expect(await keys()).toEqual(beforeKeys);
  });
  it('serializes simultaneous retries at the PostgreSQL unique key', async () => {
    const responses = await Promise.all(Array.from({ length: 4 }, () => create(0, body, 'concurrent-request')));
    expect(responses.map(r => r.status)).toEqual([201, 201, 201, 201]);
    expect(new Set(responses.map(r => r.body.data.id)).size).toBe(1);
    expect(await rows()).toHaveLength(1); expect(await keys()).toHaveLength(1);
  });
  it('rejects reuse of a key with a different payload without mutation', async () => {
    expect((await create(0, body, 'payload-change')).status).toBe(201);
    const beforeRows = await rows(), beforeKeys = await keys();
    const conflict = await create(0, { ...body, partySize: 5 }, 'payload-change');
    expect(conflict.status).toBe(409); expect(conflict.body.error).toContain('different reservation details');
    expect(await rows()).toEqual(beforeRows); expect(await keys()).toEqual(beforeKeys);
  });
  it('allows exactly one winner when different payloads race for one key', async () => {
    const responses = await Promise.all([create(0, body, 'different-race'), create(0, { ...body, partySize: 5 }, 'different-race')]);
    expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
    const saved = await rows(); expect(saved).toHaveLength(1); expect(await keys()).toHaveLength(1);
    expect(saved[0].partySize).toBe(responses[0].status === 201 ? 4 : 5);
  });
  it('does not reserve a key for a rejected request', async () => {
    expect((await create(0, { ...body, partySize: 0 }, 'validation-retry')).status).toBe(400);
    expect(await rows()).toHaveLength(0); expect(await keys()).toHaveLength(0);
    expect((await create(0, body, 'validation-retry')).status).toBe(201);
    expect(await rows()).toHaveLength(1); expect(await keys()).toHaveLength(1);
  });
  it('scopes the same key to each authenticated customer', async () => {
    const first = await create(0, body, 'shared-name'), second = await create(1, body, 'shared-name');
    expect([first.status, second.status]).toEqual([201, 201]); expect(first.body.data.id).not.toBe(second.body.data.id);
    expect(await rows()).toHaveLength(2); expect(await keys()).toHaveLength(2);
  });
  it('retains separate bookings when keys are missing or distinct', async () => {
    const responses = await Promise.all([create(0, body), create(0, body), create(0, body, 'distinct-one'), create(0, body, 'distinct-two')]);
    expect(responses.map(r => r.status)).toEqual([201, 201, 201, 201]);
    expect(new Set(responses.map(r => r.body.data.id)).size).toBe(4);
    expect(await rows()).toHaveLength(4); expect(await keys()).toHaveLength(2);
  });
  it('replays the original result even if the booking or location later changes', async () => {
    const first = await create(0, body, 'durable-result');
    await db.reservation.update({ where: { id: first.body.data.id }, data: { time: '20:00' } });
    await db.location.update({ where: { id: locationId }, data: { isActive: false } });
    const beforeRows = await rows(), second = await create(0, body, 'durable-result');
    expect(second.status).toBe(201); expect(second.body).toEqual(first.body); expect(await rows()).toEqual(beforeRows);
  });
  it('rejects malformed keys without creating a reservation or key', async () => {
    const result = await create(0, body, 'bad key');
    expect(result.status).toBe(400); expect(await rows()).toHaveLength(0); expect(await keys()).toHaveLength(0);
  });
  it('stores encrypted snapshots and replays the original response', async () => {
    const first = await create(0, body, 'encrypted-snapshot');
    const stored = (await keys())[0];
    expect(first.status).toBe(201);
    expect(stored.response).toEqual(expect.objectContaining({ v: 1, alg: 'A256GCM', kid: 'member2-test' }));
    expect(JSON.stringify(stored.response)).not.toContain('customer@example.test');
    expect(JSON.stringify(stored.response)).not.toContain(first.body.data.id);
    const [{ now }] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    expect(stored.expiresAt.getTime() - now.getTime()).toBeGreaterThan(24 * 60 * 60 * 1000 - 10000);
    expect(stored.expiresAt.getTime() - now.getTime()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    expect((await create(0, body, 'encrypted-snapshot')).body).toEqual(first.body);
  });
  it('fails closed if an encrypted snapshot is tampered with', async () => {
    expect((await create(0, body, 'tampered-snapshot')).status).toBe(201);
    const stored = (await keys())[0];
    const envelope = stored.response as { ciphertext: string };
    const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
    ciphertext[0] ^= 1;
    await db.reservationCreateRequest.update({ where: { id: stored.id }, data: { response: { ...envelope, ciphertext: ciphertext.toString('base64') } } });
    const before = await rows();
    expect((await create(0, body, 'tampered-snapshot')).status).toBe(500);
    expect(await rows()).toEqual(before);
  });
  it('rolls back the booking when encryption keys are unavailable', async () => {
    const original = process.env.IDEMPOTENCY_ENCRYPTION_KEYS;
    try {
      delete process.env.IDEMPOTENCY_ENCRYPTION_KEYS;
      expect((await create(0, body, 'missing-encryption-key')).status).toBe(500);
      expect(await rows()).toHaveLength(0); expect(await keys()).toHaveLength(0);
    } finally { process.env.IDEMPOTENCY_ENCRYPTION_KEYS = original; }
  });
  it('preserves and encrypts an unexpired legacy plaintext snapshot on replay', async () => {
    const first = await create(0, body, 'legacy-snapshot');
    await db.reservationCreateRequest.updateMany({ where: { customerId: customers[0] }, data: { response: first.body.data, responseEncrypted: false } });
    const replay = await create(0, body, 'legacy-snapshot');
    expect(replay.status).toBe(201); expect(replay.body).toEqual(first.body);
    expect((await keys())[0].response).toEqual(expect.objectContaining({ alg: 'A256GCM' }));
  });
  it('encrypts legacy snapshots in bounded batches without changing the replay', async () => {
    const first = await create(0, body, 'legacy-batch');
    await db.reservationCreateRequest.updateMany({ where: { customerId: customers[0] }, data: { response: first.body.data, responseEncrypted: false } });
    expect(await encryptLegacySnapshotsBatch(1)).toBe(1);
    expect(await encryptLegacySnapshotsBatch(1)).toBe(0);
    expect((await keys())[0].responseEncrypted).toBe(true);
    expect((await create(0, body, 'legacy-batch')).body).toEqual(first.body);
  });
  it('replays with a retained old key during encryption-key rotation', async () => {
    const originalKeys = process.env.IDEMPOTENCY_ENCRYPTION_KEYS!;
    const originalId = process.env.IDEMPOTENCY_ACTIVE_KEY_ID!;
    try {
      const first = await create(0, body, 'rotation');
      process.env.IDEMPOTENCY_ENCRYPTION_KEYS = JSON.stringify({ ...JSON.parse(originalKeys), rotated: randomBytes(32).toString('base64') });
      process.env.IDEMPOTENCY_ACTIVE_KEY_ID = 'rotated';
      expect((await create(0, body, 'rotation')).body).toEqual(first.body);
      expect((await create(0, body, 'rotation-new')).status).toBe(201);
      expect((await keys()).map(row => (row.response as { kid: string }).kid)).toEqual(expect.arrayContaining(['member2-test', 'rotated']));
    } finally {
      process.env.IDEMPOTENCY_ENCRYPTION_KEYS = originalKeys;
      process.env.IDEMPOTENCY_ACTIVE_KEY_ID = originalId;
    }
  });
  it('replays before expiry and creates a new booking at or after expiry', async () => {
    const first = await create(0, body, 'expiry-boundary');
    await db.$executeRaw`UPDATE "reservation_create_requests" SET "expiresAt" = clock_timestamp() + interval '30 seconds' WHERE "customerId" = ${customers[0]}`;
    expect((await create(0, body, 'expiry-boundary')).body).toEqual(first.body);
    await db.$executeRaw`UPDATE "reservation_create_requests" SET "expiresAt" = clock_timestamp() WHERE "customerId" = ${customers[0]}`;
    const after = await create(0, body, 'expiry-boundary');
    expect(after.status).toBe(201); expect(after.body.data.id).not.toBe(first.body.data.id);
    expect(await rows()).toHaveLength(2); expect(await keys()).toHaveLength(1);
  });
  it('serializes simultaneous reuse of an expired key', async () => {
    const first = await create(0, body, 'expired-race');
    await db.$executeRaw`UPDATE "reservation_create_requests" SET "expiresAt" = clock_timestamp() - interval '1 second' WHERE "customerId" = ${customers[0]}`;
    const responses = await Promise.all(Array.from({ length: 4 }, () => create(0, body, 'expired-race')));
    expect(responses.map(r => r.status)).toEqual([201, 201, 201, 201]);
    expect(new Set(responses.map(r => r.body.data.id)).size).toBe(1);
    expect(responses[0].body.data.id).not.toBe(first.body.data.id);
    expect(await rows()).toHaveLength(2); expect(await keys()).toHaveLength(1);
  });
  it('skips an expired snapshot locked by an active transaction, then cleans it', async () => {
    expect((await create(0, body, 'cleanup-lock')).status).toBe(201);
    await db.$executeRaw`UPDATE "reservation_create_requests" SET "expiresAt" = clock_timestamp() - interval '1 second' WHERE "customerId" = ${customers[0]}`;
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "reservation_create_requests" WHERE "customerId" = ${customers[0]} FOR UPDATE`;
      await cleanupExpiredIdempotencyBatch();
      expect(await tx.reservationCreateRequest.count({ where: { customerId: customers[0] } })).toBe(1);
    });
    expect(await cleanupExpiredIdempotencyBatch()).toBeGreaterThanOrEqual(1);
    expect(await keys()).toHaveLength(0); expect(await rows()).toHaveLength(1);
  });
  it('deletes replay snapshots when their customer is deleted', async () => {
    const id = `idem-deletion-${randomUUID()}`;
    await db.customer.create({ data: { id, email: `${id}@example.test`, name: 'Synthetic customer' } });
    try {
      const token = generateToken({ id, email: `${id}@example.test`, type: 'customer' });
      const response = await request(app).post('/api/reservations').set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', 'deletion-test').send(body);
      expect(response.status).toBe(201);
      expect(await db.reservationCreateRequest.count({ where: { customerId: id } })).toBe(1);
      // Existing reservation foreign keys must be handled before customer deletion.
      await db.reservation.deleteMany({ where: { customerId: id } });
      await db.customer.delete({ where: { id } });
      expect(await db.reservationCreateRequest.count({ where: { customerId: id } })).toBe(0);
      expect((await request(app).get('/api/reservations/my-reservations').set('Authorization', `Bearer ${token}`)).status).toBe(401);
      expect((await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({})).status).toBe(401);
    } finally {
      await db.reservation.deleteMany({ where: { customerId: id } });
      await db.customer.deleteMany({ where: { id } });
    }
  });
  it('accepts valid customer and staff tokens and rejects invalid or expired tokens', async () => {
    expect((await request(app).get('/api/reservations/my-reservations').set('Authorization', `Bearer ${tokens[0]}`)).status).toBe(200);
    const staff = generateToken({ id: 'synthetic-staff', email: 'staff@example.test', type: 'staff', role: 'STAFF' });
    expect((await request(app).get('/api/reservations').set('Authorization', `Bearer ${staff}`)).status).toBe(200);
    expect((await request(app).get('/api/reservations/my-reservations').set('Authorization', 'Bearer invalid')).status).toBe(401);
    const expired = jwt.sign({ id: customers[0], email: 'customer@example.test', type: 'customer' }, process.env.JWT_SECRET!, { expiresIn: -1 });
    expect((await request(app).get('/api/reservations/my-reservations').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
  });
});
