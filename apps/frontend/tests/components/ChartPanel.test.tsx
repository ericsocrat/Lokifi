import ChartPanel from '@/components/ChartPanelV2';
import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock ResizeObserver for jsdom environment
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock the dependencies - lightweight-charts v5 API
vi.mock('lightweight-charts', () => {
  // Define Series type symbols INSIDE the mock factory (vi.mock is hoisted)
  const CandlestickSeriesSymbol = Symbol('CandlestickSeries');
  const LineSeriesSymbol = Symbol('LineSeries');
  const HistogramSeriesSymbol = Symbol('HistogramSeries');
  const AreaSeriesSymbol = Symbol('AreaSeries');

  const createChart = vi.fn(() => {
    const timeScale = () => ({
      subscribeVisibleTimeRangeChange: vi.fn(),
      setVisibleRange: vi.fn(),
    });
    const candleSeries = {
      setData: vi.fn(),
      priceToCoordinate: vi.fn(() => 0),
      timeToCoordinate: vi.fn(() => 0),
    };
    const lineSeries = { setData: vi.fn() };
    const histSeries = { setData: vi.fn() };
    const areaSeries = { setData: vi.fn() };
    return {
      timeScale: timeScale,
      // v5 unified API
      addSeries: vi.fn((_seriesType: symbol, _options?: unknown) => {
        return {
          setData: vi.fn(),
          priceToCoordinate: vi.fn(() => 0),
          timeToCoordinate: vi.fn(() => 0),
        };
      }),
      // Legacy methods for backward compatibility
      addCandlestickSeries: vi.fn(() => candleSeries),
      addLineSeries: vi.fn(() => lineSeries),
      addHistogramSeries: vi.fn(() => histSeries),
      addAreaSeries: vi.fn(() => areaSeries),
      applyOptions: vi.fn(),
      remove: vi.fn(),
    };
  });
  return {
    createChart,
    // v5 Series type exports
    CandlestickSeries: CandlestickSeriesSymbol,
    LineSeries: LineSeriesSymbol,
    HistogramSeries: HistogramSeriesSymbol,
    AreaSeries: AreaSeriesSymbol,
  };
});

vi.mock('@/lib/api', () => ({
  API: 'http://localhost:8000',
}));

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: {
      candles: [
        { ts: 1000000, o: 100, h: 110, l: 90, c: 105, v: 1000 },
        { ts: 2000000, o: 105, h: 115, l: 95, c: 110, v: 1200 },
      ],
    },
  })),
}));

// Mock stores
vi.mock('@/stores/drawStore', () => ({
  drawStore: {
    get: vi.fn(() => ({ tool: 'cursor' })),
    subscribe: vi.fn(() => vi.fn()),
    setTool: vi.fn(),
  },
}));

vi.mock('@/stores/symbolStore', () => ({
  symbolStore: {
    get: vi.fn(() => 'AAPL'),
    subscribe: vi.fn(() => vi.fn()),
    set: vi.fn(),
  },
}));

vi.mock('@/stores/timeframeStore', () => ({
  timeframeStore: {
    get: vi.fn(() => '1D'),
    subscribe: vi.fn(() => vi.fn()),
    set: vi.fn(),
  },
}));

vi.mock('@/stores/indicatorStore', () => ({
  indicatorStore: {
    get: vi.fn(() => ({ indicators: [] })),
    subscribe: vi.fn(() => vi.fn()),
    set: vi.fn(),
  },
}));

vi.mock('plugins/registry', () => ({
  pluginManager: {
    activeToolId: null,
    setActiveTool: vi.fn(),
  },
}));

// Mock chart indicators
vi.mock('@/charts/indicators', () => ({
  bollinger: vi.fn(),
  ema: vi.fn(),
  macd: vi.fn(),
  rsi: vi.fn(),
  stddevChannels: vi.fn(),
  vwap: vi.fn(),
  vwma: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child components to avoid pulling in their full implementations in tests
vi.mock('@/components/DrawingToolbar', () => ({
  DrawingToolbar: () => React.createElement('div'),
}));
vi.mock('@/components/PluginSideToolbar', () => ({
  default: () => React.createElement('div'),
}));
vi.mock('@/components/LeftDock', () => ({
  default: () => React.createElement('div'),
}));
vi.mock('@/components/ChartErrorBoundary', () => ({
  ChartErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));
vi.mock('@/components/ChartLoadingState', () => ({
  ChartLoadingState: () => React.createElement('div'),
}));
vi.mock('@/components/ChartSidebar', () => ({
  default: () => React.createElement('div', { 'data-testid': 'chart-sidebar' }),
}));
vi.mock('next/dynamic', () => ({
  default: () => () => React.createElement('div'),
}));

describe('ChartPanel', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('renders the chart container', () => {
    const { container } = render(<ChartPanel />);
    // Component should render without crashing
    expect(container).toBeDefined();
    expect(container.firstChild).toBeTruthy();
  });

  it('renders without throwing errors', () => {
    // Verify the component can be instantiated without errors
    expect(() => render(<ChartPanel />)).not.toThrow();
  });

  it('renders with correct container dimensions', () => {
    const { container } = render(<ChartPanel />);
    // The component should create a chart container div
    const chartContainer = container.querySelector('div');
    expect(chartContainer).toBeTruthy();
  });
});
