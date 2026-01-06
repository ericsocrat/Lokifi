import EnhancedChart from '@/components/EnhancedChart';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock ResizeObserver for jsdom
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

// Mock the lightweight-charts library - v5 API
vi.mock('lightweight-charts', () => {
  const CandlestickSeriesSymbol = Symbol('CandlestickSeries');
  const LineSeriesSymbol = Symbol('LineSeries');
  const HistogramSeriesSymbol = Symbol('HistogramSeries');
  const AreaSeriesSymbol = Symbol('AreaSeries');

  return {
    createChart: vi.fn(() => ({
      addSeries: vi.fn((_seriesType: symbol, _options?: unknown) => ({
        setData: vi.fn(),
        coordinateToPrice: vi.fn(() => 100),
      })),
      addCandlestickSeries: vi.fn(() => ({
        setData: vi.fn(),
        coordinateToPrice: vi.fn(() => 100),
      })),
      subscribeClick: vi.fn(),
      unsubscribeClick: vi.fn(),
      remove: vi.fn(),
      applyOptions: vi.fn(),
      timeScale: vi.fn(() => ({
        fitContent: vi.fn(),
        scrollToRealTime: vi.fn(),
      })),
    })),
    CandlestickSeries: CandlestickSeriesSymbol,
    LineSeries: LineSeriesSymbol,
    HistogramSeries: HistogramSeriesSymbol,
    AreaSeries: AreaSeriesSymbol,
    ColorType: {
      Solid: 'solid',
    },
  };
});

// Mock the stores with proper paths
vi.mock('@/lib/stores/drawingStore', () => ({
  useDrawingStore: vi.fn(() => ({
    activeTool: 'cursor',
    objects: [],
    isDrawing: false,
  })),
}));

vi.mock('@/lib/stores/marketDataStore', () => ({
  useMarketDataStore: vi.fn(() => ({
    fetchOHLCData: vi.fn(() =>
      Promise.resolve([
        {
          symbol: 'AAPL',
          timestamp: '2023-01-01T00:00:00Z',
          open: 100,
          high: 105,
          low: 98,
          close: 103,
          volume: 1000000,
          provider: 'mock',
          timeframe: '1D',
        },
      ])
    ),
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/lib/stores/paneStore', () => ({
  usePaneStore: vi.fn(() => ({
    panes: [
      {
        id: 'pane-1',
        symbol: 'AAPL',
        timeframe: '1D',
        indicators: [],
      },
    ],
  })),
}));

vi.mock('@/lib/stores/symbolStore', () => ({
  symbolStore: {
    get: vi.fn(() => 'AAPL'),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock('@/lib/stores/timeframeStore', () => ({
  timeframeStore: {
    get: vi.fn(() => '1D'),
    subscribe: vi.fn(() => vi.fn()),
  },
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

const defaultProps = {
  paneId: 'pane-1',
  height: 400,
};

describe('EnhancedChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders chart container', () => {
    const { container } = render(<EnhancedChart {...defaultProps} />);

    // Check if chart container is rendered using container query
    expect(container.querySelector('.cursor-crosshair')).toBeInTheDocument();
  });

  it('does not throw on render', () => {
    expect(() => render(<EnhancedChart {...defaultProps} />)).not.toThrow();
  });

  it('handles different height prop', () => {
    const { container } = render(<EnhancedChart {...defaultProps} height={600} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays symbol badge', () => {
    render(<EnhancedChart {...defaultProps} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('displays timeframe badge', () => {
    render(<EnhancedChart {...defaultProps} />);
    expect(screen.getByText('1D')).toBeInTheDocument();
  });
});

describe('Chart Data Processing', () => {
  it('converts OHLC data to chart format correctly', () => {
    const mockOHLCData = [
      {
        symbol: 'AAPL',
        timestamp: '2023-01-01T00:00:00Z',
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 1000000,
        provider: 'mock',
        timeframe: '1D',
      },
    ];

    // Test the conversion logic
    const chartData = mockOHLCData.map((item) => ({
      time: Math.floor(new Date(item.timestamp).getTime() / 1000),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    expect(chartData[0]).toEqual({
      time: expect.any(Number),
      open: 100,
      high: 105,
      low: 98,
      close: 103,
    });

    // Verify OHLC relationships
    expect(chartData[0].high).toBeGreaterThanOrEqual(chartData[0].open);
    expect(chartData[0].high).toBeGreaterThanOrEqual(chartData[0].close);
    expect(chartData[0].low).toBeLessThanOrEqual(chartData[0].open);
    expect(chartData[0].low).toBeLessThanOrEqual(chartData[0].close);
  });
});
