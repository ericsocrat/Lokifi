/**
 * Williams %R Indicator Service Tests
 *
 * Comprehensive test suite covering:
 * - Basic Williams %R calculation
 * - Custom periods
 * - Edge cases (empty arrays, invalid periods, flat prices)
 * - Interpretation signals (7 levels)
 * - Latest value with interpretation
 * - Performance benchmarks
 *
 * Pattern: Mathematical Indicator Testing (Session 80-86 proven pattern)
 * Expected Coverage: 94-100% (world-class standard)
 */

import {
  calculateWilliamsR,
  getLatestWilliamsR,
  interpretWilliamsR,
  type OHLCPrice,
} from '@/services/indicators/williams-r';
import { describe, expect, it } from 'vitest';

describe('Williams %R Indicator', () => {
  // Test data factory
  const createPrices = (count: number, basePrice: number = 100): OHLCPrice[] => {
    return Array.from({ length: count }, (_, i) => ({
      time: i + 1,
      high: basePrice + Math.sin(i * 0.1) * 10 + 5,
      low: basePrice + Math.sin(i * 0.1) * 10 - 5,
      close: basePrice + Math.sin(i * 0.1) * 10,
    }));
  };

  describe('Basic Williams %R Calculation', () => {
    it('should calculate Williams %R for default period (14)', () => {
      const prices = createPrices(20);
      const result = calculateWilliamsR(prices);

      expect(result).toBeDefined();
      expect(result.length).toBe(7); // 20 - 14 + 1 = 7
      expect(result[0].time).toBe(14);
      expect(result[result.length - 1].time).toBe(20);
    });

    it('should calculate Williams %R with known values', () => {
      // Simple test case with known result
      const prices: OHLCPrice[] = [
        { time: 1, high: 110, low: 100, close: 105 }, // Mid-range
        { time: 2, high: 115, low: 105, close: 110 },
        { time: 3, high: 120, low: 110, close: 115 },
        { time: 4, high: 118, low: 108, close: 112 },
        { time: 5, high: 116, low: 106, close: 111 },
      ];

      const result = calculateWilliamsR(prices, 5);

      expect(result).toHaveLength(1);
      expect(result[0].time).toBe(5);

      // Calculation for period 5:
      // Highest High: 120, Lowest Low: 100, Close: 111
      // %R = (120 - 111) / (120 - 100) × -100 = -45
      expect(result[0].value).toBeCloseTo(-45, 1);
    });

    it('should have Williams %R values between 0 and -100', () => {
      const prices = createPrices(50);
      const result = calculateWilliamsR(prices, 14);

      result.forEach((point) => {
        expect(point.value).toBeGreaterThanOrEqual(-100);
        expect(point.value).toBeLessThanOrEqual(0);
      });
    });

    it('should return correct data structure', () => {
      const prices = createPrices(20);
      const result = calculateWilliamsR(prices);

      expect(result[0]).toHaveProperty('time');
      expect(result[0]).toHaveProperty('value');
      expect(typeof result[0].time).toBe('number');
      expect(typeof result[0].value).toBe('number');
    });

    it('should calculate Williams %R for minimum valid period (2)', () => {
      const prices = createPrices(5);
      const result = calculateWilliamsR(prices, 2);

      expect(result).toHaveLength(4); // 5 - 2 + 1 = 4
      expect(result[0].time).toBe(2);
    });

    it('should handle prices at extremes', () => {
      // Price at highest high (overbought)
      const overbought: OHLCPrice[] = [
        { time: 1, high: 100, low: 90, close: 95 },
        { time: 2, high: 110, low: 100, close: 110 }, // Close at highest high
      ];

      const resultOverbought = calculateWilliamsR(overbought, 2);
      expect(Math.abs(resultOverbought[0].value)).toBe(0); // %R = 0 when close = highest high (handle -0 vs 0)

      // Price at lowest low (oversold)
      const oversold: OHLCPrice[] = [
        { time: 1, high: 110, low: 100, close: 105 },
        { time: 2, high: 110, low: 90, close: 90 }, // Close at lowest low
      ];

      const resultOversold = calculateWilliamsR(oversold, 2);
      expect(resultOversold[0].value).toBe(-100); // %R = -100 when close = lowest low
    });
  });

  describe('Custom Periods', () => {
    it('should calculate Williams %R with period 7', () => {
      const prices = createPrices(15);
      const result = calculateWilliamsR(prices, 7);

      expect(result).toHaveLength(9); // 15 - 7 + 1 = 9
      expect(result[0].time).toBe(7);
    });

    it('should calculate Williams %R with period 21', () => {
      const prices = createPrices(30);
      const result = calculateWilliamsR(prices, 21);

      expect(result).toHaveLength(10); // 30 - 21 + 1 = 10
      expect(result[0].time).toBe(21);
    });

    it('should calculate Williams %R with period 50', () => {
      const prices = createPrices(60);
      const result = calculateWilliamsR(prices, 50);

      expect(result).toHaveLength(11); // 60 - 50 + 1 = 11
      expect(result[0].time).toBe(50);
    });

    it('should produce different results for different periods', () => {
      const prices = createPrices(50);
      const result14 = calculateWilliamsR(prices, 14);
      const result21 = calculateWilliamsR(prices, 21);

      // Same timestamp (21), but different values due to period
      const value14 = result14.find((r) => r.time === 21)?.value;
      const value21 = result21[0].value; // First value at time 21

      expect(value14).toBeDefined();
      expect(value21).toBeDefined();
      expect(value14).not.toBe(value21);
    });

    it('should handle very short period (2)', () => {
      const prices = createPrices(10);
      const result = calculateWilliamsR(prices, 2);

      expect(result).toHaveLength(9);
      result.forEach((point) => {
        expect(point.value).toBeGreaterThanOrEqual(-100);
        expect(point.value).toBeLessThanOrEqual(0);
      });
    });

    it('should handle very long period (100)', () => {
      const prices = createPrices(150);
      const result = calculateWilliamsR(prices, 100);

      expect(result).toHaveLength(51); // 150 - 100 + 1 = 51
      expect(result[0].time).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array for empty prices', () => {
      const result = calculateWilliamsR([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for insufficient data', () => {
      const prices = createPrices(5);
      const result = calculateWilliamsR(prices, 14); // Need 14, only have 5

      expect(result).toEqual([]);
    });

    it('should return empty array for exactly period - 1 prices', () => {
      const prices = createPrices(13);
      const result = calculateWilliamsR(prices, 14);

      expect(result).toEqual([]);
    });

    it('should return one value for exactly period prices', () => {
      const prices = createPrices(14);
      const result = calculateWilliamsR(prices, 14);

      expect(result).toHaveLength(1);
      expect(result[0].time).toBe(14);
    });

    it('should throw error for period less than 2', () => {
      const prices = createPrices(10);

      expect(() => calculateWilliamsR(prices, 1)).toThrow('Williams %R period must be at least 2');
      expect(() => calculateWilliamsR(prices, 0)).toThrow('Williams %R period must be at least 2');
      expect(() => calculateWilliamsR(prices, -1)).toThrow('Williams %R period must be at least 2');
    });

    it('should handle flat prices (zero range)', () => {
      const flatPrices: OHLCPrice[] = Array.from({ length: 20 }, (_, i) => ({
        time: i + 1,
        high: 100,
        low: 100,
        close: 100,
      }));

      const result = calculateWilliamsR(flatPrices, 14);

      expect(result).toHaveLength(7);
      // When range is zero, should return neutral value -50
      result.forEach((point) => {
        expect(point.value).toBe(-50);
      });
    });

    it('should handle prices with high volatility', () => {
      const volatilePrices: OHLCPrice[] = Array.from({ length: 20 }, (_, i) => ({
        time: i + 1,
        high: 100 + (i % 2 === 0 ? 50 : 0),
        low: 50 + (i % 2 === 0 ? 0 : 50),
        close: 75,
      }));

      const result = calculateWilliamsR(volatilePrices, 14);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point) => {
        expect(point.value).toBeGreaterThanOrEqual(-100);
        expect(point.value).toBeLessThanOrEqual(0);
      });
    });

    it('should handle prices with small decimal differences', () => {
      const decimalPrices: OHLCPrice[] = Array.from({ length: 20 }, (_, i) => ({
        time: i + 1,
        high: 100.001 + i * 0.001,
        low: 99.999 + i * 0.001,
        close: 100 + i * 0.001,
      }));

      const result = calculateWilliamsR(decimalPrices, 14);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point) => {
        expect(typeof point.value).toBe('number');
        expect(isNaN(point.value)).toBe(false);
      });
    });

    it('should handle very large price values', () => {
      const largePrices: OHLCPrice[] = Array.from({ length: 20 }, (_, i) => ({
        time: i + 1,
        high: 1000000 + i * 1000,
        low: 999000 + i * 1000,
        close: 999500 + i * 1000,
      }));

      const result = calculateWilliamsR(largePrices, 14);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point) => {
        expect(point.value).toBeGreaterThanOrEqual(-100);
        expect(point.value).toBeLessThanOrEqual(0);
      });
    });

    it('should handle oscillating prices for variance', () => {
      const oscillatingPrices: OHLCPrice[] = Array.from({ length: 20 }, (_, i) => ({
        time: i + 1,
        high: 100 + (i % 2 === 0 ? 10 : -10),
        low: 90 + (i % 2 === 0 ? 10 : -10),
        close: 95 + (i % 2 === 0 ? 10 : -10),
      }));

      const result = calculateWilliamsR(oscillatingPrices, 14);

      expect(result.length).toBeGreaterThan(0);

      // Values should vary (not all the same)
      const uniqueValues = new Set(result.map((r) => r.value));
      expect(uniqueValues.size).toBeGreaterThan(1);
    });
  });

  describe('Williams %R Interpretation', () => {
    it('should interpret extreme overbought (-10 to 0)', () => {
      const interpretation = interpretWilliamsR(-5);
      expect(interpretation.signal).toBe('extreme-overbought');
      expect(interpretation.description).toContain('Extreme Overbought');
      expect(interpretation.value).toBe(-5);
    });

    it('should interpret overbought (-20 to -10)', () => {
      const interpretation = interpretWilliamsR(-15);
      expect(interpretation.signal).toBe('overbought');
      expect(interpretation.description).toContain('Overbought');
      expect(interpretation.value).toBe(-15);
    });

    it('should interpret neutral high (-40 to -20)', () => {
      const interpretation = interpretWilliamsR(-30);
      expect(interpretation.signal).toBe('neutral-high');
      expect(interpretation.description).toContain('Neutral (High)');
      expect(interpretation.value).toBe(-30);
    });

    it('should interpret neutral (-60 to -40)', () => {
      const interpretation = interpretWilliamsR(-50);
      expect(interpretation.signal).toBe('neutral');
      expect(interpretation.description).toContain('Neutral');
      expect(interpretation.value).toBe(-50);
    });

    it('should interpret neutral low (-80 to -60)', () => {
      const interpretation = interpretWilliamsR(-70);
      expect(interpretation.signal).toBe('neutral-low');
      expect(interpretation.description).toContain('Neutral (Low)');
      expect(interpretation.value).toBe(-70);
    });

    it('should interpret oversold (-90 to -80)', () => {
      const interpretation = interpretWilliamsR(-85);
      expect(interpretation.signal).toBe('oversold');
      expect(interpretation.description).toContain('Oversold');
      expect(interpretation.value).toBe(-85);
    });

    it('should interpret extreme oversold (-100 to -90)', () => {
      const interpretation = interpretWilliamsR(-95);
      expect(interpretation.signal).toBe('extreme-oversold');
      expect(interpretation.description).toContain('Extreme Oversold');
      expect(interpretation.value).toBe(-95);
    });

    it('should interpret boundary values correctly', () => {
      expect(interpretWilliamsR(0).signal).toBe('extreme-overbought');
      expect(interpretWilliamsR(-10).signal).toBe('overbought');
      expect(interpretWilliamsR(-20).signal).toBe('neutral-high');
      expect(interpretWilliamsR(-40).signal).toBe('neutral');
      expect(interpretWilliamsR(-60).signal).toBe('neutral-low');
      expect(interpretWilliamsR(-80).signal).toBe('oversold');
      expect(interpretWilliamsR(-90).signal).toBe('extreme-oversold');
      expect(interpretWilliamsR(-100).signal).toBe('extreme-oversold');
    });

    it('should include value in interpretation', () => {
      const testValues = [-5, -15, -30, -50, -70, -85, -95];

      testValues.forEach((value) => {
        const interpretation = interpretWilliamsR(value);
        expect(interpretation.value).toBe(value);
      });
    });
  });

  describe('Latest Williams %R Value', () => {
    it('should return latest Williams %R with interpretation', () => {
      const prices = createPrices(20);
      const result = getLatestWilliamsR(prices);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('time');
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('description');

      expect(typeof result!.time).toBe('number');
      expect(typeof result!.value).toBe('number');
      expect(typeof result!.signal).toBe('string');
      expect(typeof result!.description).toBe('string');
    });

    it('should return null for insufficient data', () => {
      const prices = createPrices(5);
      const result = getLatestWilliamsR(prices, 14);

      expect(result).toBeNull();
    });

    it('should return null for empty prices', () => {
      const result = getLatestWilliamsR([]);
      expect(result).toBeNull();
    });

    it('should match last value from calculateWilliamsR', () => {
      const prices = createPrices(30);
      const calculated = calculateWilliamsR(prices, 14);
      const latest = getLatestWilliamsR(prices, 14);

      expect(latest).not.toBeNull();
      expect(latest!.time).toBe(calculated[calculated.length - 1].time);
      expect(latest!.value).toBe(calculated[calculated.length - 1].value);
    });

    it('should include correct interpretation for latest value', () => {
      // Create prices that result in oversold condition
      const oversoldPrices: OHLCPrice[] = Array.from({ length: 20 }, (_, i) => ({
        time: i + 1,
        high: 110 - i,
        low: 100 - i,
        close: 100 - i, // Close near lowest low
      }));

      const latest = getLatestWilliamsR(oversoldPrices, 14);

      expect(latest).not.toBeNull();
      expect(latest!.value).toBeLessThan(-60); // Should be in lower range
      expect(['neutral-low', 'oversold', 'extreme-oversold']).toContain(latest!.signal);
    });
  });

  describe('Performance', () => {
    it('should calculate Williams %R for 1000 prices in under 100ms', () => {
      const prices = createPrices(1000);

      const start = performance.now();
      calculateWilliamsR(prices, 14);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should calculate Williams %R for 10000 prices in under 500ms', () => {
      const prices = createPrices(10000);

      const start = performance.now();
      calculateWilliamsR(prices, 14);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should handle multiple period calculations efficiently', () => {
      const prices = createPrices(1000);
      const periods = [7, 14, 21, 28];

      const start = performance.now();
      periods.forEach((period) => {
        calculateWilliamsR(prices, period);
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('should handle very long period calculation efficiently', () => {
      const prices = createPrices(1000);

      const start = performance.now();
      calculateWilliamsR(prices, 200);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should maintain accuracy with large datasets', () => {
      const prices = createPrices(5000);
      const result = calculateWilliamsR(prices, 14);

      expect(result.length).toBe(4987); // 5000 - 14 + 1

      // Verify values are within valid range
      result.forEach((point) => {
        expect(point.value).toBeGreaterThanOrEqual(-100);
        expect(point.value).toBeLessThanOrEqual(0);
      });
    });
  });
});
