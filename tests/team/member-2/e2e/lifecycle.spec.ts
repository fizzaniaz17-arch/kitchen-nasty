import type { Locator, Page } from '@playwright/test';
import type { ReservationStatus } from '@prisma/client';
import { admin, expect, test, type Data } from './fixtures';

test.use({ actor: 'staff' });
const detailBadge = (page: Page) => page.getByRole('heading', { name: 'Reservation Details' })
  .locator('../..').locator('span').last();
const patchFor = (page: Page, id: string) => page.waitForResponse(r =>
  r.request().method() === 'PATCH' && new URL(r.url()).pathname === '/api/reservations/' + id);

async function open(page: Page, data: Data, list: boolean) {
  const id = data.reservation.id;
  const path = list ? '/reservations' : '/reservations/' + id;
  const [loaded] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api' + path),
    page.goto(admin + path)]);
  expect(loaded.status()).toBe(200);
  const body = (await loaded.json()).data;
  expect(list ? body.find((r: { id: string }) => r.id === id) : body).toMatchObject({ id, status: data.reservation.status });
  const row = page.getByRole('row').filter({ has: page.locator('a[href="/reservations/' + id + '"]') });
  const badge = list ? row.getByRole('cell').nth(4) : detailBadge(page);
  await expect(badge).toHaveText(data.reservation.status);
  return badge;
}

async function transition(page: Page, data: Data, badge: Locator, action: string, status: ReservationStatus) {
  const id = data.reservation.id;
  const [res] = await Promise.all([patchFor(page, id), page.getByRole('button', { name: action, exact: true }).click()]);
  const body = await res.json();
  const stored = await data.db.reservation.findUniqueOrThrow({ where: { id } });
  await expect(badge).toHaveText(status);
  data.observe({ target: status, http: res.status(), responseId: body.data?.id, responseStatus: body.data?.status,
    displayed: (await badge.textContent())?.trim(), stored });
  expect(res.status()).toBe(200);
  expect(body.data).toMatchObject({ id, status });
  expect(stored).toEqual({ ...data.reservation, status, updatedAt: stored.updatedAt });
}

async function invalid(page: Page, data: Data, target: ReservationStatus) {
  const original = data.reservation;
  const badge = await open(page, data, false);
  const action = page.getByRole('button', { name: 'Set status to ' + target + ' for ' + data.customer.name + "'s reservation" });
  let http: number | null = null;
  let reply: unknown = null;
  let displayed: string | null;
  if (await action.count() && await action.isEnabled()) {
    const [res] = await Promise.all([patchFor(page, original.id), action.click()]);
    http = res.status();
    const body = await res.json();
    reply = body.data ? { id: body.data.id, status: body.data.status } : body;
    if (res.ok()) await expect(badge).toHaveText(body.data.status);
    else await expect(page.locator('.bg-red-50')).toBeVisible();
    displayed = await (res.ok() ? badge : page.locator('.bg-red-50')).textContent();
  } else {
    displayed = await badge.textContent();
  }
  await page.reload();
  await expect(badge).toBeVisible();
  const stored = await data.db.reservation.findUniqueOrThrow({ where: { id: original.id } });
  const afterReload = (await badge.textContent())?.trim();
  data.observe({ expected: 'Prevent action or reject with 4xx and preserve the original row', target, http, reply, displayed, afterReload, stored });
  expect.soft(http === null || (http >= 400 && http < 500), 'transition was prevented or rejected').toBe(true);
  expect.soft(afterReload, 'status after reload').toBe(original.status);
  expect.soft(stored, 'persisted reservation').toEqual(original);
}

test.describe('new reservation', () => {
  test.use({ initial: 'PENDING' });
  test('UC-M2-02-MAIN confirms, seats and completes the same booking', async ({ page, data }) => {
    const badge = await open(page, data, true);
    for (const [action, status] of [['Confirm', 'CONFIRMED'], ['Seat', 'SEATED'], ['Complete', 'COMPLETED']] as const) {
      await transition(page, data, badge, action + ' reservation for ' + data.customer.name, status);
    }
    await page.reload();
    await expect(badge).toHaveText('COMPLETED');
  });
  test('UC-M2-02-ALT-01 cancels a pending booking from the list', async ({ page, data }) => {
    const badge = await open(page, data, true);
    await transition(page, data, badge, 'Cancel reservation for ' + data.customer.name, 'CANCELLED');
    await page.reload();
    await expect(badge).toHaveText('CANCELLED');
  });
  test('UC-M2-02-EX-01 rejects premature completion', async ({ page, data }) => {
    await invalid(page, data, 'COMPLETED');
  });
});

test('UC-M2-02-ALT-02 cancels a confirmed booking from detail', async ({ page, data }) => {
  const badge = await open(page, data, false);
  await transition(page, data, badge, 'Set status to CANCELLED for ' + data.customer.name + "'s reservation", 'CANCELLED');
  await page.reload();
  await expect(badge).toHaveText('CANCELLED');
});

test.describe('cancelled reservation', () => {
  test.use({ initial: 'CANCELLED' });
  test('UC-M2-02-EX-02 rejects reopening a cancelled booking', async ({ page, data }) => {
    await invalid(page, data, 'CONFIRMED');
  });
});
