/**
 * Accumulation/Distribution Line (A/D Line) Indicator Service
 *
 * A/D Line is a volume-based momentum indicator that measures cumulative buying
 * and selling pressure by incorporating both price and volume. Unlike OBV which
 * only considers close-to-close changes, A/D Line uses the Close Location Value (CLV)
 * to determine where the close is relative to the high-low range.
 *
 * Algorithm:
 * 1. Calculate Money Flow Multiplier (CLV):
 *    CLV = ((Close - Low) - (High - Close)) / (High - Low)
 *    Range: -1 to +1 (-1 = close at low, +1 = close at high, 0 = middle)
 *
 * 2. Calculate Money Flow Volume:
 *    MFV = CLV × Volume
 *
 * 3. Accumulation/Distribution Line:
 *    AD = Previous AD + MFV
 *
 * Interpretation:
 * - Rising A/D Line: Bullish accumulation (buying pressure)
 * - Falling A/D Line: Bearish distribution (selling pressure)
 * - A/D divergence from price: Potential trend reversal signal
 * - Stronger signal than OBV due to price location weighting
 *
 * @see https://www.investopedia.com/terms/a/accumulationdistribution.asp
 */

export interface OHLCVPrice {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ADLineData {
  time: number;
  value: number;
}

export interface ADLineTrend {
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  divergence: 'bullish' | 'bearish' | 'none';
}

/**
 * Calculate Accumulation/Distribution Line (A/D Line)
 *
 * @param prices - Array of OHLCV price data (requires volume)
 * @returns Array of A/D Line data points
 *
 * @example
 * ```typescript
 * const prices = [
 *   { time: 1, open: 100, high: 105, low: 99, close: 103, volume: 1000 },
 *   { time: 2, open: 103, high: 108, low: 102, close: 106, volume: 1500 },
 *   { time: 3, open: 106, high: 107, low: 104, close: 104, volume: 800 }
 * ];
 *
 * const adLine = calculateADLine(prices);
 * // Result:
 * // [
 * //   { time: 1, value: 666.67 },     // CLV=0.667, MFV=666.67, AD=666.67
 * //   { time: 2, value: 1666.67 },    // CLV=0.667, MFV=1000, AD=1666.67
 * //   { time: 3, value: 1666.67 }     // CLV=0, MFV=0, AD=1666.67
 * // ]
 * ```
 */
export function calculateADLine(prices: OHLCVPrice[]): ADLineData[] {
  if (!prices || prices.length === 0) {
    return [];
  }

  const result: ADLineData[] = [];
  let adLine = 0;

  for (let i = 0; i < prices.length; i++) {
    const current = prices[i];

    // Validate required fields
    if (current.volume === undefined || current.volume === null) {
      throw new Error('Volume data is required for A/D Line calculation');
    }
    if (current.high === undefined || current.low === undefined || current.close === undefined) {
      throw new Error('High, Low, and Close prices are required for A/D Line calculation');
    }

    // Calculate Close Location Value (CLV)
    const highLowRange = current.high - current.low;

    let clv = 0;
    if (highLowRange === 0) {
      // If high === low (flat price bar), CLV = 0 (neutral)
      clv = 0;
    } else {
      // CLV = ((Close - Low) - (High - Close)) / (High - Low)
      // Simplified: CLV = (2 × Close - Low - High) / (High - Low)
      clv = (current.close - current.low - (current.high - current.close)) / highLowRange;
    }

    // Calculate Money Flow Volume
    const moneyFlowVolume = clv * current.volume;

    // Accumulate A/D Line
    adLine += moneyFlowVolume;

    result.push({
      time: current.time,
      value: adLine,
    });
  }

  return result;
}

/**
 * Interpret A/D Line trend and divergence
 *
 * @param adLineData - Array of A/D Line data points
 * @param prices - Array of OHLCV price data for divergence analysis
 * @param lookback - Number of periods to analyze for trend (default: 10)
 * @returns A/D Line trend interpretation
 *
 * @example
 * ```typescript
 * const trend = interpretADLine(adLineData, prices, 10);
 * // Result: { direction: 'bullish', strength: 'strong', divergence: 'none' }
 * ```
 */
export function interpretADLine(
  adLineData: ADLineData[],
  prices: OHLCVPrice[],
  lookback: number = 10
): ADLineTrend {
  if (!adLineData || adLineData.length < lookback || !prices || prices.length < lookback) {
    return { direction: 'neutral', strength: 'weak', divergence: 'none' };
  }

  // Analyze A/D Line trend over lookback period
  const recentAD = adLineData.slice(-lookback);
  const recentPrices = prices.slice(-lookback);

  const firstAD = recentAD[0].value;
  const lastAD = recentAD[recentAD.length - 1].value;
  const adChange = lastAD - firstAD;

  // Calculate average volume for normalization (same as OBV pattern)
  const avgVolume = recentPrices.reduce((sum, p) => sum + p.volume, 0) / recentPrices.length;
  const normalizedADChange = Math.abs(adChange / avgVolume);

  // Determine A/D Line direction
  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (adChange > 0) {
    direction = 'bullish'; // Rising A/D (accumulation)
  } else if (adChange < 0) {
    direction = 'bearish'; // Falling A/D (distribution)
  }

  // Determine trend strength based on normalized change (relative to average volume)
  let strength: 'strong' | 'moderate' | 'weak' = 'weak';
  if (normalizedADChange > 3.0) {
    strength = 'strong'; // >3x average volume change (strong accumulation/distribution)
  } else if (normalizedADChange > 1.0) {
    strength = 'moderate'; // 1-3x average volume change (moderate accumulation/distribution)
  }
  // normalizedADChange <= 1.0: weak trend

  // Detect divergence between A/D Line and price
  const firstPrice = recentPrices[0].close;
  const lastPrice = recentPrices[recentPrices.length - 1].close;
  const priceChange = lastPrice - firstPrice;

  let divergence: 'bullish' | 'bearish' | 'none' = 'none';

  // Bullish divergence: Price falling, A/D Line rising (buyers accumulating despite price drop)
  if (priceChange < 0 && adChange > 0 && normalizedADChange > 1.0) {
    divergence = 'bullish';
  }

  // Bearish divergence: Price rising, A/D Line falling (sellers distributing despite price rise)
  if (priceChange > 0 && adChange < 0 && normalizedADChange > 1.0) {
    divergence = 'bearish';
  }

  return {
    direction,
    strength,
    divergence,
  };
}

/**
 * Get the latest A/D Line value and interpretation
 *
 * @param prices - Array of OHLCV price data
 * @param lookback - Number of periods for trend analysis (default: 10)
 * @returns Latest A/D Line value and trend interpretation, or null if insufficient data
 *
 * @example
 * ```typescript
 * const latest = getLatestADLine(prices, 10);
 * // Result: { value: 15000, trend: { direction: 'bullish', strength: 'strong', divergence: 'none' } }
 * ```
 */
export function getLatestADLine(
  prices: OHLCVPrice[],
  lookback: number = 10
): { value: number; trend: ADLineTrend } | null {
  if (!prices || prices.length === 0) {
    return null;
  }

  const adLineData = calculateADLine(prices);

  if (adLineData.length === 0) {
    return null;
  }

  const latestValue = adLineData[adLineData.length - 1].value;
  const trend = interpretADLine(adLineData, prices, lookback);

  return {
    value: latestValue,
    trend,
  };
}

