import { test, expect } from '@playwright/test';

test('exchanges the social login code without retaining it in the browser URL', async ({ page }) => {
  let exchangePayload: unknown;

  await page.route('**/api/auth/social/exchange', async (route) => {
    exchangePayload = route.request().postDataJSON();
    await route.fulfill({
      json: { success: true, data: { token: 'test-social-token' } },
    });
  });
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          type: 'customer',
          customer: { id: 'customer-1', email: 'customer@example.com', name: 'Test Customer' },
        },
      },
    });
  });
  await page.route('**/api/loyalty/balance', async (route) => {
    await route.fulfill({ json: { success: true, data: { points: 0 } } });
  });
  await page.route('**/api/settings', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          id: 'default',
          siteName: 'KitchenAsty',
          siteTitle: 'KitchenAsty - Order Online',
          favicon: null,
          logo: null,
          colorPrimary: '#ea580c',
          colorSecondary: '#9333ea',
          darkMode: 'light',
          storefrontTemplate: 'classic',
          heroSection: null,
          featuresSection: null,
          ctaSection: null,
        },
      },
    });
  });
  await page.route('**/api/legal/cookie-categories', async (route) => {
    await route.fulfill({ json: { success: true, data: [] } });
  });

  await page.goto('/auth/callback?code=one-time-code');

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('link', { name: 'Test Customer' })).toBeVisible();
  expect(exchangePayload).toEqual({ code: 'one-time-code' });
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('test-social-token');
});
