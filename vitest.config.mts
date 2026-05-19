import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'lib/**/*.test.ts'],
    globalSetup: ['./tests/integration/global-setup.ts'],
    // Integration tests share a Postgres test schema — must run serially to
    // avoid one file's TRUNCATE clobbering another file's in-flight inserts.
    // Unit tests are sub-millisecond anyway; the serial cost is negligible.
    fileParallelism: false,
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Coverage focuses on the modules that actually have tests today. Add
      // more `include` globs as new modules earn tests.
      include: [
        'lib/modules/auth/**/*.ts',
        'lib/modules/leave/**/*.ts',
        'lib/modules/payroll/**/*.ts',
        'lib/modules/workflows/rules.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        'lib/modules/auth/mobile.ts',
        'lib/modules/auth/oidc.ts',
        'lib/modules/auth/actions.ts',
        'lib/modules/leave/holidays.ts',
        'lib/modules/leave/queries.ts',
        'lib/modules/payroll/actions.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
})
