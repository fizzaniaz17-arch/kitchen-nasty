import prisma from '../lib/db.js';
import { encryptLegacySnapshotsBatch } from '../lib/reservation-idempotency.js';

async function main(): Promise<void> {
  let total = 0;
  for (let batch = 0; batch < 20; batch++) {
    const count = await encryptLegacySnapshotsBatch(500);
    total += count;
    if (count < 500) break;
  }
  process.stdout.write(`Encrypted ${total} unexpired idempotency snapshots\n`);
}

main().catch(() => {
  process.stderr.write('Legacy idempotency snapshot encryption failed\n');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
