import { defineConfig } from 'vitest/config';

// Each package supplies its own `test` block; this just aggregates them so
// `pnpm test` at the root runs every package's suite in one reporter.
export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
});
