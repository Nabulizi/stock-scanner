function isFinite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Raw position of `price` within the 52-week [low, high] range as a fraction.
 * Returns 0 at the low and 1 at the high. The result is NOT clamped — a price
 * above the high gives > 1 and below the low gives < 0, which callers preserve
 * for tests/debugging and clamp only for display.
 *
 * Returns null when any input is missing/non-finite, or when high <= low
 * (equal or invalid range — division would be undefined or meaningless).
 */
export function computeRangePosition(
  price: number | null | undefined,
  low: number | null | undefined,
  high: number | null | undefined
): number | null {
  if (!isFinite(price) || !isFinite(low) || !isFinite(high)) return null;
  if (high <= low) return null;
  return (price - low) / (high - low);
}

/**
 * Percentage the current `price` sits below (or above) the 52-week `high`,
 * e.g. -6.4 means the price is 6.4% under the high; 0 means at the high; a
 * positive value means a fresh high above the prior 52-week high.
 *
 * Returns null when price or high is missing/non-finite, or when high <= 0
 * (the percentage would be undefined or meaningless).
 */
export function percentFromHigh(
  price: number | null | undefined,
  high: number | null | undefined
): number | null {
  if (!isFinite(price) || !isFinite(high)) return null;
  if (high <= 0) return null;
  return ((price - high) / high) * 100;
}

/** Clamp a fraction to [0, 1] for display. */
export function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
