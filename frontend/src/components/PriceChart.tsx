import React from 'react';
import { createChart, LineStyle, Time, ISeriesApi, IChartApi } from 'lightweight-charts'
import { useChartStore } from '@/state/store'
import { bollinger, vwap, vwma, stdDevChannels, Candle as IndCandle } from '@/lib/indicators'
import useHotkeys from '@/lib/hotkeys'
import { setChart } from '@/lib/chartBus'
import DataStatus from '@/components/DataStatus'
import SymbolTfBar from '@/components/SymbolTfBar'
import { MarketDataAdapter } from '@/lib/data/adapter'
import { rafThrottle, debounce } from '@/lib/perf'
import { wireLightweightChartsMappings } from '@/lib/lw-mapping'

import {
  bucketCountFor,
  downsampleCandlesMinMax,
  downsampleLineMinMax,
  timeToSec,
  sliceByTimeWindow,
  // (we'll use these idx finders implicitly inside sliceByTimeWindow logic)
} from '@/lib/lod'

type Series = ISeriesApi<'Candlestick'>
type Candle = IndCandle

export default function PriceChart() {
  const ref = React.useRef<HTMLDivElement>(null)
  const seriesRef = React.useRef<Series>(null)
  const volRef = React.useRef<ISeriesApi<'Histogram'>>()
  const chartRef = React.useRef<IChartApi | null>(null)

  const { indicators, indicatorSettings, theme, symbol, timeframe } = useChartStore()
  const [provider] = React.useState<string>(String(process.env.NEXT_PUBLIC_DATA_PROVIDER || 'mock'))
  const [candles, setCandles] = React.useState<Candle[]>([])
  const [rangeTick, setRangeTick] = React.useState(0) // bump on zoom/pan to refresh indicator LOD

  useHotkeys()

  // build chart once
  React.useEffect(() => {
  // Fynix Phase U: ensure extras are stopped on unmount
  const __fynixCleanup = (typeof __fynixStopExtras === 'function') ? __fynixStopExtras : null;
if (!ref.current) return
    const chart = createChart(ref.current, {
      layout: { background: { color: theme==='light' ? '#fff' : '#0a0a0a' }, textColor: theme==='light' ? '#111' : '#ddd' },
      grid: { horzLines: { color: '#222' }, vertLines: { color: '#222' } },
      rightPriceScale: { borderColor: '#333' },
      timeScale: { borderColor: '#333' }
    })
    chartRef.current = chart
    const series = chart.addCandlestickSeries()
    seriesRef.current = series
    const vol = chart.addHistogramSeries({ priceScaleId: 'left' })
    volRef.current = vol

    const publish = () => setChart({ chart, series, candles: (candles as any) })
    publish()
    const resize = () => { chart.applyOptions({ width: ref.current!.clientWidth, height: ref.current!.clientHeight }); publish(); recomputeLOD(); bumpRangeTick() }
    resize(); window.addEventListener('resize', resize)

    // subscribe to visible range changes -> dynamic LOD + indicator refresh
    const onRange = rafThrottle(() => { recomputeLOD(); bumpRangeTick() })
    const unsubRange = chart.timeScale().subscribeVisibleTimeRangeChange(onRange)

    return () => {
      window.removeEventListener('resize', resize)
      chart.timeScale().unsubscribeVisibleTimeRangeChange(onRange as any)
      chart.remove()
      chartRef.current = null
      setChart({ chart: null, series: null, candles: [] })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  const bumpRangeTick = React.useCallback(() => setRangeTick(t => (t + 1) | 0), [])

  // attach data adapter
  React.useEffect(() => {
  // Fynix Phase U: ensure extras are stopped on unmount
  const __fynixCleanup = (typeof __fynixStopExtras === 'function') ? __fynixStopExtras : null;
const adapter = new MarketDataAdapter({ provider: provider as any, symbol, timeframe })
    let unsub = () => {}
    unsub = adapter.on(rafThrottle((ev: any) => {
      const s = seriesRef.current
      const v = volRef.current
      if (!s || !v) return
      setCandles(ev.candles as Candle[])
      // Once per frame, recompute LOD for the currently visible window.
      recomputeLOD()
      // Indicators will re-plot on rangeTick via subscription; also bump once here so live updates refresh lines.
      bumpRangeTick()
      setChart({ chart: (s as any).chart(), series: s, candles: (ev.candles as any) })
    }))
    adapter.start()
    return () => { unsub(); adapter.stop() }
  }, [provider, symbol, timeframe, bumpRangeTick])

  /** ========== Indicator plotting (windowed LOD) ========== */
  React.useEffect(() => {
  // Fynix Phase U: ensure extras are stopped on unmount
  const __fynixCleanup = (typeof __fynixStopExtras === 'function') ? __fynixStopExtras : null;
const run = () => {
      const s = seriesRef.current
      const chart = chartRef.current
      if (!s || !chart || candles.length === 0) return

      // cleanup previous indicator series
      const kill = (key: string) => { (window as any)[key] = undefined }
      kill('_bbSeries'); kill('_vwap'); kill('_vwma'); kill('_stdch')

      // Compute window bounds
      const vr = chart.timeScale().getVisibleRange()
      let view = candles
      let startIdx = 0
      let endIdx = candles.length - 1
      if (vr) {
        const fromSec = timeToSec(vr.from as Time)
        const toSec = timeToSec(vr.to as Time)
        view = sliceByTimeWindow(candles as any, fromSec, toSec) as Candle[]
        if (view.length >= 2) {
          // locate indices by comparing times; since sliceByTimeWindow already clamps, we can map back via time match
          const firstT = timeToSec(view[0].time as Time)
          const lastT = timeToSec(view[view.length-1].time as Time)
          startIdx = candles.findIndex(c => timeToSec(c.time as Time) >= firstT)
          if (startIdx < 0) startIdx = 0
          endIdx = Math.max(startIdx, candles.findIndex(c => timeToSec(c.time as Time) > lastT) - 1)
          if (endIdx < 0) endIdx = candles.length - 1
        }
      }

      // Pad for period-based indicators so edges look correct
      const pad = Math.max(indicatorSettings.bbPeriod, indicatorSettings.vwmaPeriod, indicatorSettings.stdChannelPeriod)
      const paddedStart = Math.max(0, startIdx - pad)
      const paddedEnd = endIdx
      const slice = candles.slice(paddedStart, paddedEnd + 1)
      const close = slice.map(c => c.close)
      const width = ref.current?.clientWidth || 1200
      const target = Math.floor(width / 2.5)

      // --- Bollinger Bands
      if (indicators.showBB) {
        const bb = bollinger(close, indicatorSettings.bbPeriod, indicatorSettings.bbMult)
        const basis = chart.addLineSeries({ lineStyle: LineStyle.Solid, lineWidth: 1 })
        const upper = chart.addLineSeries({ lineStyle: LineStyle.Solid, lineWidth: 1 })
        const lower = chart.addLineSeries({ lineStyle: LineStyle.Solid, lineWidth: 1 })

        // Map back to original candle times for just the visible window (not the padding)
        const vTimes = candles.slice(startIdx, endIdx + 1).map(c => c.time as Time)
        const baseData = vTimes.map((t, i) => ({ time: t, value: bb[(i + (startIdx - paddedStart))]?.basis ?? NaN }))
        const upData   = vTimes.map((t, i) => ({ time: t, value: bb[(i + (startIdx - paddedStart))]?.upper ?? NaN }))
        const loData   = vTimes.map((t, i) => ({ time: t, value: bb[(i + (startIdx - paddedStart))]?.lower ?? NaN }))

        basis.setData(downsampleLineMinMax(baseData, target))
        upper.setData(downsampleLineMinMax(upData, target))
        lower.setData(downsampleLineMinMax(loData, target))
        if (indicators.bandFill) { upper.applyOptions({ priceLineVisible: false }); lower.applyOptions({ priceLineVisible: false }) }
        ;(window as any)._bbSeries = [basis, upper, lower]
      }

      // --- VWAP (respect anchored index; shift relative to padded slice)
      if (indicators.showVWAP) {
        const anchorAbs = indicatorSettings.vwapAnchorIndex ?? 0
        const anchorRel = Math.max(0, anchorAbs - paddedStart)
        const v = vwap(slice as any, Math.min(anchorRel, slice.length-1))
        const vwapLine = chart.addLineSeries({ lineWidth: 2 })
        const vTimes = candles.slice(startIdx, endIdx + 1).map(c => c.time as Time)
        const data = vTimes.map((t, i) => ({ time: t, value: v[(i + (startIdx - paddedStart))] ?? NaN }))
        vwapLine.setData(downsampleLineMinMax(data, target))
        ;(window as any)._vwap = vwapLine
      }

      // --- VWMA
      if (indicators.showVWMA) {
        const vArr = vwma(slice as any, indicatorSettings.vwmaPeriod)
        const line = chart.addLineSeries({ lineWidth: 1 })
        const vTimes = candles.slice(startIdx, endIdx + 1).map(c => c.time as Time)
        const data = vTimes.map((t, i) => ({ time: t, value: vArr[(i + (startIdx - paddedStart))] ?? NaN }))
        line.setData(downsampleLineMinMax(data, target))
        ;(window as any)._vwma = line
      }

      // --- StdDev Channels
      if (indicators.showStdChannels) {
        const ch = stdDevChannels(close, indicatorSettings.stdChannelPeriod, indicatorSettings.stdChannelMult)
        const mid = chart.addLineSeries({ lineWidth: 1 })
        const up  = chart.addLineSeries({ lineWidth: 1 })
        const lo  = chart.addLineSeries({ lineWidth: 1 })
        const vTimes = candles.slice(startIdx, endIdx + 1).map(c => c.time as Time)
        const midData = vTimes.map((t, i) => ({ time: t, value: ch[(i + (startIdx - paddedStart))]?.mid ?? NaN }))
        const upData  = vTimes.map((t, i) => ({ time: t, value: ch[(i + (startIdx - paddedStart))]?.upper ?? NaN }))
        const loData  = vTimes.map((t, i) => ({ time: t, value: ch[(i + (startIdx - paddedStart))]?.lower ?? NaN }))
        const tgt = target
        mid.setData(downsampleLineMinMax(midData, tgt))
        up.setData(downsampleLineMinMax(upData, tgt))
        lo.setData(downsampleLineMinMax(loData, tgt))
        ;(window as any)._stdch = [mid, up, lo]
      }
    }
    // Debounce to avoid thrashing when panning/zooming; re-run when:
    //  - indicators toggled
    //  - indicator settings changed
    //  - candle set changed
    //  - visible range changed (rangeTick)
    debounce(run, 60)()
  }, [indicators, indicatorSettings, candles, rangeTick])

  /** ========== Dynamic LOD for price/volume on zoom/pan ========== */
  const recomputeLOD = React.useCallback(() => {
    const s = seriesRef.current
    const v = volRef.current
    const chart = chartRef.current
    if (!s || !v || !chart) return
    const all = candles
    if (!all.length) return

    const width = ref.current?.clientWidth || 1200
    const target = bucketCountFor(width, 2.5)

    const vr = chart.timeScale().getVisibleRange()
    let view: Candle[]
    if (!vr) {
      view = all
    } else {
      const fromSec = timeToSec(vr.from as Time)
      const toSec = timeToSec(vr.to as Time)
      view = sliceByTimeWindow(all as any, fromSec, toSec)
      if (view.length < 2) view = all
    }

    const ds = downsampleCandlesMinMax(view as any, target)
    s.setData(ds as any)
    v.setData(ds.map(c => ({ time: c.time as Time, value: c.volume })))
  }, [candles])

  return (
    <div className='absolute inset-0 rounded-2xl overflow-hidden'>
      <div ref={ref} className='absolute inset-0' />
      <SymbolTfBar />
      <DataStatus provider={provider} symbol={symbol} timeframe={timeframe} />
    </div>
  )
}




