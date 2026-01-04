/**
 * FibonacciPrimitive Unit Tests
 * Session 92 Phase 4: Testing & Validation
 *
 * Tests the TradingView Primitives API implementation for Fibonacci retracement
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Testing requires private property access and mock objects for chart/series APIs */

import type { FibonacciOptions} from '@/lib/plugins/FibonacciPrimitive';
import { FibonacciPrimitive } from '@/lib/plugins/FibonacciPrimitive';
import type { Time } from 'lightweight-charts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock time values (UNIX timestamps for TradingView)
const mockTime1 = 1704067200 as Time; // 2024-01-01 00:00:00 UTC
const mockTime2 = 1704153600 as Time; // 2024-01-02 00:00:00 UTC

// Mock price values
const mockPrice1 = 100.0;
const mockPrice2 = 150.0;

// Mock chart API for testing attached/detached lifecycle
const createMockChartApi = () => ({
  timeScale: vi.fn().mockReturnValue({
    timeToCoordinate: vi.fn().mockImplementation((time: Time) => {
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
    return 400 - price * 2;
  }),
});

describe('FibonacciPrimitive', () => {
  const defaultP1 = { time: mockTime1, price: mockPrice1 };
  const defaultP2 = { time: mockTime2, price: mockPrice2 };

  describe('Constructor', () => {
    it('should create primitive with two anchor points', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);

      expect(primitive._p1).toEqual(defaultP1);
      expect(primitive._p2).toEqual(defaultP2);
    });

    it('should use default Fibonacci levels', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);

      // Default levels: 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0
      expect(primitive._options.levels).toContain(0);
      expect(primitive._options.levels).toContain(0.236);
      expect(primitive._options.levels).toContain(0.382);
      expect(primitive._options.levels).toContain(0.5);
      expect(primitive._options.levels).toContain(0.618);
      expect(primitive._options.levels).toContain(0.786);
      expect(primitive._options.levels).toContain(1.0);
    });

    it('should use default styling options', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);

      expect(primitive._options.lineColor).toBeDefined();
      expect(primitive._options.lineWidth).toBeDefined();
      expect(primitive._options.showLabels).toBe(false); // Default: labels only on hover
      expect(primitive._options.labelBackgroundColor).toBeDefined();
      expect(primitive._options.labelTextColor).toBeDefined();
    });

    it('should merge custom options with defaults', () => {
      const customOptions: Partial<FibonacciOptions> = {
        lineColor: '#FF0000',
        showLabels: false,
        levels: [0, 0.5, 1.0], // Custom levels
      };
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2, customOptions);

      expect(primitive._options.lineColor).toBe('#FF0000');
      expect(primitive._options.showLabels).toBe(false);
      expect(primitive._options.levels).toEqual([0, 0.5, 1.0]);
    });

    it('should calculate min/max price range for autoscale', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);

      expect((primitive as any)._minPrice).toBe(100);
      expect((primitive as any)._maxPrice).toBe(150);
    });

    it('should handle inverted anchor points (downtrend)', () => {
      const invertedP1 = { time: mockTime1, price: 200 }; // High
      const invertedP2 = { time: mockTime2, price: 100 }; // Low
      const primitive = new FibonacciPrimitive(invertedP1, invertedP2);

      expect((primitive as any)._minPrice).toBe(100);
      expect((primitive as any)._maxPrice).toBe(200);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should attach to chart and series', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);
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
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);
      const mockChart = createMockChartApi();
      const mockSeries = createMockSeriesApi();

      primitive.attached({
        chart: mockChart as any,
        series: mockSeries as any,
        requestUpdate: vi.fn(),
      });

      primitive.detached();

      expect(primitive._chart).toBeNull();
      expect(primitive._series).toBeNull();
    });
  });

  describe('View Management', () => {
    it('should return pane views array', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);

      const views = primitive.paneViews();

      expect(Array.isArray(views)).toBe(true);
      expect(views.length).toBeGreaterThan(0);
    });

    it('should update all views without throwing', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });

      expect(() => primitive.updateAllViews()).not.toThrow();
    });
  });

  describe('Autoscale Info', () => {
    let primitive: FibonacciPrimitive;

    beforeEach(() => {
      primitive = new FibonacciPrimitive(defaultP1, defaultP2);
      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });
    });

    it('should return price range for valid time range', () => {
      const info = primitive.autoscaleInfo(0, 100);

      if (info) {
        expect(info.priceRange).toBeDefined();
        expect(info.priceRange.minValue).toBe(100);
        expect(info.priceRange.maxValue).toBe(150);
      }
    });

    it('should return null when Fibonacci is out of visible range', () => {
      const info = primitive.autoscaleInfo(1000, 2000);

      expect(info).toBeNull();
    });
  });

  describe('Point Updates', () => {
    it('should update anchor points and trigger requestUpdate', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);
      const requestUpdate = vi.fn();

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate,
      });

      const newP1 = { time: mockTime1, price: 80 };
      const newP2 = { time: mockTime2, price: 180 };

      primitive.updatePoints(newP1, newP2);

      expect(primitive._p1).toEqual(newP1);
      expect(primitive._p2).toEqual(newP2);
      expect(requestUpdate).toHaveBeenCalled();
    });

    it('should recalculate min/max price on update', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });

      primitive.updatePoints({ time: mockTime1, price: 50 }, { time: mockTime2, price: 250 });

      expect((primitive as any)._minPrice).toBe(50);
      expect((primitive as any)._maxPrice).toBe(250);
    });
  });

  describe('Options Updates', () => {
    it('should apply new styling options', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);
      const requestUpdate = vi.fn();

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate,
      });

      primitive.applyOptions({
        lineColor: '#00FF00',
        showLabels: false,
      });

      expect(primitive._options.lineColor).toBe('#00FF00');
      expect(primitive._options.showLabels).toBe(false);
      expect(requestUpdate).toHaveBeenCalled();
    });

    it('should allow custom Fibonacci levels', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });

      // Custom levels: only key ratios
      primitive.applyOptions({ levels: [0, 0.382, 0.618, 1.0] });

      expect(primitive._options.levels).toEqual([0, 0.382, 0.618, 1.0]);
    });

    it('should preserve existing options when applying partial updates', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2, {
        lineColor: '#FF0000',
        lineWidth: 2,
      });

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });

      primitive.applyOptions({ lineWidth: 4 });

      expect(primitive._options.lineColor).toBe('#FF0000'); // Preserved
      expect(primitive._options.lineWidth).toBe(4); // Updated
    });
  });

  describe('Fibonacci-Specific Calculations', () => {
    it('should support uptrend Fibonacci (swing low to high)', () => {
      const swingLow = { time: mockTime1, price: 100 };
      const swingHigh = { time: mockTime2, price: 150 };
      const primitive = new FibonacciPrimitive(swingLow, swingHigh);

      // In uptrend: start at bottom, end at top
      expect(primitive._p1.price).toBeLessThan(primitive._p2.price);
      expect((primitive as any)._minPrice).toBe(100);
      expect((primitive as any)._maxPrice).toBe(150);
    });

    it('should support downtrend Fibonacci (swing high to low)', () => {
      const swingHigh = { time: mockTime1, price: 150 };
      const swingLow = { time: mockTime2, price: 100 };
      const primitive = new FibonacciPrimitive(swingHigh, swingLow);

      // In downtrend: start at top, end at bottom
      expect(primitive._p1.price).toBeGreaterThan(primitive._p2.price);
      expect((primitive as any)._minPrice).toBe(100);
      expect((primitive as any)._maxPrice).toBe(150);
    });

    it('should handle zero price difference gracefully', () => {
      const samePriceP1 = { time: mockTime1, price: 100 };
      const samePriceP2 = { time: mockTime2, price: 100 };
      const primitive = new FibonacciPrimitive(samePriceP1, samePriceP2);

      // Edge case: horizontal line (no retracement levels visible)
      expect((primitive as any)._minPrice).toBe(100);
      expect((primitive as any)._maxPrice).toBe(100);
    });
  });

  describe('7 Default Fibonacci Levels', () => {
    it('should include all 7 standard Fibonacci levels', () => {
      const primitive = new FibonacciPrimitive(defaultP1, defaultP2);

      const expectedLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
      expect(primitive._options.levels).toHaveLength(7);
      expectedLevels.forEach((level) => {
        expect(primitive._options.levels).toContain(level);
      });
    });
  });
});
