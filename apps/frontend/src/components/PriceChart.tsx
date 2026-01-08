import DataStatus from '@/components/DataStatus';
import SymbolTfBar from '@/components/SymbolTfBar';
import { setChart } from '@/lib/charts/chartBus';
import { stdDevChannels, vwap, vwma, type Candle as IndCandle } from '@/lib/charts/indicators';
import {
  MarketDataAdapter,
  type Candle as AdapterCandle,
  type ProviderKind,
} from '@/lib/data/adapter';
import useHotkeys from '@/lib/utils/hotkeys';
import { debounce, rafThrottle } from '@/lib/utils/perf';
import { calculateADLine } from '@/services/indicators/ad-line';
import { calculateADX } from '@/services/indicators/adx';
import { calculateBollingerBands } from '@/services/indicators/bollinger';
import { calculateCCI } from '@/services/indicators/cci';
import { calculateMACD } from '@/services/indicators/macd';
import { calculateOBV } from '@/services/indicators/obv';
import { calculateRSI } from '@/services/indicators/rsi';
import { calculateStochastic } from '@/services/indicators/stochastic';
import { calculateWilliamsR } from '@/services/indicators/williams-r';
import { useChartStore } from '@/state/store';
import type { IChartApi, ISeriesApi, ITimeScaleApi, Time } from 'lightweight-charts';
import {
  CandlestickSeries,
  createChart,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type TimeRangeChangeEventHandler,
} from 'lightweight-charts';
import React from 'react';

// lightweight-charts Series interface extension (chart() method is internal but available)
interface ISeriesApiWithChart<
  T extends 'Candlestick' | 'Line' | 'Histogram',
> extends ISeriesApi<T> {
  chart(): IChartApi;
}

// Window extension for indicator series cleanup (runtime-assigned properties)
interface WindowWithIndicators extends Window {
  _bbSeries?: ISeriesApi<'Line'>[];
  _vwap?: ISeriesApi<'Line'>;
  _vwma?: ISeriesApi<'Line'>;
  _stdch?: ISeriesApi<'Line'>[];
  _rsi?: ISeriesApi<'Line'>[];
  _macd?: (ISeriesApi<'Line'> | ISeriesApi<'Histogram'>)[];
  _stochastic?: ISeriesApi<'Line'>[];
  _adx?: ISeriesApi<'Line'>[];
  _cci?: ISeriesApi<'Line'>[];
  _williamsR?: ISeriesApi<'Line'>[];
  _obv?: ISeriesApi<'Line'>[];
  _adLine?: ISeriesApi<'Line'>[];
}

// Union type for indicator keys only (not native Window properties)
type IndicatorKey =
  | '_bbSeries'
  | '_vwap'
  | '_vwma'
  | '_stdch'
  | '_rsi'
  | '_macd'
  | '_stochastic'
  | '_adx'
  | '_cci'
  | '_williamsR'
  | '_obv'
  | '_adLine';

import {
  bucketCountFor,
  downsampleCandlesMinMax,
  downsampleLineMinMax,
  sliceByTimeWindow,
  timeToSec,
  type Candle as LodCandle,
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
  const [provider] = React.useState<ProviderKind>(
    (process.env.NEXT_PUBLIC_DATA_PROVIDER as ProviderKind) || 'mock'
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
    // lightweight-charts v5 API
    const series = chart.addSeries(CandlestickSeries);
    seriesRef.current = series;
    const vol = chart.addSeries(HistogramSeries, { priceScaleId: 'left' });
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
     
  }, [ref, resizeCallback]);

  const bumpRangeTick = React.useCallback(() => setRangeTick((t: number) => (t + 1) | 0), []);

  // attach data adapter
  React.useEffect(() => {
    // Lokifi Phase U: ensure extras are stopped on unmount
    const __lokifiCleanup = typeof __lokifiStopExtras === 'function' ? __lokifiStopExtras : null;
    const adapter = new MarketDataAdapter({ provider, symbol, timeframe });
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
        // Cast series to extended interface that exposes chart() method
        const sWithChart = s as ISeriesApiWithChart<'Candlestick'>;
        setChart({ chart: sWithChart.chart(), series: s, candles: ev.candles as Candle[] });
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
      const windowExt = window as WindowWithIndicators;
      const kill = (key: IndicatorKey) => {
        windowExt[key] = undefined;
      };
      kill('_bbSeries');
      kill('_vwap');
      kill('_vwma');
      kill('_stdch');
      kill('_rsi');
      kill('_macd');
      kill('_stochastic');
      kill('_adx');
      kill('_cci');
      kill('_williamsR');
      kill('_obv');
      kill('_adLine');

      // Compute window bounds
      const vr = chart.timeScale().getVisibleRange();
      let view = candles;
      let startIdx = 0;
      let endIdx = candles.length - 1;
      if (vr) {
        const fromSec = timeToSec(vr.from as Time);
        const toSec = timeToSec(vr.to as Time);
        // Cast Candle to LodCandle (compatible types: both have time, open, high, low, close, volume)
        view = sliceByTimeWindow(candles as LodCandle[], fromSec, toSec) as Candle[];
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
      const high = slice.map((c: Candle) => c.high);
      const low = slice.map((c: Candle) => c.low);
      const open = slice.map((c: Candle) => c.open);
      const width = ref.current?.clientWidth || 1200;
      const target = Math.floor(width / 2.5);

      // --- Bollinger Bands
      if (indicators.showBB) {
        const bbData = calculateBollingerBands(
          close,
          indicatorSettings.bbPeriod,
          indicatorSettings.bbMult
        );

        const basis = chart.addSeries(LineSeries, {
          color: 'rgb(255, 152, 0)', // Orange (middle band)
          lineStyle: LineStyle.Solid,
          lineWidth: 2,
          priceScaleId: 'right',
          title: `BB Mid(${indicatorSettings.bbPeriod},${indicatorSettings.bbMult})`,
        });
        const upper = chart.addSeries(LineSeries, {
          color: 'rgb(33, 150, 243)', // Blue (upper band)
          lineStyle: LineStyle.Solid,
          lineWidth: 1,
          priceScaleId: 'right',
          title: 'BB Upper',
        });
        const lower = chart.addSeries(LineSeries, {
          color: 'rgb(33, 150, 243)', // Blue (lower band)
          lineStyle: LineStyle.Solid,
          lineWidth: 1,
          priceScaleId: 'right',
          title: 'BB Lower',
        });

        // Map back to original candle times for just the visible window (not the padding)
        const vTimes = candles.slice(startIdx, endIdx + 1).map((c: Candle) => c.time as Time);
        const baseData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: bbData[i + (startIdx - paddedStart)]?.middle ?? NaN,
        }));
        const upData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: bbData[i + (startIdx - paddedStart)]?.upper ?? NaN,
        }));
        const loData = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: bbData[i + (startIdx - paddedStart)]?.lower ?? NaN,
        }));

        basis.setData(downsampleLineMinMax(baseData, target));
        upper.setData(downsampleLineMinMax(upData, target));
        lower.setData(downsampleLineMinMax(loData, target));
        if (indicators.bandFill) {
          upper.applyOptions({ priceLineVisible: false });
          lower.applyOptions({ priceLineVisible: false });
        }
        windowExt._bbSeries = [basis, upper, lower];
      }

      // --- VWAP (respect anchored index; shift relative to padded slice)
      if (indicators.showVWAP) {
        const anchorAbs = indicatorSettings.vwapAnchorIndex ?? 0;
        const _anchorRel = Math.max(0, anchorAbs - paddedStart);
        const typical = slice.map((c: Candle) => (c.high + c.low + c.close) / 3);
        const volume = slice.map((c: Candle) => c.volume);
        const v = vwap(typical, volume);
        const vwapLine = chart.addSeries(LineSeries, { lineWidth: 2 });
        const vTimes = candles.slice(startIdx, endIdx + 1).map((c: Candle) => c.time as Time);
        const data = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: v[i + (startIdx - paddedStart)] ?? NaN,
        }));
        vwapLine.setData(downsampleLineMinMax(data, target));
        windowExt._vwap = vwapLine;
      }

      // --- VWMA
      if (indicators.showVWMA) {
        const prices = slice.map((c: Candle) => c.close);
        const volumes = slice.map((c: Candle) => c.volume);
        const vArr = vwma(prices, volumes, indicatorSettings.vwmaPeriod);
        const line = chart.addSeries(LineSeries, { lineWidth: 1 });
        const vTimes = candles.slice(startIdx, endIdx + 1).map((c: Candle) => c.time as Time);
        const data = vTimes.map((t: Time, i: number) => ({
          time: t,
          value: vArr[i + (startIdx - paddedStart)] ?? NaN,
        }));
        line.setData(downsampleLineMinMax(data, target));
        windowExt._vwma = line;
      }

      // --- StdDev Channels
      if (indicators.showStdChannels) {
        const ch = stdDevChannels(
          close,
          indicatorSettings.stdChannelPeriod,
          indicatorSettings.stdChannelMult
        );
        const mid = chart.addSeries(LineSeries, { lineWidth: 1 });
        const up = chart.addSeries(LineSeries, { lineWidth: 1 });
        const lo = chart.addSeries(LineSeries, { lineWidth: 1 });
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
        windowExt._stdch = [mid, up, lo];
      }

      // --- RSI (Relative Strength Index)
      if (indicators.showRSI) {
        const rsiValues = calculateRSI(close, indicatorSettings.rsiPeriod);
        const rsiLine = chart.addSeries(LineSeries, {
          color: 'rgb(255, 152, 0)', // Orange
          lineWidth: 2,
          priceScaleId: 'right',
          title: `RSI(${indicatorSettings.rsiPeriod})`,
        });

        // Add overbought/oversold reference lines
        const overboughtLine = chart.addSeries(LineSeries, {
          color: 'rgba(255, 0, 0, 0.3)', // Red, semi-transparent
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceScaleId: 'right',
          title: 'Overbought (70)',
        });

        const oversoldLine = chart.addSeries(LineSeries, {
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
        windowExt._rsi = [rsiLine, overboughtLine, oversoldLine];
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
        const macdLine = chart.addSeries(LineSeries, {
          color: 'rgb(33, 150, 243)', // Blue
          lineWidth: 2,
          priceScaleId: 'right',
          title: `MACD(${indicatorSettings.macdFastPeriod},${indicatorSettings.macdSlowPeriod},${indicatorSettings.macdSignalPeriod})`,
        });

        // Create Signal line (orange)
        const signalLine = chart.addSeries(LineSeries, {
          color: 'rgb(255, 152, 0)', // Orange
          lineWidth: 2,
          priceScaleId: 'right',
          title: 'Signal',
        });

        // Create Histogram (green/red based on value)
        const histogramSeries = chart.addSeries(HistogramSeries, {
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
        windowExt._macd = [macdLine, signalLine, histogramSeries];
      }

      // --- Stochastic Oscillator
      if (indicators.showStochastic) {
        const stochasticResult = calculateStochastic(
          high.map((h: number, i: number) => ({
            time: candles[i + paddedStart].time,
            close: close[i],
            high: h,
            low: low[i],
          })),
          indicatorSettings.stochasticKPeriod,
          indicatorSettings.stochasticDPeriod
        );

        // Create %K line (blue)
        const kLine = chart.addSeries(LineSeries, {
          color: 'rgb(33, 150, 243)', // Blue
          lineWidth: 2,
          priceScaleId: 'right',
          title: `%K(${indicatorSettings.stochasticKPeriod})`,
        });

        // Create %D line (orange)
        const dLine = chart.addSeries(LineSeries, {
          color: 'rgb(255, 152, 0)', // Orange
          lineWidth: 2,
          priceScaleId: 'right',
          title: `%D(${indicatorSettings.stochasticDPeriod})`,
        });

        // Map Stochastic values
        const kData = stochasticResult.map((s) => ({
          time: s.time as Time,
          value: s.k,
        }));

        const dData = stochasticResult.map((s) => ({
          time: s.time as Time,
          value: s.d,
        }));

        kLine.setData(downsampleLineMinMax(kData, target));
        dLine.setData(downsampleLineMinMax(dData, target));
        windowExt._stochastic = [kLine, dLine];
      }

      // --- ADX (Average Directional Index)
      if (indicators.showADX) {
        const adxResult = calculateADX(
          high.map((h: number, i: number) => ({
            time: candles[i + paddedStart].time,
            open: open[i],
            close: close[i],
            high: h,
            low: low[i],
          })),
          indicatorSettings.adxPeriod
        );

        // Create ADX line (purple/magenta)
        const adxLine = chart.addSeries(LineSeries, {
          color: 'rgb(156, 39, 176)', // Purple
          lineWidth: 2,
          priceScaleId: 'right',
          title: `ADX(${indicatorSettings.adxPeriod})`,
        });

        // Map ADX values
        const adxData = adxResult.map((a) => ({
          time: a.time as Time,
          value: a.adx,
        }));

        adxLine.setData(downsampleLineMinMax(adxData, target));
        windowExt._adx = [adxLine];
      }

      // --- CCI (Commodity Channel Index)
      if (indicators.showCCI) {
        const cciResult = calculateCCI(
          high.map((h: number, i: number) => ({
            time: candles[i + paddedStart].time,
            open: open[i],
            close: close[i],
            high: h,
            low: low[i],
          })),
          indicatorSettings.cciPeriod
        );

        // Create CCI line (purple)
        const cciLine = chart.addSeries(LineSeries, {
          color: 'rgb(138, 43, 226)', // Blue Violet
          lineWidth: 2,
          priceScaleId: 'right',
          title: `CCI(${indicatorSettings.cciPeriod})`,
        });

        // Map CCI values
        const cciData = cciResult.map((c) => ({
          time: c.time as Time,
          value: c.cci,
        }));

        cciLine.setData(downsampleLineMinMax(cciData, target));
        windowExt._cci = [cciLine];
      }

      // --- Williams %R
      if (indicators.showWilliamsR) {
        const williamsRResult = calculateWilliamsR(
          high.map((h: number, i: number) => ({
            time: candles[i + paddedStart].time,
            close: close[i],
            high: h,
            low: low[i],
          })),
          indicatorSettings.williamsRPeriod
        );

        // Create Williams %R line (purple)
        const williamsRLine = chart.addSeries(LineSeries, {
          color: 'rgb(147, 51, 234)', // Purple
          lineWidth: 2,
          priceScaleId: 'right',
          title: `Williams %R(${indicatorSettings.williamsRPeriod})`,
        });

        // Map Williams %R values
        const williamsRData = williamsRResult.map((w) => ({
          time: w.time as Time,
          value: w.value,
        }));

        williamsRLine.setData(downsampleLineMinMax(williamsRData, target));
        windowExt._williamsR = [williamsRLine];
      }

      // --- OBV (On-Balance Volume)
      if (indicators.showOBV) {
        const volume = slice.map((c: Candle) => c.volume ?? 0);
        const obvResult = calculateOBV(
          high.map((h: number, i: number) => ({
            time: candles[i + paddedStart].time,
            open: open[i],
            high: h,
            low: low[i],
            close: close[i],
            volume: volume[i],
          }))
        );

        // Create OBV line (teal/cyan)
        const obvLine = chart.addSeries(LineSeries, {
          color: 'rgb(6, 182, 212)', // Teal/Cyan
          lineWidth: 2,
          priceScaleId: 'right',
          title: 'OBV',
        });

        // Map OBV values
        const obvData = obvResult.map((obv) => ({
          time: obv.time as Time,
          value: obv.value,
        }));

        obvLine.setData(downsampleLineMinMax(obvData, target));
        windowExt._obv = [obvLine];
      }

      // --- A/D Line (Accumulation/Distribution)
      if (indicators.showADLine) {
        const volume = slice.map((c: Candle) => c.volume ?? 0);
        const adLineResult = calculateADLine(
          high.map((h: number, i: number) => ({
            time: candles[i + paddedStart].time,
            open: open[i],
            high: h,
            low: low[i],
            close: close[i],
            volume: volume[i],
          }))
        );

        // Create A/D Line (indigo)
        const adLine = chart.addSeries(LineSeries, {
          color: 'rgb(99, 102, 241)', // Indigo
          lineWidth: 2,
          priceScaleId: 'right',
          title: 'A/D Line',
        });

        // Map A/D Line values
        const adLineData = adLineResult.map((ad) => ({
          time: ad.time as Time,
          value: ad.value,
        }));

        adLine.setData(downsampleLineMinMax(adLineData, target));
        windowExt._adLine = [adLine];
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
        allWithNumTime as unknown as LodCandle[],
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

