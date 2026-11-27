// Runs in a child process so Express 4's unhandled async rejection cannot
// leak into Vitest or leave the rest of the suite waiting indefinitely.
import request from 'supertest';

async function main() {
  const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55432' || url.pathname !== '/kitchenasty_member2_test' || url.username !== 'member2') throw new Error('Wrong test database');
  const [{ createApp }, { default: db }] = await Promise.all([
    import('../../../packages/server/src/app.js'),
    import('../../../packages/server/src/lib/db.js'),
  ]);
  const [id, token, encodedRequest] = process.argv.slice(2);
  let rejection = '';
  process.on('unhandledRejection', error => { rejection = String(error); });
  let status: number | null = null;
  let timedOut = false;
  try {
    const probe = encodedRequest ? JSON.parse(Buffer.from(encodedRequest, 'base64url').toString('utf8')) as { path: string; query: Record<string, string> } : null;
    const call = probe
      ? request(createApp()).get(probe.path).set('Authorization', `Bearer ${token}`).query(probe.query)
      : request(createApp()).patch(`/api/reservations/${id}`).set('Authorization', `Bearer ${token}`).send({ tableId: 'unknown-table' });
    const result = await call.timeout({ deadline: 1500 });
    status = result.status;
  } catch (error) {
    timedOut = Boolean((error as { timeout?: number }).timeout);
    if (!timedOut) throw error;
  }
  const stored = await db.reservation.findUniqueOrThrow({ where: { id } });
  console.log(`MEMBER2_RESULT ${JSON.stringify({ status, timedOut, rejection, storedStatus: stored.status, tableId: stored.tableId })}`);
  await db.$disconnect();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
