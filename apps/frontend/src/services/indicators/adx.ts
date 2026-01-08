/**
 * ADX (Average Directional Index) Indicator
 *
 * The ADX measures trend strength on a scale of 0-100, regardless of trend direction.
 * It's calculated from the +DI and -DI (directional indicators) using smoothed moving averages.
 *
 * Key levels:
 * - ADX < 20: Weak or no trend (range-bound market)
 * - ADX 20-25: Emerging trend
 * - ADX 25-50: Strong trend
 * - ADX > 50: Very strong trend
 * - ADX > 75: Extremely strong trend (rare)
 *
 * Algorithm:
 * 1. Calculate True Range (TR) = max(high - low, |high - prevClose|, |low - prevClose|)
 * 2. Calculate +DM (Directional Movement) = high - prevHigh (if > 0 and > low - prevLow, else 0)
 * 3. Calculate -DM = prevLow - low (if > 0 and > high - prevHigh, else 0)
 * 4. Smooth TR, +DM, -DM using Wilder's smoothing
 * 5. Calculate +DI = (+DM / TR) × 100
 * 6. Calculate -DI = (-DM / TR) × 100
 * 7. Calculate DX = (|+DI - -DI| / (+DI + -DI)) × 100
 * 8. Calculate ADX = smoothed average of DX
 *
 * @module adx
 */

/**
 * OHLC price data interface
 */
export interface OHLCPrice {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * ADX calculation result
 */
export interface ADXData {
  time: number;
  adx: number;
  plusDI: number;
  minusDI: number;
}

/**
 * ADX interpretation result
 */
export interface ADXInterpretation {
  strength: 'very-weak' | 'weak' | 'emerging' | 'strong' | 'very-strong' | 'extreme';
  signal: 'range-bound' | 'trending' | 'strong-trend';
  description: string;
}

/**
 * Calculate True Range
 *
 * TR = max(high - low, |high - prevClose|, |low - prevClose|)
 *
 * @param high - Current high price
 * @param low - Current low price
 * @param prevClose - Previous close price
 * @returns True Range value
 */
function calculateTrueRange(high: number, low: number, prevClose: number): number {
  const range1 = high - low;
  const range2 = Math.abs(high - prevClose);
  const range3 = Math.abs(low - prevClose);

  return Math.max(range1, range2, range3);
}

/**
 * Calculate Directional Movements
 *
 * +DM = high - prevHigh (if > 0 and > -DM, else 0)
 * -DM = prevLow - low (if > 0 and > +DM, else 0)
 *
 * @param high - Current high price
 * @param low - Current low price
 * @param prevHigh - Previous high price
 * @param prevLow - Previous low price
 * @returns Object with plusDM and minusDM values
 */
function calculateDirectionalMovement(
  high: number,
  low: number,
  prevHigh: number,
  prevLow: number
): { plusDM: number; minusDM: number } {
  const upMove = high - prevHigh;
  const downMove = prevLow - low;

  let plusDM = 0;
  let minusDM = 0;

  if (upMove > downMove && upMove > 0) {
    plusDM = upMove;
  }

  if (downMove > upMove && downMove > 0) {
    minusDM = downMove;
  }

  return { plusDM, minusDM };
}

/**
 * Calculate smoothed value using Wilder's smoothing method
 *
 * Smoothed = (prevSmoothed × (period - 1) + current) / period
 *
 * @param prevSmoothed - Previous smoothed value
 * @param current - Current value to smooth
 * @param period - Smoothing period
 * @returns Smoothed value
 */
function wilderSmoothing(prevSmoothed: number, current: number, period: number): number {
  return (prevSmoothed * (period - 1) + current) / period;
}

/**
 * Calculate ADX (Average Directional Index)
 *
 * The ADX measures trend strength from 0-100. It uses smoothed directional indicators
 * (+DI and -DI) to calculate directional movement (DX), which is then smoothed to produce ADX.
 *
 * The ADX is a lagging indicator that doesn't show trend direction, only strength.
 * Use +DI and -DI to determine trend direction:
 * - +DI > -DI = Uptrend
 * - -DI > +DI = Downtrend
 *
 * @param prices - Array of OHLC price data
 * @param period - ADX calculation period (default: 14)
 * @returns Array of ADX data points
 *
 * @example
 * ```typescript
 * const prices = [
 *   { time: 1, open: 100, high: 105, low: 99, close: 103 },
 *   { time: 2, open: 103, high: 108, low: 102, close: 106 },
 *   // ... more prices
 * ];
 *
 * const adxData = calculateADX(prices, 14);
 * // Returns: [{ time: n, adx: 25.5, plusDI: 30.2, minusDI: 15.8 }, ...]
 * ```
 */
export function calculateADX(prices: OHLCPrice[], period = 14): ADXData[] {
  // Validate inputs
  if (prices.length === 0) {
    return [];
  }

  if (period < 2) {
    throw new Error('ADX period must be at least 2');
  }

  // Need at least period + 1 prices to calculate initial smoothed values
  // Plus additional period prices to smooth DX into ADX
  const minLength = period * 2;
  if (prices.length < minLength) {
    return [];
  }

  const result: ADXData[] = [];
  const trValues: number[] = [];
  const plusDMValues: number[] = [];
  const minusDMValues: number[] = [];
  const dxValues: number[] = [];

  // Calculate TR, +DM, -DM for all prices
  for (let i = 1; i < prices.length; i++) {
    const current = prices[i];
    const prev = prices[i - 1];

    const tr = calculateTrueRange(current.high, current.low, prev.close);
    const { plusDM, minusDM } = calculateDirectionalMovement(
      current.high,
      current.low,
      prev.high,
      prev.low
    );

    trValues.push(tr);
    plusDMValues.push(plusDM);
    minusDMValues.push(minusDM);
  }

  // Calculate initial smoothed TR, +DM, -DM (first 'period' values)
  let smoothedTR = trValues.slice(0, period).reduce((sum, val) => sum + val, 0);
  let smoothedPlusDM = plusDMValues.slice(0, period).reduce((sum, val) => sum + val, 0);
  let smoothedMinusDM = minusDMValues.slice(0, period).reduce((sum, val) => sum + val, 0);

  // Calculate +DI, -DI, DX for initial period
  const plusDI = smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
  const minusDI = smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
  const diSum = plusDI + minusDI;
  const dx = diSum !== 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;

  dxValues.push(dx);

  // Continue smoothing TR, +DM, -DM and calculating DX
  for (let i = period; i < trValues.length; i++) {
    smoothedTR = wilderSmoothing(smoothedTR, trValues[i], period);
    smoothedPlusDM = wilderSmoothing(smoothedPlusDM, plusDMValues[i], period);
    smoothedMinusDM = wilderSmoothing(smoothedMinusDM, minusDMValues[i], period);

    const currentPlusDI = smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const currentMinusDI = smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
    const currentDISum = currentPlusDI + currentMinusDI;
    const currentDX =
      currentDISum !== 0 ? (Math.abs(currentPlusDI - currentMinusDI) / currentDISum) * 100 : 0;

    dxValues.push(currentDX);
  }

  // Calculate initial ADX (average of first 'period' DX values)
  let adx = dxValues.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  // Store first ADX value
  const firstADXIndex = period * 2 - 1; // Adjusted for TR/DM starting at index 1
  if (firstADXIndex < prices.length) {
    // Recalculate +DI and -DI at this point for output
    const outputPlusDI = smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const outputMinusDI = smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;

    result.push({
      time: prices[firstADXIndex].time,
      adx,
      plusDI: outputPlusDI,
      minusDI: outputMinusDI,
    });
  }

  // Continue calculating ADX using Wilder's smoothing
  for (let i = period; i < dxValues.length; i++) {
    adx = wilderSmoothing(adx, dxValues[i], period);

    // Recalculate current +DI and -DI for this index
    // We need to track smoothed values through the loop
    const priceIndex = i + 1; // Offset by 1 since TR/DM start at index 1
    if (priceIndex < prices.length) {
      result.push({
        time: prices[priceIndex].time,
        adx,
        plusDI: smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0,
        minusDI: smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0,
      });
    }
  }

  return result;
}

/**
 * Interpret ADX values for trend strength
 *
 * Provides human-readable interpretation of ADX values:
 * - < 20: Very weak or no trend (range-bound market)
 * - 20-25: Weak trend emerging
 * - 25-50: Strong trend
 * - 50-75: Very strong trend
 * - > 75: Extremely strong trend (rare)
 *
 * @param adxValue - ADX value to interpret (0-100)
 * @returns Interpretation object with strength, signal, and description
 *
 * @example
 * ```typescript
 * const interpretation = interpretADX(35);
 * // Returns: {
 * //   strength: 'strong',
 * //   signal: 'strong-trend',
 * //   description: 'Strong trend detected (ADX: 35.0)'
 * // }
 * ```
 */
export function interpretADX(adxValue: number): ADXInterpretation {
  if (adxValue < 0 || adxValue > 100) {
    throw new Error('ADX value must be between 0 and 100');
  }

  let strength: ADXInterpretation['strength'];
  let signal: ADXInterpretation['signal'];
  let description: string;

  if (adxValue < 20) {
    strength = 'very-weak';
    signal = 'range-bound';
    description = `Very weak or no trend - range-bound market (ADX: ${adxValue.toFixed(1)})`;
  } else if (adxValue < 25) {
    strength = 'weak';
    signal = 'trending';
    description = `Weak trend emerging (ADX: ${adxValue.toFixed(1)})`;
  } else if (adxValue < 50) {
    strength = 'strong';
    signal = 'strong-trend';
    description = `Strong trend detected (ADX: ${adxValue.toFixed(1)})`;
  } else if (adxValue < 75) {
    strength = 'very-strong';
    signal = 'strong-trend';
    description = `Very strong trend (ADX: ${adxValue.toFixed(1)})`;
  } else {
    strength = 'extreme';
    signal = 'strong-trend';
    description = `Extremely strong trend - rare occurrence (ADX: ${adxValue.toFixed(1)})`;
  }

  return { strength, signal, description };
}

/**
 * Get the latest ADX value from a dataset
 *
 * @param adxData - Array of ADX data points
 * @returns Latest ADX data point or undefined if array is empty
 *
 * @example
 * ```typescript
 * const latest = getLatestADX(adxData);
 * if (latest) {
 *   console.log(`Current ADX: ${latest.adx}`);
 *   console.log(`+DI: ${latest.plusDI}, -DI: ${latest.minusDI}`);
 * }
 * ```
 */
export function getLatestADX(adxData: ADXData[]): ADXData | undefined {
  if (adxData.length === 0) {
    return undefined;
  }

  return adxData[adxData.length - 1];
}

