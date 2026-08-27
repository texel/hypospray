import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2023',
    sourcemap: true,
    // Libraries ship readable: consumers minify. Mangled class names turn
    // `NoProviderError` into `t` in their stack traces.
    minify: false,
    lib: {
      // Two entries: the default is runtime-neutral, the `.node` one installs
      // the AsyncLocalStorage context strategy. package.json exports picks.
      entry: {
        index: 'src/index.ts',
        'index.node': 'src/index.node.ts',
      },
      formats: ['es'],
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
