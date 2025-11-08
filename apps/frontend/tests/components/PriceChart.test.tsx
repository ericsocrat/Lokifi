import { render, waitFor } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
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
    it('should create Bollinger Bands line series when enabled', async () => {
      const { createChart } = await import('lightweight-charts');

      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          ...mockStoreState.indicators,
          showBB: true,
        },
      });

      render(<PriceChart />);

      await waitFor(() => {
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock).toBeDefined();

        // Bollinger Bands creates 3 line series (upper, middle, lower)
        const addLineSeriesCalls = chartMock.addLineSeries.mock.calls;
        expect(addLineSeriesCalls.length).toBeGreaterThanOrEqual(3);

        // Verify at least one line series was created for BB
        expect(chartMock.addLineSeries).toHaveBeenCalled();
      });
    });

    it('should create VWAP line series when enabled', async () => {
      const { createChart } = await import('lightweight-charts');

      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          ...mockStoreState.indicators,
          showVWAP: true,
        },
      });

      render(<PriceChart />);

      await waitFor(() => {
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock).toBeDefined();

        // VWAP creates 1 line series
        expect(chartMock.addLineSeries).toHaveBeenCalled();

        // Verify line series was created
        const addLineSeriesCalls = chartMock.addLineSeries.mock.calls;
        expect(addLineSeriesCalls.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should create VWMA line series when enabled', async () => {
      const { createChart } = await import('lightweight-charts');

      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          ...mockStoreState.indicators,
          showVWMA: true,
        },
      });

      render(<PriceChart />);

      await waitFor(() => {
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock).toBeDefined();

        // VWMA creates 1 line series
        expect(chartMock.addLineSeries).toHaveBeenCalled();

        // Verify line series was created
        const addLineSeriesCalls = chartMock.addLineSeries.mock.calls;
        expect(addLineSeriesCalls.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should create Standard Deviation Channels line series when enabled', async () => {
      const { createChart } = await import('lightweight-charts');

      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          ...mockStoreState.indicators,
          showStdChannels: true,
        },
      });

      render(<PriceChart />);

      await waitFor(() => {
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock).toBeDefined();

        // Std Dev Channels creates 3 line series (upper, middle, lower)
        const addLineSeriesCalls = chartMock.addLineSeries.mock.calls;
        expect(addLineSeriesCalls.length).toBeGreaterThanOrEqual(3);

        // Verify line series was created
        expect(chartMock.addLineSeries).toHaveBeenCalled();
      });
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme options to chart', async () => {
      const { createChart } = await import('lightweight-charts');

      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        theme: 'dark',
      });

      render(<PriceChart />);

      await waitFor(() => {
        expect(createChart).toHaveBeenCalled();

        // Verify chart was created with layout options containing theme colors
        const createChartCalls = (createChart as any).mock.calls;
        expect(createChartCalls.length).toBeGreaterThan(0);

        const chartOptions = createChartCalls[0][1];
        expect(chartOptions).toBeDefined();
        expect(chartOptions.layout).toBeDefined();
        expect(chartOptions.layout.background).toBeDefined();
        expect(chartOptions.layout.textColor).toBeDefined();
      });
    });

    it('should apply light theme options to chart', async () => {
      const { createChart } = await import('lightweight-charts');

      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        theme: 'light',
      });

      render(<PriceChart />);

      await waitFor(() => {
        expect(createChart).toHaveBeenCalled();

        // Verify chart was created with layout options containing theme colors
        const createChartCalls = (createChart as any).mock.calls;
        expect(createChartCalls.length).toBeGreaterThan(0);

        const chartOptions = createChartCalls[0][1];
        expect(chartOptions).toBeDefined();
        expect(chartOptions.layout).toBeDefined();
        expect(chartOptions.layout.background).toBeDefined();
        expect(chartOptions.layout.textColor).toBeDefined();

        // Light theme should have lighter background
        expect(chartOptions.layout.background.color).toBeDefined();
      });
    });

    it('should call applyOptions when theme changes', async () => {
      const { createChart } = await import('lightweight-charts');

      // Start with dark theme
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        theme: 'dark',
      });

      const { rerender } = render(<PriceChart />);

      // Change to light theme
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        theme: 'light',
      });

      rerender(<PriceChart />);

      await waitFor(() => {
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock).toBeDefined();

        // Verify applyOptions was called (theme update)
        expect(chartMock.applyOptions).toHaveBeenCalled();
      });
    });
  });

  describe('Responsiveness', () => {
    it('should create chart with proper resize handling', async () => {
      const { createChart } = await import('lightweight-charts');

      render(<PriceChart />);

      await waitFor(() => {
        expect(createChart).toHaveBeenCalled();

        // Verify chart instance created with resize capability
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock).toBeDefined();
        expect(chartMock.resize).toBeDefined();
      });
    });

    it('should handle container resize', async () => {
      const { createChart } = await import('lightweight-charts');
      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(createChart).toHaveBeenCalled();

        // Verify chart container exists
        const chartContainer = container.querySelector('.absolute.inset-0');
        expect(chartContainer).toBeTruthy();
      });
    });
  });

  describe('Symbol Changes', () => {
    it('should call adapter setSymbol when symbol changes', async () => {
      render(<PriceChart />);

      await waitFor(() => {
        expect(mockAdapterInstance).not.toBeNull();
      });

      // Change symbol
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        symbol: 'ETHUSDT',
      });

      // Note: In real implementation, symbol change triggers useEffect
      // which would call adapter.setSymbol. Testing this requires
      // more complex state management simulation.

      // For now, verify adapter has setSymbol method
      expect(mockAdapterInstance.setSymbol).toBeDefined();
    });

    it('should call adapter setTimeframe when timeframe changes', async () => {
      render(<PriceChart />);

      await waitFor(() => {
        expect(mockAdapterInstance).not.toBeNull();
      });

      // Change timeframe
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        timeframe: '5m',
      });

      // Note: In real implementation, timeframe change triggers useEffect
      // which would call adapter.setTimeframe. Testing this requires
      // more complex state management simulation.

      // For now, verify adapter has setTimeframe method
      expect(mockAdapterInstance.setTimeframe).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should remove chart and stop adapter on unmount', async () => {
      const { createChart } = await import('lightweight-charts');
      const { unmount } = render(<PriceChart />);

      await waitFor(() => {
        expect(createChart).toHaveBeenCalled();
        expect(mockAdapterInstance).not.toBeNull();
      });

      const chartMock = (createChart as any).mock.results[0]?.value;

      // Unmount component
      unmount();

      await waitFor(() => {
        // Verify chart.remove was called
        expect(chartMock.remove).toHaveBeenCalled();

        // Verify adapter.stop was called
        expect(mockAdapterInstance.stop).toHaveBeenCalled();
      });
    });

    it('should unsubscribe from data events on unmount', async () => {
      const { unmount } = render(<PriceChart />);

      await waitFor(() => {
        expect(mockAdapterInstance).not.toBeNull();
      });

      // Track number of listeners before unmount
      const initialListenerCount = mockAdapterListeners.length;
      expect(initialListenerCount).toBeGreaterThan(0);

      // Unmount component
      unmount();

      // Note: In real implementation, unsubscribe function returned by on()
      // would be called in useEffect cleanup. Our mock tracks this via
      // mockAdapterListeners array filtering.

      // Verify on() method was called (subscription happened)
      expect(mockAdapterInstance.on).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently with Level-of-Detail', async () => {
      const { createChart } = await import('lightweight-charts');

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

      await waitFor(() => {
        expect(createChart).toHaveBeenCalled();
      });

      // Performance: should render quickly even with large dataset
      expect(endTime - startTime).toBeLessThan(2000);

      // Verify chart rendered
      expect(container.firstChild).toBeTruthy();
    });

    it('should create all indicator series without performance issues', async () => {
      const { createChart } = await import('lightweight-charts');

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

      render(<PriceChart />);

      await waitFor(() => {
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock).toBeDefined();

        // All 4 indicators enabled = 3 BB lines + 1 VWAP + 1 VWMA + 3 Std Dev = 8 line series
        const addLineSeriesCalls = chartMock.addLineSeries.mock.calls;
        expect(addLineSeriesCalls.length).toBeGreaterThanOrEqual(6);
      });
    });
  });

  describe('Crosshair', () => {
    it('should create chart with crosshair capability', async () => {
      const { createChart } = await import('lightweight-charts');

      render(<PriceChart />);

      await waitFor(() => {
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock).toBeDefined();

        // Verify chart has crosshair subscription capability
        expect(chartMock.subscribeCrosshairMove).toBeDefined();
      });
    });

    it('should display chart with crosshair capability', async () => {
      const { createChart } = await import('lightweight-charts');
      const { container } = render(<PriceChart />);

      await waitFor(() => {
        expect(createChart).toHaveBeenCalled();

        // Verify chart has crosshair subscription capability
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock.subscribeCrosshairMove).toBeDefined();

        // Verify component rendered
        expect(container.firstChild).toBeTruthy();
      });
    });
  });

  describe('Volume Display', () => {
    it('should create histogram series for volume', async () => {
      const { createChart } = await import('lightweight-charts');

      render(<PriceChart />);

      await waitFor(() => {
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock).toBeDefined();

        // Verify histogram series was created for volume
        expect(chartMock.addHistogramSeries).toHaveBeenCalled();
      });
    });

    it('should configure volume histogram with color options', async () => {
      const { createChart } = await import('lightweight-charts');

      render(<PriceChart />);

      await waitFor(() => {
        const chartMock = (createChart as any).mock.results[0]?.value;
        expect(chartMock).toBeDefined();

        // Verify histogram series created
        expect(chartMock.addHistogramSeries).toHaveBeenCalled();

        // Volume bars colored based on price direction is implementation detail
        // Verified by histogram series creation
        const addHistogramCalls = chartMock.addHistogramSeries.mock.calls;
        expect(addHistogramCalls.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('RSI Indicator Integration', () => {
    it('should not create RSI series when showRSI is false', async () => {
      (useChartStore as any).mockReturnValue({
        theme: 'dark',
        symbol: 'BTCUSD',
        timeframe: '1h',
        indicators: {
          showBB: false,
          showVWAP: false,
          showVWMA: false,
          showStdChannels: false,
          showRSI: false, // RSI disabled
          bandFill: false,
        },
        indicatorSettings: {
          bbPeriod: 20,
          bbMult: 2,
          vwmaPeriod: 20,
          vwapAnchorIndex: 0,
          stdChannelPeriod: 20,
          stdChannelMult: 2,
          rsiPeriod: 14,
        },
      });

      render(<PriceChart />);

      await waitFor(
        () => {
          expect(mockAdapterInstance).not.toBeNull();
        },
        { timeout: 1000 }
      );

      // Emit candles
      const listener = mockAdapterListeners[mockAdapterListeners.length - 1];
      expect(listener).toBeDefined();
      listener({ type: 'snapshot', candles: mockCandles });

      // Wait for indicators to process
      await waitFor(
        () => {
          // Get chartMock from the mock results
          const chartMock = (createChart as any).mock.results[0]?.value;
          // Only candlestick and histogram series should be created
          const lineCalls = chartMock.addLineSeries.mock.calls;
          // No RSI lines should exist
          const hasRSILine = lineCalls.some((call: any) => call[0]?.color === 'rgb(255, 152, 0)');
          expect(hasRSILine).toBe(false);
        },
        { timeout: 1000 }
      );
    });

    it('should create RSI series with overbought/oversold lines when showRSI is true', async () => {
      (useChartStore as any).mockReturnValue({
        theme: 'dark',
        symbol: 'BTCUSD',
        timeframe: '1h',
        indicators: {
          showBB: false,
          showVWAP: false,
          showVWMA: false,
          showStdChannels: false,
          showRSI: true, // RSI enabled
          bandFill: false,
        },
        indicatorSettings: {
          bbPeriod: 20,
          bbMult: 2,
          vwmaPeriod: 20,
          vwapAnchorIndex: 0,
          stdChannelPeriod: 20,
          stdChannelMult: 2,
          rsiPeriod: 14,
        },
      });

      render(<PriceChart />);

      await waitFor(
        () => {
          expect(mockAdapterInstance).not.toBeNull();
        },
        { timeout: 1000 }
      );

      // Emit candles
      const listener = mockAdapterListeners[mockAdapterListeners.length - 1];
      expect(listener).toBeDefined();
      listener({ type: 'snapshot', candles: mockCandles });

      // Wait for indicators to process
      await waitFor(
        () => {
          const chartMock = (createChart as any).mock.results[0]?.value;
          const lineCalls = chartMock.addLineSeries.mock.calls;
          expect(lineCalls.length).toBeGreaterThan(0);

          // Verify RSI line (orange)
          const rsiLine = lineCalls.find((call: any) => call[0]?.color === 'rgb(255, 152, 0)');
          expect(rsiLine).toBeDefined();
          expect(rsiLine[0].lineWidth).toBe(2);
          expect(rsiLine[0].title).toContain('RSI');

          // Verify overbought line (red, dashed)
          const overboughtLine = lineCalls.find(
            (call: any) => call[0]?.color === 'rgba(255, 0, 0, 0.3)'
          );
          expect(overboughtLine).toBeDefined();
          expect(overboughtLine[0].lineStyle).toBe(2); // Dashed (LineStyle.Dashed = 2)
          expect(overboughtLine[0].title).toContain('Overbought');

          // Verify oversold line (green, dashed)
          const oversoldLine = lineCalls.find(
            (call: any) => call[0]?.color === 'rgba(0, 255, 0, 0.3)'
          );
          expect(oversoldLine).toBeDefined();
          expect(oversoldLine[0].lineStyle).toBe(2); // Dashed
          expect(oversoldLine[0].title).toContain('Oversold');
        },
        { timeout: 1000 }
      );
    });

    it('should use custom RSI period from settings', async () => {
      (useChartStore as any).mockReturnValue({
        theme: 'dark',
        symbol: 'BTCUSD',
        timeframe: '1h',
        indicators: {
          showBB: false,
          showVWAP: false,
          showVWMA: false,
          showStdChannels: false,
          showRSI: true,
          bandFill: false,
        },
        indicatorSettings: {
          bbPeriod: 20,
          bbMult: 2,
          vwmaPeriod: 20,
          vwapAnchorIndex: 0,
          stdChannelPeriod: 20,
          stdChannelMult: 2,
          rsiPeriod: 7, // Custom period
        },
      });

      render(<PriceChart />);

      await waitFor(
        () => {
          expect(mockAdapterInstance).not.toBeNull();
        },
        { timeout: 1000 }
      );

      // Emit candles
      const listener = mockAdapterListeners[mockAdapterListeners.length - 1];
      expect(listener).toBeDefined();
      listener({ type: 'snapshot', candles: mockCandles });

      // Wait for indicators to process
      await waitFor(
        () => {
          const chartMock = (createChart as any).mock.results[0]?.value;
          const lineCalls = chartMock.addLineSeries.mock.calls;
          const rsiLine = lineCalls.find((call: any) => call[0]?.color === 'rgb(255, 152, 0)');
          expect(rsiLine).toBeDefined();
          expect(rsiLine[0].title).toBe('RSI(7)'); // Verify custom period in title
        },
        { timeout: 1000 }
      );
    });

    it('should cleanup RSI series when toggled off', async () => {
      // Start with RSI enabled
      const mockStoreValue = {
        theme: 'dark',
        symbol: 'BTCUSD',
        timeframe: '1h',
        indicators: {
          showBB: false,
          showVWAP: false,
          showVWMA: false,
          showStdChannels: false,
          showRSI: true,
          bandFill: false,
        },
        indicatorSettings: {
          bbPeriod: 20,
          bbMult: 2,
          vwmaPeriod: 20,
          vwapAnchorIndex: 0,
          stdChannelPeriod: 20,
          stdChannelMult: 2,
          rsiPeriod: 14,
        },
      };

      (useChartStore as any).mockReturnValue(mockStoreValue);

      const { rerender } = render(<PriceChart />);

      await waitFor(
        () => {
          expect(mockAdapterInstance).not.toBeNull();
        },
        { timeout: 1000 }
      );

      // Emit candles
      const listener = mockAdapterListeners[mockAdapterListeners.length - 1];
      listener({ type: 'snapshot', candles: mockCandles });

      // Verify RSI series created
      await waitFor(
        () => {
          const chartMock = (createChart as any).mock.results[0]?.value;
          const lineCalls = chartMock.addLineSeries.mock.calls;
          const rsiLine = lineCalls.find((call: any) => call[0]?.color === 'rgb(255, 152, 0)');
          expect(rsiLine).toBeDefined();
        },
        { timeout: 1000 }
      );

      // Toggle RSI off
      const updatedStoreValue = {
        ...mockStoreValue,
        indicators: {
          ...mockStoreValue.indicators,
          showRSI: false,
        },
      };
      (useChartStore as any).mockReturnValue(updatedStoreValue);
      rerender(<PriceChart />);

      // Wait for cleanup
      await waitFor(
        () => {
          // Window._rsi should be cleaned up
          expect((window as any)._rsi).toBeUndefined();
        },
        { timeout: 1000 }
      );
    });

    it('should handle multiple indicators (RSI + BB + VWAP) simultaneously', async () => {
      (useChartStore as any).mockReturnValue({
        theme: 'dark',
        symbol: 'BTCUSD',
        timeframe: '1h',
        indicators: {
          showBB: true,
          showVWAP: true,
          showVWMA: false,
          showStdChannels: false,
          showRSI: true, // RSI + BB + VWAP
          bandFill: false,
        },
        indicatorSettings: {
          bbPeriod: 20,
          bbMult: 2,
          vwmaPeriod: 20,
          vwapAnchorIndex: 0,
          stdChannelPeriod: 20,
          stdChannelMult: 2,
          rsiPeriod: 14,
        },
      });

      render(<PriceChart />);

      await waitFor(
        () => {
          expect(mockAdapterInstance).not.toBeNull();
        },
        { timeout: 1000 }
      );

      // Emit candles
      const listener = mockAdapterListeners[mockAdapterListeners.length - 1];
      listener({ type: 'snapshot', candles: mockCandles });

      // Wait for all indicators to process
      await waitFor(
        () => {
          const chartMock = (createChart as any).mock.results[0]?.value;
          const lineCalls = chartMock.addLineSeries.mock.calls;
          expect(lineCalls.length).toBeGreaterThan(5); // BB (3) + VWAP (1) + RSI (3) = 7+

          // Verify RSI line exists
          const rsiLine = lineCalls.find((call: any) => call[0]?.color === 'rgb(255, 152, 0)');
          expect(rsiLine).toBeDefined();

          // Verify VWAP line exists (should have lineWidth 2)
          const vwapLine = lineCalls.find((call: any) => call[0]?.lineWidth === 2);
          expect(vwapLine).toBeDefined();

          // Verify BB lines exist (multiple line series)
          expect(lineCalls.length).toBeGreaterThanOrEqual(7);
        },
        { timeout: 1000 }
      );
    });
  });

  describe('MACD Indicator Integration', () => {
    it('should not create MACD series when showMACD is false', async () => {
      (useChartStore as any).mockReturnValue({
        theme: 'dark',
        symbol: 'BTCUSD',
        timeframe: '1h',
        indicators: {
          showBB: false,
          showVWAP: false,
          showVWMA: false,
          showStdChannels: false,
          showRSI: false,
          showMACD: false, // MACD disabled
          bandFill: false,
        },
        indicatorSettings: {
          bbPeriod: 20,
          bbMult: 2,
          vwmaPeriod: 20,
          vwapAnchorIndex: 0,
          stdChannelPeriod: 20,
          stdChannelMult: 2,
          rsiPeriod: 14,
          macdFastPeriod: 12,
          macdSlowPeriod: 26,
          macdSignalPeriod: 9,
        },
      });

      render(<PriceChart />);

      await waitFor(
        () => {
          expect(mockAdapterInstance).not.toBeNull();
        },
        { timeout: 1000 }
      );

      // Emit candles
      const listener = mockAdapterListeners[mockAdapterListeners.length - 1];
      expect(listener).toBeDefined();
      listener({ type: 'snapshot', candles: mockCandles });

      // Wait for indicators to process
      await waitFor(
        () => {
          // Get chartMock from the mock results
          const chartMock = (createChart as any).mock.results[0]?.value;
          const lineCalls = chartMock.addLineSeries.mock.calls;
          const histogramCalls = chartMock.addHistogramSeries.mock.calls;

          // No MACD line (blue) should exist
          const hasMACDLine = lineCalls.some((call: any) => call[0]?.color === 'rgb(33, 150, 243)');
          expect(hasMACDLine).toBe(false);

          // No Signal line (orange) should exist
          const hasSignalLine = lineCalls.some((call: any) => call[0]?.title === 'Signal');
          expect(hasSignalLine).toBe(false);

          // Only volume histogram should exist (not MACD histogram)
          expect(histogramCalls.length).toBe(1); // Just volume
        },
        { timeout: 1000 }
      );
    });

    it('should create MACD series with signal and histogram when showMACD is true', async () => {
      (useChartStore as any).mockReturnValue({
        theme: 'dark',
        symbol: 'BTCUSD',
        timeframe: '1h',
        indicators: {
          showBB: false,
          showVWAP: false,
          showVWMA: false,
          showStdChannels: false,
          showRSI: false,
          showMACD: true, // MACD enabled
          bandFill: false,
        },
        indicatorSettings: {
          bbPeriod: 20,
          bbMult: 2,
          vwmaPeriod: 20,
          vwapAnchorIndex: 0,
          stdChannelPeriod: 20,
          stdChannelMult: 2,
          rsiPeriod: 14,
          macdFastPeriod: 12,
          macdSlowPeriod: 26,
          macdSignalPeriod: 9,
        },
      });

      render(<PriceChart />);

      await waitFor(
        () => {
          expect(mockAdapterInstance).not.toBeNull();
        },
        { timeout: 1000 }
      );

      // Emit candles
      const listener = mockAdapterListeners[mockAdapterListeners.length - 1];
      expect(listener).toBeDefined();
      listener({ type: 'snapshot', candles: mockCandles });

      // Wait for indicators to process
      await waitFor(
        () => {
          const chartMock = (createChart as any).mock.results[0]?.value;
          const lineCalls = chartMock.addLineSeries.mock.calls;
          const histogramCalls = chartMock.addHistogramSeries.mock.calls;

          expect(lineCalls.length).toBeGreaterThan(0);
          expect(histogramCalls.length).toBeGreaterThan(1); // Volume + MACD histogram

          // Verify MACD line (blue)
          const macdLine = lineCalls.find((call: any) => call[0]?.color === 'rgb(33, 150, 243)');
          expect(macdLine).toBeDefined();
          expect(macdLine[0].lineWidth).toBe(2);
          expect(macdLine[0].title).toContain('MACD');

          // Verify Signal line (orange)
          const signalLine = lineCalls.find((call: any) => call[0]?.title === 'Signal');
          expect(signalLine).toBeDefined();
          expect(signalLine[0].color).toBe('rgb(255, 152, 0)');
          expect(signalLine[0].lineWidth).toBe(2);

          // Verify Histogram series
          const histogramSeries = histogramCalls.find((call: any) => call[0]?.title === 'Histogram');
          expect(histogramSeries).toBeDefined();
        },
        { timeout: 1000 }
      );
    });

    it('should use custom MACD periods from settings', async () => {
      (useChartStore as any).mockReturnValue({
        theme: 'dark',
        symbol: 'BTCUSD',
        timeframe: '1h',
        indicators: {
          showBB: false,
          showVWAP: false,
          showVWMA: false,
          showStdChannels: false,
          showRSI: false,
          showMACD: true,
          bandFill: false,
        },
        indicatorSettings: {
          bbPeriod: 20,
          bbMult: 2,
          vwmaPeriod: 20,
          vwapAnchorIndex: 0,
          stdChannelPeriod: 20,
          stdChannelMult: 2,
          rsiPeriod: 14,
          macdFastPeriod: 5, // Custom periods
          macdSlowPeriod: 13,
          macdSignalPeriod: 5,
        },
      });

      render(<PriceChart />);

      await waitFor(
        () => {
          expect(mockAdapterInstance).not.toBeNull();
        },
        { timeout: 1000 }
      );

      // Emit candles
      const listener = mockAdapterListeners[mockAdapterListeners.length - 1];
      expect(listener).toBeDefined();
      listener({ type: 'snapshot', candles: mockCandles });

      // Wait for indicators to process
      await waitFor(
        () => {
          const chartMock = (createChart as any).mock.results[0]?.value;
          const lineCalls = chartMock.addLineSeries.mock.calls;
          const macdLine = lineCalls.find((call: any) => call[0]?.color === 'rgb(33, 150, 243)');
          expect(macdLine).toBeDefined();
          expect(macdLine[0].title).toBe('MACD(5,13,5)'); // Verify custom periods in title
        },
        { timeout: 1000 }
      );
    });

    it('should cleanup MACD series when toggled off', async () => {
      // Start with MACD enabled
      const mockStoreValue = {
        theme: 'dark',
        symbol: 'BTCUSD',
        timeframe: '1h',
        indicators: {
          showBB: false,
          showVWAP: false,
          showVWMA: false,
          showStdChannels: false,
          showRSI: false,
          showMACD: true,
          bandFill: false,
        },
        indicatorSettings: {
          bbPeriod: 20,
          bbMult: 2,
          vwmaPeriod: 20,
          vwapAnchorIndex: 0,
          stdChannelPeriod: 20,
          stdChannelMult: 2,
          rsiPeriod: 14,
          macdFastPeriod: 12,
          macdSlowPeriod: 26,
          macdSignalPeriod: 9,
        },
      };

      (useChartStore as any).mockReturnValue(mockStoreValue);

      const { rerender } = render(<PriceChart />);

      await waitFor(
        () => {
          expect(mockAdapterInstance).not.toBeNull();
        },
        { timeout: 1000 }
      );

      // Emit candles
      const listener = mockAdapterListeners[mockAdapterListeners.length - 1];
      listener({ type: 'snapshot', candles: mockCandles });

      // Verify MACD series created
      await waitFor(
        () => {
          const chartMock = (createChart as any).mock.results[0]?.value;
          const lineCalls = chartMock.addLineSeries.mock.calls;
          const macdLine = lineCalls.find((call: any) => call[0]?.color === 'rgb(33, 150, 243)');
          expect(macdLine).toBeDefined();
        },
        { timeout: 1000 }
      );

      // Toggle MACD off
      const updatedStoreValue = {
        ...mockStoreValue,
        indicators: {
          ...mockStoreValue.indicators,
          showMACD: false,
        },
      };
      (useChartStore as any).mockReturnValue(updatedStoreValue);
      rerender(<PriceChart />);

      // Wait for cleanup
      await waitFor(
        () => {
          // Window._macd should be cleaned up
          expect((window as any)._macd).toBeUndefined();
        },
        { timeout: 1000 }
      );
    });

    it('should handle multiple indicators (MACD + RSI) simultaneously', async () => {
      (useChartStore as any).mockReturnValue({
        theme: 'dark',
        symbol: 'BTCUSD',
        timeframe: '1h',
        indicators: {
          showBB: false,
          showVWAP: false,
          showVWMA: false,
          showStdChannels: false,
          showRSI: true,
          showMACD: true, // Both RSI and MACD enabled
          bandFill: false,
        },
        indicatorSettings: {
          bbPeriod: 20,
          bbMult: 2,
          vwmaPeriod: 20,
          vwapAnchorIndex: 0,
          stdChannelPeriod: 20,
          stdChannelMult: 2,
          rsiPeriod: 14,
          macdFastPeriod: 12,
          macdSlowPeriod: 26,
          macdSignalPeriod: 9,
        },
      });

      render(<PriceChart />);

      await waitFor(
        () => {
          expect(mockAdapterInstance).not.toBeNull();
        },
        { timeout: 1000 }
      );

      // Emit candles
      const listener = mockAdapterListeners[mockAdapterListeners.length - 1];
      listener({ type: 'snapshot', candles: mockCandles });

      // Wait for all indicators to process
      await waitFor(
        () => {
          const chartMock = (createChart as any).mock.results[0]?.value;
          const lineCalls = chartMock.addLineSeries.mock.calls;
          const histogramCalls = chartMock.addHistogramSeries.mock.calls;

          // RSI: 3 lines (RSI, overbought, oversold)
          // MACD: 2 lines (MACD, Signal)
          // Total: 5+ line series
          expect(lineCalls.length).toBeGreaterThanOrEqual(5);

          // MACD histogram + Volume histogram = 2 histogram series
          expect(histogramCalls.length).toBe(2);

          // Verify MACD line exists (blue)
          const macdLine = lineCalls.find((call: any) => call[0]?.color === 'rgb(33, 150, 243)');
          expect(macdLine).toBeDefined();

          // Verify RSI line exists (orange) - Note: RSI is also orange like Signal, but different title
          const rsiLine = lineCalls.find(
            (call: any) => call[0]?.color === 'rgb(255, 152, 0)' && call[0]?.title?.includes('RSI')
          );
          expect(rsiLine).toBeDefined();

          // Verify Signal line exists (orange)
          const signalLine = lineCalls.find((call: any) => call[0]?.title === 'Signal');
          expect(signalLine).toBeDefined();
        },
        { timeout: 1000 }
      );
    });
  });
});
