import { describe, expect, it } from 'vitest';
import { stardate } from './stardate';

describe('stardate', () => {
  it('is 41000.0 at the start of 1987 (TNG season 1)', () => {
    expect(stardate(new Date('1987-01-01T00:00:00Z'))).toBe('41000.0');
  });

  it('advances 1000 per year', () => {
    expect(stardate(new Date('2026-01-01T00:00:00Z'))).toBe('80000.0');
  });

  it('includes the fraction of the year, counting time of day', () => {
    // 182.5 of 365 days elapsed
    expect(stardate(new Date('2026-07-02T12:00:00Z'))).toBe('80500.0');
  });

  it('uses 366 days in leap years', () => {
    // 365 of 366 days elapsed → 997.27…
    expect(stardate(new Date('2028-12-31T00:00:00Z'))).toBe('82997.3');
  });
});
