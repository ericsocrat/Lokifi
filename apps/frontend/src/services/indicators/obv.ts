/**
 * On-Balance Volume (OBV) Indicator Service
 *
 * OBV is a volume-based momentum indicator that measures buying and selling pressure
 * by adding volume on up days and subtracting volume on down days.
 *
 * Algorithm:
 * - If close > previous close: OBV = Previous OBV + Volume
 * - If close < previous close: OBV = Previous OBV - Volume
 * - If close = previous close: OBV = Previous OBV (unchanged)
 *
 * Interpretation:
 * - Rising OBV: Bullish volume pressure (accumulation)
 * - Falling OBV: Bearish volume pressure (distribution)
 * - OBV divergence from price: Potential trend reversal signal
 *
 * @see https://www.investopedia.com/terms/o/onbalancevolume.asp
 */

export interface OHLCVPrice {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OBVData {
  time: number;
  value: number;
}

export interface OBVTrend {
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  divergence: 'bullish' | 'bearish' | 'none';
}

/**
 * Calculate On-Balance Volume (OBV)
 *
 * @param prices - Array of OHLCV price data (requires volume)
 * @returns Array of OBV data points
 *
 * @example
 * ```typescript
 * const prices = [
 *   { time: 1, open: 100, high: 105, low: 99, close: 103, volume: 1000 },
 *   { time: 2, open: 103, high: 108, low: 102, close: 106, volume: 1500 },
 *   { time: 3, open: 106, high: 107, low: 104, close: 104, volume: 800 }
 * ];
 *
 * const obv = calculateOBV(prices);
 * // Result:
 * // [
 * //   { time: 1, value: 1000 },      // First day: OBV = volume
 * //   { time: 2, value: 2500 },      // Up day: 1000 + 1500
 * //   { time: 3, value: 1700 }       // Down day: 2500 - 800
 * // ]
 * ```
 */
export function calculateOBV(prices: OHLCVPrice[]): OBVData[] {
  if (!prices || prices.length === 0) {
    return [];
  }

  const result: OBVData[] = [];
  let obv = 0;

  for (let i = 0; i < prices.length; i++) {
    const current = prices[i];
    const previous = i > 0 ? prices[i - 1] : null;

    // Validate volume exists
    if (current.volume === undefined || current.volume === null) {
      throw new Error('Volume data is required for OBV calculation');
    }

    if (i === 0) {
      // First data point: OBV starts at volume
      obv = current.volume;
    } else if (previous) {
      // Subsequent points: Add/subtract volume based on price direction
      if (current.close > previous.close) {
        // Up day: Add volume (buying pressure)
        obv += current.volume;
      } else if (current.close < previous.close) {
        // Down day: Subtract volume (selling pressure)
        obv -= current.volume;
      }
      // If close === previous.close, OBV remains unchanged
    }

    result.push({
      time: current.time,
      value: obv,
    });
  }

  return result;
}

/**
 * Interpret OBV trend and divergence
 *
 * @param obvData - Array of OBV data points
 * @param prices - Array of OHLCV price data for divergence analysis
 * @param lookback - Number of periods to analyze for trend (default: 10)
 * @returns OBV trend interpretation
 *
 * @example
 * ```typescript
 * const trend = interpretOBV(obvData, prices, 10);
 * // Result: { direction: 'bullish', strength: 'strong', divergence: 'none' }
 * ```
 */
export function interpretOBV(
  obvData: OBVData[],
  prices: OHLCVPrice[],
  lookback: number = 10
): OBVTrend {
  if (!obvData || obvData.length < lookback || !prices || prices.length < lookback) {
    return { direction: 'neutral', strength: 'weak', divergence: 'none' };
  }

  // Analyze OBV trend over lookback period
  const recentOBV = obvData.slice(-lookback);
  const recentPrices = prices.slice(-lookback);

  const firstOBV = recentOBV[0].value;
  const lastOBV = recentOBV[recentOBV.length - 1].value;
  const obvChange = lastOBV - firstOBV;

  // Calculate average volume for normalization
  const avgVolume = recentPrices.reduce((sum, p) => sum + p.volume, 0) / recentPrices.length;
  const normalizedOBVChange = Math.abs(obvChange / avgVolume);

  // Determine OBV direction
  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (obvChange > 0) {
    direction = 'bullish'; // Rising OBV (accumulation)
  } else if (obvChange < 0) {
    direction = 'bearish'; // Falling OBV (distribution)
  }

  // Determine trend strength based on normalized change (relative to average volume)
  let strength: 'strong' | 'moderate' | 'weak' = 'weak';
  if (normalizedOBVChange > 3.0) {
    strength = 'strong'; // >3x average volume change (strong accumulation/distribution)
  } else if (normalizedOBVChange > 1.0) {
    strength = 'moderate'; // 1-3x average volume change (moderate trend)
  }
  // else: <1x = weak trend

  // Check for divergence (OBV vs Price)
  const firstPrice = recentPrices[0].close;
  const lastPrice = recentPrices[recentPrices.length - 1].close;
  const priceChange = lastPrice - firstPrice;

  let divergence: 'bullish' | 'bearish' | 'none' = 'none';

  // Bullish divergence: Price falling but OBV rising (accumulation despite lower prices)
  if (priceChange < 0 && obvChange > 0) {
    divergence = 'bullish';
  }
  // Bearish divergence: Price rising but OBV falling (distribution despite higher prices)
  else if (priceChange > 0 && obvChange < 0) {
    divergence = 'bearish';
  }

  return { direction, strength, divergence };
}

/**
 * Get the latest OBV value and interpretation
 *
 * @param prices - Array of OHLCV price data
 * @param lookback - Number of periods for trend analysis (default: 10)
 * @returns Latest OBV value with interpretation, or null if insufficient data
 *
 * @example
 * ```typescript
 * const latest = getLatestOBV(prices, 10);
 * // Result:
 * // {
 * //   value: 125000,
 * //   trend: { direction: 'bullish', strength: 'strong', divergence: 'none' }
 * // }
 * ```
 */
export function getLatestOBV(
  prices: OHLCVPrice[],
  lookback: number = 10
): { value: number; trend: OBVTrend } | null {
  if (!prices || prices.length === 0) {
    return null;
  }

  const obvData = calculateOBV(prices);
  if (obvData.length === 0) {
    return null;
  }

  const latestOBV = obvData[obvData.length - 1];
  const trend = interpretOBV(obvData, prices, lookback);

  return {
    value: latestOBV.value,
    trend,
  };
}

