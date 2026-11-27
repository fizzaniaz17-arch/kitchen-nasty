import { test, expect, Page } from '@playwright/test';

const location = { id: 'test-location', name: 'Test Location', address: '1 Test Street' };
const customer = {
  id: 'test-customer',
  email: 'customer@example.com',
  name: 'Test Customer',
};

async function mockCustomerSession(page: Page) {
  await page.addInitScript(() => localStorage.setItem('token', 'test-token'));
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { success: true, data: { customer } } }),
  );
  await page.route('**/api/reservations/my-reservations', (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );
}

async function mockReservationForm(page: Page) {
  await page.route('**/api/locations', (route) =>
    route.fulfill({ json: { success: true, data: [location] } }),
  );
  await page.route('**/api/reservations/availability**', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { slots: [{ time: '11:00', available: true }] },
      },
    }),
  );
}

function futureDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

test.describe('Student 3 reservation form flows', () => {
  test('refreshes availability when party size changes and shows no-slots feedback', async ({ page }) => {
    const availabilityUrls: string[] = [];
    await page.route('**/api/locations', (route) =>
      route.fulfill({ json: { success: true, data: [location] } }),
    );
    await page.route('**/api/reservations/availability**', (route) => {
      availabilityUrls.push(route.request().url());
      return route.fulfill({ json: { success: true, data: { slots: [] } } });
    });

    await page.goto('/reservations');
    await page.getByLabel('Location').selectOption(location.id);
    await page.getByLabel('Date').fill(futureDate());
    await expect(page.getByText('No time slots available for this date.')).toBeVisible();
    expect(availabilityUrls).toHaveLength(1);
    expect(new URL(availabilityUrls[0]).searchParams.get('partySize')).toBe('2');

    const changedSizeRequest = page.waitForResponse((response) =>
      response.url().includes('/api/reservations/availability') &&
      new URL(response.url()).searchParams.get('partySize') === '4',
    );
    await page.getByLabel('Party Size').selectOption('4');
    await changedSizeRequest;
    expect(availabilityUrls).toHaveLength(2);
    expect(new URL(availabilityUrls[1]).searchParams.get('partySize')).toBe('4');
    await expect(page.getByText('No time slots available for this date.')).toBeVisible();
  });

  test('shows the API error instead of success when reservation submission fails', async ({ page }) => {
    await mockCustomerSession(page);
    await mockReservationForm(page);
    await page.route('**/api/reservations', (route) =>
      route.fulfill({
        status: 503,
        json: { success: false, error: 'Reservation service unavailable' },
      }),
    );

    await page.goto('/reservations');
    const bookButton = page.getByRole('button', { name: 'Book Table' });
    await expect(bookButton).toBeEnabled();
    await page.getByLabel('Location').selectOption(location.id);
    await page.getByLabel('Date').fill(futureDate());
    await page.getByRole('button', { name: '11:00', exact: true }).click();

    const submitResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/reservations') &&
        response.request().method() === 'POST',
    );
    await bookButton.click();
    await submitResponse;

    await expect(page.getByText('Reservation service unavailable')).toBeVisible();
    await expect(page.getByText('Reservation created!', { exact: true })).not.toBeVisible();
  });
});
