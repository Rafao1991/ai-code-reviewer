import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'demo/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.config.ts',
        'src/cli/**',
        'src/ai/providers/**',
        '**/index.ts',
        'src/types/**',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 80,
        statements: 95,
      },
    },
  },
});
