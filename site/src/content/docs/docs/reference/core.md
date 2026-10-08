---
title: '@hypospray/core'
description: A compact map of the core package's public surface.
sidebar:
  order: 1
---

The detailed API reference will be written alongside the first stable release. For now, this page groups the public entry point by purpose.

| Area      | Exports                                                                                   |
| --------- | ----------------------------------------------------------------------------------------- |
| Injector  | `Injector`, `createInjector`, `inject`, `getCurrentInjector`, `CURRENT_INJECTOR`          |
| Tokens    | `InjectionToken`, `createToken`                                                           |
| Providers | `provide`, `provideValue`, `provideFactory`, `provideExisting`, `extendProvider`          |
| Context   | `getContextStrategy`, `setContextStrategy`, `createSyncContextStrategy`                   |
| Errors    | `CircularDependencyError`, `ConcurrentContextError`, `NoInjectorError`, `NoProviderError` |

The Node export condition also exposes `createAsyncLocalStorageContextStrategy()` and `nodeContextStrategy()`.
