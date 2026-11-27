import { test, expect, APIRequestContext, Page } from '@playwright/test';

const API = process.env.STUDENT3_API_URL || 'http://127.0.0.1:3000';
const ADMIN = process.env.STUDENT3_ADMIN_URL || 'http://localhost:5173';

async function loginCustomer(request: APIRequestContext) {
  const response = await request.post(`${API}/api/auth/customer/login`, {
    data: {
      email: 'customer@example.com',
      password: 'customer123',
    },
  });
  expect(response.ok(), `Customer login failed with HTTP ${response.status()}`).toBeTruthy();
  const body = await response.json();
  return { token: body.data.token as string, customer: body.data.customer };
}

async function staffLogin(request: APIRequestContext) {
  const response = await request.post(`${API}/api/auth/staff/login`, {
    data: {
      email: 'admin@kitchenasty.com',
      password: 'admin123',
    },
  });
  expect(response.ok(), `Staff login failed with HTTP ${response.status()}`).toBeTruthy();
  const body = await response.json();
  return body.data.token as string;
}

async function getLocation(request: APIRequestContext) {
  const response = await request.get(`${API}/api/locations`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data.length).toBeGreaterThan(0);
  return body.data[0].id as string;
}

async function setLocalToken(page: Page, token: string) {
  await page.goto('/');
  await page.evaluate((value) => localStorage.setItem('token', value), token);
  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('Student 3 reservation UI workflow', () => {
  test('customer creates a reservation and admin manages the same record', async ({ page, request }) => {
    test.setTimeout(process.env.STUDENT3_ZAP_PROXY ? 180000 : 60000);
    const customer = await loginCustomer(request);
    const staffToken = await staffLogin(request);
    const locationId = await getLocation(request);
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const comment = `SQE Student 3 reservation ${Date.now()}`;

    const availability = await request.get(
      `${API}/api/reservations/availability?locationId=${locationId}&date=${date}&partySize=2`,
    );
    expect(availability.ok()).toBeTruthy();
    const availabilityBody = await availability.json();
    const availableSlot = availabilityBody.data.slots.find((slot: { available: boolean }) => slot.available);
    expect(availableSlot).toBeDefined();

    await setLocalToken(page, customer.token);
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
    const reservationId = created.id as string;

    try {
      await page.goto(`${ADMIN}/reservations/${reservationId}`);
      await page.evaluate((token) => localStorage.setItem('token', token), staffToken);
      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Reservation Details' })).toBeVisible();
      await expect(page.getByText(customer.customer.name, { exact: true })).toBeVisible();
      await expect(page.getByText(comment, { exact: true })).toBeVisible();

      const statusResponse = page.waitForResponse(
        (response) => response.url().includes(`/api/reservations/${reservationId}`) && response.request().method() === 'PATCH',
      );
      await page.getByRole('button', { name: /Set status to CONFIRMED/ }).click();
      await statusResponse;
      await expect(page.getByText('CONFIRMED', { exact: true }).first()).toBeVisible();

      const detail = await request.get(`${API}/api/reservations/${reservationId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(detail.ok()).toBeTruthy();
      const detailBody = await detail.json();
      expect(detailBody.data.id).toBe(reservationId);
      expect(detailBody.data.status).toBe('CONFIRMED');
      expect(detailBody.data.comment).toBe(comment);
    } finally {
      await request.delete(`${API}/api/reservations/${reservationId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
    }
  });

  test('keyboard Tab navigation reaches reservation form controls', async ({ page }) => {
    await page.goto('/reservations');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });
});
