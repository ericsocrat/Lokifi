export type Candle = { time:number; open:number; high:number; low:number; close:number; volume:number };
function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (prev === null) prev = values[i];
    else prev = values[i] * k + prev * (1 - k);
    out.push(i >= period - 1 ? prev : null);
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gains.push(Math.max(d, 0));
    losses.push(Math.max(-d, 0));
  }
  let avgG: number | null = null;
  let avgL: number | null = null;
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period) { out.push(null); continue; }
    if (i === period) {
      let sg = 0, sl = 0;
      for (let j = 1; j <= period; j++) { sg += gains[j]; sl += losses[j]; }
      avgG = sg / period; avgL = sl / period;
    } else {
      avgG = ((avgG as number) * (period - 1) + gains[i]) / period;
      avgL = ((avgL as number) * (period - 1) + losses[i]) / period;
    }
    if ((avgL as number) === 0) out.push(100);
    else {
      const rs = (avgG as number) / (avgL as number);
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

export function macd(values: number[], fast=12, slow=26, signal=9) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine: (number | null)[] = values.map((_, i) => {
    if (emaFast[i] == null || emaSlow[i] == null) return null;
    return (emaFast[i] as number) - (emaSlow[i] as number);
  });
  const signalLine = ema(macdLine.map(v => v ?? 0), signal).map((v, i) => macdLine[i] == null ? null : v);
  const hist: (number | null)[] = macdLine.map((v, i) => (v == null || signalLine[i] == null) ? null : (v as number) - (signalLine[i] as number));
  return { macdLine, signalLine, hist };
}


export function bollinger(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period);
  const upper: (number | null)[] = new Array(values.length).fill(null);
  const lower: (number | null)[] = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    let sum = 0, sumsq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const v = values[j];
      sum += v; sumsq += v * v;
    }
    const mean = sum / period;
    const variance = Math.max(0, (sumsq / period) - (mean * mean));
    const stdev = Math.sqrt(variance);
    upper[i] = mean + mult * stdev;
    lower[i] = mean - mult * stdev;
  }
  return { mid, upper, lower };
}

export function vwap(typical: number[], volume: number[]) {
  const out: (number | null)[] = new Array(typical.length).fill(null);
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < typical.length; i++) {
    const v = volume[i] ?? 0;
    const p = typical[i];
    if (v > 0) {
      cumPV += p * v;
      cumV += v;
      out[i] = cumV > 0 ? (cumPV / cumV) : null;
    } else {
      // If no volume on this bar, carry forward previous VWAP (do not reset)
      out[i] = cumV > 0 ? (cumPV / cumV) : null;
    }
  }
  return out;
}


export function vwma(values: number[], volume: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sumPV = 0, sumV = 0;
  for (let i = 0; i < values.length; i++) {
    const v = volume[i] ?? 0;
    sumPV += values[i] * v;
    sumV += v;
    if (i >= period) {
      const vOld = volume[i - period] ?? 0;
      sumPV -= values[i - period] * vOld;
      sumV -= vOld;
    }
    out[i] = (i >= period - 1 && sumV > 0) ? (sumPV / sumV) : null;
  }
  return out;
}



export function stddevChannels(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period);
  const upper: (number | null)[] = new Array(values.length).fill(null);
  const lower: (number | null)[] = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    let sum = 0, sumsq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const v = values[j];
      sum += v; sumsq += v * v;
    }
    const mean = sum / period;
    const variance = Math.max(0, (sumsq / period) - (mean * mean));
    const stdev = Math.sqrt(variance);
    upper[i] = mean + mult * stdev;
    lower[i] = mean - mult * stdev;
  }
  return { mid, upper, lower };
}

export { sma };
export const stdDevChannels = stddevChannels;