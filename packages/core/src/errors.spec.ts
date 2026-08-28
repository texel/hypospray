import { describe, expect, it } from 'vitest';

import {
  CircularDependencyError,
  NoInjectorError,
  NoProviderError,
  createInjector,
  createToken,
  inject,
  setCurrentInjector,
} from './index.js';

describe('NoProviderError', () => {
  // Only a factory-less token can fail to resolve: a class or function is its
  // own default provider, so it always succeeds.
  it('is thrown for a token with no factory and no provider', () => {
    const ApiUrl = createToken<string>({ name: 'ApiUrl' });

    expect(() => createInjector().get(ApiUrl)).toThrow(NoProviderError);
  });

  it('names the token it could not resolve', () => {
    const ApiUrl = createToken<string>({ name: 'ApiUrl' });

    expect(() => createInjector().get(ApiUrl)).toThrow(/ApiUrl/);
  });

  it('never renders a token as [object Object]', () => {
    const anonymous = createToken<string>();

    let thrown: unknown;
    try {
      createInjector().get(anonymous);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(NoProviderError);
    expect((thrown as Error).message).not.toContain('[object Object]');
  });

  it('distinguishes a missing provider from an unusable token', () => {
    const ApiUrl = createToken<string>({ name: 'ApiUrl' });

    expect(() => createInjector().get(ApiUrl)).toThrow(/No provider found for/);
    expect(() => createInjector().get('not a token' as never)).toThrow(/Unsupported type/);
  });

  it('is an Error', () => {
    const error = new NoProviderError('nope');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NoProviderError');
  });
});

describe('NoInjectorError', () => {
  it('is thrown when injecting outside an injector', () => {
    setCurrentInjector(null);
    const createMailer = () => ({ send: () => 'sent' });

    expect(() => inject(createMailer)).toThrow(NoInjectorError);
  });
});

// Two services that each declare the other. Their names come straight from the
// class, which is what the error message reports. The explicit parameter types
// are what TypeScript needs to break the inference cycle — the injector still
// finds the runtime cycle regardless.
class OrderService {
  billing: BillingService;

  constructor(billing: BillingService = inject(BillingService)) {
    this.billing = billing;
  }
}

class BillingService {
  orders: OrderService;

  constructor(orders: OrderService = inject(OrderService)) {
    this.orders = orders;
  }
}

describe('CircularDependencyError', () => {
  it('detects a function that depends on itself', () => {
    function createRouter(parent: unknown = inject(createRouter)): { parent: unknown } {
      return { parent };
    }

    expect(() => createInjector().get(createRouter)).toThrow(CircularDependencyError);
  });

  it('detects a cycle between two classes', () => {
    expect(() => createInjector().get(OrderService)).toThrow(CircularDependencyError);
  });

  it('reports the path that formed the cycle', () => {
    expect(() => createInjector().get(OrderService)).toThrow(/OrderService.*BillingService/s);
  });

  it('still detects a cycle that crosses an injector boundary', () => {
    const child = createInjector().createChild();

    expect(() => child.get(OrderService)).toThrow(CircularDependencyError);
  });

  it('does not report a cycle for a diamond dependency', () => {
    class Clock {
      now(): number {
        return 0;
      }
    }

    const createLogger = (clock = inject(Clock)) => ({ clock });
    const createTracer = (clock = inject(Clock)) => ({ clock });
    const createApp = (logger = inject(createLogger), tracer = inject(createTracer)) => ({
      logger,
      tracer,
    });

    const app = createInjector().get(createApp);

    expect(app.logger.clock).toBe(app.tracer.clock);
  });

  it('does not report a cycle when a token is resolved twice in sequence', () => {
    const createSession = () => ({ id: 'session' });
    const injector = createInjector();

    expect(injector.get(createSession)).toBe(injector.get(createSession));
  });
});
