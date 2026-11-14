import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // ── Auth tests: no database required ──────────────────────────────────────────
  {
    test: {
      name: 'auth',
      globals: true,
      environment: 'node',
      include: ['tests/auth.test.ts'],
      fileParallelism: false,
      env: {
        NODE_ENV: 'test',
      },
    },
  },
  // ── All other tests: require a live test database ─────────────────────────────
  {
    test: {
      name: 'api',
      globals: true,
      environment: 'node',
      include: ['tests/*.test.ts'],
      exclude: ['tests/auth.test.ts'],
      fileParallelism: false,
      setupFiles: ['tests/setup.ts'],
    },
  },
]);
