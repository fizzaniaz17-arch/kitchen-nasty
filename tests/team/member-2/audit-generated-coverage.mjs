import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cases = JSON.parse(readFileSync(new URL('./generated/ep-bva-cases.json', import.meta.url), 'utf8'));
const reportPath = process.argv[2] || fileURLToPath(new URL('../../../docs/sqe/member-2/evidence/audit-final-results.json', import.meta.url));
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const tests = report.testResults.flatMap(file => file.assertionResults);
const coverage = cases.map(c => {
  const matched = tests.filter(t => t.title === c.id);
  return { id: c.id, count: matched.length, status: matched.length === 1 ? matched[0].status : 'missing-or-duplicate' };
});
const anomalies = coverage.filter(c => c.count !== 1 || !['passed', 'failed'].includes(c.status));
const output = { generated: cases.length, representedExactlyOnce: coverage.filter(c => c.count === 1).length, anomalies, generatedFailed: coverage.filter(c => c.status === 'failed') };
const outputPath = process.argv[3] || fileURLToPath(new URL(`../../../docs/sqe/member-2/evidence/generated-coverage-audit-${Date.now()}.json`, import.meta.url));
if (existsSync(outputPath)) throw new Error(`Refusing to overwrite existing evidence: ${outputPath}`);
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
if (anomalies.length) process.exitCode = 1;
