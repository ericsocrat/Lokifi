import { useChartStore } from '@/state/store'
import { priceToY } from '@/lib/charts/chartMap'

/**
 * Polls latest price via getLastPrice() and feeds the alerts engine using canvas Y (px).
 * Returns a cleanup function.
 */
export function startPriceFeed(getLastPrice: () => number | null, intervalMs = 500) {
  // any required: evaluateAlerts is not typed in ChartState interface (planned feature)
  const st = (useChartStore as unknown as { getState: () => { evaluateAlerts?: (prevY: number | null, y: number) => void } }).getState()
  if (!st) return () => {}
  let prevY: number | null = null
  let t: ReturnType<typeof setInterval> | null = null

  const tick = () => {
    try {
      const p = getLastPrice()
      if (p == null) return
      const y = priceToY(p)
      if (y == null) return
      st.evaluateAlerts?.(prevY, y)
      prevY = y
    } catch {}
  }

  t = setInterval(tick, Math.max(200, intervalMs))
  setTimeout(tick, 0)
  return () => { try { clearInterval(t) } catch {} }
}
