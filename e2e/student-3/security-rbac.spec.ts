/**
 * Student 3 — Playwright Role-Based Access Control (RBAC) Verification
 *
 * Verifies actual server-side authorization enforcement across two real application
 * roles (Customer and Staff) plus unauthenticated requests against the live API
 * and admin UI.
 */
import { test, expect, APIRequestContext } from '@playwright/test';

const API = process.env.STUDENT3_API_URL || 'http://127.0.0.1:3000';
const ADMIN = process.env.STUDENT3_ADMIN_URL || 'http://localhost:5173';

async function loginCustomer(request: APIRequestContext) {
  const res = await request.post(`${API}/api/auth/customer/login`, {
    data: { email: 'customer@example.com', password: 'customer123' },
  });
  expect(res.ok(), `Customer login failed with HTTP ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return body.data.token as string;
}

async function loginStaff(request: APIRequestContext) {
  const res = await request.post(`${API}/api/auth/staff/login`, {
    data: { email: 'admin@kitchenasty.com', password: 'admin123' },
  });
  expect(res.ok(), `Staff login failed with HTTP ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return body.data.token as string;
}

test.describe.serial('Student 3 Defensive Security — Live RBAC Enforcement', () => {
  let customerToken = '';
  let staffToken = '';

  test.beforeAll(async ({ request }) => {
    customerToken = await loginCustomer(request);
    staffToken = await loginStaff(request);
  });

  test('1. Unauthenticated user is denied access to admin reservation list (401) and UI shows login form', async ({
    page,
    request,
  }) => {
    const apiRes = await request.get(`${API}/api/reservations`);
    expect(apiRes.status()).toBe(401);

    await page.goto(`${ADMIN}/reservations`);
    await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i })).toBeVisible();
  });

  test('2. Staff role is allowed to list reservations (200) and view them in Admin UI', async ({
    page,
    request,
  }) => {
    const apiRes = await request.get(`${API}/api/reservations`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(apiRes.status()).toBe(200);

    await page.goto(`${ADMIN}/login`);
    await page.evaluate((token) => localStorage.setItem('token', token), staffToken);
    await page.goto(`${ADMIN}/reservations`);
    await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();
  });

  test('3. Customer role is denied staff-only reservation list (403)', async ({ request }) => {
    const apiRes = await request.get(`${API}/api/reservations`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(apiRes.status()).toBe(403);
  });

  test('4. Customer role is denied admin-only reservation update and delete (403)', async ({ request }) => {
    const listRes = await request.get(`${API}/api/reservations`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(listRes.status()).toBe(200);
    const listBody = await listRes.json();
    const targetId = listBody.data?.[0]?.id;
    expect(targetId).toBeTruthy();

    const patchRes = await request.patch(`${API}/api/reservations/${targetId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
      data: { status: 'CONFIRMED' },
    });
    expect(patchRes.status()).toBe(403);

    const deleteRes = await request.delete(`${API}/api/reservations/${targetId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(deleteRes.status()).toBe(403);
  });

  test('5. Customer role is allowed to read their own reservations (200)', async ({ request }) => {
    const myRes = await request.get(`${API}/api/reservations/my-reservations`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(myRes.status()).toBe(200);
  });
});
