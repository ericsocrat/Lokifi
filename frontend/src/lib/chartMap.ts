import { getChart } from '@/lib/chartBus'
import type { Time } from 'lightweight-charts'

export type Px = { x: number; y: number }
export type Coord = { time: Time; price: number }

export function pxToCoord(px: Px): Coord | null {
  const { chart, series } = getChart()
  if (!chart || !series) return null
  const tscale = chart.timeScale()
  const time = tscale.coordinateToTime(px.x as number)
  const price = (series as any).coordinateToPrice?.(px.y)
  if (time == null || price == null) return null
  return { time, price }
}

export function coordToPx(c: Coord): Px | null {
  const { chart, series } = getChart()
  if (!chart || !series) return null
  const tscale = chart.timeScale()
  const x = tscale.timeToCoordinate(c.time)
  const y = (series as any).priceToCoordinate?.(c.price)
  if (x == null || y == null) return null
  return { x, y }
}

export function nearestIndexForX(x: number): number | null {
  const { chart, candles } = getChart()
  if (!chart) return null
  const tscale = chart.timeScale()
  let bestIdx = -1
  let bestDist = Infinity
  for (let i=0;i<candles.length;i++){
    const px = tscale.timeToCoordinate(candles[i].time as any)
    if (px == null) continue
    const d = Math.abs(px - x)
    if (d < bestDist) { bestDist = d; bestIdx = i }
  }
  return bestIdx >= 0 ? bestIdx : null
}

// a very simple 'nice' tick step ~ 1/50th of visible price range
export function autoTickStep(): number | null {
  const { chart, series } = getChart()
  if (!chart || !series) return null
  const pr = (series as any).priceScale()?.priceRange()?.minMax()
  if (!pr) return null
  const range = pr.max - pr.min
  const raw = range / 50
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  const mant = raw / pow10
  const niceMant = mant < 1.5 ? 1 : mant < 3 ? 2 : mant < 7 ? 5 : 10
  return niceMant * pow10
}

export function snapPxToGrid(px: Px): Px {
  const { chart, candles } = getChart()
  if (!chart || candles.length === 0) return px
  const tscale = chart.timeScale()
  const idx = nearestIndexForX(px.x)
  const step = autoTickStep()
  let x = px.x
  let y = px.y
  if (idx != null) {
    const t = candles[idx].time as any
    const sx = tscale.timeToCoordinate(t)
    if (sx != null) x = Math.round(sx)
  }
  if (step != null) {
    // map to price, snap, map back
    const series = (getChart().series as any)
    const price = series?.coordinateToPrice?.(px.y)
    if (price != null) {
      const snapped = Math.round(price/step) * step
      const sy = series?.priceToCoordinate?.(snapped)
      if (sy != null) y = Math.round(sy)
    }
  }
  return { x, y }
}
