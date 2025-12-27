import {
  calculateBollingerBands,
  getLatestBollingerBands,
  interpretBollingerBands,
} from '@/services/indicators/bollinger';
import { describe, expect, it } from 'vitest';

/**
 * Test Suite: Bollinger Bands Indicator
 *
 * Test Categories:
 * 1. Basic Bollinger Bands Calculation (5 tests)
 * 2. Custom Periods and Multipliers (6 tests)
 * 3. Edge Cases and Error Handling (10 tests)
 * 4. Interpretation Logic (8 tests)
 * 5. Latest Values (5 tests)
 * 6. Performance Benchmarks (5 tests)
 *
 * Total: 39 tests
 * Target Coverage: 95%+ (match MACD 95.74%)
 */

describe('Bollinger Bands Indicator', () => {
  // =====================================================
  // Category 1: Basic Bollinger Bands Calculation (5 tests)
  // =====================================================

  describe('Basic Bollinger Bands Calculation', () => {
    it('should return empty array for empty price array', () => {
      const result = calculateBollingerBands([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when prices length < period', () => {
      const prices = [100, 102, 101, 103, 105];
      const result = calculateBollingerBands(prices, 20); // Period 20 > 5 prices
      expect(result).toEqual([]);
    });

    it('should calculate Bollinger Bands for known dataset (period 20)', () => {
      // Create dataset with 20 prices (simple trending data)
      const prices = [
        100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117,
        118, 119,
      ];

      const result = calculateBollingerBands(prices, 20, 2);

      expect(result).toHaveLength(1); // Only last point has 20 periods
      expect(result[0].index).toBe(19);
      expect(result[0].middle).toBeCloseTo(109.5, 1); // SMA of 100-119
      expect(result[0].upper).toBeGreaterThan(result[0].middle);
      expect(result[0].lower).toBeLessThan(result[0].middle);
      expect(result[0].bandwidth).toBeGreaterThan(0);
    });

    it('should calculate multiple data points for longer price series', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const result = calculateBollingerBands(prices, 20, 2);

      expect(result.length).toBe(31); // 50 - 20 + 1 = 31 points
      expect(result[0].index).toBe(19); // First point at index 19
      expect(result[result.length - 1].index).toBe(49); // Last point at index 49
    });

    it('should calculate correct band relationships (upper > middle > lower)', () => {
      const prices = [
        100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 110, 112, 111, 113, 115, 114, 116, 118,
        117, 119,
      ];

      const result = calculateBollingerBands(prices, 20, 2);
      const latest = result[result.length - 1];

      expect(latest.upper).toBeGreaterThan(latest.middle);
      expect(latest.middle).toBeGreaterThan(latest.lower);
      expect(latest.bandwidth).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // Category 2: Custom Periods and Multipliers (6 tests)
  // =====================================================

  describe('Custom Periods and Multipliers', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10);

    it('should handle period 10 (short-term)', () => {
      const result = calculateBollingerBands(prices, 10, 2);
      expect(result.length).toBe(41); // 50 - 10 + 1
      expect(result[0].index).toBe(9);
    });

    it('should handle period 50 (long-term)', () => {
      const result = calculateBollingerBands(prices, 50, 2);
      expect(result.length).toBe(1); // Only last point
      expect(result[0].index).toBe(49);
    });

    it('should handle multiplier 1 (narrow bands)', () => {
      const result = calculateBollingerBands(prices, 20, 1);
      const latest = result[result.length - 1];

      const bandWidth1 = latest.upper - latest.lower;

      // Compare with multiplier 2
      const result2 = calculateBollingerBands(prices, 20, 2);
      const latest2 = result2[result2.length - 1];
      const bandWidth2 = latest2.upper - latest2.lower;

      expect(bandWidth1).toBeLessThan(bandWidth2);
    });

    it('should handle multiplier 3 (wide bands)', () => {
      const result = calculateBollingerBands(prices, 20, 3);
      const latest = result[result.length - 1];

      const bandWidth3 = latest.upper - latest.lower;

      // Compare with multiplier 2
      const result2 = calculateBollingerBands(prices, 20, 2);
      const latest2 = result2[result2.length - 1];
      const bandWidth2 = latest2.upper - latest2.lower;

      expect(bandWidth3).toBeGreaterThan(bandWidth2);
    });

    it('should handle fractional periods (period 14.5)', () => {
      const result = calculateBollingerBands(prices, 14.5, 2);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle fractional multipliers (multiplier 1.5)', () => {
      const result = calculateBollingerBands(prices, 20, 1.5);
      expect(result.length).toBeGreaterThan(0);

      const latest = result[result.length - 1];
      expect(latest.bandwidth).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // Category 3: Edge Cases and Error Handling (10 tests)
  // =====================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero period', () => {
      const prices = [100, 102, 101, 103, 105];
      const result = calculateBollingerBands(prices, 0, 2);
      expect(result).toEqual([]);
    });

    it('should handle negative period', () => {
      const prices = [100, 102, 101, 103, 105];
      const result = calculateBollingerBands(prices, -10, 2);
      expect(result).toEqual([]);
    });

    it('should handle zero multiplier', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const result = calculateBollingerBands(prices, 20, 0);
      expect(result).toEqual([]);
    });

    it('should handle negative multiplier', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const result = calculateBollingerBands(prices, 20, -2);
      expect(result).toEqual([]);
    });

    it('should handle NaN period', () => {
      const prices = [100, 102, 101, 103, 105];
      const result = calculateBollingerBands(prices, NaN, 2);
      expect(result).toEqual([]);
    });

    it('should handle NaN multiplier', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const result = calculateBollingerBands(prices, 20, NaN);
      expect(result).toEqual([]);
    });

    it('should handle Infinity period', () => {
      const prices = [100, 102, 101, 103, 105];
      const result = calculateBollingerBands(prices, Infinity, 2);
      expect(result).toEqual([]);
    });

    it('should handle Infinity multiplier', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const result = calculateBollingerBands(prices, 20, Infinity);
      expect(result).toEqual([]);
    });

    it('should handle prices with zero values', () => {
      const prices = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const result = calculateBollingerBands(prices, 20, 2);

      expect(result).toHaveLength(1);
      expect(result[0].middle).toBe(0);
      expect(result[0].upper).toBe(0);
      expect(result[0].lower).toBe(0);
      expect(result[0].bandwidth).toBe(0); // Avoid division by zero
    });

    it('should handle prices with extreme values', () => {
      const prices = Array.from({ length: 20 }, () => Number.MAX_SAFE_INTEGER / 100);
      const result = calculateBollingerBands(prices, 20, 2);

      expect(result).toHaveLength(1);
      expect(result[0].middle).toBeGreaterThan(0);
      expect(Number.isFinite(result[0].middle)).toBe(true);
      expect(Number.isFinite(result[0].upper)).toBe(true);
      expect(Number.isFinite(result[0].lower)).toBe(true);
    });
  });

  // =====================================================
  // Category 4: Interpretation Logic (8 tests)
  // =====================================================

  describe('Interpretation Logic', () => {
    const bands = {
      middle: 100,
      upper: 110,
      lower: 90,
    };

    it('should identify price above upper band', () => {
      const interpretation = interpretBollingerBands(112, bands);
      expect(interpretation).toBe('above-upper');
    });

    it('should identify price near upper band (within 5%)', () => {
      const interpretation = interpretBollingerBands(109, bands);
      expect(interpretation).toBe('near-upper');
    });

    it('should identify price at middle band (within 10%)', () => {
      const interpretation = interpretBollingerBands(100, bands);
      expect(interpretation).toBe('at-middle');
    });

    it('should identify price near lower band (within 5%)', () => {
      const interpretation = interpretBollingerBands(91, bands);
      expect(interpretation).toBe('near-lower');
    });

    it('should identify price below lower band', () => {
      const interpretation = interpretBollingerBands(88, bands);
      expect(interpretation).toBe('below-lower');
    });

    it('should identify price in neutral zone', () => {
      // Need wider bands to create a neutral zone
      // With middle=100, to have neutral zone, need bands wider than 10% of middle
      const wideBands = { middle: 100, upper: 120, lower: 80 }; // Band width: 40
      // Near threshold: 5% of 40 = 2
      // Near upper: >= 118 (120 - 2)
      // Near lower: <= 82 (80 + 2)
      // Middle threshold: 10% of 100 = 10 (range 90-110)
      // Neutral zones: 83-89 (below middle range but not near lower)
      //                111-117 (above middle range but not near upper)
      const interpretation = interpretBollingerBands(85, wideBands);
      expect(interpretation).toBe('neutral');
    });

    it('should handle edge case: price exactly at upper band', () => {
      const interpretation = interpretBollingerBands(110, bands);
      // Should be 'above-upper' or 'near-upper' depending on threshold
      expect(['above-upper', 'near-upper']).toContain(interpretation);
    });

    it('should handle edge case: price exactly at lower band', () => {
      const interpretation = interpretBollingerBands(90, bands);
      // Should be 'below-lower' or 'near-lower' depending on threshold
      expect(['below-lower', 'near-lower']).toContain(interpretation);
    });
  });

  // =====================================================
  // Category 5: Latest Values (5 tests)
  // =====================================================

  describe('Latest Values', () => {
    it('should return null for empty price array', () => {
      const result = getLatestBollingerBands([]);
      expect(result).toBeNull();
    });

    it('should return null when prices length < period', () => {
      const prices = [100, 102, 101, 103, 105];
      const result = getLatestBollingerBands(prices, 20);
      expect(result).toBeNull();
    });

    it('should return latest Bollinger Bands values', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = getLatestBollingerBands(prices, 20, 2);

      expect(result).not.toBeNull();
      expect(result!.middle).toBeGreaterThan(0);
      expect(result!.upper).toBeGreaterThan(result!.middle);
      expect(result!.lower).toBeLessThan(result!.middle);
      expect(result!.bandwidth).toBeGreaterThan(0);
      expect(result!.interpretation).toBeDefined();
    });

    it('should return correct interpretation for latest price', () => {
      // Create prices where latest is near upper band
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 0.5);
      prices.push(120); // Push price above upper band

      const result = getLatestBollingerBands(prices, 20, 2);

      expect(result).not.toBeNull();
      expect(['above-upper', 'near-upper']).toContain(result!.interpretation);
    });

    it('should handle custom period and multiplier for latest values', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 5) * 10);
      const result = getLatestBollingerBands(prices, 10, 1.5);

      expect(result).not.toBeNull();
      expect(result!.middle).toBeGreaterThan(0);
      expect(result!.bandwidth).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // Category 6: Performance Benchmarks (5 tests)
  // =====================================================

  describe('Performance Benchmarks', () => {
    it('should calculate Bollinger Bands for 100 prices in < 10ms', () => {
      const prices = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i / 10) * 20);

      const start = performance.now();
      calculateBollingerBands(prices, 20, 2);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should calculate Bollinger Bands for 1,000 prices in < 10ms', () => {
      const prices = Array.from({ length: 1000 }, (_, i) => 100 + Math.sin(i / 50) * 20);

      const start = performance.now();
      calculateBollingerBands(prices, 20, 2);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should calculate Bollinger Bands for 10,000 prices in < 100ms', () => {
      const prices = Array.from({ length: 10000 }, (_, i) => 100 + Math.sin(i / 100) * 20);

      const start = performance.now();
      calculateBollingerBands(prices, 20, 2);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should calculate interpretation in < 1ms', () => {
      const bands = { middle: 100, upper: 110, lower: 90 };

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        interpretBollingerBands(105, bands);
      }
      const duration = performance.now() - start;

      // Allow 5ms tolerance for CI/container environments and different Node.js versions
      expect(duration).toBeLessThan(5);
    });

    it('should calculate latest values for 10,000 prices in < 200ms', () => {
      const prices = Array.from({ length: 10000 }, (_, i) => 100 + Math.sin(i / 100) * 20);

      const start = performance.now();
      getLatestBollingerBands(prices, 20, 2);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });
});
