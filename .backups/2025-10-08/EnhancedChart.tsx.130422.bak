"use client";
import {
  ColorType,
  createChart,
  IChartApi,
  ISeriesApi
} from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { useDrawingStore } from '../lib/drawingStore';
import { useMarketDataStore } from '../lib/marketDataStore';
import { usePaneStore } from '../lib/paneStore';
import { symbolStore } from '../lib/symbolStore';
import { timeframeStore } from '../lib/timeframeStore';

interface EnhancedChartProps {
  paneId: string;
  height?: number;
  className?: string;
}

export default function EnhancedChart({ paneId, height = 400, className = '' }: EnhancedChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Store hooks
  const { activeTool, objects, isDrawing } = useDrawingStore();
  const { fetchOHLCData, isLoading, error } = useMarketDataStore();
  const { panes } = usePaneStore();
  const selectedSymbol = symbolStore.get();
  const selectedTimeframe = timeframeStore.get();

  const pane = panes.find(p => p.id === paneId);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || isInitialized) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#e5e5e5',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          color: '#758696',
          width: 1,
          style: 2, // Dashed
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: 2, // Dashed
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2a2a2a',
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    setIsInitialized(true);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.remove();
      }
    };
  }, [height, isInitialized]);

  // Load market data
  useEffect(() => {
    if (!isInitialized || !selectedSymbol || !selectedTimeframe) return;

    const loadData = async () => {
      try {
        const data = await fetchOHLCData(selectedSymbol, selectedTimeframe);

        if (seriesRef.current && data.length > 0) {
          // Convert to chart format
          const chartData = data.map(item => ({
            time: Math.floor(new Date(item.timestamp).getTime() / 1000) as any,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }));

          seriesRef.current.setData(chartData);

          // Chart data loaded successfully
          console.log(`Loaded ${chartData.length} data points for ${selectedSymbol}`);
        }
      } catch (err) {
        console.error('Failed to load chart data:', err);
      }
    };

    loadData();
  }, [selectedSymbol, selectedTimeframe, isInitialized, fetchOHLCData, paneId]);

  // Handle drawing interactions (simplified version)
  useEffect(() => {
    if (!chartRef.current || !activeTool || activeTool === 'cursor') return;

    const handleClick = (param: any) => {
      if (!param.point || !param.time) return;

      console.log('Chart clicked in drawing mode:', {
        tool: activeTool,
        point: param.point,
        time: param.time
      });

      // Drawing logic would be implemented here
      // For now, just log the interaction
    };

    chartRef.current.subscribeClick(handleClick);

    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeClick(handleClick);
      }
    };
  }, [activeTool, isDrawing, paneId]);

  // Render drawing objects
  useEffect(() => {
    if (!chartRef.current) return;

    const paneObjects = objects.filter(obj => obj.paneId === paneId);

    // This is a simplified example - real implementation would need
    // to create chart primitives or overlays for each drawing object
    paneObjects.forEach(obj => {
      console.log('Rendering drawing object:', obj);
      // Actual rendering logic would go here
    });
  }, [objects, paneId]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-900/20 border border-red-500 ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠ Data Error</div>
          <div className="text-xs text-red-300">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="flex items-center gap-2 text-white">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            Loading chart data...
          </div>
        </div>
      )}

      {/* Chart status indicators */}
      <div className="absolute top-2 left-2 z-20">
        <div className="flex items-center gap-2 text-xs">
          {selectedSymbol && (
            <span className="bg-blue-600 px-2 py-1 rounded text-white">
              {selectedSymbol}
            </span>
          )}
          {selectedTimeframe && (
            <span className="bg-gray-600 px-2 py-1 rounded text-white">
              {selectedTimeframe}
            </span>
          )}
        </div>
      </div>

      {/* Drawing mode indicator */}
      {activeTool !== 'cursor' && (
        <div className="absolute top-2 right-2 z-20">
          <div className="bg-orange-600 px-2 py-1 rounded text-white text-xs">
            {isDrawing ? 'Drawing...' : `${activeTool} mode`}
          </div>
        </div>
      )}

      {/* Chart container */}
      <div
        ref={chartContainerRef}
        style={{ height }}
        className="w-full cursor-crosshair"
      />
    </div>
  );
}

// Helper function to create drawing objects
function createDrawingObject(
  tool: string,
  start: { x: number; y: number; time: number; price: number },
  end: { x: number; y: number; time: number; price: number },
  paneId: string
) {
  const baseObject = {
    id: `${tool}_${Date.now()}`,
    type: tool,
    paneId,
    isSelected: false,
    isVisible: true,
    zIndex: 1,
    style: {
      color: '#2196F3',
      width: 2,
      opacity: 1,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  switch (tool) {
    case 'line':
    case 'ray':
    case 'arrow':
      return {
        ...baseObject,
        points: [
          { x: start.x, y: start.y, time: start.time, price: start.price },
          { x: end.x, y: end.y, time: end.time, price: end.price }
        ],
      };

    case 'rectangle':
    case 'ellipse':
      return {
        ...baseObject,
        points: [
          { x: start.x, y: start.y, time: start.time, price: start.price },
          { x: end.x, y: end.y, time: end.time, price: end.price }
        ],
      };

    case 'fibonacci':
      return {
        ...baseObject,
        points: [
          { x: start.x, y: start.y, time: start.time, price: start.price },
          { x: end.x, y: end.y, time: end.time, price: end.price }
        ],
        levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
      };

    default:
      return baseObject;
  }
}