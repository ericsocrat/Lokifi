/**
 * Williams %R Indicator Service
 *
 * Williams %R is a momentum oscillator that measures overbought/oversold levels.
 * Similar to Stochastic but plotted on a scale from 0 to -100.
 *
 * Formula: %R = (Highest High - Close) / (Highest High - Lowest Low) × -100
 *
 * Key Characteristics:
 * - Range: 0 to -100
 * - Overbought: -20 to 0 (potential sell signal)
 * - Oversold: -80 to -100 (potential buy signal)
 * - Default Period: 14 (commonly used)
 *
 * Interpretation:
 * - Values above -20: Overbought (consider selling)
 * - Values below -80: Oversold (consider buying)
 * - Crossings of -50: Momentum shift
 *
 * @see https://www.investopedia.com/terms/w/williamsr.asp
 */

export interface OHLCPrice {
  time: number;
  high: number;
  low: number;
  close: number;
}

export interface WilliamsRData {
  time: number;
  value: number;
}

export interface WilliamsRInterpretation {
  signal:
    | 'extreme-overbought'
    | 'overbought'
    | 'neutral-high'
    | 'neutral'
    | 'neutral-low'
    | 'oversold'
    | 'extreme-oversold';
  description: string;
  value: number;
}

/**
 * Calculate Williams %R for a given period
 *
 * @param prices - Array of OHLC price data
 * @param period - Lookback period (default: 14)
 * @returns Array of Williams %R values
 *
 * @example
 * ```typescript
 * const prices = [
 *   { time: 1, high: 110, low: 100, close: 105 },
 *   { time: 2, high: 115, low: 105, close: 110 },
 *   // ... more prices
 * ];
 * const williamsR = calculateWilliamsR(prices, 14);
 * // Returns: [{ time: 14, value: -25.5 }, ...]
 * ```
 */
export function calculateWilliamsR(prices: OHLCPrice[], period: number = 14): WilliamsRData[] {
  // Validation
  if (!prices || prices.length === 0) {
    return [];
  }

  if (period < 2) {
    throw new Error('Williams %R period must be at least 2');
  }

  if (prices.length < period) {
    return [];
  }

  const williamsR: WilliamsRData[] = [];

  // Calculate Williams %R for each valid window
  for (let i = period - 1; i < prices.length; i++) {
    const window = prices.slice(i - period + 1, i + 1);

    // Find highest high and lowest low in the period
    const highestHigh = Math.max(...window.map((p) => p.high));
    const lowestLow = Math.min(...window.map((p) => p.low));
    const currentClose = prices[i].close;

    // Calculate Williams %R
    // Formula: %R = (Highest High - Close) / (Highest High - Lowest Low) × -100
    const range = highestHigh - lowestLow;

    // Handle zero range (flat prices)
    let value: number;
    if (range === 0) {
      value = -50; // Neutral value when no price movement
    } else {
      value = ((highestHigh - currentClose) / range) * -100;
    }

    williamsR.push({
      time: prices[i].time,
      value: value,
    });
  }

  return williamsR;
}

/**
 * Interpret Williams %R value to provide trading signals
 *
 * @param value - Williams %R value (0 to -100)
 * @returns Interpretation with signal, description, and value
 *
 * @example
 * ```typescript
 * const interpretation = interpretWilliamsR(-85);
 * // Returns: {
 * //   signal: 'oversold',
 * //   description: 'Oversold - Potential buy signal',
 * //   value: -85
 * // }
 * ```
 */
export function interpretWilliamsR(value: number): WilliamsRInterpretation {
  // Extreme Overbought: -10 to 0
  if (value > -10) {
    return {
      signal: 'extreme-overbought',
      description: 'Extreme Overbought - Strong sell signal, price likely to reverse',
      value,
    };
  }

  // Overbought: -20 to -10
  if (value > -20) {
    return {
      signal: 'overbought',
      description: 'Overbought - Consider selling, upward momentum may be exhausted',
      value,
    };
  }

  // Neutral High: -40 to -20
  if (value > -40) {
    return {
      signal: 'neutral-high',
      description: 'Neutral (High) - Price above midpoint, bullish bias',
      value,
    };
  }

  // Neutral: -60 to -40
  if (value > -60) {
    return {
      signal: 'neutral',
      description: 'Neutral - Price near midpoint, no clear directional bias',
      value,
    };
  }

  // Neutral Low: -80 to -60
  if (value > -80) {
    return {
      signal: 'neutral-low',
      description: 'Neutral (Low) - Price below midpoint, bearish bias',
      value,
    };
  }

  // Oversold: -90 to -80
  if (value > -90) {
    return {
      signal: 'oversold',
      description: 'Oversold - Consider buying, downward momentum may be exhausted',
      value,
    };
  }

  // Extreme Oversold: -100 to -90
  return {
    signal: 'extreme-oversold',
    description: 'Extreme Oversold - Strong buy signal, price likely to bounce',
    value,
  };
}

/**
 * Get the latest Williams %R value with interpretation
 *
 * @param prices - Array of OHLC price data
 * @param period - Lookback period (default: 14)
 * @returns Latest Williams %R data with interpretation, or null if insufficient data
 *
 * @example
 * ```typescript
 * const latest = getLatestWilliamsR(prices, 14);
 * // Returns: {
 * //   time: 1234567890,
 * //   value: -25.5,
 * //   signal: 'overbought',
 * //   description: 'Overbought - Consider selling...'
 * // }
 * ```
 */
export function getLatestWilliamsR(
  prices: OHLCPrice[],
  period: number = 14
): (WilliamsRData & Omit<WilliamsRInterpretation, 'value'>) | null {
  const williamsR = calculateWilliamsR(prices, period);

  if (williamsR.length === 0) {
    return null;
  }

  const latest = williamsR[williamsR.length - 1];
  const interpretation = interpretWilliamsR(latest.value);

  return {
    time: latest.time,
    value: latest.value,
    signal: interpretation.signal,
    description: interpretation.description,
  };
}
