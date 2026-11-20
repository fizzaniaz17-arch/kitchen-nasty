import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/member1-*.spec.ts',
  fullyParallel: false,
  reporter: [['html', { outputFolder: 'playwright-report/member-1', open: 'never' }], ['list']],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CI ? {} : { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  },
  projects: [
    { name: 'member1-storefront', testMatch: 'storefront/member1-*.spec.ts', use: { baseURL: 'http://localhost:5174' } },
    { name: 'member1-admin', testMatch: 'admin/member1-*.spec.ts', use: { baseURL: 'http://localhost:5173' } },
  ],
  webServer: [
    { command: 'npm run dev:admin', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60000 },
    { command: 'npm run dev:storefront', url: 'http://localhost:5174', reuseExistingServer: true, timeout: 60000 },
  ],
});
