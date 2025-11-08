import { describe, expect, it } from 'vitest';
import { calculateRSI, getLatestRSI, interpretRSI } from '@/services/indicators/rsi';

describe('RSI Indicator', () => {
  describe('TestRSICalculation', () => {
    it('returns empty array for empty input', () => {
      const result = calculateRSI([]);
      expect(result).toEqual([]);
    });

    it('returns nulls for insufficient data (less than period + 1)', () => {
      const prices = [100, 102, 101, 103, 105];
      const result = calculateRSI(prices, 14); // Default period 14, need 15 prices
      
      expect(result).toHaveLength(5);
      expect(result.every((v: number | null) => v === null)).toBe(true);
    });

    it('calculates RSI with known dataset (period=14)', () => {
      // Test data with known RSI values
      // Uptrend: prices going up should result in high RSI (>50)
      const prices = [
        44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84,
        46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03,
      ];
      
      const result = calculateRSI(prices, 14);
      
      // First 14 values should be null (not enough data)
      for (let i = 0; i < 14; i++) {
        expect(result[i]).toBeNull();
      }
      
      // 15th value (index 14) should be a valid RSI
      expect(result[14]).not.toBeNull();
      expect(result[14]).toBeGreaterThan(0);
      expect(result[14]).toBeLessThan(100);
      
      // Last values should reflect uptrend (RSI > 50)
      const lastRSI = result[result.length - 1];
      expect(lastRSI).not.toBeNull();
      expect(lastRSI!).toBeGreaterThan(50);
    });

    it('calculates overbought RSI (approaching 100)', () => {
      // Strong uptrend - consecutive gains
      const prices = [100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175];
      
      const result = calculateRSI(prices, 14);
      const lastRSI = result[result.length - 1];
      
      expect(lastRSI).not.toBeNull();
      expect(lastRSI!).toBeGreaterThan(70); // Overbought threshold
      expect(lastRSI!).toBeLessThanOrEqual(100);
    });

    it('calculates oversold RSI (approaching 0)', () => {
      // Strong downtrend - consecutive losses
      const prices = [175, 170, 165, 160, 155, 150, 145, 140, 135, 130, 125, 120, 115, 110, 105, 100];
      
      const result = calculateRSI(prices, 14);
      const lastRSI = result[result.length - 1];
      
      expect(lastRSI).not.toBeNull();
      expect(lastRSI!).toBeLessThan(30); // Oversold threshold
      expect(lastRSI!).toBeGreaterThanOrEqual(0);
    });

    it('calculates neutral RSI (~50) for balanced market', () => {
      // Alternating gains and losses
      const prices = [100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102];
      
      const result = calculateRSI(prices, 14);
      const lastRSI = result[result.length - 1];
      
      expect(lastRSI).not.toBeNull();
      expect(lastRSI!).toBeGreaterThan(40);
      expect(lastRSI!).toBeLessThan(60);
    });

    it('uses default period of 14', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      
      const resultDefault = calculateRSI(prices);
      const resultExplicit = calculateRSI(prices, 14);
      
      expect(resultDefault).toEqual(resultExplicit);
    });

    it('calculates RSI with custom period', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      
      const result7 = calculateRSI(prices, 7);
      const result14 = calculateRSI(prices, 14);
      
      // Different periods should give different results
      expect(result7).not.toEqual(result14);
      
      // Period 7 needs 8 prices, so first 7 are null
      expect(result7.slice(0, 7).every((v: number | null) => v === null)).toBe(true);
      expect(result7[7]).not.toBeNull();
      
      // Period 14 needs 15 prices, so first 14 are null
      expect(result14.slice(0, 14).every((v: number | null) => v === null)).toBe(true);
      expect(result14[14]).not.toBeNull();
    });

    it('calculates RSI with real market data', () => {
      // Real Bitcoin price data (simplified)
      const prices = [
        42000, 42500, 42300, 43000, 43500, 43200, 44000, 44500,
        44300, 45000, 45500, 45200, 46000, 46500, 46300, 47000,
        47500, 47200, 48000, 48500
      ];
      
      const result = calculateRSI(prices, 14);
      
      // Should have valid RSI values for last few prices
      const validValues = result.filter((v: number | null): v is number => v !== null);
      expect(validValues.length).toBeGreaterThan(0);
      
      // All valid RSI values should be between 0 and 100
      validValues.forEach((rsi: number) => {
        expect(rsi).toBeGreaterThanOrEqual(0);
        expect(rsi).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('TestRSIEdgeCases', () => {
    it('handles single price', () => {
      const result = calculateRSI([100]);
      expect(result).toEqual([null]);
    });

    it('handles all same prices (no change)', () => {
      const prices = Array(20).fill(100);
      const result = calculateRSI(prices, 14);
      
      // When there's no price change, avgGain and avgLoss are both 0
      // RS = 0/0 is handled as 100 (no losses)
      const lastRSI = result[result.length - 1];
      expect(lastRSI).not.toBeNull();
      expect(lastRSI).toBe(100); // Special case: no losses = overbought
    });

    it('handles negative prices', () => {
      const prices = [-100, -95, -90, -85, -80, -75, -70, -65, -60, -55, -50, -45, -40, -35, -30, -25];
      
      const result = calculateRSI(prices, 14);
      const lastRSI = result[result.length - 1];
      
      // RSI calculation works with negative prices (it's about changes)
      expect(lastRSI).not.toBeNull();
      expect(lastRSI!).toBeGreaterThan(70); // Uptrend (increasing values)
    });

    it('handles very large numbers', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 1e10 + i * 1e8);
      
      const result = calculateRSI(prices, 14);
      const lastRSI = result[result.length - 1];
      
      expect(lastRSI).not.toBeNull();
      expect(lastRSI!).toBeGreaterThan(0);
      expect(lastRSI!).toBeLessThanOrEqual(100); // Changed to <= 100 (can be exactly 100 for strong uptrend)
      expect(Number.isFinite(lastRSI!)).toBe(true);
    });

    it('handles very small price changes', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 0.0001);
      
      const result = calculateRSI(prices, 14);
      const lastRSI = result[result.length - 1];
      
      expect(lastRSI).not.toBeNull();
      expect(Number.isFinite(lastRSI!)).toBe(true);
    });

    it('throws error for invalid period (zero)', () => {
      const prices = [100, 101, 102];
      expect(() => calculateRSI(prices, 0)).toThrow('Period must be a positive finite number');
    });

    it('throws error for invalid period (negative)', () => {
      const prices = [100, 101, 102];
      expect(() => calculateRSI(prices, -5)).toThrow('Period must be a positive finite number');
    });

    it('throws error for invalid period (infinity)', () => {
      const prices = [100, 101, 102];
      expect(() => calculateRSI(prices, Infinity)).toThrow('Period must be a positive finite number');
    });
  });

  describe('TestRSIPerformance', () => {
    it('handles large dataset efficiently (10,000 prices)', () => {
      const prices = Array.from({ length: 10000 }, (_, i) => 100 + Math.sin(i / 10) * 5);
      
      const start = performance.now();
      const result = calculateRSI(prices, 14);
      const duration = performance.now() - start;
      
      expect(result).toHaveLength(10000);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
      
      // Verify correctness
      const validValues = result.filter((v: number | null): v is number => v !== null);
      expect(validValues.length).toBe(10000 - 14);
      validValues.forEach((rsi: number) => {
        expect(rsi).toBeGreaterThanOrEqual(0);
        expect(rsi).toBeLessThanOrEqual(100);
      });
    });

    it('memory efficiency - does not create excessive arrays', () => {
      const prices = Array.from({ length: 1000 }, (_, i) => 100 + i);
      
      const result = calculateRSI(prices, 14);
      
      // Result array should match input length
      expect(result).toHaveLength(prices.length);
    });

    it('supports incremental calculation (streaming data)', () => {
      // Simulate streaming data - calculate RSI as new prices arrive
      const basePrices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const result1 = calculateRSI(basePrices, 14);
      
      // Add new price
      const newPrices = [...basePrices, 121];
      const result2 = calculateRSI(newPrices, 14);
      
      // Previous values should remain the same
      for (let i = 0; i < result1.length; i++) {
        expect(result2[i]).toBe(result1[i]);
      }
      
      // New value should be calculated
      expect(result2[result2.length - 1]).not.toBeNull();
    });
  });

  describe('TestRSIIntegration', () => {
    it('integrates with PriceChart data structure', () => {
      // Simulate candle data from PriceChart
      const candles = [
        { time: 1, open: 100, high: 105, low: 98, close: 102, volume: 1000 },
        { time: 2, open: 102, high: 108, low: 101, close: 106, volume: 1200 },
        { time: 3, open: 106, high: 110, low: 104, close: 108, volume: 1100 },
        { time: 4, open: 108, high: 112, low: 107, close: 110, volume: 1300 },
        { time: 5, open: 110, high: 115, low: 109, close: 113, volume: 1400 },
        { time: 6, open: 113, high: 118, low: 112, close: 116, volume: 1500 },
        { time: 7, open: 116, high: 120, low: 115, close: 118, volume: 1600 },
        { time: 8, open: 118, high: 123, low: 117, close: 121, volume: 1700 },
        { time: 9, open: 121, high: 126, low: 120, close: 124, volume: 1800 },
        { time: 10, open: 124, high: 129, low: 123, close: 127, volume: 1900 },
        { time: 11, open: 127, high: 132, low: 126, close: 130, volume: 2000 },
        { time: 12, open: 130, high: 135, low: 129, close: 133, volume: 2100 },
        { time: 13, open: 133, high: 138, low: 132, close: 136, volume: 2200 },
        { time: 14, open: 136, high: 141, low: 135, close: 139, volume: 2300 },
        { time: 15, open: 139, high: 144, low: 138, close: 142, volume: 2400 },
        { time: 16, open: 142, high: 147, low: 141, close: 145, volume: 2500 },
      ];
      
      const closePrices = candles.map(c => c.close);
      const rsiValues = calculateRSI(closePrices, 14);
      
      expect(rsiValues).toHaveLength(candles.length);
      
      // Can create indicator data structure
      const indicatorData = candles.map((candle, i) => ({
        time: candle.time,
        rsi: rsiValues[i],
      }));
      
      expect(indicatorData).toHaveLength(candles.length);
      expect(indicatorData[15].rsi).not.toBeNull();
    });

    it('supports real-time updates with getLatestRSI', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      
      const latest = getLatestRSI(prices, 14);
      const fullResult = calculateRSI(prices, 14);
      
      expect(latest).toBe(fullResult[fullResult.length - 1]);
    });

    it('interprets RSI values correctly', () => {
      expect(interpretRSI(null)).toBe('Insufficient data');
      expect(interpretRSI(75)).toBe('Overbought');
      expect(interpretRSI(70)).toBe('Overbought');
      expect(interpretRSI(25)).toBe('Oversold');
      expect(interpretRSI(30)).toBe('Oversold');
      expect(interpretRSI(50)).toBe('Neutral');
      expect(interpretRSI(45)).toBe('Neutral');
      expect(interpretRSI(55)).toBe('Neutral');
    });

    it('coexists with multiple indicators', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 5) * 10);
      
      // Calculate RSI with different periods
      const rsi14 = calculateRSI(prices, 14);
      const rsi7 = calculateRSI(prices, 7);
      
      // Both should have valid values
      expect(rsi14.filter((v: number | null) => v !== null).length).toBeGreaterThan(0);
      expect(rsi7.filter((v: number | null) => v !== null).length).toBeGreaterThan(0);
      
      // Different periods give different results
      expect(rsi14).not.toEqual(rsi7);
      
      // Can be used together in indicator panel
      const lastIndex = prices.length - 1;
      expect(rsi14[lastIndex]).not.toBeNull();
      expect(rsi7[lastIndex]).not.toBeNull();
    });
  });
});
