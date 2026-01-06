/**
 * Tests for price-feed API
 */
import { startPriceFeed } from '@/lib/api/price-feed';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the chart store
vi.mock('@/state/store', () => ({
  useChartStore: {
    getState: vi.fn(),
  },
}));

// Mock the chartMap module
vi.mock('@/lib/charts/chartMap', () => ({
  priceToY: vi.fn(),
}));

import { useChartStore } from '@/state/store';
import { priceToY } from '@/lib/charts/chartMap';

const mockGetState = useChartStore.getState as ReturnType<typeof vi.fn>;
const mockPriceToY = priceToY as ReturnType<typeof vi.fn>;

describe('startPriceFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should return cleanup function immediately if store state is null', () => {
      mockGetState.mockReturnValue(null);

      const cleanup = startPriceFeed(() => 100);

      expect(cleanup).toBeTypeOf('function');
      // Should not throw when called
      expect(() => cleanup()).not.toThrow();
    });

    it('should return cleanup function when store has no evaluateAlerts', () => {
      mockGetState.mockReturnValue({});

      const cleanup = startPriceFeed(() => 100);

      expect(cleanup).toBeTypeOf('function');
    });

    it('should use default interval of 500ms', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });
      mockPriceToY.mockReturnValue(50);

      startPriceFeed(() => 100);

      // Initial tick should run immediately
      vi.advanceTimersByTime(0);
      expect(evaluateAlerts).toHaveBeenCalledTimes(1);

      // After 500ms, should tick again
      vi.advanceTimersByTime(500);
      expect(evaluateAlerts).toHaveBeenCalledTimes(2);
    });

    it('should respect custom interval', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });
      mockPriceToY.mockReturnValue(50);

      startPriceFeed(() => 100, 1000);

      vi.advanceTimersByTime(0);
      expect(evaluateAlerts).toHaveBeenCalledTimes(1);

      // Should not tick at 500ms
      vi.advanceTimersByTime(500);
      expect(evaluateAlerts).toHaveBeenCalledTimes(1);

      // Should tick at 1000ms
      vi.advanceTimersByTime(500);
      expect(evaluateAlerts).toHaveBeenCalledTimes(2);
    });

    it('should enforce minimum interval of 200ms', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });
      mockPriceToY.mockReturnValue(50);

      // Try to set interval below 200ms
      startPriceFeed(() => 100, 50);

      vi.advanceTimersByTime(0);
      expect(evaluateAlerts).toHaveBeenCalledTimes(1);

      // Should not tick at 50ms
      vi.advanceTimersByTime(50);
      expect(evaluateAlerts).toHaveBeenCalledTimes(1);

      // Should tick at 200ms
      vi.advanceTimersByTime(150);
      expect(evaluateAlerts).toHaveBeenCalledTimes(2);
    });
  });

  describe('tick behavior', () => {
    it('should call evaluateAlerts with previous and current Y values', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });
      mockPriceToY.mockReturnValue(100);

      startPriceFeed(() => 50000);

      // First tick: prevY is null, current is 100
      vi.advanceTimersByTime(0);
      expect(evaluateAlerts).toHaveBeenCalledWith(null, 100);

      // Second tick: prevY is 100, current is still 100
      vi.advanceTimersByTime(500);
      expect(evaluateAlerts).toHaveBeenCalledWith(100, 100);
    });

    it('should update prevY after each tick', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });
      
      let callCount = 0;
      mockPriceToY.mockImplementation(() => {
        callCount++;
        return callCount * 10; // 10, 20, 30, ...
      });

      startPriceFeed(() => 100);

      vi.advanceTimersByTime(0);
      expect(evaluateAlerts).toHaveBeenLastCalledWith(null, 10);

      vi.advanceTimersByTime(500);
      expect(evaluateAlerts).toHaveBeenLastCalledWith(10, 20);

      vi.advanceTimersByTime(500);
      expect(evaluateAlerts).toHaveBeenLastCalledWith(20, 30);
    });

    it('should skip tick if getLastPrice returns null', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });
      mockPriceToY.mockReturnValue(100);

      const getLastPrice = vi.fn().mockReturnValue(null);
      startPriceFeed(getLastPrice);

      vi.advanceTimersByTime(0);
      expect(evaluateAlerts).not.toHaveBeenCalled();
      expect(mockPriceToY).not.toHaveBeenCalled();
    });

    it('should skip tick if priceToY returns null', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });
      mockPriceToY.mockReturnValue(null);

      startPriceFeed(() => 100);

      vi.advanceTimersByTime(0);
      expect(evaluateAlerts).not.toHaveBeenCalled();
    });

    it('should handle getLastPrice throwing error gracefully', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });

      const getLastPrice = vi.fn().mockImplementation(() => {
        throw new Error('Price fetch failed');
      });

      startPriceFeed(getLastPrice);

      // Should not throw
      expect(() => vi.advanceTimersByTime(0)).not.toThrow();
      expect(evaluateAlerts).not.toHaveBeenCalled();
    });

    it('should handle priceToY throwing error gracefully', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });
      mockPriceToY.mockImplementation(() => {
        throw new Error('Conversion failed');
      });

      startPriceFeed(() => 100);

      expect(() => vi.advanceTimersByTime(0)).not.toThrow();
      expect(evaluateAlerts).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should stop interval when cleanup is called', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });
      mockPriceToY.mockReturnValue(100);

      const cleanup = startPriceFeed(() => 100);

      vi.advanceTimersByTime(0);
      expect(evaluateAlerts).toHaveBeenCalledTimes(1);

      cleanup();

      // Should not tick anymore
      vi.advanceTimersByTime(1000);
      expect(evaluateAlerts).toHaveBeenCalledTimes(1);
    });

    it('should not throw when cleanup is called multiple times', () => {
      mockGetState.mockReturnValue({});

      const cleanup = startPriceFeed(() => 100);

      expect(() => {
        cleanup();
        cleanup();
        cleanup();
      }).not.toThrow();
    });

    it('should handle cleanup when store state was null', () => {
      mockGetState.mockReturnValue(null);

      const cleanup = startPriceFeed(() => 100);

      // Should not throw
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should work when evaluateAlerts is undefined', () => {
      mockGetState.mockReturnValue({});
      mockPriceToY.mockReturnValue(100);

      const cleanup = startPriceFeed(() => 100);

      // Should not throw
      expect(() => vi.advanceTimersByTime(500)).not.toThrow();
      
      cleanup();
    });

    it('should handle rapid price changes', () => {
      const evaluateAlerts = vi.fn();
      mockGetState.mockReturnValue({ evaluateAlerts });
      
      let price = 100;
      mockPriceToY.mockImplementation(() => price);

      const getLastPrice = vi.fn().mockImplementation(() => {
        price += 10;
        return price;
      });

      startPriceFeed(getLastPrice, 200);

      vi.advanceTimersByTime(0);
      vi.advanceTimersByTime(200);
      vi.advanceTimersByTime(200);

      expect(evaluateAlerts).toHaveBeenCalledTimes(3);
    });
  });
});
