'use client';
import { ChartErrorBoundary } from '@/components/ChartErrorBoundary';
import { ChartLoadingState } from '@/components/ChartLoadingState';
import ChartSidebar from '@/components/ChartSidebar';
import { API } from '@/lib/api';
import { drawStore } from '@/lib/drawStore';
import { indicatorStore } from '@/lib/indicatorStore';
import { bollinger, ema, macd, rsi, stddevChannels, vwap, vwma } from '@/lib/indicators';
import { symbolStore } from '@/lib/symbolStore';
import { timeframeStore } from '@/lib/timeframeStore';
import type { OHLCResponse } from '@/lib/types';
import { pluginManager } from '@/plugins/registry';
import { ColorType, createChart, IChartApi, Time } from 'lightweight-charts';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';

// Constants
const CHART_HEIGHT = 520;
const SUB_CHART_HEIGHT = 180;
const MIN_CHART_WIDTH = 400;

// Helper functions
function tfToSeconds(tf: string): number {
  const n = parseInt(tf, 10);
  if (Number.isFinite(n)) {
    if (tf.endsWith('m')) return n * 60;
    if (tf.endsWith('h')) return n * 3600;
    if (tf.endsWith('d')) return n * 86400;
    if (tf.endsWith('w')) return n * 604800;
  }
  return (Number.isFinite(n) ? n : 1) * 60;
}

function hexToRGBA(hex: string, a: number) {
  const m = hex.replace('#', '');
  const bigint = parseInt(
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

// Normalize timestamp to epoch seconds (not milliseconds)
function normalizeTimestamp(ts: number): number {
  // If timestamp is in milliseconds, convert to seconds
  return ts > 1e10 ? Math.floor(ts / 1000) : ts;
}

interface ChartPanelProps {
  symbol?: string;
  timeframe?: string;
}

function ChartPanelCore({ symbol: propSymbol, timeframe: propTimeframe }: ChartPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const subChartContainerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const subChartRef = useRef<IChartApi | null>(null);
  const [mounted, setMounted] = useState(false);
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: CHART_HEIGHT });

  // State management
  const [inds, setInds] = useState(indicatorStore.get());
  const params = inds.params;
  const style = inds.style;

  const [sym, setSym] = useState(propSymbol || symbolStore.get());
  const [tf, setTf] = useState(propTimeframe || timeframeStore.get());

  // SSR guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe to store changes
  useEffect(() => {
    const unsubIndicators = indicatorStore.subscribe((st) => setInds(st));
    const unsubSymbol = symbolStore.subscribe((s) => {
      setSym(s);
      indicatorStore.loadForSymbol(s);
      drawStore.loadCurrent();
    });
    const unsubTimeframe = timeframeStore.subscribe((t) => {
      setTf(t);
      drawStore.loadCurrent();
    });

    return () => {
      unsubIndicators();
      unsubSymbol();
      unsubTimeframe();
    };
  }, []);

  // Data fetching with error handling
  const { data, error, isLoading, mutate } = useSWR<OHLCResponse>(
    mounted ? `${API}/ohlc?symbol=${sym}&timeframe=${tf}&limit=500` : null,
    {
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      revalidateOnFocus: false,
    }
  );

  // Mock data fallback for development
  const mockData = React.useMemo(
    () => ({
      symbol: sym,
      timeframe: tf,
      candles: Array.from({ length: 100 }, (_, i) => {
        const time = Math.floor(Date.now() / 1000) - (100 - i) * tfToSeconds(tf);
        const price = 50000 + Math.sin(i / 10) * 2000 + (Math.random() - 0.5) * 1000;
        return {
          ts: time, // Already in epoch seconds
          o: price,
          h: price + Math.random() * 500,
          l: price - Math.random() * 500,
          c: price + (Math.random() - 0.5) * 400,
          v: Math.random() * 1000,
        };
      }),
    }),
    [sym, tf]
  );

  // Use real data if available, otherwise fallback to mock
  const chartData = data || mockData;

  // Resize handler
  const handleResize = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const { clientWidth, clientHeight } = container;
    const width = Math.max(clientWidth, MIN_CHART_WIDTH);
    const height = Math.max(clientHeight, CHART_HEIGHT);

    setChartDimensions({ width, height });

    if (chartRef.current) {
      chartRef.current.applyOptions({ width, height });
    }
    if (subChartRef.current) {
      subChartRef.current.applyOptions({ width });
    }

    // Resize overlay canvas
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      canvas.width = width * (window.devicePixelRatio || 1);
      canvas.height = height * (window.devicePixelRatio || 1);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
  }, []);

  // Setup ResizeObserver
  useEffect(() => {
    if (!mounted || !chartContainerRef.current) return;

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(chartContainerRef.current);

    // Initial resize
    handleResize();

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [mounted, handleResize]);

  // Chart creation and setup
  useEffect(() => {
    if (!mounted || !chartContainerRef.current || !chartData?.candles?.length) return;

    const container = chartContainerRef.current;
    const hasSubIndicators = inds.rsi || inds.macd;
    const mainHeight = hasSubIndicators ? CHART_HEIGHT - SUB_CHART_HEIGHT : CHART_HEIGHT;

    // Create main chart
    const chart = createChart(container, {
      width: chartDimensions.width,
      height: mainHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#e5e7eb',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      rightPriceScale: {
        borderColor: '#374151',
        visible: true, // Ensure price scale is visible
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00ff88',
      downColor: '#ff4444',
      borderDownColor: '#ff4444',
      borderUpColor: '#00ff88',
      wickDownColor: '#ff4444',
      wickUpColor: '#00ff88',
    });

    // Normalize and set candlestick data
    const normalizedCandles = chartData.candles.map((c) => ({
      time: normalizeTimestamp(c.ts) as Time,
      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
    }));

    // Ensure timestamps are monotonic
    const sortedCandles = normalizedCandles.sort((a, b) => Number(a.time) - Number(b.time));
    candleSeries.setData(sortedCandles);

    // Prepare indicator data
    const closes = chartData.candles.map((c) => c.c);
    const highs = chartData.candles.map((c) => c.h);
    const lows = chartData.candles.map((c) => c.l);
    const vols = chartData.candles.map((c) => c.v ?? 0);

    // Helper to add line series
    const addLineSeries = (values: (number | null)[], color: string, width = 2) => {
      if (!values) return null;
      const lineSeries = chart.addLineSeries({
        color,
        lineWidth: width,
      });
      const lineData = values.map((value, i) => ({
        time: sortedCandles[i].time,
        value: value ?? NaN,
      }));
      lineSeries.setData(lineData);
      return lineSeries;
    };

    // Add indicators to main chart
    if (inds.ema20) addLineSeries(ema(closes, 20), '#ff6b35', 2);
    if (inds.ema50) addLineSeries(ema(closes, 50), '#4ecdc4', 2);

    // Bollinger Bands
    if (inds.bband) {
      const bb = bollinger(closes, params.bbPeriod ?? 20, params.bbMult ?? 2);
      addLineSeries(bb.mid, '#999999', 1);
      addLineSeries(bb.upper, '#666666', 1);
      addLineSeries(bb.lower, '#666666', 1);

      if (inds.bbFill) {
        const upperArea = chart.addAreaSeries({
          lineWidth: 0,
          topColor: hexToRGBA(style.bbFillColor, style.bbFillOpacity),
          bottomColor: hexToRGBA(style.bbFillColor, style.bbFillOpacity),
        });
        upperArea.setData(
          bb.upper.map((value, i) => ({
            time: sortedCandles[i].time,
            value: value ?? NaN,
          }))
        );
      }
    }

    // VWAP
    if (inds.vwap) {
      const typical = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
      const hasVolume = vols.some((v) => v && v > 0);
      const vwapValues = hasVolume ? vwap(typical, vols) : ema(typical, 20);
      addLineSeries(vwapValues, '#ffaa00', 2);
    }

    // VWMA
    if (inds.vwma) {
      const hasVolume = vols.some((v) => v && v > 0);
      const vwmaValues = hasVolume
        ? vwma(closes, vols, params.vwmaPeriod ?? 20)
        : ema(closes, params.vwmaPeriod ?? 20);
      addLineSeries(vwmaValues, '#aa00ff', 2);
    }

    // Standard Deviation Channels
    if (inds.stddev) {
      const sd = stddevChannels(closes, params.stddevPeriod ?? 20, params.stddevMult ?? 2);
      addLineSeries(sd.mid, '#00aaff', 1);
      addLineSeries(sd.upper, '#0088cc', 1);
      addLineSeries(sd.lower, '#0088cc', 1);
    }

    chartRef.current = chart;

    // Create sub-chart for RSI/MACD
    if (hasSubIndicators && subChartContainerRef.current) {
      const subChart = createChart(subChartContainerRef.current, {
        width: chartDimensions.width,
        height: SUB_CHART_HEIGHT,
        layout: {
          background: { type: ColorType.Solid, color: '#0a0a0a' },
          textColor: '#e5e7eb',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        rightPriceScale: {
          borderColor: '#374151',
          visible: true,
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // RSI
      if (inds.rsi) {
        const rsiValues = rsi(closes, 14);
        const rsiSeries = subChart.addLineSeries({
          color: '#ff6b35',
          lineWidth: 2,
        });
        rsiSeries.setData(
          rsiValues.map((value, i) => ({
            time: sortedCandles[i].time,
            value: value ?? NaN,
          }))
        );

        // Add RSI levels
        const rsiLevelSeries = subChart.addLineSeries({
          color: '#666666',
          lineWidth: 1,
          lineStyle: 2, // Dashed
        });
        rsiLevelSeries.setData([
          { time: sortedCandles[0].time, value: 70 },
          { time: sortedCandles[sortedCandles.length - 1].time, value: 70 },
        ]);
      }

      // MACD
      if (inds.macd) {
        const macdData = macd(closes, 12, 26, 9);

        // MACD histogram
        const macdHistSeries = subChart.addHistogramSeries({
          color: '#4ecdc4',
        });
        macdHistSeries.setData(
          macdData.hist.map((value, i) => ({
            time: sortedCandles[i].time,
            value: value ?? NaN,
          }))
        );

        // MACD signal line
        const signalSeries = subChart.addLineSeries({
          color: '#ff4444',
          lineWidth: 2,
        });
        signalSeries.setData(
          macdData.signalLine.map((value, i) => ({
            time: sortedCandles[i].time,
            value: value ?? NaN,
          }))
        );
      }

      // Sync time scales
      chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (range) subChart.timeScale().setVisibleRange(range);
      });
      subChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (range) chart.timeScale().setVisibleRange(range);
      });

      subChartRef.current = subChart;
    }

    // Setup plugin environment
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const nearestSnap = (t: number, p: number) => {
        if (!drawStore.get().snap) return { t, p };
        // Implement snap logic here
        return { t, p };
      };

      pluginManager.setEnv({ chart, candle: candleSeries, canvas, snap: nearestSnap });
    }

    // Global chart references for external access
    (window as any).__fynixChart = chart;
    (window as any).__fynixCandle = candleSeries;

    // Cleanup
    return () => {
      chart.remove();
      if (subChartRef.current) {
        subChartRef.current.remove();
        subChartRef.current = null;
      }
      chartRef.current = null;
    };
  }, [mounted, chartData, inds, chartDimensions, params, style]);

  // Plugin symbol settings binding
  useEffect(() => {
    const pss: any = (globalThis as any).pluginSettingsStore;
    const pssym: any = (globalThis as any).pluginSymbolSettings;

    (window as any).__fynixApplySymbolSettings = () => {
      try {
        const s = pss?.get?.();
        if (!s || !pssym?.set) return;
        pssym.set(sym, tf, {
          channelDefaultWidthPct: s.channelDefaultWidthPct,
          channelWidthMode: s.channelWidthMode,
          fibPreset: s.fibPreset,
          fibCustomLevels: s.fibCustomLevels,
        });
      } catch (e) {
        console.warn('Failed to apply symbol settings:', e);
      }
    };

    (window as any).__fynixClearSymbolSettings = () => {
      try {
        pssym?.clear?.(sym, tf);
      } catch (e) {
        console.warn('Failed to clear symbol settings:', e);
      }
    };

    return () => {
      delete (window as any).__fynixApplySymbolSettings;
      delete (window as any).__fynixClearSymbolSettings;
    };
  }, [sym, tf]);

  // Show loading state during SSR or data loading
  if (!mounted) {
    return <ChartLoadingState symbol={sym} timeframe={tf} message="Initializing chart..." />;
  }

  if (isLoading && !data && !chartData) {
    return <ChartLoadingState symbol={sym} timeframe={tf} />;
  }

  if (error && !chartData) {
    return (
      <ChartErrorBoundary onRetry={() => mutate()}>
        <div className="flex flex-col items-center justify-center h-96 bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <p className="text-red-400 mb-4">Failed to load chart data: {error.message}</p>
          <button
            onClick={() => mutate()}
            className="px-4 py-2 bg-electric/20 border border-electric rounded-xl hover:bg-electric/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </ChartErrorBoundary>
    );
  }

  return (
    <div
      className="w-full rounded-2xl border border-neutral-800 relative"
      data-testid="chart-container"
    >
      <ChartSidebar />
      <div
        ref={chartContainerRef}
        data-testid="chart-main"
        style={{
          height: `${inds.rsi || inds.macd ? CHART_HEIGHT - SUB_CHART_HEIGHT : CHART_HEIGHT}px`,
          minWidth: `${MIN_CHART_WIDTH}px`,
        }}
      />
      <canvas
        ref={overlayCanvasRef}
        className="absolute top-0 left-0 z-10 pointer-events-none"
        data-testid="chart-overlay"
        style={{
          pointerEvents:
            drawStore.get().tool === 'cursor' && !pluginManager.hasActiveTool() ? 'none' : 'auto',
        }}
      />
      {(inds.rsi || inds.macd) && (
        <div
          ref={subChartContainerRef}
          className="border-t border-neutral-800"
          data-testid="chart-sub"
          style={{ height: `${SUB_CHART_HEIGHT}px` }}
        />
      )}
    </div>
  );
}

// Dynamic import to prevent SSR issues
const ChartPanel = dynamic(
  () =>
    Promise.resolve(
      React.memo(function ChartPanelWrapper(props: ChartPanelProps) {
        return (
          <ChartErrorBoundary>
            <ChartPanelCore {...props} />
          </ChartErrorBoundary>
        );
      })
    ),
  {
    ssr: false,
    loading: () => <ChartLoadingState message="Loading chart component..." />,
  }
);

export default ChartPanel;
