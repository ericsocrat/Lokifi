import { setVisibleBarCoords } from '@/lib/charts/chartMap'
import { startPriceFeed } from '@/lib/price-feed'
import type { IChartApi, ISeriesApi, Time, SeriesDataPoint } from '@/src/types/lightweight-charts'

/**
 * Lightweight-charts extras:
 *  - Feeds precise bar X coords (for X-snap) from real series data
 *  - Starts a live price feed that drives the alerts engine (line/level crossings)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wireLightweightChartsExtras(
  chart: IChartApi | any,
  series: ISeriesApi<Time> | any,
  getSeriesData: () => Array<SeriesDataPoint>,
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
      if (vr && 'from' in vr && 'to' in vr && [vr.from, vr.to].every((v: any) => Number.isFinite(Number(v)))) {
        const fromIdx = Math.max(0, Math.floor(Number(vr.from)))
        const toIdx = Math.ceil(Number(vr.to))
        slice = data.slice(fromIdx, Math.min(data.length, toIdx + 1))
      } else {
        slice = data.slice(-400)
      }
      const xs: number[] = []
      for (const bar of slice) {
        const x = ts?.timeToCoordinate?.(bar.time as Time)
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
