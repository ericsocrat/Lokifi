"use client";
import { BarData, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Eye, EyeOff, GripVertical, Lock, Unlock } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePaneStore } from '../lib/paneStore';
import { symbolStore } from '../lib/symbolStore';
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
  () => import('lightweight-charts').then(mod => ({
    default: ChartContainer
  })),
  {
    ssr: false,
    loading: () => <ChartLoadingState />
  }
);

interface PaneComponentProps {
  paneId: string;
  height: number;
  isVisible: boolean;
  isLocked: boolean;
  indicators: string[];
  onHeightChange: (paneId: string, height: number) => void;
}

const PaneComponent: React.FC<PaneComponentProps> = ({
  paneId,
  height,
  isVisible,
  isLocked,
  indicators,
  onHeightChange
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const symbol = symbolStore.get();
  const timeframe = timeframeStore.get();
  const { togglePaneVisibility, togglePaneLock } = usePaneStore();
  const [isDragging, setIsDragging] = useState(false);

  // Mock data - same as ChartPanelV2
  const mockData: BarData[] = [
    { time: '2024-01-01', open: 100, high: 110, low: 95, close: 105 },
    { time: '2024-01-02', open: 105, high: 115, low: 100, close: 108 },
    { time: '2024-01-03', open: 108, high: 112, low: 102, close: 110 },
    { time: '2024-01-04', open: 110, high: 118, low: 108, close: 115 },
    { time: '2024-01-05', open: 115, high: 120, low: 110, close: 118 }
  ];

  const initializeChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

    try {
      const { createChart } = await import('lightweight-charts');

      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: height,
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
  }, [height, mockData]);

  useEffect(() => {
    if (isVisible) {
      initializeChart();
    }

    return () => {
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
    };
  }, [initializeChart, isVisible]);

  const handleResize = useCallback((e: React.MouseEvent) => {
    if (isLocked) return;

    setIsDragging(true);
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(100, Math.min(600, startHeight + deltaY));
      onHeightChange(paneId, newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isLocked, height, paneId, onHeightChange]);

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
            <div className="text-xs text-gray-400">
              ({indicators.join(', ')})
            </div>
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

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        style={{ height: `${height}px` }}
        className="relative bg-gray-900"
      />

      {/* Resize Handle */}
      {!isLocked && (
        <div
          onMouseDown={handleResize}
          className={`absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-blue-500/20 transition-colors flex items-center justify-center ${isDragging ? 'bg-blue-500/30' : ''
            }`}
        >
          <GripVertical className="w-4 h-4 text-gray-500" />
        </div>
      )}
    </div>
  );
};

const MIN_CHART_WIDTH = 400;

export const MultiPaneChart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(MIN_CHART_WIDTH);
  const { panes, updatePaneHeight } = usePaneStore();

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = Math.max(MIN_CHART_WIDTH, containerRef.current.clientWidth);
        setContainerWidth(width);
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
        className="w-full h-full bg-gray-900 overflow-hidden"
        style={{ minWidth: MIN_CHART_WIDTH }}
      >
        {panes.map((pane) => (
          <PaneComponent
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