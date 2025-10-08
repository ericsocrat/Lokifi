import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import { ChartErrorBoundary } from '@/components/ChartErrorBoundary';
import { ChartLoadingState } from '@/components/ChartLoadingState';

// Mock lightweight-charts
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addCandlestickSeries: vi.fn(() => ({ setData: vi.fn() })),
    addLineSeries: vi.fn(() => ({ setData: vi.fn() })),
    addAreaSeries: vi.fn(() => ({ setData: vi.fn() })),
    addHistogramSeries: vi.fn(() => ({ setData: vi.fn() })),
    timeScale: vi.fn(() => ({
      subscribeVisibleTimeRangeChange: vi.fn(),
      setVisibleRange: vi.fn(),
    })),
    applyOptions: vi.fn(),
    remove: vi.fn(),
  })),
  ColorType: { Solid: 'solid' },
}));

// Mock stores
vi.mock('@/lib/symbolStore', () => ({
  symbolStore: {
    get: () => 'BTCUSD',
    subscribe: vi.fn(),
  },
}));

vi.mock('@/lib/timeframeStore', () => ({
  timeframeStore: {
    get: () => '1h',
    subscribe: vi.fn(),
  },
}));

vi.mock('@/lib/indicatorStore', () => ({
  indicatorStore: {
    get: () => ({ ema20: true, params: {}, style: {} }),
    subscribe: vi.fn(),
    loadForSymbol: vi.fn(),
  },
}));

vi.mock('@/lib/drawStore', () => ({
  drawStore: {
    get: () => ({ tool: 'cursor', snap: true, shapes: [], selectedIds: [] }),
    subscribe: vi.fn(),
    loadCurrent: vi.fn(),
  },
}));

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: null,
    error: null,
    isLoading: false,
    mutate: vi.fn(),
  })),
}));

describe('ChartErrorBoundary', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  it('renders children when no error', () => {
    render(
      <ChartErrorBoundary>
        <div>Test content</div>
      </ChartErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when error occurs', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ChartErrorBoundary>
        <ThrowError />
      </ChartErrorBoundary>
    );

    expect(screen.getByText('Chart Error')).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ChartErrorBoundary onRetry={onRetry}>
        <ThrowError />
      </ChartErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    retryButton.click();

    expect(onRetry).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('ChartLoadingState', () => {
  it('renders default loading message', () => {
    render(<ChartLoadingState />);

    expect(screen.getByText('Loading Chart')).toBeInTheDocument();
    expect(screen.getByText(/Fetching market data/)).toBeInTheDocument();
  });

  it('renders custom symbol and timeframe', () => {
    render(<ChartLoadingState symbol="AAPL" timeframe="15m" />);

    expect(screen.getByText('Loading Chart')).toBeInTheDocument();
    expect(screen.getByText(/Fetching AAPL data \(15m\)/)).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<ChartLoadingState message="Custom loading message" />);

    expect(screen.getByText('Loading Chart')).toBeInTheDocument();
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });
});

describe('Chart timestamp normalization', () => {
  it('normalizes millisecond timestamps to seconds', () => {
    const normalizeTimestamp = (ts: number): number => {
      return ts > 1e10 ? Math.floor(ts / 1000) : ts;
    };

    // Test millisecond timestamp
    const msTimestamp = 1640995200000; // 2022-01-01 00:00:00 in milliseconds
    expect(normalizeTimestamp(msTimestamp)).toBe(1640995200);

    // Test second timestamp (should remain unchanged)
    const sTimestamp = 1640995200; // 2022-01-01 00:00:00 in seconds
    expect(normalizeTimestamp(sTimestamp)).toBe(1640995200);
  });

  it('ensures monotonic time ordering', () => {
    const candles = [
      { ts: 1640995200, o: 100, h: 105, l: 95, c: 102, v: 1000 },
      { ts: 1640991600, o: 102, h: 107, l: 98, c: 104, v: 1200 }, // Out of order
      { ts: 1640998800, o: 104, h: 109, l: 101, c: 106, v: 900 },
    ];

    const sortedCandles = candles.sort((a: any, b: any) => a.ts - b.ts);

    expect(sortedCandles[0].ts).toBe(1640991600);
    expect(sortedCandles[1].ts).toBe(1640995200);
    expect(sortedCandles[2].ts).toBe(1640998800);
  });
});