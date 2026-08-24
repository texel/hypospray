import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from './index.js';
import { createInjector, createToken, extendProvider, provide, provideValue } from './index.js';

function createLogger(): Logger {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };
}

let logger: Logger;

beforeEach(() => {
  logger = createLogger();
});

describe('missing-argument warnings', () => {
  it('warns when a synthesised class provider needs constructor arguments', () => {
    class NeedsArgs {
      dep: string;
      constructor(dep: string) {
        this.dep = dep;
      }
    }

    createInjector({ logger }).get(NeedsArgs as never);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('NeedsArgs'));
  });

  it('warns when a synthesised function provider needs arguments', () => {
    const needsArgs = (dep: string) => ({ dep });

    createInjector({ logger }).get(needsArgs as never);

    expect(logger.warn).toHaveBeenCalled();
  });

  it('stays quiet for a function that injects via default parameters', () => {
    const fine = (dep = 'value') => ({ dep });

    createInjector({ logger }).get(fine);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  // Regression: the arity check ran against every resolved provider, so the
  // (previous) => next shape extendProvider is built around warned on itself.
  it('stays quiet for an extendProvider accumulator', () => {
    const getWidgets = (): string[] => [];

    const injector = createInjector({ logger });
    injector.addProviders(extendProvider(getWidgets, (w) => [...w, 'widget']));
    injector.get(getWidgets);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  // Regression: a user-supplied factory's arity is its own business — only
  // providers hypospray synthesises can be missing injected arguments.
  it('stays quiet for a user-supplied factory', () => {
    const token = createToken<string>();

    const injector = createInjector({
      logger,
      providers: [provide(token, { factory: ((dep?: string) => dep ?? 'v') as never })],
    });
    injector.get(token);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  // Regression: toProvider() defaulted its logger parameter to the global
  // console, ignoring the injector's configured logger entirely.
  it('routes warnings to the injector logger, not the global console', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const needsArgs = (dep: string) => ({ dep });

    createInjector({ logger }).get(needsArgs as never);

    expect(logger.warn).toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });
});

describe('debug tracing', () => {
  it('traces resolutions when debug is enabled', () => {
    const token = createToken({ name: 'Traced', factory: () => 'value' });

    createInjector({ debug: true, logger }).get(token);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Traced'));
  });

  it('stays quiet when debug is disabled', () => {
    const token = createToken({ name: 'Traced', factory: () => 'value' });

    createInjector({ logger }).get(token);

    expect(logger.debug).not.toHaveBeenCalled();
  });

  // Regression: createChild() forwarded only `parent` and `providers`, so
  // tracing silently stopped below the root injector.
  it('inherits debug and logger in child injectors', () => {
    const token = createToken({ name: 'ChildScoped', factory: () => 'value' });

    const parent = createInjector({ debug: true, logger });
    const child = parent.createChild({
      providers: [provideValue(token, 'child value')],
    });

    vi.mocked(logger.debug).mockClear();
    child.get(token);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('ChildScoped'));
  });

  it('lets a child opt out of inherited debug', () => {
    const token = createToken({ name: 'Quiet', factory: () => 'value' });

    const parent = createInjector({ debug: true, logger });
    const child = parent.createChild({
      debug: false,
      providers: [provideValue(token, 'child value')],
    });

    vi.mocked(logger.debug).mockClear();
    child.get(token);

    expect(logger.debug).not.toHaveBeenCalled();
  });
});
