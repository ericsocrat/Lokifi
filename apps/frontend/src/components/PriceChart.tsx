import DataStatus from '@/components/DataStatus';
import SymbolTfBar from '@/components/SymbolTfBar';
import { setChart } from '@/lib/charts/chartBus';
import {
  bollinger,
  stdDevChannels,
  vwap,
  vwma,
  type Candle as IndCandle,
} from '@/lib/charts/indicators';
import { MarketDataAdapter, type Candle as AdapterCandle } from '@/lib/data/adapter';
import useHotkeys from '@/lib/utils/hotkeys';
import { debounce, rafThrottle } from '@/lib/utils/perf';
import { calculateMACD } from '@/services/indicators/macd';
import { calculateRSI } from '@/services/indicators/rsi';
import { useChartStore } from '@/state/store';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ITimeScaleApi,
  LineStyle,
  Time,
  type TimeRangeChangeEventHandler,
} from 'lightweight-charts';
import React from 'react';

import {
  bucketCountFor,
  downsampleCandlesMinMax,
  downsampleLineMinMax,
  sliceByTimeWindow,
  timeToSec,
} from '@/lib/utils/lod';

type Series = ISeriesApi<'Candlestick'>;
type CandleLW = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
type Candle = IndCandle;

export default function PriceChart() {
  const ref = React.useRef<HTMLDivElement>(null);
  const seriesRef = React.useRef<Series | null>(null);
  const volRef = React.useRef<ISeriesApi<'Histogram'> | null>(null);
  const chartRef = React.useRef<IChartApi | null>(null);

  const { indicators, indicatorSettings, theme, symbol, timeframe } = useChartStore();
  const [provider] = React.useState<string>(
    String(process.env.NEXT_PUBLIC_DATA_PROVIDER || 'mock')
  );
  const [candles, setCandles] = React.useState<Candle[]>([]);
  const [rangeTick, setRangeTick] = React.useState(0); // bump on zoom/pan to refresh indicator LOD

  useHotkeys();

  // build chart once
  // Define resize callback outside useEffect
  const resizeCallback = React.useCallback(
    (
      chart: IChartApi,
      ref: React.RefObject<HTMLDivElement | null>,
      publish: () => void,
      recomputeLOD: () => void,
      bumpRangeTick: () => void
    ) => {
      if (!ref.current || !chart) return;
      chart.applyOptions({ width: ref.current.clientWidth, height: ref.current.clientHeight });
      publish();
      recomputeLOD();
      bumpRangeTick();
    },
    []
  );

  React.useEffect(() => {
    // Lokifi Phase U: ensure extras are stopped on unmount
    const __lokifiCleanup = typeof __lokifiStopExtras === 'function' ? __lokifiStopExtras : null;
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: {
        background: { color: theme === 'light' ? '#fff' : '#0a0a0a' },
        textColor: theme === 'light' ? '#111' : '#ddd',
      },
      grid: { horzLines: { color: '#222' }, vertLines: { color: '#222' } },
      rightPriceScale: { borderColor: '#333' },
      timeScale: { borderColor: '#333' },
    });
    chartRef.current = chart;
    const series = chart.addCandlestickSeries();
    seriesRef.current = series;
    const vol = chart.addHistogramSeries({ priceScaleId: 'left' });
    volRef.current = vol;

    const publish = () => setChart({ chart, series, candles });
    publish();

    const resize = () => resizeCallback(chart, ref, publish, recomputeLOD, bumpRangeTick);

    resize();
    window.addEventListener('resize', resize);

    // subscribe to visible range changes -> dynamic LOD + indicator refresh
    const onRange = rafThrottle(() => {
      recomputeLOD();
      bumpRangeTick();
    });

    // Get timeScale and assert its type
    const timeScale = chart.timeScale() as ITimeScaleApi<Time>;

    // Subscribe to changes
    timeScale.subscribeVisibleTimeRangeChange(onRange as TimeRangeChangeEventHandler<Time>);

    return () => {
      window.removeEventListener('resize', resize);
      try {
        timeScale.unsubscribeVisibleTimeRangeChange(onRange as TimeRangeChangeEventHandler<Time>);
      } catch (e) {
        console.error('Failed to unsubscribe from range changes:', e);
      }
      chart.remove();
      chartRef.current = null;
      setChart({ chart: null, series: null, candles: [] });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, resizeCallback]);

  const bumpRangeTick = React.useCallback(() => setRangeTick((t: number) => (t + 1) | 0), []);

  // attach data adapter
  React.useEffect(() => {
    // Lokifi Phase U: ensure extras are stopped on unmount
    const __lokifiCleanup = typeof __lokifiStopExtras === 'function' ? __lokifiStopExtras : null;
    const adapter = new MarketDataAdapter({ provider: provider as any, symbol, timeframe });
    let unsub = () => {};
    unsub = adapter.on(
      rafThrottle((ev: { type: 'snapshot' | 'update'; candles: AdapterCandle[] }) => {
        const s = seriesRef.current;
        const v = volRef.current;
        if (!s || !v) return;
        setCandles(ev.candles as Candle[]);
        // Once per frame, recompute LOD for the currently visible window.
        recomputeLOD();
        // Indicators will re-plot on rangeTick via subscription; also bump once here so live updates refresh lines.
        bumpRangeTick();
        setChart({ chart: (s as any).chart(), series: s, candles: ev.candles as any });
      })
    );
    adapter.start();
    return () => {
      unsub();
      adapter.stop();
    };
  }, [provider, symbol, timeframe, bumpRangeTick]);

  /** ========== Indicator plotting (windowed LOD) ========== */
  React.useEffect(() => {
    // Lokifi Phase U: ensure extras are stopped on unmount
    const __lokifiCleanup = typeof __lokifiStopExtras === 'function' ? __lokifiStopExtras : null;
    const run = () => {
      const s = seriesRef.current;
      const chart = chartRef.current;
      if (!s || !chart || candles.length === 0) return;

      // cleanup previous indicator series
      const kill = (key: string) => {
        (window as any)[key] = undefined;
      };
      kill('_bbSeries');
      kill('_vwap');
      kill('_vwma');
      kill('_stdch');
      kill('_rsi');
      kill('_macd');

      // Compute window bounds
      const vr = chart.timeScale().getVisibleRange();
      let view = candles;
      let startIdx = 0;
      let endIdx = candles.length - 1;
      if (vr) {
        const fromSec = timeToSec(vr.from as Time);
        const toSec = timeToSec(vr.to as Time);
        view = sliceByTimeWindow(candles as any, fromSec, toSec) as Candle[];
        if (view.length >= 2) {
          // locate indices by comparing times; since sliceByTimeWindow already clamps, we can map back via time match
          const firstT = timeToSec(view[0].time as Time);
          const lastT = timeToSec(view[view.length - 1].time as Time);
          startIdx = candles.findIndex((c: Candle) => timeToSec(c.time as Time) >= firstT);
          if (startIdx < 0) startIdx = 0;
          endIdx = Math.max(
            startIdx,
            candles.findIndex((c: Candle) => timeToSec(c.time as Time) > lastT) - 1
          );
          if (endIdx < 0) endIdx = candles.length - 1;
        }
      }

      // Pad for period-based indicators so edges look correct
      const pad = Math.max(
        indicatorSettings.bbPeriod,
        indicatorSettings.vwmaPeriod,
        indicatorSettings.stdChannelPeriod,
        indicatorSettings.rsiPeriod,
        indicatorSettings.macdSlowPeriod + indicatorSettings.macdSignalPeriod // MACD needs slowPeriod + signalPeriod
      );
      const paddedStart = Math.max(0, startIdx - pad);
      const paddedEnd = endIdx;
      const slice = candles.slice(paddedStart, paddedEnd + 1);
      const close = slice.map((c: Candle) => c.close);
      const width = ref.current?.clientWidth || 1200;
      const target = Math.floor(width / 2.5);

      // --- Bollinger Bands
      if (indicators.showBB) {
        const bb = bollinger(close, indicatorSettings.bbPeriod, indicatorSettings.bbMult);
        const basis = chart.addLineSeries({ lineStyle: LineStyle.Solid, lineWidth: 1 });
        const upper = chart.addLineSeries({ lineStyle: LineStyle.Solid, lineWidth: 1 });
        const lower = chart.addLineSeries({ lineStyle: LineStyle.Solid, lineWidth: 1 });

        // Map back to original candle times for just the visible window (not the padding)
        const vTimes = candles.slice(startIdx, endIdx + 1).map((c: Candle) => c.time as Time);
        const baseData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: bb.mid[i + (startIdx - paddedStart)] ?? NaN,
        }));
        const upData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: bb.upper[i + (startIdx - paddedStart)] ?? NaN,
        }));
        const loData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: bb.lower[i + (startIdx - paddedStart)] ?? NaN,
        }));

        basis.setData(downsampleLineMinMax(baseData, target));
        upper.setData(downsampleLineMinMax(upData, target));
        lower.setData(downsampleLineMinMax(loData, target));
        if (indicators.bandFill) {
          upper.applyOptions({ priceLineVisible: false });
          lower.applyOptions({ priceLineVisible: false });
        }
        (window as any)._bbSeries = [basis, upper, lower];
      }

      // --- VWAP (respect anchored index; shift relative to padded slice)
      if (indicators.showVWAP) {
        const anchorAbs = indicatorSettings.vwapAnchorIndex ?? 0;
        const anchorRel = Math.max(0, anchorAbs - paddedStart);
        const typical = slice.map((c: Candle) => (c.high + c.low + c.close) / 3);
        const volume = slice.map((c: Candle) => c.volume);
        const v = vwap(typical, volume);
        const vwapLine = chart.addLineSeries({ lineWidth: 2 });
        const vTimes = candles.slice(startIdx, endIdx + 1).map((c: Candle) => c.time as Time);
        const data = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: v[i + (startIdx - paddedStart)] ?? NaN,
        }));
        vwapLine.setData(downsampleLineMinMax(data, target));
        (window as any)._vwap = vwapLine;
      }

      // --- VWMA
      if (indicators.showVWMA) {
        const prices = slice.map((c: Candle) => c.close);
        const volumes = slice.map((c: Candle) => c.volume);
        const vArr = vwma(prices, volumes, indicatorSettings.vwmaPeriod);
        const line = chart.addLineSeries({ lineWidth: 1 });
        const vTimes = candles.slice(startIdx, endIdx + 1).map((c: Candle) => c.time as Time);
        const data = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: vArr[i + (startIdx - paddedStart)] ?? NaN,
        }));
        line.setData(downsampleLineMinMax(data, target));
        (window as any)._vwma = line;
      }

      // --- StdDev Channels
      if (indicators.showStdChannels) {
        const ch = stdDevChannels(
          close,
          indicatorSettings.stdChannelPeriod,
          indicatorSettings.stdChannelMult
        );
        const mid = chart.addLineSeries({ lineWidth: 1 });
        const up = chart.addLineSeries({ lineWidth: 1 });
        const lo = chart.addLineSeries({ lineWidth: 1 });
        const vTimes = candles.slice(startIdx, endIdx + 1).map((c: Candle) => c.time as Time);
        const midData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: ch.mid[i + (startIdx - paddedStart)] ?? NaN,
        }));
        const upData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: ch.upper[i + (startIdx - paddedStart)] ?? NaN,
        }));
        const loData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: ch.lower[i + (startIdx - paddedStart)] ?? NaN,
        }));
        const tgt = target;
        mid.setData(downsampleLineMinMax(midData, tgt));
        up.setData(downsampleLineMinMax(upData, tgt));
        lo.setData(downsampleLineMinMax(loData, tgt));
        (window as any)._stdch = [mid, up, lo];
      }

      // --- RSI (Relative Strength Index)
      if (indicators.showRSI) {
        const rsiValues = calculateRSI(close, indicatorSettings.rsiPeriod);
        const rsiLine = chart.addLineSeries({
          color: 'rgb(255, 152, 0)', // Orange
          lineWidth: 2,
          priceScaleId: 'right',
          title: `RSI(${indicatorSettings.rsiPeriod})`,
        });

        // Add overbought/oversold reference lines
        const overboughtLine = chart.addLineSeries({
          color: 'rgba(255, 0, 0, 0.3)', // Red, semi-transparent
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceScaleId: 'right',
          title: 'Overbought (70)',
        });

        const oversoldLine = chart.addLineSeries({
          color: 'rgba(0, 255, 0, 0.3)', // Green, semi-transparent
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceScaleId: 'right',
          title: 'Oversold (30)',
        });

        // Map RSI values to visible time range
        const vTimes = candles.slice(startIdx, endIdx + 1).map((c: Candle) => c.time as Time);
        const rsiData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: rsiValues[i + (startIdx - paddedStart)] ?? NaN,
        }));

        // Create horizontal lines for overbought/oversold levels
        const overboughtData = vTimes.map((t: Time) => ({ time: t, value: 70 }));
        const oversoldData = vTimes.map((t: Time) => ({ time: t, value: 30 }));

        rsiLine.setData(downsampleLineMinMax(rsiData, target));
        overboughtLine.setData(overboughtData);
        oversoldLine.setData(oversoldData);
        (window as any)._rsi = [rsiLine, overboughtLine, oversoldLine];
      }

      // --- MACD (Moving Average Convergence Divergence)
      if (indicators.showMACD) {
        const macdResult = calculateMACD(
          close,
          indicatorSettings.macdFastPeriod,
          indicatorSettings.macdSlowPeriod,
          indicatorSettings.macdSignalPeriod
        );

        // Create MACD line (blue)
        const macdLine = chart.addLineSeries({
          color: 'rgb(33, 150, 243)', // Blue
          lineWidth: 2,
          priceScaleId: 'right',
          title: `MACD(${indicatorSettings.macdFastPeriod},${indicatorSettings.macdSlowPeriod},${indicatorSettings.macdSignalPeriod})`,
        });

        // Create Signal line (orange)
        const signalLine = chart.addLineSeries({
          color: 'rgb(255, 152, 0)', // Orange
          lineWidth: 2,
          priceScaleId: 'right',
          title: 'Signal',
        });

        // Create Histogram (green/red based on value)
        const histogramSeries = chart.addHistogramSeries({
          priceScaleId: 'right',
          title: 'Histogram',
        });

        // Map MACD values to visible time range
        const vTimes = candles.slice(startIdx, endIdx + 1).map((c: Candle) => c.time as Time);

        // MACD line data
        const macdData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: macdResult.macd[i + (startIdx - paddedStart)] ?? NaN,
        }));

        // Signal line data
        const signalData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: macdResult.signal[i + (startIdx - paddedStart)] ?? NaN,
        }));

        // Histogram data (color based on positive/negative)
        const histogramData = vTimes.map((t: Time, i: number) => {
          const histValue = macdResult.histogram[i + (startIdx - paddedStart)];
          if (histValue === null || histValue === undefined || isNaN(histValue)) {
            return { time: t, value: NaN, color: 'transparent' };
          }
          return {
            time: t,
            value: histValue,
            color: histValue >= 0 ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 82, 82, 0.5)', // Green or Red
          };
        });

        macdLine.setData(downsampleLineMinMax(macdData, target));
        signalLine.setData(downsampleLineMinMax(signalData, target));
        histogramSeries.setData(histogramData); // Don't downsample histogram (loses color info)
        (window as any)._macd = [macdLine, signalLine, histogramSeries];
      }
    };
    // Debounce to avoid thrashing when panning/zooming; re-run when:
    //  - indicators toggled
    //  - indicator settings changed
    //  - candle set changed
    //  - visible range changed (rangeTick)
    debounce(run, 60)();
  }, [indicators, indicatorSettings, candles, rangeTick]);

  /** ========== Dynamic LOD for price/volume on zoom/pan ========== */
  const recomputeLOD = React.useCallback(() => {
    const s = seriesRef.current;
    const v = volRef.current;
    const chart = chartRef.current;
    if (!s || !v || !chart) return;
    const all = candles;
    if (!all.length) return;

    const width = ref.current?.clientWidth || 1200;
    const target = bucketCountFor(width, 2.5);

    const vr = chart.timeScale().getVisibleRange();
    let view: Candle[];
    if (!vr) {
      view = all;
    } else {
      const fromSec = timeToSec(vr.from as Time);
      const toSec = timeToSec(vr.to as Time);
      // Convert Time to number for indicator processing
      const allWithNumTime = all.map((c: Candle) => ({
        ...c,
        time:
          typeof c.time === 'number'
            ? c.time
            : typeof c.time === 'string'
              ? new Date(c.time).getTime() / 1000
              : typeof c.time === 'object' &&
                  c.time &&
                  'timestamp' in (c.time as { timestamp?: number })
                ? (c.time as { timestamp: number }).timestamp
                : new Date(String(c.time)).getTime() / 1000,
      }));
      view = sliceByTimeWindow(
        allWithNumTime as unknown as import('@/utils/lod').Candle[],
        fromSec,
        toSec
      ) as unknown as Candle[];
      if (view.length < 2) view = all;
    }

    const ds = downsampleCandlesMinMax(view as CandleLW[], target);
    s.setData(ds);
    v.setData(ds.map((c: CandleLW) => ({ time: c.time as Time, value: c.volume })));
  }, [candles]);

  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden">
      <div ref={ref} className="absolute inset-0" />
      <SymbolTfBar />
      <DataStatus provider={provider} symbol={symbol} timeframe={timeframe} />
    </div>
  );
}
