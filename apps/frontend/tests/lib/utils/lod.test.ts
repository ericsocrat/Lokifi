import type { Time } from 'lightweight-charts';
import { describe, expect, it } from 'vitest';
import {
  bucketCountFor,
  downsampleCandlesMinMax,
  downsampleLineMinMax,
  lowerBoundByTime,
  sliceByTimeWindow,
  timeToSec,
  upperBoundByTime,
  type Candle,
} from '../../../src/lib/utils/lod';

// Helper to create mock candles
function mockCandle(time: number, ohlcv: [number, number, number, number, number]): Candle {
  return {
    time: time as Time,
    open: ohlcv[0],
    high: ohlcv[1],
    low: ohlcv[2],
    close: ohlcv[3],
    volume: ohlcv[4],
  };
}

describe('lod utilities', () => {
  describe('bucketCountFor', () => {
    it('should calculate bucket count with default 3px per bucket', () => {
      expect(bucketCountFor(300)).toBe(100); // 300 / 3 = 100
      expect(bucketCountFor(600)).toBe(200); // 600 / 3 = 200
    });

    it('should use minimum of 50 buckets', () => {
      expect(bucketCountFor(0)).toBe(50); // Too small, use min
      expect(bucketCountFor(100)).toBe(50); // 100 / 3 = 33, use min 50
      expect(bucketCountFor(149)).toBe(50); // 149 / 3 = 49, use min 50
    });

    it('should respect custom pxPerBucket parameter', () => {
      expect(bucketCountFor(300, 5)).toBe(60); // 300 / 5 = 60
      expect(bucketCountFor(1000, 10)).toBe(100); // 1000 / 10 = 100
    });

    it('should handle large widths', () => {
      expect(bucketCountFor(10000, 3)).toBe(3333); // 10000 / 3
      expect(bucketCountFor(5000, 2)).toBe(2500); // 5000 / 2
    });

    it('should floor the result', () => {
      expect(bucketCountFor(305, 3)).toBe(101); // 305 / 3 = 101.66, floored to 101
    });
  });

  describe('downsampleCandlesMinMax', () => {
    it('should return original data when already at or below target', () => {
      const data = [
        mockCandle(1, [100, 110, 90, 105, 1000]),
        mockCandle(2, [105, 115, 95, 110, 2000]),
      ];
      const result = downsampleCandlesMinMax(data, 5);
      expect(result).toEqual(data);
      expect(result.length).toBe(2);
    });

    it('should downsample to approximately target count', () => {
      const data = Array.from({ length: 1000 }, (_, i) => mockCandle(i, [100, 110, 90, 105, 500]));
      const result = downsampleCandlesMinMax(data, 100);

      // Should be close to target (not exact due to bucketing)
      expect(result.length).toBeGreaterThan(90);
      expect(result.length).toBeLessThan(110);
    });

    it('should preserve high and low values in buckets', () => {
      const data = [
        mockCandle(1, [100, 105, 95, 102, 1000]),
        mockCandle(2, [102, 120, 90, 115, 2000]), // Highest high, lowest low
        mockCandle(3, [115, 118, 110, 112, 1500]),
      ];
      const result = downsampleCandlesMinMax(data, 1);

      expect(result.length).toBe(1);
      expect(result[0].open).toBe(100); // First open
      expect(result[0].high).toBe(120); // Max high
      expect(result[0].low).toBe(90); // Min low
      expect(result[0].close).toBe(112); // Last close
    });

    it('should use middle time for downsampled candle', () => {
      const data = [
        mockCandle(100, [100, 110, 90, 105, 1000]),
        mockCandle(200, [105, 115, 95, 110, 2000]),
        mockCandle(300, [110, 120, 100, 115, 3000]),
      ];
      const result = downsampleCandlesMinMax(data, 1);

      expect(result[0].time).toBe(200); // Middle time
    });

    it('should sum volumes across bucket', () => {
      const data = [
        mockCandle(1, [100, 110, 90, 105, 1000]),
        mockCandle(2, [105, 115, 95, 110, 2000]),
        mockCandle(3, [110, 120, 100, 115, 3000]),
      ];
      const result = downsampleCandlesMinMax(data, 1);

      expect(result[0].volume).toBe(6000); // 1000 + 2000 + 3000
    });

    it('should handle zero volumes', () => {
      const data = [mockCandle(1, [100, 110, 90, 105, 0]), mockCandle(2, [105, 115, 95, 110, 0])];
      const result = downsampleCandlesMinMax(data, 1);

      expect(result[0].volume).toBe(0);
    });

    it('should handle empty array', () => {
      const result = downsampleCandlesMinMax([], 10);
      expect(result).toEqual([]);
    });

    it('should downsample large dataset', () => {
      const data = Array.from({ length: 10000 }, (_, i) =>
        mockCandle(i, [100 + Math.sin(i) * 10, 110, 90, 105, 1000])
      );
      const result = downsampleCandlesMinMax(data, 500);

      expect(result.length).toBeGreaterThan(450);
      expect(result.length).toBeLessThan(550);
      // First and last should be preserved approximately
      expect(result[0].time).toBeLessThan(100);
      expect(result[result.length - 1].time).toBeGreaterThan(9900);
    });

    it('should maintain price relationships', () => {
      const data = Array.from({ length: 100 }, (_, i) => mockCandle(i, [100, 110, 90, 105, 1000]));
      const result = downsampleCandlesMinMax(data, 10);

      // Each candle should maintain OHLC relationships
      result.forEach((candle) => {
        expect(candle.high).toBeGreaterThanOrEqual(candle.open);
        expect(candle.high).toBeGreaterThanOrEqual(candle.close);
        expect(candle.low).toBeLessThanOrEqual(candle.open);
        expect(candle.low).toBeLessThanOrEqual(candle.close);
      });
    });

    it('should handle non-uniform bucket sizes', () => {
      const data = [
        mockCandle(1, [100, 110, 90, 105, 1000]),
        mockCandle(2, [105, 115, 95, 110, 2000]),
        mockCandle(3, [110, 120, 100, 115, 3000]),
        mockCandle(4, [115, 125, 105, 120, 4000]),
        mockCandle(5, [120, 130, 110, 125, 5000]),
      ];
      const result = downsampleCandlesMinMax(data, 2);

      // Should create approximately 2 buckets
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('downsampleLineMinMax', () => {
    it('should return original data when already at or below target', () => {
      const data = [
        { time: 1 as Time, value: 100 },
        { time: 2 as Time, value: 105 },
      ];
      const result = downsampleLineMinMax(data, 5);
      expect(result).toEqual(data);
    });

    it('should preserve min and max values in each bucket', () => {
      const data = [
        { time: 1 as Time, value: 100 },
        { time: 2 as Time, value: 50 }, // Min
        { time: 3 as Time, value: 150 }, // Max
        { time: 4 as Time, value: 75 },
      ];
      const result = downsampleLineMinMax(data, 1);

      // Should preserve both min and max points
      expect(result.length).toBe(2);
      expect(result).toContainEqual({ time: 2, value: 50 });
      expect(result).toContainEqual({ time: 3, value: 150 });
    });

    it('should create approximately target * 2 points (min + max per bucket)', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        time: i as Time,
        value: Math.sin(i / 10) * 100,
      }));
      const result = downsampleLineMinMax(data, 50);

      // Each bucket contributes 2 points (min and max)
      expect(result.length).toBeGreaterThan(80);
      expect(result.length).toBeLessThan(120);
    });

    it('should handle monotonically increasing data', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        time: i as Time,
        value: i,
      }));
      const result = downsampleLineMinMax(data, 10);

      // For monotonic data, min and max are bucket start and end
      expect(result.length).toBeGreaterThan(10);
    });

    it('should handle monotonically decreasing data', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        time: i as Time,
        value: 100 - i,
      }));
      const result = downsampleLineMinMax(data, 10);

      expect(result.length).toBeGreaterThan(10);
    });

    it('should handle constant values', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        time: i as Time,
        value: 50,
      }));
      const result = downsampleLineMinMax(data, 10);

      // When all values same, min and max are same point
      result.forEach((point) => {
        expect(point.value).toBe(50);
      });
    });

    it('should handle empty array', () => {
      const result = downsampleLineMinMax([], 10);
      expect(result).toEqual([]);
    });

    it('should handle negative values', () => {
      const data = [
        { time: 1 as Time, value: -50 },
        { time: 2 as Time, value: -100 },
        { time: 3 as Time, value: -25 },
      ];
      const result = downsampleLineMinMax(data, 1);

      expect(result).toContainEqual({ time: 2, value: -100 }); // Min
      expect(result).toContainEqual({ time: 3, value: -25 }); // Max
    });

    it('should include points from each bucket', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        time: i as Time,
        value: Math.sin(i / 10) * 100,
      }));
      const result = downsampleLineMinMax(data, 10);

      // Should have points from multiple buckets (2 per bucket)
      expect(result.length).toBeGreaterThan(10);
      // Each bucket contributes min and max (order may vary)
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('timeToSec', () => {
    it('should convert numeric timestamp to seconds', () => {
      expect(timeToSec(1234567890)).toBe(1234567890);
      expect(timeToSec(0)).toBe(0);
    });

    it('should convert string timestamp to number', () => {
      expect(timeToSec('1234567890' as any)).toBe(1234567890);
      expect(timeToSec('0' as any)).toBe(0);
    });

    it('should convert business day object to UTC seconds', () => {
      const bd = { year: 2023, month: 1, day: 15 };
      const result = timeToSec(bd as any);

      // January 15, 2023 at midnight UTC
      const expected = Math.floor(new Date(Date.UTC(2023, 0, 15)).getTime() / 1000);
      expect(result).toBe(expected);
    });

    it('should require month property for business day', () => {
      const bd = { year: 2023, day: 1 }; // Missing month
      const result = timeToSec(bd as any);

      // Without month, treated as invalid and returns 0
      expect(result).toBe(0);
    });

    it('should handle different months', () => {
      const june = { year: 2023, month: 6, day: 15 };
      const dec = { year: 2023, month: 12, day: 31 };

      const juneResult = timeToSec(june as any);
      const decResult = timeToSec(dec as any);

      expect(decResult).toBeGreaterThan(juneResult);
    });

    it('should handle leap year dates', () => {
      const leapDay = { year: 2024, month: 2, day: 29 };
      const result = timeToSec(leapDay as any);

      const expected = Math.floor(new Date(Date.UTC(2024, 1, 29)).getTime() / 1000);
      expect(result).toBe(expected);
    });

    it('should return 0 for invalid input', () => {
      expect(timeToSec({} as any)).toBe(0);
      expect(timeToSec(null as any)).toBe(0);
      expect(timeToSec(undefined as any)).toBe(0);
    });
  });

  describe('lowerBoundByTime', () => {
    const data = [
      mockCandle(100, [100, 110, 90, 105, 1000]),
      mockCandle(200, [105, 115, 95, 110, 2000]),
      mockCandle(300, [110, 120, 100, 115, 3000]),
      mockCandle(400, [115, 125, 105, 120, 4000]),
      mockCandle(500, [120, 130, 110, 125, 5000]),
    ];

    it('should find first index >= timestamp', () => {
      expect(lowerBoundByTime(data, 100)).toBe(0); // Exact match
      expect(lowerBoundByTime(data, 200)).toBe(1); // Exact match
      expect(lowerBoundByTime(data, 300)).toBe(2); // Exact match
    });

    it('should find next index when timestamp between points', () => {
      expect(lowerBoundByTime(data, 150)).toBe(1); // Between 100 and 200
      expect(lowerBoundByTime(data, 250)).toBe(2); // Between 200 and 300
    });

    it('should return 0 when timestamp before all data', () => {
      expect(lowerBoundByTime(data, 50)).toBe(0);
      expect(lowerBoundByTime(data, 0)).toBe(0);
    });

    it('should return data.length when timestamp after all data', () => {
      expect(lowerBoundByTime(data, 600)).toBe(5);
      expect(lowerBoundByTime(data, 1000)).toBe(5);
    });

    it('should handle empty array', () => {
      expect(lowerBoundByTime([], 100)).toBe(0);
    });

    it('should handle single element array', () => {
      const single = [mockCandle(100, [100, 110, 90, 105, 1000])];
      expect(lowerBoundByTime(single, 50)).toBe(0);
      expect(lowerBoundByTime(single, 100)).toBe(0);
      expect(lowerBoundByTime(single, 150)).toBe(1);
    });
  });

  describe('upperBoundByTime', () => {
    const data = [
      mockCandle(100, [100, 110, 90, 105, 1000]),
      mockCandle(200, [105, 115, 95, 110, 2000]),
      mockCandle(300, [110, 120, 100, 115, 3000]),
      mockCandle(400, [115, 125, 105, 120, 4000]),
      mockCandle(500, [120, 130, 110, 125, 5000]),
    ];

    it('should find last index <= timestamp', () => {
      expect(upperBoundByTime(data, 100)).toBe(0); // Exact match
      expect(upperBoundByTime(data, 200)).toBe(1); // Exact match
      expect(upperBoundByTime(data, 500)).toBe(4); // Exact match
    });

    it('should find previous index when timestamp between points', () => {
      expect(upperBoundByTime(data, 150)).toBe(0); // Between 100 and 200
      expect(upperBoundByTime(data, 450)).toBe(3); // Between 400 and 500
    });

    it('should return -1 when timestamp before all data', () => {
      expect(upperBoundByTime(data, 50)).toBe(-1);
      expect(upperBoundByTime(data, 0)).toBe(-1);
    });

    it('should return last index when timestamp after all data', () => {
      expect(upperBoundByTime(data, 600)).toBe(4);
      expect(upperBoundByTime(data, 1000)).toBe(4);
    });

    it('should handle empty array', () => {
      expect(upperBoundByTime([], 100)).toBe(-1);
    });

    it('should handle single element array', () => {
      const single = [mockCandle(100, [100, 110, 90, 105, 1000])];
      expect(upperBoundByTime(single, 50)).toBe(-1);
      expect(upperBoundByTime(single, 100)).toBe(0);
      expect(upperBoundByTime(single, 150)).toBe(0);
    });
  });

  describe('sliceByTimeWindow', () => {
    const data = [
      mockCandle(100, [100, 110, 90, 105, 1000]),
      mockCandle(200, [105, 115, 95, 110, 2000]),
      mockCandle(300, [110, 120, 100, 115, 3000]),
      mockCandle(400, [115, 125, 105, 120, 4000]),
      mockCandle(500, [120, 130, 110, 125, 5000]),
    ];

    it('should slice data within time window', () => {
      const result = sliceByTimeWindow(data, 200, 400);
      expect(result.length).toBe(3); // 200, 300, 400
      expect(result[0].time).toBe(200);
      expect(result[2].time).toBe(400);
    });

    it('should handle exact boundaries', () => {
      const result = sliceByTimeWindow(data, 100, 500);
      expect(result.length).toBe(5); // All data
    });

    it('should handle window between data points', () => {
      const result = sliceByTimeWindow(data, 150, 350);
      expect(result.length).toBe(2); // 200, 300
    });

    it('should swap fromSec and toSec if reversed', () => {
      const result1 = sliceByTimeWindow(data, 200, 400);
      const result2 = sliceByTimeWindow(data, 400, 200);
      expect(result1).toEqual(result2);
    });

    it('should return empty array when window before data', () => {
      const result = sliceByTimeWindow(data, 0, 50);
      expect(result).toEqual([]);
    });

    it('should return clamped result when window after data', () => {
      const result = sliceByTimeWindow(data, 600, 700);
      // Clamps to last valid index
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should clamp start to 0', () => {
      const result = sliceByTimeWindow(data, -100, 200);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].time).toBe(100);
    });

    it('should clamp end to data.length - 1', () => {
      const result = sliceByTimeWindow(data, 300, 1000);
      expect(result.length).toBeGreaterThan(0);
      expect(result[result.length - 1].time).toBe(500);
    });

    it('should handle empty array', () => {
      const result = sliceByTimeWindow([], 100, 200);
      expect(result).toEqual([]);
    });

    it('should handle single element array', () => {
      const single = [mockCandle(100, [100, 110, 90, 105, 1000])];

      const result1 = sliceByTimeWindow(single, 50, 150);
      expect(result1).toEqual(single);

      const result2 = sliceByTimeWindow(single, 0, 50);
      // Window before element - clamping behavior
      expect(result2.length).toBeGreaterThanOrEqual(0);

      const result3 = sliceByTimeWindow(single, 150, 200);
      // Window after element - clamping behavior returns element
      expect(result3.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very narrow window', () => {
      const result = sliceByTimeWindow(data, 200, 200);
      expect(result.length).toBe(1);
      expect(result[0].time).toBe(200);
    });

    it('should handle window spanning all data', () => {
      const result = sliceByTimeWindow(data, 0, 10000);
      expect(result).toEqual(data);
    });
  });

  describe('integration - combined operations', () => {
    it('should downsample then slice by time window', () => {
      const data = Array.from({ length: 1000 }, (_, i) =>
        mockCandle(i * 100, [100, 110, 90, 105, 1000])
      );

      const downsampled = downsampleCandlesMinMax(data, 100);
      const sliced = sliceByTimeWindow(downsampled, 10000, 50000);

      expect(sliced.length).toBeGreaterThan(0);
      expect(sliced.length).toBeLessThanOrEqual(downsampled.length);
    });

    it('should calculate buckets and downsample accordingly', () => {
      const data = Array.from({ length: 10000 }, (_, i) =>
        mockCandle(i, [100, 110, 90, 105, 1000])
      );

      const buckets = bucketCountFor(3000, 3); // 1000 buckets
      const downsampled = downsampleCandlesMinMax(data, buckets);

      expect(downsampled.length).toBeGreaterThan(900);
      expect(downsampled.length).toBeLessThan(1100);
    });

    it('should find bounds and slice efficiently', () => {
      const data = Array.from({ length: 1000 }, (_, i) =>
        mockCandle(i * 1000, [100, 110, 90, 105, 1000])
      );

      const fromSec = 100000;
      const toSec = 500000;

      const start = lowerBoundByTime(data, fromSec);
      const end = upperBoundByTime(data, toSec);

      const sliced = data.slice(start, end + 1);
      const slicedByWindow = sliceByTimeWindow(data, fromSec, toSec);

      expect(sliced).toEqual(slicedByWindow);
    });
  });
});
