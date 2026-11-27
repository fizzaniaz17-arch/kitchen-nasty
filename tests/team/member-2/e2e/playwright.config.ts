import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const output = process.env.M2_E2E_OUTPUT;
const url = new URL(process.env.DATABASE_URL || 'about:blank');
if (!output || url.protocol !== 'postgresql:' || url.host !== '127.0.0.1:55433' ||
    url.username !== 'm2_e2e' || url.pathname !== '/kitchenasty_member2_e2e' || url.search) {
  throw new Error('Start the disposable environment with node tests/team/member-2/e2e/run.mjs');
}
const cwd = resolve(__dirname, '../../../..');
export default defineConfig({
  testDir: __dirname, testMatch: '*.spec.ts', workers: 1, retries: 0, timeout: 45000,
  outputDir: resolve(output, 'artifacts'),
  reporter: [['list'], ['json', { outputFile: resolve(output, 'results.json') }]],
  use: {
    channel: process.env.M2_BROWSER_CHANNEL || undefined, locale: 'en-US', timezoneId: 'UTC',
    trace: { mode: 'on', sources: false }, screenshot: 'on',
  },
  webServer: [
    { cwd, command: 'node node_modules/tsx/dist/cli.mjs packages/server/src/index.ts',
      env: { PORT: '3302' }, url: 'http://127.0.0.1:3302/api/health', reuseExistingServer: false },
    ...(['admin', 'storefront'] as const).map((app) => ({
      cwd, command: 'node tests/team/member-2/e2e/serve-ui.mjs ' + app,
      url: 'http://127.0.0.1:' + (app === 'admin' ? '5273' : '5274'), reuseExistingServer: false,
    })),
  ],
});
