import {
  magnetXToBars,
  magnetYToOHLC,
  type Point,
  priceToY,
  setMappers,
  setVisibleBarCoords,
  setVisiblePriceLevels,
  snapPxToGrid,
  snapYToPriceLevels,
  timeToX,
  xToTime,
  yToPrice,
} from '@/lib/charts/chartMap';
import { beforeEach, describe, expect, it } from 'vitest';

describe('chartMap', () => {
  // Note: setMappers merges, doesn't replace! Need to explicitly clear in specific tests
  beforeEach(() => {
    // Clear price and bar state
    setVisiblePriceLevels([]);
    setVisibleBarCoords([]);
  });

  describe('Mapper Functions', () => {
    describe('setMappers', () => {
      it('should set yToPrice mapper', () => {
        const mapper = (y: number) => y * 2;
        setMappers({ yToPrice: mapper });

        expect(yToPrice(100)).toBe(200);
      });

      it('should set priceToY mapper', () => {
        const mapper = (p: number) => p / 2;
        setMappers({ priceToY: mapper });

        expect(priceToY(100)).toBe(50);
      });

      it('should set xToTime mapper', () => {
        const mapper = (x: number) => x + 1000;
        setMappers({ xToTime: mapper });

        expect(xToTime(500)).toBe(1500);
      });

      it('should set timeToX mapper', () => {
        const mapper = (t: number | Date | string) => {
          if (typeof t === 'number') return t * 2;
          return null;
        };
        setMappers({ timeToX: mapper });

        expect(timeToX(100)).toBe(200);
      });

      it('should merge multiple mappers', () => {
        setMappers({ yToPrice: (y) => y * 2 });
        setMappers({ priceToY: (p) => p / 2 });

        expect(yToPrice(100)).toBe(200);
        expect(priceToY(100)).toBe(50);
      });

      it('should override existing mapper', () => {
        setMappers({ yToPrice: (y) => y * 2 });
        setMappers({ yToPrice: (y) => y * 3 });

        expect(yToPrice(100)).toBe(300);
      });

      it('should handle partial mapper updates', () => {
        setMappers({
          yToPrice: (y) => y * 2,
          priceToY: (p) => p / 2,
        });

        // Update only one mapper
        setMappers({ yToPrice: (y) => y * 10 });

        expect(yToPrice(100)).toBe(1000);
        expect(priceToY(100)).toBe(50); // Should still work
      });
    });

    describe('yToPrice', () => {
      it('should call mapper when set', () => {
        setMappers({ yToPrice: (y) => y + 50 });

        expect(yToPrice(100)).toBe(150);
      });

      it('should handle mapper returning null', () => {
        setMappers({ yToPrice: () => null });

        expect(yToPrice(100)).toBeNull();
      });

      it('should handle zero', () => {
        setMappers({ yToPrice: (y) => y });

        expect(yToPrice(0)).toBe(0);
      });

      it('should handle negative values', () => {
        setMappers({ yToPrice: (y) => y });

        expect(yToPrice(-100)).toBe(-100);
      });

      it('should handle floating point', () => {
        setMappers({ yToPrice: (y) => y * 1.5 });

        expect(yToPrice(100.5)).toBeCloseTo(150.75);
      });
    });

    describe('priceToY', () => {
      it('should call mapper when set', () => {
        setMappers({ priceToY: (p) => p * 0.5 });

        expect(priceToY(200)).toBe(100);
      });

      it('should handle mapper returning null', () => {
        setMappers({ priceToY: () => null });

        expect(priceToY(100)).toBeNull();
      });

      it('should handle zero', () => {
        setMappers({ priceToY: (p) => p });

        expect(priceToY(0)).toBe(0);
      });

      it('should handle negative prices', () => {
        setMappers({ priceToY: (p) => Math.abs(p) });

        expect(priceToY(-50)).toBe(50);
      });
    });

    describe('xToTime', () => {
      it('should call mapper when set', () => {
        setMappers({ xToTime: (x) => x * 1000 });

        expect(xToTime(1)).toBe(1000);
      });

      it('should handle mapper returning Date', () => {
        const date = new Date('2024-01-01');
        setMappers({ xToTime: () => date });

        expect(xToTime(100)).toBe(date);
      });

      it('should handle mapper returning string', () => {
        setMappers({ xToTime: () => '2024-01-01' });

        expect(xToTime(100)).toBe('2024-01-01');
      });

      it('should handle mapper returning null', () => {
        setMappers({ xToTime: () => null });

        expect(xToTime(100)).toBeNull();
      });
    });

    describe('timeToX', () => {
      it('should handle number input', () => {
        setMappers({ timeToX: (t) => (typeof t === 'number' ? t / 1000 : null) });

        expect(timeToX(5000)).toBe(5);
      });

      it('should handle Date input', () => {
        setMappers({ timeToX: (t) => (t instanceof Date ? t.getTime() / 1000 : null) });

        const date = new Date('2024-01-01');
        expect(timeToX(date)).toBe(date.getTime() / 1000);
      });

      it('should handle string input', () => {
        setMappers({ timeToX: (t) => (typeof t === 'string' ? 100 : null) });

        expect(timeToX('2024-01-01')).toBe(100);
      });

      it('should handle mapper returning null', () => {
        setMappers({ timeToX: () => null });

        expect(timeToX(1000)).toBeNull();
      });
    });
  });

  describe('OHLC Magnet', () => {
    describe('setVisiblePriceLevels', () => {
      it('should set price levels', () => {
        setVisiblePriceLevels([100, 110, 120]);

        // Can't directly test _lastKnownPriceLevels, but we can test via magnetYToOHLC
        setMappers({ priceToY: (p) => p });

        const result = magnetYToOHLC(110, 5);
        expect(result).toBe(110);
      });

      it('should remove duplicates', () => {
        setVisiblePriceLevels([100, 100, 110, 110, 120]);
        setMappers({ priceToY: (p) => p });

        // Test that duplicates are removed by checking magnet behavior
        const result = magnetYToOHLC(100, 5);
        expect(result).toBe(100);
      });

      it('should sort price levels', () => {
        setVisiblePriceLevels([120, 100, 110]);
        setMappers({ priceToY: (p) => p });

        // Sorted order should be 100, 110, 120
        expect(magnetYToOHLC(105, 10)).toBe(100); // Closer to 100
      });

      it('should handle empty array', () => {
        setVisiblePriceLevels([]);
        setMappers({ priceToY: (p) => p });

        expect(magnetYToOHLC(100, 10)).toBe(100); // No magnet, returns input
      });

      it('should handle single price level', () => {
        setVisiblePriceLevels([100]);
        setMappers({ priceToY: (p) => p });

        expect(magnetYToOHLC(105, 10)).toBe(100);
      });
    });

    describe('magnetYToOHLC', () => {
      it('should return input when no price levels set', () => {
        setMappers({ priceToY: (p) => p });

        expect(magnetYToOHLC(150, 10)).toBe(150);
      });

      it('should return input when no mapper set', () => {
        setVisiblePriceLevels([100, 110, 120]);

        expect(magnetYToOHLC(150, 10)).toBe(150);
      });

      it('should snap to nearest price level within tolerance', () => {
        setVisiblePriceLevels([100, 110, 120]);
        setMappers({ priceToY: (p) => p });

        expect(magnetYToOHLC(102, 5)).toBe(100); // Within 5px, snaps to 100
      });

      it('should not snap when outside tolerance', () => {
        setVisiblePriceLevels([100, 110, 120]);
        setMappers({ priceToY: (p) => p });

        expect(magnetYToOHLC(90, 5)).toBe(90); // >5px away, no snap
      });

      it('should snap to closest level when multiple within tolerance', () => {
        setVisiblePriceLevels([100, 110, 120]);
        setMappers({ priceToY: (p) => p });

        expect(magnetYToOHLC(105, 10)).toBe(100); // Closer to 100 than 110
        expect(magnetYToOHLC(107, 10)).toBe(110); // Closer to 110 than 100
      });

      it('should handle tolerance of 0', () => {
        setVisiblePriceLevels([100, 110, 120]);
        setMappers({ priceToY: (p) => p });

        expect(magnetYToOHLC(100, 0)).toBe(100); // Exact match
        expect(magnetYToOHLC(101, 0)).toBe(101); // No match, no snap
      });

      it('should handle large tolerance', () => {
        setVisiblePriceLevels([100, 200, 300]);
        setMappers({ priceToY: (p) => p });

        expect(magnetYToOHLC(150, 100)).toBe(100); // Within 100px, snaps to 100
      });

      it('should skip levels where mapper returns null', () => {
        setVisiblePriceLevels([100, 110, 120]);
        setMappers({
          priceToY: (p) => (p === 110 ? null : p), // Skip 110
        });

        expect(magnetYToOHLC(112, 15)).toBe(120); // Skips 110, snaps to 120
      });

      it('should handle negative coordinates', () => {
        setVisiblePriceLevels([100, 110, 120]);
        setMappers({ priceToY: (p) => -p }); // Inverted Y axis

        expect(magnetYToOHLC(-105, 10)).toBe(-100);
      });
    });
  });

  describe('Grid Snap', () => {
    describe('snapPxToGrid', () => {
      it('should snap point to grid when enabled', () => {
        const point: Point = { x: 23, y: 47 };

        const snapped = snapPxToGrid(point, 10, true);

        expect(snapped.x).toBe(20);
        expect(snapped.y).toBe(50);
      });

      it('should return original point when disabled', () => {
        const point: Point = { x: 23, y: 47 };

        const snapped = snapPxToGrid(point, 10, false);

        expect(snapped.x).toBe(23);
        expect(snapped.y).toBe(47);
      });

      it('should handle step size of 1', () => {
        const point: Point = { x: 1.5, y: 2.7 };

        const snapped = snapPxToGrid(point, 1, true);

        expect(snapped.x).toBe(2);
        expect(snapped.y).toBe(3);
      });

      it('should handle large step size', () => {
        const point: Point = { x: 123, y: 456 };

        const snapped = snapPxToGrid(point, 100, true);

        expect(snapped.x).toBe(100);
        expect(snapped.y).toBe(500);
      });

      it('should handle negative coordinates', () => {
        const point: Point = { x: -23, y: -47 };

        const snapped = snapPxToGrid(point, 10, true);

        expect(snapped.x).toBe(-20);
        expect(snapped.y).toBe(-50);
      });

      it('should handle zero coordinates', () => {
        const point: Point = { x: 0, y: 0 };

        const snapped = snapPxToGrid(point, 10, true);

        expect(snapped.x).toBe(0);
        expect(snapped.y).toBe(0);
      });

      it('should preserve additional properties', () => {
        const point = { x: 23, y: 47, time: 1000, price: 50 };

        const snapped = snapPxToGrid(point, 10, true);

        expect(snapped.x).toBe(20);
        expect(snapped.y).toBe(50);
        expect(snapped.time).toBe(1000);
        expect(snapped.price).toBe(50);
      });

      it('should handle points on grid lines', () => {
        const point: Point = { x: 100, y: 200 };

        const snapped = snapPxToGrid(point, 10, true);

        expect(snapped.x).toBe(100);
        expect(snapped.y).toBe(200);
      });

      it('should round to nearest grid line', () => {
        const point: Point = { x: 24, y: 26 };

        const snapped = snapPxToGrid(point, 10, true);

        expect(snapped.x).toBe(20); // 24 rounds to 20
        expect(snapped.y).toBe(30); // 26 rounds to 30
      });
    });

    describe('snapYToPriceLevels', () => {
      it('should snap y to price level', () => {
        expect(snapYToPriceLevels(23, 10)).toBe(20);
        expect(snapYToPriceLevels(27, 10)).toBe(30);
      });

      it('should handle step size of 1', () => {
        expect(snapYToPriceLevels(1.4, 1)).toBe(1);
        expect(snapYToPriceLevels(1.6, 1)).toBe(2);
      });

      it('should handle large step size', () => {
        expect(snapYToPriceLevels(456, 100)).toBe(500);
      });

      it('should handle negative y', () => {
        expect(snapYToPriceLevels(-23, 10)).toBe(-20);
        expect(snapYToPriceLevels(-27, 10)).toBe(-30);
      });

      it('should handle zero', () => {
        expect(snapYToPriceLevels(0, 10)).toBe(0);
      });

      it('should handle values on grid lines', () => {
        expect(snapYToPriceLevels(100, 10)).toBe(100);
      });

      it('should round to nearest step', () => {
        expect(snapYToPriceLevels(24, 10)).toBe(20);
        expect(snapYToPriceLevels(26, 10)).toBe(30);
      });
    });
  });

  describe('Bar/X Snap', () => {
    describe('setVisibleBarCoords', () => {
      it('should set bar coordinates', () => {
        setVisibleBarCoords([100, 200, 300]);

        // Test via magnetXToBars
        expect(magnetXToBars(105, 10)).toBe(100);
      });

      it('should sort coordinates', () => {
        setVisibleBarCoords([300, 100, 200]);

        expect(magnetXToBars(195, 10)).toBe(200);
      });

      it('should handle empty array', () => {
        setVisibleBarCoords([]);

        expect(magnetXToBars(100, 10)).toBe(100); // No snap
      });

      it('should handle single coordinate', () => {
        setVisibleBarCoords([100]);

        expect(magnetXToBars(105, 10)).toBe(100);
      });

      it('should create copy of array', () => {
        const coords = [100, 200, 300];
        setVisibleBarCoords(coords);

        coords.push(400); // Modify original

        // Should not affect internal state
        expect(magnetXToBars(350, 60)).toBe(300); // 400 not snapped
      });
    });

    describe('magnetXToBars', () => {
      it('should return input when no bar coords set', () => {
        expect(magnetXToBars(150, 10)).toBe(150);
      });

      it('should snap to nearest bar within tolerance', () => {
        setVisibleBarCoords([100, 200, 300]);

        expect(magnetXToBars(105, 10)).toBe(100);
        expect(magnetXToBars(195, 10)).toBe(200);
      });

      it('should not snap when outside tolerance', () => {
        setVisibleBarCoords([100, 200, 300]);

        expect(magnetXToBars(150, 10)).toBe(150); // Too far from any bar
      });

      it('should snap to closest bar when multiple within tolerance', () => {
        setVisibleBarCoords([100, 110, 120]);

        expect(magnetXToBars(105, 10)).toBe(100); // Closer to 100
        expect(magnetXToBars(108, 10)).toBe(110); // Closer to 110
      });

      it('should handle tolerance of 0', () => {
        setVisibleBarCoords([100, 200, 300]);

        expect(magnetXToBars(100, 0)).toBe(100); // Exact match
        expect(magnetXToBars(101, 0)).toBe(101); // No snap
      });

      it('should handle large tolerance', () => {
        setVisibleBarCoords([100, 300, 500]);

        expect(magnetXToBars(200, 150)).toBe(100); // Within 150px
      });

      it('should handle x before first bar', () => {
        setVisibleBarCoords([100, 200, 300]);

        expect(magnetXToBars(50, 60)).toBe(100); // Snaps to first
        expect(magnetXToBars(50, 40)).toBe(50); // Too far, no snap
      });

      it('should handle x after last bar', () => {
        setVisibleBarCoords([100, 200, 300]);

        expect(magnetXToBars(350, 60)).toBe(300); // Snaps to last
        expect(magnetXToBars(350, 40)).toBe(350); // Too far, no snap
      });

      it('should handle x between bars', () => {
        setVisibleBarCoords([100, 200, 300]);

        expect(magnetXToBars(160, 55)).toBe(200); // Closer to 200 (40px)
        expect(magnetXToBars(140, 45)).toBe(100); // Closer to 100 (40px)
      });

      it('should handle negative coordinates', () => {
        setVisibleBarCoords([-300, -200, -100]);

        expect(magnetXToBars(-205, 10)).toBe(-200);
      });

      it('should handle mixed positive and negative', () => {
        setVisibleBarCoords([-100, 0, 100]);

        expect(magnetXToBars(-5, 10)).toBe(0);
        expect(magnetXToBars(5, 10)).toBe(0);
      });

      it('should handle very large arrays efficiently', () => {
        const coords = Array.from({ length: 1000 }, (_, i) => i * 10);
        setVisibleBarCoords(coords);

        expect(magnetXToBars(505, 10)).toBe(500);
      });

      it('should use binary search for performance', () => {
        // Create large sorted array
        const coords = Array.from({ length: 10000 }, (_, i) => i);
        setVisibleBarCoords(coords);

        // Should quickly find nearest
        expect(magnetXToBars(5000, 2)).toBe(5000);
      });
    });
  });

  describe('Integration', () => {
    it('should handle full mapping workflow', () => {
      // Set up mappers
      setMappers({
        yToPrice: (y) => 100 - y, // Inverted Y
        priceToY: (p) => 100 - p,
        xToTime: (x) => x * 1000,
        timeToX: (t) => (typeof t === 'number' ? t / 1000 : null),
      });

      expect(yToPrice(50)).toBe(50);
      expect(priceToY(50)).toBe(50);
      expect(xToTime(1)).toBe(1000);
      expect(timeToX(1000)).toBe(1);
    });

    it('should handle magnet with grid snap', () => {
      setVisiblePriceLevels([100, 110, 120]);
      setMappers({ priceToY: (p) => p });

      // Magnet to OHLC
      const magnetY = magnetYToOHLC(105, 10);
      expect(magnetY).toBe(100);

      // Then snap to grid
      const point: Point = { x: 0, y: magnetY };
      const snapped = snapPxToGrid(point, 10, true);
      expect(snapped.y).toBe(100);
    });

    it('should handle bar magnet with grid snap', () => {
      setVisibleBarCoords([100, 200, 300]);

      // Magnet to bar
      const magnetX = magnetXToBars(195, 10);
      expect(magnetX).toBe(200);

      // Then snap to grid
      const point: Point = { x: magnetX, y: 0 };
      const snapped = snapPxToGrid(point, 10, true);
      expect(snapped.x).toBe(200);
    });

    it('should handle all features together', () => {
      // Set up everything
      setMappers({
        yToPrice: (y) => y,
        priceToY: (p) => p,
        xToTime: (x) => x,
        timeToX: (t) => (typeof t === 'number' ? t : null),
      });
      setVisiblePriceLevels([100, 110, 120]);
      setVisibleBarCoords([50, 100, 150]);

      // Use all features
      const y = magnetYToOHLC(105, 10); // -> 100
      const x = magnetXToBars(52, 10); // -> 50
      const point = snapPxToGrid({ x, y }, 10, true); // -> {50, 100}
      const snapY = snapYToPriceLevels(point.y, 10); // -> 100

      expect(point.x).toBe(50);
      expect(point.y).toBe(100);
      expect(snapY).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      setMappers({ yToPrice: (y) => y });

      expect(yToPrice(1e10)).toBe(1e10);
    });

    it('should handle very small numbers', () => {
      setMappers({ yToPrice: (y) => y });

      expect(yToPrice(0.000001)).toBe(0.000001);
    });

    it('should handle Infinity', () => {
      setMappers({ yToPrice: (y) => y });

      expect(yToPrice(Infinity)).toBe(Infinity);
      expect(yToPrice(-Infinity)).toBe(-Infinity);
    });

    it('should handle NaN gracefully', () => {
      setMappers({ yToPrice: (y) => y });

      const result = yToPrice(NaN);
      expect(Number.isNaN(result)).toBe(true);
    });

    it('should handle empty bar coords with large tolerance', () => {
      setVisibleBarCoords([]);

      expect(magnetXToBars(100, 1000)).toBe(100);
    });

    it('should handle duplicate bar coords', () => {
      setVisibleBarCoords([100, 100, 100]);

      expect(magnetXToBars(105, 10)).toBe(100);
    });

    it('should handle fractional coordinates', () => {
      setVisibleBarCoords([100.5, 200.7, 300.9]);

      expect(magnetXToBars(105.5, 10)).toBe(100.5);
    });
  });
});
