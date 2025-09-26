/**
 * Candle type used across indicators.
 */
export interface Candle {
  time: number | string | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type MaybeNum = number | null;

/**
 * Simple Moving Average
 */
export function sma(values: number[], period: number): (number | null)[] {
  if (period <= 0) throw new Error("period must be > 0");
  const out = new Array<MaybeNum>(values.length).fill(null);
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    sum += v;
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * Exponential Moving Average
 */
export function ema(values: number[], period: number): (number | null)[] {
  if (period <= 0) throw new Error("period must be > 0");
  const out = new Array<MaybeNum>(values.length).fill(null);
  const k = 2 / (period + 1);

  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (prev == null) {
      // seed with SMA on the first full window
      if (i >= period - 1) {
        let seed = 0;
        for (let j = i - period + 1; j <= i; j++) seed += values[j];
        prev = seed / period;
        out[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

/**
 * Rolling standard deviation
 */
export function rollingStd(values: number[], period: number): (number | null)[] {
  if (period <= 0) throw new Error("period must be > 0");
  const out = new Array<MaybeNum>(values.length).fill(null);

  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    sum += v;
    sumSq += v * v;

    if (i >= period) {
      const old = values[i - period];
      sum -= old;
      sumSq -= old * old;
    }

    if (i >= period - 1) {
      const mean = sum / period;
      const variance = Math.max(sumSq / period - mean * mean, 0);
      out[i] = Math.sqrt(variance);
    }
  }
  return out;
}

/**
 * Bollinger Bands
 */
export function bollinger(
  values: number[],
  period: number,
  multiplier = 2
): Array<{ basis: MaybeNum; upper: MaybeNum; lower: MaybeNum }> {
  const basis = sma(values, period);
  const sdev = rollingStd(values, period);
  const out: Array<{ basis: MaybeNum; upper: MaybeNum; lower: MaybeNum }> = new Array(values.length);

  for (let i = 0; i < values.length; i++) {
    const b = basis[i];
    const sd = sdev[i];
    if (b == null || sd == null) {
      out[i] = { basis: null, upper: null, lower: null };
    } else {
      out[i] = {
        basis: b,
        upper: b + multiplier * sd,
        lower: b - multiplier * sd,
      };
    }
  }
  return out;
}

/**
 * Volume-Weighted Moving Average (VWMA)
 */
export function vwma(candles: Candle[], period: number): (number | null)[] {
  if (period <= 0) throw new Error("period must be > 0");

  const out = new Array<MaybeNum>(candles.length).fill(null);
  let pvSum = 0; // price * volume
  let vSum = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const price = c.close;
    pvSum += price * c.volume;
    vSum += c.volume;

    if (i >= period) {
      pvSum -= candles[i - period].close * candles[i - period].volume;
      vSum -= candles[i - period].volume;
    }

    if (i >= period - 1) {
      out[i] = vSum === 0 ? null : pvSum / vSum;
    }
  }
  return out;
}

/**
 * VWAP (anchored at anchorIndex, default 0)
 * Uses typical price (H+L+C)/3 * volume
 */
export function vwap(candles: Candle[], anchorIndex = 0): (number | null)[] {
  if (anchorIndex < 0 || anchorIndex >= candles.length) anchorIndex = 0;

  const out: (number | null)[] = new Array(candles.length).fill(null);
  let pvSum = 0;
  let vSum = 0;

  for (let i = anchorIndex; i < candles.length; i++) {
    const c = candles[i];
    const typical = (c.high + c.low + c.close) / 3;
    pvSum += typical * c.volume;
    vSum += c.volume;

    out[i] = vSum === 0 ? null : pvSum / vSum;
  }
  return out;
}

/**
 * Standard Deviation Channels: center = SMA(period),
 * upper = center + k*std, lower = center - k*std
 */
export function stdDevChannels(
  values: number[],
  period: number,
  k = 2
): Array<{ center: MaybeNum; upper: MaybeNum; lower: MaybeNum }> {
  const center = sma(values, period);
  const sd = rollingStd(values, period);
  const out = new Array(values.length) as Array<{
    center: MaybeNum;
    upper: MaybeNum;
    lower: MaybeNum;
  }>;

  for (let i = 0; i < values.length; i++) {
    const c = center[i];
    const s = sd[i];
    if (c == null || s == null) {
      out[i] = { center: null, upper: null, lower: null };
    } else {
      out[i] = { center: c, upper: c + k * s, lower: c - k * s };
    }
  }
  return out;
}
