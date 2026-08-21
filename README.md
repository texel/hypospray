# hypospray

A dependency injection library for TypeScript.

A pnpm workspace: `@hypospray/core` holds the container, and framework
integration packages (React/Next, SvelteKit, Angular, …) live alongside it
under `packages/`.

## Setup

The toolchain is pinned in [`mise.toml`](./mise.toml).

```sh
mise install     # Node 24.19.0 + pnpm 11.22.0
pnpm install
```

## Commands

Run from the repo root; each also works inside an individual package.

| Command | What it does |
| --- | --- |
| `pnpm build` | Build every package (Vite emits JS, `tsc` emits `.d.ts`) |
| `pnpm dev` | Rebuild every package on change |
| `pnpm test` | Run all Vitest suites once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm typecheck` | Type-check every package without emitting |
| `pnpm clean` | Remove build output |

## Adding a package

1. `mkdir -p packages/<name>/src`
2. Copy `packages/core`'s `package.json`, `tsconfig.json`,
   `tsconfig.build.json`, and `vite.config.ts`, then update the package name
   and the Vitest project `name`.
3. Take shared dependency versions from the catalog in
   [`pnpm-workspace.yaml`](./pnpm-workspace.yaml) with `"catalog:"` rather than
   a literal version.
4. `pnpm install`

The root Vitest config globs `packages/*`, so a new package joins `pnpm test`
automatically.

## Conventions

- **ESM only.** Packages are `"type": "module"` with an `exports` map. Add a
  CJS build only if a consumer actually needs one.
- **`nodenext` module resolution.** Relative imports carry a `.js` extension.
- **Types come from `tsc`, not the bundler**, via each package's
  `tsconfig.build.json`.
