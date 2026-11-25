import { test, expect } from '@playwright/test';

test.describe('Storefront Navigation', () => {
  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/some-unknown-page');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Page Not Found')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible();
  });

  test('back to home from 404 page', async ({ page }) => {
    await page.goto('/some-unknown-page');
    await page.getByRole('link', { name: 'Back to Home' }).click();
    await expect(page).toHaveURL('/');
  });

  test('header is sticky and visible on scroll', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS('position', 'sticky');
  });

  test('footer is visible at bottom of page', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(new Date().getFullYear().toString());
  });

  test('home page headings follow a sequential hierarchy', async ({ page }) => {
    await page.goto('/');
    const levels = await page.locator('main h1, main h2, main h3').evaluateAll((headings) =>
      headings.map((heading) => Number(heading.tagName.slice(1))),
    );

    expect(levels).toEqual([1, 2, 2, 2, 2]);
  });

  test('mobile menu exposes its state and supports keyboard navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const menuToggle = page.getByRole('button', { name: 'Toggle menu' });

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(menuToggle).toBeFocused();
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menuToggle).toHaveAttribute('aria-controls', 'storefront-mobile-nav');

    await page.keyboard.press('Enter');
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#storefront-mobile-nav')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Home' })).toBeFocused();
  });
});
