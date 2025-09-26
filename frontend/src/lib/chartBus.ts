import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import type { Candle } from '@/lib/indicators'

type ChartCtx = {
  chart: IChartApi | null
  series: ISeriesApi<'Candlestick'> | null
  candles: Candle[]
}

let ctx: ChartCtx = { chart: null, series: null, candles: [] }
let listeners: Array<() => void> = []

export function setChart(next: ChartCtx) {
  ctx = next
  listeners.forEach(fn => fn())
}
export function getChart(): ChartCtx {
  return ctx
}
export function onChartChange(fn: () => void) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(f => f !== fn) }
}
