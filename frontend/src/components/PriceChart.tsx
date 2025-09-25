import React from 'react'
import { createChart, ISeriesApi, LineStyle, Time } from 'lightweight-charts'
import { useChartStore } from '@/state/store'
import { bollinger, vwap, vwma, stdDevChannels, Candle } from '@/lib/indicators'
import useHotkeys from '@/lib/hotkeys'

type Series = ISeriesApi<'Candlestick'>

function genData(n=500): Candle[] {
  let t = Math.floor(Date.now()/1000) - n*3600
  let p = 100
  const out: Candle[] = []
  for (let i=0;i<n;i++){
    const vol = Math.max(1, Math.round(100*Math.random()))
    const drift = (Math.random()-0.5)*2
    const open = p
    const high = open + Math.abs(drift)*2 + Math.random()*1.5
    const low  = open - Math.abs(drift)*2 - Math.random()*1.5
    const close = Math.max(low, Math.min(high, open + drift))
    p = close
    out.push({ time: t as number, open, high, low, close, volume: vol })
    t += 3600
  }
  return out
}

export default function PriceChart() {
  const ref = React.useRef<HTMLDivElement>(null)
  const seriesRef = React.useRef<Series>()
  const volRef = React.useRef<ISeriesApi<'Histogram'>>()
  const { indicators, indicatorSettings, theme } = useChartStore()
  const [candles] = React.useState<Candle[]>(() => genData(600))

  useHotkeys()

  React.useEffect(() => {
    if (!ref.current) return
    const chart = createChart(ref.current, {
      layout: { background: { color: theme==='light' ? '#fff' : '#0a0a0a' }, textColor: theme==='light' ? '#111' : '#ddd' },
      grid: { horzLines: { color: '#222' }, vertLines: { color: '#222' } },
      rightPriceScale: { borderColor: '#333' },
      timeScale: { borderColor: '#333' }
    })
    const series = chart.addCandlestickSeries()
    seriesRef.current = series
    series.setData(candles.map(c => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })))

    const vol = chart.addHistogramSeries({ priceScaleId: 'left' })
    volRef.current = vol
    vol.setData(candles.map(c => ({ time: c.time as Time, value: c.volume })))

    const resize = () => chart.applyOptions({ width: ref.current!.clientWidth, height: ref.current!.clientHeight })
    resize(); window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); chart.remove() }
  }, [ref, theme, candles])

  React.useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    const close = candles.map(c => c.close)
    const chart = (series as any).chart()

    // cleanup stored refs (demo)
    const kill = (key: string) => { (window as any)[key] = undefined }
    kill('_bbSeries'); kill('_vwap'); kill('_vwma'); kill('_stdch')

    // BB
    if (indicators.showBB) {
      const bb = bollinger(close, indicatorSettings.bbPeriod, indicatorSettings.bbMult)
      const basis = chart.addLineSeries({ lineStyle: LineStyle.Solid, lineWidth: 1 })
      const upper = chart.addLineSeries({ lineStyle: LineStyle.Solid, lineWidth: 1 })
      const lower = chart.addLineSeries({ lineStyle: LineStyle.Solid, lineWidth: 1 })
      basis.setData(bb.map((b, i) => ({ time: candles[i].time as Time, value: b.basis ?? NaN })))
      upper.setData(bb.map((b, i) => ({ time: candles[i].time as Time, value: b.upper ?? NaN })))
      lower.setData(bb.map((b, i) => ({ time: candles[i].time as Time, value: b.lower ?? NaN })))
      if (indicators.bandFill) {
        upper.applyOptions({ priceLineVisible: false })
        lower.applyOptions({ priceLineVisible: false })
      }
      ;(window as any)._bbSeries = [basis, upper, lower]
    }

    // VWAP
    if (indicators.showVWAP) {
      const v = vwap(candles, 0)
      const vwapLine = chart.addLineSeries({ lineWidth: 2 })
      vwapLine.setData(v.map((vv, i) => ({ time: candles[i].time as Time, value: vv ?? NaN })))
      ;(window as any)._vwap = vwapLine
    }

    // VWMA
    if (indicators.showVWMA) {
      const v = vwma(candles, indicatorSettings.vwmaPeriod)
      const vwmaLine = chart.addLineSeries({ lineWidth: 1 })
      vwmaLine.setData(v.map((vv, i) => ({ time: candles[i].time as Time, value: vv ?? NaN })))
      ;(window as any)._vwma = vwmaLine
    }

    // StdDev Channels
    if (indicators.showStdChannels) {
      const ch = stdDevChannels(close, indicatorSettings.stdChannelPeriod, indicatorSettings.stdChannelMult)
      const mid = chart.addLineSeries({ lineWidth: 1 })
      const up = chart.addLineSeries({ lineWidth: 1 })
      const lo = chart.addLineSeries({ lineWidth: 1 })
      mid.setData(ch.map((c, i) => ({ time: candles[i].time as Time, value: c.mid ?? NaN })))
      up.setData(ch.map((c, i) => ({ time: candles[i].time as Time, value: c.upper ?? NaN })))
      lo.setData(ch.map((c, i) => ({ time: candles[i].time as Time, value: c.lower ?? NaN })))
      ;(window as any)._stdch = [mid, up, lo]
    }
  }, [indicators, indicatorSettings, candles])

  return <div ref={ref} className="absolute inset-0 rounded-2xl overflow-hidden" />
}
