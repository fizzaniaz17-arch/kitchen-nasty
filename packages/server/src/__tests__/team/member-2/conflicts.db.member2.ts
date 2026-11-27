import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55432' || url.pathname !== '/kitchenasty_member2_test' || url.username !== 'member2') {
  throw new Error('Conflict tests require the dedicated Member 2 PostgreSQL database');
}
const { createApp } = await import('../../../app.js');
const { generateToken } = await import('../../../middleware/auth.js');
const { default: db } = await import('../../../lib/db.js');
const app = createApp(), suffix = randomUUID();
const customerId = `conflict-customer-${suffix}`, locationId = `conflict-location-${suffix}`;
const tableId = `conflict-table-${suffix}`, otherTableId = `conflict-other-${suffix}`;
const token = generateToken({ id: `conflict-staff-${suffix}`, email: 'staff@example.test', type: 'staff', role: 'STAFF' });
const patch = (id: string, body: unknown) => request(app).patch(`/api/reservations/${id}`).set('Authorization', `Bearer ${token}`).send(body);
const base = (extra: Record<string, unknown> = {}) => ({ customerId, locationId, date: new Date('2099-06-15'), time: '19:00', partySize: 4, ...extra });
const read = () => db.reservation.findMany({ where: { customerId }, orderBy: { id: 'asc' } });

beforeAll(async () => {
  await db.customer.create({ data: { id: customerId, email: `${suffix}@example.test`, name: 'Synthetic customer' } });
  await db.location.create({ data: { id: locationId, name: 'Conflict tests', slug: `conflict-${suffix}`, address: 'Test', city: 'Test', postalCode: '00000' } });
  await db.table.createMany({ data: [{ id: tableId, locationId, name: 'T1', capacity: 4 }, { id: otherTableId, locationId, name: 'T2', capacity: 4 }] });
});
beforeEach(async () => { await db.reservation.deleteMany({ where: { customerId } }); });
afterAll(async () => {
  await db.reservation.deleteMany({ where: { customerId } });
  await db.table.deleteMany({ where: { locationId } });
  await db.location.deleteMany({ where: { id: locationId } });
  await db.customer.deleteMany({ where: { id: customerId } });
  await db.$disconnect();
});

describe('Issue 20 exact-slot conflicts and persistence', () => {
  it('rejects the second sequential assignment without altering either persisted row', async () => {
    const a = await db.reservation.create({ data: base() }), b = await db.reservation.create({ data: base() });
    expect((await patch(a.id, { tableId })).status).toBe(200);
    const before = await read(), response = await patch(b.id, { tableId }), after = await read();
    console.log(JSON.stringify({ scenario: 'sequential', status: response.status, before, after }));
    expect(response.status).toBe(409); expect(response.body).toEqual({ success: false, error: 'Table is already reserved for this slot' });
    expect(after).toEqual(before);
  });
  it('serializes simultaneous requests so exactly one assignment succeeds', async () => {
    const a = await db.reservation.create({ data: base() }), b = await db.reservation.create({ data: base() });
    const before = await read();
    const responses = await Promise.all([patch(a.id, { tableId }), patch(b.id, { tableId })]);
    const after = await read();
    console.log(JSON.stringify({ scenario: 'concurrent', statuses: responses.map(r => r.status), before, after }));
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect(after.filter(r => r.tableId === tableId)).toHaveLength(1);
    const rejectedId = responses[0].status === 409 ? a.id : b.id;
    expect(after.find(r => r.id === rejectedId)).toEqual(before.find(r => r.id === rejectedId));
  });
  it('rejects concurrent opposite table swaps without deadlock or mutation', async () => {
    const a = await db.reservation.create({ data: base({ tableId }) });
    const b = await db.reservation.create({ data: base({ tableId: otherTableId }) });
    const before = await read();
    const responses = await Promise.all([patch(a.id, { tableId: otherTableId }), patch(b.id, { tableId })]);
    expect(responses.map(response => response.status)).toEqual([409, 409]);
    expect(await read()).toEqual(before);
  });
  it('serializes two requests that are both waiting on the same table lock', async () => {
    const a = await db.reservation.create({ data: base() }), b = await db.reservation.create({ data: base() });
    const before = await read();
    let requests: Promise<request.Response[]> | undefined;
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "tables" WHERE "id" = ${tableId} FOR UPDATE`;
      requests = Promise.all([patch(a.id, { tableId }), patch(b.id, { tableId })]);
      let waiting = 0;
      for (let attempt = 0; attempt < 100 && waiting < 2; attempt++) {
        const rows = await db.$queryRaw<Array<{ waiting: number }>>`SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%FROM "tables"%FOR UPDATE%'`;
        waiting = rows[0].waiting;
        if (waiting < 2) await new Promise(resolve => setTimeout(resolve, 50));
      }
      expect(waiting).toBeGreaterThanOrEqual(2);
    }, { timeout: 12000 });
    const responses = await requests!;
    const after = await read();
    console.log(JSON.stringify({ scenario: 'forced-table-lock-contention', statuses: responses.map(r => r.status), before, after }));
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect(after.filter(r => r.tableId === tableId)).toHaveLength(1);
    const rejectedId = responses[0].status === 409 ? a.id : b.id;
    expect(after.find(r => r.id === rejectedId)).toEqual(before.find(r => r.id === rejectedId));
  });
  it('allows different tables at the same slot and the same table at a different time', async () => {
    await db.reservation.create({ data: base({ tableId }) });
    const other = await db.reservation.create({ data: base() });
    const later = await db.reservation.create({ data: base({ time: '19:30' }) });
    expect((await patch(other.id, { tableId: otherTableId })).status).toBe(200);
    expect((await patch(later.id, { tableId })).status).toBe(200);
    expect((await read()).filter(r => r.tableId !== null)).toHaveLength(3);
  });
  it.each([
    ['time', { time: '18:00' }, { time: '19:00' }],
    ['date', { date: new Date('2099-06-16') }, { date: '2099-06-15' }],
  ])('rejects moving by %s into an occupied slot without mutation', async (_field, initial, change) => {
    await db.reservation.create({ data: base({ tableId }) });
    const row = await db.reservation.create({ data: base({ tableId, ...initial }) });
    const before = await read(), response = await patch(row.id, change), after = await read();
    expect(response.status).toBe(409); expect(after).toEqual(before);
  });
  it('excludes the reservation itself and permits a non-conflicting date update', async () => {
    const row = await db.reservation.create({ data: base({ tableId }) });
    expect((await patch(row.id, { tableId })).status).toBe(200);
    expect((await patch(row.id, { date: '2099-06-16' })).status).toBe(200);
    expect((await db.reservation.findUniqueOrThrow({ where: { id: row.id } })).date.toISOString().slice(0, 10)).toBe('2099-06-16');
  });
  it.each([
    ['PENDING', true], ['CONFIRMED', true], ['SEATED', true], ['COMPLETED', false], ['CANCELLED', false],
  ] as const)('uses %s occupancy consistently for assignment and availability', async (status, occupies) => {
    const existing = await db.reservation.create({ data: base({ tableId, status }) });
    const row = await db.reservation.create({ data: base() });
    const availability = await request(app).get('/api/reservations/availability').query({ locationId, date: '2099-06-15', partySize: 4 });
    // Both tables are eligible: occupy the other table in the same slot so the result depends on T1.
    await db.reservation.create({ data: base({ tableId: otherTableId }) });
    const constrained = await request(app).get('/api/reservations/availability').query({ locationId, date: '2099-06-15', partySize: 4 });
    expect(availability.status).toBe(200); expect(constrained.status).toBe(200);
    expect(constrained.body.data.slots.find((slot: { time: string }) => slot.time === '19:00').available).toBe(!occupies);
    const before = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
    const response = await patch(row.id, { tableId });
    expect(response.status).toBe(occupies ? 409 : 200);
    const after = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
    if (occupies) expect(after).toEqual(before); else expect(after.tableId).toBe(tableId);
    expect(await db.reservation.findUniqueOrThrow({ where: { id: existing.id } })).toEqual(existing);
  });
  it('serializes concurrent reactivation and assignment for the same slot', async () => {
    const released = await db.reservation.create({ data: base({ tableId, status: 'CANCELLED' }) });
    const next = await db.reservation.create({ data: base() });
    const before = await read();
    const responses = await Promise.all([patch(released.id, { status: 'CONFIRMED' }), patch(next.id, { tableId })]);
    const after = await read();
    console.log(JSON.stringify({ scenario: 'reactivation-vs-assignment', statuses: responses.map(r => r.status), before, after }));
    expect(responses.map(r => r.status)).toEqual([409, 200]);
    expect(after.filter(r => r.tableId === tableId && ['PENDING', 'CONFIRMED', 'SEATED'].includes(r.status))).toHaveLength(1);
    const rejectedId = responses[0].status === 409 ? released.id : next.id;
    expect(after.find(r => r.id === rejectedId)).toEqual(before.find(r => r.id === rejectedId));
  });
  it('releases a completed slot and rejects reactivation when the slot is taken', async () => {
    const original = await db.reservation.create({ data: base({ tableId, status: 'SEATED' }) });
    expect((await patch(original.id, { status: 'COMPLETED' })).status).toBe(200);
    const next = await db.reservation.create({ data: base() });
    expect((await patch(next.id, { tableId })).status).toBe(200);
    const before = await read(), result = await patch(original.id, { status: 'CONFIRMED' });
    expect(result.status).toBe(409); expect(await read()).toEqual(before);
  });
});
