---
'@hypospray/core': minor
---

Remove the side effect from the `node` entry point. Importing
`@hypospray/core` no longer installs a context strategy; the `node` entry's
`createInjector` installs the AsyncLocalStorage strategy when it is called
instead, and `createInjector({ context })` or `setContextStrategy` still
outrank it. The package is now `sideEffects: false`.

The sync context strategy detects interleaved flows. When a `run()` is handed
an async function and another injector starts a flow before it settles, it
throws `ConcurrentContextError` instead of silently resolving from whichever
injector is ambient. `createSyncContextStrategy({ strict: false })` restores
the previous behaviour.
