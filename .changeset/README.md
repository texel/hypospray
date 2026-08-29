# Releasing

Versions and changelogs are managed by
[Changesets](https://github.com/changesets/changesets). Nothing in this repo
bumps a version by hand — `packages/*/package.json` `version` fields and
`CHANGELOG.md` files are generated.

## Development

When a change should show up in a release, add a changeset in the same PR:

```sh
pnpm changeset
```

That prompts for the affected packages and a bump type, then writes a markdown
file to `.changeset/`. Commit it alongside your code. The text becomes the
changelog entry, so write it for someone upgrading, not for a reviewer.

Changes that need no release — CI tweaks, internal refactors, docs — need no
changeset. `pnpm changeset --empty` records that decision explicitly if you
want the intent in the history.

While pre-1.0, prefer `patch` for fixes and `minor` for anything a consumer
could notice, including breaking changes. Under `0.x` a minor bump _is_ the
breaking-change signal; `major` is reserved for the eventual 1.0.

## Cutting a release

```sh
pnpm version:packages   # consume changesets: bump versions, write changelogs
pnpm release            # publish anything not already on npm
```

`pnpm version:packages` deletes the changeset files it consumes; review the
resulting diff before committing it.

`pnpm release` runs `changeset publish`, which shells out to `pnpm publish`
(not `npm publish`) because it detects pnpm. It's important that we use the pnpm
tooling, because it rewrites this repo's `catalog:` and `workspace:` protocol ranges into real version
ranges as it packs. Each package's `prepack` script rebuilds `dist` first, so
no separate build step is needed.

## Configuration notes

`config.json` differs from the `changeset init` defaults in three places:

- **`"access": "public"`** — scoped packages default to restricted, and a
  restricted publish on a free npm org fails. Each package also carries
  `publishConfig.access`, so this holds even if a publish bypasses Changesets.
- **`"fixed": [["@hypospray/*"]]`** — every `@hypospray/*` package releases in
  lockstep on a single version number. This means that framework adapters like
  `@hypospray/react@0.3.0` will pair with the core package at version
  `@hypospray/core@0.3.0`. This may initially cause churn in framework adapters
  even if there aren't relevant changes, but it's done to reduce confusion for
  consumers of the library.

  If we later decide that this is too much, we should delete this entry to let
  the packages version independently.

- **`"commit": false`** — the version bump stays as a reviewable diff rather
  than automatically committing.

## First publish

The first publish of `@hypospray/core` must be run
manually and locally:

```sh
cd packages/core && pnpm publish
```

npm's trusted publishing (OIDC from GitHub Actions) can only be configured on
a package that already exists, so CI cannot own the release until after that
first manual push. Once it does, add the publish step to
`.github/workflows/release.yml` (the necessary lines are commented out).
