import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/db.js', () => ({
  default: {
    $queryRaw: vi.fn(),
    location: { findUnique: vi.fn() },
    reservation: {
      findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(),
      count: vi.fn(), delete: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn(),
    },
    table: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock('../../../lib/events.js', () => ({ appEvents: { emit: vi.fn() } }));

import prisma from '../../../lib/db.js';
import {
  createReservation, deleteReservation, getReservation, getReservationAnalytics,
  listCustomerReservations, listReservations, updateReservation,
} from '../../../controllers/reservation.controller.js';
import {
  createTable, deleteTable, getTable, listTables, updateTable,
} from '../../../controllers/table.controller.js';

type MockFn = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  $queryRaw: MockFn;
  location: { findUnique: MockFn };
  reservation: Record<string, MockFn>;
  table: Record<string, MockFn>;
};

function response() {
  const value = { status: vi.fn(), json: vi.fn() };
  value.status.mockReturnValue(value);
  return value as unknown as Response & { status: MockFn; json: MockFn };
}

function request(value: Partial<Request>): Request {
  return value as Request;
}

beforeEach(() => vi.clearAllMocks());

describe('reservation controller completeness', () => {
  it('creates a reservation with an optional comment', async () => {
    db.location.findUnique.mockResolvedValue({ id: 'loc-1', isActive: true });
    db.reservation.create.mockResolvedValue({ id: 'r-1' });
    const res = response();
    await createReservation(request({
      body: { locationId: 'loc-1', date: '2027-01-01', time: '19:00', partySize: 2, comment: 'Quiet' },
      user: { id: 'c-1', type: 'customer' },
    }), res);
    expect(db.reservation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ comment: 'Quiet' }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'r-1' } });
  });

  it.each([
    [{}, { page: 1, limit: 20, skip: 0, where: {} }],
    [{ page: '-2', limit: '0' }, { page: 1, limit: 20, skip: 0, where: {} }],
    [{ page: '3', limit: '99', status: 'CONFIRMED', locationId: 'loc-1', date: '2027-01-02' },
      { page: 3, limit: 50, skip: 100, where: { status: 'CONFIRMED', locationId: 'loc-1', date: new Date('2027-01-02') } }],
  ])('lists reservations with clamped filters %#', async (query, expected) => {
    db.reservation.findMany.mockResolvedValue([{ id: 'r-1' }]);
    db.reservation.count.mockResolvedValue(101);
    const res = response();
    await listReservations(request({ query }), res);
    expect(db.reservation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expected.where, skip: expected.skip, take: expected.limit,
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      pagination: { page: expected.page, limit: expected.limit, total: 101, totalPages: Math.ceil(101 / expected.limit) },
    }));
  });

  it('returns 404 for a missing reservation read', async () => {
    db.reservation.findUnique.mockResolvedValue(null);
    const res = response();
    await getReservation(request({ params: { id: 'missing' }, user: { id: 'staff-1', type: 'staff' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Reservation not found' });
  });

  it.each([
    [undefined, 'anonymous'],
    [{ id: 'other', type: 'customer' }, 'different customer'],
  ])('denies %s from reading another reservation (%s)', async (user) => {
    db.reservation.findUnique.mockResolvedValue({ id: 'r-1', customerId: 'owner' });
    const res = response();
    await getReservation(request({ params: { id: 'r-1' }, user }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Access denied' });
  });

  it.each([
    [{ id: 'owner', type: 'customer' }, 'owner'],
    [{ id: 'staff-1', type: 'staff' }, 'staff'],
  ])('allows reservation read by %s (%s)', async (user) => {
    const reservation = { id: 'r-1', customerId: 'owner' };
    db.reservation.findUnique.mockResolvedValue(reservation);
    const res = response();
    await getReservation(request({ params: { id: 'r-1' }, user }), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: reservation });
  });

  it('returns 404 rather than deleting a missing reservation', async () => {
    db.reservation.findUnique.mockResolvedValue(null);
    const res = response();
    await deleteReservation(request({ params: { id: 'missing' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Reservation not found' });
    expect(db.reservation.delete).not.toHaveBeenCalled();
  });

  it('deletes an existing reservation', async () => {
    db.reservation.findUnique.mockResolvedValue({ id: 'r-1' });
    const res = response();
    await deleteReservation(request({ params: { id: 'r-1' } }), res);
    expect(db.reservation.delete).toHaveBeenCalledWith({ where: { id: 'r-1' } });
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Reservation deleted' });
  });

  it('performs a valid no-op partial update with every optional field omitted', async () => {
    db.reservation.findUnique.mockResolvedValue({ id: 'r-1' });
    db.reservation.update.mockResolvedValue({ id: 'r-1' });
    const res = response();
    await updateReservation(request({ params: { id: 'r-1' }, body: {} }), res);
    expect(db.reservation.update).toHaveBeenCalledWith(expect.objectContaining({ data: {} }));
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'r-1' } });
  });

  it('requires authentication for customer reservations', async () => {
    const res = response();
    await listCustomerReservations(request({ query: {} }), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Authentication required' });
    expect(db.reservation.findMany).not.toHaveBeenCalled();
  });

  it.each([
    [{}, { page: 1, limit: 20, skip: 0 }],
    [{ page: '-1', limit: '100' }, { page: 1, limit: 50, skip: 0 }],
    [{ page: '2', limit: '5' }, { page: 2, limit: 5, skip: 5 }],
  ])('lists customer reservations with pagination %#', async (query, expected) => {
    db.reservation.findMany.mockResolvedValue([]);
    db.reservation.count.mockResolvedValue(6);
    const res = response();
    await listCustomerReservations(request({ query, user: { id: 'c-1', type: 'customer' } }), res);
    expect(db.reservation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: 'c-1' }, skip: expected.skip, take: expected.limit,
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      pagination: { page: expected.page, limit: expected.limit, total: 6, totalPages: Math.ceil(6 / expected.limit) },
    }));
  });

  it.each([
    [{}, 0, null, null],
    [{ days: '999', locationId: 'loc-1' }, 4, 9, 3.333],
    [{ days: '1' }, 2, 4, 2],
  ])('maps analytics, defaults, bounds and zero values %#', async (query, total, guests, average) => {
    db.$queryRaw
      .mockResolvedValueOnce([{ date: '2027-01-01', reservations: 2n, guests: 4n }])
      .mockResolvedValueOnce([{ dow: 5, reservations: 2n, guests: 4n }])
      .mockResolvedValueOnce([{ hour: 19, reservations: 2n }])
      .mockResolvedValueOnce([{ bucket: 'same-day', count: 2n }]);
    db.reservation.groupBy
      .mockResolvedValueOnce([{ partySize: 2, _count: 2 }])
      .mockResolvedValueOnce([{ status: 'COMPLETED', _count: 2 }]);
    db.reservation.aggregate.mockResolvedValue({
      _count: total, _sum: { partySize: guests }, _avg: { partySize: average },
    });
    db.reservation.count.mockResolvedValue(total === 0 ? 0 : 2);
    const res = response();
    await getReservationAnalytics(request({ query }), res);
    const payload = res.json.mock.calls[0][0].data;
    expect(payload.summary).toEqual(expect.objectContaining({
      totalReservations: total,
      totalGuests: guests ?? 0,
      avgPartySize: Number((average ?? 0).toFixed(2)),
      completionRate: total > 0 ? Number((2 / total).toFixed(4)) : 0,
    }));
    expect(payload.dailyBookings[0]).toEqual({ date: '2027-01-01', reservations: 2, guests: 4 });
    expect(payload.dayOfWeekDistribution[0]).toEqual({ dow: 5, reservations: 2, guests: 4 });
    expect(payload.partySizeDistribution[0]).toEqual({ partySize: 2, count: 2 });
    expect(payload.statusDistribution[0]).toEqual({ status: 'COMPLETED', count: 2 });
    expect(payload.hourlyDistribution[0]).toEqual({ hour: 19, reservations: 2 });
    expect(payload.leadTimeBuckets).toEqual([
      { bucket: 'same-day', count: 2 }, { bucket: '1-2d', count: 0 },
      { bucket: '3-7d', count: 0 }, { bucket: '8-14d', count: 0 }, { bucket: '15d+', count: 0 },
    ]);
  });
});

describe('table controller completeness', () => {
  it('returns 404 when listing tables for a missing location', async () => {
    db.location.findUnique.mockResolvedValue(null);
    const res = response();
    await listTables(request({ params: { locationId: 'missing' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Location not found' });
  });

  it('lists tables for an existing location', async () => {
    db.location.findUnique.mockResolvedValue({ id: 'loc-1' });
    db.table.findMany.mockResolvedValue([{ id: 't-1' }]);
    const res = response();
    await listTables(request({ params: { locationId: 'loc-1' } }), res);
    expect(db.table.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { locationId: 'loc-1' } }));
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 't-1' }] });
  });

  it.each([[null, 404], [{ id: 't-1' }, 200]])('gets a table result %#', async (table, status) => {
    db.table.findFirst.mockResolvedValue(table);
    const res = response();
    await getTable(request({ params: { locationId: 'loc-1', tableId: 't-1' } }), res);
    if (status === 404) {
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Table not found' });
    }
    else expect(res.json).toHaveBeenCalledWith({ success: true, data: table });
  });

  it('returns 404 when creating in a missing location', async () => {
    db.location.findUnique.mockResolvedValue(null);
    const res = response();
    await createTable(request({ params: { locationId: 'missing' }, body: { name: 'T1', capacity: 2 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Location not found' });
  });

  it('creates a unique table and applies active default', async () => {
    db.location.findUnique.mockResolvedValue({ id: 'loc-1' });
    db.table.findFirst.mockResolvedValue(null);
    db.table.create.mockResolvedValue({ id: 't-1' });
    const res = response();
    await createTable(request({ params: { locationId: 'loc-1' }, body: { name: 'T1', capacity: 2 } }), res);
    expect(db.table.create).toHaveBeenCalledWith({ data: { locationId: 'loc-1', name: 'T1', capacity: 2, isActive: true } });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects an invalid table update before lookup', async () => {
    const res = response();
    await updateTable(request({ params: { locationId: 'loc-1', tableId: 't-1' }, body: { capacity: 0 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.table.findFirst).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing table update', async () => {
    db.table.findFirst.mockResolvedValue(null);
    const res = response();
    await updateTable(request({ params: { locationId: 'loc-1', tableId: 'missing' }, body: { capacity: 2 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Table not found' });
  });

  it.each([
    [{ id: 'duplicate' }, 409],
    [null, 200],
  ])('handles changed-name duplicate decision %#', async (duplicate, status) => {
    db.table.findFirst.mockResolvedValueOnce({ id: 't-1', name: 'Old' }).mockResolvedValueOnce(duplicate);
    db.table.update.mockResolvedValue({ id: 't-1', name: 'New' });
    const res = response();
    await updateTable(request({ params: { locationId: 'loc-1', tableId: 't-1' }, body: { name: 'New' } }), res);
    if (status === 409) {
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'A table with this name already exists at this location' });
      expect(db.table.update).not.toHaveBeenCalled();
    } else {
      expect(db.table.update).toHaveBeenCalledWith({ where: { id: 't-1' }, data: { name: 'New' } });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 't-1', name: 'New' } });
    }
  });

  it('returns 404 when deleting a missing table', async () => {
    db.table.findFirst.mockResolvedValue(null);
    const res = response();
    await deleteTable(request({ params: { locationId: 'loc-1', tableId: 'missing' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Table not found' });
    expect(db.reservation.count).not.toHaveBeenCalled();
  });
});
