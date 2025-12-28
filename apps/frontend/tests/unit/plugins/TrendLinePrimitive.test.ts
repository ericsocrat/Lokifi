/**
 * TrendLinePrimitive Unit Tests
 * Session 92 Phase 4: Testing & Validation
 *
 * Tests the TradingView Primitives API implementation for trendlines
 */

import {
  TrendLinePrimitive,
  TrendLineOptions,
} from '@/lib/plugins/TrendLinePrimitive';
import { Time } from 'lightweight-charts';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock time values (UNIX timestamps for TradingView)
const mockTime1 = 1704067200 as Time; // 2024-01-01 00:00:00 UTC
const mockTime2 = 1704153600 as Time; // 2024-01-02 00:00:00 UTC

// Mock price values
const mockPrice1 = 100.0;
const mockPrice2 = 110.0;

// Mock chart API for testing attached/detached lifecycle
const createMockChartApi = () => ({
  timeScale: vi.fn().mockReturnValue({
    timeToCoordinate: vi.fn().mockImplementation((time: Time) => {
      // Return pixel position based on time
      if (time === mockTime1) return 100;
      if (time === mockTime2) return 200;
      return null;
    }),
    coordinateToLogical: vi.fn().mockImplementation((coord: number) => {
      return Math.floor(coord / 10);
    }),
  }),
});

const createMockSeriesApi = () => ({
  priceToCoordinate: vi.fn().mockImplementation((price: number) => {
    // Return pixel position based on price (inverted Y)
    return 400 - price * 2;
  }),
});

describe('TrendLinePrimitive', () => {
  const defaultP1 = { time: mockTime1, price: mockPrice1 };
  const defaultP2 = { time: mockTime2, price: mockPrice2 };

  describe('Constructor', () => {
    it('should create primitive with two points', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);

      expect(primitive._p1).toEqual(defaultP1);
      expect(primitive._p2).toEqual(defaultP2);
    });

    it('should use default options when none provided', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);

      expect(primitive._options.lineColor).toBeDefined();
      expect(primitive._options.lineWidth).toBeDefined();
    });

    it('should merge custom options with defaults', () => {
      const customOptions: Partial<TrendLineOptions> = {
        lineColor: '#FF0000',
        lineWidth: 4,
      };
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2, customOptions);

      expect(primitive._options.lineColor).toBe('#FF0000');
      expect(primitive._options.lineWidth).toBe(4);
    });

    it('should calculate min/max price range', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);

      // Access private members through type assertion for testing
      expect((primitive as any)._minPrice).toBe(Math.min(mockPrice1, mockPrice2));
      expect((primitive as any)._maxPrice).toBe(Math.max(mockPrice1, mockPrice2));
    });

    it('should handle inverted price points', () => {
      const invertedP1 = { time: mockTime1, price: 150 };
      const invertedP2 = { time: mockTime2, price: 100 };
      const primitive = new TrendLinePrimitive(invertedP1, invertedP2);

      expect((primitive as any)._minPrice).toBe(100);
      expect((primitive as any)._maxPrice).toBe(150);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should attach to chart and series', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);
      const mockChart = createMockChartApi();
      const mockSeries = createMockSeriesApi();

      primitive.attached({
        chart: mockChart as any,
        series: mockSeries as any,
        requestUpdate: vi.fn(),
      });

      expect(primitive._chart).toBe(mockChart);
      expect(primitive._series).toBe(mockSeries);
    });

    it('should detach and clean up references', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);
      const mockChart = createMockChartApi();
      const mockSeries = createMockSeriesApi();

      primitive.attached({
        chart: mockChart as any,
        series: mockSeries as any,
        requestUpdate: vi.fn(),
      });

      primitive.detached();

      // After detachment, chart and series should be null
      expect(primitive._chart).toBeNull();
      expect(primitive._series).toBeNull();
    });
  });

  describe('View Management', () => {
    it('should return pane views array', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);

      const views = primitive.paneViews();

      expect(Array.isArray(views)).toBe(true);
      expect(views.length).toBeGreaterThan(0);
    });

    it('should update all views', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);
      const mockChart = createMockChartApi();
      const mockSeries = createMockSeriesApi();

      primitive.attached({
        chart: mockChart as any,
        series: mockSeries as any,
        requestUpdate: vi.fn(),
      });

      // Should not throw
      expect(() => primitive.updateAllViews()).not.toThrow();
    });
  });

  describe('Autoscale Info', () => {
    let primitive: TrendLinePrimitive;
    let mockChart: ReturnType<typeof createMockChartApi>;
    let mockSeries: ReturnType<typeof createMockSeriesApi>;

    beforeEach(() => {
      primitive = new TrendLinePrimitive(defaultP1, defaultP2);
      mockChart = createMockChartApi();
      mockSeries = createMockSeriesApi();

      primitive.attached({
        chart: mockChart as any,
        series: mockSeries as any,
        requestUpdate: vi.fn(),
      });
    });

    it('should return price range for valid time range', () => {
      const info = primitive.autoscaleInfo(0, 100);

      if (info) {
        expect(info.priceRange).toBeDefined();
        expect(info.priceRange.minValue).toBe(Math.min(mockPrice1, mockPrice2));
        expect(info.priceRange.maxValue).toBe(Math.max(mockPrice1, mockPrice2));
      }
    });

    it('should return null when points are out of visible range', () => {
      // Both points at index 10 and 20, but visible range is 1000-2000
      const info = primitive.autoscaleInfo(1000, 2000);

      expect(info).toBeNull();
    });
  });

  describe('Point Updates', () => {
    it('should update points and trigger requestUpdate', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);
      const requestUpdate = vi.fn();

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate,
      });

      const newP1 = { time: mockTime1, price: 120 };
      const newP2 = { time: mockTime2, price: 130 };

      primitive.updatePoints(newP1, newP2);

      expect(primitive._p1).toEqual(newP1);
      expect(primitive._p2).toEqual(newP2);
      expect(requestUpdate).toHaveBeenCalled();
    });

    it('should recalculate min/max price on update', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });

      primitive.updatePoints(
        { time: mockTime1, price: 50 },
        { time: mockTime2, price: 200 }
      );

      expect((primitive as any)._minPrice).toBe(50);
      expect((primitive as any)._maxPrice).toBe(200);
    });
  });

  describe('Options Updates', () => {
    it('should apply new options', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);
      const requestUpdate = vi.fn();

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate,
      });

      primitive.applyOptions({
        lineColor: '#00FF00',
        lineWidth: 5,
      });

      expect(primitive._options.lineColor).toBe('#00FF00');
      expect(primitive._options.lineWidth).toBe(5);
      expect(requestUpdate).toHaveBeenCalled();
    });

    it('should preserve existing options when applying partial updates', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2, {
        lineColor: '#FF0000',
        lineWidth: 3,
      });

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });

      primitive.applyOptions({ lineWidth: 6 });

      expect(primitive._options.lineColor).toBe('#FF0000'); // Preserved
      expect(primitive._options.lineWidth).toBe(6); // Updated
    });
  });

  describe('Price/Time Coordinate Conversion', () => {
    it('should convert time to coordinate via chart timeScale', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);
      const mockChart = createMockChartApi();

      primitive.attached({
        chart: mockChart as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });

      // Force view update to trigger coordinate conversion
      primitive.updateAllViews();

      // Verify timeScale was accessed
      expect(mockChart.timeScale).toHaveBeenCalled();
    });

    it('should convert price to coordinate via series priceToCoordinate', () => {
      const primitive = new TrendLinePrimitive(defaultP1, defaultP2);
      const mockSeries = createMockSeriesApi();

      primitive.attached({
        chart: createMockChartApi() as any,
        series: mockSeries as any,
        requestUpdate: vi.fn(),
      });

      // Force view update to trigger coordinate conversion
      primitive.updateAllViews();

      // Verify priceToCoordinate was accessed
      expect(mockSeries.priceToCoordinate).toHaveBeenCalled();
    });
  });
});
