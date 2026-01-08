/**
 * RSI (Relative Strength Index) Indicator
 *
 * The RSI is a momentum oscillator that measures the speed and magnitude of price changes.
 * It oscillates between 0 and 100, with readings above 70 indicating overbought conditions
 * and readings below 30 indicating oversold conditions.
 *
 * Formula:
 * 1. Calculate price changes (deltas between consecutive prices)
 * 2. Separate gains (positive changes) and losses (absolute value of negative changes)
 * 3. Calculate average gain and average loss over the period
 * 4. RS (Relative Strength) = Average Gain / Average Loss
 * 5. RSI = 100 - (100 / (1 + RS))
 *
 * @param prices - Array of closing prices
 * @param period - Number of periods for RSI calculation (default: 14)
 * @returns Array of RSI values (null for insufficient data points)
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  // Validate inputs
  if (!Array.isArray(prices) || prices.length === 0) {
    return [];
  }

  if (period <= 0 || !Number.isFinite(period)) {
    throw new Error('Period must be a positive finite number');
  }

  if (prices.length < period + 1) {
    // Not enough data points - return nulls
    return Array(prices.length).fill(null);
  }

  const result: (number | null)[] = [];

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Initialize with nulls for insufficient data
  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  // Calculate initial average gain and loss
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Calculate first RSI value
  // Special case: If avgLoss is 0 (no losses), RSI = 100
  const firstRS = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  const firstRSI = avgLoss === 0 ? 100 : 100 - 100 / (1 + firstRS);
  result.push(firstRSI);

  // Calculate subsequent RSI values using smoothed averages
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    // Smoothed moving average (Wilder's smoothing)
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    // Special case: If avgLoss is 0 (no losses), RSI = 100
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

    result.push(rsi);
  }

  return result;
}

/**
 * Get RSI interpretation for a given value
 *
 * @param rsi - RSI value
 * @returns Interpretation string
 */
export function interpretRSI(rsi: number | null): string {
  if (rsi === null) {
    return 'Insufficient data';
  }

  if (rsi >= 70) {
    return 'Overbought';
  } else if (rsi <= 30) {
    return 'Oversold';
  } else {
    return 'Neutral';
  }
}

/**
 * Calculate RSI for the last N periods of price data
 * Useful for real-time updates
 *
 * @param prices - Array of closing prices
 * @param period - Number of periods for RSI calculation
 * @returns Latest RSI value or null
 */
export function getLatestRSI(prices: number[], period: number = 14): number | null {
  const rsiValues = calculateRSI(prices, period);
  return rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
}

