import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: { JWT_SECRET: 'vitest-jwt-secret' },
    include: ['src/__tests__/team/member-1/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage/member-1',
      include: [
        'src/controllers/reservation.controller.ts',
        'src/controllers/table.controller.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
