import { describe, expect, it, vi } from 'vitest';

import { createInjector, inject, provideValue } from './index.js';

// The pattern that works without an async-aware context strategy: keep the
// asynchrony in the values rather than in the resolution. A default parameter
// is evaluated when the function is called, before its body runs, so every
// inject() below has finished before its function reaches an `await` — nothing
// here ever reads an injection context after a suspension point.

describe('promise-valued dependencies', () => {
  it('resolves a chain of async providers with no context crossing an await', async () => {
    const getBaseUrl = () => 'https://api.example.com';

    const loadConfig = async (baseUrl = inject(getBaseUrl)) => {
      await Promise.resolve();
      return { baseUrl, version: 2 };
    };

    // `config` is a Promise here: injected synchronously, awaited later.
    const loadUser = async (config = inject(loadConfig)) => {
      const { baseUrl } = await config;
      return { name: 'ada', from: baseUrl };
    };

    class Profile {
      user: Promise<{ name: string; from: string }>;

      constructor(user = inject(loadUser)) {
        this.user = user;
      }
    }

    await expect(createInjector().get(Profile).user).resolves.toEqual({
      name: 'ada',
      from: 'https://api.example.com',
    });
  });

  // Memoisation doubles as a request cache: concurrent consumers share the one
  // in-flight promise rather than each starting their own fetch.
  it('dedupes concurrent consumers onto one in-flight request', async () => {
    const fetchSettings = vi.fn(async () => {
      await Promise.resolve();
      return { theme: 'dark' };
    });

    const createHeader = (settings = inject(fetchSettings)) => settings;
    const createSidebar = (settings = inject(fetchSettings)) => settings;

    const injector = createInjector();
    const [header, sidebar] = await Promise.all([
      injector.get(createHeader),
      injector.get(createSidebar),
    ]);

    expect(header).toBe(sidebar);
    expect(fetchSettings).toHaveBeenCalledTimes(1);
  });

  it('scopes async dependencies per child injector', async () => {
    const getSession = () => 'anonymous';
    const loadGreeting = async (session = inject(getSession)) => {
      await Promise.resolve();
      return `hello ${session}`;
    };

    const root = createInjector();
    const a = root.createChild({ providers: [provideValue(getSession, 'a'), loadGreeting] });
    const b = root.createChild({ providers: [provideValue(getSession, 'b'), loadGreeting] });

    expect(await Promise.all([a.get(loadGreeting), b.get(loadGreeting)])).toEqual([
      'hello a',
      'hello b',
    ]);
  });
});

describe('memoised rejections', () => {
  // A memoised promise outlives the turn it settled on, so a consumer may
  // await it long after. Nothing claimed the rejection in the meantime, and
  // Node treats an unhandled rejection as fatal — this crashed the process.
  it(
    'does not fire unhandledRejection when a rejection is awaited late',
    { tags: ['regression'] },
    async () => {
      const unhandled: unknown[] = [];
      const record = (error: unknown) => unhandled.push(error);
      process.on('unhandledRejection', record);

      try {
        const loadBroken = async () => {
          throw new Error('502 Bad Gateway');
        };

        const pending = createInjector().get(loadBroken);

        // Settle the rejection and pass a macrotask boundary with no consumer
        // attached. This is the window where the process used to die.
        await new Promise((resolve) => setTimeout(resolve, 10));

        await expect(pending).rejects.toThrow('502 Bad Gateway');
        expect(unhandled).toEqual([]);
      } finally {
        process.off('unhandledRejection', record);
      }
    },
  );

  it('gives every consumer the same rejected promise', async () => {
    const loadBroken = async () => {
      throw new Error('502 Bad Gateway');
    };

    const injector = createInjector();
    const first = injector.get(loadBroken);
    const second = injector.get(loadBroken);

    expect(first).toBe(second);
    await expect(first).rejects.toThrow('502 Bad Gateway');
    await expect(second).rejects.toThrow('502 Bad Gateway');
  });

  it('traces a swallowed rejection when debug is on', async () => {
    const logger = { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const loadBroken = async () => {
      throw new Error('502 Bad Gateway');
    };

    const pending = createInjector({ debug: true, logger }).get(loadBroken);
    await expect(pending).rejects.toThrow('502 Bad Gateway');

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('loadBroken'));
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('502 Bad Gateway'));
  });
});
