import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

// From the repository root. Every run owns a new PostgreSQL container and tmpfs.
const env = { ...process.env };
env.POSTGRES_PASSWORD = randomBytes(32).toString('hex');
env.JWT_SECRET = randomBytes(32).toString('hex');
env.IDEMPOTENCY_ACTIVE_KEY_ID = 'member2-e2e';
env.IDEMPOTENCY_ENCRYPTION_KEYS = JSON.stringify({ 'member2-e2e': randomBytes(32).toString('base64') });
env.DATABASE_URL = 'postgresql://m2_e2e:' + env.POSTGRES_PASSWORD + '@127.0.0.1:55433/kitchenasty_member2_e2e';
env.NODE_ENV = 'test';
env.M2_E2E_OUTPUT = resolve('test-results/member2-e2e', new Date().toISOString().replace(/:/g, '-'));
mkdirSync(env.M2_E2E_OUTPUT, { recursive: true });
console.log('Evidence directory:', env.M2_E2E_OUTPUT);
const docker = (...args) => execFileSync('docker', args, { env, encoding: 'utf8' }).trim();
const id = docker('run', '--rm', '-d', '--name', 'kitchenasty-member2-e2e-' + randomBytes(5).toString('hex'),
  '--tmpfs', '/var/lib/postgresql/data', '-p', '127.0.0.1:55433:5432', '-e', 'POSTGRES_PASSWORD',
  '-e', 'POSTGRES_USER=m2_e2e', '-e', 'POSTGRES_DB=kitchenasty_member2_e2e',
  '--health-cmd', 'pg_isready -h 127.0.0.1 -U m2_e2e -d kitchenasty_member2_e2e',
  '--health-interval', '1s', '--health-timeout', '3s', '--health-retries', '30', 'postgres:16-alpine');
try {
  for (let i = 0; i < 60 && docker('inspect', '-f', '{{.State.Health.Status}}', id) !== 'healthy'; i++) await sleep(1000);
  if (docker('inspect', '-f', '{{.State.Health.Status}}', id) !== 'healthy') throw new Error('E2E PostgreSQL did not become healthy');
  const migrations = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], { env, encoding: 'utf8' });
  writeFileSync(resolve(env.M2_E2E_OUTPUT, 'migrations.txt'), migrations);
  const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config',
    'tests/team/member-2/e2e/playwright.config.ts'], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  docker('stop', id);
}
