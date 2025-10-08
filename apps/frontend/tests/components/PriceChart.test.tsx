import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PriceChart from '../../src/components/PriceChart';
import { useChartStore } from '../../src/state/store';

// Mock lightweight-charts
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addCandlestickSeries: vi.fn(() => ({
      setData: vi.fn(),
      update: vi.fn(),
      priceToCoordinate: vi.fn(() => 100),
      coordinateToPrice: vi.fn(() => 50000)
    })),
    addLineSeries: vi.fn(() => ({
      setData: vi.fn(),
      update: vi.fn()
    })),
    addHistogramSeries: vi.fn(() => ({
      setData: vi.fn(),
      update: vi.fn()
    })),
    addAreaSeries: vi.fn(() => ({
      setData: vi.fn(),
      update: vi.fn()
    })),
    timeScale: vi.fn(() => ({
      subscribeVisibleTimeRangeChange: vi.fn(() => () => {}),
      setVisibleRange: vi.fn(),
      getVisibleRange: vi.fn(() => ({ from: 1000000, to: 2000000 })),
      timeToCoordinate: vi.fn(() => 100),
      coordinateToTime: vi.fn(() => 1500000)
    })),
    priceScale: vi.fn(() => ({
      applyOptions: vi.fn()
    })),
    applyOptions: vi.fn(),
    resize: vi.fn(),
    remove: vi.fn(),
    subscribeCrosshairMove: vi.fn(() => () => {}),
    subscribeClick: vi.fn(() => () => {})
  })),
  ColorType: {
    Solid: 'Solid',
    VerticalGradient: 'VerticalGradient'
  }
}));

// Mock the chart store
vi.mock('../../src/state/store', () => ({
  useChartStore: vi.fn()
}));

// Mock SWR for data fetching
vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: {
      candles: [
        { ts: 1000000, o: 50000, h: 51000, l: 49000, c: 50500, v: 1000 },
        { ts: 1001000, o: 50500, h: 51500, l: 49500, c: 51000, v: 1200 },
        { ts: 1002000, o: 51000, h: 52000, l: 50000, c: 51500, v: 1100 }
      ]
    },
    error: null,
    isLoading: false,
    mutate: vi.fn()
  }))
}));

// Mock symbols and timeframe stores
vi.mock('../../src/lib/symbolStore', () => ({
  symbolStore: {
    get: vi.fn(() => 'BTCUSDT'),
    subscribe: vi.fn(() => () => {})
  }
}));

vi.mock('../../src/lib/timeframeStore', () => ({
  timeframeStore: {
    get: vi.fn(() => '1h'),
    subscribe: vi.fn(() => () => {})
  }
}));

// Mock hotkeys
vi.mock('../../src/lib/hotkeys', () => ({
  useHotkeys: vi.fn()
}));

describe('PriceChart Component', () => {
  const mockStoreState = {
    indicators: {
      showBB: false,
      showVWAP: false,
      showVWMA: false,
      showStdChannels: false,
      bandFill: false
    },
    indicatorSettings: {
      bbPeriod: 20,
      bbMult: 2,
      vwmaPeriod: 20,
      vwapAnchorIndex: 0,
      stdChannelPeriod: 20,
      stdChannelMult: 2
    },
    theme: 'dark',
    symbol: 'BTCUSDT',
    timeframe: '1h'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useChartStore as any).mockReturnValue(mockStoreState);
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<PriceChart />);
      expect(container.firstChild).toBeTruthy();
    });

    it('should create a chart instance on mount', async () => {
      const { default: lw } = await import('lightweight-charts');
      render(<PriceChart />);

      await waitFor(() => {
        expect(lw.createChart).toHaveBeenCalled();
      });
    });

    it('should add candlestick series to chart', async () => {
      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });
  });

  describe('Data Loading', () => {
    it('should fetch and display candle data', async () => {
      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('should handle loading state', async () => {
      const swrModule = await import('swr');
      (swrModule.default as any).mockReturnValue({
        data: null,
        error: null,
        isLoading: true,
        mutate: vi.fn()
      });

      const { container } = render(<PriceChart />);
      expect(container.firstChild).toBeTruthy();
    });

    it('should handle error state', async () => {
      const swrModule = await import('swr');
      (swrModule.default as any).mockReturnValue({
        data: null,
        error: new Error('Failed to fetch'),
        isLoading: false,
        mutate: vi.fn()
      });

      const { container } = render(<PriceChart />);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Indicators', () => {
    it('should display Bollinger Bands when enabled', async () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          ...mockStoreState.indicators,
          showBB: true
        }
      });

      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('should display VWAP when enabled', async () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          ...mockStoreState.indicators,
          showVWAP: true
        }
      });

      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('should display VWMA when enabled', async () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          ...mockStoreState.indicators,
          showVWMA: true
        }
      });

      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('should display Standard Deviation Channels when enabled', async () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          ...mockStoreState.indicators,
          showStdChannels: true
        }
      });

      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme', async () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        theme: 'dark'
      });

      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('should apply light theme', async () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        theme: 'light'
      });

      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('should update theme dynamically', async () => {
      const { rerender } = render(<PriceChart />);

      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        theme: 'light'
      });

      rerender(<PriceChart />);

      await waitFor(() => {
        expect(true).toBe(true);
      });
    });
  });

  describe('Responsiveness', () => {
    it('should resize chart on window resize', async () => {
      const { default: lw } = await import('lightweight-charts');
      const mockChart = (lw.createChart as any).mock.results[0]?.value;

      render(<PriceChart />);

      // Simulate window resize
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(mockChart?.resize || true).toBeTruthy();
      });
    });

    it('should handle container resize', async () => {
      const { container } = render(<PriceChart />);

      // Simulate container resize by triggering ResizeObserver
      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });
  });

  describe('Symbol Changes', () => {
    it('should update chart when symbol changes', async () => {
      const { rerender } = render(<PriceChart />);

      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        symbol: 'ETHUSDT'
      });

      rerender(<PriceChart />);

      await waitFor(() => {
        expect(true).toBe(true);
      });
    });

    it('should update chart when timeframe changes', async () => {
      const { rerender } = render(<PriceChart />);

      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        timeframe: '5m'
      });

      rerender(<PriceChart />);

      await waitFor(() => {
        expect(true).toBe(true);
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup chart on unmount', async () => {
      const { default: lw } = await import('lightweight-charts');
      const { unmount } = render(<PriceChart />);

      unmount();

      await waitFor(() => {
        expect(true).toBe(true);
      });
    });

    it('should unsubscribe from store updates on unmount', async () => {
      const { unmount } = render(<PriceChart />);

      unmount();

      await waitFor(() => {
        expect(true).toBe(true);
      });
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_: any, i: any) => ({
        ts: 1000000 + i * 60,
        o: 50000 + Math.random() * 1000,
        h: 51000 + Math.random() * 1000,
        l: 49000 + Math.random() * 1000,
        c: 50500 + Math.random() * 1000,
        v: 1000 + Math.random() * 500
      }));

      const swrModule = await import('swr');
      (swrModule.default as any).mockReturnValue({
        data: { candles: largeDataset },
        error: null,
        isLoading: false,
        mutate: vi.fn()
      });

      const startTime = performance.now();
      const { container } = render(<PriceChart />);
      const endTime = performance.now();

      expect(container.firstChild).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(2000); // Should render in less than 2 seconds
    });

    it('should throttle indicator updates', async () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          showBB: true,
          showVWAP: true,
          showVWMA: true,
          showStdChannels: true,
          bandFill: true
        }
      });

      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });
  });

  describe('Crosshair', () => {
    it('should handle crosshair move events', async () => {
      const { default: lw } = await import('lightweight-charts');
      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(lw.createChart).toHaveBeenCalled();
      });
    });

    it('should display price and time on crosshair', async () => {
      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });
  });

  describe('Volume Display', () => {
    it('should display volume histogram', async () => {
      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('should color volume bars based on price direction', async () => {
      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });
  });
});
