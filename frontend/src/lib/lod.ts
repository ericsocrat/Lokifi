import type { Time } from 'lightweight-charts'

export type Candle = { time: Time; open: number; high: number; low: number; close: number; volume: number }

export function bucketCountFor(widthPx: number, pxPerBucket = 3): number {
  return Math.max(50, Math.floor(widthPx / pxPerBucket))
}

export function downsampleCandlesMinMax(data: Candle[], target: number): Candle[] {
  if (data.length <= target) return data
  const bucketSize = data.length / target
  const out: Candle[] = []
  let i = 0
  while (i < data.length) {
    const start = Math.floor(i)
    const end = Math.min(data.length, Math.floor(i + bucketSize))
    if (end - start <= 0) break
    let high = -Infinity, low = Infinity
    let open = data[start].open, close = data[end-1].close
    let vol = 0
    for (let j=start; j<end; j++){
      const c = data[j]
      if (c.high > high) high = c.high
      if (c.low  < low ) low  = c.low
      vol += c.volume || 0
    }
    const mid = Math.floor((start + end - 1) / 2)
    out.push({ time: data[mid].time, open, high, low, close, volume: vol })
    i += bucketSize
  }
  return out
}

export function downsampleLineMinMax(xs: Array<{ time: Time; value: number }>, target: number) {
  if (xs.length <= target) return xs
  const bucket = xs.length / target
  const out: Array<{ time: Time; value: number }> = []
  let i = 0
  while (i < xs.length) {
    const start = Math.floor(i)
    const end = Math.min(xs.length, Math.floor(i + bucket))
    if (end - start <= 0) break
    let hi = -Infinity, lo = Infinity, hiIdx = start, loIdx = start
    for (let j=start; j<end; j++){
      const v = xs[j].value
      if (v > hi) { hi = v; hiIdx = j }
      if (v < lo) { lo = v; loIdx = j }
    }
    out.push(xs[loIdx], xs[hiIdx])
    i += bucket
  }
  return out
}

/** ========== New in N3.1: visible-range helpers ========== **/

// Convert lightweight-charts Time to seconds for comparisons.
export function timeToSec(t: Time): number {
  if (typeof t === 'number') return t
  if (typeof (t as any) === 'string') return Number(t)
  const bd = t as any
  if (bd && typeof bd === 'object' && 'year' in bd && 'month' in bd && 'day' in bd) {
    const d = new Date(Date.UTC(bd.year, (bd.month||1)-1, bd.day))
    return Math.floor(d.getTime()/1000)
  }
  return 0
}

// Binary search first index >= ts
export function lowerBoundByTime(data: Candle[], ts: number): number {
  let lo = 0, hi = data.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (timeToSec(data[mid].time) < ts) lo = mid + 1
    else hi = mid
  }
  return lo
}

// Binary search last index <= ts (returns index, not count)
export function upperBoundByTime(data: Candle[], ts: number): number {
  let lo = 0, hi = data.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (timeToSec(data[mid].time) <= ts) lo = mid + 1
    else hi = mid
  }
  return lo - 1
}

// Slice candles within [fromSec, toSec], inclusive, clamped.
export function sliceByTimeWindow(data: Candle[], fromSec: number, toSec: number): Candle[] {
  if (!data.length) return data
  if (fromSec > toSec) [fromSec, toSec] = [toSec, fromSec]
  const start = Math.max(0, Math.min(data.length-1, lowerBoundByTime(data, fromSec)))
  const end   = Math.max(-1, Math.min(data.length-1, upperBoundByTime(data, toSec)))
  if (end < start) return []
  return data.slice(start, end + 1)
}
