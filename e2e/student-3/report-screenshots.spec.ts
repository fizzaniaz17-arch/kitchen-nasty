import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, APIRequestContext, Page } from '@playwright/test';

const API = process.env.STUDENT3_API_URL || 'http://127.0.0.1:3000';
const ADMIN = process.env.STUDENT3_ADMIN_URL || 'http://localhost:5173';
const screenshotDirectory = resolve(process.cwd(), 'reports/student-3/screenshots');

async function loginStaff(request: APIRequestContext) {
  const response = await request.post(`${API}/api/auth/staff/login`, {
    data: {
      email: 'admin@kitchenasty.com',
      password: 'admin123',
    },
  });
  expect(response.ok(), `Staff login failed with HTTP ${response.status()}`).toBeTruthy();
  const body: { data: { token: string } } = await response.json();
  return body.data.token;
}

async function loginCustomer(request: APIRequestContext) {
  const response = await request.post(`${API}/api/auth/customer/login`, {
    data: {
      email: 'customer@example.com',
      password: 'customer123',
    },
  });
  expect(response.ok(), `Customer login failed with HTTP ${response.status()}`).toBeTruthy();
  const body = await response.json();
  return { token: body.data.token as string, name: body.data.customer.name as string };
}

async function getLocationId(request: APIRequestContext) {
  const response = await request.get(`${API}/api/locations`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data.length).toBeGreaterThan(0);
  return body.data[0].id as string;
}

async function authenticateAdmin(page: Page, token: string) {
  await page.goto(ADMIN);
  await page.evaluate((value) => localStorage.setItem('token', value), token);
  await page.reload();
  await page.waitForLoadState('networkidle');
}

test('captures reservation screens for the Student 3 report', async ({ page, request }) => {
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto('/reservations');
  await expect(page.getByRole('heading', { name: 'Table Reservations' })).toBeVisible();
  await page.screenshot({
    path: resolve(screenshotDirectory, 'customer-reservation-form.png'),
    fullPage: true,
  });

  const customer = await loginCustomer(request);
  const staffToken = await loginStaff(request);
  const locationId = await getLocationId(request);
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const comment = `Student 3 report evidence ${Date.now()}`;
  let reservationId: string | undefined;

  const availability = await request.get(
    `${API}/api/reservations/availability?locationId=${locationId}&date=${date}&partySize=2`,
  );
  expect(availability.ok()).toBeTruthy();
  const availabilityBody = await availability.json();
  const availableSlot = availabilityBody.data.slots.find((slot: { available: boolean }) => slot.available);
  expect(availableSlot).toBeDefined();

  try {
    await page.goto('/');
    await page.evaluate((value) => localStorage.setItem('token', value), customer.token);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.goto('/reservations');

    const form = page.locator('form');
    await form.locator('select').nth(0).selectOption(locationId);
    await page.locator('input[type="date"]').fill(date);
    await form.locator('select').nth(1).selectOption('2');
    await page.getByRole('button', { name: availableSlot.time, exact: true }).click();
    await page.locator('textarea').fill(comment);
    await page.getByRole('button', { name: 'Book Table', exact: true }).click();
    await expect(page.getByText('Reservation created!', { exact: true })).toBeVisible();

    const myReservations = await request.get(`${API}/api/reservations/my-reservations`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect(myReservations.ok()).toBeTruthy();
    const myBody = await myReservations.json();
    const created = myBody.data.find((reservation: { comment: string | null }) => reservation.comment === comment);
    expect(created).toBeDefined();
    reservationId = created.id as string;

    const acceptCookies = page.getByRole('button', { name: 'Accept All' });
    if (await acceptCookies.isVisible()) {
      await acceptCookies.click();
    }
    await page.screenshot({
      path: resolve(screenshotDirectory, 'customer-reservation-created.png'),
      fullPage: true,
    });

    await authenticateAdmin(page, staffToken);
    await page.goto(`${ADMIN}/reservations`);
    await expect(page.getByRole('heading', { name: 'Reservations', exact: true })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await page.screenshot({
      path: resolve(screenshotDirectory, 'admin-reservation-list.png'),
      fullPage: true,
    });

    await page.goto(`${ADMIN}/reservations/${reservationId}`);
    await expect(page.getByRole('heading', { name: 'Reservation Details' })).toBeVisible();
    await expect(page.getByText(customer.name, { exact: true })).toBeVisible();
    await expect(page.getByText(comment, { exact: true })).toBeVisible();
    await page.screenshot({
      path: resolve(screenshotDirectory, 'admin-reservation-detail-pending.png'),
      fullPage: true,
    });

    const statusResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/reservations/${reservationId}`) &&
        response.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: /Set status to CONFIRMED/ }).click();
    await statusResponse;
    await expect(page.getByText('CONFIRMED', { exact: true }).first()).toBeVisible();
    await page.screenshot({
      path: resolve(screenshotDirectory, 'admin-reservation-detail-confirmed.png'),
      fullPage: true,
    });
  } finally {
    if (reservationId) {
      const cleanup = await request.delete(`${API}/api/reservations/${reservationId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(cleanup.ok(), `Reservation cleanup failed with HTTP ${cleanup.status()}`).toBeTruthy();
    }
  }
});
