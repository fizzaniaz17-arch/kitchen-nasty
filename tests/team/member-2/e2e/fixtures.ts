import { test as base, expect } from '@playwright/test';
import { PrismaClient, type ReservationStatus } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';

export const api = 'http://127.0.0.1:3302';
export const shop = 'http://127.0.0.1:5274';
export const admin = 'http://127.0.0.1:5273';
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
export const dateA = day(7), dateB = day(8);

async function seed(db: PrismaClient, initial: ReservationStatus) {
  const id = randomUUID();
  const password = randomBytes(24).toString('hex');
  const hash = await bcrypt.hash(password, 8);
  return db.$transaction(async tx => {
    const location = await tx.location.create({ data: { name: 'M2 Bistro ' + id, slug: 'm2-' + id, address: 'Test', city: 'Test', postalCode: '00000' } });
    const customer = await tx.customer.create({ data: { name: 'M2 Guest ' + id, email: id + '@example.test', password: hash }, select: { id: true, name: true, email: true } });
    const staff = await tx.user.create({ data: { name: 'M2 Staff', email: 'staff-' + id + '@example.test', role: 'STAFF', locationId: location.id, password: hash }, select: { id: true, email: true } });
    const small = await tx.table.create({ data: { name: 'Two seats', capacity: 2, locationId: location.id } });
    const large = await tx.table.create({ data: { name: 'Four seats', capacity: 4, locationId: location.id } });
    const reservation = await tx.reservation.create({ data: { locationId: location.id, customerId: customer.id, tableId: large.id,
      date: new Date(dateA), time: '19:00', partySize: 4, status: initial, comment: 'Synthetic browser fixture' } });
    return { location, customer, staff, small, large, reservation, password };
  });
}
export type Data = Awaited<ReturnType<typeof seed>> & {
  db: PrismaClient;
  observe: (value: unknown) => void;
};

export const test = base.extend<{ actor: 'customer' | 'staff'; initial: ReservationStatus; data: Data }>({
  actor: ['customer', { option: true }], initial: ['CONFIRMED', { option: true }],
  data: async ({ initial }, use, info) => {
    const db = new PrismaClient();
    try {
      const [identity] = await db.$queryRaw<{ database: string; role: string }[]>`SELECT current_database() AS database, current_user AS role`;
      expect(identity).toEqual({ database: 'kitchenasty_member2_e2e', role: 'm2_e2e' });
      const f = await seed(db, initial);
      const where = { locationId: f.location.id };
      const snapshot = async () => ({
        reservations: await db.reservation.findMany({ where, orderBy: { id: 'asc' } }),
        tables: await db.table.findMany({ where, orderBy: { id: 'asc' } }),
      });
      const before = await snapshot();
      const observations: unknown[] = [];
      try {
        await use({ ...f, db, observe: value => observations.push(value) });
      } finally {
        const after = await snapshot();
        const path = info.outputPath('observations.json');
        await writeFile(path, JSON.stringify({ test: info.title, identity, dateA, dateB, before, observations, after }, null, 2));
        await info.attach('fixture and observations', { path, contentType: 'application/json' });
        if (info.title.startsWith('UC-M2-01')) expect.soft(after).toEqual(before);
        await db.$transaction([
          db.reservation.deleteMany({ where }), db.table.deleteMany({ where }),
          db.user.delete({ where: { id: f.staff.id } }), db.customer.delete({ where: { id: f.customer.id } }),
          db.location.delete({ where: { id: f.location.id } }),
        ]);
      }
    } finally { await db.$disconnect(); }
  },
  storageState: async ({ data, actor }, use) => {
    const account = actor === 'staff' ? data.staff : data.customer;
    const response = await fetch(api + '/api/auth/' + actor + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: account.email, password: data.password }),
    });
    expect(response.status).toBe(200);
    const { data: session } = await response.json();
    const origin = actor === 'staff' ? admin : shop;
    await use({ cookies: [], origins: [{ origin, localStorage: [{ name: 'token', value: session.token }] }] });
  },
});
export { expect };
