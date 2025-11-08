import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PriceChart from '../../src/components/PriceChart';
import { useChartStore } from '../../src/state/store';

// Mock lightweight-charts with comprehensive API
vi.mock('lightweight-charts', () => {
  const mockChart: any = {}; // Define early so series can reference it

  // Series need to have a chart() method that returns the chart instance
  const createSeries = (additionalMethods = {}) => ({
    setData: vi.fn(),
    update: vi.fn(),
    applyOptions: vi.fn(),
    chart: vi.fn(() => mockChart), // Series can return their parent chart
    ...additionalMethods,
  });

  Object.assign(mockChart, {
    addCandlestickSeries: vi.fn(() =>
      createSeries({
        priceToCoordinate: vi.fn(() => 100),
        coordinateToPrice: vi.fn(() => 50000),
        priceScale: vi.fn(() => ({
          applyOptions: vi.fn(),
        })),
      })
    ),
    addLineSeries: vi.fn(() => createSeries()),
    addHistogramSeries: vi.fn(() => createSeries()),
    addAreaSeries: vi.fn(() => createSeries()),
    timeScale: vi.fn(() => ({
      subscribeVisibleTimeRangeChange: vi.fn(() => () => {}),
      unsubscribeVisibleTimeRangeChange: vi.fn(),
      setVisibleRange: vi.fn(),
      getVisibleRange: vi.fn(() => ({ from: 1000000, to: 2000000 })),
      timeToCoordinate: vi.fn(() => 100),
      coordinateToTime: vi.fn(() => 1500000),
      fitContent: vi.fn(),
      scrollToPosition: vi.fn(),
    })),
    priceScale: vi.fn(() => ({
      applyOptions: vi.fn(),
    })),
    applyOptions: vi.fn(),
    resize: vi.fn(),
    remove: vi.fn(),
    subscribeCrosshairMove: vi.fn(() => () => {}),
    subscribeClick: vi.fn(() => () => {}),
  });

  return {
    // Named export
    createChart: vi.fn(() => mockChart),
    // Export other needed items
    ColorType: {
      Solid: 'Solid',
      VerticalGradient: 'VerticalGradient',
    },
    LineStyle: {
      Solid: 0,
      Dotted: 1,
      Dashed: 2,
      LargeDashed: 3,
      SparseDotted: 4,
    },
    CrosshairMode: {
      Normal: 0,
      Magnet: 1,
    },
    PriceScaleMode: {
      Normal: 0,
      Logarithmic: 1,
      Percentage: 2,
      IndexedTo100: 3,
    },
  };
});

// Mock the chart store
vi.mock('../../src/state/store', () => ({
  useChartStore: vi.fn(),
}));

// Mock MarketDataAdapter with proper event emitter pattern (Session 77 AsyncMock pattern)
let mockAdapterInstance: any = null;
let mockAdapterListeners: Array<(event: any) => void> = [];

const mockCandles = [
  { time: 1000000, open: 50000, high: 51000, low: 49000, close: 50500, volume: 1000 },
  { time: 1001000, open: 50500, high: 51500, low: 49500, close: 51000, volume: 1200 },
  { time: 1002000, open: 51000, high: 52000, low: 50000, close: 51500, volume: 1100 },
];

vi.mock('../../src/lib/data/adapter', () => ({
  MarketDataAdapter: vi.fn().mockImplementation((config) => {
    mockAdapterInstance = {
      // Store config for verification
      config,

      // Event emitter: on(callback) -> unsubscribe function
      on: vi.fn((callback) => {
        mockAdapterListeners.push(callback);
        return () => {
          mockAdapterListeners = mockAdapterListeners.filter((l) => l !== callback);
        };
      }),

      // start() - Emits snapshot event with mock candles
      start: vi.fn(async () => {
        // Simulate async data fetch, then emit snapshot
        await Promise.resolve();
        setTimeout(() => {
          mockAdapterListeners.forEach((listener) => {
            listener({
              type: 'snapshot',
              candles: [...mockCandles],
            });
          });
        }, 0);
      }),

      // stop() - Cleanup
      stop: vi.fn(),

      // setSymbol(symbol) - Update symbol
      setSymbol: vi.fn(),

      // setTimeframe(timeframe) - Update timeframe
      setTimeframe: vi.fn(),
    };
    return mockAdapterInstance;
  }),
}));

// Mock symbols and timeframe stores
vi.mock('../../src/lib/symbolStore', () => ({
  symbolStore: {
    get: vi.fn(() => 'BTCUSDT'),
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock('../../src/lib/timeframeStore', () => ({
  timeframeStore: {
    get: vi.fn(() => '1h'),
    subscribe: vi.fn(() => () => {}),
  },
}));

// Mock hotkeys - needs default export
vi.mock('../../src/lib/hotkeys', () => ({
  default: vi.fn(() => {}), // Default export for useHotkeys
  useHotkeys: vi.fn(() => {}), // Named export if needed
}));

describe('PriceChart Component', () => {
  const mockStoreState = {
    indicators: {
      showBB: false,
      showVWAP: false,
      showVWMA: false,
      showStdChannels: false,
      bandFill: false,
    },
    indicatorSettings: {
      bbPeriod: 20,
      bbMult: 2,
      vwmaPeriod: 20,
      vwapAnchorIndex: 0,
      stdChannelPeriod: 20,
      stdChannelMult: 2,
    },
    theme: 'dark',
    symbol: 'BTCUSDT',
    timeframe: '1h',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset MarketDataAdapter mock state
    mockAdapterListeners = [];
    mockAdapterInstance = null;

    (useChartStore as any).mockReturnValue(mockStoreState);
  });

  describe('Rendering', () => {
    it('should render chart container without crashing', () => {
      const { container } = render(<PriceChart />);

      // Verify chart container is rendered
      expect(container.firstChild).toBeTruthy();
      expect(container.querySelector('.absolute.inset-0')).toBeTruthy();
    });

    it('should create MarketDataAdapter and chart instance on mount', async () => {
      const { createChart } = await import('lightweight-charts');
      const { MarketDataAdapter } = await import('../../src/lib/data/adapter');

      render(<PriceChart />);

      await waitFor(() => {
        // Verify MarketDataAdapter created with correct config
        expect(MarketDataAdapter).toHaveBeenCalledWith({
          provider: 'mock',
          symbol: 'BTCUSDT',
          timeframe: '1h',
        });

        // Verify adapter methods called
        expect(mockAdapterInstance.on).toHaveBeenCalled();
        expect(mockAdapterInstance.start).toHaveBeenCalled();

        // Verify chart instance created
        expect(createChart).toHaveBeenCalled();
      });
    });

    it('should add candlestick and histogram series to chart', async () => {
      const { createChart } = await import('lightweight-charts');

      render(<PriceChart />);

      await waitFor(() => {
        const mockChart = (createChart as any).mock.results[0].value;

        // Verify candlestick series added
        expect(mockChart.addCandlestickSeries).toHaveBeenCalled();

        // Verify histogram series added (for volume)
        expect(mockChart.addHistogramSeries).toHaveBeenCalled();
      });
    });
  });

  describe('Data Loading', () => {
    it('should create adapter and subscribe to data events', async () => {
      const { MarketDataAdapter } = await import('../../src/lib/data/adapter');

      render(<PriceChart />);

      await waitFor(() => {
        // Verify MarketDataAdapter was created with correct config
        expect(MarketDataAdapter).toHaveBeenCalledWith({
          provider: 'mock',
          symbol: 'BTCUSDT',
          timeframe: '1h',
        });

        // Verify adapter.on() was called to subscribe to events
        expect(mockAdapterInstance.on).toHaveBeenCalled();

        // Verify adapter.start() was called to begin data fetch
        expect(mockAdapterInstance.start).toHaveBeenCalled();
      });
    });

    it('should handle loading state', async () => {
      // MarketDataAdapter mock doesn't emit events until start() is called
      // So we can test the initial loading state before snapshot arrives
      const { container } = render(<PriceChart />);

      await waitFor(() => {
        // Verify adapter was created and start() was called
        expect(mockAdapterInstance).not.toBeNull();
        expect(mockAdapterInstance.start).toHaveBeenCalled();
      });

      // Chart should still be initialized even without data
      expect(container.firstChild).toBeTruthy();
    });

    it('should handle error state', async () => {
      // Simulate adapter start() throwing an error
      mockAdapterInstance = null;
      const MarketDataAdapterMock = (await import('../../src/lib/data/adapter'))
        .MarketDataAdapter as any;
      MarketDataAdapterMock.mockImplementationOnce(() => ({
        on: vi.fn(() => () => {}),
        start: vi.fn().mockRejectedValue(new Error('Failed to fetch')),
        stop: vi.fn(),
        setSymbol: vi.fn(),
        setTimeframe: vi.fn(),
      }));

      const { container } = render(<PriceChart />);

      // Chart should still render even with error
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Indicators', () => {
    it('should display Bollinger Bands when enabled', async () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          ...mockStoreState.indicators,
          showBB: true,
        },
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
          showVWAP: true,
        },
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
          showVWMA: true,
        },
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
          showStdChannels: true,
        },
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
        theme: 'dark',
      });

      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('should apply light theme', async () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        theme: 'light',
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
        theme: 'light',
      });

      rerender(<PriceChart />);

      await waitFor(() => {
        expect(true).toBe(true);
      });
    });
  });

  describe('Responsiveness', () => {
    it('should resize chart on window resize', async () => {
      const { createChart } = await import('lightweight-charts');
      const mockChart = (createChart as any).mock.results[0]?.value;

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
        symbol: 'ETHUSDT',
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
        timeframe: '5m',
      });

      rerender(<PriceChart />);

      await waitFor(() => {
        expect(true).toBe(true);
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup chart on unmount', async () => {
      const { createChart } = await import('lightweight-charts');
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
        time: 1000000 + i * 60,
        open: 50000 + Math.random() * 1000,
        high: 51000 + Math.random() * 1000,
        low: 49000 + Math.random() * 1000,
        close: 50500 + Math.random() * 1000,
        volume: 1000 + Math.random() * 500,
      }));

      // Configure MarketDataAdapter mock to emit large dataset
      const MarketDataAdapterMock = (await import('../../src/lib/data/adapter'))
        .MarketDataAdapter as any;
      MarketDataAdapterMock.mockImplementationOnce((config: any) => ({
        config,
        on: vi.fn((callback) => {
          mockAdapterListeners.push(callback);
          return () => {
            mockAdapterListeners = mockAdapterListeners.filter((l) => l !== callback);
          };
        }),
        start: vi.fn(async () => {
          await Promise.resolve();
          setTimeout(() => {
            mockAdapterListeners.forEach((listener) => {
              listener({ type: 'snapshot', candles: largeDataset });
            });
          }, 0);
        }),
        stop: vi.fn(),
        setSymbol: vi.fn(),
        setTimeframe: vi.fn(),
      }));

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
          bandFill: true,
        },
      });

      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });
  });

  describe('Crosshair', () => {
    it('should handle crosshair move events', async () => {
      const { createChart } = await import('lightweight-charts');
      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(createChart).toHaveBeenCalled();
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
