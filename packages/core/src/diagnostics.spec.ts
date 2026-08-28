import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from './index.js';
import { createInjector, extendProvider, inject, provide, provideValue } from './index.js';

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
  it('warns when a class that provides itself needs constructor arguments', () => {
    class Database {
      url: string;

      constructor(url: string) {
        this.url = url;
      }
    }

    createInjector({ logger }).get(Database as never);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Database'));
  });

  it('warns when a function that provides itself needs arguments', () => {
    const createRequestLogger = (level: string) => ({ level });

    createInjector({ logger }).get(createRequestLogger as never);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('createRequestLogger'));
  });

  it('stays quiet for a class that injects through constructor defaults', () => {
    class Clock {
      now(): number {
        return 0;
      }
    }

    class Stopwatch {
      startedAt: number;

      constructor(clock = inject(Clock)) {
        this.startedAt = clock.now();
      }
    }

    createInjector({ logger }).get(Stopwatch);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('stays quiet for a function that injects via default parameters', () => {
    const createRequestLogger = (level = 'info') => ({ level });

    createInjector({ logger }).get(createRequestLogger);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  // the arity check ran against every resolved provider, so the
  // (previous) => next shape extendProvider is built around warned on itself.
  it('stays quiet for an extendProvider accumulator', { tags: ['regression'] }, () => {
    const getMiddleware = (): string[] => [];

    const injector = createInjector({ logger });
    injector.addProviders(extendProvider(getMiddleware, (m) => [...m, 'auth']));
    injector.get(getMiddleware);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  // a user-supplied factory's arity is its own business — only
  // a provider built from the token itself can be missing injected arguments.
  it('stays quiet for a user-supplied factory', { tags: ['regression'] }, () => {
    const createMailer = () => ({ retries: 0 });
    const factory = (retries?: number) => ({ retries: retries ?? 3 });

    const injector = createInjector({
      logger,
      providers: [provide(createMailer, { factory })],
    });
    injector.get(createMailer);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  // toProvider() defaulted its logger parameter to the global
  // console, ignoring the injector's configured logger entirely.
  it(
    'routes warnings to the injector logger, not the global console',
    { tags: ['regression'] },
    () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const createRequestLogger = (level: string) => ({ level });

      createInjector({ logger }).get(createRequestLogger as never);

      expect(logger.warn).toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      consoleWarn.mockRestore();
    },
  );
});

describe('debug tracing', () => {
  it('traces resolutions when debug is enabled', () => {
    class ReportBuilder {
      rows: string[] = [];
    }

    createInjector({ debug: true, logger }).get(ReportBuilder);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('ReportBuilder'));
  });

  it('stays quiet when debug is disabled', () => {
    class ReportBuilder {
      rows: string[] = [];
    }

    createInjector({ logger }).get(ReportBuilder);

    expect(logger.debug).not.toHaveBeenCalled();
  });

  // createChild() forwarded only `parent` and `providers`, so
  // tracing silently stopped below the root injector.
  it('inherits debug and logger in child injectors', { tags: ['regression'] }, () => {
    const loadUserProfile = () => 'anonymous';

    const parent = createInjector({ debug: true, logger });
    const child = parent.createChild({
      providers: [provideValue(loadUserProfile, 'ada')],
    });

    vi.mocked(logger.debug).mockClear();
    child.get(loadUserProfile);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('loadUserProfile'));
  });

  it('lets a child opt out of inherited debug', () => {
    const loadUserProfile = () => 'anonymous';

    const parent = createInjector({ debug: true, logger });
    const child = parent.createChild({
      debug: false,
      providers: [provideValue(loadUserProfile, 'ada')],
    });

    vi.mocked(logger.debug).mockClear();
    child.get(loadUserProfile);

    expect(logger.debug).not.toHaveBeenCalled();
  });
});
