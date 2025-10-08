import { setMappers, setVisibleBarCoords, setVisiblePriceLevels } from '@/lib/chartMap'
import type { IChartApi, ISeriesApi, Time } from '@/src/types/lightweight-charts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wireLightweightChartsMappings(chart: IChartApi | any, series: ISeriesApi<Time> | any) {
  if (!chart || !series) return

  setMappers({
    yToPrice: (y:number) => {
      const p = series?.coordinateToPrice?.(y)
      return (typeof p === 'number') ? p : null
    },
    priceToY: (price:number) => {
      const c = series?.priceToCoordinate?.(price)
      return (typeof c === 'number') ? c : null
    },
    xToTime: (x:number) => chart?.timeScale?.()?.coordinateToTime?.(x) ?? null,
    timeToX: (t:string | number | Date) => chart?.timeScale?.()?.timeToCoordinate?.(t as Time) ?? null,
  })

  const feedVisible = () => {
    try {
      const ts = chart.timeScale()
      const vr = ts.getVisibleRange?.() ?? ts.getVisibleLogicalRange?.()
      if (!vr) return
      const range = 'from' in vr ? vr : { from: vr.from, to: vr.to }

      // collect ~50 bar X coords
      const xs:number[] = []
      const steps = 50
      for (let i=0;i<=steps;i++){
        const frac = i/steps
        const t = (range.from * (1-frac)) + (range.to * frac)
        const x = ts.timeToCoordinate?.(t as Time)
        if (typeof x === 'number') xs.push(x)
      }
      setVisibleBarCoords(xs)

      // light price levels (sample a few Y -> price)
      const h = chart?.chartElement?.clientHeight ?? 600
      const sampleYs = [0.1, 0.3, 0.5, 0.7, 0.9].map(p => p * h)
      const prices = sampleYs.map(y => series?.coordinateToPrice?.(y)).filter((p): p is number => typeof p === 'number')
      const levels = new Set<number>()
      prices.forEach(p => {
        const tick = Math.pow(10, Math.floor(Math.log10(Math.max(1e-9, Math.abs(p)))) - 2)
        for (let k=-5;k<=5;k++) levels.add(Number((p + k*tick).toFixed(6)))
      })
      setVisiblePriceLevels(Array.from(levels))
    } catch {}
  }

  const ts = chart.timeScale()
  ts.subscribeVisibleTimeRangeChange?.(feedVisible)
  ts.subscribeVisibleLogicalRangeChange?.(feedVisible)
  feedVisible()
}
