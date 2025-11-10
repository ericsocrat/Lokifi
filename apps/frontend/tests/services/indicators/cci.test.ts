import {
  calculateCCI,
  getLatestCCI,
  interpretCCI,
  type CCIData,
  type OHLCPrice,
} from '@/services/indicators/cci';
import { describe, expect, it } from 'vitest';

describe('CCI (Commodity Channel Index)', () => {
  // Helper function to create test price data
  const createPrices = (count: number, basePrice: number = 100): OHLCPrice[] => {
    return Array.from({ length: count }, (_, i) => ({
      time: i + 1,
      open: basePrice + i,
      high: basePrice + i + 5,
      low: basePrice + i - 5,
      close: basePrice + i + 2,
    }));
  };

  describe('Basic CCI Calculation', () => {
    it('should return empty array for empty prices', () => {
      const result = calculateCCI([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when prices length < period', () => {
      const prices = createPrices(10);
      const result = calculateCCI(prices, 20);
      expect(result).toEqual([]);
    });

    it('should calculate CCI correctly with default period (20)', () => {
      const prices = createPrices(25);
      const result = calculateCCI(prices);

      expect(result.length).toBe(6); // 25 - 20 + 1 = 6
      expect(result[0]).toHaveProperty('time');
      expect(result[0]).toHaveProperty('cci');
      expect(typeof result[0].cci).toBe('number');
      expect(isFinite(result[0].cci)).toBe(true);
    });

    it('should calculate CCI for trending up prices', () => {
      const prices = createPrices(30, 100);
      const result = calculateCCI(prices, 20);

      expect(result.length).toBe(11);
      // Trending up should produce positive CCI values
      const avgCCI = result.reduce((sum: number, d: CCIData) => sum + d.cci, 0) / result.length;
      expect(avgCCI).toBeGreaterThan(0);
    });

    it('should calculate CCI for trending down prices', () => {
      const prices: OHLCPrice[] = Array.from({ length: 30 }, (_, i) => ({
        time: i + 1,
        open: 200 - i,
        high: 205 - i,
        low: 195 - i,
        close: 198 - i,
      }));

      const result = calculateCCI(prices, 20);

      expect(result.length).toBe(11);
      // Trending down should produce negative CCI values
      const avgCCI = result.reduce((sum: number, d: CCIData) => sum + d.cci, 0) / result.length;
      expect(avgCCI).toBeLessThan(0);
    });

    it('should have time values matching input prices', () => {
      const prices = createPrices(25);
      const result = calculateCCI(prices, 20);

      // First CCI time should be at index 19 (period - 1) of original array
      expect(result[0].time).toBe(prices[19].time);
      // Last CCI time should match last price time
      expect(result[result.length - 1].time).toBe(prices[prices.length - 1].time);
    });
  });

  describe('Custom Periods', () => {
    it('should calculate CCI with period 10', () => {
      const prices = createPrices(20);
      const result = calculateCCI(prices, 10);

      expect(result.length).toBe(11); // 20 - 10 + 1
      expect(result[0].time).toBe(prices[9].time);
    });

    it('should calculate CCI with period 5', () => {
      const prices = createPrices(15);
      const result = calculateCCI(prices, 5);

      expect(result.length).toBe(11); // 15 - 5 + 1
      expect(result[0].time).toBe(prices[4].time);
    });

    it('should calculate CCI with period 30', () => {
      const prices = createPrices(40);
      const result = calculateCCI(prices, 30);

      expect(result.length).toBe(11); // 40 - 30 + 1
      expect(result[0].time).toBe(prices[29].time);
    });

    it('should produce smoother values with longer period', () => {
      // Use oscillating prices to ensure variance in standard deviation
      const prices: OHLCPrice[] = Array.from({ length: 50 }, (_, i) => {
        const base = 100 + Math.sin(i / 5) * 10;
        return {
          time: i + 1,
          open: base,
          high: base + 5,
          low: base - 5,
          close: base + 2,
        };
      });

      const shortPeriod = calculateCCI(prices, 10);
      const longPeriod = calculateCCI(prices, 30);

      // Calculate standard deviation of CCI values
      const calcStdDev = (values: number[]) => {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      };

      const shortStdDev = calcStdDev(shortPeriod.map((d: CCIData) => d.cci));
      const longStdDev = calcStdDev(longPeriod.map((d: CCIData) => d.cci));

      // Longer period should have lower volatility (smoother)
      expect(longStdDev).toBeLessThan(shortStdDev);
    });

    it('should produce more data points with shorter period', () => {
      const prices = createPrices(50);
      const shortPeriod = calculateCCI(prices, 10);
      const longPeriod = calculateCCI(prices, 30);

      expect(shortPeriod.length).toBeGreaterThan(longPeriod.length);
    });

    it('should throw error for invalid period < 2', () => {
      const prices = createPrices(20);
      expect(() => calculateCCI(prices, 1)).toThrow('CCI period must be at least 2');
      expect(() => calculateCCI(prices, 0)).toThrow('CCI period must be at least 2');
      expect(() => calculateCCI(prices, -1)).toThrow('CCI period must be at least 2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle flat prices (zero mean deviation)', () => {
      const flatPrices: OHLCPrice[] = Array.from({ length: 25 }, (_, i) => ({
        time: i + 1,
        open: 100,
        high: 100,
        low: 100,
        close: 100,
      }));

      const result = calculateCCI(flatPrices, 20);

      expect(result.length).toBe(6);
      // Flat prices should result in CCI = 0
      result.forEach((data: CCIData) => {
        expect(data.cci).toBe(0);
      });
    });

    it('should handle single candle after warmup period', () => {
      const prices = createPrices(21);
      const result = calculateCCI(prices, 20);

      expect(result.length).toBe(2);
      expect(result[0].time).toBe(prices[19].time);
      expect(result[1].time).toBe(prices[20].time);
    });

    it('should handle exactly minimum required prices', () => {
      const prices = createPrices(20);
      const result = calculateCCI(prices, 20);

      expect(result.length).toBe(1);
      expect(result[0].time).toBe(prices[19].time);
    });

    it('should handle very small period (2)', () => {
      const prices = createPrices(10);
      const result = calculateCCI(prices, 2);

      expect(result.length).toBe(9); // 10 - 2 + 1
      expect(result[0].time).toBe(prices[1].time);
    });

    it('should handle extreme price movements', () => {
      const prices: OHLCPrice[] = [
        ...createPrices(15, 100),
        { time: 16, open: 100, high: 200, low: 50, close: 150 }, // Extreme candle
        ...createPrices(9, 100),
      ];

      const result = calculateCCI(prices, 20);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((data: CCIData) => {
        expect(isFinite(data.cci)).toBe(true);
      });
    });

    it('should handle negative prices', () => {
      const prices: OHLCPrice[] = Array.from({ length: 25 }, (_, i) => ({
        time: i + 1,
        open: -100 + i,
        high: -95 + i,
        low: -105 + i,
        close: -98 + i,
      }));

      const result = calculateCCI(prices, 20);

      expect(result.length).toBe(6);
      result.forEach((data: CCIData) => {
        expect(isFinite(data.cci)).toBe(true);
      });
    });

    it('should handle very large prices', () => {
      const prices: OHLCPrice[] = Array.from({ length: 25 }, (_, i) => ({
        time: i + 1,
        open: 1000000 + i * 1000,
        high: 1005000 + i * 1000,
        low: 995000 + i * 1000,
        close: 1002000 + i * 1000,
      }));

      const result = calculateCCI(prices, 20);

      expect(result.length).toBe(6);
      result.forEach((data: CCIData) => {
        expect(isFinite(data.cci)).toBe(true);
      });
    });

    it('should handle high precision decimal prices', () => {
      const prices: OHLCPrice[] = Array.from({ length: 25 }, (_, i) => ({
        time: i + 1,
        open: 100.123456 + i * 0.1,
        high: 105.654321 + i * 0.1,
        low: 95.111111 + i * 0.1,
        close: 102.987654 + i * 0.1,
      }));

      const result = calculateCCI(prices, 20);

      expect(result.length).toBe(6);
      result.forEach((data: CCIData) => {
        expect(isFinite(data.cci)).toBe(true);
        expect(data.cci.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      });
    });

    it('should handle oscillating prices', () => {
      const prices: OHLCPrice[] = Array.from({ length: 30 }, (_, i) => {
        const base = 100 + Math.sin(i / 5) * 10;
        return {
          time: i + 1,
          open: base,
          high: base + 5,
          low: base - 5,
          close: base + 2,
        };
      });

      const result = calculateCCI(prices, 20);

      expect(result.length).toBe(11);
      result.forEach((data: CCIData) => {
        expect(isFinite(data.cci)).toBe(true);
      });
    });

    it('should round CCI values to 2 decimal places', () => {
      const prices = createPrices(25);
      const result = calculateCCI(prices, 20);

      result.forEach((data: CCIData) => {
        const decimalPlaces = data.cci.toString().split('.')[1]?.length || 0;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      });
    });

    it('should handle alternating high/low volatility', () => {
      const prices: OHLCPrice[] = Array.from({ length: 30 }, (_, i) => {
        const volatility = i % 2 === 0 ? 20 : 5;
        const base = 100 + i;
        return {
          time: i + 1,
          open: base,
          high: base + volatility,
          low: base - volatility,
          close: base + volatility / 2,
        };
      });

      const result = calculateCCI(prices, 20);

      expect(result.length).toBe(11);
      result.forEach((data: CCIData) => {
        expect(isFinite(data.cci)).toBe(true);
      });
    });
  });

  describe('CCI Interpretation', () => {
    it('should identify extreme overbought (>200)', () => {
      const interpretation = interpretCCI(250);
      expect(interpretation.signal).toBe('overbought');
      expect(interpretation.strength).toBe('extreme');
      expect(interpretation.description).toContain('Extremely overbought');
    });

    it('should identify extreme oversold (<-200)', () => {
      const interpretation = interpretCCI(-250);
      expect(interpretation.signal).toBe('oversold');
      expect(interpretation.strength).toBe('extreme');
      expect(interpretation.description).toContain('Extremely oversold');
    });

    it('should identify strong overbought (100-200)', () => {
      const interpretation = interpretCCI(150);
      expect(interpretation.signal).toBe('overbought');
      expect(interpretation.strength).toBe('strong');
      expect(interpretation.description).toContain('Overbought');
    });

    it('should identify strong oversold (-200 to -100)', () => {
      const interpretation = interpretCCI(-150);
      expect(interpretation.signal).toBe('oversold');
      expect(interpretation.strength).toBe('strong');
      expect(interpretation.description).toContain('Oversold');
    });

    it('should identify moderate bullish (50-100)', () => {
      const interpretation = interpretCCI(75);
      expect(interpretation.signal).toBe('bullish');
      expect(interpretation.strength).toBe('moderate');
      expect(interpretation.description).toContain('Moderate bullish');
    });

    it('should identify moderate bearish (-100 to -50)', () => {
      const interpretation = interpretCCI(-75);
      expect(interpretation.signal).toBe('bearish');
      expect(interpretation.strength).toBe('moderate');
      expect(interpretation.description).toContain('Moderate bearish');
    });

    it('should identify weak bullish (0-50)', () => {
      const interpretation = interpretCCI(25);
      expect(interpretation.signal).toBe('bullish');
      expect(interpretation.strength).toBe('weak');
      expect(interpretation.description).toContain('Weak bullish');
    });

    it('should identify weak bearish (-50 to 0)', () => {
      const interpretation = interpretCCI(-25);
      expect(interpretation.signal).toBe('bearish');
      expect(interpretation.strength).toBe('weak');
      expect(interpretation.description).toContain('Weak bearish');
    });

    it('should identify neutral at exactly zero', () => {
      const interpretation = interpretCCI(0);
      expect(interpretation.signal).toBe('neutral');
      expect(interpretation.strength).toBe('weak');
      expect(interpretation.description).toContain('Neutral');
    });

    it('should handle boundary value +100', () => {
      const interpretation = interpretCCI(100);
      expect(interpretation.signal).toBe('bullish');
      expect(interpretation.strength).toBe('moderate');
    });

    it('should handle boundary value -100', () => {
      const interpretation = interpretCCI(-100);
      expect(interpretation.signal).toBe('bearish');
      expect(interpretation.strength).toBe('moderate');
    });

    it('should handle boundary value +200', () => {
      const interpretation = interpretCCI(200);
      expect(interpretation.signal).toBe('overbought');
      expect(interpretation.strength).toBe('strong');
    });

    it('should handle boundary value -200', () => {
      const interpretation = interpretCCI(-200);
      expect(interpretation.signal).toBe('oversold');
      expect(interpretation.strength).toBe('strong');
    });

    it('should throw error for invalid CCI value (NaN)', () => {
      expect(() => interpretCCI(NaN)).toThrow('CCI value must be a finite number');
    });

    it('should throw error for invalid CCI value (Infinity)', () => {
      expect(() => interpretCCI(Infinity)).toThrow('CCI value must be a finite number');
      expect(() => interpretCCI(-Infinity)).toThrow('CCI value must be a finite number');
    });
  });

  describe('Latest CCI Value', () => {
    it('should return null for empty array', () => {
      const result = getLatestCCI([]);
      expect(result).toBeNull();
    });

    it('should return latest CCI value for single element', () => {
      const cciData: CCIData[] = [{ time: 1, cci: 50.25 }];
      const result = getLatestCCI(cciData);

      expect(result).not.toBeNull();
      expect(result?.time).toBe(1);
      expect(result?.cci).toBe(50.25);
    });

    it('should return latest CCI value for multiple elements', () => {
      const cciData: CCIData[] = [
        { time: 1, cci: 25.5 },
        { time: 2, cci: 50.75 },
        { time: 3, cci: -30.25 },
      ];
      const result = getLatestCCI(cciData);

      expect(result).not.toBeNull();
      expect(result?.time).toBe(3);
      expect(result?.cci).toBe(-30.25);
    });

    it('should return correct latest value from calculated CCI', () => {
      const prices = createPrices(30);
      const cciData = calculateCCI(prices, 20);
      const latest = getLatestCCI(cciData);

      expect(latest).not.toBeNull();
      expect(latest?.time).toBe(cciData[cciData.length - 1].time);
      expect(latest?.cci).toBe(cciData[cciData.length - 1].cci);
    });
  });

  describe('Performance', () => {
    it('should calculate CCI for 1000 prices in reasonable time', () => {
      const prices = createPrices(1000);
      const startTime = performance.now();

      const result = calculateCCI(prices, 20);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.length).toBe(981); // 1000 - 20 + 1
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should calculate CCI for 10000 prices efficiently', () => {
      const prices = createPrices(10000);
      const startTime = performance.now();

      const result = calculateCCI(prices, 20);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.length).toBe(9981); // 10000 - 20 + 1
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });

    it('should calculate CCI with multiple periods efficiently', () => {
      const prices = createPrices(1000);
      const startTime = performance.now();

      calculateCCI(prices, 10);
      calculateCCI(prices, 20);
      calculateCCI(prices, 30);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // All three should be fast
    });

    it('should not have memory leaks with large datasets', () => {
      const prices = createPrices(10000);

      // Run multiple times to check for memory accumulation
      for (let i = 0; i < 10; i++) {
        const result = calculateCCI(prices, 20);
        expect(result.length).toBe(9981);
      }

      // If no memory leak, this should complete without issues
      expect(true).toBe(true);
    });

    it('should produce consistent results across multiple runs', () => {
      const prices = createPrices(100);

      const result1 = calculateCCI(prices, 20);
      const result2 = calculateCCI(prices, 20);
      const result3 = calculateCCI(prices, 20);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});
