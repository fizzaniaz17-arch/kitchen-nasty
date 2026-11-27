import prisma from '../lib/db.js';
import { cleanupExpiredIdempotencyBatch } from '../lib/reservation-idempotency.js';

async function main(): Promise<void> {
  let total = 0;
  // Bound each scheduled invocation as well as each SQL batch.
  for (let batch = 0; batch < 20; batch++) {
    const count = await cleanupExpiredIdempotencyBatch(500);
    total += count;
    if (count < 500) break;
  }
  process.stdout.write(`Idempotency cleanup removed ${total} expired records\n`);
}

main().catch(() => {
  process.stderr.write('Idempotency cleanup failed\n');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
