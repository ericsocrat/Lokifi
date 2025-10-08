/**
 * Type safety tests for lightweight-charts type definitions
 * Ensures chart API types are working correctly
 */

import type {
    CandlestickData,
    ChartOptions,
    HistogramData,
    LineData,
    SeriesMarker,
    SeriesOptions,
    Time,
    TimeRange,
} from '@/types/lightweight-charts';
import { describe, expect, it } from '@jest/globals';

describe('Lightweight Charts Type Definitions', () => {
  describe('Time type', () => {
    it('should accept number timestamps', () => {
      const time: Time = 1609459200; // Unix timestamp
      expect(typeof time).toBe('number');
    });

    it('should accept string dates', () => {
      const time: Time = '2021-01-01';
      expect(typeof time).toBe('string');
    });

    it('should accept timestamp objects', () => {
      const time: Time = { timestamp: 1609459200 };
      expect(time).toHaveProperty('timestamp');
    });
  });

  describe('TimeRange type', () => {
    it('should accept valid time ranges', () => {
      const range: TimeRange = {
        from: 1609459200,
        to: 1609545600,
      };
      expect(typeof range.from).toBe('number');
      expect(typeof range.to).toBe('number');
    });
  });

  describe('CandlestickData type', () => {
    it('should accept valid candlestick data', () => {
      const candle: CandlestickData = {
        time: 1609459200,
        open: 100,
        high: 110,
        low: 95,
        close: 105,
      };
      expect(candle.open).toBe(100);
      expect(candle.close).toBe(105);
    });

    it('should validate OHLC relationships', () => {
      const candle: CandlestickData = {
        time: '2021-01-01',
        open: 100,
        high: 120,
        low: 90,
        close: 105,
      };
      expect(candle.high).toBeGreaterThanOrEqual(candle.open);
      expect(candle.high).toBeGreaterThanOrEqual(candle.close);
      expect(candle.low).toBeLessThanOrEqual(candle.open);
      expect(candle.low).toBeLessThanOrEqual(candle.close);
    });
  });

  describe('LineData type', () => {
    it('should accept valid line data', () => {
      const data: LineData = {
        time: 1609459200,
        value: 100.5,
      };
      expect(data.value).toBe(100.5);
    });
  });

  describe('HistogramData type', () => {
    it('should accept valid histogram data', () => {
      const data: HistogramData = {
        time: 1609459200,
        value: 1000,
      };
      expect(data.value).toBe(1000);
    });

    it('should accept optional color', () => {
      const data: HistogramData = {
        time: 1609459200,
        value: 1000,
        color: '#00ff00',
      };
      expect(data.color).toBe('#00ff00');
    });
  });

  describe('SeriesMarker type', () => {
    it('should accept valid markers', () => {
      const marker: SeriesMarker = {
        time: 1609459200,
        position: 'aboveBar',
        color: '#ff0000',
        shape: 'arrowDown',
        text: 'Sell Signal',
      };
      expect(marker.text).toBe('Sell Signal');
    });

    it('should accept different positions', () => {
      const positions: Array<'aboveBar' | 'belowBar' | 'inBar'> = [
        'aboveBar',
        'belowBar',
        'inBar',
      ];
      positions.forEach((position: any) => {
        const marker: SeriesMarker = {
          time: 1609459200,
          position,
        };
        expect(marker.position).toBe(position);
      });
    });
  });

  describe('SeriesOptions type', () => {
    it('should accept valid series options', () => {
      const options: SeriesOptions = {
        color: '#2196F3',
        lineWidth: 2,
        title: 'My Series',
      };
      expect(options.title).toBe('My Series');
    });

    it('should accept price format options', () => {
      const options: SeriesOptions = {
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      };
      expect(options.priceFormat?.precision).toBe(2);
    });
  });

  describe('ChartOptions type', () => {
    it('should accept valid chart options', () => {
      const options: ChartOptions = {
        width: 800,
        height: 400,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333333',
          fontSize: 12,
        },
      };
      expect(options.width).toBe(800);
      expect(options.layout?.fontSize).toBe(12);
    });

    it('should accept grid options', () => {
      const options: ChartOptions = {
        grid: {
          vertLines: { color: '#e0e0e0', visible: true },
          horzLines: { color: '#e0e0e0', visible: true },
        },
      };
      expect(options.grid?.vertLines?.visible).toBe(true);
    });

    it('should accept crosshair options', () => {
      const options: ChartOptions = {
        crosshair: {
          mode: 1,
          vertLine: {
            color: '#758696',
            width: 1,
            style: 0,
            visible: true,
            labelVisible: true,
          },
        },
      };
      expect(options.crosshair?.vertLine?.visible).toBe(true);
    });

    it('should accept time scale options', () => {
      const options: ChartOptions = {
        timeScale: {
          rightOffset: 10,
          barSpacing: 6,
          minBarSpacing: 0.5,
          fixLeftEdge: false,
          fixRightEdge: true,
        },
      };
      expect(options.timeScale?.rightOffset).toBe(10);
    });
  });

  describe('Complex chart configurations', () => {
    it('should handle complete chart setup', () => {
      const chartOptions: ChartOptions = {
        width: 1200,
        height: 600,
        layout: {
          background: { color: '#1e222d' },
          textColor: '#d1d4dc',
          fontSize: 14,
          fontFamily: 'Roboto, sans-serif',
        },
        grid: {
          vertLines: { color: '#2B2B43', visible: true },
          horzLines: { color: '#2B2B43', visible: true },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: '#758696',
            width: 1,
            style: 3,
            visible: true,
            labelVisible: true,
          },
          horzLine: {
            color: '#758696',
            width: 1,
            style: 3,
            visible: true,
            labelVisible: true,
          },
        },
        priceScale: {
          position: 'right',
          mode: 0,
          autoScale: true,
          invertScale: false,
          alignLabels: true,
          borderVisible: true,
          borderColor: '#2B2B43',
          scaleMargins: {
            top: 0.1,
            bottom: 0.2,
          },
        },
        timeScale: {
          rightOffset: 12,
          barSpacing: 6,
          minBarSpacing: 0.5,
          fixLeftEdge: false,
          fixRightEdge: true,
          lockVisibleTimeRangeOnResize: true,
          rightBarStaysOnScroll: true,
          borderVisible: true,
          borderColor: '#2B2B43',
          visible: true,
          timeVisible: true,
          secondsVisible: false,
        },
      };

      expect(chartOptions.width).toBe(1200);
      expect(chartOptions.layout?.textColor).toBe('#d1d4dc');
      expect(chartOptions.timeScale?.barSpacing).toBe(6);
    });
  });

  describe('Array types', () => {
    it('should handle arrays of candlestick data', () => {
      const data: CandlestickData[] = [
        { time: 1609459200, open: 100, high: 110, low: 95, close: 105 },
        { time: 1609545600, open: 105, high: 115, low: 100, close: 112 },
        { time: 1609632000, open: 112, high: 120, low: 110, close: 118 },
      ];
      expect(data).toHaveLength(3);
    });

    it('should handle arrays of markers', () => {
      const markers: SeriesMarker[] = [
        {
          time: 1609459200,
          position: 'aboveBar',
          color: '#ff0000',
          shape: 'arrowDown',
          text: 'Sell',
        },
        {
          time: 1609545600,
          position: 'belowBar',
          color: '#00ff00',
          shape: 'arrowUp',
          text: 'Buy',
        },
      ];
      expect(markers).toHaveLength(2);
    });
  });
});
