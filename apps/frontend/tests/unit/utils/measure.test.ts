import { clamp, fmtNum, fmtPct } from '@/lib/utils/measure';
import { describe, expect, it } from 'vitest';

describe('Measurement Utilities', () => {
  describe('fmtNum', () => {
    it('formats numbers >= 100 with no decimals', () => {
      expect(fmtNum(100)).toBe('100');
      expect(fmtNum(150.789)).toBe('151');
      expect(fmtNum(1000.456)).toBe('1000');
    });

    it('formats numbers < 100 with default 2 decimals', () => {
      expect(fmtNum(50)).toBe('50.00');
      expect(fmtNum(50.123)).toBe('50.12');
      expect(fmtNum(99.999)).toBe('100.00');
    });

    it('formats negative numbers >= 100 with no decimals', () => {
      expect(fmtNum(-100)).toBe('-100');
      expect(fmtNum(-150.789)).toBe('-151');
    });

    it('formats negative numbers < 100 with decimals', () => {
      expect(fmtNum(-50)).toBe('-50.00');
      expect(fmtNum(-50.123)).toBe('-50.12');
    });

    it('respects custom decimal places for numbers < 100', () => {
      expect(fmtNum(50.12345, 3)).toBe('50.123');
      expect(fmtNum(50.12345, 4)).toBe('50.1234'); // JavaScript rounding
      expect(fmtNum(50.12345, 0)).toBe('50');
    });

    it('returns em-dash for Infinity', () => {
      expect(fmtNum(Infinity)).toBe('—');
      expect(fmtNum(-Infinity)).toBe('—');
    });

    it('returns em-dash for NaN', () => {
      expect(fmtNum(NaN)).toBe('—');
    });

    it('handles zero', () => {
      expect(fmtNum(0)).toBe('0.00');
      expect(fmtNum(-0)).toBe('0.00');
    });

    it('handles very small numbers', () => {
      expect(fmtNum(0.001)).toBe('0.00');
      expect(fmtNum(0.0001, 4)).toBe('0.0001');
    });

    it('handles edge case around 100', () => {
      expect(fmtNum(99.9)).toBe('99.90');
      expect(fmtNum(100.0)).toBe('100');
      expect(fmtNum(100.1)).toBe('100');
    });
  });

  describe('fmtPct', () => {
    it('formats positive percentages with + sign', () => {
      expect(fmtPct(0.5)).toBe('+50.00%');
      expect(fmtPct(0.123)).toBe('+12.30%');
      expect(fmtPct(1.0)).toBe('+100.00%');
    });

    it('formats negative percentages with - sign', () => {
      expect(fmtPct(-0.5)).toBe('-50.00%');
      expect(fmtPct(-0.123)).toBe('-12.30%');
      expect(fmtPct(-1.0)).toBe('-100.00%');
    });

    it('formats zero with + sign', () => {
      expect(fmtPct(0)).toBe('+0.00%');
    });

    it('respects custom decimal places', () => {
      expect(fmtPct(0.12345, 3)).toBe('+12.345%');
      expect(fmtPct(0.12345, 4)).toBe('+12.3450%');
      expect(fmtPct(0.12345, 0)).toBe('+12%');
    });

    it('returns em-dash for Infinity', () => {
      expect(fmtPct(Infinity)).toBe('—');
      expect(fmtPct(-Infinity)).toBe('—');
    });

    it('returns em-dash for NaN', () => {
      expect(fmtPct(NaN)).toBe('—');
    });

    it('handles very small percentages', () => {
      expect(fmtPct(0.0001)).toBe('+0.01%');
      expect(fmtPct(0.0001, 4)).toBe('+0.0100%');
    });

    it('handles large percentages', () => {
      expect(fmtPct(10.0)).toBe('+1000.00%');
      expect(fmtPct(-5.0)).toBe('-500.00%');
    });

    it('handles edge cases around zero', () => {
      expect(fmtPct(0.0001, 1)).toBe('+0.0%');
      expect(fmtPct(-0.0001, 1)).toBe('-0.0%');
    });
  });

  describe('clamp', () => {
    it('clamps value to minimum', () => {
      expect(clamp(5, 10, 20)).toBe(10);
      expect(clamp(-10, 0, 100)).toBe(0);
    });

    it('clamps value to maximum', () => {
      expect(clamp(25, 10, 20)).toBe(20);
      expect(clamp(150, 0, 100)).toBe(100);
    });

    it('returns value when within range', () => {
      expect(clamp(15, 10, 20)).toBe(15);
      expect(clamp(50, 0, 100)).toBe(50);
    });

    it('handles negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });

    it('handles value equal to minimum', () => {
      expect(clamp(10, 10, 20)).toBe(10);
    });

    it('handles value equal to maximum', () => {
      expect(clamp(20, 10, 20)).toBe(20);
    });

    it('handles zero in range', () => {
      expect(clamp(0, -10, 10)).toBe(0);
      expect(clamp(0, 0, 10)).toBe(0);
    });

    it('handles floating point values', () => {
      expect(clamp(5.5, 0.0, 10.0)).toBe(5.5);
      expect(clamp(10.5, 0.0, 10.0)).toBe(10.0);
      expect(clamp(-0.5, 0.0, 10.0)).toBe(0.0);
    });

    it('handles same min and max', () => {
      expect(clamp(5, 10, 10)).toBe(10);
      expect(clamp(10, 10, 10)).toBe(10);
      expect(clamp(15, 10, 10)).toBe(10);
    });
  });
});

