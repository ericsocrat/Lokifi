'use client';
import { Point, useDrawingStore } from '@/lib/stores/drawingStore';
import { usePaneStore } from '@/lib/stores/paneStore';
import { symbolStore } from '@/lib/stores/symbolStore';
import { timeframeStore } from '@/lib/stores/timeframeStore';
import { BarData, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Eye, EyeOff, GripVertical, Lock, Unlock } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    import('lightweight-charts').then((mod: any) => ({
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
  } = useDrawingStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Mock data - same as previous charts
  const mockData: BarData[] = [
    { time: '2024-01-01', open: 100, high: 110, low: 95, close: 105 },
    { time: '2024-01-02', open: 105, high: 115, low: 100, close: 108 },
    { time: '2024-01-03', open: 108, high: 112, low: 102, close: 110 },
    { time: '2024-01-04', open: 110, high: 118, low: 108, close: 115 },
    { time: '2024-01-05', open: 115, high: 120, low: 110, close: 118 },
  ];

  const initializeChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

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

      candlestickSeries.setData(mockData);

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
            updateDrawingCanvas();
          }
        });

        resizeObserverRef.current.observe(chartContainerRef.current);
      }
    } catch (error) {
      console.error('Failed to initialize chart:', error);
      throw error;
    }
  }, [height, mockData]);

  const updateDrawingCanvas = useCallback(() => {
    if (!drawingCanvasRef.current || !chartContainerRef.current) return;

    const canvas = drawingCanvasRef.current;
    const container = chartContainerRef.current;

    canvas.width = container.clientWidth;
    canvas.height = height - 40;
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${height - 40}px`;
  }, [height]);

  const getMousePosition = useCallback((e: React.MouseEvent): Point => {
    if (!chartContainerRef.current) return { x: 0, y: 0 };

    const rect = chartContainerRef.current.getBoundingClientRect();
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

    paneObjects.forEach((obj: any) => {
      if (!obj.properties.visible) return;

      ctx.strokeStyle = obj.style.color;
      ctx.lineWidth = obj.style.lineWidth;
      ctx.setLineDash(obj.style.lineStyle === 'dashed' ? [5, 5] : []);

      // Simple line drawing for now
      if (obj.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(obj.points[0].x, obj.points[0].y);

        obj.points.slice(1).forEach((point: any) => {
          ctx.lineTo(point.x, point.y);
        });

        ctx.stroke();

        // Highlight selected object
        if (obj.id === selectedObjectId) {
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = obj.style.lineWidth + 2;
          ctx.setLineDash([]);
          ctx.stroke();
        }
      }
    });

    // Draw current drawing in progress
    if (currentDrawing && currentDrawing.points && currentDrawing.points.length > 0) {
      ctx.strokeStyle = currentDrawing.style?.color || '#60a5fa';
      ctx.lineWidth = currentDrawing.style?.lineWidth || 2;
      ctx.setLineDash([3, 3]); // Dashed line for drawing in progress

      ctx.beginPath();
      ctx.moveTo(currentDrawing.points[0].x, currentDrawing.points[0].y);

      currentDrawing.points.slice(1).forEach((point: any) => {
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
  }, [initializeChart, updateDrawingCanvas, isVisible]);

  // Redraw objects when they change
  useEffect(() => {
    drawObjects();
  }, [drawObjects]);

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

      {/* Chart Container with Drawing Layer */}
      <div className="relative">
        <div
          ref={chartContainerRef}
          style={{ height: `${height - 40}px` }}
          className="relative bg-gray-900"
        />

        {/* Drawing Canvas Overlay */}
        <canvas
          ref={drawingCanvasRef}
          className="absolute top-0 left-0 cursor-crosshair pointer-events-auto"
          style={{
            zIndex: 10,
            cursor: activeTool === 'cursor' ? 'default' : 'crosshair',
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
        {panes.map((pane: any) => (
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
