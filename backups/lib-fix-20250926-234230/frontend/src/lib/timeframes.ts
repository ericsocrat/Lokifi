export const TF_PRESETS = ['1m','5m','15m','1h','4h','1d','1w'] as const
export type Timeframe = typeof TF_PRESETS[number] | string

export const SYMBOL_SUGGESTIONS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT',
  'AAPL','MSFT','NVDA','TSLA','AMZN','META','GOOGL','NFLX',
  'EURUSD','GBPUSD','USDJPY','XAUUSD'
]

export function normalizeTf(tf: string): string {
  const m = tf.trim().toLowerCase()
  // accept aliases like 60m -> 1h, 240 -> 4h, 1D -> 1d
  const mnum = m.match(/^(\d+)(m|h|d|w)?$/)
  if (mnum) {
    const n = parseInt(mnum[1],10)
    const unit = mnum[2]
    if (!unit) {
      if (n % 10080 === 0) return (n/10080)+'w'
      if (n % 1440 === 0) return (n/1440)+'d'
      if (n % 60 === 0) return (n/60)+'h'
      return n+'m'
    } else {
      return n + unit
    }
  }
  return m
}
