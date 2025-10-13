export type Candle = { time:number; open:number; high:number; low:number; close:number; volume:number };
/**
 * Indicator implementations (no external deps).
 * All series return arrays aligned to input `values.length`.
 * Insufficient warmup points are `null`.
 */

export type NumOrNull = number | null;

/** Simple moving average */
function sma(values: number[], period: number): NumOrNull[] {
  const out: NumOrNull[] = Array(values.length).fill(null);
  if (period <= 1) return values.map((v: any) => (Number.isFinite(v) ? v : null));
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    sum += v;
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** Exponential moving average (Wilder-style smoothing disabled; standard EMA) */
export function ema(values: number[], period: number): NumOrNull[] {
  const out: NumOrNull[] = Array(values.length).fill(null);
  if (period <= 1) return values.map((v: any) => (Number.isFinite(v) ? v : null));
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (i < period - 1) {
      // warmup
      if (i === period - 2) {
        // do nothing yet; next i will compute first EMA using SMA
      }
      continue;
    }
    if (i === period - 1) {
      // first EMA = SMA of first period
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += values[j];
      prev = s / period;
      out[i] = prev;
      continue;
    }
    prev = v * k + (prev as number) * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI */
export function rsi(values: number[], period = 14): NumOrNull[] {
  const out: NumOrNull[] = Array(values.length).fill(null);
  if (period < 1 || values.length === 0) return out;
  let avgGain = 0, avgLoss = 0;

  // seed with first period
  for (let i = 1; i <= period; i++) {
    const ch = values[i] - values[i - 1];
    if (ch >= 0) avgGain += ch; else avgLoss -= ch;
  }
  avgGain /= period; avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));

  for (let i = period + 1; i < values.length; i++) {
    const ch = values[i] - values[i - 1];
    const gain = ch > 0 ? ch : 0;
    const loss = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
  }
  return out;
}

export interface MACDResult {
  macd: NumOrNull[];
  signalLine: NumOrNull[];
  hist: NumOrNull[];
}

/** MACD (EMA fast - EMA slow) + signal EMA + histogram (macd - signal) */
export function macd(values: number[], fast = 12, slow = 26, signal = 9): MACDResult {
  const fastE = ema(values, fast);
  const slowE = ema(values, slow);
  const macdLine: NumOrNull[] = values.map((_: any, i: any) =>
    fastE[i] != null && slowE[i] != null ? (fastE[i]! - slowE[i]!) : null
  );
  // signal on macdLine (treat nulls as no output)
  const sig: NumOrNull[] = Array(values.length).fill(null);
  const k = 2 / (signal + 1);
  let prev: number | null = null;
  for (let i = 0; i < macdLine.length; i++) {
    const v = macdLine[i];
    if (v == null) continue;
    if (prev == null) { prev = v; sig[i] = v; continue; }
    prev = v * k + prev * (1 - k);
    sig[i] = prev;
  }
  const hist: NumOrNull[] = values.map((_: any, i: any) =>
    macdLine[i] != null && sig[i] != null ? (macdLine[i]! - sig[i]!) : null
  );
  return { macd: macdLine, signalLine: sig, hist };
}

/** Bollinger Bands (SMA +/- mult * stddev) */
export function bollinger(values: number[], period = 20, mult = 2): { mid: NumOrNull[]; upper: NumOrNull[]; lower: NumOrNull[] } {
  const mid = sma(values, period);
  const upper: NumOrNull[] = Array(values.length).fill(null);
  const lower: NumOrNull[] = Array(values.length).fill(null);

  let sum = 0, sumSq = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    sum += v; sumSq += v * v;
    if (i >= period) { const old = values[i - period]; sum -= old; sumSq -= old * old; }
    if (i >= period - 1) {
      const n = period;
      const mean = sum / n;
      const variance = Math.max(0, sumSq / n - mean * mean);
      const sd = Math.sqrt(variance);
      upper[i] = mean + mult * sd;
      lower[i] = mean - mult * sd;
    }
  }
  return { mid, upper, lower };
}

/** VWAP over the whole session (cumulative TP*Vol / cumulative Vol) */
export function vwap(typicalPrice: number[], volume: number[]): NumOrNull[] {
  const out: NumOrNull[] = Array(typicalPrice.length).fill(null);
  let cumPV = 0, cumV = 0;
  for (let i = 0; i < typicalPrice.length; i++) {
    const tp = typicalPrice[i]; const v = volume[i] ?? 0;
    cumPV += tp * v; cumV += v;
    out[i] = cumV > 0 ? (cumPV / cumV) : null;
  }
  return out;
}

/** Volume-weighted moving average (rolling window) */
export function vwma(close: number[], volume: number[], period = 20): NumOrNull[] {
  const out: NumOrNull[] = Array(close.length).fill(null);
  let sumPV = 0, sumV = 0;
  for (let i = 0; i < close.length; i++) {
    const pv = close[i] * (volume[i] ?? 0);
    sumPV += pv; sumV += (volume[i] ?? 0);
    if (i >= period) { sumPV -= close[i - period] * (volume[i - period] ?? 0); sumV -= (volume[i - period] ?? 0); }
    if (i >= period - 1) out[i] = sumV > 0 ? (sumPV / sumV) : null;
  }
  return out;
}

/** Standard deviation channels around SMA(mid) */
export function stddevChannels(values: number[], period = 20, mult = 2): { mid: NumOrNull[]; upper: NumOrNull[]; lower: NumOrNull[] } {
  const mid = sma(values, period);
  const upper: NumOrNull[] = Array(values.length).fill(null);
  const lower: NumOrNull[] = Array(values.length).fill(null);

  let sum = 0, sumSq = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    sum += v; sumSq += v * v;
    if (i >= period) { const old = values[i - period]; sum -= old; sumSq -= old * old; }
    if (i >= period - 1) {
      const n = period;
      const mean = sum / n;
      const variance = Math.max(0, sumSq / n - mean * mean);
      const sd = Math.sqrt(variance);
      upper[i] = mean + mult * sd;
      lower[i] = mean - mult * sd;
    }
  }
  return { mid, upper, lower };
}

export { sma };
export const stdDevChannels = stddevChannels;