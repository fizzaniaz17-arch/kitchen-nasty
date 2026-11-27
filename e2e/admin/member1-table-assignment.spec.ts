import { expect, test } from '@playwright/test';

const tables = [{ id: 'table-a', name: 'Table A', capacity: 4 }, { id: 'table-b', name: 'Table B', capacity: 6 }];

async function setup(page: import('@playwright/test').Page, options: { patchStatus?: number; noTables?: boolean } = {}) {
  let reservation: any = {
    id: 'reservation-m1', date: '2027-01-10', time: '19:00', partySize: 4, status: 'PENDING', comment: null,
    customer: { id: 'c-1', name: 'Synthetic Customer', email: 'm1@example.test', phone: null },
    location: { id: 'loc-m1', name: 'Member 1 Bistro' }, table: null,
  };
  await page.addInitScript(() => localStorage.setItem('token', 'synthetic-staff-token'));
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { success: true, data: { user: { id: 's-1', role: 'MANAGER', name: 'Manager', email: 'manager@example.test' } } } }));
  await page.route('**/api/locations/loc-m1/tables', (route) => route.fulfill({ json: { success: true, data: options.noTables ? [] : tables } }));
  await page.route('**/api/reservations/reservation-m1', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { success: true, data: reservation } });
    if (options.patchStatus && options.patchStatus >= 400) return route.fulfill({ status: options.patchStatus, json: { success: false, error: 'Assignment rejected' } });
    const update = route.request().postDataJSON();
    reservation = { ...reservation, table: tables.find((table) => table.id === update.tableId) ?? null };
    return route.fulfill({ json: { success: true, data: reservation } });
  });
  return () => reservation;
}

test('UC-M1-02-MAIN assigns a table and shows the persisted readback', async ({ page }) => {
  const read = await setup(page);
  await page.goto('/reservations/reservation-m1');
  await page.getByLabel('Assign table').selectOption('table-a');
  await expect(page.getByRole('definition').filter({ hasText: 'Table A (seats 4)' })).toBeVisible();
  expect(read().table.id).toBe('table-a');
});

test('UC-M1-02-ALT-01 changes an assignment to another eligible table', async ({ page }) => {
  const read = await setup(page);
  await page.goto('/reservations/reservation-m1');
  await page.getByLabel('Assign table').selectOption('table-b');
  await expect(page.getByRole('definition').filter({ hasText: 'Table B (seats 6)' })).toBeVisible();
  expect(read().table.id).toBe('table-b');
});

test('UC-M1-02-ALT-02 clears an existing assignment', async ({ page }) => {
  const read = await setup(page);
  await page.goto('/reservations/reservation-m1');
  await page.getByLabel('Assign table').selectOption('table-a');
  await page.getByLabel('Assign table').selectOption('');
  await expect(page.getByText('Unassigned')).toBeVisible();
  expect(read().table).toBeNull();
});

test('UC-M1-02-EX-01 keeps assignment unchanged when API rejects update', async ({ page }) => {
  const read = await setup(page, { patchStatus: 409 });
  await page.goto('/reservations/reservation-m1');
  await page.getByLabel('Assign table').selectOption('table-a');
  await expect(page.getByText('Assignment rejected')).toBeVisible();
  expect(read().table).toBeNull();
});

test('UC-M1-02-EX-02 shows only unassigned when no tables exist', async ({ page }) => {
  const read = await setup(page, { noTables: true });
  await page.goto('/reservations/reservation-m1');
  await expect(page.getByLabel('Assign table').locator('option')).toHaveCount(1);
  expect(read().table).toBeNull();
});
