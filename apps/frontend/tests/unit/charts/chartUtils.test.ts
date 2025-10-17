import { describe, it, expect } from 'vitest';
import { angleDeg, tfToSeconds, barsFromTimes } from '@/lib/charts/chartUtils';

describe('chartUtils', () => {
  describe('angleDeg', () => {
    it('should calculate angle for horizontal line (0°)', () => {
      expect(angleDeg(0, 0, 1, 0)).toBeCloseTo(0);
    });

    it('should calculate angle for vertical line (90°)', () => {
      expect(angleDeg(0, 0, 0, 1)).toBeCloseTo(90);
    });

    it('should calculate angle for diagonal line (45°)', () => {
      expect(angleDeg(0, 0, 1, 1)).toBeCloseTo(45);
    });

    it('should calculate angle for diagonal line (-45°)', () => {
      expect(angleDeg(0, 0, 1, -1)).toBeCloseTo(-45);
    });

    it('should calculate angle for 180° (left)', () => {
      expect(angleDeg(1, 0, 0, 0)).toBeCloseTo(180);
    });

    it('should calculate angle for -90° (down)', () => {
      expect(angleDeg(0, 1, 0, 0)).toBeCloseTo(-90);
    });

    it('should calculate angle for 135°', () => {
      expect(angleDeg(0, 0, -1, 1)).toBeCloseTo(135);
    });

    it('should calculate angle for -135°', () => {
      expect(angleDeg(0, 0, -1, -1)).toBeCloseTo(-135);
    });

    it('should handle arbitrary points', () => {
      expect(angleDeg(5, 5, 10, 10)).toBeCloseTo(45);
      expect(angleDeg(10, 5, 5, 10)).toBeCloseTo(135);
    });

    it('should handle negative coordinates', () => {
      expect(angleDeg(-5, -5, 0, 0)).toBeCloseTo(45);
      expect(angleDeg(-10, 0, 0, -10)).toBeCloseTo(-45);
    });

    it('should handle same point (angle from point to itself)', () => {
      expect(angleDeg(5, 5, 5, 5)).toBeCloseTo(0);
    });

    it('should handle very small differences', () => {
      const angle = angleDeg(0, 0, 0.001, 0.001);
      expect(angle).toBeCloseTo(45, 1);
    });

    it('should handle large coordinate values', () => {
      expect(angleDeg(0, 0, 1000000, 1000000)).toBeCloseTo(45);
    });

    it('should calculate angle correctly for different quadrants', () => {
      // Quadrant I (0-90)
      expect(angleDeg(0, 0, 1, 1)).toBeCloseTo(45);
      // Quadrant II (90-180)
      expect(angleDeg(0, 0, -1, 1)).toBeCloseTo(135);
      // Quadrant III (-180 to -90)
      expect(angleDeg(0, 0, -1, -1)).toBeCloseTo(-135);
      // Quadrant IV (-90 to 0)
      expect(angleDeg(0, 0, 1, -1)).toBeCloseTo(-45);
    });

    it('should return consistent angles for reversed direction', () => {
      const angle1 = angleDeg(0, 0, 1, 1);
      const angle2 = angleDeg(1, 1, 0, 0);
      
      // Opposite directions should differ by ±180°
      expect(Math.abs(Math.abs(angle1 - angle2) - 180)).toBeLessThan(0.01);
    });
  });

  describe('tfToSeconds', () => {
    it('should convert minutes to seconds', () => {
      expect(tfToSeconds('1m')).toBe(60);
      expect(tfToSeconds('5m')).toBe(300);
      expect(tfToSeconds('15m')).toBe(900);
    });

    it('should convert hours to seconds', () => {
      expect(tfToSeconds('1h')).toBe(3600);
      expect(tfToSeconds('2h')).toBe(7200);
      expect(tfToSeconds('4h')).toBe(14400);
    });

    it('should convert days to seconds', () => {
      expect(tfToSeconds('1d')).toBe(86400);
      expect(tfToSeconds('3d')).toBe(259200);
      expect(tfToSeconds('7d')).toBe(604800);
    });

    it('should convert weeks to seconds', () => {
      expect(tfToSeconds('1w')).toBe(604800);
      expect(tfToSeconds('2w')).toBe(1209600);
      expect(tfToSeconds('4w')).toBe(2419200);
    });

    it('should default to minutes when no suffix', () => {
      expect(tfToSeconds('5')).toBe(300); // 5 minutes
      expect(tfToSeconds('15')).toBe(900); // 15 minutes
      expect(tfToSeconds('60')).toBe(3600); // 60 minutes
    });

    it('should handle single digit values', () => {
      expect(tfToSeconds('1m')).toBe(60);
      expect(tfToSeconds('1h')).toBe(3600);
      expect(tfToSeconds('1d')).toBe(86400);
      expect(tfToSeconds('1w')).toBe(604800);
    });

    it('should handle large values', () => {
      expect(tfToSeconds('100m')).toBe(6000);
      expect(tfToSeconds('24h')).toBe(86400);
      expect(tfToSeconds('365d')).toBe(31536000);
    });

    it('should handle invalid format (default to 1 minute)', () => {
      expect(tfToSeconds('abc')).toBe(60);
      expect(tfToSeconds('')).toBe(60);
      expect(tfToSeconds('m')).toBe(60);
    });

    it('should handle zero value', () => {
      expect(tfToSeconds('0m')).toBe(0);
      expect(tfToSeconds('0h')).toBe(0);
      expect(tfToSeconds('0')).toBe(0);
    });

    it('should handle fractional values (parseInt truncates)', () => {
      expect(tfToSeconds('1.5m')).toBe(60); // parseInt('1.5') = 1
      expect(tfToSeconds('2.7h')).toBe(7200); // parseInt('2.7') = 2
    });

    it('should handle negative values (parseInt handles)', () => {
      expect(tfToSeconds('-1m')).toBe(-60);
      expect(tfToSeconds('-5h')).toBe(-18000);
    });

    it('should handle uppercase suffixes (case sensitive)', () => {
      // Current implementation is case-sensitive, so 'M' won't match
      expect(tfToSeconds('1M')).toBe(60); // Defaults to minutes
      expect(tfToSeconds('1H')).toBe(60); // Defaults to minutes
    });

    it('should handle common timeframe values', () => {
      expect(tfToSeconds('1m')).toBe(60);
      expect(tfToSeconds('5m')).toBe(300);
      expect(tfToSeconds('15m')).toBe(900);
      expect(tfToSeconds('30m')).toBe(1800);
      expect(tfToSeconds('1h')).toBe(3600);
      expect(tfToSeconds('4h')).toBe(14400);
      expect(tfToSeconds('1d')).toBe(86400);
      expect(tfToSeconds('1w')).toBe(604800);
    });
  });

  describe('barsFromTimes', () => {
    it('should calculate bars for 1 hour with 1m timeframe', () => {
      const a = 0, b = 3600; // one hour apart
      expect(barsFromTimes(a, b, '1m')).toBeCloseTo(60);
    });

    it('should calculate bars for 1 day with 1h timeframe', () => {
      const a = 0, b = 86400; // one day apart
      expect(barsFromTimes(a, b, '1h')).toBeCloseTo(24);
    });

    it('should calculate bars for 1 week with 1d timeframe', () => {
      const a = 0, b = 604800; // one week apart
      expect(barsFromTimes(a, b, '1d')).toBeCloseTo(7);
    });

    it('should calculate bars for 1 month with 1w timeframe', () => {
      const a = 0, b = 2592000; // ~30 days apart
      expect(barsFromTimes(a, b, '1w')).toBeCloseTo(4.285, 2);
    });

    it('should handle reversed time order (uses absolute difference)', () => {
      const a = 3600, b = 0; // reversed
      expect(barsFromTimes(a, b, '1m')).toBeCloseTo(60);
    });

    it('should handle same time (0 bars)', () => {
      expect(barsFromTimes(100, 100, '1m')).toBe(0);
    });

    it('should handle fractional bars', () => {
      const a = 0, b = 90; // 90 seconds = 1.5 minutes
      expect(barsFromTimes(a, b, '1m')).toBeCloseTo(1.5);
    });

    it('should handle very small time differences', () => {
      const a = 0, b = 1; // 1 second
      expect(barsFromTimes(a, b, '1m')).toBeCloseTo(1/60, 3);
    });

    it('should handle very large time differences', () => {
      const a = 0, b = 31536000; // 1 year
      expect(barsFromTimes(a, b, '1d')).toBeCloseTo(365);
    });

    it('should handle different timeframe formats', () => {
      const a = 0, b = 3600; // 1 hour
      
      expect(barsFromTimes(a, b, '1m')).toBeCloseTo(60);
      expect(barsFromTimes(a, b, '5m')).toBeCloseTo(12);
      expect(barsFromTimes(a, b, '15m')).toBeCloseTo(4);
      expect(barsFromTimes(a, b, '1h')).toBeCloseTo(1);
    });

    it('should handle negative timestamps (treats as absolute difference)', () => {
      const a = -3600, b = 0;
      expect(barsFromTimes(a, b, '1m')).toBeCloseTo(60);
    });

    it('should handle both timestamps negative', () => {
      const a = -7200, b = -3600; // 1 hour apart
      expect(barsFromTimes(a, b, '1m')).toBeCloseTo(60);
    });

    it('should handle zero timeframe seconds (divides by 60 due to default)', () => {
      const a = 0, b = 3600;
      // Invalid timeframe defaults to 60 seconds
      expect(barsFromTimes(a, b, 'invalid')).toBeCloseTo(60);
    });

    it('should calculate bars for typical trading scenarios', () => {
      // Intraday trading
      const marketOpen = 9.5 * 3600; // 9:30 AM
      const marketClose = 16 * 3600; // 4:00 PM
      
      expect(barsFromTimes(marketOpen, marketClose, '5m')).toBeCloseTo(78);
      expect(barsFromTimes(marketOpen, marketClose, '15m')).toBeCloseTo(26);
      expect(barsFromTimes(marketOpen, marketClose, '1h')).toBeCloseTo(6.5);
    });

    it('should handle exact bar boundaries', () => {
      const a = 0, b = 3600; // Exactly 1 hour
      expect(barsFromTimes(a, b, '1h')).toBe(1);
      
      const c = 0, d = 86400; // Exactly 1 day
      expect(barsFromTimes(c, d, '1d')).toBe(1);
    });

    it('should handle sub-bar intervals', () => {
      const a = 0, b = 30; // 30 seconds
      expect(barsFromTimes(a, b, '1m')).toBeCloseTo(0.5);
    });
  });

  describe('Integration', () => {
    it('should calculate angle and convert to common reference', () => {
      const angle = angleDeg(0, 0, 1, 1);
      expect(angle).toBeCloseTo(45);
      
      // Could be used for trendline analysis
      const isUptrend = angle > 0 && angle < 90;
      expect(isUptrend).toBe(true);
    });

    it('should work with timeframe conversions for bar calculations', () => {
      const start = 1000000;
      const end = 1003600; // 1 hour later
      
      const tf = '5m';
      const bars = barsFromTimes(start, end, tf);
      const secondsPerBar = tfToSeconds(tf);
      
      expect(bars).toBeCloseTo(12);
      expect(secondsPerBar).toBe(300);
      expect(bars * secondsPerBar).toBeCloseTo(3600);
    });

    it('should handle complete trendline scenario', () => {
      // Calculate angle of trendline
      const x1 = 0, y1 = 100;
      const x2 = 100, y2 = 150;
      const angle = angleDeg(x1, y1, x2, y2);
      
      // Calculate number of bars
      const startTime = 0;
      const endTime = 3600;
      const bars = barsFromTimes(startTime, endTime, '1m');
      
      expect(angle).toBeCloseTo(26.565, 2);
      expect(bars).toBeCloseTo(60);
    });
  });

  describe('Edge Cases', () => {
    it('should handle Infinity in angle calculation', () => {
      const angle = angleDeg(0, 0, Infinity, 0);
      expect(angle).toBeCloseTo(0);
    });

    it('should handle very small numbers near zero', () => {
      const angle = angleDeg(0, 0, 1e-10, 1e-10);
      expect(angle).toBeCloseTo(45);
    });

    it('should handle maximum safe integer for timestamps', () => {
      const a = 0;
      const b = Number.MAX_SAFE_INTEGER;
      const bars = barsFromTimes(a, b, '1m');
      
      expect(Number.isFinite(bars)).toBe(true);
      expect(bars).toBeGreaterThan(0);
    });

    it('should handle timeframe with leading zeros', () => {
      expect(tfToSeconds('01m')).toBe(60);
      expect(tfToSeconds('05h')).toBe(18000);
    });

    it('should handle whitespace in timeframe (parseInt ignores leading whitespace)', () => {
      expect(tfToSeconds(' 5m')).toBe(300);
    });
  });
});