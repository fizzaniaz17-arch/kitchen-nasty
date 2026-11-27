const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const chromeLauncher = require('chrome-launcher');

const API = 'http://127.0.0.1:3000';
const ADMIN = 'http://localhost:5173';
const reportDirectory = path.resolve('reports/student-3/lighthouse');

async function main() {
  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
    logLevel: 'error',
  });

  try {
    const lighthouseModule = await import('lighthouse');
    const lighthouse = lighthouseModule.default;
    const login = await fetch(`${API}/api/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@kitchenasty.com', password: 'admin123' }),
    });
    if (!login.ok) throw new Error(`Staff login failed with HTTP ${login.status}`);
    const { data: { token } } = await login.json();

    const reservationResponse = await fetch(`${API}/api/reservations?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!reservationResponse.ok) {
      throw new Error(`Could not load a seeded reservation: HTTP ${reservationResponse.status}`);
    }
    const { data: reservations } = await reservationResponse.json();
    if (!reservations.length) throw new Error('No reservation is available for the detail-page audit');

    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
    const page = await browser.contexts()[0].newPage();
    await page.goto(ADMIN);
    await page.evaluate((value) => localStorage.setItem('token', value), token);

    fs.mkdirSync(reportDirectory, { recursive: true });
    const routes = [
      { path: '/reservations', name: 'admin-reservation-list' },
      { path: `/reservations/${reservations[0].id}`, name: 'admin-reservation-detail' },
    ];

    await routes.reduce(async (previousAudit, route) => {
      await previousAudit;
      const url = `${ADMIN}${route.path}`;
      await page.goto(url);
      const { lhr, report } = await lighthouse(url, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        preset: 'desktop',
        onlyCategories: ['accessibility', 'best-practices', 'seo'],
        disableStorageReset: true,
      });
      fs.writeFileSync(path.join(reportDirectory, `${route.name}.json`), report);
      const scores = Object.fromEntries(
        ['accessibility', 'best-practices', 'seo'].map((category) => [
          category,
          lhr.categories[category].score,
        ]),
      );
      console.log(`${route.name}: ${JSON.stringify(scores)}`);
    }, Promise.resolve());
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
