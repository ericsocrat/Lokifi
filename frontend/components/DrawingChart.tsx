'use client';
import { BarData, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Eye, EyeOff, GripVertical, Lock, Unlock } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Point, useDrawingStore } from '../lib/drawingStore';
import { usePaneStore } from '../lib/paneStore';
import { symbolStore } from '../lib/symbolStore';
import { colors } from '../lib/theme';
import { timeframeStore } from '../lib/timeframeStore';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { ChartLoadingState } from './ChartLoadingState';

// Chart component with proper hook usage
const ChartContainer = ({ children, ...props }: any) => {
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
    import('lightweight-charts').then((mod) => ({
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
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

  const [symbol, setSymbol] = useState(symbolStore.get());
  const [timeframe, setTimeframe] = useState(timeframeStore.get());
  const { togglePaneVisibility, togglePaneLock } = usePaneStore();
  const {
    activeTool,
    isDrawing,
    currentDrawing,
    selectedObjectId,
    objects,
    startDrawing,
    addPoint,
    finishDrawing,
    getObjectsByPane,
  } = useDrawingStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [chartData, setChartData] = useState<BarData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to symbol and timeframe changes
  useEffect(() => {
    const unsubscribeSymbol = symbolStore.subscribe((newSymbol) => {
      setSymbol(newSymbol);
    });

    const unsubscribeTimeframe = timeframeStore.subscribe((newTimeframe) => {
      setTimeframe(newTimeframe);
    });

    return () => {
      unsubscribeSymbol();
      unsubscribeTimeframe();
    };
  }, []);

  // Fetch chart data when symbol or timeframe changes
  useEffect(() => {
    const fetchChartData = async () => {
      if (!symbol || !timeframe) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/v1/ohlc/${symbol}?timeframe=${timeframe}&limit=100`);

        if (response.ok) {
          const data = await response.json();

          // Convert API data to chart format
          const formattedData: BarData[] = data.data.map((item: any) => ({
            time: new Date(item.timestamp).toISOString().split('T')[0],
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }));

          setChartData(formattedData);
        } else {
          console.error('Failed to fetch chart data:', response.status, response.statusText);
          // Use fallback mock data for development
          const fallbackData: BarData[] = generateMockData(100);
          setChartData(fallbackData);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
        // Use fallback mock data for development
        const fallbackData: BarData[] = generateMockData(100);
        setChartData(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [symbol, timeframe]);

  // Helper function to generate mock data
  const generateMockData = (count: number): BarData[] => {
    const data: BarData[] = [];
    let basePrice = 100;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - count);

    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateString = date.toISOString().split('T')[0];

      const change = (Math.random() - 0.5) * 10;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;

      data.push({
        time: dateString,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
      });

      basePrice = close;
    }

    return data;
  };

  const updateDrawingCanvas = useCallback(() => {
    if (!drawingCanvasRef.current || !chartContainerRef.current) return;

    const canvas = drawingCanvasRef.current;
    const container = chartContainerRef.current;

    canvas.width = container.clientWidth;
    canvas.height = height - 40;
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${height - 40}px`;
  }, [height]);

  const initializeChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

    try {
      const { createChart } = await import('lightweight-charts');

      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: height - 40, // Account for drawing canvas
        layout: {
          background: { color: colors.chart.background },
          textColor: colors.chart.textColor,
        },
        grid: {
          vertLines: { color: colors.chart.gridLines },
          horzLines: { color: colors.chart.gridLines },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: colors.border.default,
        },
        timeScale: {
          borderColor: colors.border.default,
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: colors.chart.candleUp,
        downColor: colors.chart.candleDown,
        borderUpColor: colors.chart.candleUp,
        borderDownColor: colors.chart.candleDown,
        wickUpColor: colors.chart.wickUp,
        wickDownColor: colors.chart.wickDown,
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;

      // Set initial data if available
      if (chartData.length > 0) {
        candlestickSeries.setData(chartData);
      }

      // Setup ResizeObserver
      if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
        resizeObserverRef.current = new ResizeObserver(() => {
          if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
              height: height - 40,
            });
            updateDrawingCanvas();
          }
        });

        resizeObserverRef.current.observe(chartContainerRef.current);
      }
    } catch (error) {
      console.error('Failed to initialize chart:', error);
      throw error;
    }
  }, [height, chartData, updateDrawingCanvas]);

  const getMousePosition = useCallback((e: React.MouseEvent): Point => {
    if (!drawingCanvasRef.current) return { x: 0, y: 0 };

    const rect = drawingCanvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isVisible || activeTool === 'cursor') return;

      setIsMouseDown(true);
      const point = getMousePosition(e);

      if (!isDrawing) {
        startDrawing(paneId, point);
      } else {
        addPoint(point);
      }
    },
    [isVisible, activeTool, isDrawing, paneId, startDrawing, addPoint, getMousePosition]
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

  const drawObjects = useCallback(() => {
    if (!drawingCanvasRef.current) return;

    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing objects for this pane
    const paneObjects = getObjectsByPane(paneId);

    paneObjects.forEach((obj) => {
      if (!obj.properties.visible) return;

      ctx.strokeStyle = obj.style.color;
      ctx.lineWidth = obj.style.lineWidth;
      ctx.setLineDash(obj.style.lineStyle === 'dashed' ? [5, 5] : []);

      // Simple line drawing for now
      if (obj.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(obj.points[0].x, obj.points[0].y);

        obj.points.slice(1).forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });

        ctx.stroke();

        // Highlight selected object
        if (obj.id === selectedObjectId) {
          ctx.strokeStyle = colors.primary.light;
          ctx.lineWidth = obj.style.lineWidth + 2;
          ctx.setLineDash([]);
          ctx.stroke();
        }
      }
    });

    // Draw current drawing in progress
    if (currentDrawing && currentDrawing.points && currentDrawing.points.length > 0) {
      ctx.strokeStyle = currentDrawing.style?.color || colors.primary.light;
      ctx.lineWidth = currentDrawing.style?.lineWidth || 2;
      ctx.setLineDash([3, 3]); // Dashed line for drawing in progress

      ctx.beginPath();
      ctx.moveTo(currentDrawing.points[0].x, currentDrawing.points[0].y);

      currentDrawing.points.slice(1).forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });

      ctx.stroke();
    }
  }, [paneId, getObjectsByPane, selectedObjectId, currentDrawing]);

  useEffect(() => {
    if (isVisible) {
      initializeChart();
      updateDrawingCanvas();
    }

    return () => {
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
    };
  }, [isVisible, height]);

  // Update chart data when it changes
  useEffect(() => {
    if (seriesRef.current && chartData.length > 0) {
      seriesRef.current.setData(chartData);
    }
  }, [chartData]);

  // Redraw objects when they change
  useEffect(() => {
    drawObjects();
  }, [drawObjects, objects, currentDrawing, selectedObjectId]);

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
      <div className="h-8 bg-bg-secondary border-b border-border-default flex items-center justify-between px-3">
        <div className="text-sm text-text-secondary">
          {paneId.includes('price') ? 'Price Chart' : `Indicator Pane`} (Hidden)
        </div>
        <button
          onClick={() => togglePaneVisibility(paneId)}
          className="text-text-secondary hover:text-text-primary transition-smooth"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative border-b border-border-default">
      {/* Pane Header */}
      <div className="h-8 bg-bg-secondary border-b border-border-default flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-text-primary">
            {paneId.includes('price') ? `${symbol} - ${timeframe}` : 'Indicators'}
          </div>
          {indicators.length > 0 && (
            <div className="text-xs text-text-tertiary">({indicators.join(', ')})</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => togglePaneVisibility(paneId)}
            className="text-text-secondary hover:text-text-primary transition-smooth p-1"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => togglePaneLock(paneId)}
            className="text-text-secondary hover:text-text-primary transition-smooth p-1"
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Chart Container with Drawing Layer */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-primary z-20">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-sm text-text-secondary">Loading {symbol}...</p>
            </div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          style={{ height: `${height - 40}px` }}
          className="relative bg-bg-primary"
        />

        {/* Drawing Canvas Overlay */}
        <canvas
          ref={drawingCanvasRef}
          className="absolute top-0 left-0 w-full h-full cursor-crosshair pointer-events-auto"
          style={{
            zIndex: 10,
            cursor: activeTool === 'cursor' ? 'default' : 'crosshair',
            touchAction: 'none',
          }}
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
          className={`absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-primary/20 transition-smooth flex items-center justify-center ${
            isDragging ? 'bg-primary/30' : ''
          }`}
        >
          <GripVertical className="w-4 h-4 text-text-tertiary" />
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
        className="w-full h-full bg-bg-primary overflow-hidden"
        style={{ minWidth: MIN_CHART_WIDTH }}
      >
        {panes.map((pane) => (
          <DrawingPaneComponent
            key={pane.id}
            paneId={pane.id}
            height={pane.height}
            isVisible={pane.visible}
            isLocked={pane.locked}
            indicators={pane.indicators}
            onHeightChange={updatePaneHeight}
          />
        ))}
      </div>
    </ChartErrorBoundary>
  );
};
