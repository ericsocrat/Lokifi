/**
 * Stochastic Oscillator Indicator Service
 *
 * The Stochastic Oscillator is a momentum indicator that compares a particular
 * closing price to a range of its prices over a certain period.
 *
 * Formula:
 * - %K = (Current Close - Lowest Low) / (Highest High - Lowest Low) × 100
 * - %D = SMA(%K, smoothing period)
 *
 * Interpretation:
 * - Overbought: %K > 80 (potential sell signal)
 * - Oversold: %K < 20 (potential buy signal)
 * - Bullish Crossover: %K crosses above %D
 * - Bearish Crossover: %K crosses below %D
 *
 * @module services/indicators/stochastic
 */

export interface StochasticData {
  time: number;
  k: number; // Fast stochastic (%K)
  d: number; // Slow stochastic (%D)
}

export interface StochasticInterpretation {
  signal: 'overbought' | 'oversold' | 'neutral';
  crossover?: 'bullish' | 'bearish' | 'none';
  strength: number; // 0-100
  description: string;
}

/**
 * Calculate Simple Moving Average for Stochastic %D
 *
 * @param values - Array of %K values
 * @param period - Number of periods (default: 3)
 * @returns SMA value or 0 if insufficient data
 */
function calculateSMA(values: number[], period: number): number {
  if (values.length < period) {
    return 0;
  }

  const sum = values.slice(-period).reduce((acc: number, val: number) => acc + val, 0);
  return sum / period;
}

/**
 * Calculate Stochastic Oscillator (%K and %D)
 *
 * %K (Fast Stochastic):
 * - Measures where the close is relative to the range over N periods
 * - Formula: (Close - LowestLow(N)) / (HighestHigh(N) - LowestLow(N)) × 100
 *
 * %D (Slow Stochastic):
 * - Simple Moving Average of %K
 * - Formula: SMA(%K, smoothing period)
 *
 * @param prices - Array of OHLC price data with timestamps
 * @param kPeriod - Period for %K calculation (default: 14)
 * @param dPeriod - Smoothing period for %D calculation (default: 3)
 * @returns Array of Stochastic data points
 *
 * @example
 * ```typescript
 * const prices = [
 *   { time: 1000, close: 100, high: 105, low: 95 },
 *   { time: 2000, close: 102, high: 107, low: 97 },
 *   // ... more prices
 * ];
 * const stochastic = calculateStochastic(prices, 14, 3);
 * // Returns: [{ time: 1000, k: 50.0, d: 48.5 }, ...]
 * ```
 */
export function calculateStochastic(
  prices: Array<{ time: number; close: number; high: number; low: number }>,
  kPeriod = 14,
  dPeriod = 3
): StochasticData[] {
  // Edge case: Empty array
  if (prices.length === 0) {
    return [];
  }

  // Edge case: Insufficient data for calculation
  if (prices.length < kPeriod) {
    return [];
  }

  // Edge case: Invalid periods
  if (kPeriod <= 0 || dPeriod <= 0) {
    return [];
  }

  const result: StochasticData[] = [];
  const kValues: number[] = [];

  // Calculate %K for each price point
  for (let i = kPeriod - 1; i < prices.length; i++) {
    const periodPrices = prices.slice(i - kPeriod + 1, i + 1);

    // Find highest high and lowest low in period
    const highestHigh = Math.max(...periodPrices.map((p: { high: number }) => p.high));
    const lowestLow = Math.min(...periodPrices.map((p: { low: number }) => p.low));

    const currentClose = prices[i].close;
    const range = highestHigh - lowestLow;

    // Edge case: Zero range (all prices identical)
    let k: number;
    if (range === 0) {
      k = 50; // Neutral position when no price movement
    } else {
      k = ((currentClose - lowestLow) / range) * 100;
    }

    kValues.push(k);

    // Calculate %D (SMA of %K)
    const d = calculateSMA(kValues, dPeriod);

    result.push({
      time: prices[i].time,
      k: parseFloat(k.toFixed(2)),
      d: parseFloat(d.toFixed(2)),
    });
  }

  return result;
}

/**
 * Interpret Stochastic Oscillator values
 *
 * Provides trading signals based on:
 * - Overbought/Oversold levels (80/20 thresholds)
 * - %K and %D crossovers (bullish/bearish signals)
 * - Signal strength (distance from neutral 50)
 *
 * @param k - Current %K value
 * @param d - Current %D value
 * @param prevK - Previous %K value (optional, for crossover detection)
 * @param prevD - Previous %D value (optional, for crossover detection)
 * @returns Interpretation with signal, crossover, strength, and description
 *
 * @example
 * ```typescript
 * const interpretation = interpretStochastic(85, 82);
 * // Returns: { signal: 'overbought', strength: 85, description: '...' }
 *
 * const withCrossover = interpretStochastic(25, 30, 15, 25);
 * // Returns: { signal: 'oversold', crossover: 'bullish', ... }
 * ```
 */
export function interpretStochastic(
  k: number,
  d: number,
  prevK?: number,
  prevD?: number
): StochasticInterpretation {
  const overboughtLevel = 80;
  const oversoldLevel = 20;

  // Determine overbought/oversold signal
  let signal: 'overbought' | 'oversold' | 'neutral';
  if (k > overboughtLevel) {
    signal = 'overbought';
  } else if (k < oversoldLevel) {
    signal = 'oversold';
  } else {
    signal = 'neutral';
  }

  // Detect crossover if previous values provided
  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (prevK !== undefined && prevD !== undefined) {
    // Bullish crossover: %K crosses above %D
    if (prevK < prevD && k > d) {
      crossover = 'bullish';
    }
    // Bearish crossover: %K crosses below %D
    else if (prevK > prevD && k < d) {
      crossover = 'bearish';
    }
  }

  // Calculate signal strength (distance from neutral 50)
  const strength = Math.abs(k - 50) * 2; // Scale to 0-100

  // Generate description
  let description = '';
  if (signal === 'overbought') {
    description = `Overbought condition (%K: ${k.toFixed(1)}). Potential sell signal.`;
  } else if (signal === 'oversold') {
    description = `Oversold condition (%K: ${k.toFixed(1)}). Potential buy signal.`;
  } else {
    description = `Neutral momentum (%K: ${k.toFixed(1)}).`;
  }

  if (crossover === 'bullish') {
    description += ' Bullish crossover detected (%K crossed above %D).';
  } else if (crossover === 'bearish') {
    description += ' Bearish crossover detected (%K crossed below %D).';
  }

  return {
    signal,
    crossover,
    strength: parseFloat(strength.toFixed(2)),
    description,
  };
}

/**
 * Get latest Stochastic Oscillator value from calculated data
 *
 * Convenience function to retrieve the most recent Stochastic value.
 * Returns undefined if no data available.
 *
 * @param stochasticData - Array of Stochastic data points
 * @returns Latest Stochastic data or undefined if empty
 *
 * @example
 * ```typescript
 * const stochastic = calculateStochastic(prices);
 * const latest = getLatestStochastic(stochastic);
 * if (latest) {
 *   console.log(`%K: ${latest.k}, %D: ${latest.d}`);
 * }
 * ```
 */
export function getLatestStochastic(
  stochasticData: StochasticData[]
): StochasticData | undefined {
  if (stochasticData.length === 0) {
    return undefined;
  }
  return stochasticData[stochasticData.length - 1];
}
