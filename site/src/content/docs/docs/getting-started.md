---
title: Getting started
description: Install @hypospray/core and create your first injector.
sidebar:
  order: 1
---

Hypospray is an ESM-only dependency injection library for TypeScript. It uses ordinary functions, classes, and explicit tokens to identify dependencies.

## Install

```sh
pnpm add @hypospray/core
```

:::note[Before the first release]
`@hypospray/core` is not on npm yet. In this repository, examples can import it through the pnpm workspace.
:::

## Create a dependency

A zero-argument function can act as both a token and its default provider:

```ts
import { createInjector, inject } from '@hypospray/core';

const createConfig = () => ({ apiUrl: 'https://api.example.com' });

const createApiClient = (config = inject(createConfig)) => ({
  getUser: (id: string) => fetch(`${config.apiUrl}/users/${id}`),
});

const injector = createInjector();
const api = injector.get(createApiClient);
```

The injector creates each value the first time it is requested, then returns that same value for later requests.

## Override a dependency

Register a fixed value when an application or test needs a different implementation:

```ts
import { createInjector, provideValue } from '@hypospray/core';

const injector = createInjector({
  providers: [provideValue(createConfig, { apiUrl: 'http://localhost:3000' })],
});
```

## Where to go next

- Learn how [tokens and providers](../concepts/tokens-and-providers/) fit together.
- Browse the [`@hypospray/core` API](../reference/core/).
