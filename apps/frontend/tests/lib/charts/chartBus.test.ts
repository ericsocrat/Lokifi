import { getChart, onChartChange, setChart } from '@/lib/charts/chartBus';
import { describe, expect, it, vi } from 'vitest';

describe('chartBus', () => {
  describe('setChart', () => {
    it('should set chart context', () => {
      const mockChart = { id: 'test-chart' } as any;
      const mockSeries = { id: 'test-series' } as any;
      const mockCandles = [{ time: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 }];

      setChart({
        chart: mockChart,
        series: mockSeries,
        candles: mockCandles,
      });

      const ctx = getChart();
      expect(ctx.chart).toBe(mockChart);
      expect(ctx.series).toBe(mockSeries);
      expect(ctx.candles).toBe(mockCandles);
    });

    it('should set chart to null', () => {
      // First set something
      setChart({
        chart: { id: 'chart' } as any,
        series: { id: 'series' } as any,
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
      const chart1 = { id: 'chart1' } as any;
      const chart2 = { id: 'chart2' } as any;

      setChart({ chart: chart1, series: null, candles: [] });
      expect(getChart().chart).toBe(chart1);

      setChart({ chart: chart2, series: null, candles: [] });
      expect(getChart().chart).toBe(chart2);
    });

    it('should notify listeners when chart changes', () => {
      const listener = vi.fn();

      onChartChange(listener);

      setChart({ chart: { id: 'test' } as any, series: null, candles: [] });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      onChartChange(listener1);
      onChartChange(listener2);
      onChartChange(listener3);

      setChart({ chart: { id: 'test' } as any, series: null, candles: [] });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should notify listeners on each change', () => {
      const listener = vi.fn();

      onChartChange(listener);

      setChart({ chart: { id: '1' } as any, series: null, candles: [] });
      setChart({ chart: { id: '2' } as any, series: null, candles: [] });
      setChart({ chart: { id: '3' } as any, series: null, candles: [] });

      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('should handle empty candles array', () => {
      setChart({ chart: null, series: null, candles: [] });

      const ctx = getChart();
      expect(ctx.candles).toEqual([]);
    });

    it('should handle multiple candles', () => {
      const candles = [
        { time: 1 as any, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
        { time: 2 as any, open: 105, high: 115, low: 95, close: 110, volume: 1500 },
        { time: 3 as any, open: 110, high: 120, low: 100, close: 115, volume: 2000 },
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
      const mockChart = { id: 'current' } as any;

      setChart({ chart: mockChart, series: null, candles: [] });

      const ctx = getChart();
      expect(ctx.chart).toBe(mockChart);
    });

    it('should return same reference between calls when unchanged', () => {
      setChart({ chart: { id: 'test' } as any, series: null, candles: [] });

      const ctx1 = getChart();
      const ctx2 = getChart();

      expect(ctx1).toBe(ctx2);
    });

    it('should return new reference after setChart', () => {
      setChart({ chart: { id: 'first' } as any, series: null, candles: [] });
      const ctx1 = getChart();

      setChart({ chart: { id: 'second' } as any, series: null, candles: [] });
      const ctx2 = getChart();

      expect(ctx1).not.toBe(ctx2);
    });

    it('should return chart with series', () => {
      const mockSeries = { id: 'series' } as any;

      setChart({ chart: null, series: mockSeries, candles: [] });

      const ctx = getChart();
      expect(ctx.series).toBe(mockSeries);
    });

    it('should return chart with candles', () => {
      const candles = [{ time: 1 as any, open: 100, high: 110, low: 90, close: 105, volume: 1000 }];

      setChart({ chart: null, series: null, candles });

      const ctx = getChart();
      expect(ctx.candles).toBe(candles);
    });
  });

  describe('onChartChange', () => {
    it('should register listener', () => {
      const listener = vi.fn();

      onChartChange(listener);
      setChart({ chart: { id: 'test' } as any, series: null, candles: [] });

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

      setChart({ chart: { id: '1' } as any, series: null, candles: [] });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      setChart({ chart: { id: '2' } as any, series: null, candles: [] });
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should handle multiple subscriptions and unsubscriptions', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      const unsub1 = onChartChange(listener1);
      const unsub2 = onChartChange(listener2);
      const unsub3 = onChartChange(listener3);

      setChart({ chart: { id: '1' } as any, series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);

      unsub2();

      setChart({ chart: { id: '2' } as any, series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(1); // Not called after unsub
      expect(listener3).toHaveBeenCalledTimes(2);

      unsub1();
      unsub3();

      setChart({ chart: { id: '3' } as any, series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(2); // Not called
      expect(listener2).toHaveBeenCalledTimes(1); // Not called
      expect(listener3).toHaveBeenCalledTimes(2); // Not called
    });

    it('should handle same listener registered multiple times', () => {
      const listener = vi.fn();

      onChartChange(listener);
      onChartChange(listener);

      setChart({ chart: { id: 'test' } as any, series: null, candles: [] });

      // Should be called twice (once per registration)
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should handle unsubscribe called multiple times', () => {
      const listener = vi.fn();

      const unsubscribe = onChartChange(listener);

      unsubscribe();
      unsubscribe(); // Second call should not throw

      setChart({ chart: { id: 'test' } as any, series: null, candles: [] });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not affect other listeners when one unsubscribes', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = onChartChange(listener1);
      onChartChange(listener2);

      unsub1();

      setChart({ chart: { id: 'test' } as any, series: null, candles: [] });

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
        setChart({ chart: { id: 'test' } as any, series: null, candles: [] });
      }).toThrow('Listener error');

      expect(errorListener).toHaveBeenCalledTimes(1);
      // normalListener might not be called due to error

      // Clean up to prevent affecting other tests
      unsub1();
      unsub2();
    });

    it('should handle empty listener list', () => {
      expect(() => {
        setChart({ chart: { id: 'test' } as any, series: null, candles: [] });
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
      setChart({ chart: { id: '1' } as any, series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(getChart().chart).toEqual({ id: '1' });

      // Change 2
      setChart({ chart: { id: '2' } as any, series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(2);
      expect(getChart().chart).toEqual({ id: '2' });

      // Unsubscribe first listener
      unsub1();

      // Change 3
      setChart({ chart: { id: '3' } as any, series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(2); // Didn't increase
      expect(listener2).toHaveBeenCalledTimes(3);
      expect(getChart().chart).toEqual({ id: '3' });

      // Unsubscribe second listener
      unsub2();

      // Change 4
      setChart({ chart: { id: '4' } as any, series: null, candles: [] });
      expect(listener1).toHaveBeenCalledTimes(2); // Still 2
      expect(listener2).toHaveBeenCalledTimes(3); // Still 3
      expect(getChart().chart).toEqual({ id: '4' });
    });

    it('should handle chart with all properties', () => {
      const listener = vi.fn();
      onChartChange(listener);

      const mockChart = { id: 'full-chart', options: { width: 800 } } as any;
      const mockSeries = { id: 'full-series', type: 'candlestick' } as any;
      const mockCandles = [
        { time: 1 as any, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
        { time: 2 as any, open: 105, high: 115, low: 95, close: 110, volume: 1500 },
      ];

      setChart({
        chart: mockChart,
        series: mockSeries,
        candles: mockCandles,
      });

      expect(listener).toHaveBeenCalledTimes(1);

      const ctx = getChart();
      expect(ctx.chart).toBe(mockChart);
      expect(ctx.series).toBe(mockSeries);
      expect(ctx.candles).toBe(mockCandles);
      expect(ctx.candles).toHaveLength(2);
    });

    it('should handle rapid changes', () => {
      const listener = vi.fn();
      onChartChange(listener);

      for (let i = 0; i < 100; i++) {
        setChart({ chart: { id: i } as any, series: null, candles: [] });
      }

      expect(listener).toHaveBeenCalledTimes(100);
      expect(getChart().chart).toEqual({ id: 99 });
    });

    it('should maintain correct state after multiple subscribe/unsubscribe cycles', () => {
      const listener = vi.fn();

      // Cycle 1
      let unsub = onChartChange(listener);
      setChart({ chart: { id: '1' } as any, series: null, candles: [] });
      unsub();

      // Cycle 2
      unsub = onChartChange(listener);
      setChart({ chart: { id: '2' } as any, series: null, candles: [] });
      unsub();

      // Cycle 3
      unsub = onChartChange(listener);
      setChart({ chart: { id: '3' } as any, series: null, candles: [] });
      unsub();

      expect(listener).toHaveBeenCalledTimes(3);
      expect(getChart().chart).toEqual({ id: '3' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined chart', () => {
      setChart({ chart: undefined as any, series: null, candles: [] });

      const ctx = getChart();
      expect(ctx.chart).toBeUndefined();
    });

    it('should handle undefined series', () => {
      setChart({ chart: null, series: undefined as any, candles: [] });

      const ctx = getChart();
      expect(ctx.series).toBeUndefined();
    });

    it('should handle candles with various data types', () => {
      const candles = [
        { time: '2024-01-01' as any, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
        { time: 1234567890 as any, open: 105, high: 115, low: 95, close: 110, volume: 1500 },
      ];

      setChart({ chart: null, series: null, candles });

      const ctx = getChart();
      expect(ctx.candles).toHaveLength(2);
      expect(ctx.candles[0]!.time).toBe('2024-01-01');
      expect(ctx.candles[1]!.time).toBe(1234567890);
    });

    it('should handle large candles array', () => {
      const candles = Array.from({ length: 10000 }, (_, i) => ({
        time: i as any,
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
      const chartCtx = { chart: { id: 'same' } as any, series: null, candles: [] };

      setChart(chartCtx);
      setChart(chartCtx); // Same reference

      const ctx = getChart();
      expect(ctx).toBe(chartCtx);
    });
  });
});
