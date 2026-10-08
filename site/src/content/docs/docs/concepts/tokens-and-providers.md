---
title: Tokens and providers
description: The two pieces an injector uses to identify and create a dependency.
sidebar:
  order: 1
---

This section is intentionally brief while the public documentation is being developed.

## Tokens

A token identifies a dependency. Hypospray accepts a class, a function, or an `InjectionToken` created with `createToken()`.

## Providers

A provider creates the value associated with a token. Functions and classes provide themselves by default; registrations created by `provide()`, `provideValue()`, `provideFactory()`, and `provideExisting()` replace that default.

`extendProvider()` is the exception: it receives the preceding value and returns the next one, so multiple registrations can build a value in stages.
