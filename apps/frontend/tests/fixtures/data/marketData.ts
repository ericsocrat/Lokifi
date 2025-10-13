/**
 * Mock market data for symbol price testing
 */
export const mockMarketData = {
  BTC: {
    symbol: 'BTC',
    price: 45000,
    change24h: 5.2,
    volume: 1000000,
    high24h: 46000,
    low24h: 43500,
  },
  ETH: {
    symbol: 'ETH',
    price: 2500,
    change24h: -2.1,
    volume: 500000,
    high24h: 2600,
    low24h: 2450,
  },
  SOL: {
    symbol: 'SOL',
    price: 100,
    change24h: 8.5,
    volume: 200000,
    high24h: 105,
    low24h: 95,
  },
};

/**
 * Mock ticker update (WebSocket message)
 */
export const mockTickerUpdate = {
  symbol: 'BTC',
  price: 45100,
  timestamp: Date.now(),
  volume: 150,
};

/**
 * Mock order book data
 */
export const mockOrderBook = {
  symbol: 'BTC',
  bids: [
    [44900, 0.5],
    [44850, 1.2],
    [44800, 2.0],
  ],
  asks: [
    [45000, 0.8],
    [45050, 1.5],
    [45100, 2.5],
  ],
  timestamp: Date.now(),
};
