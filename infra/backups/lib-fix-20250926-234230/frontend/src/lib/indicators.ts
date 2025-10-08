export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number }

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number|null)[] = new Array(values.length).fill(null)
  let sum = 0
  for (let i=0;i<values.length;i++){
    sum += values[i]
    if (i>=period) sum -= values[i-period]
    if (i>=period-1) out[i] = sum/period
  }
  return out
}

export function vwma(candles: Candle[], period: number): (number | null)[] {
  const out: (number|null)[] = new Array(candles.length).fill(null)
  let pvSum = 0
  let vSum = 0
  for (let i=0;i<candles.length;i++){
    const p = candles[i].close
    const v = candles[i].volume
    pvSum += p*v
    vSum += v
    if (i>=period){
      pvSum -= candles[i-period].close * candles[i-period].volume
      vSum  -= candles[i-period].volume
    }
    if (i>=period-1) out[i] = vSum ? pvSum / vSum : null
  }
  return out
}

export function bollinger(close: number[], period: number, mult: number) {
  const mean = sma(close, period)
  return close.map((_, i) => {
    if (mean[i] == null) return { basis: null, upper: null, lower: null, dev: null }
    const start = i - period + 1
    const slice = close.slice(start, i+1)
    const m = mean[i] as number
    const variance = slice.reduce((acc, v) => acc + (v - m) ** 2, 0) / period
    const dev = Math.sqrt(variance)
    return { basis: m, upper: m + mult * dev, lower: m - mult * dev, dev }
  })
}

export function vwap(candles: Candle[], anchorIndex = 0) {
  const out: (number|null)[] = new Array(candles.length).fill(null)
  let pv = 0, vv = 0
  for (let i=anchorIndex;i<candles.length;i++){
    const p = (candles[i].high + candles[i].low + candles[i].close)/3
    const v = candles[i].volume
    pv += p*v
    vv += v
    out[i] = vv ? pv/vv : null
  }
  return out
}

export function stdDevChannels(close: number[], period: number, mult: number) {
  const basis = sma(close, period)
  return close.map((_, i) => {
    if (basis[i] == null) return { mid: null, upper: null, lower: null, dev: null }
    const start = i - period + 1
    const slice = close.slice(start, i+1)
    const m = basis[i] as number
    const variance = slice.reduce((acc, v) => acc + (v - m) ** 2, 0) / period
    const dev = Math.sqrt(variance)
    return { mid: m, upper: m + mult * dev, lower: m - mult * dev, dev }
  })
}
