import { NextResponse } from 'next/server';
import { fetchFearGreed } from '@/lib/fearGreed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cached: { data: Awaited<ReturnType<typeof fetchFearGreed>>; expiresAt: number } | null = null;
const TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(): Promise<NextResponse> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data);
  }
  const data = await fetchFearGreed();
  if (data) {
    cached = { data, expiresAt: now + TTL };
  }
  return NextResponse.json(data);
}
