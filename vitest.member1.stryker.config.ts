import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: { JWT_SECRET: 'vitest-jwt-secret' },
    include: ['packages/server/src/__tests__/team/member-1/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
