/**
 * Stochastic Oscillator Indicator Tests
 *
 * Comprehensive test suite using mathematical testing pattern from Sessions 80-83.
 * Tests cover: Basic calculation, Custom periods, Edge cases, Interpretation,
 * Latest values, and Performance.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateStochastic,
  interpretStochastic,
  getLatestStochastic,
  type StochasticData,
} from '@/services/indicators/stochastic';

describe('Stochastic Oscillator Indicator', () => {
  // Test data: 20 price points with known ranges
  const testPrices = [
    { time: 1000, close: 100, high: 105, low: 95 },
    { time: 2000, close: 102, high: 107, low: 97 },
    { time: 3000, close: 98, high: 103, low: 93 },
    { time: 4000, close: 105, high: 110, low: 100 },
    { time: 5000, close: 103, high: 108, low: 98 },
    { time: 6000, close: 107, high: 112, low: 102 },
    { time: 7000, close: 110, high: 115, low: 105 },
    { time: 8000, close: 108, high: 113, low: 103 },
    { time: 9000, close: 112, high: 117, low: 107 },
    { time: 10000, close: 115, high: 120, low: 110 },
    { time: 11000, close: 113, high: 118, low: 108 },
    { time: 12000, close: 118, high: 123, low: 113 },
    { time: 13000, close: 120, high: 125, low: 115 },
    { time: 14000, close: 117, high: 122, low: 112 },
    { time: 15000, close: 122, high: 127, low: 117 },
    { time: 16000, close: 125, high: 130, low: 120 },
    { time: 17000, close: 123, high: 128, low: 118 },
    { time: 18000, close: 128, high: 133, low: 123 },
    { time: 19000, close: 130, high: 135, low: 125 },
    { time: 20000, close: 127, high: 132, low: 122 },
  ];

  describe('Basic Stochastic Calculation', () => {
    it('should calculate %K and %D for valid prices with default periods (14, 3)', () => {
      const result = calculateStochastic(testPrices, 14, 3);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Verify structure of each data point
      result.forEach((point: StochasticData) => {
        expect(point).toHaveProperty('time');
        expect(point).toHaveProperty('k');
        expect(point).toHaveProperty('d');
        expect(typeof point.time).toBe('number');
        expect(typeof point.k).toBe('number');
        expect(typeof point.d).toBe('number');
        expect(point.k).toBeGreaterThanOrEqual(0);
        expect(point.k).toBeLessThanOrEqual(100);
        expect(point.d).toBeGreaterThanOrEqual(0);
        expect(point.d).toBeLessThanOrEqual(100);
      });
    });

    it('should return correct number of data points (prices.length - kPeriod + 1)', () => {
      const kPeriod = 14;
      const result = calculateStochastic(testPrices, kPeriod, 3);

      expect(result.length).toBe(testPrices.length - kPeriod + 1);
      expect(result.length).toBe(7); // 20 - 14 + 1 = 7
    });

    it('should calculate %K correctly for known data', () => {
      // Simple test case with known values
      // Period 3: Looking at all 3 prices
      // Highest high: 70, Lowest low: 40, Range: 30
      // Close: 60, K = (60-40)/30 × 100 = 66.67%
      const simplePrices = [
        { time: 1000, close: 50, high: 60, low: 40 },
        { time: 2000, close: 55, high: 65, low: 45 },
        { time: 3000, close: 60, high: 70, low: 50 },
      ];

      const result = calculateStochastic(simplePrices, 3, 3);

      expect(result).toHaveLength(1);
      expect(result[0].k).toBe(66.67); // (60-40)/(70-40) × 100 = 66.67%
    });

    it('should calculate %D as SMA of %K values', () => {
      const prices = [
        { time: 1000, close: 100, high: 110, low: 90 },
        { time: 2000, close: 105, high: 115, low: 95 },
        { time: 3000, close: 102, high: 112, low: 92 },
        { time: 4000, close: 108, high: 118, low: 98 },
        { time: 5000, close: 110, high: 120, low: 100 },
      ];

      const result = calculateStochastic(prices, 3, 3);

      // First %D should be 0 (insufficient %K values)
      expect(result[0].d).toBe(0);
      // Third %D should be average of first 3 %K values
      expect(result[2].d).toBeGreaterThan(0);
    });

    it('should handle overbought condition (%K near 100)', () => {
      const overboughtPrices = [
        { time: 1000, close: 100, high: 100, low: 80 },
        { time: 2000, close: 99, high: 100, low: 79 },
        { time: 3000, close: 100, high: 100, low: 80 },
      ];

      const result = calculateStochastic(overboughtPrices, 3, 3);

      expect(result).toHaveLength(1);
      expect(result[0].k).toBeGreaterThanOrEqual(90); // Near highest high
    });

    it('should handle oversold condition (%K near 0)', () => {
      const oversoldPrices = [
        { time: 1000, close: 80, high: 100, low: 80 },
        { time: 2000, close: 81, high: 101, low: 81 },
        { time: 3000, close: 80, high: 100, low: 80 },
      ];

      const result = calculateStochastic(oversoldPrices, 3, 3);

      expect(result).toHaveLength(1);
      expect(result[0].k).toBeLessThanOrEqual(10); // Near lowest low
    });
  });

  describe('Custom Periods', () => {
    it('should work with short %K period (5)', () => {
      const result = calculateStochastic(testPrices, 5, 3);

      expect(result).toBeDefined();
      expect(result.length).toBe(testPrices.length - 5 + 1);
      expect(result.length).toBe(16); // 20 - 5 + 1 = 16
    });

    it('should work with long %K period (20)', () => {
      const longPrices = Array.from({ length: 30 }, (_, i) => ({
        time: (i + 1) * 1000,
        close: 100 + i,
        high: 105 + i,
        low: 95 + i,
      }));

      const result = calculateStochastic(longPrices, 20, 3);

      expect(result).toBeDefined();
      expect(result.length).toBe(longPrices.length - 20 + 1);
      expect(result.length).toBe(11); // 30 - 20 + 1 = 11
    });

    it('should work with custom %D period (5)', () => {
      const result = calculateStochastic(testPrices, 14, 5);

      expect(result).toBeDefined();
      result.forEach((point: StochasticData) => {
        expect(point.d).toBeGreaterThanOrEqual(0);
        expect(point.d).toBeLessThanOrEqual(100);
      });
    });

    it('should work with %K=5, %D=3 (Fast Stochastic)', () => {
      const result = calculateStochastic(testPrices, 5, 3);

      expect(result).toBeDefined();
      expect(result.length).toBe(16); // 20 - 5 + 1
    });

    it('should work with %K=21, %D=9 (Slow Stochastic)', () => {
      const longPrices = Array.from({ length: 30 }, (_, i) => ({
        time: (i + 1) * 1000,
        close: 100 + Math.sin(i / 3) * 10,
        high: 110 + Math.sin(i / 3) * 10,
        low: 90 + Math.sin(i / 3) * 10,
      }));

      const result = calculateStochastic(longPrices, 21, 9);

      expect(result).toBeDefined();
      expect(result.length).toBe(10); // 30 - 21 + 1
    });

    it('should work with %K=14, %D=1 (No smoothing)', () => {
      const result = calculateStochastic(testPrices, 14, 1);

      expect(result).toBeDefined();
      // %D with period 1 should equal %K (no smoothing)
      result.forEach((point: StochasticData) => {
        expect(point.d).toBe(point.k);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should return empty array for empty prices', () => {
      const result = calculateStochastic([], 14, 3);

      expect(result).toEqual([]);
    });

    it('should return empty array when prices.length < kPeriod', () => {
      const fewPrices = [
        { time: 1000, close: 100, high: 105, low: 95 },
        { time: 2000, close: 102, high: 107, low: 97 },
        { time: 3000, close: 98, high: 103, low: 93 },
      ];

      const result = calculateStochastic(fewPrices, 14, 3);

      expect(result).toEqual([]);
    });

    it('should return empty array for zero %K period', () => {
      const result = calculateStochastic(testPrices, 0, 3);

      expect(result).toEqual([]);
    });

    it('should return empty array for negative %K period', () => {
      const result = calculateStochastic(testPrices, -5, 3);

      expect(result).toEqual([]);
    });

    it('should return empty array for zero %D period', () => {
      const result = calculateStochastic(testPrices, 14, 0);

      expect(result).toEqual([]);
    });

    it('should return empty array for negative %D period', () => {
      const result = calculateStochastic(testPrices, 14, -3);

      expect(result).toEqual([]);
    });

    it('should handle zero range (all prices identical)', () => {
      const flatPrices = [
        { time: 1000, close: 100, high: 100, low: 100 },
        { time: 2000, close: 100, high: 100, low: 100 },
        { time: 3000, close: 100, high: 100, low: 100 },
      ];

      const result = calculateStochastic(flatPrices, 3, 3);

      expect(result).toHaveLength(1);
      expect(result[0].k).toBe(50); // Neutral when no movement
    });

    it('should handle very small price ranges', () => {
      const smallRangePrices = [
        { time: 1000, close: 100.01, high: 100.02, low: 100.0 },
        { time: 2000, close: 100.015, high: 100.025, low: 100.005 },
        { time: 3000, close: 100.01, high: 100.02, low: 100.0 },
      ];

      const result = calculateStochastic(smallRangePrices, 3, 3);

      expect(result).toBeDefined();
      expect(result[0].k).toBeGreaterThanOrEqual(0);
      expect(result[0].k).toBeLessThanOrEqual(100);
    });

    it('should handle very large prices', () => {
      const largePrices = testPrices.map((p) => ({
        time: p.time,
        close: p.close * 1000000,
        high: p.high * 1000000,
        low: p.low * 1000000,
      }));

      const result = calculateStochastic(largePrices, 14, 3);

      expect(result).toBeDefined();
      expect(result.length).toBe(7);
      result.forEach((point: StochasticData) => {
        expect(point.k).toBeGreaterThanOrEqual(0);
        expect(point.k).toBeLessThanOrEqual(100);
      });
    });

    it('should round values to 2 decimal places', () => {
      const result = calculateStochastic(testPrices, 14, 3);

      result.forEach((point: StochasticData) => {
        // Check that values have at most 2 decimal places
        expect(point.k.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
        expect(point.d.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Stochastic Interpretation', () => {
    it('should identify overbought condition (%K > 80)', () => {
      const interpretation = interpretStochastic(85, 82);

      expect(interpretation.signal).toBe('overbought');
      expect(interpretation.description).toContain('Overbought');
      expect(interpretation.description).toContain('sell');
    });

    it('should identify oversold condition (%K < 20)', () => {
      const interpretation = interpretStochastic(15, 18);

      expect(interpretation.signal).toBe('oversold');
      expect(interpretation.description).toContain('Oversold');
      expect(interpretation.description).toContain('buy');
    });

    it('should identify neutral condition (20 <= %K <= 80)', () => {
      const interpretation = interpretStochastic(50, 52);

      expect(interpretation.signal).toBe('neutral');
      expect(interpretation.description).toContain('Neutral');
    });

    it('should detect bullish crossover (%K crosses above %D)', () => {
      const interpretation = interpretStochastic(55, 52, 48, 50);

      expect(interpretation.crossover).toBe('bullish');
      expect(interpretation.description).toContain('Bullish crossover');
      expect(interpretation.description).toContain('%K crossed above %D');
    });

    it('should detect bearish crossover (%K crosses below %D)', () => {
      const interpretation = interpretStochastic(48, 52, 55, 50);

      expect(interpretation.crossover).toBe('bearish');
      expect(interpretation.description).toContain('Bearish crossover');
      expect(interpretation.description).toContain('%K crossed below %D');
    });

    it('should detect no crossover when %K and %D move together', () => {
      const interpretation = interpretStochastic(55, 52, 50, 48);

      expect(interpretation.crossover).toBe('none');
      expect(interpretation.description).not.toContain('crossover');
    });

    it('should not detect crossover when previous values not provided', () => {
      const interpretation = interpretStochastic(55, 52);

      expect(interpretation.crossover).toBe('none');
    });

    it('should calculate strength correctly (distance from 50)', () => {
      const overboughtStrength = interpretStochastic(90, 88);
      expect(overboughtStrength.strength).toBeCloseTo(80, 1); // (90-50)*2 = 80

      const oversoldStrength = interpretStochastic(10, 12);
      expect(oversoldStrength.strength).toBeCloseTo(80, 1); // (50-10)*2 = 80

      const neutralStrength = interpretStochastic(50, 50);
      expect(neutralStrength.strength).toBe(0); // (50-50)*2 = 0
    });
  });

  describe('Latest Stochastic Value', () => {
    it('should return latest Stochastic value from array', () => {
      const stochastic = calculateStochastic(testPrices, 14, 3);
      const latest = getLatestStochastic(stochastic);

      expect(latest).toBeDefined();
      expect(latest).toEqual(stochastic[stochastic.length - 1]);
      expect(latest!.time).toBe(testPrices[testPrices.length - 1].time);
    });

    it('should return undefined for empty array', () => {
      const latest = getLatestStochastic([]);

      expect(latest).toBeUndefined();
    });

    it('should return first value when only one data point', () => {
      const singlePoint: StochasticData = { time: 1000, k: 50, d: 50 };
      const latest = getLatestStochastic([singlePoint]);

      expect(latest).toBeDefined();
      expect(latest).toEqual(singlePoint);
    });

    it('should work with calculateStochastic result', () => {
      const stochastic = calculateStochastic(testPrices, 14, 3);
      const latest = getLatestStochastic(stochastic);

      expect(latest).toBeDefined();
      expect(latest!.k).toBeGreaterThanOrEqual(0);
      expect(latest!.k).toBeLessThanOrEqual(100);
      expect(latest!.d).toBeGreaterThanOrEqual(0);
      expect(latest!.d).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance', () => {
    it('should handle 1000 prices efficiently', () => {
      const largePrices = Array.from({ length: 1000 }, (_, i) => ({
        time: (i + 1) * 1000,
        close: 100 + Math.sin(i / 10) * 20,
        high: 110 + Math.sin(i / 10) * 20,
        low: 90 + Math.sin(i / 10) * 20,
      }));

      const start = performance.now();
      const result = calculateStochastic(largePrices, 14, 3);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(result.length).toBe(largePrices.length - 14 + 1);
      expect(duration).toBeLessThan(50); // Should complete in <50ms
    });

    it('should handle 10000 prices efficiently', () => {
      const massivePrices = Array.from({ length: 10000 }, (_, i) => ({
        time: (i + 1) * 1000,
        close: 100 + Math.sin(i / 100) * 30,
        high: 115 + Math.sin(i / 100) * 30,
        low: 85 + Math.sin(i / 100) * 30,
      }));

      const start = performance.now();
      const result = calculateStochastic(massivePrices, 14, 3);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(result.length).toBe(massivePrices.length - 14 + 1);
      expect(duration).toBeLessThan(200); // Should complete in <200ms
    });

    it('should handle interpretation efficiently (1000 calls)', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        interpretStochastic(50 + i % 50, 50 + (i + 1) % 50, 50 + (i - 1) % 50, 50 + i % 50);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // Should complete in <10ms
    });

    it('should handle getLatestStochastic efficiently (10000 calls)', () => {
      const stochastic = calculateStochastic(testPrices, 14, 3);

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        getLatestStochastic(stochastic);
      }
      const duration = performance.now() - start;

      // Allow 50ms tolerance for CI/container environments, GC pauses, and different Node.js versions
      expect(duration).toBeLessThan(50);
    });

    it('should handle long period (50) with 1000 prices efficiently', () => {
      const prices = Array.from({ length: 1000 }, (_, i) => ({
        time: (i + 1) * 1000,
        close: 100 + Math.random() * 20,
        high: 110 + Math.random() * 20,
        low: 90 + Math.random() * 20,
      }));

      const start = performance.now();
      const result = calculateStochastic(prices, 50, 10);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(result.length).toBe(prices.length - 50 + 1);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });
  });
});
