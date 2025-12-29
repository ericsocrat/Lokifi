'use client';
import { FibonacciPrimitive } from '@/lib/plugins/FibonacciPrimitive';
import { RectanglePrimitive } from '@/lib/plugins/RectanglePrimitive';
import { TrendLinePrimitive } from '@/lib/plugins/TrendLinePrimitive';
import { DrawingObject, Point, useDrawingStore } from '@/lib/stores/drawingStore';
import { usePaneStore } from '@/lib/stores/paneStore';
import { symbolStore } from '@/lib/stores/symbolStore';
import { timeframeStore } from '@/lib/stores/timeframeStore';
import {
  BarData,
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  Time,
  UTCTimestamp,
} from 'lightweight-charts';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { ChartLoadingState } from './ChartLoadingState';

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
const Chart = dynamic(
  () =>
    import('lightweight-charts').then((mod: unknown) => ({
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
  isLocked,
  indicators,
  onHeightChange,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const primitivesRef = useRef<Map<string, ISeriesPrimitive<Time>>>(new Map());

  const symbol = symbolStore.get();
  const timeframe = timeframeStore.get();
  const {
    activeTool,
    isDrawing,
    currentDrawing,
    selectedObjectId,
    startDrawing,
    addPoint,
    finishDrawing,
    getObjectsByPane,
    objects, // Subscribe to objects array to trigger re-renders
  } = useDrawingStore();

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [chartData, setChartData] = useState<BarData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch OHLC data from mock endpoint
  useEffect(() => {
    const fetchOHLCData = async () => {
      try {
        setIsLoading(true);
        const url = `http://localhost:8000/api/mock/ohlc?symbol=${symbol}&timeframe=${timeframe}&limit=100`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch OHLC data');
        }

        const result = await response.json();

        // Transform mock API data to lightweight-charts format
        // Mock endpoint returns: { symbol, timeframe, candles: [{ ts, o, h, l, c, v }] }
        // Use Unix timestamp in seconds (lightweight-charts accepts both date strings and timestamps)
        const transformedData: BarData[] = result.candles.map(
          (candle: { ts: number; o: number; h: number; l: number; c: number }) => ({
            time: Math.floor(candle.ts / 1000) as UTCTimestamp, // Convert ms to seconds
            open: candle.o,
            high: candle.h,
            low: candle.l,
            close: candle.c,
          })
        );

        setChartData(transformedData);
      } catch (error) {
        console.error('Failed to fetch OHLC data:', error);
        // Fallback to mock data if API fails
        setChartData([
          { time: '2024-01-01', open: 100, high: 110, low: 95, close: 105 },
          { time: '2024-01-02', open: 105, high: 115, low: 100, close: 108 },
          { time: '2024-01-03', open: 108, high: 112, low: 102, close: 110 },
          { time: '2024-01-04', open: 110, high: 118, low: 108, close: 115 },
          { time: '2024-01-05', open: 115, high: 120, low: 110, close: 118 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOHLCData();
  }, [symbol, timeframe]);

  const initializeChart = useCallback(async () => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    try {
      const { createChart } = await import('lightweight-charts');

      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: height, // Full height - no header
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
        rightPriceScale: {
          borderColor: '#2a2e39',
        },
        timeScale: {
          borderColor: '#2a2e39',
          timeVisible: true,
          secondsVisible: false,
        },
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isVisible || activeTool === 'cursor') return;

      setIsMouseDown(true);
      const coords = getChartCoordinates(e);
      if (!coords) return;

      // Convert to Point format (will be updated to use time/price in store later)
      const point: Point = { x: 0, y: 0, time: coords.time, price: coords.price };

      if (!isDrawing) {
        startDrawing(paneId, point);
      } else {
        addPoint(point);
      }
    },
    [isVisible, activeTool, isDrawing, paneId, startDrawing, addPoint, getChartCoordinates]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isMouseDown || !isDrawing || !currentDrawing) return;

      // For tools that need continuous updates (like rectangles), update the preview
      const coords = getChartCoordinates(e);
      if (!coords) return;

      // Update the current drawing's second point for preview
      // This allows real-time feedback while dragging
      const previewPoint: Point = { x: 0, y: 0, time: coords.time, price: coords.price };

      // For two-point tools, we want to show a preview with the current mouse position
      // The actual second point will be added on mouseUp
      // TODO: Implement preview rendering (requires additional state or primitive updates)
    },
    [isMouseDown, isDrawing, currentDrawing, getChartCoordinates]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      setIsMouseDown(false);

      if (isDrawing && activeTool !== 'cursor') {
        // For two-point drawing tools, add the second point and finish
        if (['rectangle', 'circle', 'trendline', 'hline', 'vline'].includes(activeTool)) {
          const coords = getChartCoordinates(e);
          if (coords) {
            const point: Point = { x: 0, y: 0, time: coords.time, price: coords.price };
            addPoint(point);
          }
          finishDrawing();
        }
      }
    },
    [isDrawing, activeTool, finishDrawing, getChartCoordinates, addPoint]
  );

  const handleDoubleClick = useCallback(() => {
    if (isDrawing) {
      finishDrawing();
    }
  }, [isDrawing, finishDrawing]);

  // Attach drawing primitives to chart
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;

    const paneObjects = getObjectsByPane(paneId);

    // Remove primitives that no longer exist
    primitivesRef.current.forEach((primitive, id) => {
      const objectExists = paneObjects.some((obj: { id: string }) => obj.id === id);
      if (!objectExists) {
        seriesRef.current?.detachPrimitive(primitive);
        primitivesRef.current.delete(id);
      }
    });

    // Add or update primitives for existing objects
    paneObjects.forEach((obj: DrawingObject) => {
      if (!obj.properties.visible || obj.points.length < 2) return;

      // Skip if already attached
      if (primitivesRef.current.has(obj.id)) return;

      // Only create primitives for objects with time/price data
      if (!obj.points[0].time || obj.points[0].price === undefined) return;

      let primitive: ISeriesPrimitive<Time> | null = null;

      try {
        switch (obj.type) {
          case 'trendline':
          case 'hline':
          case 'vline':
            primitive = new TrendLinePrimitive(
              { time: obj.points[0].time as Time, price: obj.points[0].price! },
              {
                time: obj.points[obj.points.length - 1].time as Time,
                price: obj.points[obj.points.length - 1].price!,
              },
              {
                lineColor: obj.style.color,
                lineWidth: obj.style.lineWidth,
              }
            );
            break;

          case 'rectangle':
            primitive = new RectanglePrimitive(
              { time: obj.points[0].time as Time, price: obj.points[0].price! },
              { time: obj.points[1].time as Time, price: obj.points[1].price! },
              {
                fillColor: obj.style.color,
                borderColor: obj.style.color,
                fillOpacity: 0.2,
              }
            );
            break;

          case 'fibonacciRetracement':
            primitive = new FibonacciPrimitive(
              { time: obj.points[0].time as Time, price: obj.points[0].price! },
              {
                time: obj.points[obj.points.length - 1].time as Time,
                price: obj.points[obj.points.length - 1].price!,
              },
              {
                lineColor: obj.style.color,
                lineWidth: obj.style.lineWidth,
              }
            );
            break;
        }

        if (primitive && seriesRef.current) {
          seriesRef.current.attachPrimitive(primitive);
          primitivesRef.current.set(obj.id, primitive);
        }
      } catch (error) {
        console.error(`Failed to create primitive for ${obj.type}:`, error);
      }
    });

    // Request chart update
    chartRef.current?.timeScale().fitContent();
  }, [paneId, getObjectsByPane, objects]);

  useEffect(() => {
    if (isVisible) {
      initializeChart();
    }

    return () => {
      // Cleanup primitives
      primitivesRef.current.forEach((primitive) => {
        seriesRef.current?.detachPrimitive(primitive);
      });
      primitivesRef.current.clear();

      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
    };
  }, [initializeChart, isVisible]);

  // Update chart height when height changes
  useEffect(() => {
    if (isVisible && chartRef.current && chartContainerRef.current) {
      chartRef.current.applyOptions({
        height: height - 40,
      });
    }
  }, [height, isVisible]);

  if (!isVisible) {
    return null; // Hidden panes don't render at all - TradingView style
  }

  return (
    <div className="relative h-full">
      {/* Chart Container with Drawing Support - Full height, no header */}
      <div
        ref={chartContainerRef}
        style={{
          height: '100%',
          cursor: activeTool === 'cursor' ? 'default' : 'crosshair',
        }}
        className="relative bg-[#131722]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
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

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Get the main price pane - TradingView only shows one main chart
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
