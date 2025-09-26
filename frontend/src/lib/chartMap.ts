import { getChart } from '@/lib/chartBus'
import type { Time } from 'lightweight-charts'

type Pt = { x:number; y:number }

export function snapPxToGrid(p: Pt, step = 10, enabled = true): Pt {
  if (!enabled || step <= 1) return p
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step }
}

export function priceToY(price: number): number | null {
  try {
    const bus = getChart(); const s = bus?.series as any
    const ps = s?.priceScale?.()
    const y = ps?.priceToCoordinate?.(price)
    return (typeof y === 'number') ? y : null
  } catch { return null }
}
export function yToPrice(y: number): number | null {
  try {
    const bus = getChart(); const s = bus?.series as any
    const ps = s?.priceScale?.()
    const p = ps?.coordinateToPrice?.(y)
    return (typeof p === 'number') ? p : null
  } catch { return null }
}

export function pxToBars(dx: number): number | null {
  try {
    const bus = getChart(); const chart = bus?.chart as any
    if (!chart) return null
    const ts = chart.timeScale?.()
    const range = ts?.getVisibleLogicalRange?.()
    if (!range) return null
    const width = chart?.width?.() ?? 1200
    const barsVisible = (range.to - range.from)
    if (!isFinite(barsVisible) || barsVisible <= 0) return null
    return (dx / Math.max(1, width)) * barsVisible
  } catch { return null }
}

function timeToSec(t: Time): number {
  if (typeof t === 'number') return t
  if (typeof (t as any) === 'string') return Number(t)
  const bd = t as any
  if (bd && typeof bd === 'object' && 'year' in bd) {
    const d = new Date(Date.UTC(bd.year, (bd.month||1)-1, bd.day))
    return Math.floor(d.getTime()/1000)
  }
  return 0
}
function lowerBoundByTime(data: any[], ts: number): number {
  let lo=0, hi=data.length
  while (lo<hi) { const mid=(lo+hi)>>1; const v = timeToSec(data[mid].time as any); if (v < ts) lo = mid+1; else hi = mid }
  return lo
}
function upperBoundByTime(data: any[], ts: number): number {
  let lo=0, hi=data.length
  while (lo<hi) { const mid=(lo+hi)>>1; const v = timeToSec(data[mid].time as any); if (v <= ts) lo = mid+1; else hi = mid }
  return lo-1
}

export function getVisibleCandles(): any[] {
  try {
    const bus = getChart()
    const chart: any = bus?.chart
    const all = (bus?.candles as any[]) || []
    const vr = chart?.timeScale?.().getVisibleRange?.()
    if (!vr || !all.length) return all
    const from = timeToSec(vr.from as Time), to = timeToSec(vr.to as Time)
    const start = lowerBoundByTime(all, from), end = upperBoundByTime(all, to)
    if (end < start) return all
    return all.slice(start, end+1)
  } catch { return [] }
}

export function visiblePriceLevels(maxLevels = 200): number[] {
  const vis = getVisibleCandles()
  if (!vis.length) return []
  const levels = new Set<number>()
  const take = Math.min(vis.length, maxLevels)
  const start = vis.length - take
  for (let i=start;i<vis.length;i++){
    const c = vis[i]; if (!c) continue
    if (isFinite(c.open))  levels.add(c.open)
    if (isFinite(c.high))  levels.add(c.high)
    if (isFinite(c.low))   levels.add(c.low)
    if (isFinite(c.close)) levels.add(c.close)
  }
  const last = vis[vis.length-1]
  if (last?.close != null) levels.add(last.close)
  return Array.from(levels)
}

export function snapYToPriceLevels(yPx: number, tolerancePx = 6): number {
  const levels = visiblePriceLevels()
  if (!levels.length) return yPx
  let bestY = yPx, bestD = Infinity
  for (const p of levels) {
    const yy = priceToY(p)
    if (yy == null) continue
    const d = Math.abs(yy - yPx)
    if (d < bestD) { bestD = d; bestY = yy }
  }
  return bestD <= tolerancePx ? bestY : yPx
}
