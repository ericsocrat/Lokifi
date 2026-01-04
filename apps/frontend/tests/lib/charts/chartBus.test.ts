import { getChart, onChartChange, setChart } from '@/lib/charts/chartBus';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { describe, expect, it, vi } from 'vitest';

// Helper to create mock chart with minimal required properties
function mockChart(id: string): IChartApi {
  return { id } as unknown as IChartApi;
}

// Helper to create mock series with minimal required properties
function mockSeries(id: string): ISeriesApi<'Candlestick'> {
  return { id } as unknown as ISeriesApi<'Candlestick'>;
}

// Helper to create candles with proper Time type
function mockTime(timestamp: number): Time {
  return timestamp as Time;
}

describe('chartBus', () => {
  describe('setChart', () => {
    it('should set chart context', () => {
      const chart = mockChart('test-chart');
      const series = mockSeries('test-series');
      const mockCandles = [
        { time: mockTime(1), open: 100, high: 110, low: 90, close: 105, volume: 1000 },
      ];

      setChart({
        chart,
        series,
        candles: mockCandles,
      });

      const ctx = getChart();
      expect(ctx.chart).toBe(chart);
      expect(ctx.series).toBe(series);
      expect(ctx.candles).toBe(mockCandles);
    });

    it('should set chart to null', () => {
      // First set something
      setChart({
        chart: mockChart('chart'),
        series: mockSeries('series'),
        candles: [],
      });

      // Then clear it
      setChart({ chart: null, series: null, candles: [] });

      const ctx = getChart();
      expect(ctx.chart).toBeNull();
      expect(ctx.series).toBeNull();
      expect(ctx.candles).toEqual([]);
    });

    it('should update chart context', () => {
      const chart1 = mockChart('chart1');
      const chart2 = mockChart('chart2');

      setChart({ chart: chart1, series: null, candles: [] });
      expect(getChart().chart).toBe(chart1);

      setChart({ chart: chart2, series: null, candles: [] });
      expect(getChart().chart).toBe(chart2);
    });

    it('should notify listeners when chart changes', () => {
      const listener = vi.fn();

      onChartChange(listener);

      setChart({ chart: mockChart('test'), series: null, candles: [] });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      onChartChange(listener1);
      onChartChange(listener2);
      onChartChange(listener3);

      setChart({ chart: mockChart('test'), series: null, candles: [] });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should notify listeners on each change', () => {
      const listener = vi.fn();

      onChartChange(listener);

      setChart({ chart: mockChart('1'), series: null, candles: [] });
      setChart({ chart: mockChart('2'), series: null, candles: [] });
      setChart({ chart: mockChart('3'), series: null, candles: [] });

      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('should handle empty candles array', () => {
      setChart({ chart: null, series: null, candles: [] });

      const ctx = getChart();
      expect(ctx.candles).toEqual([]);
    });

    it('should handle multiple candles', () => {
      const candles = [
        { time: mockTime(1), open: 100, high: 110, low: 90, close: 105, volume: 1000 },
        { time: mockTime(2), open: 105, high: 115, low: 95, close: 110, volume: 1500 },
        { time: mockTime(3), open: 110, high: 120, low: 100, close: 115, volume: 2000 },
      ];

      setChart({ chart: null, series: null, candles });

      const ctx = getChart();
      expect(ctx.candles).toHaveLength(3);
      expect(ctx.candles[0]!.open).toBe(100);
      expect(ctx.candles[2]!.close).toBe(115);
    });
  });

  describe('getChart', () => {
    it('should return current context', () => {
      // Reset to known state first
      setChart({ chart: null, series: null, candles: [] });

      const ctx = getChart();

      expect(ctx).toBeDefined();
      expect(ctx.chart).toBeNull();
      expect(ctx.series).toBeNull();
      expect(ctx.candles).toEqual([]);
    });

    it('should return current chart context', () => {
      const testChart = mockChart('current');

      setChart({ chart: testChart, series: null, candles: [] });

      const ctx = getChart();
      expect(ctx.chart).toBe(testChart);
    });

    it('should return same reference between calls when unchanged', () => {
      setChart({ chart: mockChart('test'), series: null, candles: [] });

      const ctx1 = getChart();
      const ctx2 = getChart();

      expect(ctx1).toBe(ctx2);
    });

    it('should return new reference after setChart', () => {
      setChart({ chart: mockChart('first'), series: null, candles: [] });
      const ctx1 = getChart();

      setChart({ chart: mockChart('second'), series: null, candles: [] });
      const ctx2 = getChart();

      expect(ctx1).not.toBe(ctx2);
    });

    it('should return chart with series', () => {
      const testSeries = mockSeries('series');

      setChart({ chart: null, series: testSeries, candles: [] });

      const ctx = getChart();
      expect(ctx.series).toBe(testSeries);
    });

    it('should return chart with candles', () => {
      const candles = [
        { time: mockTime(1), open: 100, high: 110, low: 90, close: 105, volume: 1000 },
      ];

      setChart({ chart: null, series: null, candles });

      const ctx = getChart();
      expect(ctx.candles).toBe(candles);
    });
  });

  describe('onChartChange', () => {
    it('should register listener', () => {
      const listener = vi.fn();

      onChartChange(listener);
      setChart({ chart: mockChart('test'), series: null, candles: [] });

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();

      const unsubscribe = onChartChange(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop calling listener after unsubscribe', () => {
      const listener = vi.fn();

      const unsubscribe = onChartChange(listener);

      setChart({ chart: mockChart('1'), series: null, candles: [] });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      setChart({ chart: mockChart('2'), series: null, candles: [] });
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should handle multiple subscriptions and unsubscriptions', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      const unsub1 = onChartChange(listener1);
      const unsub2 = onChartChange(listener2);
      const unsub3 = onChartChange(listener3);

      setChart({ chart: mockChart('1'), series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);

      unsub2();

      setChart({ chart: mockChart('2'), series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(1); // Not called after unsub
      expect(listener3).toHaveBeenCalledTimes(2);

      unsub1();
      unsub3();

      setChart({ chart: mockChart('3'), series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(2); // Not called
      expect(listener2).toHaveBeenCalledTimes(1); // Not called
      expect(listener3).toHaveBeenCalledTimes(2); // Not called
    });

    it('should handle same listener registered multiple times', () => {
      const listener = vi.fn();

      onChartChange(listener);
      onChartChange(listener);

      setChart({ chart: mockChart('test'), series: null, candles: [] });

      // Should be called twice (once per registration)
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should handle unsubscribe called multiple times', () => {
      const listener = vi.fn();

      const unsubscribe = onChartChange(listener);

      unsubscribe();
      unsubscribe(); // Second call should not throw

      setChart({ chart: mockChart('test'), series: null, candles: [] });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not affect other listeners when one unsubscribes', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = onChartChange(listener1);
      onChartChange(listener2);

      unsub1();

      setChart({ chart: mockChart('test'), series: null, candles: [] });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should handle listener that throws error', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      const unsub1 = onChartChange(errorListener);
      const unsub2 = onChartChange(normalListener);

      // setChart should throw because forEach doesn't catch errors
      expect(() => {
        setChart({ chart: mockChart('test'), series: null, candles: [] });
      }).toThrow('Listener error');

      expect(errorListener).toHaveBeenCalledTimes(1);
      // normalListener might not be called due to error

      // Clean up to prevent affecting other tests
      unsub1();
      unsub2();
    });

    it('should handle empty listener list', () => {
      expect(() => {
        setChart({ chart: mockChart('test'), series: null, candles: [] });
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should handle full lifecycle', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Subscribe
      const unsub1 = onChartChange(listener1);
      const unsub2 = onChartChange(listener2);

      // Change 1
      setChart({ chart: mockChart('1'), series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(getChart().chart).toEqual({ id: '1' });

      // Change 2
      setChart({ chart: mockChart('2'), series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(2);
      expect(getChart().chart).toEqual({ id: '2' });

      // Unsubscribe first listener
      unsub1();

      // Change 3
      setChart({ chart: mockChart('3'), series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(2); // Didn't increase
      expect(listener2).toHaveBeenCalledTimes(3);
      expect(getChart().chart).toEqual({ id: '3' });

      // Unsubscribe second listener
      unsub2();

      // Change 4
      setChart({ chart: mockChart('4'), series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(2); // Still 2
      expect(listener2).toHaveBeenCalledTimes(3); // Still 3
      expect(getChart().chart).toEqual({ id: '4' });
    });

    it('should handle chart with all properties', () => {
      const listener = vi.fn();
      onChartChange(listener);

      const fullChart = mockChart('full-chart');
      const fullSeries = mockSeries('full-series');
      const mockCandles = [
        { time: mockTime(1), open: 100, high: 110, low: 90, close: 105, volume: 1000 },
        { time: mockTime(2), open: 105, high: 115, low: 95, close: 110, volume: 1500 },
      ];

      setChart({
        chart: fullChart,
        series: fullSeries,
        candles: mockCandles,
      });

      expect(listener).toHaveBeenCalledTimes(1);

      const ctx = getChart();
      expect(ctx.chart).toBe(fullChart);
      expect(ctx.series).toBe(fullSeries);
      expect(ctx.candles).toBe(mockCandles);
      expect(ctx.candles).toHaveLength(2);
    });

    it('should handle rapid changes', () => {
      const listener = vi.fn();
      onChartChange(listener);

      for (let i = 0; i < 100; i++) {
        setChart({ chart: mockChart(`${i}`), series: null, candles: [] });
      }

      expect(listener).toHaveBeenCalledTimes(100);
      expect(getChart().chart).toEqual({ id: '99' });
    });

    it('should maintain correct state after multiple subscribe/unsubscribe cycles', () => {
      const listener = vi.fn();

      // Cycle 1
      let unsub = onChartChange(listener);
      setChart({ chart: mockChart('1'), series: null, candles: [] });
      unsub();

      // Cycle 2
      unsub = onChartChange(listener);
      setChart({ chart: mockChart('2'), series: null, candles: [] });
      unsub();

      // Cycle 3
      unsub = onChartChange(listener);
      setChart({ chart: mockChart('3'), series: null, candles: [] });
      unsub();

      expect(listener).toHaveBeenCalledTimes(3);
      expect(getChart().chart).toEqual({ id: '3' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined chart', () => {
      // Test undefined handling - explicit cast to satisfy type checker
      setChart({ chart: undefined as unknown as null, series: null, candles: [] });

      const ctx = getChart();
      expect(ctx.chart).toBeUndefined();
    });

    it('should handle undefined series', () => {
      // Test undefined handling - explicit cast to satisfy type checker
      setChart({ chart: null, series: undefined as unknown as null, candles: [] });

      const ctx = getChart();
      expect(ctx.series).toBeUndefined();
    });

    it('should handle candles with various data types', () => {
      const candles = [
        { time: mockTime(1704067200), open: 100, high: 110, low: 90, close: 105, volume: 1000 },
        { time: mockTime(1234567890), open: 105, high: 115, low: 95, close: 110, volume: 1500 },
      ];

      setChart({ chart: null, series: null, candles });

      const ctx = getChart();
      expect(ctx.candles).toHaveLength(2);
      expect(ctx.candles[0]!.time).toBe(1704067200);
      expect(ctx.candles[1]!.time).toBe(1234567890);
    });

    it('should handle large candles array', () => {
      const candles = Array.from({ length: 10000 }, (_, i) => ({
        time: mockTime(i),
        open: 100 + i,
        high: 110 + i,
        low: 90 + i,
        close: 105 + i,
        volume: 1000,
      }));

      setChart({ chart: null, series: null, candles });

      const ctx = getChart();
      expect(ctx.candles).toHaveLength(10000);
    });

    it('should handle setChart with same reference', () => {
      const chartCtx = { chart: mockChart('same'), series: null, candles: [] };

      setChart(chartCtx);
      setChart(chartCtx); // Same reference

      const ctx = getChart();
      expect(ctx).toBe(chartCtx);
    });
  });
});
