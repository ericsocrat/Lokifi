/**
 * MACD (Moving Average Convergence Divergence) Indicator
 *
 * MACD is a trend-following momentum indicator that shows the relationship between
 * two moving averages of a price. It's one of the most popular and widely used indicators.
 *
 * Formula:
 * 1. Calculate 12-period EMA (fast line)
 * 2. Calculate 26-period EMA (slow line)
 * 3. MACD Line = Fast EMA - Slow EMA
 * 4. Signal Line = 9-period EMA of MACD Line
 * 5. Histogram = MACD Line - Signal Line
 *
 * Interpretation:
 * - MACD crossing above signal line → Bullish signal
 * - MACD crossing below signal line → Bearish signal
 * - Histogram bars growing → Trend strengthening
 * - Histogram bars shrinking → Trend weakening
 *
 * @param prices - Array of closing prices
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal line EMA period (default: 9)
 * @returns Object with macd, signal, and histogram arrays (null for insufficient data)
 */
export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

/**
 * Calculate Exponential Moving Average (EMA)
 * EMA gives more weight to recent prices
 *
 * Formula: EMA = (Price - Previous EMA) * Multiplier + Previous EMA
 * Multiplier = 2 / (period + 1)
 *
 * @param prices - Array of prices
 * @param period - EMA period
 * @returns Array of EMA values (null for insufficient data)
 */
function calculateEMA(prices: number[], period: number): (number | null)[] {
  if (!Array.isArray(prices) || prices.length === 0) {
    return [];
  }

  if (period <= 0 || !Number.isFinite(period)) {
    throw new Error('Period must be a positive finite number');
  }

  if (prices.length < period) {
    return Array(prices.length).fill(null);
  }

  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  // Initialize with nulls for insufficient data
  for (let i = 0; i < period - 1; i++) {
    result.push(null);
  }

  // Calculate initial SMA as the first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  const initialEMA = sum / period;
  result.push(initialEMA);

  // Calculate subsequent EMA values
  let previousEMA = initialEMA;
  for (let i = period; i < prices.length; i++) {
    const ema = (prices[i] - previousEMA) * multiplier + previousEMA;
    result.push(ema);
    previousEMA = ema;
  }

  return result;
}

/**
 * Calculate MACD indicator
 *
 * @param prices - Array of closing prices
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal line EMA period (default: 9)
 * @returns MACDResult object with macd, signal, and histogram arrays
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  // Validate inputs
  if (!Array.isArray(prices) || prices.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }

  if (fastPeriod <= 0 || slowPeriod <= 0 || signalPeriod <= 0) {
    throw new Error('All periods must be positive numbers');
  }

  if (
    !Number.isFinite(fastPeriod) ||
    !Number.isFinite(slowPeriod) ||
    !Number.isFinite(signalPeriod)
  ) {
    throw new Error('All periods must be finite numbers');
  }

  if (fastPeriod >= slowPeriod) {
    throw new Error('Fast period must be less than slow period');
  }

  const minDataPoints = slowPeriod + signalPeriod - 1;
  if (prices.length < minDataPoints) {
    // Not enough data - return nulls
    return {
      macd: Array(prices.length).fill(null),
      signal: Array(prices.length).fill(null),
      histogram: Array(prices.length).fill(null),
    };
  }

  // Calculate EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) {
      macdLine.push(null);
    } else {
      macdLine.push(fastEMA[i]! - slowEMA[i]!);
    }
  }

  // Calculate signal line (EMA of MACD line)
  // Filter out nulls for EMA calculation
  const macdValues: number[] = [];
  const macdIndices: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      macdValues.push(macdLine[i]!);
      macdIndices.push(i);
    }
  }

  const signalEMA = calculateEMA(macdValues, signalPeriod);

  // Map signal EMA back to original indices
  const signalLine: (number | null)[] = Array(prices.length).fill(null);
  for (let i = 0; i < signalEMA.length; i++) {
    if (signalEMA[i] !== null) {
      signalLine[macdIndices[i]] = signalEMA[i];
    }
  }

  // Calculate histogram (MACD - Signal)
  const histogram: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (macdLine[i] === null || signalLine[i] === null) {
      histogram.push(null);
    } else {
      histogram.push(macdLine[i]! - signalLine[i]!);
    }
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram,
  };
}

/**
 * Interpret MACD indicator
 *
 * @param macdValue - Current MACD line value
 * @param signalValue - Current signal line value
 * @param prevMacdValue - Previous MACD line value (for crossover detection)
 * @param prevSignalValue - Previous signal line value (for crossover detection)
 * @returns Interpretation string
 */
export function interpretMACD(
  macdValue: number | null,
  signalValue: number | null,
  prevMacdValue?: number | null,
  prevSignalValue?: number | null
): string {
  if (macdValue === null || signalValue === null) {
    return 'Insufficient data';
  }

  // Detect crossovers if previous values provided
  if (
    prevMacdValue !== null &&
    prevMacdValue !== undefined &&
    prevSignalValue !== null &&
    prevSignalValue !== undefined
  ) {
    // Bullish crossover (MACD crosses above signal)
    if (prevMacdValue <= prevSignalValue && macdValue > signalValue) {
      return 'Bullish crossover';
    }
    // Bearish crossover (MACD crosses below signal)
    if (prevMacdValue >= prevSignalValue && macdValue < signalValue) {
      return 'Bearish crossover';
    }
  }

  // Simple interpretation based on current position
  if (macdValue > signalValue) {
    return 'Bullish';
  } else if (macdValue < signalValue) {
    return 'Bearish';
  } else {
    return 'Neutral';
  }
}

/**
 * Get latest MACD values
 * Useful for real-time updates
 *
 * @param prices - Array of closing prices
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal line EMA period (default: 9)
 * @returns Latest MACD, signal, and histogram values or nulls
 */
export function getLatestMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number | null; signal: number | null; histogram: number | null } {
  const result = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
  const lastIndex = result.macd.length - 1;

  if (lastIndex < 0) {
    return { macd: null, signal: null, histogram: null };
  }

  return {
    macd: result.macd[lastIndex],
    signal: result.signal[lastIndex],
    histogram: result.histogram[lastIndex],
  };
}

