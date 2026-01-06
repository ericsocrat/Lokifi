import { describe, it, expect } from 'vitest';
import { angleDeg, tfToSeconds, barsFromTimes } from '@/lib/charts/chartUtils';

describe('chartUtils', () => {
  describe('angleDeg', () => {
    it('should return 0 degrees for horizontal line to the right', () => {
      expect(angleDeg(0, 0, 10, 0)).toBe(0);
    });

    it('should return 90 degrees for vertical line downward', () => {
      expect(angleDeg(0, 0, 0, 10)).toBe(90);
    });

    it('should return -90 degrees for vertical line upward', () => {
      expect(angleDeg(0, 0, 0, -10)).toBe(-90);
    });

    it('should return 180 degrees for horizontal line to the left', () => {
      expect(angleDeg(0, 0, -10, 0)).toBe(180);
    });

    it('should return 45 degrees for diagonal down-right', () => {
      expect(angleDeg(0, 0, 10, 10)).toBe(45);
    });

    it('should return -45 degrees for diagonal up-right', () => {
      expect(angleDeg(0, 0, 10, -10)).toBe(-45);
    });

    it('should return 135 degrees for diagonal down-left', () => {
      expect(angleDeg(0, 0, -10, 10)).toBe(135);
    });

    it('should return -135 degrees for diagonal up-left', () => {
      expect(angleDeg(0, 0, -10, -10)).toBe(-135);
    });

    it('should handle non-origin start point', () => {
      expect(angleDeg(100, 200, 110, 200)).toBe(0);
    });

    it('should return 0 for same point (degenerate case)', () => {
      expect(angleDeg(5, 5, 5, 5)).toBe(0);
    });
  });

  describe('tfToSeconds', () => {
    describe('minutes', () => {
      it('should convert 1m to 60 seconds', () => {
        expect(tfToSeconds('1m')).toBe(60);
      });

      it('should convert 5m to 300 seconds', () => {
        expect(tfToSeconds('5m')).toBe(300);
      });

      it('should convert 15m to 900 seconds', () => {
        expect(tfToSeconds('15m')).toBe(900);
      });

      it('should convert 30m to 1800 seconds', () => {
        expect(tfToSeconds('30m')).toBe(1800);
      });
    });

    describe('hours', () => {
      it('should convert 1h to 3600 seconds', () => {
        expect(tfToSeconds('1h')).toBe(3600);
      });

      it('should convert 4h to 14400 seconds', () => {
        expect(tfToSeconds('4h')).toBe(14400);
      });

      it('should convert 12h to 43200 seconds', () => {
        expect(tfToSeconds('12h')).toBe(43200);
      });
    });

    describe('days', () => {
      it('should convert 1d to 86400 seconds', () => {
        expect(tfToSeconds('1d')).toBe(86400);
      });

      it('should convert 7d to 604800 seconds', () => {
        expect(tfToSeconds('7d')).toBe(604800);
      });
    });

    describe('weeks', () => {
      it('should convert 1w to 604800 seconds', () => {
        expect(tfToSeconds('1w')).toBe(604800);
      });

      it('should convert 2w to 1209600 seconds', () => {
        expect(tfToSeconds('2w')).toBe(1209600);
      });
    });

    describe('default (minutes)', () => {
      it('should treat plain number as minutes', () => {
        expect(tfToSeconds('15')).toBe(900);
      });

      it('should default to 1 minute for invalid input', () => {
        expect(tfToSeconds('invalid')).toBe(60);
      });

      it('should default to 1 minute for empty string', () => {
        expect(tfToSeconds('')).toBe(60);
      });
    });
  });

  describe('barsFromTimes', () => {
    it('should calculate bars for 1 hour in 1m timeframe', () => {
      const oneHour = 3600;
      expect(barsFromTimes(0, oneHour, '1m')).toBe(60);
    });

    it('should calculate bars for 1 day in 1h timeframe', () => {
      const oneDay = 86400;
      expect(barsFromTimes(0, oneDay, '1h')).toBe(24);
    });

    it('should calculate bars for 1 week in 1d timeframe', () => {
      const oneWeek = 604800;
      expect(barsFromTimes(0, oneWeek, '1d')).toBe(7);
    });

    it('should handle reversed time order (use absolute difference)', () => {
      const oneHour = 3600;
      expect(barsFromTimes(oneHour, 0, '1m')).toBe(60);
    });

    it('should return 0 for same timestamps', () => {
      expect(barsFromTimes(1000, 1000, '1m')).toBe(0);
    });

    it('should handle fractional bars', () => {
      const halfHour = 1800;
      expect(barsFromTimes(0, halfHour, '1h')).toBe(0.5);
    });

    it('should use 60 second default if timeframe is invalid', () => {
      const oneHour = 3600;
      expect(barsFromTimes(0, oneHour, 'invalid')).toBe(60);
    });

    it('should calculate correctly with non-zero start time', () => {
      const start = 1000000;
      const end = start + 3600;
      expect(barsFromTimes(start, end, '1m')).toBe(60);
    });
  });
});
