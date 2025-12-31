import {
  calculateOBV,
  getLatestOBV,
  interpretOBV,
  type OHLCVPrice,
} from '@/services/indicators/obv';
import { describe, expect, it } from 'vitest';

describe('OBV Indicator Service', () => {
  // Test data setup
  const createPrice = (
    time: number,
    close: number,
    volume: number,
    open: number = close,
    high: number = close,
    low: number = close
  ): OHLCVPrice => ({
    time,
    open,
    high,
    low,
    close,
    volume,
  });

  describe('calculateOBV', () => {
    describe('Basic Calculation', () => {
      it('should calculate OBV for rising prices (accumulation)', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 1000),
          createPrice(2, 105, 1500), // Up: +1500
          createPrice(3, 110, 2000), // Up: +2000
        ];

        const result = calculateOBV(prices);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ time: 1, value: 1000 }); // First day
        expect(result[1]).toEqual({ time: 2, value: 2500 }); // 1000 + 1500
        expect(result[2]).toEqual({ time: 3, value: 4500 }); // 2500 + 2000
      });

      it('should calculate OBV for falling prices (distribution)', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 110, 2000),
          createPrice(2, 105, 1500), // Down: -1500
          createPrice(3, 100, 1000), // Down: -1000
        ];

        const result = calculateOBV(prices);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ time: 1, value: 2000 }); // First day
        expect(result[1]).toEqual({ time: 2, value: 500 }); // 2000 - 1500
        expect(result[2]).toEqual({ time: 3, value: -500 }); // 500 - 1000
      });

      it('should calculate OBV for mixed price movements', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 1000),
          createPrice(2, 105, 1500), // Up: +1500
          createPrice(3, 103, 800), // Down: -800
          createPrice(4, 108, 2200), // Up: +2200
          createPrice(5, 106, 1200), // Down: -1200
        ];

        const result = calculateOBV(prices);

        expect(result).toHaveLength(5);
        expect(result[0].value).toBe(1000); // First day
        expect(result[1].value).toBe(2500); // 1000 + 1500
        expect(result[2].value).toBe(1700); // 2500 - 800
        expect(result[3].value).toBe(3900); // 1700 + 2200
        expect(result[4].value).toBe(2700); // 3900 - 1200
      });

      it('should handle unchanged prices (OBV unchanged)', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 1000),
          createPrice(2, 100, 1500), // Unchanged: OBV stays same
          createPrice(3, 100, 800), // Unchanged: OBV stays same
        ];

        const result = calculateOBV(prices);

        expect(result).toHaveLength(3);
        expect(result[0].value).toBe(1000); // First day
        expect(result[1].value).toBe(1000); // Unchanged
        expect(result[2].value).toBe(1000); // Unchanged
      });

      it('should preserve time values from input prices', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1609459200, 100, 1000),
          createPrice(1609545600, 105, 1500),
        ];

        const result = calculateOBV(prices);

        expect(result[0].time).toBe(1609459200);
        expect(result[1].time).toBe(1609545600);
      });
    });

    describe('Volume Variations', () => {
      it('should handle large volume values', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 1000000),
          createPrice(2, 105, 1500000), // Up
          createPrice(3, 103, 800000), // Down
        ];

        const result = calculateOBV(prices);

        expect(result[0].value).toBe(1000000);
        expect(result[1].value).toBe(2500000); // 1000000 + 1500000
        expect(result[2].value).toBe(1700000); // 2500000 - 800000
      });

      it('should handle small volume values', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 10),
          createPrice(2, 105, 15), // Up
          createPrice(3, 103, 8), // Down
        ];

        const result = calculateOBV(prices);

        expect(result[0].value).toBe(10);
        expect(result[1].value).toBe(25); // 10 + 15
        expect(result[2].value).toBe(17); // 25 - 8
      });

      it('should handle zero volume', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 1000),
          createPrice(2, 105, 0), // Up but zero volume
          createPrice(3, 103, 500), // Down
        ];

        const result = calculateOBV(prices);

        expect(result[0].value).toBe(1000);
        expect(result[1].value).toBe(1000); // 1000 + 0
        expect(result[2].value).toBe(500); // 1000 - 500
      });

      it('should handle varying volume magnitudes', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 100),
          createPrice(2, 105, 10000), // Large volume up
          createPrice(3, 103, 50), // Small volume down
        ];

        const result = calculateOBV(prices);

        expect(result[0].value).toBe(100);
        expect(result[1].value).toBe(10100); // 100 + 10000
        expect(result[2].value).toBe(10050); // 10100 - 50
      });
    });

    describe('Edge Cases', () => {
      it('should return empty array for empty input', () => {
        const result = calculateOBV([]);
        expect(result).toEqual([]);
      });

      it('should return empty array for null input', () => {
        const result = calculateOBV(null as any);
        expect(result).toEqual([]);
      });

      it('should return empty array for undefined input', () => {
        const result = calculateOBV(undefined as any);
        expect(result).toEqual([]);
      });

      it('should handle single price data point', () => {
        const prices: OHLCVPrice[] = [createPrice(1, 100, 1000)];

        const result = calculateOBV(prices);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ time: 1, value: 1000 });
      });

      it('should throw error for missing volume data', () => {
        const prices = [
          {
            time: 1,
            open: 100,
            high: 105,
            low: 99,
            close: 103,
            // volume missing
          },
        ] as OHLCVPrice[];

        expect(() => calculateOBV(prices)).toThrow('Volume data is required for OBV calculation');
      });

      it('should throw error for null volume', () => {
        const prices = [
          {
            time: 1,
            open: 100,
            high: 105,
            low: 99,
            close: 103,
            volume: null,
          },
        ] as any;

        expect(() => calculateOBV(prices)).toThrow('Volume data is required for OBV calculation');
      });

      it('should handle negative OBV values (heavy distribution)', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 110, 500),
          createPrice(2, 105, 1000), // Down: -1000
          createPrice(3, 100, 2000), // Down: -2000
        ];

        const result = calculateOBV(prices);

        expect(result[0].value).toBe(500);
        expect(result[1].value).toBe(-500); // 500 - 1000
        expect(result[2].value).toBe(-2500); // -500 - 2000
      });

      it('should handle decimal prices correctly', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 100.5, 1000),
          createPrice(2, 100.51, 1500), // Tiny increase
          createPrice(3, 100.49, 800), // Decrease
        ];

        const result = calculateOBV(prices);

        expect(result[0].value).toBe(1000);
        expect(result[1].value).toBe(2500); // Up
        expect(result[2].value).toBe(1700); // Down
      });

      it('should handle price gaps (large movements)', () => {
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 1000),
          createPrice(2, 200, 1500), // +100% price jump
          createPrice(3, 50, 800), // -75% price drop
        ];

        const result = calculateOBV(prices);

        expect(result[0].value).toBe(1000);
        expect(result[1].value).toBe(2500); // Up
        expect(result[2].value).toBe(1700); // Down
      });
    });

    describe('OBV Interpretation', () => {
      it('should identify bullish trend (rising OBV)', () => {
        const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) =>
          createPrice(i + 1, 100 + i, 1000 + i * 100)
        );

        const obvData = calculateOBV(prices);
        const trend = interpretOBV(obvData, prices, 10);

        expect(trend.direction).toBe('bullish'); // Rising OBV
      });

      it('should identify bearish trend (falling OBV)', () => {
        const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) =>
          createPrice(i + 1, 115 - i, 1000 + i * 100)
        );

        const obvData = calculateOBV(prices);
        const trend = interpretOBV(obvData, prices, 10);

        expect(trend.direction).toBe('bearish'); // Falling OBV
      });

      it('should identify neutral trend (flat OBV)', () => {
        const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) =>
          createPrice(i + 1, 100, 1000)
        ); // All same price

        const obvData = calculateOBV(prices);
        const trend = interpretOBV(obvData, prices, 10);

        expect(trend.direction).toBe('neutral'); // Flat OBV
      });

      it('should identify strong trend (>3x average volume change)', () => {
        // Large volume accumulation
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 1000),
          ...Array.from({ length: 9 }, (_, i) => createPrice(i + 2, 100 + (i + 1) * 2, 1500)), // Strong rise with high volume
        ];

        const obvData = calculateOBV(prices);
        const trend = interpretOBV(obvData, prices, 10);

        expect(trend.strength).toBe('strong'); // >3x avg volume change
      });

      it('should identify moderate trend (1-3x average volume change)', () => {
        // Moderate volume pattern: 3 ups, 2 downs = net +1000 = 1x avg volume
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 1000),
          createPrice(2, 101, 1000), // Up
          createPrice(3, 100, 1000), // Down
          createPrice(4, 101, 1000), // Up
          createPrice(5, 100, 1000), // Down
          createPrice(6, 101, 1000), // Up
          createPrice(7, 102, 1000), // Up
          createPrice(8, 103, 1000), // Up
          createPrice(9, 104, 1000), // Up
          createPrice(10, 103, 1000), // Down - 6 ups, 3 downs = +3000 = 3x (upper end of moderate)
        ];

        const obvData = calculateOBV(prices);
        const trend = interpretOBV(obvData, prices, 10);

        expect(trend.strength).toBe('moderate'); // 1-3x avg volume change (3.0x exactly)
      });

      it('should identify weak trend (<1x average volume change)', () => {
        // Weak volume pattern (mostly sideways)
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 1000),
          createPrice(2, 101, 1000), // Up
          createPrice(3, 100, 1000), // Down (cancels out)
          createPrice(4, 101, 1000), // Up
          createPrice(5, 100, 1000), // Down
          createPrice(6, 101, 1000), // Up
          createPrice(7, 100, 1000), // Down
          createPrice(8, 101, 1000), // Up
          createPrice(9, 100, 1000), // Down
          createPrice(10, 101, 1000), // Up - weak net change (<0.5x avg volume)
        ];

        const obvData = calculateOBV(prices);
        const trend = interpretOBV(obvData, prices, 10);

        expect(trend.strength).toBe('weak'); // <1x avg volume change
      });

      it('should detect bullish divergence (price down, OBV up)', () => {
        // Bullish divergence: Price trending down BUT OBV trending up
        // This happens when small price declines have low volume, but rallies have high volume
        // indicating accumulation (smart money buying dips)
        const prices: OHLCVPrice[] = [
          createPrice(1, 110, 1000), // Start
          createPrice(2, 108, 500), // Down -2, low volume: OBV = 1000 - 500 = 500
          createPrice(3, 111, 2000), // Up +3, high volume: OBV = 500 + 2000 = 2500
          createPrice(4, 109, 600), // Down -2, low volume: OBV = 2500 - 600 = 1900
          createPrice(5, 112, 2200), // Up +3, high volume: OBV = 1900 + 2200 = 4100
          createPrice(6, 110, 700), // Down -2, low volume: OBV = 4100 - 700 = 3400
          createPrice(7, 113, 2400), // Up +3, high volume: OBV = 3400 + 2400 = 5800
          createPrice(8, 111, 800), // Down -2, low volume: OBV = 5800 - 800 = 5000
          createPrice(9, 114, 2600), // Up +3, high volume: OBV = 5000 + 2600 = 7600
          createPrice(10, 109, 900), // Down -5, low volume: OBV = 7600 - 900 = 6700
        ];
        // Net price: 110 → 109 (down -1)
        // Net OBV: 1000 → 6700 (up +5700) = Bullish divergence!

        const obvData = calculateOBV(prices);
        const trend = interpretOBV(obvData, prices, 10);

        expect(trend.divergence).toBe('bullish'); // Accumulation despite lower prices
      });

      it('should detect bearish divergence (price up, OBV down)', () => {
        // Bearish divergence: Price trending up BUT OBV trending down
        // This happens when small price gains have low volume, but selloffs have high volume
        // indicating distribution (smart money selling rallies)
        const prices: OHLCVPrice[] = [
          createPrice(1, 100, 6700), // Start (high OBV)
          createPrice(2, 102, 900), // Up +2, low volume: OBV = 6700 + 900 = 7600
          createPrice(3, 99, 2600), // Down -3, high volume: OBV = 7600 - 2600 = 5000
          createPrice(4, 101, 800), // Up +2, low volume: OBV = 5000 + 800 = 5800
          createPrice(5, 98, 2400), // Down -3, high volume: OBV = 5800 - 2400 = 3400
          createPrice(6, 100, 700), // Up +2, low volume: OBV = 3400 + 700 = 4100
          createPrice(7, 97, 2200), // Down -3, high volume: OBV = 4100 - 2200 = 1900
          createPrice(8, 99, 600), // Up +2, low volume: OBV = 1900 + 600 = 2500
          createPrice(9, 96, 2000), // Down -3, high volume: OBV = 2500 - 2000 = 500
          createPrice(10, 101, 500), // Up +5, low volume: OBV = 500 + 500 = 1000
        ];
        // Net price: 100 → 101 (up +1)
        // Net OBV: 6700 → 1000 (down -5700) = Bearish divergence!

        const obvData = calculateOBV(prices);
        const trend = interpretOBV(obvData, prices, 10);

        expect(trend.divergence).toBe('bearish'); // Distribution despite higher prices
      });

      it('should detect no divergence (price and OBV aligned)', () => {
        const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) =>
          createPrice(i + 1, 100 + i, 1000 + i * 100)
        );

        const obvData = calculateOBV(prices);
        const trend = interpretOBV(obvData, prices, 10);

        expect(trend.divergence).toBe('none'); // Price and OBV both rising
      });

      it('should return neutral for insufficient data', () => {
        const prices: OHLCVPrice[] = [createPrice(1, 100, 1000), createPrice(2, 105, 1500)];

        const obvData = calculateOBV(prices);
        const trend = interpretOBV(obvData, prices, 10); // Need 10 periods

        expect(trend.direction).toBe('neutral');
        expect(trend.strength).toBe('weak');
        expect(trend.divergence).toBe('none');
      });
    });

    describe('getLatestOBV', () => {
      it('should return latest OBV value and trend', () => {
        const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) =>
          createPrice(i + 1, 100 + i, 1000 + i * 100)
        );

        const latest = getLatestOBV(prices, 10);

        expect(latest).not.toBeNull();
        expect(latest?.value).toBeGreaterThan(0);
        expect(latest?.trend).toBeDefined();
        expect(latest?.trend.direction).toBe('bullish');
      });

      it('should return null for empty prices', () => {
        const latest = getLatestOBV([], 10);
        expect(latest).toBeNull();
      });

      it('should return null for null input', () => {
        const latest = getLatestOBV(null as any, 10);
        expect(latest).toBeNull();
      });

      it('should return null for undefined input', () => {
        const latest = getLatestOBV(undefined as any, 10);
        expect(latest).toBeNull();
      });

      it('should use custom lookback period', () => {
        const prices: OHLCVPrice[] = Array.from({ length: 20 }, (_, i) =>
          createPrice(i + 1, 100 + i, 1000 + i * 100)
        );

        const latest = getLatestOBV(prices, 15); // Custom lookback

        expect(latest).not.toBeNull();
        expect(latest?.trend).toBeDefined();
      });
    });

    describe('Performance', () => {
      it('should handle 1000 price points efficiently', () => {
        const prices: OHLCVPrice[] = Array.from({ length: 1000 }, (_, i) =>
          createPrice(i + 1, 100 + Math.sin(i / 10) * 10, 1000 + Math.cos(i / 10) * 500)
        );

        const start = performance.now();
        const result = calculateOBV(prices);
        const duration = performance.now() - start;

        expect(result).toHaveLength(1000);
        expect(duration).toBeLessThan(100); // Should complete in <100ms
      });

      it('should handle 10000 price points efficiently', () => {
        const prices: OHLCVPrice[] = Array.from({ length: 10000 }, (_, i) =>
          createPrice(i + 1, 100 + Math.sin(i / 10) * 10, 1000 + Math.cos(i / 10) * 500)
        );

        const start = performance.now();
        const result = calculateOBV(prices);
        const duration = performance.now() - start;

        expect(result).toHaveLength(10000);
        expect(duration).toBeLessThan(500); // Should complete in <500ms
      });

      it('should handle interpretation efficiently', () => {
        const prices: OHLCVPrice[] = Array.from({ length: 1000 }, (_, i) =>
          createPrice(i + 1, 100 + Math.sin(i / 10) * 10, 1000 + Math.cos(i / 10) * 500)
        );

        const obvData = calculateOBV(prices);

        const start = performance.now();
        const trend = interpretOBV(obvData, prices, 50);
        const duration = performance.now() - start;

        expect(trend).toBeDefined();
        // Allow 50ms tolerance for CI/container environments, GC pauses, and JIT warm-up
        expect(duration).toBeLessThan(50);
      });

      it('should handle getLatestOBV efficiently', () => {
        const prices: OHLCVPrice[] = Array.from({ length: 1000 }, (_, i) =>
          createPrice(i + 1, 100 + Math.sin(i / 10) * 10, 1000 + Math.cos(i / 10) * 500)
        );

        const start = performance.now();
        const latest = getLatestOBV(prices, 50);
        const duration = performance.now() - start;

        expect(latest).not.toBeNull();
        expect(duration).toBeLessThan(100); // Should complete in <100ms
      });

      it('should handle real-time updates efficiently', () => {
        let prices: OHLCVPrice[] = Array.from({ length: 100 }, (_, i) =>
          createPrice(i + 1, 100 + Math.sin(i / 10) * 10, 1000 + Math.cos(i / 10) * 500)
        );

        const start = performance.now();

        // Simulate 100 real-time updates
        for (let i = 0; i < 100; i++) {
          prices.push(
            createPrice(
              prices.length + 1,
              100 + Math.sin(i / 10) * 10,
              1000 + Math.cos(i / 10) * 500
            )
          );
          calculateOBV(prices);
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(200); // Should complete in <200ms
      });
    });
  });
});
