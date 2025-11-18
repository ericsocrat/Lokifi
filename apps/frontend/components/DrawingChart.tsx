'use client';
import { FibonacciPrimitive } from '@/lib/plugins/FibonacciPrimitive';
import { RectanglePrimitive } from '@/lib/plugins/RectanglePrimitive';
import { TrendLinePrimitive } from '@/lib/plugins/TrendLinePrimitive';
import { DrawingObject, Point, useDrawingStore } from '@/lib/stores/drawingStore';
import { usePaneStore } from '@/lib/stores/paneStore';
import { symbolStore } from '@/lib/stores/symbolStore';
import { timeframeStore } from '@/lib/stores/timeframeStore';
import { BarData, IChartApi, ISeriesApi, ISeriesPrimitive, Time } from 'lightweight-charts';
import { Eye, EyeOff, GripVertical, Lock, Unlock } from 'lucide-react';
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
  const { togglePaneVisibility, togglePaneLock } = usePaneStore();
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

  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [chartData, setChartData] = useState<BarData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real OHLC data
  useEffect(() => {
    const fetchOHLCData = async () => {
      try {
        setIsLoading(true);
        const url = `http://localhost:8000/api/v1/ohlc/${symbol}?timeframe=${timeframe}&limit=100`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch OHLC data');
        }

        const result = await response.json();

        // Transform API data to lightweight-charts format
        // Note: Yahoo Finance returns BTC price divided by 1000, so multiply by 1000
        const priceMultiplier = symbol.includes('BTC') ? 1000 : 1;

        const transformedData: BarData[] = result.data.map((candle: any) => ({
          time: candle.timestamp.split('T')[0], // Convert ISO to YYYY-MM-DD
          open: candle.open * priceMultiplier,
          high: candle.high * priceMultiplier,
          low: candle.low * priceMultiplier,
          close: candle.close * priceMultiplier,
        }));

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
        height: height - 40, // Account for drawing canvas
        layout: {
          background: { color: '#1a1a1a' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: '#374151',
        },
        timeScale: {
          borderColor: '#374151',
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
              height: height - 40,
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
      if (!isMouseDown || !isDrawing) return;

      // const point = getMousePosition(e);
      // For tools that need continuous updates (like rectangles), update the current drawing
      // This would typically update a preview of the shape being drawn
    },
    [isMouseDown, isDrawing]
  );

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);

    if (isDrawing && activeTool !== 'cursor') {
      // For most tools, finish drawing on mouse up
      if (['rectangle', 'circle', 'trendline', 'hline', 'vline'].includes(activeTool)) {
        finishDrawing();
      }
    }
  }, [isDrawing, activeTool, finishDrawing]);

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

  const handleResize = useCallback(
    (e: React.MouseEvent) => {
      if (isLocked) return;

      setIsDragging(true);
      const startY = e.clientY;
      const startHeight = height;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(150, Math.min(800, startHeight + deltaY));
        onHeightChange(paneId, newHeight);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [isLocked, height, paneId, onHeightChange]
  );

  if (!isVisible) {
    return (
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3">
        <div className="text-sm text-gray-400">
          {paneId.includes('price') ? 'Price Chart' : `Indicator Pane`} (Hidden)
        </div>
        <button
          onClick={() => togglePaneVisibility(paneId)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative border-b border-gray-700">
      {/* Pane Header */}
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-white">
            {paneId.includes('price') ? `${symbol} - ${timeframe}` : 'Indicators'}
          </div>
          {indicators.length > 0 && (
            <div className="text-xs text-gray-400">({indicators.join(', ')})</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => togglePaneVisibility(paneId)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => togglePaneLock(paneId)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Chart Container with Drawing Support */}
      <div className="relative">
        <div
          ref={chartContainerRef}
          style={{
            height: `${height - 40}px`,
            cursor: activeTool === 'cursor' ? 'default' : 'crosshair',
          }}
          className="relative bg-gray-900"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </div>

      {/* Resize Handle */}
      {!isLocked && (
        <div
          onMouseDown={handleResize}
          className={`absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-blue-500/20 transition-colors flex items-center justify-center ${
            isDragging ? 'bg-blue-500/30' : ''
          }`}
        >
          <GripVertical className="w-4 h-4 text-gray-500" />
        </div>
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

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return (
    <ChartErrorBoundary>
      <div
        ref={containerRef}
        data-testid="chart-container"
        className="w-full h-full bg-gray-900 overflow-hidden"
        style={{ minWidth: MIN_CHART_WIDTH }}
      >
        {panes.map(
          (pane: {
            id: string;
            height: number;
            visible: boolean;
            locked: boolean;
            indicators: string[];
          }) => (
            <DrawingPaneComponent
              key={pane.id}
              paneId={pane.id}
              height={pane.height}
              isVisible={pane.visible}
              isLocked={pane.locked}
              indicators={pane.indicators}
              onHeightChange={updatePaneHeight}
            />
          )
        )}
      </div>
    </ChartErrorBoundary>
  );
};
