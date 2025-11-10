/**
 * CCI (Commodity Channel Index) Indicator Service
 * 
 * The Commodity Channel Index (CCI) is a momentum-based oscillator used to help
 * determine when an investment vehicle is reaching a condition of being overbought
 * or oversold.
 * 
 * Formula:
 * 1. Typical Price (TP) = (High + Low + Close) / 3
 * 2. SMA of TP = Sum of TP over period / period
 * 3. Mean Deviation = Sum of |TP - SMA| over period / period
 * 4. CCI = (TP - SMA) / (0.015 × Mean Deviation)
 * 
 * The constant 0.015 ensures that approximately 70-80% of CCI values fall
 * between -100 and +100.
 * 
 * @module services/indicators/cci
 */

export interface OHLCPrice {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CCIData {
  time: number;
  cci: number;
}

export interface CCIInterpretation {
  signal: 'overbought' | 'oversold' | 'bullish' | 'bearish' | 'neutral';
  strength: 'extreme' | 'strong' | 'moderate' | 'weak';
  description: string;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
function calculateSMA(values: number[], period: number): number[] {
  if (values.length < period) {
    return [];
  }

  const sma: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
    sma.push(sum / period);
  }

  return sma;
}

/**
 * Calculate Mean Deviation
 * Mean Deviation = Sum of |TP - SMA| over period / period
 */
function calculateMeanDeviation(
  typicalPrices: number[],
  sma: number[],
  period: number
): number[] {
  if (typicalPrices.length < period || sma.length === 0) {
    return [];
  }

  const meanDeviations: number[] = [];
  
  for (let i = 0; i < sma.length; i++) {
    const startIdx = i; // SMA already accounts for the period offset
    const slice = typicalPrices.slice(startIdx, startIdx + period);
    const currentSMA = sma[i];
    
    const deviationSum = slice.reduce((acc, tp) => acc + Math.abs(tp - currentSMA), 0);
    meanDeviations.push(deviationSum / period);
  }

  return meanDeviations;
}

/**
 * Calculate CCI (Commodity Channel Index)
 * 
 * @param prices - Array of OHLC price data
 * @param period - Period for calculation (default: 20)
 * @returns Array of CCI data points
 * 
 * @example
 * ```typescript
 * const prices = [
 *   { time: 1, open: 100, high: 105, low: 95, close: 102 },
 *   { time: 2, open: 102, high: 108, low: 100, close: 106 },
 *   // ... more prices
 * ];
 * const cciData = calculateCCI(prices, 20);
 * ```
 */
export function calculateCCI(prices: OHLCPrice[], period: number = 20): CCIData[] {
  // Validation
  if (!prices || prices.length === 0) {
    return [];
  }

  if (period < 2) {
    throw new Error('CCI period must be at least 2');
  }

  if (prices.length < period) {
    return [];
  }

  // Step 1: Calculate Typical Price (TP) = (High + Low + Close) / 3
  const typicalPrices = prices.map(p => (p.high + p.low + p.close) / 3);

  // Step 2: Calculate SMA of Typical Price
  const sma = calculateSMA(typicalPrices, period);

  if (sma.length === 0) {
    return [];
  }

  // Step 3: Calculate Mean Deviation
  const meanDeviations = calculateMeanDeviation(typicalPrices, sma, period);

  if (meanDeviations.length === 0) {
    return [];
  }

  // Step 4: Calculate CCI
  const cciData: CCIData[] = [];
  const constant = 0.015;

  for (let i = 0; i < sma.length; i++) {
    const currentTPIndex = i + period - 1; // Align with original price array
    const currentTP = typicalPrices[currentTPIndex];
    const currentSMA = sma[i];
    const currentMD = meanDeviations[i];

    // Handle zero mean deviation (flat prices)
    let cci: number;
    if (currentMD === 0) {
      cci = 0; // Flat prices result in zero CCI
    } else {
      cci = (currentTP - currentSMA) / (constant * currentMD);
    }

    cciData.push({
      time: prices[currentTPIndex].time,
      cci: Number(cci.toFixed(2))
    });
  }

  return cciData;
}

/**
 * Interpret CCI value
 * 
 * Standard interpretation:
 * - Above +100: Overbought (potential reversal down)
 * - Above +200: Extremely overbought
 * - Below -100: Oversold (potential reversal up)
 * - Below -200: Extremely oversold
 * - Between -100 and +100: Neutral range
 * 
 * @param cciValue - CCI value to interpret
 * @returns Interpretation object with signal, strength, and description
 * 
 * @example
 * ```typescript
 * const interpretation = interpretCCI(150);
 * // { signal: 'overbought', strength: 'strong', description: '...' }
 * ```
 */
export function interpretCCI(cciValue: number): CCIInterpretation {
  if (!isFinite(cciValue)) {
    throw new Error('CCI value must be a finite number');
  }

  // Extreme levels (beyond ±200)
  if (cciValue > 200) {
    return {
      signal: 'overbought',
      strength: 'extreme',
      description: 'Extremely overbought - Strong bearish reversal potential'
    };
  }

  if (cciValue < -200) {
    return {
      signal: 'oversold',
      strength: 'extreme',
      description: 'Extremely oversold - Strong bullish reversal potential'
    };
  }

  // Strong levels (±100 to ±200)
  if (cciValue > 100) {
    return {
      signal: 'overbought',
      strength: 'strong',
      description: 'Overbought - Bearish reversal potential'
    };
  }

  if (cciValue < -100) {
    return {
      signal: 'oversold',
      strength: 'strong',
      description: 'Oversold - Bullish reversal potential'
    };
  }

  // Moderate levels (±50 to ±100)
  if (cciValue > 50) {
    return {
      signal: 'bullish',
      strength: 'moderate',
      description: 'Moderate bullish momentum'
    };
  }

  if (cciValue < -50) {
    return {
      signal: 'bearish',
      strength: 'moderate',
      description: 'Moderate bearish momentum'
    };
  }

  // Weak levels (within ±50)
  if (cciValue > 0) {
    return {
      signal: 'bullish',
      strength: 'weak',
      description: 'Weak bullish momentum'
    };
  }

  if (cciValue < 0) {
    return {
      signal: 'bearish',
      strength: 'weak',
      description: 'Weak bearish momentum'
    };
  }

  // Exactly zero
  return {
    signal: 'neutral',
    strength: 'weak',
    description: 'Neutral - No directional bias'
  };
}

/**
 * Get the latest CCI value
 * 
 * @param cciData - Array of CCI data
 * @returns Latest CCI data point or null if array is empty
 * 
 * @example
 * ```typescript
 * const latest = getLatestCCI(cciData);
 * if (latest) {
 *   console.log(`Latest CCI: ${latest.cci} at time ${latest.time}`);
 * }
 * ```
 */
export function getLatestCCI(cciData: CCIData[]): CCIData | null {
  if (!cciData || cciData.length === 0) {
    return null;
  }
  return cciData[cciData.length - 1];
}
