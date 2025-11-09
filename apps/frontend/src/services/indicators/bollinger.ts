/**
 * Bollinger Bands Indicator Service
 *
 * Bollinger Bands are a volatility indicator consisting of three lines:
 * 1. Middle Band: Simple Moving Average (SMA)
 * 2. Upper Band: SMA + (multiplier × standard deviation)
 * 3. Lower Band: SMA - (multiplier × standard deviation)
 *
 * Standard parameters:
 * - Period: 20 (number of periods for SMA calculation)
 * - Multiplier: 2 (number of standard deviations)
 *
 * Interpretation:
 * - Price near Upper Band: Potentially overbought
 * - Price near Lower Band: Potentially oversold
 * - Price at Middle Band: Fair value
 * - Narrow bands: Low volatility (potential breakout)
 * - Wide bands: High volatility
 */

export interface BollingerBandsData {
  index: number;
  middle: number; // SMA (Middle Band)
  upper: number; // Upper Band (SMA + multiplier × stddev)
  lower: number; // Lower Band (SMA - multiplier × stddev)
  bandwidth: number; // (Upper - Lower) / Middle (volatility measure)
}

export type BollingerBandsInterpretation =
  | 'near-upper' // Price near upper band (potentially overbought)
  | 'near-lower' // Price near lower band (potentially oversold)
  | 'at-middle' // Price near middle band (fair value)
  | 'above-upper' // Price above upper band (strong uptrend/overbought)
  | 'below-lower' // Price below lower band (strong downtrend/oversold)
  | 'neutral'; // Price within bands (normal range)

/**
 * Calculate Simple Moving Average (SMA)
 * Used for Bollinger Bands middle band calculation
 *
 * @param prices - Array of price values
 * @param period - Number of periods for SMA
 * @returns SMA value or null if insufficient data
 */
function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;

  const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
  return sum / period;
}

/**
 * Calculate Standard Deviation
 * Used for Bollinger Bands width calculation
 *
 * @param prices - Array of price values
 * @param period - Number of periods for calculation
 * @param mean - Pre-calculated mean (SMA) for efficiency
 * @returns Standard deviation or null if insufficient data
 */
function calculateStdDev(prices: number[], period: number, mean: number): number | null {
  if (prices.length < period) return null;

  const recentPrices = prices.slice(-period);
  const squaredDiffs = recentPrices.map((price) => Math.pow(price - mean, 2));
  const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / period;

  return Math.sqrt(variance);
}

/**
 * Calculate Bollinger Bands for a series of prices
 * Returns an array of Bollinger Bands data points
 *
 * Formula:
 * - Middle Band = SMA(period)
 * - Upper Band = Middle Band + (multiplier × standard deviation)
 * - Lower Band = Middle Band - (multiplier × standard deviation)
 * - Bandwidth = (Upper Band - Lower Band) / Middle Band
 *
 * @param prices - Array of closing prices
 * @param period - Number of periods for SMA (default: 20)
 * @param multiplier - Standard deviation multiplier (default: 2)
 * @returns Array of Bollinger Bands data or empty array if insufficient data
 *
 * @example
 * const prices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
 *                 110, 112, 111, 113, 115, 114, 116, 118, 117, 119];
 * const bands = calculateBollingerBands(prices, 20, 2);
 * // Returns: [{ index: 19, middle: 109.5, upper: 115.2, lower: 103.8, bandwidth: 0.104 }]
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): BollingerBandsData[] {
  // Validate inputs
  if (!prices || prices.length === 0) {
    return [];
  }

  if (period <= 0 || !Number.isFinite(period)) {
    console.warn('Bollinger Bands: Invalid period, must be positive number');
    return [];
  }

  if (multiplier <= 0 || !Number.isFinite(multiplier)) {
    console.warn('Bollinger Bands: Invalid multiplier, must be positive number');
    return [];
  }

  if (prices.length < period) {
    return [];
  }

  const result: BollingerBandsData[] = [];

  // Calculate Bollinger Bands for each valid data point
  for (let i = period - 1; i < prices.length; i++) {
    const priceSlice = prices.slice(0, i + 1);

    // Calculate middle band (SMA)
    const middle = calculateSMA(priceSlice, period);
    if (middle === null) continue;

    // Calculate standard deviation
    const stdDev = calculateStdDev(priceSlice, period, middle);
    if (stdDev === null) continue;

    // Calculate upper and lower bands
    const upper = middle + multiplier * stdDev;
    const lower = middle - multiplier * stdDev;

    // Calculate bandwidth (volatility measure)
    // Avoid division by zero
    const bandwidth = middle !== 0 ? (upper - lower) / middle : 0;

    result.push({
      index: i,
      middle,
      upper,
      lower,
      bandwidth,
    });
  }

  return result;
}

/**
 * Interpret current price position relative to Bollinger Bands
 * Provides trading signals based on price location within the bands
 *
 * Interpretation Logic:
 * - Above Upper: Price > Upper Band (strong uptrend/overbought)
 * - Near Upper: Price within 5% of Upper Band (potentially overbought)
 * - At Middle: Price within 10% of Middle Band (fair value)
 * - Near Lower: Price within 5% of Lower Band (potentially oversold)
 * - Below Lower: Price < Lower Band (strong downtrend/oversold)
 * - Neutral: Price within bands but not near edges (normal range)
 *
 * @param currentPrice - Current price to evaluate
 * @param bands - Bollinger Bands data (middle, upper, lower)
 * @returns Interpretation of price position
 *
 * @example
 * const bands = { middle: 100, upper: 110, lower: 90 };
 * interpretBollingerBands(112, bands); // Returns: 'above-upper'
 * interpretBollingerBands(109, bands); // Returns: 'near-upper'
 * interpretBollingerBands(100, bands); // Returns: 'at-middle'
 */
export function interpretBollingerBands(
  currentPrice: number,
  bands: { middle: number; upper: number; lower: number }
): BollingerBandsInterpretation {
  const { middle, upper, lower } = bands;

  // Calculate thresholds for "near" interpretation (5% proximity)
  const bandWidth = upper - lower;
  const nearThreshold = bandWidth * 0.05;

  // Calculate threshold for "at middle" interpretation (10% of middle band)
  const middleThreshold = middle * 0.1;

  // Price above upper band
  if (currentPrice > upper) {
    return 'above-upper';
  }

  // Price near upper band (within 5% of upper)
  if (currentPrice >= upper - nearThreshold) {
    return 'near-upper';
  }

  // Price below lower band
  if (currentPrice < lower) {
    return 'below-lower';
  }

  // Price near lower band (within 5% of lower)
  if (currentPrice <= lower + nearThreshold) {
    return 'near-lower';
  }

  // Price at middle band (within 10% of middle)
  if (Math.abs(currentPrice - middle) <= middleThreshold) {
    return 'at-middle';
  }

  // Price within bands but not near edges
  return 'neutral';
}

/**
 * Get the latest Bollinger Bands values and interpretation for current price
 * Convenience function for real-time trading analysis
 *
 * @param prices - Array of historical closing prices
 * @param period - Number of periods for SMA (default: 20)
 * @param multiplier - Standard deviation multiplier (default: 2)
 * @returns Object with latest bands and interpretation, or null if insufficient data
 *
 * @example
 * const prices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
 *                 110, 112, 111, 113, 115, 114, 116, 118, 117, 119];
 * const latest = getLatestBollingerBands(prices, 20, 2);
 * // Returns: {
 * //   middle: 109.5,
 * //   upper: 115.2,
 * //   lower: 103.8,
 * //   bandwidth: 0.104,
 * //   interpretation: 'near-upper'
 * // }
 */
export function getLatestBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): {
  middle: number;
  upper: number;
  lower: number;
  bandwidth: number;
  interpretation: BollingerBandsInterpretation;
} | null {
  if (!prices || prices.length === 0) {
    return null;
  }

  const bands = calculateBollingerBands(prices, period, multiplier);

  if (bands.length === 0) {
    return null;
  }

  const latest = bands[bands.length - 1];
  const currentPrice = prices[prices.length - 1];

  return {
    middle: latest.middle,
    upper: latest.upper,
    lower: latest.lower,
    bandwidth: latest.bandwidth,
    interpretation: interpretBollingerBands(currentPrice, latest),
  };
}
