import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/db.js', () => ({
  default: {
    location: { findUnique: vi.fn() },
    reservation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    table: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../../lib/events.js', () => ({ appEvents: { emit: vi.fn() } }));

import prisma from '../../../lib/db.js';
import {
  checkAvailability,
  createReservation,
  updateReservation,
} from '../../../controllers/reservation.controller.js';
import {
  createTable,
  deleteTable,
  listTables,
  updateTable,
} from '../../../controllers/table.controller.js';

const db = prisma as unknown as {
  location: { findUnique: ReturnType<typeof vi.fn> };
  reservation: Record<string, ReturnType<typeof vi.fn>>;
  table: Record<string, ReturnType<typeof vi.fn>>;
};

function response() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

function request(value: Partial<Request>): Request {
  return value as Request;
}

beforeEach(() => vi.clearAllMocks());

describe('M1-BR-01 reservation party-size boundary', () => {
  it('rejects a past reservation date before database access', async () => {
    const res = response();

    await createReservation(request({
      body: { locationId: 'loc-1', date: '2020-01-01', time: '19:00', partySize: 2 },
      user: { id: 'customer-1', type: 'customer' },
    }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Cannot reserve in the past' });
    expect(db.location.findUnique).not.toHaveBeenCalled();
    expect(db.reservation.create).not.toHaveBeenCalled();
  });

  it('accepts the exact maximum party size and persists it', async () => {
    db.location.findUnique.mockResolvedValue({ id: 'loc-1', isActive: true });
    db.reservation.create.mockResolvedValue({ id: 'reservation-50', partySize: 50 });
    const res = response();

    await createReservation(request({
      body: { locationId: 'loc-1', date: '2027-01-10', time: '19:00', partySize: 50 },
      user: { id: 'customer-1', type: 'customer' },
    }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.reservation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customerId: 'customer-1', partySize: 50 }),
    }));
  });

  it.each([
    ['P1', '2'],
    ['P2', 0.5],
    ['P3', 2.5],
    ['P4', 50.5],
  ])('rejects semantic MCC case %s with party size %s before database access', async (_caseId, partySize) => {
    const res = response();
    await createReservation(request({
      body: { locationId: 'loc-1', date: '2027-01-10', time: '19:00', partySize },
      user: { id: 'customer-1', type: 'customer' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.arrayContaining([expect.objectContaining({ path: ['partySize'] })]),
    }));
    expect(db.location.findUnique).not.toHaveBeenCalled();
    expect(db.reservation.create).not.toHaveBeenCalled();
  });

  it.each([0, 51])('rejects invalid party size %i without writes', async (partySize) => {
    const res = response();
    await createReservation(request({
      body: { locationId: 'loc-1', date: '2027-01-10', time: '19:00', partySize },
      user: { id: 'customer-1', type: 'customer' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.reservation.create).not.toHaveBeenCalled();
  });

  it.each([1, 2, 49, 50])('accepts boundary or adjacent party size %i', async (partySize) => {
    const created = { id: `reservation-${partySize}`, partySize };
    db.location.findUnique.mockResolvedValue({ id: 'loc-1', isActive: true });
    db.reservation.create.mockResolvedValue(created);
    const res = response();
    await createReservation(request({
      body: { locationId: 'loc-1', date: '2027-01-10', time: '19:00', partySize },
      user: { id: 'customer-1', type: 'customer' },
    }), res);
    expect(db.reservation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customerId: 'customer-1', partySize }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('M1-BR-02 customer and active-location decision', () => {
  it('rejects an unauthenticated request without reading or writing', async () => {
    const res = response();
    await createReservation(request({
      body: { locationId: 'loc-1', date: '2027-01-10', time: '19:00', partySize: 2 },
    }), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Authentication required for reservations' });
    expect(db.location.findUnique).not.toHaveBeenCalled();
    expect(db.reservation.create).not.toHaveBeenCalled();
  });

  it('rejects a staff principal without a reservation write', async () => {
    const res = response();
    await createReservation(request({
      body: { locationId: 'loc-1', date: '2027-01-10', time: '19:00', partySize: 2 },
      user: { id: 'staff-1', type: 'staff' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Reservations can only be created by a customer account' });
    expect(db.reservation.create).not.toHaveBeenCalled();
  });

  it.each([null, { id: 'loc-1', isActive: false }])('rejects missing or inactive location', async (location) => {
    db.location.findUnique.mockResolvedValue(location);
    const res = response();
    await createReservation(request({
      body: { locationId: 'loc-1', date: '2027-01-10', time: '19:00', partySize: 2 },
      user: { id: 'customer-1', type: 'customer' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Location not found or inactive' });
    expect(db.location.findUnique).toHaveBeenCalledWith({ where: { id: 'loc-1' } });
    expect(db.reservation.create).not.toHaveBeenCalled();
  });
});

describe('M1-BR-03 partial reservation update', () => {
  it('rejects an invalid update before lookup', async () => {
    const res = response();
    await updateReservation(request({ params: { id: 'r-1' }, body: { partySize: 0 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.reservation.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 without updating', async () => {
    db.reservation.findUnique.mockResolvedValue(null);
    const res = response();
    await updateReservation(request({ params: { id: 'missing' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Reservation not found' });
    expect(db.reservation.update).not.toHaveBeenCalled();
  });

  it('preserves omitted fields and supports explicit null', async () => {
    db.reservation.findUnique.mockResolvedValue({ id: 'r-1' });
    db.reservation.update.mockResolvedValue({ id: 'r-1', tableId: null, comment: null });
    const res = response();
    await updateReservation(request({
      params: { id: 'r-1' },
      body: { tableId: null, comment: null },
    }), res);
    expect(db.reservation.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { tableId: null, comment: null },
    }));
  });

  it('maps every supplied optional field into the Prisma payload', async () => {
    db.reservation.findUnique.mockResolvedValue({ id: 'r-1' });
    db.reservation.update.mockResolvedValue({ id: 'r-1' });
    const res = response();
    await updateReservation(request({
      params: { id: 'r-1' },
      body: {
        status: 'CONFIRMED', tableId: 't-1', date: '2027-02-03', time: '20:30', partySize: 4, comment: 'Window',
      },
    }), res);
    expect(db.reservation.update).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        status: 'CONFIRMED', tableId: 't-1', date: new Date('2027-02-03'), time: '20:30', partySize: 4, comment: 'Window',
      },
    }));
  });
});

describe('M1-BR-04 availability requires active capacity and no conflict', () => {
  it('requires location and date', async () => {
    const res = response();
    await checkAvailability(request({ query: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'locationId and date are required' });
    expect(db.table.findMany).not.toHaveBeenCalled();
  });

  it('uses party size two by default and marks occupied and free slots', async () => {
    db.table.findMany.mockResolvedValue([{ id: 't-1' }, { id: 't-2' }]);
    db.reservation.findMany.mockResolvedValue([
      { time: '11:00', tableId: 't-1' },
      { time: '11:00', tableId: 't-2' },
      { time: '11:30', tableId: null },
    ]);
    const res = response();
    await checkAvailability(request({ query: { locationId: 'loc-1', date: '2027-01-10' } }), res);
    expect(db.table.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { locationId: 'loc-1', isActive: true, capacity: { gte: 2 } },
    }));
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.slots).toHaveLength(22);
    expect(payload.data.slots[0]).toEqual({ time: '11:00', available: false });
    expect(payload.data.slots[1]).toEqual({ time: '11:30', available: true });
  });
});

describe('table management rules', () => {
  it('lists only tables for the requested location and exact location lookup', async () => {
    db.location.findUnique.mockResolvedValue({ id: 'loc-downtown', isActive: true });
    db.table.findMany.mockResolvedValue([
      { id: 'table-a', name: 'A', locationId: 'loc-downtown' },
      { id: 'table-b', name: 'B', locationId: 'loc-downtown' },
    ]);
    const res = response();

    await listTables(request({ params: { locationId: 'loc-downtown' } }), res);

    expect(db.location.findUnique).toHaveBeenCalledWith({ where: { id: 'loc-downtown' } });
    expect(db.table.findMany).toHaveBeenCalledWith({
      where: { locationId: 'loc-downtown' },
      orderBy: { name: 'asc' },
      include: { _count: { select: { reservations: true } } },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        { id: 'table-a', name: 'A', locationId: 'loc-downtown' },
        { id: 'table-b', name: 'B', locationId: 'loc-downtown' },
      ],
    });
  });

  it('rejects invalid table capacity', async () => {
    const res = response();
    await createTable(request({ params: { locationId: 'loc-1' }, body: { name: 'T1', capacity: 0 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.table.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate table names in the same location', async () => {
    db.location.findUnique.mockResolvedValue({ id: 'loc-1' });
    db.table.findFirst.mockResolvedValue({ id: 'existing' });
    const res = response();
    await createTable(request({ params: { locationId: 'loc-1' }, body: { name: 'T1', capacity: 4 } }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'A table with this name already exists at this location' });
    expect(db.table.findFirst).toHaveBeenCalledWith({ where: { locationId: 'loc-1', name: 'T1' } });
    expect(db.table.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ name: 'T1' }, 'unchanged name'],
    [{ capacity: 6 }, 'omitted name'],
  ])('updates with %s without duplicate lookup (%s)', async (body) => {
    db.table.findFirst.mockResolvedValueOnce({ id: 't-1', name: 'T1' });
    db.table.update.mockResolvedValue({ id: 't-1', ...body });
    const res = response();
    await updateTable(request({ params: { locationId: 'loc-1', tableId: 't-1' }, body }), res);
    expect(db.table.findFirst).toHaveBeenCalledTimes(1);
    expect(db.table.update).toHaveBeenCalled();
  });

  it('blocks deletion when reservations reference the table', async () => {
    db.table.findFirst.mockResolvedValue({ id: 't-1' });
    db.reservation.count.mockResolvedValue(1);
    const res = response();
    await deleteTable(request({ params: { locationId: 'loc-1', tableId: 't-1' } }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(db.reservation.count).toHaveBeenCalledWith({ where: { tableId: 't-1' } });
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Cannot delete table with existing reservations. Deactivate it instead.',
    });
    expect(db.table.delete).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced table', async () => {
    db.table.findFirst.mockResolvedValue({ id: 't-1' });
    db.reservation.count.mockResolvedValue(0);
    const res = response();
    await deleteTable(request({ params: { locationId: 'loc-1', tableId: 't-1' } }), res);
    expect(db.table.delete).toHaveBeenCalledWith({ where: { id: 't-1' } });
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Table deleted' });
  });
});
