/**
 * Simple per-ticker circuit breaker. After `threshold` consecutive failures a
 * ticker is "open" (skipped) for `resetMs` to avoid wasting rate-limited API
 * calls on tickers that consistently fail. Resets automatically after cooldown.
 */

interface BreakerState {
  failures: number;
  openedAt: number | null;
}

const store = new Map<string, BreakerState>();

const DEFAULT_THRESHOLD = 3;
const DEFAULT_RESET_MS = 60_000; // 1 minute

export function isOpen(
  ticker: string,
  threshold = DEFAULT_THRESHOLD,
  resetMs = DEFAULT_RESET_MS,
  now = Date.now()
): boolean {
  const state = store.get(ticker);
  if (!state || state.openedAt === null) return false;
  if (state.failures < threshold) return false;
  // Still in cooldown?
  if (now - state.openedAt < resetMs) return true;
  // Cooldown expired — reset (half-open → allow retry)
  store.delete(ticker);
  return false;
}

export function recordFailure(
  ticker: string,
  threshold = DEFAULT_THRESHOLD,
  now = Date.now()
): void {
  const state = store.get(ticker) ?? { failures: 0, openedAt: null };
  state.failures += 1;
  if (state.failures >= threshold) {
    state.openedAt = now;
  }
  store.set(ticker, state);
}

export function recordSuccess(ticker: string): void {
  store.delete(ticker);
}

export function clearBreakers(): void {
  store.clear();
}
