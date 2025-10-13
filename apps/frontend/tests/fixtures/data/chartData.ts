import type { Time } from 'lightweight-charts';

/**
 * Mock candle data for testing chart functionality
 */
export const mockCandleData = [
  { time: '2024-01-01' as Time, open: 100, high: 110, low: 95, close: 105 },
  { time: '2024-01-02' as Time, open: 105, high: 115, low: 100, close: 110 },
  { time: '2024-01-03' as Time, open: 110, high: 120, low: 105, close: 115 },
  { time: '2024-01-04' as Time, open: 115, high: 118, low: 110, close: 112 },
  { time: '2024-01-05' as Time, open: 112, high: 125, low: 112, close: 120 },
];

/**
 * Mock line data for testing line charts
 */
export const mockLineData = [
  { time: '2024-01-01' as Time, value: 100 },
  { time: '2024-01-02' as Time, value: 105 },
  { time: '2024-01-03' as Time, value: 110 },
  { time: '2024-01-04' as Time, value: 112 },
  { time: '2024-01-05' as Time, value: 120 },
];

/**
 * Mock chart state for store testing
 */
export const mockChartState = {
  symbol: 'BTC',
  timeframe: '1h',
  indicators: ['SMA', 'RSI'],
  drawings: [],
  visible: true,
};

/**
 * Mock OHLC data with timestamps
 */
export const mockOHLCData = [
  {
    timestamp: 1704067200, // 2024-01-01 00:00:00
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 1000000,
  },
  {
    timestamp: 1704153600, // 2024-01-02 00:00:00
    open: 105,
    high: 115,
    low: 100,
    close: 110,
    volume: 1200000,
  },
];
