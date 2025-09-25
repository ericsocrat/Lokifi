import React from 'react'
import { createChart, LineStyle, Time, ISeriesApi } from 'lightweight-charts'
import { useChartStore } from '@/state/store'
import { bollinger, vwap, vwma, stdDevChannels, Candle } from '@/lib/indicators'
import useHotkeys from '@/lib/hotkeys'
import { setChart } from '@/lib/chartBus'
import DataStatus from '@/components/DataStatus'
import { MarketDataAdapter } from '@/lib/data/adapter'

type Series = ISeriesApi<'Candlestick'>

export default function PriceChart() {
  const ref = React.useRef<HTMLDivElement>(null)
  const seriesRef = React.useRef<Series>()
  const volRef = React.useRef<ISeriesApi<'Histogram'>>()
  const { indicators, indicatorSettings, theme, symbol, timeframe } = useChartStore()
  const [provider] = React.useState<string>(String(process.env.NEXT_PUBLIC_DATA_PROVIDER || 'mock'))
  const [candles, setCandles] = React.useState<Candle[]>([])

  useHotkeys()

  // bootstrap chart once
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
    const vol = chart.addHistogramSeries({ priceScaleId: 'left' })
    volRef.current = vol

    const publish = () => setChart({ chart, series, candles: (candles as any) })
    publish()
    const resize = () => { chart.applyOptions({ width: ref.current!.clientWidth, height: ref.current!.clientHeight }); publish() }
    resize(); window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); chart.remove(); setChart({ chart: null, series: null, candles: [] }) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  // attach data adapter (mock/http/ws) and stream in data
  React.useEffect(() => {
    const adapter = new MarketDataAdapter({ provider: provider as any, symbol, timeframe })
    let unsub = () => {}
    unsub = adapter.on(ev => {
      // Snapshot: full setData; Update: try smart update of last candle
      const s = seriesRef.current
      const v = volRef.current
      if (!s || !v) return
      const cs = ev.candles
      if (ev.type === 'snapshot') {
        s.setData(cs as any)
        v.setData(cs.map(c => ({ time: c.time as Time, value: c.volume })))
        setCandles(cs as any)
      } else {
        // update/append last bar
        const last = cs[cs.length - 1]
        s.update(last as any)
        v.update({ time: last.time as Time, value: last.volume })
        setCandles(cs as any)
      }
      setChart({ chart: (s as any).chart(), series: s, candles: cs as any })
    })
    adapter.start()
    return () => { unsub(); adapter.stop() }
  }, [provider, symbol, timeframe])

  // indicators redraw on deps
  React.useEffect(() => {
    const s = seriesRef.current
    if (!s || candles.length === 0) return
    const close = candles.map(c => c.close)
    const chart = (s as any).chart()

    // cleanup
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
      if (indicators.bandFill) { upper.applyOptions({ priceLineVisible: false }); lower.applyOptions({ priceLineVisible: false }) }
      ;(window as any)._bbSeries = [basis, upper, lower]
    }

    // VWAP
    if (indicators.showVWAP) {
      const anchor = indicatorSettings.vwapAnchorIndex ?? 0
      const v = vwap(candles as any, Math.max(0, Math.min(anchor, candles.length-1)))
      const vwapLine = chart.addLineSeries({ lineWidth: 2 })
      vwapLine.setData(v.map((vv, i) => ({ time: candles[i].time as Time, value: vv ?? NaN })))
      ;(window as any)._vwap = vwapLine
    }

    // VWMA
    if (indicators.showVWMA) {
      const v = vwma(candles as any, indicatorSettings.vwmaPeriod)
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

  return (
    <div className='absolute inset-0 rounded-2xl overflow-hidden'>
      <div ref={ref} className='absolute inset-0' />
      <DataStatus provider={provider} symbol={symbol} timeframe={timeframe} />
    </div>
  )
}
