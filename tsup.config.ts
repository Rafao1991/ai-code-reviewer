import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['cjs'],
  target: 'node20',
  bundle: true,
  splitting: false,
  banner: { js: '#!/usr/bin/env node' },
  outDir: 'dist',
  outExtension: () => ({ js: '.cjs' }),
  clean: true,
});
