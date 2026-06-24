import { describe, it, expect, beforeEach } from 'vitest';
import { isOpen, recordFailure, recordSuccess, clearBreakers } from '@/lib/circuitBreaker';

describe('circuitBreaker', () => {
  beforeEach(() => clearBreakers());

  it('is closed (not open) by default', () => {
    expect(isOpen('AAPL')).toBe(false);
  });

  it('stays closed after fewer failures than the threshold', () => {
    recordFailure('AAPL');
    recordFailure('AAPL');
    expect(isOpen('AAPL')).toBe(false);
  });

  it('opens after reaching the failure threshold', () => {
    recordFailure('AAPL');
    recordFailure('AAPL');
    recordFailure('AAPL');
    expect(isOpen('AAPL')).toBe(true);
  });

  it('resets after the cooldown period expires', () => {
    const now = 10000;
    recordFailure('AAPL', 3, now);
    recordFailure('AAPL', 3, now);
    recordFailure('AAPL', 3, now);
    // Still in cooldown at now + 30s
    expect(isOpen('AAPL', 3, 60_000, now + 30_000)).toBe(true);
    // Cooldown expired at now + 61s
    expect(isOpen('AAPL', 3, 60_000, now + 61_000)).toBe(false);
  });

  it('resets on success', () => {
    recordFailure('AAPL');
    recordFailure('AAPL');
    recordFailure('AAPL');
    expect(isOpen('AAPL')).toBe(true);
    recordSuccess('AAPL');
    expect(isOpen('AAPL')).toBe(false);
  });

  it('tracks tickers independently', () => {
    recordFailure('AAPL');
    recordFailure('AAPL');
    recordFailure('AAPL');
    expect(isOpen('AAPL')).toBe(true);
    expect(isOpen('MSFT')).toBe(false);
  });
});
