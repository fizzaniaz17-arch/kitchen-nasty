import type { Page } from '@playwright/test';
import { dateA, dateB, expect, shop, test } from './fixtures';

type Store = { location: { id: string }; customer: { id: string }; observe: (value: unknown) => void };
const slots = (page: Page) => page.getByRole('button', { name: /^\d{2}:\d{2}$/ });
const date = (page: Page) => page.locator('input[type=date]');
const size = (page: Page) => page.getByRole('main').getByRole('combobox').nth(1);

async function lookup(page: Page, data: Store, on: string, guests: number, act: () => Promise<unknown>) {
  const [res] = await Promise.all([page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/reservations/availability' && url.searchParams.get('locationId') === data.location.id &&
      url.searchParams.get('date') === on && url.searchParams.get('partySize') === String(guests);
  }), act()]);
  const body = await res.json();
  data.observe({ url: res.url(), http: res.status(), body });
  expect(res.status()).toBe(200);
  const expected = Array.from({ length: 22 }, (_, index) => {
    const time = String(11 + Math.floor(index / 2)) + (index % 2 ? ':30' : ':00');
    return { time, available: guests <= 4 && !(on === dateA && guests > 2 && time === '19:00') };
  });
  expect(body).toMatchObject({ success: true, data: { slots: expected, totalTables: guests <= 2 ? 2 : guests <= 4 ? 1 : 0 } });
  await expect(slots(page)).toHaveCount(expected.length);
  await expect.poll(() => slots(page).evaluateAll(buttons => buttons.map(b => ({
    time: b.textContent, available: !(b as HTMLButtonElement).disabled,
  })))).toEqual(expected);
  await expect(page.locator('form .animate-spin')).toHaveCount(0);
}

async function openSearch(page: Page, data: Store, guests = 4) {
  const [mine] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/reservations/my-reservations'),
    page.goto(shop + '/reservations')]);
  expect(mine.status()).toBe(200);
  expect((await mine.json()).data).toEqual([expect.objectContaining({ customerId: data.customer.id })]);
  await page.getByRole('main').getByRole('combobox').first().selectOption(data.location.id);
  await size(page).selectOption(String(guests));
  await lookup(page, data, dateA, guests, () => date(page).fill(dateA));
}

test('UC-M2-01-MAIN compares occupied and free times', async ({ page, data }) => {
  await openSearch(page, data);
  await expect(page.getByRole('button', { name: '19:00' })).toBeDisabled();
  const free = page.getByRole('button', { name: '19:30' });
  const originalColor = await free.evaluate(button => getComputedStyle(button).backgroundColor);
  await free.click();
  await expect(free).toHaveClass(/bg-primary-600/);
  await expect(free).not.toHaveCSS('background-color', originalColor);
});

test('UC-M2-01-ALT-01 changes the date for the same party', async ({ page, data }) => {
  await openSearch(page, data);
  await lookup(page, data, dateB, 4, () => date(page).fill(dateB));
  await expect(page.getByRole('button', { name: '19:00' })).toBeEnabled();
});

test('UC-M2-01-ALT-02 finds the smaller free table', async ({ page, data }) => {
  await openSearch(page, data);
  await lookup(page, data, dateA, 2, () => size(page).selectOption('2'));
  await expect(page.getByRole('button', { name: '19:00' })).toBeEnabled();
});

test('UC-M2-01-EX-01 no table fits five guests', async ({ page, data }) => {
  await openSearch(page, data, 5);
  await expect(slots(page).and(page.locator(':enabled'))).toHaveCount(0);
});

test('UC-M2-01-EX-02 clears stale results when the date is removed', async ({ page, data }) => {
  const requests: string[] = [];
  page.on('request', req => {
    if (new URL(req.url()).pathname === '/api/reservations/availability') requests.push(req.url());
  });
  await openSearch(page, data);
  await date(page).fill('');
  await expect(date(page)).toHaveValue('');
  await expect(slots(page)).toHaveCount(0);
  await expect(page.getByText('Available Time Slots', { exact: true })).toHaveCount(0);
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  data.observe({ availabilityRequests: requests });
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every(url => new URL(url).searchParams.get('date') === dateA)).toBe(true);
});
