/**
 * RectanglePrimitive Unit Tests
 * Session 92 Phase 4: Testing & Validation
 *
 * Tests the TradingView Primitives API implementation for rectangles
 */

import { RectangleOptions, RectanglePrimitive } from '@/lib/plugins/RectanglePrimitive';
import { Time } from 'lightweight-charts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('RectanglePrimitive', () => {
  const defaultP1 = { time: mockTime1, price: mockPrice1 };
  const defaultP2 = { time: mockTime2, price: mockPrice2 };

  describe('Constructor', () => {
    it('should create primitive with two corner points', () => {
      const primitive = new RectanglePrimitive(defaultP1, defaultP2);

      expect(primitive._p1).toEqual(defaultP1);
      expect(primitive._p2).toEqual(defaultP2);
    });

    it('should use default options when none provided', () => {
      const primitive = new RectanglePrimitive(defaultP1, defaultP2);

      expect(primitive._options.fillColor).toBeDefined();
      expect(primitive._options.borderColor).toBeDefined();
      expect(primitive._options.borderWidth).toBeDefined();
      expect(primitive._options.fillOpacity).toBeDefined();
    });

    it('should merge custom options with defaults', () => {
      const customOptions: Partial<RectangleOptions> = {
        fillColor: '#FF0000',
        borderColor: '#0000FF',
        fillOpacity: 0.5,
      };
      const primitive = new RectanglePrimitive(defaultP1, defaultP2, customOptions);

      expect(primitive._options.fillColor).toBe('#FF0000');
      expect(primitive._options.borderColor).toBe('#0000FF');
      expect(primitive._options.fillOpacity).toBe(0.5);
    });

    it('should calculate min/max price range for autoscale', () => {
      const primitive = new RectanglePrimitive(defaultP1, defaultP2);

      expect((primitive as any)._minPrice).toBe(Math.min(mockPrice1, mockPrice2));
      expect((primitive as any)._maxPrice).toBe(Math.max(mockPrice1, mockPrice2));
    });

    it('should handle inverted corner points', () => {
      const invertedP1 = { time: mockTime2, price: 150 }; // Bottom-right
      const invertedP2 = { time: mockTime1, price: 100 }; // Top-left
      const primitive = new RectanglePrimitive(invertedP1, invertedP2);

      expect((primitive as any)._minPrice).toBe(100);
      expect((primitive as any)._maxPrice).toBe(150);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should attach to chart and series', () => {
      const primitive = new RectanglePrimitive(defaultP1, defaultP2);
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
      const primitive = new RectanglePrimitive(defaultP1, defaultP2);
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
      const primitive = new RectanglePrimitive(defaultP1, defaultP2);

      const views = primitive.paneViews();

      expect(Array.isArray(views)).toBe(true);
      expect(views.length).toBeGreaterThan(0);
    });

    it('should update all views without throwing', () => {
      const primitive = new RectanglePrimitive(defaultP1, defaultP2);

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });

      expect(() => primitive.updateAllViews()).not.toThrow();
    });
  });

  describe('Autoscale Info', () => {
    let primitive: RectanglePrimitive;

    beforeEach(() => {
      primitive = new RectanglePrimitive(defaultP1, defaultP2);
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
        expect(info.priceRange.minValue).toBe(Math.min(mockPrice1, mockPrice2));
        expect(info.priceRange.maxValue).toBe(Math.max(mockPrice1, mockPrice2));
      }
    });

    it('should return null when rectangle is out of visible range', () => {
      const info = primitive.autoscaleInfo(1000, 2000);

      expect(info).toBeNull();
    });
  });

  describe('Point Updates', () => {
    it('should update corner points and trigger requestUpdate', () => {
      const primitive = new RectanglePrimitive(defaultP1, defaultP2);
      const requestUpdate = vi.fn();

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate,
      });

      const newP1 = { time: mockTime1, price: 90 };
      const newP2 = { time: mockTime2, price: 140 };

      primitive.updatePoints(newP1, newP2);

      expect(primitive._p1).toEqual(newP1);
      expect(primitive._p2).toEqual(newP2);
      expect(requestUpdate).toHaveBeenCalled();
    });

    it('should recalculate min/max price on update', () => {
      const primitive = new RectanglePrimitive(defaultP1, defaultP2);

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });

      primitive.updatePoints({ time: mockTime1, price: 50 }, { time: mockTime2, price: 200 });

      expect((primitive as any)._minPrice).toBe(50);
      expect((primitive as any)._maxPrice).toBe(200);
    });
  });

  describe('Options Updates', () => {
    it('should apply new fill and border options', () => {
      const primitive = new RectanglePrimitive(defaultP1, defaultP2);
      const requestUpdate = vi.fn();

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate,
      });

      primitive.applyOptions({
        fillColor: '#00FF00',
        borderColor: '#FF00FF',
        fillOpacity: 0.3,
      });

      expect(primitive._options.fillColor).toBe('#00FF00');
      expect(primitive._options.borderColor).toBe('#FF00FF');
      expect(primitive._options.fillOpacity).toBe(0.3);
      expect(requestUpdate).toHaveBeenCalled();
    });

    it('should preserve existing options when applying partial updates', () => {
      const primitive = new RectanglePrimitive(defaultP1, defaultP2, {
        fillColor: '#FF0000',
        borderWidth: 3,
      });

      primitive.attached({
        chart: createMockChartApi() as any,
        series: createMockSeriesApi() as any,
        requestUpdate: vi.fn(),
      });

      primitive.applyOptions({ borderWidth: 5 });

      expect(primitive._options.fillColor).toBe('#FF0000'); // Preserved
      expect(primitive._options.borderWidth).toBe(5); // Updated
    });
  });

  describe('Rectangle-Specific Behavior', () => {
    it('should handle zero-width rectangle (vertical line)', () => {
      const sameTimeP1 = { time: mockTime1, price: 100 };
      const sameTimeP2 = { time: mockTime1, price: 150 };
      const primitive = new RectanglePrimitive(sameTimeP1, sameTimeP2);

      expect(primitive._p1.time).toBe(primitive._p2.time);
      expect((primitive as any)._minPrice).toBe(100);
      expect((primitive as any)._maxPrice).toBe(150);
    });

    it('should handle zero-height rectangle (horizontal line)', () => {
      const samePriceP1 = { time: mockTime1, price: 100 };
      const samePriceP2 = { time: mockTime2, price: 100 };
      const primitive = new RectanglePrimitive(samePriceP1, samePriceP2);

      expect(primitive._p1.price).toBe(primitive._p2.price);
      expect((primitive as any)._minPrice).toBe(100);
      expect((primitive as any)._maxPrice).toBe(100);
    });
  });
});
