import { describe, expect, it } from 'vitest';
import { clamp, fmtNum, fmtPct } from '../../../src/lib/utils/measure';

describe('measure utilities', () => {
  describe('fmtNum', () => {
    // Basic formatting - small numbers (< 100) get decimals
    it('should format small numbers with default 2 decimals', () => {
      expect(fmtNum(50.123)).toBe('50.12');
      expect(fmtNum(0.123)).toBe('0.12');
      expect(fmtNum(9.999)).toBe('10.00');
    });

    it('should format large numbers (>= 100) with 0 decimals', () => {
      expect(fmtNum(100)).toBe('100');
      expect(fmtNum(123.456)).toBe('123');
      expect(fmtNum(999.999)).toBe('1000');
      expect(fmtNum(1234567.89)).toBe('1234568');
    });

    it('should format small numbers (< 100) with specified decimals', () => {
      expect(fmtNum(99.999)).toBe('100.00');
      expect(fmtNum(50.123)).toBe('50.12');
      expect(fmtNum(0.001)).toBe('0.00');
    });

    it('should use custom decimal places for small numbers', () => {
      expect(fmtNum(12.3456, 3)).toBe('12.346');
      expect(fmtNum(5.6789, 1)).toBe('5.7');
      expect(fmtNum(0.00001, 5)).toBe('0.00001');
    });

    it('should ignore decimal parameter for large numbers', () => {
      expect(fmtNum(100.5, 5)).toBe('101'); // Still 0 decimals
      expect(fmtNum(999.999, 10)).toBe('1000'); // Still 0 decimals
    });

    it('should handle zero', () => {
      expect(fmtNum(0)).toBe('0.00');
      expect(fmtNum(0, 3)).toBe('0.000');
    });

    it('should handle negative numbers', () => {
      expect(fmtNum(-50.5)).toBe('-50.50');
      expect(fmtNum(-150.7)).toBe('-151'); // Large negative
      expect(fmtNum(-0.123, 3)).toBe('-0.123');
    });

    it('should return em dash for Infinity', () => {
      expect(fmtNum(Infinity)).toBe('—');
      expect(fmtNum(-Infinity)).toBe('—');
    });

    it('should return em dash for NaN', () => {
      expect(fmtNum(NaN)).toBe('—');
    });

    it('should handle very small numbers', () => {
      expect(fmtNum(0.000001)).toBe('0.00');
      expect(fmtNum(0.000001, 6)).toBe('0.000001');
    });

    it('should handle very large numbers', () => {
      expect(fmtNum(1000000)).toBe('1000000');
      expect(fmtNum(999999.999)).toBe('1000000');
    });

    it('should round correctly', () => {
      expect(fmtNum(1.234, 2)).toBe('1.23');
      expect(fmtNum(1.235, 2)).toBe('1.24'); // Rounds up
      expect(fmtNum(1.994, 2)).toBe('1.99');
      expect(fmtNum(1.995, 2)).toBe('2.00'); // Rounds up
    });
  });

  describe('fmtPct', () => {
    // Basic percentage formatting
    it('should format positive percentages with + sign', () => {
      expect(fmtPct(0.1234)).toBe('+12.34%');
      expect(fmtPct(0.5)).toBe('+50.00%');
      expect(fmtPct(1.0)).toBe('+100.00%');
    });

    it('should format negative percentages without extra sign', () => {
      expect(fmtPct(-0.1234)).toBe('-12.34%');
      expect(fmtPct(-0.5)).toBe('-50.00%');
      expect(fmtPct(-1.0)).toBe('-100.00%');
    });

    it('should format zero percentage with + sign', () => {
      expect(fmtPct(0)).toBe('+0.00%');
    });

    it('should use custom decimal places', () => {
      expect(fmtPct(0.123456, 3)).toBe('+12.346%');
      expect(fmtPct(0.5, 1)).toBe('+50.0%');
      expect(fmtPct(-0.25, 0)).toBe('-25%');
    });

    it('should multiply by 100 to convert to percentage', () => {
      expect(fmtPct(0.01)).toBe('+1.00%'); // 1%
      expect(fmtPct(0.001)).toBe('+0.10%'); // 0.1%
      expect(fmtPct(0.0001)).toBe('+0.01%'); // 0.01%
    });

    it('should handle large decimal values', () => {
      expect(fmtPct(5.0)).toBe('+500.00%');
      expect(fmtPct(10.5)).toBe('+1050.00%');
    });

    it('should handle large negative decimal values', () => {
      expect(fmtPct(-2.5)).toBe('-250.00%');
      expect(fmtPct(-10.0)).toBe('-1000.00%');
    });

    it('should return em dash for Infinity', () => {
      expect(fmtPct(Infinity)).toBe('—');
      expect(fmtPct(-Infinity)).toBe('—');
    });

    it('should return em dash for NaN', () => {
      expect(fmtPct(NaN)).toBe('—');
    });

    it('should round percentages correctly', () => {
      expect(fmtPct(0.12344, 2)).toBe('+12.34%');
      expect(fmtPct(0.12345, 2)).toBe('+12.35%'); // Rounds up
      expect(fmtPct(0.99994, 2)).toBe('+99.99%');
      expect(fmtPct(0.99995, 2)).toBe('+100.00%'); // Rounds up
    });

    it('should handle very small percentages', () => {
      expect(fmtPct(0.00001, 5)).toBe('+0.00100%');
      expect(fmtPct(-0.00001, 5)).toBe('-0.00100%');
    });

    it('should format typical stock gains/losses', () => {
      expect(fmtPct(0.0523, 2)).toBe('+5.23%'); // Up 5.23%
      expect(fmtPct(-0.0312, 2)).toBe('-3.12%'); // Down 3.12%
    });
  });

  describe('clamp', () => {
    // Basic clamping
    it('should return value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(-5, -10, 0)).toBe(-5);
    });

    it('should clamp to minimum when value is too low', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, -10, 10)).toBe(-10);
      expect(clamp(0.1, 0.5, 1)).toBe(0.5);
    });

    it('should clamp to maximum when value is too high', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, -10, 10)).toBe(10);
      expect(clamp(2, 0, 1)).toBe(1);
    });

    it('should handle value equal to minimum', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(-5, -5, 5)).toBe(-5);
    });

    it('should handle value equal to maximum', () => {
      expect(clamp(10, 0, 10)).toBe(10);
      expect(clamp(5, -5, 5)).toBe(5);
    });

    it('should handle same min and max (degenerate range)', () => {
      expect(clamp(5, 3, 3)).toBe(3);
      expect(clamp(1, 5, 5)).toBe(5);
      expect(clamp(10, 5, 5)).toBe(5);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });

    it('should handle decimal values', () => {
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(1.5, 0, 1)).toBe(1);
      expect(clamp(-0.5, 0, 1)).toBe(0);
    });

    it('should handle large numbers', () => {
      expect(clamp(1000000, 0, 999999)).toBe(999999);
      expect(clamp(-1000000, -999999, 0)).toBe(-999999);
    });

    it('should handle zero as boundary', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, -10, 0)).toBe(-5);
      expect(clamp(0, -5, 5)).toBe(0);
    });

    it('should work with typical use cases', () => {
      // Opacity clamping
      expect(clamp(1.5, 0, 1)).toBe(1);
      expect(clamp(-0.2, 0, 1)).toBe(0);

      // Percentage clamping
      expect(clamp(150, 0, 100)).toBe(100);
      expect(clamp(-10, 0, 100)).toBe(0);

      // Angle clamping
      expect(clamp(400, 0, 360)).toBe(360);
      expect(clamp(-10, 0, 360)).toBe(0);
    });

    it('should handle very small differences', () => {
      expect(clamp(0.50001, 0.5, 0.6)).toBe(0.50001);
      expect(clamp(0.49999, 0.5, 0.6)).toBe(0.5);
      expect(clamp(0.60001, 0.5, 0.6)).toBe(0.6);
    });

    it('should preserve precision', () => {
      const result = clamp(3.14159, 0, 10);
      expect(result).toBe(3.14159);
    });

    it('should handle Infinity', () => {
      expect(clamp(Infinity, 0, 100)).toBe(100);
      expect(clamp(-Infinity, 0, 100)).toBe(0);
      expect(clamp(50, -Infinity, Infinity)).toBe(50);
    });

    it('should handle NaN (NaN comparisons return false, so returns NaN)', () => {
      const result = clamp(NaN, 0, 10);
      expect(isNaN(result)).toBe(true);
    });
  });

  describe('integration - combining utilities', () => {
    it('should format clamped values', () => {
      const value = clamp(123.456, 0, 100);
      expect(fmtNum(value)).toBe('100'); // Clamped to 100
    });

    it('should format clamped percentages', () => {
      const pct = clamp(1.5, -1, 1);
      expect(fmtPct(pct)).toBe('+100.00%'); // Clamped to 1.0 = 100%
    });

    it('should clamp and format small numbers', () => {
      const value = clamp(0.00001, 0, 1);
      expect(fmtNum(value, 5)).toBe('0.00001');
    });

    it('should handle typical slider value formatting', () => {
      // Slider 0-100, showing 2 decimals for values < 100
      const values = [0, 25.5, 50.123, 75.999, 100];
      const formatted = values.map((v) => fmtNum(clamp(v, 0, 100)));
      expect(formatted).toEqual(['0.00', '25.50', '50.12', '76.00', '100']);
    });
  });
});
