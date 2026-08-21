import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'node24',
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // Never bundle node builtins or anything we depend on at runtime.
      external: [/^node:/],
    },
  },
  test: {
    name: 'core',
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
