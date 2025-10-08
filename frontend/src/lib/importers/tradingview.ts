/**
 * TradingView CSV importer (robust)
 *
 * Accepts CSV exported from TradingView or similar sources.
 * - Delimiters: comma, semicolon, or tab
 * - Timestamp: seconds, milliseconds, or ISO-ish "YYYY-MM-DD HH:mm[:ss]"
 * - Header variants tolerated: time|timestamp|date, open, high, low, close|close*, volume|vol
 */

export type TVBar = {
  time: number;   // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TVImport = {
  symbol?: string;
  timeframe?: string;
  bars: TVBar[];
};

function detectDelimiter(sample: string): string {
  const head = sample.split(/\r?\n/).find((l: any) => l.trim().length > 0) ?? "";
  const counts = [
    { d: ",", n: (head.match(/,/g) || []).length },
    { d: ";", n: (head.match(/;/g) || []).length },
    { d: "\t", n: (head.match(/\t/g) || []).length },
  ].sort((a: any, b: any) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ",";
}

function toNumber(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/_/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function parseDateToUnixSeconds(s: string): number | null {
  const t = s.trim();
  // numeric seconds or ms
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    const num = Number(t);
    if (!Number.isFinite(num)) return null;
    if (num > 1e12) return Math.round(num / 1000);   // ms
    if (num > 1e10) return Math.round(num / 1000);   // ms-ish
    if (num > 1e9)  return Math.round(num);          // seconds
    return Math.round(num);                           // seconds (small ranges)
  }
  // ISO-ish string
  // Replace common separators to be safe
  const normalized = t.replace(/T/, " ").replace(/\//g, "-");
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  return Math.round(d.getTime() / 1000);
}

type HeaderMap = {
  time: number; open: number; high: number; low: number; close: number; volume: number;
};

function mapHeader(cols: string[]): HeaderMap | null {
  const idx = (want: RegExp) =>
    cols.findIndex(c => want.test(c.trim().toLowerCase()));
  const time = idx(/^(time|timestamp|date)$/);
  const open = idx(/^open($|[^a-z])/);
  const high = idx(/^high($|[^a-z])/);
  const low  = idx(/^low($|[^a-z])/);
  const close = idx(/^close($|[^a-z])/); // matches "close", "close*"
  const volume = idx(/^(volume|vol)($|[^a-z])/);
  if ([time, open, high, low, close, volume].some(i => i < 0)) return null;
  return { time, open, high, low, close, volume };
}

export function parseTradingViewCSV(csv: string): TVImport {
  const lines = csv.split(/\r?\n/).filter((l: any) => l.trim().length > 0 && !/^\s*(#|\/\/|;{3,}|={3,})/.test(l));
  if (!lines.length) return { bars: [] };

  // Optional metadata line (e.g., "Symbol,Timeframe" or "SYMBOL:BTCUSD, 1h")
  let symbol: string | undefined;
  let timeframe: string | undefined;

  // Pick header line: the first line with recognizable columns
  const delim = detectDelimiter(lines[0]);
  let headerLineIndex = 0;
  let header: HeaderMap | null = null;

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cols = lines[i].split(delim).map((c: any) => c.trim());
    const hm = mapHeader(cols);
    if (hm) { header = hm; headerLineIndex = i; break; }
    // Try to pick up a symbol/timeframe style metadata line
    if (!symbol && cols.length >= 1 && /[A-Z0-9:_\-\/]+/i.test(cols[0])) symbol = cols[0];
    if (!timeframe && cols.length >= 2 && /(\d+[mhdw]|[1-9]\d*\s*(min|hour|day|week)s?)/i.test(cols[1])) timeframe = cols[1];
  }

  if (!header) {
    // fallback: assume traditional TV order
    header = { time: 0, open: 1, high: 2, low: 3, close: 4, volume: 5 };
  }

  const bars: TVBar[] = [];
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const cols = lines[i].split(delim);
    if (cols.length < 6) continue;

    const t = parseDateToUnixSeconds(cols[header.time]);
    const o = toNumber(cols[header.open]);
    const h = toNumber(cols[header.high]);
    const l = toNumber(cols[header.low]);
    const c = toNumber(cols[header.close]);
    const v = toNumber(cols[header.volume]) ?? 0;

    if (t == null || o == null || h == null || l == null || c == null) continue;

    bars.push({ time: t, open: o, high: h, low: l, close: c, volume: v });
  }

  // Ensure ascending by time (some CSVs export newest-first)
  bars.sort((a: any, b: any) => a.time - b.time);

  return { symbol, timeframe, bars };
}

// convenient default export
export default parseTradingViewCSV;
