import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text'],
      reportsDirectory: 'coverage/sonar',
      include: ['src/context/AuthContext.tsx', 'src/pages/AuthCallback.tsx'],
    },
  },
});
