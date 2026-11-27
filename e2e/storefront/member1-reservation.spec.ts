import { expect, test } from '@playwright/test';

const location = { id: 'loc-m1', name: 'Member 1 Bistro' };
const customer = { id: 'customer-m1', name: 'Synthetic Customer', email: 'm1@example.test' };

async function setup(page: import('@playwright/test').Page, options: { available?: boolean; createStatus?: number } = {}) {
  const created: Record<string, unknown>[] = [];
  await page.addInitScript(() => localStorage.setItem('token', 'synthetic-customer-token'));
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { success: true, data: customer } }));
  await page.route('**/api/locations', (route) => route.fulfill({ json: { success: true, data: [location] } }));
  await page.route('**/api/reservations/my-reservations*', (route) => route.fulfill({ json: { success: true, data: created } }));
  await page.route('**/api/reservations/availability*', (route) => route.fulfill({
    json: { success: true, data: { slots: [{ time: '19:00', available: options.available ?? true }], totalTables: 1 } },
  }));
  await page.route('**/api/reservations', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = route.request().postDataJSON();
    if (options.createStatus && options.createStatus >= 400) {
      return route.fulfill({ status: options.createStatus, json: { success: false, error: 'Synthetic booking rejected' } });
    }
    created.push({ id: 'reservation-m1', ...body, status: 'PENDING', location });
    return route.fulfill({ status: 201, json: { success: true, data: created[0] } });
  });
  return created;
}

async function selectBooking(page: import('@playwright/test').Page) {
  await page.goto('/reservations');
  await page.getByRole('main').locator('select').first().selectOption(location.id);
  await page.locator('input[type="date"]').fill('2027-01-10');
  await page.getByRole('button', { name: '19:00' }).click();
}

test('UC-M1-01-MAIN creates a reservation and records the submitted postcondition', async ({ page }) => {
  const created = await setup(page);
  await selectBooking(page);
  await page.getByRole('button', { name: 'Book Table' }).click();
  await expect(page.getByText('Reservation created!')).toBeVisible();
  expect(created).toHaveLength(1);
  expect(created[0]).toMatchObject({ locationId: location.id, date: '2027-01-10', time: '19:00', partySize: 2 });
});

test('UC-M1-01-ALT-01 accepts an alternate party size and special request', async ({ page }) => {
  const created = await setup(page);
  await selectBooking(page);
  await page.getByRole('main').locator('select').nth(1).selectOption('4');
  await page.locator('textarea').fill('Window table');
  await page.getByRole('button', { name: 'Book Table' }).click();
  expect(created[0]).toMatchObject({ partySize: 4, comment: 'Window table' });
});

test('UC-M1-01-ALT-02 prevents selection of an unavailable slot', async ({ page }) => {
  await setup(page, { available: false });
  await page.goto('/reservations');
  await page.getByRole('main').locator('select').first().selectOption(location.id);
  await page.locator('input[type="date"]').fill('2027-01-10');
  await expect(page.getByRole('button', { name: '19:00' })).toBeDisabled();
});

test('UC-M1-01-EX-01 rejects submission without location, date, and time', async ({ page }) => {
  const created = await setup(page);
  await page.goto('/reservations');
  await page.getByRole('button', { name: 'Book Table' }).click();
  await expect(page.getByText(/select.*date/i)).toBeVisible();
  expect(created).toHaveLength(0);
});

test('UC-M1-01-EX-02 displays API rejection and stores nothing', async ({ page }) => {
  const created = await setup(page, { createStatus: 409 });
  await selectBooking(page);
  await page.getByRole('button', { name: 'Book Table' }).click();
  await expect(page.getByText('Synthetic booking rejected')).toBeVisible();
  expect(created).toHaveLength(0);
});
