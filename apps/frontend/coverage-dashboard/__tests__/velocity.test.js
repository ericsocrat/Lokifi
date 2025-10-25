/**
 * Tests for velocity calculations
 */
import { describe, expect, it } from 'vitest';
import { calculateVelocity } from './utils';

describe('calculateVelocity', () => {
  describe('Basic Velocity Calculations', () => {
    it('should calculate velocities from coverage trends', () => {
      const trends = [
        { date: '2025-01-01', coverage: 50 },
        { date: '2025-01-02', coverage: 55 },
        { date: '2025-01-03', coverage: 60 },
        { date: '2025-01-04', coverage: 58 },
      ];

      const result = calculateVelocity(trends);

      expect(result.velocities).toEqual([5, 5, -2]);
      expect(result.velocities).toHaveLength(3);
    });

    it('should calculate average velocity', () => {
      const trends = [
        { date: '2025-01-01', coverage: 50 },
        { date: '2025-01-02', coverage: 60 },
        { date: '2025-01-03', coverage: 70 },
      ];

      const result = calculateVelocity(trends);

      expect(result.avgVelocity).toBe(10); // (10 + 10) / 2
    });

    it('should round average velocity to 2 decimal places', () => {
      const trends = [
        { date: '2025-01-01', coverage: 33.3 },
        { date: '2025-01-02', coverage: 66.6 },
        { date: '2025-01-03', coverage: 100 },
      ];

      const result = calculateVelocity(trends);

      expect(result.avgVelocity).toBeCloseTo(33.35, 2);
    });
  });

  describe('Max Increase and Decrease', () => {
    it('should identify maximum increase', () => {
      const trends = [
        { date: '2025-01-01', coverage: 50 },
        { date: '2025-01-02', coverage: 55 },
        { date: '2025-01-03', coverage: 75 }, // +20 (max)
        { date: '2025-01-04', coverage: 80 },
      ];

      const result = calculateVelocity(trends);

      expect(result.maxIncrease).toBe(20);
    });

    it('should identify maximum decrease', () => {
      const trends = [
        { date: '2025-01-01', coverage: 80 },
        { date: '2025-01-02', coverage: 75 },
        { date: '2025-01-03', coverage: 50 }, // -25 (max decrease)
        { date: '2025-01-04', coverage: 48 },
      ];

      const result = calculateVelocity(trends);

      expect(result.maxDecrease).toBe(-25);
    });

    it('should handle only increases', () => {
      const trends = [
        { date: '2025-01-01', coverage: 50 },
        { date: '2025-01-02', coverage: 60 },
        { date: '2025-01-03', coverage: 70 },
      ];

      const result = calculateVelocity(trends);

      expect(result.maxIncrease).toBe(10);
      expect(result.maxDecrease).toBe(0);
    });

    it('should handle only decreases', () => {
      const trends = [
        { date: '2025-01-01', coverage: 70 },
        { date: '2025-01-02', coverage: 60 },
        { date: '2025-01-03', coverage: 50 },
      ];

      const result = calculateVelocity(trends);

      expect(result.maxIncrease).toBe(0);
      expect(result.maxDecrease).toBe(-10);
    });
  });

  describe('Volatility (Standard Deviation)', () => {
    it('should calculate volatility for stable trends', () => {
      const trends = [
        { date: '2025-01-01', coverage: 50 },
        { date: '2025-01-02', coverage: 51 },
        { date: '2025-01-03', coverage: 52 },
        { date: '2025-01-04', coverage: 53 },
      ];

      const result = calculateVelocity(trends);

      expect(result.volatility).toBeCloseTo(0, 1); // Low volatility
    });

    it('should calculate volatility for volatile trends', () => {
      const trends = [
        { date: '2025-01-01', coverage: 50 },
        { date: '2025-01-02', coverage: 80 },
        { date: '2025-01-03', coverage: 40 },
        { date: '2025-01-04', coverage: 90 },
      ];

      const result = calculateVelocity(trends);

      expect(result.volatility).toBeGreaterThan(20); // High volatility
    });

    it('should return 0 volatility for constant velocity', () => {
      const trends = [
        { date: '2025-01-01', coverage: 50 },
        { date: '2025-01-02', coverage: 60 },
        { date: '2025-01-03', coverage: 70 },
        { date: '2025-01-04', coverage: 80 },
      ];

      const result = calculateVelocity(trends);

      expect(result.volatility).toBe(0); // All velocities are 10
    });

    it('should round volatility to 2 decimal places', () => {
      const trends = [
        { date: '2025-01-01', coverage: 50 },
        { date: '2025-01-02', coverage: 55 },
        { date: '2025-01-03', coverage: 65 },
        { date: '2025-01-04', coverage: 68 },
      ];

      const result = calculateVelocity(trends);

      // Volatility is a number, check it has at most 2 decimal places
      const volatilityStr = result.volatility.toString();
      const decimalPlaces = volatilityStr.includes('.')
        ? volatilityStr.split('.')[1]?.length || 0
        : 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty trends', () => {
      const result = calculateVelocity([]);

      expect(result).toBeNull();
    });

    it('should return null for single data point', () => {
      const trends = [{ date: '2025-01-01', coverage: 50 }];

      const result = calculateVelocity(trends);

      expect(result).toBeNull();
    });

    it('should handle two data points', () => {
      const trends = [
        { date: '2025-01-01', coverage: 50 },
        { date: '2025-01-02', coverage: 60 },
      ];

      const result = calculateVelocity(trends);

      expect(result.velocities).toEqual([10]);
      expect(result.avgVelocity).toBe(10);
      expect(result.maxIncrease).toBe(10);
      expect(result.maxDecrease).toBe(0);
      expect(result.volatility).toBe(0); // Only one velocity
    });

    it('should handle zero coverage values', () => {
      const trends = [
        { date: '2025-01-01', coverage: 0 },
        { date: '2025-01-02', coverage: 10 },
        { date: '2025-01-03', coverage: 20 },
      ];

      const result = calculateVelocity(trends);

      expect(result.velocities).toEqual([10, 10]);
      expect(result.avgVelocity).toBe(10);
    });

    it('should handle negative velocity (decrease)', () => {
      const trends = [
        { date: '2025-01-01', coverage: 80 },
        { date: '2025-01-02', coverage: 60 },
        { date: '2025-01-03', coverage: 40 },
      ];

      const result = calculateVelocity(trends);

      expect(result.velocities).toEqual([-20, -20]);
      expect(result.avgVelocity).toBe(-20);
    });

    it('should handle mixed positive and negative velocities', () => {
      const trends = [
        { date: '2025-01-01', coverage: 50 },
        { date: '2025-01-02', coverage: 70 }, // +20
        { date: '2025-01-03', coverage: 60 }, // -10
        { date: '2025-01-04', coverage: 80 }, // +20
      ];

      const result = calculateVelocity(trends);

      expect(result.velocities).toEqual([20, -10, 20]);
      expect(result.avgVelocity).toBe(10); // (20 - 10 + 20) / 3
      expect(result.maxIncrease).toBe(20);
      expect(result.maxDecrease).toBe(-10);
    });

    it('should handle floating point coverage values', () => {
      const trends = [
        { date: '2025-01-01', coverage: 45.67 },
        { date: '2025-01-02', coverage: 52.34 },
        { date: '2025-01-03', coverage: 60.12 },
      ];

      const result = calculateVelocity(trends);

      expect(result.velocities[0]).toBeCloseTo(6.67, 2);
      expect(result.velocities[1]).toBeCloseTo(7.78, 2);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical week of coverage data', () => {
      const trends = [
        { date: '2025-01-13', coverage: 65.0 },
        { date: '2025-01-14', coverage: 67.5 },
        { date: '2025-01-15', coverage: 70.2 },
        { date: '2025-01-16', coverage: 68.9 },
        { date: '2025-01-17', coverage: 71.5 },
      ];

      const result = calculateVelocity(trends);

      expect(result.velocities).toHaveLength(4);
      expect(result.avgVelocity).toBeCloseTo(1.63, 1); // Average improvement
      expect(result.maxIncrease).toBeCloseTo(2.7, 1);
      expect(result.maxDecrease).toBeCloseTo(-1.3, 1);
      expect(result.volatility).toBeGreaterThan(0);
    });

    it('should handle regression scenario', () => {
      const trends = [
        { date: '2025-01-01', coverage: 85.0 },
        { date: '2025-01-02', coverage: 83.5 },
        { date: '2025-01-03', coverage: 82.0 },
        { date: '2025-01-04', coverage: 84.0 }, // Recovery
      ];

      const result = calculateVelocity(trends);

      expect(result.avgVelocity).toBeLessThan(0); // Overall decline
      expect(result.maxDecrease).toBeLessThan(0);
      expect(result.maxIncrease).toBe(2); // Recovery velocity
    });
  });
});
