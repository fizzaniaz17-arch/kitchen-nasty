import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55432' || url.pathname !== '/kitchenasty_member2_test' || url.username !== 'member2') throw new Error('Idempotency tests require the dedicated Member 2 database');
const { createApp } = await import('../../../app.js');
const { generateToken } = await import('../../../middleware/auth.js');
const { default: db } = await import('../../../lib/db.js');
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
});
