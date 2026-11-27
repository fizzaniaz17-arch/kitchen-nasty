import { randomBytes } from 'node:crypto';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/team/member-2/*.member2.ts'],
    environment: 'node',
    env: {
      JWT_SECRET: process.env.MEMBER2_JWT_SECRET || randomBytes(32).toString('hex'),
      IDEMPOTENCY_ACTIVE_KEY_ID: 'member2-test',
      IDEMPOTENCY_ENCRYPTION_KEYS: JSON.stringify({ 'member2-test': randomBytes(32).toString('base64') }),
      NODE_ENV: 'test',
    },
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
