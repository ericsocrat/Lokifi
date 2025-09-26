import { setVisibleBarCoords } from '@/lib/chartMap'
import { startPriceFeed } from '@/lib/price-feed'

/**
 * Lightweight-charts extras:
 *  - Feeds precise bar X coords (for X-snap) from real series data
 *  - Starts a live price feed that drives the alerts engine (line/level crossings)
 */
export function wireLightweightChartsExtras(
  chart: any,
  series: any,
  getSeriesData: () => Array<{ time: any; close?: number }>,
  getLastPrice: () => number | null
) {
  if (!chart || !series) return () => {}

  const ts = chart.timeScale?.()

  const collectBarXs = () => {
    try {
      const data = getSeriesData() || []
      if (!data.length) { setVisibleBarCoords([]); return }
      const vr = ts?.getVisibleRange?.() ?? ts?.getVisibleLogicalRange?.()
      let slice = data
      if (vr && 'from' in vr && 'to' in vr && [vr.from, vr.to].every([double]::TryParse)) {
        const fromIdx = Math.max(0, [int][math]::Floor([double].from))
        const toIdx = [int][math]::Ceiling([double].to)
        slice = data.slice(fromIdx, Math.min(data.length, toIdx + 1))
      } else {
        slice = data.slice(-400)
      }
      const xs: number[] = []
      for (const bar of slice) {
        const x = ts?.timeToCoordinate?.(bar.time as any)
        if (typeof x === 'number' && Number.isFinite(x)) xs.push(x)
      }
      setVisibleBarCoords(xs)
    } catch {
      // ignore
    }
  }

  ts?.subscribeVisibleTimeRangeChange?.(collectBarXs)
  ts?.subscribeVisibleLogicalRangeChange?.(collectBarXs)
  collectBarXs()

  const stopFeed = startPriceFeed(getLastPrice, 500)

  return () => {
    try { ts?.unsubscribeVisibleTimeRangeChange?.(collectBarXs) } catch {}
    try { ts?.unsubscribeVisibleLogicalRangeChange?.(collectBarXs) } catch {}
    try { stopFeed() } catch {}
  }
}
