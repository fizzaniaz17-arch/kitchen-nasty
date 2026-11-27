import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../packages/server/src/app.js';
import { generateToken } from '../../../packages/server/src/middleware/auth.js';

vi.mock('../../../packages/server/src/lib/db.js', () => {
  const mockPrisma = {
    location: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    reservation: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn() },
    table: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    order: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    user: { findUnique: vi.fn() },
    customer: { findUnique: vi.fn() },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from '../../../packages/server/src/lib/db.js';
const mockedPrisma = vi.mocked(prisma, true);
const app = createApp();

const customerToken = generateToken({ id: 'customer-1', email: 'one@example.test', type: 'customer' });
const otherCustomerToken = generateToken({ id: 'customer-2', email: 'two@example.test', type: 'customer' });
const staffToken = generateToken({ id: 'staff-1', email: 'staff@example.test', type: 'staff', role: 'STAFF' });

const ownedReservation = {
  id: 'reservation-1',
  customerId: 'customer-1',
  locationId: 'location-1',
  tableId: null,
  date: new Date('2026-12-01'),
  time: '18:30',
  partySize: 2,
  status: 'PENDING',
  comment: null,
  customer: { id: 'customer-1', name: 'One', email: 'one@example.test', phone: null },
  location: { id: 'location-1', name: 'Test Location' },
  table: null,
};

beforeEach(() => vi.clearAllMocks());

describe('Student 3 reservation access decisions', () => {
  it('denies unauthenticated access to the protected reservation list', async () => {
    const response = await request(app).get('/api/reservations');
    expect(response.status).toBe(401);
  });

  it('allows authorized staff to list reservations', async () => {
    mockedPrisma.reservation.findMany.mockResolvedValueOnce([ownedReservation] as any);
    mockedPrisma.reservation.count.mockResolvedValueOnce(1);
    const response = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(response.status).toBe(200);
  });

  it('denies a customer reading another customer reservation', async () => {
    mockedPrisma.reservation.findUnique.mockResolvedValueOnce(ownedReservation as any);
    const response = await request(app)
      .get('/api/reservations/reservation-1')
      .set('Authorization', `Bearer ${otherCustomerToken}`);
    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain('one@example.test');
  });

  it('denies a customer updating or deleting an admin-only reservation', async () => {
    const updateResponse = await request(app)
      .patch('/api/reservations/reservation-1')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'CONFIRMED' });
    const deleteResponse = await request(app)
      .delete('/api/reservations/reservation-1')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(updateResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
    expect(mockedPrisma.reservation.update).not.toHaveBeenCalled();
    expect(mockedPrisma.reservation.delete).not.toHaveBeenCalled();
  });
});
