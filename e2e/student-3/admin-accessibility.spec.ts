import { test, expect, APIRequestContext, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = process.env.STUDENT3_API_URL || 'http://127.0.0.1:3000';
const ADMIN = process.env.STUDENT3_ADMIN_URL || 'http://localhost:5173';
const accessibilityReports = resolve(process.cwd(), 'reports/student-3/accessibility');

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

async function openAdminPage(page: Page, token: string, pathname: string) {
  const pendingOrdersResponse = page.waitForResponse((response) =>
    response.url().includes('/api/orders?status=PENDING&page=1&limit=1'),
  );
  await page.goto(ADMIN);
  await page.evaluate((value) => localStorage.setItem('token', value), token);
  await page.goto(`${ADMIN}${pathname}`);
  await page.waitForLoadState('networkidle');
  expect((await pendingOrdersResponse).ok()).toBeTruthy();
}

function saveReport(name: string, results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  mkdirSync(accessibilityReports, { recursive: true });
  writeFileSync(resolve(accessibilityReports, name), JSON.stringify(results, null, 2));
}

async function auditAdminPage(page: Page, reportName: string) {
  const results = await new AxeBuilder({ page }).analyze();
  saveReport(reportName, results);

  expect(results.violations).toEqual([]);
}

test.describe('Student 3 admin reservation accessibility', () => {
  test('reservation list has no serious or critical axe violations', async ({ page, request }) => {
    const token = await loginStaff(request);
    await openAdminPage(page, token, '/reservations');
    await expect(page.getByRole('heading', { name: 'Reservations', exact: true })).toBeVisible();
    await auditAdminPage(page, 'admin-reservation-list.json');
  });

  test('reservation detail has no serious or critical axe violations', async ({ page, request }) => {
    const token = await loginStaff(request);
    const response = await request.get(`${API}/api/reservations?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const body: { data: Array<{ id: string }> } = await response.json();
    expect(body.data.length).toBeGreaterThan(0);

    await openAdminPage(page, token, `/reservations/${body.data[0].id}`);
    await expect(page.getByRole('heading', { name: 'Reservation Details' })).toBeVisible();
    await auditAdminPage(page, 'admin-reservation-detail.json');
  });
});
