import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Fail closed before importing the app or creating a Prisma client.
const dbUrl = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (!['127.0.0.1', 'localhost'].includes(dbUrl.hostname) || dbUrl.port !== '55432' || dbUrl.pathname !== '/kitchenasty_member2_test' || dbUrl.username !== 'member2') {
  throw new Error('Member 2 tests require the dedicated local kitchenasty_member2_test database on port 55432');
}

const { createApp } = await import('../../../app.js');
const { generateToken } = await import('../../../middleware/auth.js');
const { default: db } = await import('../../../lib/db.js');
const app = createApp();
const suffix = randomUUID();
const customerId = `m2-customer-${suffix}`;
const locationId = `m2-location-${suffix}`;
const tableId = `m2-table-${suffix}`;
const customer = generateToken({ id: customerId, email: 'customer@example.test', type: 'customer' });
const staff = generateToken({ id: `m2-staff-${suffix}`, email: 'staff@example.test', type: 'staff', role: 'STAFF' });
const manager = generateToken({ id: `m2-manager-${suffix}`, email: 'manager@example.test', type: 'staff', role: 'MANAGER' });
const superAdmin = generateToken({ id: `m2-admin-${suffix}`, email: 'admin@example.test', type: 'staff', role: 'SUPER_ADMIN' });
const auth = (token: string) => `Bearer ${token}`;
const base = () => ({ locationId, date: '2099-06-15', time: '19:00', partySize: 4, comment: 'synthetic' });
const generated = JSON.parse(readFileSync(resolve(process.cwd(), '../../tests/team/member-2/generated/ep-bva-cases.json'), 'utf8')) as Array<{ id: string; method: string; path: string; field: string; value: unknown; valid: boolean; omitted: boolean; location?: 'path' | 'query' | 'business' | 'relative-date' | 'body'; extendValidBody?: boolean; partition: string; isolated?: boolean }>;
const spec = JSON.parse(readFileSync(resolve(process.cwd(), '../../tests/team/member-2/reservations.openapi.json'), 'utf8'));
const validator = new Ajv({ strict: false, allErrors: true });
addFormats(validator);
const responseValidators = new Map<string, ReturnType<typeof validator.compile>>();
function checkResponse(method: string, path: string, status: number, body: unknown) {
  const key = `${method}:${path}:${status}`;
  const response = spec.paths[path]?.[method]?.responses?.[String(status)];
  const schema = response?.content?.['application/json']?.schema;
  if (!schema) throw new Error(`No documented response schema for ${key}`);
  if (!responseValidators.has(key)) responseValidators.set(key, validator.compile({ ...schema, components: spec.components }));
  const validate = responseValidators.get(key)!;
  const valid = validate(body);
  expect(valid, `${key}: ${JSON.stringify(validate.errors)}`).toBe(true);
}

beforeAll(async () => {
  await db.customer.create({ data: { id: customerId, email: `${suffix}@example.test`, name: 'Synthetic customer' } });
  await db.location.create({ data: { id: locationId, name: 'Member 2 test', slug: `m2-${suffix}`, address: 'Test', city: 'Test', postalCode: '00000' } });
  await db.table.create({ data: { id: tableId, locationId, name: 'T1', capacity: 4 } });
});
beforeEach(async () => {
  await db.reservation.deleteMany({ where: { customerId } });
  await db.table.deleteMany({ where: { locationId, id: { not: tableId } } });
  await db.table.update({ where: { id: tableId }, data: { name: 'T1', capacity: 4, isActive: true } });
});
afterAll(async () => {
  await db.reservation.deleteMany({ where: { customerId } });
  await db.table.deleteMany({ where: { locationId } });
  await db.location.deleteMany({ where: { id: locationId } });
  await db.customer.deleteMany({ where: { id: customerId } });
  await db.$disconnect();
});

describe('generated reservation creation cases against PostgreSQL', () => {
  const cases = generated.filter(c => !c.location && c.method === 'post' && c.path === '/reservations' && c.field !== 'locationId');
  it.each(cases.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const body: Record<string, unknown> = base();
    if (c.omitted) delete body[c.field]; else body[c.field] = c.value;
    const response = await request(app).post('/api/reservations').set('Authorization', auth(customer)).send(body);
    expect(response.status).toBe(c.valid ? 201 : 400);
    checkResponse('post', '/reservations', response.status, response.body);
    const records = await db.reservation.findMany({ where: { customerId } });
    expect(records).toHaveLength(c.valid ? 1 : 0);
    if (c.valid) expect(records[0].id).toBe(response.body.data.id);
  });
});

describe('generated calendar and clock business boundaries', () => {
  const cases = generated.filter(c => c.location === 'business');
  it.each(cases.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const initial = c.method === 'patch' ? await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } }) : null;
    const body: Record<string, unknown> = c.method === 'post' ? base() : {};
    body[c.field] = c.value;
    const url = c.method === 'post' ? '/api/reservations' : `/api/reservations/${initial!.id}`;
    const result = await request(app)[c.method as 'post' | 'patch'](url).set('Authorization', auth(c.method === 'post' ? customer : staff)).send(body);
    const rows = await db.reservation.findMany({ where: { customerId } });
    console.log(JSON.stringify({ caseId: c.id, expected: c.valid ? 'success' : '4xx and no mutation', observedStatus: result.status, rows: rows.length, persistedValue: rows[0] ? (rows[0] as unknown as Record<string, unknown>)[c.field] : null }));
    if (c.valid) {
      expect(result.status).toBe(c.method === 'post' ? 201 : 200);
      expect(rows).toHaveLength(1);
      expect((rows[0] as unknown as Record<string, unknown>)[c.field]).toEqual(c.value);
    } else {
      expect.soft(result.status).toBeGreaterThanOrEqual(400);
      expect.soft(result.status).toBeLessThan(500);
      if (initial) expect.soft(rows[0]).toEqual(initial); else expect.soft(rows).toHaveLength(0);
    }
  });
});

describe('generated location identifier body cases', () => {
  const cases = generated.filter(c => !c.location && c.method === 'post' && c.path === '/reservations' && c.field === 'locationId');
  it.each(cases.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const body: Record<string, unknown> = base();
    if (c.omitted) delete body.locationId; else body.locationId = c.value;
    let createdLocation = false;
    try {
      if (c.valid) {
        // The boundary cases are exactly one and two characters long. Fail if
        // an existing record uses the ID; never delete someone else's data.
        const id = String(c.value);
        if (await db.location.findUnique({ where: { id } })) throw new Error('Boundary fixture ID already exists');
        await db.location.create({ data: { id, name: 'Boundary fixture', slug: `m2-boundary-${randomUUID()}`, address: 'Test', city: 'Test', postalCode: '00000' } });
        createdLocation = true;
      }
      const result = await request(app).post('/api/reservations').set('Authorization', auth(customer)).send(body);
      expect(result.status).toBe(c.valid ? 201 : 400);
      checkResponse('post', '/reservations', result.status, result.body);
      const rows = await db.reservation.findMany({ where: { customerId } });
      expect(rows).toHaveLength(c.valid ? 1 : 0);
      if (c.valid) expect(rows[0]).toMatchObject({ id: result.body.data.id, locationId: c.value });
    } finally {
      if (createdLocation) {
        await db.reservation.deleteMany({ where: { customerId, locationId: String(c.value) } });
        await db.location.delete({ where: { id: String(c.value) } });
      }
    }
  });
});

describe('generated schema-valid table IDs', () => {
  const cases = generated.filter(c => !c.location && c.method === 'patch' && c.path === '/reservations/{id}' && c.field === 'tableId' && c.valid && !c.omitted && c.value !== null);
  it.each(cases.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const id = String(c.value);
    if (await db.table.findUnique({ where: { id } })) throw new Error('Boundary fixture table ID already exists');
    await db.table.create({ data: { id, locationId, name: 'Boundary table', capacity: 4 } });
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
    const result = await request(app).patch(`/api/reservations/${row.id}`).set('Authorization', auth(staff)).send({ tableId: id });
    expect(result.status).toBe(200);
    checkResponse('patch', '/reservations/{id}', result.status, result.body);
    expect((await db.reservation.findUniqueOrThrow({ where: { id: row.id } })).tableId).toBe(id);
  });
});

describe('generated read-only path and query cases against PostgreSQL', () => {
  const cases = generated.filter(c => c.method === 'get' && (c.location === 'query' || c.location === 'path') && c.field !== 'time');
  it.each(cases.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
    const ids: Record<string, string> = { id: row.id, locationId, tableId };
    if (c.location === 'path') {
      if (c.partition === 'unknown') ids[c.field] = `unknown-${c.field}`;
      if (c.partition === 'encoded-known') {
        const id = ids[c.field];
        ids[c.field] = `%${id.charCodeAt(0).toString(16)}${id.slice(1)}`;
      }
      if (c.partition === 'malformed-escape') ids[c.field] = String(c.value);
    }
    const url = c.path.replace(/\{(\w+)\}/g, (_match, name: string) => ids[name]);
    const query: Record<string, string> = c.path === '/reservations/availability' ? { locationId, date: base().date, partySize: '2' } : {};
    if (c.location === 'query') {
      if (c.omitted) delete query[c.field];
      else query[c.field] = c.value === '$locationId' ? locationId : String(c.value);
    }
    const token = c.path === '/reservations/my-reservations' || c.path === '/reservations/{id}' ? customer : staff;
    if (c.isolated) {
      const encoded = Buffer.from(JSON.stringify({ path: `/api${url}`, query })).toString('base64url');
      const { stdout } = await promisify(execFile)(process.execPath, [resolve(process.cwd(), '../../node_modules/tsx/dist/cli.mjs'), resolve(process.cwd(), '../../tests/team/member-2/unknown-table-probe.ts'), row.id, token, encoded], { timeout: 10000 });
      const line = stdout.split(/\r?\n/).find(x => x.startsWith('MEMBER2_RESULT '));
      if (!line) throw new Error(`Missing probe result: ${stdout}`);
      const observed = JSON.parse(line.slice('MEMBER2_RESULT '.length)) as { status: number | null; timedOut: boolean; rejection: string };
      const stored = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
      console.log(JSON.stringify({ caseId: c.id, ...observed, recordUnchanged: JSON.stringify(stored) === JSON.stringify(row) }));
      expect.soft(observed.timedOut).toBe(false);
      expect.soft(observed.status).not.toBeNull();
      if (observed.status !== null) { expect.soft(observed.status).toBeGreaterThanOrEqual(400); expect.soft(observed.status).toBeLessThan(500); }
      expect.soft(stored).toEqual(row);
      return;
    }
    const result = await request(app).get(`/api${url}`).set('Authorization', auth(token)).query(query);
    if (c.partition === 'malformed-escape') {
      const unchanged = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
      console.log(JSON.stringify({ caseId: c.id, http: result.status, body: result.body, recordUnchanged: JSON.stringify(unchanged) === JSON.stringify(row) }));
      expect(unchanged).toEqual(row);
      expect(result.body).toMatchObject({ success: false, error: expect.any(String) });
      expect(result.status).toBeGreaterThanOrEqual(400);
      expect(result.status).toBeLessThan(500);
      return;
    }
    const requiredQueryMissing = c.path === '/reservations/availability' && ['locationId', 'date'].includes(c.field) && (c.omitted || c.value === '');
    expect(result.status).toBe(c.location === 'path' && c.partition === 'unknown' ? 404 : requiredQueryMissing ? 400 : 200);
    checkResponse('get', c.path, result.status, result.body);
    expect(result.body.success).toBe(result.status === 200);
    if (result.status === 200) {
      expect(result.body.data).toBeDefined();
      if (c.path === '/reservations/availability') expect(result.body.data).toMatchObject({ slots: expect.any(Array), totalTables: expect.any(Number) });
      if (['/reservations', '/reservations/my-reservations', '/locations/{locationId}/tables'].includes(c.path)) expect(result.body.data).toEqual(expect.any(Array));
      if (['/reservations', '/reservations/my-reservations'].includes(c.path)) expect(result.body.pagination).toMatchObject({ page: expect.any(Number), limit: expect.any(Number), total: expect.any(Number), totalPages: expect.any(Number) });
      if (c.path === '/reservations/{id}') expect(result.body.data).toMatchObject({ id: row.id, customerId, locationId, status: 'PENDING' });
      if (c.path === '/locations/{locationId}/tables/{tableId}') expect(result.body.data).toMatchObject({ id: tableId, locationId, name: 'T1', capacity: 4, isActive: true });
    }
    if (result.status === 200 && c.location === 'query' && ['page', 'limit'].includes(c.field)) {
      const parsed = parseInt(String(c.value), 10) || (c.field === 'page' ? 1 : 20);
      const expected = c.field === 'page' ? Math.max(1, parsed) : Math.min(50, Math.max(1, parsed));
      expect(result.body.pagination[c.field]).toBe(expected);
    }
    expect(await db.reservation.findUniqueOrThrow({ where: { id: row.id } })).toEqual(row);
  });
});

describe('availability time from the API guide', () => {
  const cases = generated.filter(c => c.location === 'query' && c.field === 'time');
  it.each(cases.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId, tableId } });
    const query: Record<string, string> = { locationId, date: base().date, partySize: '4' };
    if (!c.omitted) query.time = String(c.value);
    const result = await request(app).get('/api/reservations/availability').query(query);
    const stored = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
    expect(stored).toEqual(row);
    console.log(JSON.stringify({ caseId: c.id, http: result.status, body: result.body, recordUnchanged: true }));
    if (c.partition === 'free-slot') {
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({ success: true, data: { available: true, tables: [{ id: tableId, name: 'T1', capacity: 4 }] } });
    } else if (c.partition === 'ordinary') {
      // The guide lists HTTP 400 when there is no table for the requested time.
      expect(result.status).toBe(400);
      checkResponse('get', c.path, result.status, result.body);
    } else {
      // The guide specifies no invalid-time policy. Record the daily-slot behavior.
      expect(result.status).toBe(200);
      checkResponse('get', c.path, result.status, result.body);
      expect(result.body.data.slots).toEqual(expect.arrayContaining([
        { time: row.time, available: false }, { time: '19:30', available: true },
      ]));
    }
  });
});

describe('generated write path identifiers against PostgreSQL', () => {
  const cases = generated.filter(c => ['post', 'patch'].includes(c.method) && c.location === 'path');
  it.each(cases.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
    const ids: Record<string, string> = { id: row.id, locationId, tableId };
    if (c.partition === 'unknown') ids[c.field] = `unknown-${c.field}`;
    const url = c.path.replace(/\{(\w+)\}/g, (_match, name: string) => ids[name]);
    const reservationUpdate = c.path === '/reservations/{id}';
    const body = reservationUpdate ? { comment: 'updated' } : c.method === 'post' ? { name: 'T2', capacity: 2 } : { capacity: 3 };
    const result = await request(app)[c.method as 'post' | 'patch'](`/api${url}`).set('Authorization', auth(reservationUpdate ? staff : manager)).send(body);
    expect(result.status).toBe(c.partition === 'unknown' ? 404 : c.method === 'post' ? 201 : 200);
    checkResponse(c.method, c.path, result.status, result.body);
    const saved = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
    if (c.partition === 'unknown' || !reservationUpdate) expect(saved).toEqual(row);
    else expect(saved.comment).toBe('updated');
    const tables = await db.table.findMany({ where: { locationId } });
    expect(tables).toHaveLength(c.method === 'post' && c.partition === 'known' ? 2 : 1);
    if (c.partition === 'unknown') expect(tables[0]).toMatchObject({ id: tableId, name: 'T1', capacity: 4, isActive: true });
  });
});

describe('generated reservation update cases against PostgreSQL', () => {
  const cases = generated.filter(c => !c.location && c.method === 'patch' && c.path === '/reservations/{id}' && !(c.field === 'tableId' && c.valid && !c.omitted && c.value !== null));
  it.each(cases.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const initial = await db.reservation.create({ data: { ...base(), customerId, date: new Date(base().date), tableId } });
    const body: Record<string, unknown> = {};
    if (!c.omitted) body[c.field] = c.value;
    const response = await request(app).patch(`/api/reservations/${initial.id}`).set('Authorization', auth(staff)).send(body);
    expect(response.status).toBe(c.valid ? 200 : 400);
    checkResponse('patch', '/reservations/{id}', response.status, response.body);
    const after = await db.reservation.findUniqueOrThrow({ where: { id: initial.id } });
    expect(after.id).toBe(initial.id);
    if (!c.valid) expect(after).toEqual(initial);
    else {
      if (!c.omitted) expect((after as unknown as Record<string, unknown>)[c.field]).toEqual(c.field === 'date' ? new Date(String(c.value)) : c.value);
      for (const field of ['customerId', 'locationId', 'tableId', 'date', 'time', 'partySize', 'status', 'comment'] as const) {
        if (c.omitted || field !== c.field) expect(after[field]).toEqual(initial[field]);
      }
    }
    expect(after.customerId).toBe(customerId);
  });
});

describe('generated table create and update cases against PostgreSQL', () => {
  const cases = generated.filter(c => !c.location && c.path.startsWith('/locations/') && ['post', 'patch'].includes(c.method));
  it.each(cases.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const isCreate = c.method === 'post';
    const body: Record<string, unknown> = isCreate ? { name: 'T2', capacity: 4, isActive: true } : {};
    if (c.omitted) delete body[c.field]; else body[c.field] = c.value;
    const url = `/api/locations/${locationId}/tables${isCreate ? '' : `/${tableId}`}`;
    const before = await db.table.findUniqueOrThrow({ where: { id: tableId } });
    const response = await request(app)[c.method as 'post' | 'patch'](url).set('Authorization', auth(manager)).send(body);
    expect(response.status).toBe(c.valid ? (isCreate ? 201 : 200) : 400);
    checkResponse(c.method, c.path, response.status, response.body);
    expect(await db.table.count({ where: { locationId } })).toBe(isCreate && c.valid ? 2 : 1);
    if (!c.valid) expect(await db.table.findUniqueOrThrow({ where: { id: tableId } })).toEqual(before);
    else if (!c.omitted) {
      const saved = await db.table.findUniqueOrThrow({ where: { id: response.body.data.id } });
      expect((saved as unknown as Record<string, unknown>)[c.field]).toEqual(c.value);
      if (!isCreate) for (const field of ['locationId', 'name', 'capacity', 'isActive'] as const) if (field !== c.field) expect(saved[field]).toEqual(before[field]);
    }
  });
});

describe('shared reservation workflow', () => {
  it.each(([
    ['post', '/reservations'], ['get', '/reservations/my-reservations'], ['get', '/reservations'],
    ['get', '/reservations/{id}'], ['patch', '/reservations/{id}'],
    ['post', '/locations/{locationId}/tables'], ['patch', '/locations/{locationId}/tables/{tableId}'],
  ] as const).flatMap(([method, path]) => [
    [method, path, 'missing', null] as const,
    [method, path, 'invalid', 'Bearer invalid'] as const,
  ]))('rejects %s %s %s credential', async (method, path, _kind, header) => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
    const ids: Record<string, string> = { id: row.id, locationId, tableId };
    const url = `/api${path.replace(/\{(\w+)\}/g, (_match, name: string) => ids[name])}`;
    const body = path === '/reservations' && method === 'post' ? base() : path.startsWith('/locations/') ? { name: 'T2', capacity: 2 } : { comment: 'attempt' };
    const tableBefore = await db.table.findUniqueOrThrow({ where: { id: tableId } });
    let call = request(app)[method](url);
    if (header) call = call.set('Authorization', header);
    if (method !== 'get') call = call.send(body);
    const denied = await call;
    expect(denied.status).toBe(401);
    checkResponse(method, path, 401, denied.body);
    expect(await db.reservation.findUniqueOrThrow({ where: { id: row.id } })).toEqual(row);
    expect(await db.table.findUniqueOrThrow({ where: { id: tableId } })).toEqual(tableBefore);
    expect(await db.reservation.count({ where: { customerId } })).toBe(1);
    expect(await db.table.count({ where: { locationId } })).toBe(1);
  });
  it('does not expose or modify a table under the wrong location path', async () => {
    const otherId = `m2-other-${randomUUID()}`;
    await db.location.create({ data: { id: otherId, name: 'Other test location', slug: otherId, address: 'Test', city: 'Test', postalCode: '00000' } });
    try {
      const before = await db.table.findUniqueOrThrow({ where: { id: tableId } });
      const path = `/api/locations/${otherId}/tables/${tableId}`;
      expect((await request(app).get(path)).status).toBe(404);
      expect((await request(app).patch(path).set('Authorization', auth(manager)).send({ capacity: 3 })).status).toBe(404);
      expect(await db.table.findUniqueOrThrow({ where: { id: tableId } })).toEqual(before);
    } finally { await db.location.delete({ where: { id: otherId } }); }
  });
  it.each([
    ['customer', customer, 403], ['staff', staff, 403], ['manager', manager, 201], ['super-admin', superAdmin, 201],
  ])('table create role %s', async (_role, token, expected) => {
    const before = await db.table.count({ where: { locationId } });
    const response = await request(app).post(`/api/locations/${locationId}/tables`).set('Authorization', auth(token)).send({ name: 'RoleTest', capacity: 2 });
    expect(response.status).toBe(expected);
    expect(await db.table.count({ where: { locationId } })).toBe(before + (expected === 201 ? 1 : 0));
  });
  it.each([
    ['customer', customer, 403], ['staff', staff, 403], ['manager', manager, 200], ['super-admin', superAdmin, 200],
  ])('table update role %s', async (_role, token, expected) => {
    const before = await db.table.findUniqueOrThrow({ where: { id: tableId } });
    const response = await request(app).patch(`/api/locations/${locationId}/tables/${tableId}`).set('Authorization', auth(token)).send({ capacity: 3 });
    expect(response.status).toBe(expected);
    const stored = await db.table.findUniqueOrThrow({ where: { id: tableId } });
    if (expected === 403) expect(stored).toEqual(before); else expect(stored.capacity).toBe(3);
  });
  it.each([[0, 20], [1, 1], [2, 2], [49, 49], [50, 50], [51, 50], [-1, 1], ['abc', 20], ['2.5', 2]])('parses limit %s as %s', async (input, expected) => {
    const result = await request(app).get('/api/reservations').set('Authorization', auth(staff)).query({ limit: input });
    expect(result.status).toBe(200);
    expect(result.body.pagination.limit).toBe(expected);
  });
  it.each([[0, 1], [1, 1], [2, 2], [-1, 1], ['abc', 1], ['2.5', 2]])('parses page %s as %s', async (input, expected) => {
    const result = await request(app).get('/api/reservations/my-reservations').set('Authorization', auth(customer)).query({ page: input });
    expect(result.status).toBe(200);
    expect(result.body.pagination.page).toBe(expected);
  });
  it('does not leak another customer reservation', async () => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
    const other = generateToken({ id: 'other-customer', email: 'other@example.test', type: 'customer' });
    const response = await request(app).get(`/api/reservations/${row.id}`).set('Authorization', auth(other));
    expect(response.status).toBe(403);
    expect(response.body.data).toBeUndefined();
    expect(response.body.error).toBe('Access denied');
    const otherList = await request(app).get('/api/reservations/my-reservations').set('Authorization', auth(other));
    expect(otherList.status).toBe(200);
    expect(otherList.body.data).toEqual([]);
    expect(otherList.body.pagination.total).toBe(0);
    const staffRead = await request(app).get(`/api/reservations/${row.id}`).set('Authorization', auth(staff));
    expect(staffRead.status).toBe(200);
    expect(staffRead.body.data.id).toBe(row.id);
    expect(await db.reservation.findUniqueOrThrow({ where: { id: row.id } })).toEqual(row);
  });
  it('rejects nonexistent reservations and table-management permissions', async () => {
    expect((await request(app).get('/api/reservations/unknown-reservation').set('Authorization', auth(staff))).status).toBe(404);
    expect((await request(app).patch('/api/reservations/unknown-reservation').set('Authorization', auth(staff)).send({ status: 'CONFIRMED' })).status).toBe(404);
    expect((await request(app).get('/api/reservations').set('Authorization', auth(customer))).status).toBe(403);
    expect((await request(app).post(`/api/locations/${locationId}/tables`).set('Authorization', auth(customer)).send({ name: 'T2', capacity: 2 })).status).toBe(403);
    expect((await request(app).post(`/api/locations/${locationId}/tables`).send({ name: 'T2', capacity: 2 })).status).toBe(401);
    expect(await db.reservation.count({ where: { customerId } })).toBe(0);
    expect(await db.table.count({ where: { locationId } })).toBe(1);
  });
  it('uses staff filters and customer-scoped reads', async () => {
    const data = { ...base(), date: new Date(base().date), customerId };
    const early = await db.reservation.create({ data: { ...data, time: '18:30' } });
    const late = await db.reservation.create({ data: { ...data, tableId } });
    await db.reservation.create({ data: { ...data, status: 'CANCELLED' } });
    await db.reservation.create({ data: { ...data, date: new Date('2099-06-16') } });
    const other = await db.location.create({ data: { id: `m2-filter-${suffix}`, name: 'Other', slug: `other-${suffix}`, address: 'Test', city: 'Test', postalCode: '00000' } });
    try {
      await db.reservation.create({ data: { ...data, locationId: other.id } });
      for (const [page, expected] of [[1, early], [2, late], [3, null]] as const) {
        const result = await request(app).get('/api/reservations').set('Authorization', auth(staff))
          .query({ status: 'PENDING', locationId, date: base().date, page, limit: 1 });
        expect(result.status).toBe(200);
        checkResponse('get', '/reservations', 200, result.body);
        expect(result.body.pagination).toEqual({ page, limit: 1, total: 2, totalPages: 2 });
        expect(result.body.data.map((r: { id: string }) => r.id)).toEqual(expected ? [expected.id] : []);
        if (expected) expect(result.body.data[0]).toMatchObject({
          customerId, locationId, status: 'PENDING', time: expected.time, date: expected.date.toISOString(),
          table: expected.tableId ? { id: tableId, name: 'T1', capacity: 4 } : null,
        });
      }
      const noMatch = await request(app).get('/api/reservations').set('Authorization', auth(staff))
        .query({ status: 'SEATED', locationId, date: base().date });
      expect(noMatch.status).toBe(200);
      expect(noMatch.body.data).toEqual([]);
      const mine = await request(app).get('/api/reservations/my-reservations').set('Authorization', auth(customer));
      expect(mine.status).toBe(200);
      checkResponse('get', '/reservations/my-reservations', 200, mine.body);
      const own = await db.reservation.findMany({ where: { customerId } });
      expect(mine.body.data.map((r: { id: string }) => r.id).sort()).toEqual(own.map(r => r.id).sort());
    } finally {
      await db.reservation.deleteMany({ where: { customerId, locationId: other.id } });
      await db.location.delete({ where: { id: other.id } });
    }
  });
  const days = generated.filter(c => c.location === 'relative-date');
  it.each(days.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const fixed = new Date('2035-06-15T12:00:00.000Z');
    const date = new Date(fixed.getTime() + Number(c.value) * 86_400_000).toISOString().slice(0, 10);
    const expected = c.valid ? 201 : 400;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(fixed);
    try {
      const token = generateToken({ id: customerId, email: 'customer@example.test', type: 'customer' });
      const response = await request(app).post('/api/reservations').set('Authorization', auth(token)).send({ ...base(), date });
      expect(response.status).toBe(expected);
      if (expected === 400) expect(await db.reservation.count({ where: { customerId } })).toBe(0);
      else expect((await db.reservation.findUniqueOrThrow({ where: { id: response.body.data.id } })).date.toISOString().slice(0, 10)).toBe(date);
    } finally { vi.useRealTimers(); }
  });
  const objects = generated.filter(c => c.location === 'body');
  it.each(objects.map(c => [c.id, c] as const))('%s', async (_id, c) => {
    const body = Object.assign(c.extendValidBody ? base() : {}, c.value);
    const result = await request(app).post('/api/reservations').set('Authorization', auth(customer)).send(body);
    expect(result.status).toBe(c.valid ? 201 : 400);
    checkResponse('post', '/reservations', result.status, result.body);
    if (!c.valid) {
      expect(result.body.error.map((issue: { path: string[] }) => issue.path[0]).sort()).toEqual(['date', 'locationId', 'partySize', 'time']);
      expect(await db.reservation.count({ where: { customerId } })).toBe(0);
    } else {
      expect(result.body.data.status).toBe('PENDING');
      expect(await db.reservation.findUniqueOrThrow({ where: { id: result.body.data.id } })).toMatchObject({ customerId, status: 'PENDING' });
    }
  });
  it('requires availability query parameters and exposes public table reads', async () => {
    expect((await request(app).get('/api/reservations/availability').query({ date: base().date })).status).toBe(400);
    expect((await request(app).get('/api/reservations/availability').query({ locationId })).status).toBe(400);
    const list = await request(app).get(`/api/locations/${locationId}/tables`);
    expect(list.status).toBe(200);
    expect(list.body.data.map((t: { id: string }) => t.id)).toContain(tableId);
    const detail = await request(app).get(`/api/locations/${locationId}/tables/${tableId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: tableId, locationId, capacity: 4 });
    expect((await request(app).get(`/api/locations/${locationId}/tables/no-such-table`)).status).toBe(404);
  });
  it('rejects a duplicate table name without changing stored tables', async () => {
    const before = await db.table.findMany({ where: { locationId } });
    const response = await request(app).post(`/api/locations/${locationId}/tables`).set('Authorization', auth(manager)).send({ name: 'T1', capacity: 4 });
    expect(response.status).toBe(409);
    expect(await db.table.findMany({ where: { locationId } })).toEqual(before);
  });
  it('rejects invalid locations and credentials without creating records', async () => {
    const wrongPrincipal = await request(app).post('/api/reservations').set('Authorization', auth(staff)).send(base());
    expect(wrongPrincipal.status).toBe(400);
    checkResponse('post', '/reservations', 400, wrongPrincipal.body);
    for (const location of ['', 'unknown-location']) {
      const result = await request(app).post('/api/reservations').set('Authorization', auth(customer)).send({ ...base(), locationId: location });
      expect(result.status).toBe(400);
      expect(await db.reservation.count({ where: { customerId } })).toBe(0);
    }
    expect((await request(app).post('/api/reservations').send(base())).status).toBe(401);
    expect((await request(app).post('/api/reservations').set('Authorization', 'Bearer invalid').send(base())).status).toBe(401);
    expect(await db.reservation.count({ where: { customerId } })).toBe(0);
  });
  it('rejects an inactive location without creating a reservation', async () => {
    const inactiveId = `m2-inactive-${randomUUID()}`;
    await db.location.create({ data: { id: inactiveId, name: 'Inactive', slug: inactiveId, address: 'Test', city: 'Test', postalCode: '00000', isActive: false } });
    try {
      const response = await request(app).post('/api/reservations').set('Authorization', auth(customer)).send({ ...base(), locationId: inactiveId });
      expect(response.status).toBe(400);
      expect(await db.reservation.count({ where: { customerId } })).toBe(0);
    } finally { await db.location.delete({ where: { id: inactiveId } }); }
  });
  it('rejects duplicate table renames without changing the stored table', async () => {
    const other = await db.table.create({ data: { locationId, name: 'T2', capacity: 2 } });
    const before = await db.table.findUniqueOrThrow({ where: { id: other.id } });
    const response = await request(app).patch(`/api/locations/${locationId}/tables/${other.id}`).set('Authorization', auth(manager)).send({ name: 'T1' });
    expect(response.status).toBe(409);
    expect(await db.table.findUniqueOrThrow({ where: { id: other.id } })).toEqual(before);
  });
  it('reflects an assigned table in availability and paginated lists', async () => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId, tableId } });
    const availability = await request(app).get('/api/reservations/availability').query({ locationId, date: base().date, partySize: 4 });
    expect(availability.status).toBe(200);
    expect(availability.body.data.slots.find((slot: { time: string }) => slot.time === '19:00').available).toBe(false);
    expect(availability.body.data.slots.find((slot: { time: string }) => slot.time === '19:30').available).toBe(true);
    const list = await request(app).get('/api/reservations').set('Authorization', auth(staff)).query({ locationId, limit: 51, page: 0 });
    expect(list.status).toBe(200);
    expect(list.body.pagination).toMatchObject({ page: 1, limit: 50 });
    expect(list.body.data.map((r: { id: string }) => r.id)).toContain(row.id);
    const mine = await request(app).get('/api/reservations/my-reservations').set('Authorization', auth(customer));
    expect(mine.body.data.map((r: { id: string }) => r.id)).toContain(row.id);
  });
  it('characterizes acceptance of a table too small for the reservation', async () => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
    const small = await db.table.create({ data: { locationId, name: 'Small', capacity: 1 } });
    const response = await request(app).patch(`/api/reservations/${row.id}`).set('Authorization', auth(staff)).send({ tableId: small.id });
    expect(response.status).toBe(200);
    expect((await db.reservation.findUniqueOrThrow({ where: { id: row.id } })).tableId).toBe(small.id);
  });
  it('characterizes an accepted conflicting table assignment', async () => {
    await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId, tableId } });
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
    const result = await request(app).patch(`/api/reservations/${row.id}`).set('Authorization', auth(staff)).send({ tableId });
    expect(result.status).toBe(200);
    expect(await db.reservation.count({ where: { locationId, tableId, time: base().time, date: new Date(base().date) } })).toBe(2);
  });
  it('characterizes a transition from CANCELLED to CONFIRMED', async () => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId, status: 'CANCELLED' } });
    const result = await request(app).patch(`/api/reservations/${row.id}`).set('Authorization', auth(staff)).send({ status: 'CONFIRMED' });
    expect(result.status).toBe(200);
    expect((await db.reservation.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('CONFIRMED');
  });
  it.each([[0, 1], [1, 1], [2, 1], [50, 0], [51, 0], ['2.5', 1], ['abc', 1]])('availability parses party size %s and yields %s eligible tables', async (input, expected) => {
    const response = await request(app).get('/api/reservations/availability').query({ locationId, date: base().date, partySize: input });
    expect(response.status).toBe(200);
    expect(response.body.data.totalTables).toBe(expected);
  });
  it('creates and assigns the same reservation, preserving other data, then rejects a customer update without mutation', async () => {
    const created = await request(app).post('/api/reservations').set('Authorization', auth(customer)).send(base());
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const updated = await request(app).patch(`/api/reservations/${id}`).set('Authorization', auth(staff)).send({ tableId, status: 'CONFIRMED' });
    expect(updated.status).toBe(200);
    const read = await request(app).get(`/api/reservations/${id}`).set('Authorization', auth(customer));
    expect(read.status).toBe(200);
    expect(read.body.data).toMatchObject({ id, customerId, locationId, tableId, status: 'CONFIRMED', partySize: 4, time: '19:00', comment: 'synthetic' });
    const before = await db.reservation.findUniqueOrThrow({ where: { id } });
    expect((await request(app).patch(`/api/reservations/${id}`).set('Authorization', auth(customer)).send({ status: 'CANCELLED' })).status).toBe(403);
    expect(await db.reservation.findUniqueOrThrow({ where: { id } })).toEqual(before);
  });
  it('records duplicate requests as actually observed', async () => {
    const a = await request(app).post('/api/reservations').set('Authorization', auth(customer)).send(base());
    const b = await request(app).post('/api/reservations').set('Authorization', auth(customer)).send(base());
    expect([a.status, b.status]).toEqual([201, 201]);
    const records = await db.reservation.findMany({ where: { customerId } });
    expect(records).toHaveLength(2);
    expect(new Set(records.map(x => x.id))).toEqual(new Set([a.body.data.id, b.body.data.id]));
  });
  it('enforces table creation role and keeps database unchanged on rejection', async () => {
    const path = `/api/locations/${locationId}/tables`;
    const before = await db.table.count({ where: { locationId } });
    expect((await request(app).post(path).set('Authorization', auth(staff)).send({ name: 'T2', capacity: 2 })).status).toBe(403);
    expect(await db.table.count({ where: { locationId } })).toBe(before);
    const created = await request(app).post(path).set('Authorization', auth(manager)).send({ name: 'T2', capacity: 2 });
    expect(created.status).toBe(201);
    expect(await db.table.findUnique({ where: { id: created.body.data.id } })).toMatchObject({ locationId, name: 'T2', capacity: 2 });
  });
});

// Business-rule regression tests, based on packages/docs/features/reservations.md.
// The API does not specify a rejection status, so disallowed transitions require
// any client-error response plus an unchanged record rather than an invented code.
describe('documented reservation lifecycle', () => {
  const allowed = [
    ['PENDING', 'CONFIRMED'], ['PENDING', 'CANCELLED'],
    ['CONFIRMED', 'SEATED'], ['CONFIRMED', 'CANCELLED'],
    ['SEATED', 'COMPLETED'], ['SEATED', 'CANCELLED'],
    // The docs say cancellation from any status; this case needs team review.
    ['COMPLETED', 'CANCELLED'],
  ] as const;
  const disallowed = [
    ['PENDING', 'SEATED'], ['PENDING', 'COMPLETED'],
    ['CONFIRMED', 'PENDING'], ['CONFIRMED', 'COMPLETED'],
    ['SEATED', 'PENDING'], ['SEATED', 'CONFIRMED'],
    ['COMPLETED', 'PENDING'], ['COMPLETED', 'CONFIRMED'], ['COMPLETED', 'SEATED'],
    ['CANCELLED', 'PENDING'], ['CANCELLED', 'CONFIRMED'], ['CANCELLED', 'SEATED'], ['CANCELLED', 'COMPLETED'],
  ] as const;
  it.each(allowed)('allows %s to %s', async (from, to) => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId, status: from } });
    const result = await request(app).patch(`/api/reservations/${row.id}`).set('Authorization', auth(staff)).send({ status: to });
    const stored = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
    expect(result.status).toBe(200);
    expect(stored).toMatchObject({ id: row.id, customerId, locationId, status: to, partySize: row.partySize, comment: row.comment });
  });
  it.each(disallowed)('rejects %s to %s without changing the record', async (from, to) => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId, status: from } });
    const result = await request(app).patch(`/api/reservations/${row.id}`).set('Authorization', auth(staff)).send({ status: to });
    const stored = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
    console.log(JSON.stringify({ transition: `${from}->${to}`, expected: '4xx and unchanged record', observedStatus: result.status, storedStatus: stored.status, recordUnchanged: JSON.stringify(stored) === JSON.stringify(row) }));
    expect.soft(result.status).toBeGreaterThanOrEqual(400);
    expect.soft(result.status).toBeLessThan(500);
    expect.soft(stored).toEqual(row);
  });
});

describe('business-rule regressions', () => {
  it.each(['inactive', 'other-location'] as const)('rejects assigning an %s table without mutation', async kind => {
    const otherLocationId = `m2-other-${randomUUID()}`;
    let otherCreated = false;
    try {
      if (kind === 'other-location') {
        await db.location.create({ data: { id: otherLocationId, name: 'Other test location', slug: otherLocationId, address: 'Test', city: 'Test', postalCode: '00000' } });
        otherCreated = true;
      }
      const table = await db.table.create({ data: { locationId: otherCreated ? otherLocationId : locationId, name: 'Other table', capacity: 4, isActive: kind !== 'inactive' } });
      const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
      const response = await request(app).patch(`/api/reservations/${row.id}`).set('Authorization', auth(staff)).send({ tableId: table.id });
      const stored = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
      console.log(JSON.stringify({ scenario: kind, observedStatus: response.status, assigned: stored.tableId === table.id }));
      expect.soft(response.status).toBeGreaterThanOrEqual(400);
      expect.soft(response.status).toBeLessThan(500);
      expect.soft(stored).toEqual(row);
    } finally {
      if (otherCreated) {
        await db.reservation.deleteMany({ where: { customerId, locationId } });
        await db.table.deleteMany({ where: { locationId: otherLocationId } });
        await db.location.delete({ where: { id: otherLocationId } });
      }
    }
  });
  it('rejects assigning a nonexistent table without an unexpected server error', async () => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
    const { stdout } = await promisify(execFile)(process.execPath, [resolve(process.cwd(), '../../node_modules/tsx/dist/cli.mjs'), resolve(process.cwd(), '../../tests/team/member-2/unknown-table-probe.ts'), row.id, staff], { timeout: 10000 });
    const line = stdout.split(/\r?\n/).find(x => x.startsWith('MEMBER2_RESULT '));
    if (!line) throw new Error(`Missing probe result: ${stdout}`);
    const observed = JSON.parse(line.slice('MEMBER2_RESULT '.length)) as { status: number | null; timedOut: boolean; rejection: string };
    const stored = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
    console.log(JSON.stringify({ scenario: 'unknown table', ...observed, recordUnchanged: JSON.stringify(row) === JSON.stringify(stored) }));
    expect.soft(observed.timedOut).toBe(false);
    expect.soft(observed.status).not.toBeNull();
    if (observed.status !== null) { expect.soft(observed.status).toBeGreaterThanOrEqual(400); expect.soft(observed.status).toBeLessThan(500); }
    expect.soft(stored).toEqual(row);
  });
  it('does not create duplicate records for a repeated identical booking', async () => {
    const first = await request(app).post('/api/reservations').set('Authorization', auth(customer)).send(base());
    const second = await request(app).post('/api/reservations').set('Authorization', auth(customer)).send(base());
    const rows = await db.reservation.findMany({ where: { customerId } });
    console.log(JSON.stringify({ scenario: 'repeated booking', observedStatuses: [first.status, second.status], recordCount: rows.length }));
    expect(first.status).toBe(201);
    expect(rows).toHaveLength(1);
  });
  it('rejects assigning an undersized table without changing the reservation', async () => {
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
    const small = await db.table.create({ data: { locationId, name: 'Small', capacity: 1 } });
    const response = await request(app).patch(`/api/reservations/${row.id}`).set('Authorization', auth(staff)).send({ tableId: small.id });
    const stored = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
    console.log(JSON.stringify({ scenario: 'undersized table', observedStatus: response.status, assigned: stored.tableId === small.id }));
    expect.soft(response.status).toBeGreaterThanOrEqual(400);
    expect.soft(response.status).toBeLessThan(500);
    expect.soft(stored).toEqual(row);
  });
  it('rejects assigning a table already booked for the same slot', async () => {
    await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId, tableId } });
    const row = await db.reservation.create({ data: { ...base(), date: new Date(base().date), customerId } });
    const response = await request(app).patch(`/api/reservations/${row.id}`).set('Authorization', auth(staff)).send({ tableId });
    const stored = await db.reservation.findUniqueOrThrow({ where: { id: row.id } });
    console.log(JSON.stringify({ scenario: 'conflicting table', observedStatus: response.status, assigned: stored.tableId === tableId }));
    expect.soft(response.status).toBeGreaterThanOrEqual(400);
    expect.soft(response.status).toBeLessThan(500);
    expect.soft(stored).toEqual(row);
  });
});
