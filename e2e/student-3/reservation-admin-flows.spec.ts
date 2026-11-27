import { test, expect } from '@playwright/test';

const staff = {
  id: 'test-staff',
  email: 'staff@example.com',
  name: 'Test Staff',
  role: 'STAFF',
};

test('staff can filter reservations by status and date', async ({ page }) => {
  const listRequests: string[] = [];

  await page.addInitScript(() => localStorage.setItem('token', 'test-token'));
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { success: true, data: { user: staff } } }),
  );
  await page.route('**/api/reservations**', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    listRequests.push(route.request().url());
    return route.fulfill({
      json: {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
    });
  });

  await page.goto('http://localhost:5173/reservations');
  await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

  const statusRequest = page.waitForResponse((response) =>
    response.url().includes('/api/reservations?') &&
    new URL(response.url()).searchParams.get('status') === 'CANCELLED',
  );
  await page.getByLabel('Filter by status').selectOption('CANCELLED');
  await statusRequest;

  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dateRequest = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/reservations' &&
      url.searchParams.get('status') === 'CANCELLED' &&
      url.searchParams.get('date') === date;
  });
  await page.getByLabel('Filter by date').fill(date);
  await dateRequest;

  expect(
    listRequests.some((requestUrl) =>
      new URL(requestUrl).searchParams.get('status') === 'CANCELLED',
    ),
  ).toBeTruthy();
  expect(
    listRequests.some((requestUrl) => {
      const params = new URL(requestUrl).searchParams;
      return params.get('status') === 'CANCELLED' && params.get('date') === date;
    }),
  ).toBeTruthy();
});
