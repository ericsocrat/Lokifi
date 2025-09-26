import type { Timeframe } from "./timeframes";

export interface Candle {
  time: number | string | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

/**
 * Fetch OHLC from backend with sane defaults.
 * Example: /api/ohlc?symbol=BTCUSD&timeframe=1h&limit=500
 */
export async function fetchOhlc(params: {
  symbol: string;
  timeframe: Timeframe;
  limit?: number;
}): Promise<Candle[]> {
  const { symbol, timeframe, limit = 500 } = params;

  const url = new URL(`${API_BASE}/ohlc`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("timeframe", timeframe);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OHLC fetch failed: ${res.status} ${txt}`);
  }
  const data = (await res.json()) as Candle[];
  return data;
}
