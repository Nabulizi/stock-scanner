/**
 * Fetch the CNN Fear & Greed Index value. Returns a 0–100 score + label.
 * Falls back gracefully to null on any failure (no user-facing error).
 */

export type FearGreedLabel = 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';

export interface FearGreedData {
  score: number;
  label: FearGreedLabel;
}

const ENDPOINT = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';

function toLabel(score: number): FearGreedLabel {
  if (score <= 20) return 'Extreme Fear';
  if (score <= 40) return 'Fear';
  if (score <= 60) return 'Neutral';
  if (score <= 80) return 'Greed';
  return 'Extreme Greed';
}

/**
 * Fetch the current CNN Fear & Greed Index. Timeouts after 4s.
 * Returns null on any failure — the badge simply won't render.
 */
export async function fetchFearGreed(fetchImpl: typeof fetch = fetch): Promise<FearGreedData | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetchImpl(ENDPOINT, {
      signal: controller.signal,
      headers: { 'User-Agent': 'StockScreener/1.0' }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json() as { fear_and_greed?: { score?: number } };
    const score = json?.fear_and_greed?.score;
    if (typeof score !== 'number' || !Number.isFinite(score)) return null;
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    return { score: clamped, label: toLabel(clamped) };
  } catch {
    return null;
  }
}
