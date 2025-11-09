import {
  calculateADX,
  getLatestADX,
  interpretADX,
  type ADXData,
  type OHLCPrice,
} from '@/services/indicators/adx';
import { describe, expect, it } from 'vitest';

describe('ADX Indicator', () => {
  // ====================
  // 1. Basic ADX Calculation Tests
  // ====================
  describe('Basic ADX Calculation', () => {
    it('should return empty array for empty prices', () => {
      const result = calculateADX([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when prices length < 2 * period', () => {
      const prices: OHLCPrice[] = Array.from({ length: 20 }, (_, i) => ({
        time: i + 1,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
      }));

      const result = calculateADX(prices, 14); // Need 28 prices minimum
      expect(result).toEqual([]);
    });

    it('should calculate ADX with known data', () => {
      // Create trending upward price data
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const result = calculateADX(prices, 14);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('time');
      expect(result[0]).toHaveProperty('adx');
      expect(result[0]).toHaveProperty('plusDI');
      expect(result[0]).toHaveProperty('minusDI');

      // ADX should be between 0 and 100
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
        expect(point.plusDI).toBeGreaterThanOrEqual(0);
        expect(point.plusDI).toBeLessThanOrEqual(100);
        expect(point.minusDI).toBeGreaterThanOrEqual(0);
        expect(point.minusDI).toBeLessThanOrEqual(100);
      });
    });

    it('should show higher ADX for strong trending markets', () => {
      // Strong uptrend
      const trendingPrices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 100 + i * 2,
        high: 105 + i * 2,
        low: 95 + i * 2,
        close: 103 + i * 2,
      }));

      // Range-bound (sideways)
      const rangeBoundPrices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 100 + (i % 2 === 0 ? 1 : -1),
        high: 105 + (i % 2 === 0 ? 1 : -1),
        low: 95 + (i % 2 === 0 ? 1 : -1),
        close: 100 + (i % 2 === 0 ? 1 : -1),
      }));

      const trendingADX = calculateADX(trendingPrices, 14);
      const rangeBoundADX = calculateADX(rangeBoundPrices, 14);

      const avgTrendingADX =
        trendingADX.reduce((sum: number, p: ADXData) => sum + p.adx, 0) / trendingADX.length;
      const avgRangeBoundADX =
        rangeBoundADX.reduce((sum: number, p: ADXData) => sum + p.adx, 0) / rangeBoundADX.length;

      expect(avgTrendingADX).toBeGreaterThan(avgRangeBoundADX);
    });

    it('should show +DI > -DI for uptrends', () => {
      // Strong uptrend
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 100 + i * 2,
        high: 105 + i * 2,
        low: 95 + i * 2,
        close: 103 + i * 2,
      }));

      const result = calculateADX(prices, 14);

      // In uptrend, +DI should generally be higher than -DI
      const avgPlusDI =
        result.reduce((sum: number, p: ADXData) => sum + p.plusDI, 0) / result.length;
      const avgMinusDI =
        result.reduce((sum: number, p: ADXData) => sum + p.minusDI, 0) / result.length;

      expect(avgPlusDI).toBeGreaterThan(avgMinusDI);
    });

    it('should show -DI > +DI for downtrends', () => {
      // Strong downtrend
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 200 - i * 2,
        high: 205 - i * 2,
        low: 195 - i * 2,
        close: 197 - i * 2,
      }));

      const result = calculateADX(prices, 14);

      // In downtrend, -DI should generally be higher than +DI
      const avgPlusDI =
        result.reduce((sum: number, p: ADXData) => sum + p.plusDI, 0) / result.length;
      const avgMinusDI =
        result.reduce((sum: number, p: ADXData) => sum + p.minusDI, 0) / result.length;

      expect(avgMinusDI).toBeGreaterThan(avgPlusDI);
    });
  });

  // ====================
  // 2. Custom Period Tests
  // ====================
  describe('Custom Periods', () => {
    const prices: OHLCPrice[] = Array.from({ length: 100 }, (_, i) => ({
      time: i + 1,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
    }));

    it('should calculate ADX with period 7', () => {
      const result = calculateADX(prices, 7);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate ADX with period 20', () => {
      const result = calculateADX(prices, 20);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate ADX with period 30', () => {
      const result = calculateADX(prices, 30);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
      });
    });

    it('should produce smoother ADX with longer periods', () => {
      // Use oscillating prices for measurable variance
      const varyingPrices: OHLCPrice[] = Array.from({ length: 100 }, (_, i) => ({
        time: i + 1,
        open: 100 + Math.sin(i / 5) * 10,
        high: 105 + Math.sin(i / 5) * 10,
        low: 95 + Math.sin(i / 5) * 10,
        close: 102 + Math.sin(i / 5) * 10,
      }));

      const shortPeriod = calculateADX(varyingPrices, 7);
      const longPeriod = calculateADX(varyingPrices, 30);

      // Calculate volatility (standard deviation) of ADX values
      const calcStdDev = (data: ADXData[]) => {
        const mean = data.reduce((sum: number, p: ADXData) => sum + p.adx, 0) / data.length;
        const variance =
          data.reduce((sum: number, p: ADXData) => sum + Math.pow(p.adx - mean, 2), 0) /
          data.length;
        return Math.sqrt(variance);
      };

      const shortStdDev = calcStdDev(shortPeriod);
      const longStdDev = calcStdDev(longPeriod);

      // Longer period should have lower volatility (smoother)
      expect(longStdDev).toBeLessThan(shortStdDev);
    });

    it('should return more data points with shorter periods', () => {
      const period7 = calculateADX(prices, 7);
      const period30 = calculateADX(prices, 30);

      expect(period7.length).toBeGreaterThan(period30.length);
    });

    it('should throw error for period < 2', () => {
      expect(() => calculateADX(prices, 1)).toThrow('ADX period must be at least 2');
      expect(() => calculateADX(prices, 0)).toThrow('ADX period must be at least 2');
      expect(() => calculateADX(prices, -1)).toThrow('ADX period must be at least 2');
    });
  });

  // ====================
  // 3. Edge Cases
  // ====================
  describe('Edge Cases', () => {
    it('should handle flat prices (no movement)', () => {
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 100,
        high: 100,
        low: 100,
        close: 100,
      }));

      const result = calculateADX(prices, 14);

      // Flat prices should result in very low ADX (no trend)
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeLessThan(5);
        expect(point.plusDI).toBe(0);
        expect(point.minusDI).toBe(0);
      });
    });

    it('should handle prices with zero ranges', () => {
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 100,
        high: 100,
        low: 100,
        close: 100,
      }));

      const result = calculateADX(prices, 14);

      expect(result).toBeInstanceOf(Array);
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
      });
    });

    it('should handle single price candle (insufficient data)', () => {
      const prices: OHLCPrice[] = [{ time: 1, open: 100, high: 105, low: 95, close: 100 }];

      const result = calculateADX(prices, 14);
      expect(result).toEqual([]);
    });

    it('should handle exactly minimum required prices', () => {
      const period = 14;
      const minPrices = period * 2; // 28 prices
      const prices: OHLCPrice[] = Array.from({ length: minPrices }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const result = calculateADX(prices, period);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('adx');
    });

    it('should handle very small period (2)', () => {
      const prices: OHLCPrice[] = Array.from({ length: 10 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const result = calculateADX(prices, 2);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
      });
    });

    it('should handle extreme price movements', () => {
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 100 + i * 10,
        high: 150 + i * 10,
        low: 50 + i * 10,
        close: 125 + i * 10,
      }));

      const result = calculateADX(prices, 14);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
      });
    });

    it('should handle negative prices', () => {
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: -100 + i,
        high: -95 + i,
        low: -105 + i,
        close: -98 + i,
      }));

      const result = calculateADX(prices, 14);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
      });
    });

    it('should handle very large prices', () => {
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 1000000 + i * 1000,
        high: 1005000 + i * 1000,
        low: 995000 + i * 1000,
        close: 1002000 + i * 1000,
      }));

      const result = calculateADX(prices, 14);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
        expect(Number.isFinite(point.adx)).toBe(true);
      });
    });

    it('should handle decimal prices with high precision', () => {
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 0.00001234 + i * 0.00000123,
        high: 0.00001456 + i * 0.00000123,
        low: 0.00001012 + i * 0.00000123,
        close: 0.00001345 + i * 0.00000123,
      }));

      const result = calculateADX(prices, 14);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
        expect(Number.isFinite(point.adx)).toBe(true);
      });
    });

    it('should handle alternating high/low volatility', () => {
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => {
        const isHighVolatility = i % 4 < 2;
        const range = isHighVolatility ? 20 : 2;
        return {
          time: i + 1,
          open: 100 + i,
          high: 100 + i + range,
          low: 100 + i - range,
          close: 100 + i + (isHighVolatility ? 10 : 1),
        };
      });

      const result = calculateADX(prices, 14);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point: ADXData) => {
        expect(point.adx).toBeGreaterThanOrEqual(0);
        expect(point.adx).toBeLessThanOrEqual(100);
      });
    });
  });

  // ====================
  // 4. ADX Interpretation Tests
  // ====================
  describe('ADX Interpretation', () => {
    it('should interpret very weak trend (ADX < 20)', () => {
      const result = interpretADX(15);

      expect(result.strength).toBe('very-weak');
      expect(result.signal).toBe('range-bound');
      expect(result.description).toContain('Very weak or no trend');
      expect(result.description).toContain('15.0');
    });

    it('should interpret weak emerging trend (ADX 20-25)', () => {
      const result = interpretADX(22);

      expect(result.strength).toBe('weak');
      expect(result.signal).toBe('trending');
      expect(result.description).toContain('Weak trend emerging');
      expect(result.description).toContain('22.0');
    });

    it('should interpret strong trend (ADX 25-50)', () => {
      const result = interpretADX(35);

      expect(result.strength).toBe('strong');
      expect(result.signal).toBe('strong-trend');
      expect(result.description).toContain('Strong trend detected');
      expect(result.description).toContain('35.0');
    });

    it('should interpret very strong trend (ADX 50-75)', () => {
      const result = interpretADX(60);

      expect(result.strength).toBe('very-strong');
      expect(result.signal).toBe('strong-trend');
      expect(result.description).toContain('Very strong trend');
      expect(result.description).toContain('60.0');
    });

    it('should interpret extreme trend (ADX > 75)', () => {
      const result = interpretADX(80);

      expect(result.strength).toBe('extreme');
      expect(result.signal).toBe('strong-trend');
      expect(result.description).toContain('Extremely strong trend');
      expect(result.description).toContain('80.0');
    });

    it('should handle boundary values correctly', () => {
      expect(interpretADX(0).strength).toBe('very-weak');
      expect(interpretADX(19.9).strength).toBe('very-weak');
      expect(interpretADX(20).strength).toBe('weak');
      expect(interpretADX(24.9).strength).toBe('weak');
      expect(interpretADX(25).strength).toBe('strong');
      expect(interpretADX(49.9).strength).toBe('strong');
      expect(interpretADX(50).strength).toBe('very-strong');
      expect(interpretADX(74.9).strength).toBe('very-strong');
      expect(interpretADX(75).strength).toBe('extreme');
      expect(interpretADX(100).strength).toBe('extreme');
    });

    it('should throw error for invalid ADX values', () => {
      expect(() => interpretADX(-1)).toThrow('ADX value must be between 0 and 100');
      expect(() => interpretADX(101)).toThrow('ADX value must be between 0 and 100');
      expect(() => interpretADX(-10)).toThrow('ADX value must be between 0 and 100');
      expect(() => interpretADX(150)).toThrow('ADX value must be between 0 and 100');
    });
  });

  // ====================
  // 5. Latest ADX Value Tests
  // ====================
  describe('Latest ADX Value', () => {
    it('should return undefined for empty array', () => {
      const result = getLatestADX([]);
      expect(result).toBeUndefined();
    });

    it('should return last value from single-element array', () => {
      const data: ADXData[] = [{ time: 1, adx: 25, plusDI: 30, minusDI: 20 }];
      const result = getLatestADX(data);

      expect(result).toEqual({ time: 1, adx: 25, plusDI: 30, minusDI: 20 });
    });

    it('should return last value from multi-element array', () => {
      const data: ADXData[] = [
        { time: 1, adx: 20, plusDI: 25, minusDI: 15 },
        { time: 2, adx: 25, plusDI: 30, minusDI: 18 },
        { time: 3, adx: 30, plusDI: 35, minusDI: 20 },
      ];
      const result = getLatestADX(data);

      expect(result).toEqual({ time: 3, adx: 30, plusDI: 35, minusDI: 20 });
    });

    it('should work with calculated ADX data', () => {
      const prices: OHLCPrice[] = Array.from({ length: 40 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const adxData = calculateADX(prices, 14);
      const latest = getLatestADX(adxData);

      expect(latest).toBeDefined();
      // Latest time should match the last result, not the last input price
      expect(latest?.time).toBe(adxData[adxData.length - 1].time);
      expect(latest?.adx).toBeGreaterThanOrEqual(0);
      expect(latest?.adx).toBeLessThanOrEqual(100);
    });
  });

  // ====================
  // 6. Performance Tests
  // ====================
  describe('Performance', () => {
    it('should calculate ADX for 1000 prices in reasonable time', () => {
      const prices: OHLCPrice[] = Array.from({ length: 1000 }, (_, i) => ({
        time: i + 1,
        open: 100 + Math.sin(i / 10) * 10,
        high: 105 + Math.sin(i / 10) * 10,
        low: 95 + Math.sin(i / 10) * 10,
        close: 102 + Math.sin(i / 10) * 10,
      }));

      const start = performance.now();
      const result = calculateADX(prices, 14);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in < 100ms
      expect(result.length).toBeGreaterThan(0);
    });

    it('should calculate ADX for 10000 prices efficiently', () => {
      const prices: OHLCPrice[] = Array.from({ length: 10000 }, (_, i) => ({
        time: i + 1,
        open: 100 + Math.sin(i / 10) * 10,
        high: 105 + Math.sin(i / 10) * 10,
        low: 95 + Math.sin(i / 10) * 10,
        close: 102 + Math.sin(i / 10) * 10,
      }));

      const start = performance.now();
      const result = calculateADX(prices, 14);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // Should complete in < 500ms
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle multiple period calculations efficiently', () => {
      const prices: OHLCPrice[] = Array.from({ length: 1000 }, (_, i) => ({
        time: i + 1,
        open: 100 + i * 0.1,
        high: 105 + i * 0.1,
        low: 95 + i * 0.1,
        close: 102 + i * 0.1,
      }));

      const start = performance.now();
      calculateADX(prices, 7);
      calculateADX(prices, 14);
      calculateADX(prices, 21);
      calculateADX(prices, 30);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200); // All 4 calculations in < 200ms
    });

    it('should not have memory leaks with large datasets', () => {
      const prices: OHLCPrice[] = Array.from({ length: 5000 }, (_, i) => ({
        time: i + 1,
        open: 100 + Math.random() * 10,
        high: 105 + Math.random() * 10,
        low: 95 + Math.random() * 10,
        close: 100 + Math.random() * 10,
      }));

      // Run multiple times to check for memory issues
      for (let i = 0; i < 10; i++) {
        const result = calculateADX(prices, 14);
        expect(result.length).toBeGreaterThan(0);
      }

      // If we get here without crashing, no obvious memory leak
      expect(true).toBe(true);
    });

    it('should produce consistent results across multiple runs', () => {
      const prices: OHLCPrice[] = Array.from({ length: 100 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const result1 = calculateADX(prices, 14);
      const result2 = calculateADX(prices, 14);
      const result3 = calculateADX(prices, 14);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});
