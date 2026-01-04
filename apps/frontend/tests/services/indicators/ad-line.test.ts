/**
 * Tests for Accumulation/Distribution Line (A/D Line) Indicator
 *
 * Test Categories:
 * 1. Basic Calculation - Standard A/D Line calculations
 * 2. Volume Variations - Different volume scenarios
 * 3. Edge Cases - Empty arrays, insufficient data, zero range, invalid inputs
 * 4. A/D Line Interpretation - Direction, strength, divergence analysis
 * 5. Latest Values - getLatestADLine() function
 * 6. Performance - Large dataset handling
 */

import {
  calculateADLine,
  getLatestADLine,
  interpretADLine,
  type OHLCVPrice,
} from '@/services/indicators/ad-line';
import { describe, expect, it } from 'vitest';

describe('Accumulation/Distribution Line (A/D Line) Indicator', () => {
  // ============================================================================
  // 1. Basic Calculation Tests
  // ============================================================================

  describe('Basic Calculation', () => {
    it('should calculate A/D Line for simple uptrend', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 105, low: 99, close: 103, volume: 1000 }, // CLV = 0.333
        { time: 2, open: 103, high: 108, low: 102, close: 106, volume: 1500 }, // CLV = 0.333
        { time: 3, open: 106, high: 111, low: 105, close: 109, volume: 1200 }, // CLV = 0.333
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(3);
      expect(result[0].time).toBe(1);
      expect(result[0].value).toBeCloseTo(333.33, 1); // CLV=0.333, MFV=333.33
      expect(result[1].value).toBeCloseTo(833.33, 1); // Previous + (CLV=0.333 × 1500)
      expect(result[2].value).toBeCloseTo(1233.33, 1); // Previous + (CLV=0.333 × 1200)
    });

    it('should calculate A/D Line for simple downtrend', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 110, high: 111, low: 105, close: 107, volume: 1000 }, // CLV = -0.333
        { time: 2, open: 107, high: 108, low: 102, close: 104, volume: 1500 }, // CLV = -0.333
        { time: 3, open: 104, high: 105, low: 99, close: 101, volume: 1200 }, // CLV = -0.333
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(3);
      expect(result[0].value).toBeCloseTo(-333.33, 1); // CLV=-0.333, MFV=-333.33
      expect(result[1].value).toBeCloseTo(-833.33, 1); // Previous + (CLV=-0.333 × 1500)
      expect(result[2].value).toBeCloseTo(-1233.33, 1); // Previous + (CLV=-0.333 × 1200)
    });

    it('should calculate A/D Line with close at high', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 105, low: 99, close: 105, volume: 1000 }, // CLV = 1.0
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(1000); // CLV=1.0, MFV=1000
    });

    it('should calculate A/D Line with close at low', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 105, low: 99, close: 99, volume: 1000 }, // CLV = -1.0
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(-1000); // CLV=-1.0, MFV=-1000
    });

    it('should calculate A/D Line with close at middle', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 105, low: 99, close: 102, volume: 1000 }, // CLV = 0
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(0); // CLV=0, MFV=0
    });
  });

  // ============================================================================
  // 2. Volume Variations Tests
  // ============================================================================

  describe('Volume Variations', () => {
    it('should handle increasing volume', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 105, low: 99, close: 103, volume: 500 }, // CLV=0.333
        { time: 2, open: 103, high: 108, low: 102, close: 106, volume: 1000 }, // CLV=0.333
        { time: 3, open: 106, high: 111, low: 105, close: 109, volume: 2000 }, // CLV=0.333
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(3);
      expect(result[0].value).toBeCloseTo(166.67, 1); // CLV=0.333 × 500
      expect(result[1].value).toBeCloseTo(500, 1); // Previous + (CLV=0.333 × 1000)
      expect(result[2].value).toBeCloseTo(1166.67, 1); // Previous + (CLV=0.333 × 2000)
    });

    it('should handle decreasing volume', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 105, low: 99, close: 103, volume: 2000 }, // CLV=0.333
        { time: 2, open: 103, high: 108, low: 102, close: 106, volume: 1000 }, // CLV=0.333
        { time: 3, open: 106, high: 111, low: 105, close: 109, volume: 500 }, // CLV=0.333
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(3);
      expect(result[0].value).toBeCloseTo(666.67, 1); // CLV=0.333 × 2000
      expect(result[1].value).toBeCloseTo(1000, 1); // Previous + (CLV=0.333 × 1000)
      expect(result[2].value).toBeCloseTo(1166.67, 1); // Previous + (CLV=0.333 × 500)
    });

    it('should handle zero volume', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 105, low: 99, close: 103, volume: 1000 }, // CLV=0.333
        { time: 2, open: 103, high: 108, low: 102, close: 106, volume: 0 }, // Volume = 0
        { time: 3, open: 106, high: 111, low: 105, close: 109, volume: 1000 }, // CLV=0.333
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(3);
      expect(result[0].value).toBeCloseTo(333.33, 1); // CLV=0.333 × 1000
      expect(result[1].value).toBeCloseTo(333.33, 1); // Previous + 0 (no change)
      expect(result[2].value).toBeCloseTo(666.67, 1); // Previous + (CLV=0.333 × 1000)
    });

    it('should handle mixed CLV signs with varying volume', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 105, low: 99, close: 103, volume: 1000 }, // CLV = 0.333
        { time: 2, open: 103, high: 108, low: 102, close: 104, volume: 1500 }, // CLV = -0.333
        { time: 3, open: 104, high: 109, low: 103, close: 107, volume: 1200 }, // CLV = 0.333
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(3);
      expect(result[0].value).toBeCloseTo(333.33, 1); // CLV=0.333 × 1000
      expect(result[1].value).toBeCloseTo(-166.67, 1); // Previous + (CLV=-0.333 × 1500)
      expect(result[2].value).toBeCloseTo(233.33, 1); // Previous + (CLV=0.333 × 1200)
    });
  });

  // ============================================================================
  // 3. Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should return empty array for empty input', () => {
      const result = calculateADLine([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for null input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing runtime null handling
      const result = calculateADLine(null as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing runtime undefined handling
      const result = calculateADLine(undefined as any);
      expect(result).toEqual([]);
    });

    it('should throw error when volume is missing', () => {
      const prices = [{ time: 1, open: 100, high: 105, low: 99, close: 103 } as OHLCVPrice];

      expect(() => calculateADLine(prices)).toThrow('Volume data is required');
    });

    it('should throw error when volume is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing runtime null volume handling
      const prices = [{ time: 1, open: 100, high: 105, low: 99, close: 103, volume: null as any }];

      expect(() => calculateADLine(prices)).toThrow('Volume data is required');
    });

    it('should throw error when high is missing', () => {
      const prices = [{ time: 1, open: 100, low: 99, close: 103, volume: 1000 } as OHLCVPrice];

      expect(() => calculateADLine(prices)).toThrow('High, Low, and Close prices are required');
    });

    it('should throw error when low is missing', () => {
      const prices = [{ time: 1, open: 100, high: 105, close: 103, volume: 1000 } as OHLCVPrice];

      expect(() => calculateADLine(prices)).toThrow('High, Low, and Close prices are required');
    });

    it('should throw error when close is missing', () => {
      const prices = [{ time: 1, open: 100, high: 105, low: 99, volume: 1000 } as OHLCVPrice];

      expect(() => calculateADLine(prices)).toThrow('High, Low, and Close prices are required');
    });

    it('should handle flat prices (high === low)', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 100, low: 100, close: 100, volume: 1000 }, // Flat bar
        { time: 2, open: 100, high: 105, low: 99, close: 103, volume: 1500 }, // Normal bar
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(0); // CLV = 0 for flat bar
      expect(result[1].value).toBeCloseTo(500, 1); // Previous (0) + (CLV=0.333 × 1500)
    });

    it('should handle negative A/D Line values', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 105, high: 106, low: 99, close: 100, volume: 1000 }, // CLV = -0.714
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBeLessThan(0); // Negative A/D Line
      expect(result[0].value).toBeCloseTo(-714.29, 1);
    });

    it('should handle extreme volume spikes', () => {
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 105, low: 99, close: 103, volume: 100 }, // CLV=0.333
        { time: 2, open: 103, high: 108, low: 102, close: 106, volume: 1000000 }, // Spike
        { time: 3, open: 106, high: 111, low: 105, close: 109, volume: 100 }, // CLV=0.333
      ];

      const result = calculateADLine(prices);

      expect(result).toHaveLength(3);
      expect(result[0].value).toBeCloseTo(33.33, 1);
      expect(result[1].value).toBeCloseTo(333366.67, 1); // Huge spike
      expect(result[2].value).toBeCloseTo(333400, 1);
    });
  });

  // ============================================================================
  // 4. A/D Line Interpretation Tests
  // ============================================================================

  describe('A/D Line Interpretation', () => {
    // Direction Tests
    it('should identify bullish trend (rising A/D Line)', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 99 + i,
        close: 103 + i, // CLV = 0.667 (close near high)
        volume: 1000,
      }));

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10);

      expect(trend.direction).toBe('bullish');
    });

    it('should identify bearish trend (falling A/D Line)', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) => ({
        time: i + 1,
        open: 100 - i,
        high: 105 - i,
        low: 99 - i,
        close: 101 - i, // CLV = -0.333 (close near low)
        volume: 1000,
      }));

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10);

      expect(trend.direction).toBe('bearish');
    });

    it('should identify neutral trend (flat A/D Line)', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) => ({
        time: i + 1,
        open: 100,
        high: 105,
        low: 99,
        close: 102, // CLV = 0 (close at middle)
        volume: 1000,
      }));

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10);

      expect(trend.direction).toBe('neutral');
    });

    // Strength Tests
    it('should identify strong bullish trend (>3x avg volume)', () => {
      // Create trend with increasing volume for strong signal
      const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 99 + i,
        close: 103 + i, // CLV = 0.333
        volume: 5000, // Higher volume for strong trend
      }));

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10);

      expect(trend.direction).toBe('bullish');
      expect(trend.strength).toBe('strong'); // >3x normalized change
    });

    it('should identify moderate bullish trend (1-3x avg volume)', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) => ({
        time: i + 1,
        open: 100 + i * 0.5,
        high: 105 + i * 0.5,
        low: 99 + i * 0.5,
        close: 103 + i * 0.5, // CLV = 0.667
        volume: 1000,
      }));

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10);

      expect(trend.direction).toBe('bullish');
      expect(trend.strength).toBe('moderate'); // 1-3x normalized change
    });

    it('should identify weak bullish trend (<1x avg volume)', () => {
      // Create very weak trend with small, varying price movements
      // Using non-uniform CLV values to avoid mathematical boundary (9 periods × constant CLV = 3.0)
      const prices: OHLCVPrice[] = [
        { time: 1, open: 100, high: 105, low: 99, close: 102, volume: 1000 }, // CLV = 0.0 (middle)
        { time: 2, open: 100, high: 105, low: 99, close: 102.5, volume: 1000 }, // CLV = 0.167
        { time: 3, open: 100, high: 105, low: 99, close: 102, volume: 1000 }, // CLV = 0.0
        { time: 4, open: 100, high: 105, low: 99, close: 101, volume: 1000 }, // CLV = -0.333
        { time: 5, open: 100, high: 105, low: 99, close: 103, volume: 1000 }, // CLV = 0.333
        { time: 6, open: 100, high: 105, low: 99, close: 102, volume: 1000 }, // CLV = 0.0
        { time: 7, open: 100, high: 105, low: 99, close: 102.3, volume: 1000 }, // CLV = 0.1
        { time: 8, open: 100, high: 105, low: 99, close: 101.7, volume: 1000 }, // CLV = -0.1
        { time: 9, open: 100, high: 105, low: 99, close: 102, volume: 1000 }, // CLV = 0.0
        { time: 10, open: 100, high: 105, low: 99, close: 102.5, volume: 1000 }, // CLV = 0.167
        { time: 11, open: 100, high: 105, low: 99, close: 102, volume: 1000 }, // CLV = 0.0
        { time: 12, open: 100, high: 105, low: 99, close: 102.3, volume: 1000 }, // CLV = 0.1
        { time: 13, open: 100, high: 105, low: 99, close: 102, volume: 1000 }, // CLV = 0.0
        { time: 14, open: 100, high: 105, low: 99, close: 102.5, volume: 1000 }, // CLV = 0.167
        { time: 15, open: 100, high: 105, low: 99, close: 102, volume: 1000 }, // CLV = 0.0
      ];
      // Average CLV over last 9 periods ≈ 0.06 → normalized ≈ 0.56 < 1.0 (weak)

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10);

      expect(trend.direction).toBe('bullish'); // Small positive CLV trend
      expect(trend.strength).toBe('weak'); // <1x normalized change
    });

    it('should identify strong bearish trend', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) => ({
        time: i + 1,
        open: 200 - i,
        high: 205 - i,
        low: 199 - i,
        close: 201 - i, // CLV = -0.333
        volume: 5000, // Higher volume for strong trend
      }));

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10);

      expect(trend.direction).toBe('bearish');
      expect(trend.strength).toBe('strong'); // >3x normalized change
    });

    // Divergence Tests
    it('should detect bullish divergence (price down, A/D Line up)', () => {
      const prices: OHLCVPrice[] = [
        // Initial uptrend
        ...Array.from({ length: 5 }, (_, i) => ({
          time: i + 1,
          open: 100 + i,
          high: 105 + i,
          low: 99 + i,
          close: 103 + i,
          volume: 800,
        })),
        // Price falls, but A/D Line rises (strong buying on dips)
        ...Array.from({ length: 10 }, (_, i) => ({
          time: 6 + i,
          open: 104 - i * 0.3,
          high: 109 - i * 0.3,
          low: 103 - i * 0.3,
          close: 107 - i * 0.3, // CLV = 0.667 (buyers accumulating)
          volume: 1500, // High volume buying
        })),
      ];

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10);

      expect(trend.divergence).toBe('bullish');
    });

    it('should detect bearish divergence (price up, A/D Line down)', () => {
      const prices: OHLCVPrice[] = [
        // Initial downtrend
        ...Array.from({ length: 5 }, (_, i) => ({
          time: i + 1,
          open: 100 - i,
          high: 105 - i,
          low: 99 - i,
          close: 101 - i,
          volume: 800,
        })),
        // Price rises, but A/D Line falls (strong selling on rallies)
        ...Array.from({ length: 10 }, (_, i) => ({
          time: 6 + i,
          open: 96 + i * 0.3,
          high: 101 + i * 0.3,
          low: 95 + i * 0.3,
          close: 97 + i * 0.3, // CLV = -0.333 (sellers distributing)
          volume: 1500, // High volume selling
        })),
      ];

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10);

      expect(trend.divergence).toBe('bearish');
    });

    it('should detect no divergence when price and A/D Line align', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 99 + i,
        close: 103 + i, // Both rising
        volume: 1000,
      }));

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10);

      expect(trend.divergence).toBe('none');
    });

    it('should return neutral for insufficient data (< lookback)', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 5 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 99 + i,
        close: 103 + i,
        volume: 1000,
      }));

      const adLineData = calculateADLine(prices);
      const trend = interpretADLine(adLineData, prices, 10); // Lookback = 10, but only 5 data points

      expect(trend.direction).toBe('neutral');
      expect(trend.strength).toBe('weak');
      expect(trend.divergence).toBe('none');
    });
  });

  // ============================================================================
  // 5. Latest Values Tests
  // ============================================================================

  describe('Latest Values (getLatestADLine)', () => {
    it('should return latest A/D Line value and trend', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 15 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 99 + i,
        close: 103 + i,
        volume: 1000,
      }));

      const latest = getLatestADLine(prices, 10);

      expect(latest).not.toBeNull();
      expect(latest!.value).toBeGreaterThan(0);
      expect(latest!.trend.direction).toBe('bullish');
      expect(latest!.trend.strength).toMatch(/strong|moderate|weak/);
      expect(latest!.trend.divergence).toMatch(/bullish|bearish|none/);
    });

    it('should return null for empty prices', () => {
      const latest = getLatestADLine([], 10);
      expect(latest).toBeNull();
    });

    it('should return null for null prices', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing runtime null handling
      const latest = getLatestADLine(null as any, 10);
      expect(latest).toBeNull();
    });

    it('should return null for undefined prices', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing runtime undefined handling
      const latest = getLatestADLine(undefined as any, 10);
      expect(latest).toBeNull();
    });

    it('should handle custom lookback period', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 20 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 99 + i,
        close: 103 + i,
        volume: 1000,
      }));

      const latest = getLatestADLine(prices, 15); // Custom lookback

      expect(latest).not.toBeNull();
      expect(latest!.value).toBeGreaterThan(0);
      expect(latest!.trend.direction).toBe('bullish');
    });
  });

  // ============================================================================
  // 6. Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should handle 1,000 prices in under 100ms', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 1000 }, (_, i) => ({
        time: i + 1,
        open: 100 + Math.random() * 10,
        high: 110 + Math.random() * 10,
        low: 95 + Math.random() * 10,
        close: 100 + Math.random() * 10,
        volume: 1000 + Math.random() * 500,
      }));

      const start = performance.now();
      const result = calculateADLine(prices);
      const end = performance.now();

      expect(result).toHaveLength(1000);
      expect(end - start).toBeLessThan(100);
    });

    it('should handle 10,000 prices in under 500ms', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 10000 }, (_, i) => ({
        time: i + 1,
        open: 100 + Math.random() * 10,
        high: 110 + Math.random() * 10,
        low: 95 + Math.random() * 10,
        close: 100 + Math.random() * 10,
        volume: 1000 + Math.random() * 500,
      }));

      const start = performance.now();
      const result = calculateADLine(prices);
      const end = performance.now();

      expect(result).toHaveLength(10000);
      expect(end - start).toBeLessThan(500);
    });

    it('should handle interpretADLine for 10,000 prices in under 500ms', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 10000 }, (_, i) => ({
        time: i + 1,
        open: 100 + Math.random() * 10,
        high: 110 + Math.random() * 10,
        low: 95 + Math.random() * 10,
        close: 100 + Math.random() * 10,
        volume: 1000 + Math.random() * 500,
      }));

      const adLineData = calculateADLine(prices);

      const start = performance.now();
      const trend = interpretADLine(adLineData, prices, 50);
      const end = performance.now();

      expect(trend.direction).toMatch(/bullish|bearish|neutral/);
      expect(end - start).toBeLessThan(500);
    });

    it('should handle getLatestADLine for 10,000 prices in under 500ms', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 10000 }, (_, i) => ({
        time: i + 1,
        open: 100 + Math.random() * 10,
        high: 110 + Math.random() * 10,
        low: 95 + Math.random() * 10,
        close: 100 + Math.random() * 10,
        volume: 1000 + Math.random() * 500,
      }));

      const start = performance.now();
      const latest = getLatestADLine(prices, 50);
      const end = performance.now();

      expect(latest).not.toBeNull();
      expect(end - start).toBeLessThan(500);
    });

    it('should maintain accuracy with large A/D Line values', () => {
      const prices: OHLCVPrice[] = Array.from({ length: 100 }, (_, i) => ({
        time: i + 1,
        open: 100 + i,
        high: 105 + i,
        low: 99 + i,
        close: 103 + i, // Consistently close near high
        volume: 100000, // Large volume
      }));

      const result = calculateADLine(prices);

      // Should accumulate large positive values
      expect(result[result.length - 1].value).toBeGreaterThan(1000000);

      // Verify no precision loss
      const latest = getLatestADLine(prices, 10);
      expect(latest).not.toBeNull();
      expect(latest!.trend.direction).toBe('bullish');
    });
  });
});
