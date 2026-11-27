import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../lib/db.js', () => ({ default: { customer: { findFirst: vi.fn() } } }));
import prisma from '../../lib/db.js';
import { authenticate, generateToken, optionalAuth } from '../../middleware/auth.js';

const findCustomer = vi.mocked(prisma.customer.findFirst);
const app = express();
app.get('/protected', authenticate, (_req, res) => res.sendStatus(204));
app.get('/optional', optionalAuth, (_req, res) => res.sendStatus(204));
app.use((_error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.sendStatus(500));
const customer = generateToken({ id: 'synthetic-customer', email: 'customer@example.test', type: 'customer' });
const staff = generateToken({ id: 'synthetic-staff', email: 'staff@example.test', type: 'staff', role: 'STAFF' });

beforeEach(() => { findCustomer.mockReset(); });
describe('customer JWT account existence', () => {
  it.each(['/protected', '/optional'])('accepts existing customers and rejects deleted customers on %s', async (path) => {
    findCustomer.mockResolvedValueOnce({ id: 'synthetic-customer' } as never).mockResolvedValueOnce(null);
    expect((await request(app).get(path).set('Authorization', `Bearer ${customer}`)).status).toBe(204);
    expect((await request(app).get(path).set('Authorization', `Bearer ${customer}`)).status).toBe(401);
  });
  it.each(['/protected', '/optional'])('forwards database errors on %s', async (path) => {
    findCustomer.mockRejectedValueOnce(new Error('synthetic lookup failure'));
    expect((await request(app).get(path).set('Authorization', `Bearer ${customer}`)).status).toBe(500);
  });
  it('preserves valid staff and invalid-token behavior', async () => {
    expect((await request(app).get('/protected').set('Authorization', `Bearer ${staff}`)).status).toBe(204);
    expect((await request(app).get('/protected').set('Authorization', 'Bearer invalid')).status).toBe(401);
    expect(findCustomer).not.toHaveBeenCalled();
  });
  it('rejects a customer token without an id', async () => {
    const missing = generateToken({ email: 'customer@example.test', type: 'customer' } as never);
    expect((await request(app).get('/protected').set('Authorization', `Bearer ${missing}`)).status).toBe(401);
    expect((await request(app).get('/optional').set('Authorization', `Bearer ${missing}`)).status).toBe(401);
    expect(findCustomer).not.toHaveBeenCalled();
  });
});
