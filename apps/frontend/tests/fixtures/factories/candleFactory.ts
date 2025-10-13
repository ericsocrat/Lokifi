import type { Time } from 'lightweight-charts';

/**
 * Create a single candle with optional overrides
 */
export const createCandle = (
  overrides: Partial<{
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
  }> = {}
) => ({
  time: '2024-01-01' as Time,
  open: 100,
  high: 110,
  low: 95,
  close: 105,
  ...overrides,
});

/**
 * Generate a sequence of candles with realistic price movement
 */
export const createCandleSequence = (count: number, startPrice = 100, volatility = 0.05) => {
  const candles = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    const date = new Date(2024, 0, i + 1);
    const change = (Math.random() - 0.5) * 2 * price * volatility;
    const open = price;
    price += change;
    const close = price;
    const high = Math.max(open, close) + Math.random() * price * volatility;
    const low = Math.min(open, close) - Math.random() * price * volatility;

    candles.push(
      createCandle({
        time: date.toISOString().split('T')[0] as Time,
        open,
        high,
        low,
        close,
      })
    );
  }

  return candles;
};

/**
 * Generate trending candles (upward or downward trend)
 */
export const createTrendingCandles = (
  count: number,
  startPrice = 100,
  trend: 'up' | 'down' = 'up',
  trendStrength = 0.02
) => {
  const candles = [];
  let price = startPrice;
  const direction = trend === 'up' ? 1 : -1;

  for (let i = 0; i < count; i++) {
    const date = new Date(2024, 0, i + 1);
    const trendChange = price * trendStrength * direction;
    const noise = (Math.random() - 0.5) * price * 0.01;
    const open = price;
    price += trendChange + noise;
    const close = price;
    const high = Math.max(open, close) + Math.random() * price * 0.005;
    const low = Math.min(open, close) - Math.random() * price * 0.005;

    candles.push(
      createCandle({
        time: date.toISOString().split('T')[0] as Time,
        open,
        high,
        low,
        close,
      })
    );
  }

  return candles;
};
