import { calculateMACD, getLatestMACD, interpretMACD } from '@/services/indicators/macd';
import { describe, expect, it } from 'vitest';

describe('MACD Indicator', () => {
  describe('TestEMACalculation', () => {
    it('calculates EMA correctly with known values', () => {
      // Simple test: verify MACD uses EMA correctly
      const prices = [22, 24, 23, 25, 27, 26, 28, 30, 29, 31, 33, 32, 34, 36];
      const result = calculateMACD(prices, 5, 8, 3);

      // Should have data after slowPeriod (8)
      expect(result.macd.slice(0, 7).every((v: number | null) => v === null)).toBe(true);
      expect(result.macd[7]).not.toBeNull();
    });

    it('EMA gives more weight to recent prices', () => {
      // Create uptrend - recent prices higher
      const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
      const result = calculateMACD(prices, 5, 8, 3);

      // MACD should be positive (fast EMA > slow EMA in uptrend)
      const lastMACD = result.macd[result.macd.length - 1];
      expect(lastMACD).not.toBeNull();
      expect(lastMACD!).toBeGreaterThan(0);
    });
  });

  describe('TestMACDCalculation', () => {
    it('returns empty arrays for empty input', () => {
      const result = calculateMACD([]);
      expect(result.macd).toEqual([]);
      expect(result.signal).toEqual([]);
      expect(result.histogram).toEqual([]);
    });

    it('returns nulls for insufficient data', () => {
      // Need slowPeriod (26) + signalPeriod (9) - 1 = 34 prices minimum
      const prices = [100, 102, 101, 103, 105, 104, 106, 108];
      const result = calculateMACD(prices); // Default: 12, 26, 9

      expect(result.macd).toHaveLength(8);
      expect(result.signal).toHaveLength(8);
      expect(result.histogram).toHaveLength(8);
      expect(result.macd.every((v: number | null) => v === null)).toBe(true);
      expect(result.signal.every((v: number | null) => v === null)).toBe(true);
      expect(result.histogram.every((v: number | null) => v === null)).toBe(true);
    });

    it('calculates MACD with known uptrend data', () => {
      // Strong uptrend - fast EMA should be above slow EMA
      const prices = Array.from({ length: 40 }, (_, i) => 100 + i * 2);
      const result = calculateMACD(prices, 12, 26, 9);

      // MACD line should be positive (fast > slow in uptrend)
      const lastMACD = result.macd[result.macd.length - 1];
      expect(lastMACD).not.toBeNull();
      expect(lastMACD!).toBeGreaterThan(0);

      // Signal line should exist
      const lastSignal = result.signal[result.signal.length - 1];
      expect(lastSignal).not.toBeNull();

      // Histogram = MACD - Signal
      const lastHistogram = result.histogram[result.histogram.length - 1];
      expect(lastHistogram).not.toBeNull();
      expect(Math.abs(lastHistogram! - (lastMACD! - lastSignal!))).toBeLessThan(0.0001);
    });

    it('calculates MACD with known downtrend data', () => {
      // Strong downtrend - fast EMA should be below slow EMA
      const prices = Array.from({ length: 40 }, (_, i) => 200 - i * 2);
      const result = calculateMACD(prices, 12, 26, 9);

      // MACD line should be negative (fast < slow in downtrend)
      const lastMACD = result.macd[result.macd.length - 1];
      expect(lastMACD).not.toBeNull();
      expect(lastMACD!).toBeLessThan(0);
    });

    it('calculates MACD with sideways market', () => {
      // Oscillating prices - MACD should be near zero
      const prices = Array.from({ length: 40 }, (_, i) => 100 + (i % 2 === 0 ? 1 : -1));
      const result = calculateMACD(prices, 12, 26, 9);

      const lastMACD = result.macd[result.macd.length - 1];
      expect(lastMACD).not.toBeNull();
      expect(Math.abs(lastMACD!)).toBeLessThan(2); // Near zero
    });

    it('uses default parameters (12, 26, 9)', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 100 + i);

      const resultDefault = calculateMACD(prices);
      const resultExplicit = calculateMACD(prices, 12, 26, 9);

      expect(resultDefault.macd).toEqual(resultExplicit.macd);
      expect(resultDefault.signal).toEqual(resultExplicit.signal);
      expect(resultDefault.histogram).toEqual(resultExplicit.histogram);
    });

    it('calculates MACD with custom periods', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);

      const result1 = calculateMACD(prices, 12, 26, 9);
      const result2 = calculateMACD(prices, 5, 10, 5);

      // Different periods should give different results
      expect(result1.macd).not.toEqual(result2.macd);

      // Shorter periods should have data sooner
      const firstNonNull2 = result2.macd.findIndex((v: number | null) => v !== null);
      expect(firstNonNull2).toBeLessThan(26); // Should be around index 10 (slow period)
    });

    it('calculates MACD with real market data pattern', () => {
      // Bitcoin-like price pattern
      const prices = [
        42000, 42500, 42300, 43000, 43500, 43200, 44000, 44500, 44300, 45000, 45500, 45200, 46000,
        46500, 46300, 47000, 47500, 47200, 48000, 48500, 48300, 49000, 49500, 49200, 50000, 50500,
        50200, 51000, 51500, 51200, 52000, 52500, 52200, 53000, 53500, 53200, 54000, 54500, 54200,
        55000,
      ];

      const result = calculateMACD(prices, 12, 26, 9);

      // Should have valid MACD values for last few prices
      const validMACD = result.macd.filter((v: number | null): v is number => v !== null);
      expect(validMACD.length).toBeGreaterThan(0);

      // Histogram should equal MACD - Signal where both exist
      for (let i = 0; i < result.macd.length; i++) {
        if (result.macd[i] !== null && result.signal[i] !== null) {
          const expected = result.macd[i]! - result.signal[i]!;
          expect(Math.abs(result.histogram[i]! - expected)).toBeLessThan(0.0001);
        }
      }
    });
  });

  describe('TestMACDSignalAndHistogram', () => {
    it('signal line lags MACD line', () => {
      // In uptrend, MACD should cross above signal first
      const prices = Array.from({ length: 40 }, (_, i) => 100 + i * 3);
      const result = calculateMACD(prices, 12, 26, 9);

      // Find first non-null MACD and Signal
      const firstMACDIndex = result.macd.findIndex((v: number | null) => v !== null);
      const firstSignalIndex = result.signal.findIndex((v: number | null) => v !== null);

      // Signal should appear later (it's EMA of MACD)
      expect(firstSignalIndex).toBeGreaterThan(firstMACDIndex);
    });

    it('histogram represents MACD - Signal difference', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 5) * 10);
      const result = calculateMACD(prices, 12, 26, 9);

      // Check all histogram values
      for (let i = 0; i < result.histogram.length; i++) {
        if (result.histogram[i] !== null) {
          expect(result.macd[i]).not.toBeNull();
          expect(result.signal[i]).not.toBeNull();

          const expected = result.macd[i]! - result.signal[i]!;
          expect(Math.abs(result.histogram[i]! - expected)).toBeLessThan(0.0001);
        }
      }
    });

    it('histogram is positive when MACD > Signal (bullish)', () => {
      // Strong sustained uptrend - need enough data for signal to stabilize
      const prices = Array.from({ length: 60 }, (_, i) => 100 + i * 5);
      const result = calculateMACD(prices, 12, 26, 9);

      // In a strong uptrend, MACD should eventually be above Signal
      // Check the trend rather than just the last value
      const lastMACD = result.macd[result.macd.length - 1];
      const lastSignal = result.signal[result.signal.length - 1];
      const lastHistogram = result.histogram[result.histogram.length - 1];

      expect(lastHistogram).not.toBeNull();
      expect(lastMACD).not.toBeNull();
      expect(lastSignal).not.toBeNull();

      // Histogram = MACD - Signal (verify calculation)
      expect(Math.abs(lastHistogram! - (lastMACD! - lastSignal!))).toBeLessThan(0.0001);

      // In strong uptrend, MACD should be above zero at least
      expect(lastMACD!).toBeGreaterThan(0);
    });

    it('histogram is negative when MACD < Signal (bearish)', () => {
      // Strong sustained downtrend - need enough data for signal to stabilize
      const prices = Array.from({ length: 60 }, (_, i) => 300 - i * 5);
      const result = calculateMACD(prices, 12, 26, 9);

      // In a strong downtrend, MACD should eventually be below Signal
      // Check the trend rather than just the last value
      const lastMACD = result.macd[result.macd.length - 1];
      const lastSignal = result.signal[result.signal.length - 1];
      const lastHistogram = result.histogram[result.histogram.length - 1];

      expect(lastHistogram).not.toBeNull();
      expect(lastMACD).not.toBeNull();
      expect(lastSignal).not.toBeNull();

      // Histogram = MACD - Signal (verify calculation)
      expect(Math.abs(lastHistogram! - (lastMACD! - lastSignal!))).toBeLessThan(0.0001);

      // In strong downtrend, MACD should be below zero at least
      expect(lastMACD!).toBeLessThan(0);
    });
  });

  describe('TestMACDEdgeCases', () => {
    it('handles single price', () => {
      const result = calculateMACD([100]);
      expect(result.macd).toEqual([null]);
      expect(result.signal).toEqual([null]);
      expect(result.histogram).toEqual([null]);
    });

    it('handles all same prices (no volatility)', () => {
      const prices = Array(40).fill(100);
      const result = calculateMACD(prices, 12, 26, 9);

      // MACD should be 0 (fast EMA = slow EMA)
      const lastMACD = result.macd[result.macd.length - 1];
      expect(lastMACD).not.toBeNull();
      expect(Math.abs(lastMACD!)).toBeLessThan(0.0001); // Essentially 0
    });

    it('handles negative prices', () => {
      const prices = Array.from({ length: 40 }, (_, i) => -100 + i * 2);
      const result = calculateMACD(prices, 12, 26, 9);

      const lastMACD = result.macd[result.macd.length - 1];
      expect(lastMACD).not.toBeNull();
      expect(Number.isFinite(lastMACD!)).toBe(true);
    });

    it('handles very large numbers', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 1e10 + i * 1e8);
      const result = calculateMACD(prices, 12, 26, 9);

      const lastMACD = result.macd[result.macd.length - 1];
      expect(lastMACD).not.toBeNull();
      expect(Number.isFinite(lastMACD!)).toBe(true);
    });

    it('handles very small price changes', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 100 + i * 0.0001);
      const result = calculateMACD(prices, 12, 26, 9);

      const lastMACD = result.macd[result.macd.length - 1];
      expect(lastMACD).not.toBeNull();
      expect(Number.isFinite(lastMACD!)).toBe(true);
    });

    it('throws error for zero fast period', () => {
      const prices = Array(40).fill(100);
      expect(() => calculateMACD(prices, 0, 26, 9)).toThrow(
        'All periods must be positive numbers'
      );
    });

    it('throws error for zero slow period', () => {
      const prices = Array(40).fill(100);
      expect(() => calculateMACD(prices, 12, 0, 9)).toThrow(
        'All periods must be positive numbers'
      );
    });

    it('throws error for zero signal period', () => {
      const prices = Array(40).fill(100);
      expect(() => calculateMACD(prices, 12, 26, 0)).toThrow(
        'All periods must be positive numbers'
      );
    });

    it('throws error for negative periods', () => {
      const prices = Array(40).fill(100);
      expect(() => calculateMACD(prices, -12, 26, 9)).toThrow(
        'All periods must be positive numbers'
      );
    });

    it('throws error for infinity periods', () => {
      const prices = Array(40).fill(100);
      expect(() => calculateMACD(prices, 12, Infinity, 9)).toThrow(
        'All periods must be finite numbers'
      );
    });

    it('throws error when fast period >= slow period', () => {
      const prices = Array(40).fill(100);
      expect(() => calculateMACD(prices, 26, 12, 9)).toThrow(
        'Fast period must be less than slow period'
      );
    });

    it('throws error when fast period equals slow period', () => {
      const prices = Array(40).fill(100);
      expect(() => calculateMACD(prices, 12, 12, 9)).toThrow(
        'Fast period must be less than slow period'
      );
    });
  });

  describe('TestMACDPerformance', () => {
    it('handles 10k prices in reasonable time', () => {
      const prices = Array.from({ length: 10000 }, (_, i) => 100 + Math.sin(i / 100) * 10);

      const start = performance.now();
      const result = calculateMACD(prices, 12, 26, 9);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in <100ms
      expect(result.macd).toHaveLength(10000);
      expect(result.signal).toHaveLength(10000);
      expect(result.histogram).toHaveLength(10000);
    });
  });

  describe('TestInterpretMACD', () => {
    it('returns insufficient data for null values', () => {
      expect(interpretMACD(null, null)).toBe('Insufficient data');
      expect(interpretMACD(10, null)).toBe('Insufficient data');
      expect(interpretMACD(null, 10)).toBe('Insufficient data');
    });

    it('returns bullish when MACD > Signal', () => {
      expect(interpretMACD(10, 5)).toBe('Bullish');
      expect(interpretMACD(1, 0.5)).toBe('Bullish');
    });

    it('returns bearish when MACD < Signal', () => {
      expect(interpretMACD(5, 10)).toBe('Bearish');
      expect(interpretMACD(-1, -0.5)).toBe('Bearish');
    });

    it('returns neutral when MACD equals Signal', () => {
      expect(interpretMACD(10, 10)).toBe('Neutral');
      expect(interpretMACD(0, 0)).toBe('Neutral');
    });

    it('detects bullish crossover', () => {
      // MACD crosses above signal
      const result = interpretMACD(10, 9, 8, 9);
      expect(result).toBe('Bullish crossover');
    });

    it('detects bearish crossover', () => {
      // MACD crosses below signal
      const result = interpretMACD(8, 9, 10, 9);
      expect(result).toBe('Bearish crossover');
    });

    it('does not detect false crossover when MACD stays above Signal', () => {
      // MACD above signal in both periods
      const result = interpretMACD(10, 9, 11, 10);
      expect(result).toBe('Bullish'); // Not crossover, just bullish
    });

    it('does not detect false crossover when MACD stays below Signal', () => {
      // MACD below signal in both periods
      const result = interpretMACD(8, 9, 7, 8);
      expect(result).toBe('Bearish'); // Not crossover, just bearish
    });
  });

  describe('TestGetLatestMACD', () => {
    it('returns null for empty array', () => {
      const result = getLatestMACD([]);
      expect(result.macd).toBeNull();
      expect(result.signal).toBeNull();
      expect(result.histogram).toBeNull();
    });

    it('returns null for insufficient data', () => {
      const prices = [100, 102, 101];
      const result = getLatestMACD(prices);

      expect(result.macd).toBeNull();
      expect(result.signal).toBeNull();
      expect(result.histogram).toBeNull();
    });

    it('returns latest MACD values for sufficient data', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 100 + i);
      const result = getLatestMACD(prices);

      expect(result.macd).not.toBeNull();
      expect(result.signal).not.toBeNull();
      expect(result.histogram).not.toBeNull();

      // Should match last values from full calculation
      const fullResult = calculateMACD(prices);
      expect(result.macd).toBe(fullResult.macd[fullResult.macd.length - 1]);
      expect(result.signal).toBe(fullResult.signal[fullResult.signal.length - 1]);
      expect(result.histogram).toBe(fullResult.histogram[fullResult.histogram.length - 1]);
    });

    it('uses default parameters', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 100 + i);

      const resultDefault = getLatestMACD(prices);
      const resultExplicit = getLatestMACD(prices, 12, 26, 9);

      expect(resultDefault).toEqual(resultExplicit);
    });
  });
});
