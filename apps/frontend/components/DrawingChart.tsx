'use client';
import type { Point } from '@/lib/stores/drawingStore';
import { useDrawingStore } from '@/lib/stores/drawingStore';
import { usePaneStore } from '@/lib/stores/paneStore';
import { symbolStore } from '@/lib/stores/symbolStore';
import { timeframeStore } from '@/lib/stores/timeframeStore';
import type { BarData, IChartApi, ISeriesApi, Time, UTCTimestamp } from 'lightweight-charts';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { ChartLoadingState } from './ChartLoadingState';
import { DrawingOverlay } from './DrawingOverlay';

// Chart component with proper hook usage
const ChartContainer = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: unknown;
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={chartContainerRef} {...props}>
      {children}
    </div>
  );
};

// Dynamic import with loading state
const _Chart = dynamic(
  () =>
    import('lightweight-charts').then(() => ({
      default: ChartContainer,
    })),
  {
    ssr: false,
    loading: () => <ChartLoadingState />,
  }
);

interface DrawingPaneComponentProps {
  paneId: string;
  height: number;
  isVisible: boolean;
  isLocked: boolean;
  indicators: string[];
  onHeightChange: (paneId: string, height: number) => void;
}

const DrawingPaneComponent: React.FC<DrawingPaneComponentProps> = ({
  paneId,
  height,
  isVisible,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Subscribe to symbol and timeframe stores reactively
  const symbol = useSyncExternalStore(symbolStore.subscribe, symbolStore.get, symbolStore.get);
  const timeframe = useSyncExternalStore(
    timeframeStore.subscribe,
    timeframeStore.get,
    timeframeStore.get
  );
  const {
    activeTool,
    isDrawing,
    currentDrawing,
    startDrawing,
    updateCurrentDrawingPoint,
    finishDrawing,
  } = useDrawingStore();

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [chartData, setChartData] = useState<BarData[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);

  // Fetch OHLC data from real API endpoint
  useEffect(() => {
    const fetchOHLCData = async () => {
      try {
        setIsLoading(true);
        // Use the real OHLC endpoint which fetches from Yahoo Finance (free, no API key needed)
        // Use NEXT_PUBLIC_API_BASE (without version) since ohlc endpoint is at /api/ohlc
        // Request 500 candles for better history (about 3 weeks of hourly data, or 2 years of daily)
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';
        const url = `${apiBase}/ohlc?symbol=${symbol}&timeframe=${timeframe}&limit=500`;
        console.log('[DrawingChart] Fetching OHLC data from:', url);
        const response = await fetch(url);

        if (!response.ok) {
          console.error(
            '[DrawingChart] API response not ok:',
            response.status,
            response.statusText
          );
          throw new Error('Failed to fetch OHLC data');
        }

        const result = await response.json();
        console.log(
          '[DrawingChart] Received',
          result.candles?.length,
          'candles, first price:',
          result.candles?.[0]?.c
        );
        const transformedData: BarData[] = result.candles.map(
          (candle: { ts: number; o: number; h: number; l: number; c: number }) => ({
            time: Math.floor(candle.ts / 1000) as UTCTimestamp,
            open: candle.o,
            high: candle.h,
            low: candle.l,
            close: candle.c,
          })
        );

        setChartData(transformedData);
      } catch (error) {
        console.error('Failed to fetch OHLC data:', error);
        setChartData([
          { time: '2024-01-01', open: 100, high: 110, low: 95, close: 105 },
          { time: '2024-01-02', open: 105, high: 115, low: 100, close: 108 },
          { time: '2024-01-03', open: 108, high: 112, low: 102, close: 110 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOHLCData();
  }, [symbol, timeframe]);

  // Initialize chart
  const initializeChart = useCallback(async () => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    try {
      const { createChart } = await import('lightweight-charts');

      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: height,
        layout: {
          background: { color: '#131722' },
          textColor: '#787b86',
        },
        grid: {
          vertLines: { color: '#1e222d' },
          horzLines: { color: '#1e222d' },
        },
        crosshair: {
          mode: 0,
          vertLine: {
            color: '#2962ff',
            width: 1,
            style: 2,
            labelBackgroundColor: '#2962ff',
          },
          horzLine: {
            color: '#2962ff',
            width: 1,
            style: 2,
            labelBackgroundColor: '#2962ff',
          },
        },
        rightPriceScale: { borderColor: '#2a2e39' },
        timeScale: {
          borderColor: '#2a2e39',
          timeVisible: true,
          secondsVisible: false,
        },
        // Explicitly enable scroll and scale interactions by default (cursor tool is default)
        handleScroll: true,
        handleScale: true,
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      candlestickSeries.setData(chartData);

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;

      // Setup ResizeObserver
      if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
        resizeObserverRef.current = new ResizeObserver(() => {
          if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
              height: height,
            });
          }
        });
        resizeObserverRef.current.observe(chartContainerRef.current);
      }
    } catch (error) {
      console.error('Failed to initialize chart:', error);
      throw error;
    }
  }, [height, chartData]);

  // Disable chart interactions when drawing tool is active
  // Also re-apply when chart becomes ready (after timeframe change)
  useEffect(() => {
    if (!chartRef.current || !chartReady) return;
    const shouldDisableInteractions = activeTool !== 'cursor';
    chartRef.current.applyOptions({
      handleScroll: !shouldDisableInteractions,
      handleScale: !shouldDisableInteractions,
    });
  }, [activeTool, chartReady]);

  // Convert mouse event to price/time coordinates
  const getChartCoordinates = useCallback(
    (e: React.MouseEvent): { time: Time; price: number } | null => {
      if (!chartRef.current || !seriesRef.current || !chartContainerRef.current) return null;

      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const timeScale = chartRef.current.timeScale();
      const time = timeScale.coordinateToTime(x);
      const price = seriesRef.current.coordinateToPrice(y);

      if (time === null || price === null) return null;
      return { time, price };
    },
    []
  );

  // Mouse handlers for drawing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isVisible || activeTool === 'cursor') return;

      e.preventDefault();
      e.stopPropagation();

      setIsMouseDown(true);
      const coords = getChartCoordinates(e);
      if (!coords) return;

      const point: Point = { time: coords.time, price: coords.price };

      if (!isDrawing) {
        startDrawing(paneId, point);

        // Single-click tools finish immediately
        if (['hline', 'vline'].includes(activeTool)) {
          setTimeout(() => finishDrawing(), 0);
        }
      }
    },
    [isVisible, activeTool, isDrawing, paneId, startDrawing, getChartCoordinates, finishDrawing]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isMouseDown || !isDrawing || !currentDrawing) return;
      if (['hline', 'vline'].includes(activeTool)) return;

      e.preventDefault();
      e.stopPropagation();

      const coords = getChartCoordinates(e);
      if (!coords) return;

      const point: Point = { time: coords.time, price: coords.price };
      updateCurrentDrawingPoint(1, point);
    },
    [
      isMouseDown,
      isDrawing,
      currentDrawing,
      activeTool,
      getChartCoordinates,
      updateCurrentDrawingPoint,
    ]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const wasMouseDown = isMouseDown;
      setIsMouseDown(false);

      if (activeTool !== 'cursor') {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!wasMouseDown || !isDrawing || activeTool === 'cursor') return;
      if (['hline', 'vline'].includes(activeTool)) return;

      // Finalize two-point drawing tools (all tools except single-click ones)
      const twoPointTools = [
        'rectangle',
        'circle',
        'trendline',
        'arrow',
        'fibonacciRetracement',
        'fibonacciExtension',
        'parallelChannel',
        'pitchfork',
        'textNote',
      ];
      if (twoPointTools.includes(activeTool)) {
        const coords = getChartCoordinates(e);
        if (coords) {
          updateCurrentDrawingPoint(1, { time: coords.time, price: coords.price });
        }
        finishDrawing();
      }
    },
    [
      isMouseDown,
      isDrawing,
      activeTool,
      finishDrawing,
      getChartCoordinates,
      updateCurrentDrawingPoint,
    ]
  );

  // Initialize chart when data is ready
  useEffect(() => {
    if (isVisible && chartData.length > 0) {
      initializeChart().then(() => setChartReady(true));
    }

    return () => {
      setChartReady(false);
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [initializeChart, isVisible, chartData]); // Use chartData directly to trigger on data changes

  // Update chart height
  useEffect(() => {
    if (isVisible && chartRef.current && chartContainerRef.current) {
      chartRef.current.applyOptions({ height: height });
    }
  }, [height, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="relative h-full">
      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        style={{
          height: '100%',
          cursor: activeTool === 'cursor' ? 'grab' : 'crosshair',
          touchAction: 'auto',
          userSelect: 'none',
        }}
        className="relative bg-[#131722]"
        // Always attach handlers - they check activeTool internally and return early for cursor mode
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Canvas Overlay for Drawings */}
      {chartReady && (
        <DrawingOverlay
          chartRef={chartRef}
          seriesRef={seriesRef}
          containerRef={chartContainerRef}
          paneId={paneId}
          isDrawing={isDrawing}
          currentDrawing={currentDrawing}
          chartDataLength={chartData.length}
        />
      )}
    </div>
  );
};

const MIN_CHART_WIDTH = 400;

export const DrawingChart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { panes, updatePaneHeight } = usePaneStore();

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // Dimension tracking could be added here if needed
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const pricePane = panes.find((p: { type: string }) => p.type === 'price') || panes[0];

  return (
    <ChartErrorBoundary>
      <div
        ref={containerRef}
        data-testid="chart-container"
        className="w-full h-full bg-[#131722] overflow-hidden"
        style={{ minWidth: MIN_CHART_WIDTH }}
      >
        {pricePane && (
          <DrawingPaneComponent
            key={pricePane.id}
            paneId={pricePane.id}
            height={containerRef.current?.clientHeight || 600}
            isVisible={pricePane.visible}
            isLocked={pricePane.locked}
            indicators={pricePane.indicators}
            onHeightChange={updatePaneHeight}
          />
        )}
      </div>
    </ChartErrorBoundary>
  );
};
