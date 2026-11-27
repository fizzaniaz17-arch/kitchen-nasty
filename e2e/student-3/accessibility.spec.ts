import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const accessibilityReports = resolve(process.cwd(), 'reports/student-3/accessibility');

function saveReport(name: string, results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  mkdirSync(accessibilityReports, { recursive: true });
  writeFileSync(resolve(accessibilityReports, name), JSON.stringify(results, null, 2));
}

test('reservation page has no serious or critical axe violations', async ({ page }) => {
  await page.goto('/reservations');
  const results = await new AxeBuilder({ page })
    .include('main')
    .analyze();
  saveReport('reservation-after.json', results);

  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious).toEqual([]);
});

test('records axe findings for the pre-fix label state', async ({ page }) => {
  await page.goto('/reservations');
  for (const id of ['reservation-location', 'reservation-date', 'reservation-party-size', 'reservation-comment']) {
    await page.locator(`label[for="${id}"]`).evaluate((label) => label.removeAttribute('for'));
    await page.locator(`#${id}`).evaluate((control) => control.removeAttribute('id'));
  }
  const results = await new AxeBuilder({ page })
    .include('main')
    .analyze();
  saveReport('reservation-before.json', results);
  expect(results.violations.some((violation) => violation.id === 'label')).toBeTruthy();
});

test('reservation form controls have associated labels', async ({ page }) => {
  await page.goto('/reservations');
  await expect(page.locator('#reservation-location')).toBeVisible();
  await expect(page.locator('#reservation-location')).toHaveAccessibleName(/.+/);
  await expect(page.locator('#reservation-date')).toBeVisible();
  await expect(page.locator('#reservation-date')).toHaveAccessibleName(/.+/);
  await expect(page.locator('#reservation-party-size')).toBeVisible();
  await expect(page.locator('#reservation-party-size')).toHaveAccessibleName(/.+/);
  await expect(page.locator('#reservation-comment')).toBeVisible();
  await expect(page.locator('#reservation-comment')).toHaveAccessibleName(/.+/);
});
