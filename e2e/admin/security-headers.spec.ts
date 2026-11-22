import { test, expect } from '@playwright/test';

test('admin development server returns security headers', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();

  expect(response.ok()).toBeTruthy();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
});
