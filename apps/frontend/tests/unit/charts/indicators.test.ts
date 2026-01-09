// frontend/tests/unit/charts/indicators.test.ts
import {
  bollinger,
  ema,
  macd,
  rsi,
  sma,
  stdDevChannels,
  vwap,
  vwma,
} from '@/lib/charts/indicators';
import { describe, expect, it } from 'vitest';

describe('indicators', () => {
  it('sma works', () => {
    const vals = [1, 2, 3, 4, 5];
    const out = sma(vals, 3);
    expect(out).toEqual([null, null, 2, 3, 4]);
  });

  it('ema seeds and runs', () => {
    const vals = [1, 2, 3, 4, 5, 6];
    const out = ema(vals, 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).not.toBeNull();
    expect(typeof out[3]).toBe('number');
  });

  it('bollinger outputs bands after window', () => {
    const vals = [1, 2, 3, 4, 5, 6];
    const bands = bollinger(vals, 3, 2);
    expect({ basis: bands.mid[0], upper: bands.upper[0], lower: bands.lower[0] }).toEqual({
      basis: null,
      upper: null,
      lower: null,
    });
    expect(bands.mid[2]).toBeCloseTo(2);
    expect(typeof bands.upper[5]).toBe('number');
    expect(typeof bands.lower[5]).toBe('number');
  });

  it('vwma matches simple average when volume equal', () => {
    const close = [1, 2, 3, 4];
    const volume = [10, 10, 10, 10];
    const out = vwma(close, volume, 3);
    expect(out[2]).toBeCloseTo(2);
    expect(out[3]).toBeCloseTo(3);
  });

  it('vwap increases with price when anchored', () => {
    const typicalPrice = [1.16666667, 2.16666667, 3.16666667];
    const volume = [100, 100, 100];
    const out = vwap(typicalPrice, volume);
    expect(out[0]).not.toBeNull();
    expect(out[1]! > (out[0] as number)).toBe(true);
    expect(out[2]! > (out[1] as number)).toBe(true);
  });

  it('stdDevChannels returns center/upper/lower after window', () => {
    const vals = [1, 2, 3, 4, 5];
    const ch = stdDevChannels(vals, 3, 2);
    expect({ center: ch.mid[0], upper: ch.upper[0], lower: ch.lower[0] }).toEqual({
      center: null,
      upper: null,
      lower: null,
    });
    expect(ch.mid[2]).toBeCloseTo(2);
    expect(typeof ch.upper[4]).toBe('number');
    expect(typeof ch.lower[4]).toBe('number');
  });

  describe('rsi', () => {
    it('returns nulls during warmup and first value at period index', () => {
      const vals = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84];
      const out = rsi(vals, 5);
      // First RSI value should appear at index 5 (period index)
      expect(out.slice(0, 5).every((v) => v === null)).toBe(true);
      expect(out[5]).not.toBeNull();
    });

    it('calculates RSI after warmup period', () => {
      // Price series that goes mostly up (should yield high RSI)
      const rising = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
      const out = rsi(rising, 14);
      // First value appears at index 14
      expect(out[14]).not.toBeNull();
      expect(out[14]!).toBeGreaterThan(70); // Strong uptrend = high RSI
    });

    it('returns 100 when avgLoss is 0 (continuous rise)', () => {
      // Continuous rise with no down days
      const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
      const out = rsi(vals, 14);
      expect(out[14]).toBe(100);
      expect(out[15]).toBe(100);
    });

    it('handles edge cases', () => {
      // Empty array
      expect(rsi([], 14)).toEqual([]);
      // Period < 1
      expect(rsi([1, 2, 3], 0)).toEqual([null, null, null]);
    });

    it('calculates RSI correctly with mixed gains and losses', () => {
      // Alternating up/down should yield RSI around 50
      const mixed = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11];
      const out = rsi(mixed, 14);
      expect(out[14]).not.toBeNull();
      expect(out[14]!).toBeGreaterThan(40);
      expect(out[14]!).toBeLessThan(60);
    });
  });

  describe('macd', () => {
    it('returns macd, signalLine, and hist arrays', () => {
      const vals = [
        10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
      ];
      const result = macd(vals);
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('signalLine');
      expect(result).toHaveProperty('hist');
      expect(result.macd.length).toBe(vals.length);
      expect(result.signalLine.length).toBe(vals.length);
      expect(result.hist.length).toBe(vals.length);
    });

    it('returns nulls during warmup for slow EMA', () => {
      const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = macd(vals, 12, 26, 9);
      // With default params (12, 26, 9), slow EMA needs 26 periods
      // With only 10 values, all macd values should be null
      expect(result.macd.every((v) => v === null)).toBe(true);
    });

    it('calculates MACD line after sufficient data', () => {
      // Generate enough data for slow EMA (26 periods) to have values
      const vals = Array.from({ length: 35 }, (_, i) => 100 + i);
      const result = macd(vals, 12, 26, 9);
      // MACD line should have non-null values after slow EMA warmup
      expect(result.macd[25]).not.toBeNull();
      expect(result.macd[30]).not.toBeNull();
    });

    it('histogram equals macd minus signal', () => {
      const vals = Array.from({ length: 40 }, (_, i) => 100 + i + Math.sin(i) * 5);
      const result = macd(vals, 12, 26, 9);
      // Check histogram calculation where both macd and signal are non-null
      for (let i = 0; i < vals.length; i++) {
        if (result.macd[i] != null && result.signalLine[i] != null) {
          expect(result.hist[i]).toBeCloseTo(result.macd[i]! - result.signalLine[i]!);
        }
      }
    });

    it('signal line is EMA of MACD line', () => {
      const vals = Array.from({ length: 50 }, (_, i) => 100 + i);
      const result = macd(vals, 12, 26, 9);
      // Signal line should smooth MACD values
      // First non-null signal should equal first non-null macd (initial value)
      const firstMacdIdx = result.macd.findIndex((v) => v !== null);
      const firstSigIdx = result.signalLine.findIndex((v) => v !== null);
      expect(firstSigIdx).toBe(firstMacdIdx);
      expect(result.signalLine[firstSigIdx]).toBe(result.macd[firstMacdIdx]);
    });

    it('uses custom periods', () => {
      const vals = Array.from({ length: 20 }, (_, i) => 100 + i);
      const result = macd(vals, 5, 10, 3);
      // With fast=5, slow=10, should have values after index 9
      expect(result.macd[9]).not.toBeNull();
    });
  });
});
