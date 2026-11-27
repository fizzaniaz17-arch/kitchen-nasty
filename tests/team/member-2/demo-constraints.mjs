import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const specUrl = new URL('./reservations.openapi.json', import.meta.url);
const initialBytes = readFileSync(specUrl);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const temp = mkdtempSync(join(tmpdir(), 'kitchenasty-member2-'));
const generate = fileURLToPath(new URL('./generate-ep-bva.mjs', import.meta.url));
const input = join(temp, 'spec.json'), output = join(temp, 'cases.json');
const select = (cases, path, field, prefix) => cases.filter(c => c.path === path && c.field === field && c.partition.startsWith(prefix)).map(({ id, partition, value, valid }) => ({ id, partition, value, valid }));
try {
  writeFileSync(input, initialBytes);
  execFileSync(process.execPath, [generate, input, output]);
  const before = JSON.parse(readFileSync(output, 'utf8'));
  const changed = JSON.parse(initialBytes.toString('utf8'));
  changed.components.schemas.CreateReservation.properties.partySize.maximum = 40;
  changed.components.schemas.CreateTable.properties.capacity.minimum = 2;
  writeFileSync(input, `${JSON.stringify(changed, null, 2)}\n`);
  execFileSync(process.execPath, [generate, input, output]);
  const after = JSON.parse(readFileSync(output, 'utf8'));
  writeFileSync(input, initialBytes);
  execFileSync(process.execPath, [generate, input, output]);
  const restored = JSON.parse(readFileSync(output, 'utf8'));
  if (JSON.stringify(before) !== JSON.stringify(restored) || hash(readFileSync(specUrl)) !== hash(initialBytes)) throw new Error('Baseline was not restored');
  const result = {
    description: 'Temporary spec file changed and regenerated using the CLI, then restored and regenerated; checked-in spec unchanged.',
    baselineSpecSha256: hash(initialBytes), restoredTemporarySpecSha256: hash(readFileSync(input)), baselineCases: before.length, changedCases: after.length, restoredCases: restored.length,
    reservationPartySizeMaximum: { before: select(before, '/reservations', 'partySize', 'max'), after: select(after, '/reservations', 'partySize', 'max') },
    tableCapacityMinimum: { before: select(before, '/locations/{locationId}/tables', 'capacity', 'min'), after: select(after, '/locations/{locationId}/tables', 'capacity', 'min') },
  };
  const evidence = process.argv[2] || fileURLToPath(new URL(`../../../docs/sqe/member-2/evidence/constraint-demo-${Date.now()}.json`, import.meta.url));
  if (existsSync(evidence)) throw new Error(`Refusing to overwrite existing evidence: ${evidence}`);
  writeFileSync(evidence, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally { for (const file of [input, output]) if (existsSync(file)) unlinkSync(file); rmdirSync(temp); }
