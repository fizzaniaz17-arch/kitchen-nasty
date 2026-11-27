const fs = require('node:fs');
const path = require('node:path');

const ZAP = process.env.STUDENT3_ZAP_API || 'http://127.0.0.1:8080';
const projectRoot = path.resolve(__dirname, '../..');
const reportPath = path.join(projectRoot, 'reports', 'student-3', 'security', 'zap-passive.json');
const componentsByPort = new Map([
  ['3000', 'API'],
  ['5173', 'Admin'],
  ['5174', 'Storefront'],
]);

function sanitizePath(pathname) {
  if (pathname.includes('/@fs/')) return '/<vite-file-serving>';
  if (pathname.includes('/node_modules/.vite/deps/')) return '/<vite-dependency-module>';
  if (pathname.includes('/src/')) return '/<vite-source-module>';
  return pathname;
}

async function getJson(endpoint) {
  const response = await fetch(`${ZAP}${endpoint}`);
  if (!response.ok) throw new Error(`ZAP API ${endpoint} returned HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const [versionResult, queueResult, alertResult] = await Promise.all([
    getJson('/JSON/core/view/version/'),
    getJson('/JSON/pscan/view/recordsToScan/'),
    getJson('/JSON/core/view/alerts/'),
  ]);
  const queuedRecords = Number(queueResult.recordsToScan);
  if (!Number.isFinite(queuedRecords) || queuedRecords !== 0) {
    throw new Error(`Passive scanner still has ${queueResult.recordsToScan} records queued`);
  }

  const groups = new Map();
  for (const alert of alertResult.alerts) {
    const url = new URL(alert.url);
    const component = componentsByPort.get(url.port);
    if (!component) continue;

    const key = `${alert.risk}:${alert.alert}`;
    if (!groups.has(key)) {
      groups.set(key, {
        alert: alert.alert,
        risk: alert.risk,
        count: 0,
        components: new Set(),
        paths: new Set(),
        recommendation: alert.solution,
      });
    }

    const group = groups.get(key);
    group.count += 1;
    group.components.add(component);
    group.paths.add(`${component}${sanitizePath(url.pathname)}`);
  }

  const findings = [...groups.values()]
    .map((group) => ({
      alert: group.alert,
      risk: group.risk,
      instances: group.count,
      components: [...group.components].sort((a, b) => a.localeCompare(b)),
      affectedPathCount: group.paths.size,
      representativePaths: [...group.paths].sort((a, b) => a.localeCompare(b)).slice(0, 5),
      recommendation: group.recommendation,
    }))
    .sort((a, b) => a.risk.localeCompare(b.risk) || a.alert.localeCompare(b.alert));

  const report = {
    generatedAt: new Date().toISOString(),
    tool: { name: 'OWASP ZAP', version: versionResult.version },
    mode: 'Passive only; no active scan was run.',
    scope: ['local API on port 3000', 'local admin UI on port 5173', 'local storefront on port 5174'],
    workflows: ['customer reservation creation', 'staff reservation confirmation', 'keyboard navigation'],
    passiveQueueAtCapture: queuedRecords,
    totalRawAlerts: alertResult.alerts.length,
    distinctFindings: findings.length,
    findings,
    sanitization: 'URLs are reduced to local component and path; query values and request/response evidence are omitted.',
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Saved ${report.totalRawAlerts} passive alerts across ${findings.length} finding groups to ${reportPath}`);
}

main().catch(() => {
  process.exitCode = 1;
});
