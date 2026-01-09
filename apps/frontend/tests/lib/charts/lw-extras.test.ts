// tests/lib/charts/lw-extras.test.ts
import * as priceFeedModule from '@/api/price-feed';
import * as chartMapModule from '@/lib/charts/chartMap';
import { wireLightweightChartsExtras } from '@/lib/charts/lw-extras';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/charts/chartMap', () => ({
  setVisibleBarCoords: vi.fn(),
}));

vi.mock('@/api/price-feed', () => ({
  startPriceFeed: vi.fn(() => vi.fn()),
}));

describe('wireLightweightChartsExtras', () => {
  let mockChart: ReturnType<typeof createMockChart>;
  let mockSeries: Record<string, unknown>;
  let mockGetSeriesData: ReturnType<typeof vi.fn>;
  let mockGetLastPrice: ReturnType<typeof vi.fn>;

  function createMockChart() {
    const subscribeTimeRange = vi.fn();
    const subscribeLogicalRange = vi.fn();
    const unsubscribeTimeRange = vi.fn();
    const unsubscribeLogicalRange = vi.fn();
    const getVisibleRange = vi.fn();
    const timeToCoordinate = vi.fn();

    return {
      timeScale: vi.fn(() => ({
        subscribeVisibleTimeRangeChange: subscribeTimeRange,
        subscribeVisibleLogicalRangeChange: subscribeLogicalRange,
        unsubscribeVisibleTimeRangeChange: unsubscribeTimeRange,
        unsubscribeVisibleLogicalRangeChange: unsubscribeLogicalRange,
        getVisibleRange,
        timeToCoordinate,
      })),
      _subscribeTimeRange: subscribeTimeRange,
      _subscribeLogicalRange: subscribeLogicalRange,
      _unsubscribeTimeRange: unsubscribeTimeRange,
      _unsubscribeLogicalRange: unsubscribeLogicalRange,
      _getVisibleRange: getVisibleRange,
      _timeToCoordinate: timeToCoordinate,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockChart = createMockChart();
    mockSeries = {};
    mockGetSeriesData = vi.fn(() => []);
    mockGetLastPrice = vi.fn(() => 100);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('returns noop cleanup when chart is null', () => {
      const cleanup = wireLightweightChartsExtras(
        null,
        mockSeries,
        mockGetSeriesData,
        mockGetLastPrice
      );
      expect(cleanup).toBeInstanceOf(Function);
      // Should not throw
      cleanup();
      expect(priceFeedModule.startPriceFeed).not.toHaveBeenCalled();
    });

    it('returns noop cleanup when series is null', () => {
      const cleanup = wireLightweightChartsExtras(
        mockChart,
        null,
        mockGetSeriesData,
        mockGetLastPrice
      );
      expect(cleanup).toBeInstanceOf(Function);
      cleanup();
      expect(priceFeedModule.startPriceFeed).not.toHaveBeenCalled();
    });

    it('subscribes to visible range changes', () => {
      wireLightweightChartsExtras(mockChart, mockSeries, mockGetSeriesData, mockGetLastPrice);
      expect(mockChart._subscribeTimeRange).toHaveBeenCalled();
      expect(mockChart._subscribeLogicalRange).toHaveBeenCalled();
    });

    it('starts the price feed', () => {
      wireLightweightChartsExtras(mockChart, mockSeries, mockGetSeriesData, mockGetLastPrice);
      expect(priceFeedModule.startPriceFeed).toHaveBeenCalledWith(mockGetLastPrice, 500);
    });

    it('calls collectBarXs immediately on init', () => {
      wireLightweightChartsExtras(mockChart, mockSeries, mockGetSeriesData, mockGetLastPrice);
      expect(chartMapModule.setVisibleBarCoords).toHaveBeenCalled();
    });
  });

  describe('collectBarXs', () => {
    it('sets empty bar coords when series data is empty', () => {
      mockGetSeriesData.mockReturnValue([]);
      wireLightweightChartsExtras(mockChart, mockSeries, mockGetSeriesData, mockGetLastPrice);
      expect(chartMapModule.setVisibleBarCoords).toHaveBeenCalledWith([]);
    });

    it('sets empty bar coords when getSeriesData returns null', () => {
      mockGetSeriesData.mockReturnValue(null);
      wireLightweightChartsExtras(mockChart, mockSeries, mockGetSeriesData, mockGetLastPrice);
      expect(chartMapModule.setVisibleBarCoords).toHaveBeenCalledWith([]);
    });

    it('collects bar X coordinates from visible range', () => {
      const mockData = [
        { time: 1000, open: 10, high: 11, low: 9, close: 10.5 },
        { time: 1001, open: 10.5, high: 12, low: 10, close: 11 },
        { time: 1002, open: 11, high: 11.5, low: 10.5, close: 11.2 },
      ];
      mockGetSeriesData.mockReturnValue(mockData);
      mockChart._getVisibleRange.mockReturnValue({ from: 0, to: 2 });
      mockChart._timeToCoordinate.mockImplementation((time: number) => time - 1000 + 100);

      wireLightweightChartsExtras(mockChart, mockSeries, mockGetSeriesData, mockGetLastPrice);

      // Should have collected X coords for each bar
      expect(chartMapModule.setVisibleBarCoords).toHaveBeenCalledWith([100, 101, 102]);
    });

    it('filters out non-finite X coordinates', () => {
      const mockData = [
        { time: 1000, open: 10, high: 11, low: 9, close: 10.5 },
        { time: 1001, open: 10.5, high: 12, low: 10, close: 11 },
      ];
      mockGetSeriesData.mockReturnValue(mockData);
      mockChart._getVisibleRange.mockReturnValue({ from: 0, to: 1 });
      mockChart._timeToCoordinate.mockReturnValueOnce(100).mockReturnValueOnce(NaN);

      wireLightweightChartsExtras(mockChart, mockSeries, mockGetSeriesData, mockGetLastPrice);

      expect(chartMapModule.setVisibleBarCoords).toHaveBeenCalledWith([100]);
    });

    it('uses last 400 bars when visible range is invalid', () => {
      const mockData = Array.from({ length: 500 }, (_, i) => ({
        time: 1000 + i,
        open: 10,
        high: 11,
        low: 9,
        close: 10.5,
      }));
      mockGetSeriesData.mockReturnValue(mockData);
      mockChart._getVisibleRange.mockReturnValue(null);
      mockChart._timeToCoordinate.mockImplementation((time: number) => time);

      wireLightweightChartsExtras(mockChart, mockSeries, mockGetSeriesData, mockGetLastPrice);

      // Should use last 400 bars: indices 100-499
      const callArgs = (chartMapModule.setVisibleBarCoords as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArgs.length).toBe(400);
      expect(callArgs[0]).toBe(1100); // First of last 400
      expect(callArgs[399]).toBe(1499); // Last bar
    });

    it('handles exception in collectBarXs gracefully', () => {
      mockGetSeriesData.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Should not throw
      expect(() => {
        wireLightweightChartsExtras(mockChart, mockSeries, mockGetSeriesData, mockGetLastPrice);
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('returns cleanup function that unsubscribes handlers', () => {
      const cleanup = wireLightweightChartsExtras(
        mockChart,
        mockSeries,
        mockGetSeriesData,
        mockGetLastPrice
      );
      cleanup();

      expect(mockChart._unsubscribeTimeRange).toHaveBeenCalled();
      expect(mockChart._unsubscribeLogicalRange).toHaveBeenCalled();
    });

    it('stops the price feed on cleanup', () => {
      const mockStopFeed = vi.fn();
      vi.mocked(priceFeedModule.startPriceFeed).mockReturnValue(mockStopFeed);

      const cleanup = wireLightweightChartsExtras(
        mockChart,
        mockSeries,
        mockGetSeriesData,
        mockGetLastPrice
      );
      cleanup();

      expect(mockStopFeed).toHaveBeenCalled();
    });

    it('handles errors in cleanup gracefully', () => {
      mockChart._unsubscribeTimeRange.mockImplementation(() => {
        throw new Error('Unsubscribe error');
      });

      const cleanup = wireLightweightChartsExtras(
        mockChart,
        mockSeries,
        mockGetSeriesData,
        mockGetLastPrice
      );

      // Should not throw
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles chart without timeScale', () => {
      const chartWithoutTimeScale = {
        timeScale: undefined,
      };

      const cleanup = wireLightweightChartsExtras(
        chartWithoutTimeScale,
        mockSeries,
        mockGetSeriesData,
        mockGetLastPrice
      );

      // Should still work, just without subscriptions
      expect(priceFeedModule.startPriceFeed).toHaveBeenCalled();
      expect(() => cleanup()).not.toThrow();
    });

    it('handles timeScale returning null', () => {
      const chartWithNullTimeScale = {
        timeScale: () => null,
      };

      const cleanup = wireLightweightChartsExtras(
        chartWithNullTimeScale,
        mockSeries,
        mockGetSeriesData,
        mockGetLastPrice
      );

      expect(priceFeedModule.startPriceFeed).toHaveBeenCalled();
      expect(() => cleanup()).not.toThrow();
    });

    it('handles visible range with non-numeric from/to', () => {
      const mockData = [{ time: 1000, open: 10, high: 11, low: 9, close: 10.5 }];
      mockGetSeriesData.mockReturnValue(mockData);
      mockChart._getVisibleRange.mockReturnValue({ from: 'invalid', to: 'invalid' });
      mockChart._timeToCoordinate.mockReturnValue(100);

      wireLightweightChartsExtras(mockChart, mockSeries, mockGetSeriesData, mockGetLastPrice);

      // Should fall back to last 400 bars behavior
      expect(chartMapModule.setVisibleBarCoords).toHaveBeenCalled();
    });
  });
});
