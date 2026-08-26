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

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `pnpm build`        | Build every package (Vite emits JS, `tsc` emits `.d.ts`) |
| `pnpm dev`          | Rebuild every package on change                          |
| `pnpm test`         | Run all Vitest suites once                               |
| `pnpm test:watch`   | Vitest in watch mode                                     |
| `pnpm typecheck`    | Type-check every package without emitting                |
| `pnpm lint`         | Lint with oxlint                                         |
| `pnpm lint:fix`     | Apply oxlint's auto-fixes                                |
| `pnpm format`       | Format with oxfmt                                        |
| `pnpm format:check` | Fail if anything is unformatted                          |
| `pnpm check`        | format:check → lint → typecheck → test                   |
| `pnpm clean`        | Remove build output                                      |

oxlint and oxfmt are single binaries that walk the whole repo, so they run
from the root only — packages don't carry their own lint or format scripts.
Both respect `.gitignore`.

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
- **Spec-first.** `*.spec.ts` files are the contract. Until a piece is
  implemented its stub throws `Not implemented`, so a red suite is expected.

## Editor setup

Install the [Oxc extension](https://github.com/oxc-project/oxc-zed) for Zed
(`zed: extensions` → search "Oxc"). It supplies the `oxlint` and `oxfmt`
language servers that [`.zed/settings.json`](./.zed/settings.json) wires up, so
lint diagnostics appear inline and saves format with oxfmt instead of Zed's
bundled prettier. The lint server is pinned to the repo's own
`node_modules/.bin/oxlint`, so the editor and `pnpm lint` always agree.

## Linting notes

Two rules are switched off in [`.oxlintrc.json`](./.oxlintrc.json) for reasons
specific to this library:

- `unicorn/consistent-function-scoping` (specs only) wants test-local functions
  hoisted to module scope. Here a function _is_ its own injection token, so
  hoisting would make separate tests share a token and leak resolved values
  between them.
- `vitest/require-mock-type-parameters` wants an explicit type argument on every
  `vi.fn()`, which TypeScript already infers from the implementation passed in.
