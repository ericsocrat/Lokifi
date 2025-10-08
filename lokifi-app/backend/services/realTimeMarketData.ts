/**
 * Real-time Market Data Service
 * 
 * Fetches live stock and crypto prices from multiple APIs with automatic fallback.
 * Uses API keys from api-keys.ts configuration.
 */

import { getNextProvider, FINNHUB, POLYGON, ALPHA_VANTAGE, COINGECKO, COINMARKETCAP } from '../config/api-keys';

export interface RealTimePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  high24h?: number;
  low24h?: number;
  lastUpdated: number;
}

/**
 * Fetch stock price from Finnhub
 */
async function fetchFromFinnhub(symbol: string, apiKey: string): Promise<RealTimePrice | null> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        FINNHUB.markKeyAsFailed(apiKey);
      }
      return null;
    }
    
    const data = await response.json();
    
    return {
      symbol,
      price: data.c, // current price
      change: data.d, // change
      changePercent: data.dp, // change percent
      high24h: data.h, // high
      low24h: data.l, // low
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error(`Finnhub error for ${symbol}:`, error);
    FINNHUB.markKeyAsFailed(apiKey);
    return null;
  }
}

/**
 * Fetch stock price from Polygon
 */
async function fetchFromPolygon(symbol: string, apiKey: string): Promise<RealTimePrice | null> {
  try {
    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        POLYGON.markKeyAsFailed(apiKey);
      }
      return null;
    }
    
    const data = await response.json();
    const result = data.results?.[0];
    
    if (!result) return null;
    
    return {
      symbol,
      price: result.c, // close price
      change: result.c - result.o, // close - open
      changePercent: ((result.c - result.o) / result.o) * 100,
      volume: result.v,
      high24h: result.h,
      low24h: result.l,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error(`Polygon error for ${symbol}:`, error);
    POLYGON.markKeyAsFailed(apiKey);
    return null;
  }
}

/**
 * Fetch stock price from Alpha Vantage
 */
async function fetchFromAlphaVantage(symbol: string, apiKey: string): Promise<RealTimePrice | null> {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        ALPHA_VANTAGE.markKeyAsFailed(apiKey);
      }
      return null;
    }
    
    const data = await response.json();
    const quote = data['Global Quote'];
    
    if (!quote || Object.keys(quote).length === 0) {
      ALPHA_VANTAGE.markKeyAsFailed(apiKey);
      return null;
    }
    
    return {
      symbol,
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']),
      high24h: parseFloat(quote['03. high']),
      low24h: parseFloat(quote['04. low']),
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error(`Alpha Vantage error for ${symbol}:`, error);
    ALPHA_VANTAGE.markKeyAsFailed(apiKey);
    return null;
  }
}

/**
 * Fetch crypto price from CoinGecko
 */
async function fetchFromCoinGecko(symbol: string, apiKey: string): Promise<RealTimePrice | null> {
  try {
    // Map symbol to CoinGecko ID
    const coinIds: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'DOT': 'polkadot',
      'MATIC': 'matic-network',
      'AVAX': 'avalanche-2',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'ATOM': 'cosmos',
      'LTC': 'litecoin',
      'NEAR': 'near',
    };
    
    const coinId = coinIds[symbol] || symbol.toLowerCase();
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,
      {
        headers: {
          'x-cg-demo-api-key': apiKey,
        },
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        COINGECKO.markKeyAsFailed(apiKey);
      }
      return null;
    }
    
    const data = await response.json();
    const marketData = data.market_data;
    
    return {
      symbol,
      price: marketData.current_price.usd,
      change: marketData.price_change_24h,
      changePercent: marketData.price_change_percentage_24h,
      volume: marketData.total_volume.usd,
      marketCap: marketData.market_cap.usd,
      high24h: marketData.high_24h.usd,
      low24h: marketData.low_24h.usd,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error(`CoinGecko error for ${symbol}:`, error);
    COINGECKO.markKeyAsFailed(apiKey);
    return null;
  }
}

/**
 * Fetch crypto price from CoinMarketCap
 */
async function fetchFromCoinMarketCap(symbol: string, apiKey: string): Promise<RealTimePrice | null> {
  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}&convert=USD`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        COINMARKETCAP.markKeyAsFailed(apiKey);
      }
      return null;
    }
    
    const data = await response.json();
    const quote = data.data[symbol]?.quote.USD;
    
    if (!quote) return null;
    
    return {
      symbol,
      price: quote.price,
      change: quote.price - quote.price / (1 + quote.percent_change_24h / 100),
      changePercent: quote.percent_change_24h,
      volume: quote.volume_24h,
      marketCap: quote.market_cap,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error(`CoinMarketCap error for ${symbol}:`, error);
    COINMARKETCAP.markKeyAsFailed(apiKey);
    return null;
  }
}

/**
 * Main function to fetch stock price with automatic fallback
 */
export async function getStockPrice(symbol: string): Promise<RealTimePrice | null> {
  // Try each provider in order until one succeeds
  const providers = [
    { name: 'Finnhub', fetch: fetchFromFinnhub },
    { name: 'Polygon', fetch: fetchFromPolygon },
    { name: 'Alpha Vantage', fetch: fetchFromAlphaVantage },
  ];
  
  for (const { name, fetch } of providers) {
    const providerData = getNextProvider('stocks');
    if (!providerData) continue;
    
    console.log(`Fetching ${symbol} from ${name}...`);
    const result = await fetch(symbol, providerData.key);
    
    if (result) {
      console.log(`✓ Got ${symbol} price from ${name}: $${result.price}`);
      return result;
    }
  }
  
  console.error(`Failed to fetch ${symbol} from all providers`);
  return null;
}

/**
 * Main function to fetch crypto price with automatic fallback
 */
export async function getCryptoPrice(symbol: string): Promise<RealTimePrice | null> {
  // Try each provider in order until one succeeds
  const providers = [
    { name: 'CoinGecko', fetch: fetchFromCoinGecko },
    { name: 'CoinMarketCap', fetch: fetchFromCoinMarketCap },
  ];
  
  for (const { name, fetch } of providers) {
    const providerData = getNextProvider('crypto');
    if (!providerData) continue;
    
    console.log(`Fetching ${symbol} from ${name}...`);
    const result = await fetch(symbol, providerData.key);
    
    if (result) {
      console.log(`✓ Got ${symbol} price from ${name}: $${result.price}`);
      return result;
    }
  }
  
  console.error(`Failed to fetch ${symbol} from all providers`);
  return null;
}

/**
 * Batch fetch multiple assets
 */
export async function batchFetchPrices(
  stocks: string[],
  cryptos: string[]
): Promise<Map<string, RealTimePrice>> {
  const results = new Map<string, RealTimePrice>();
  
  // Fetch stocks in parallel
  const stockPromises = stocks.map(async (symbol) => {
    const price = await getStockPrice(symbol);
    if (price) {
      results.set(symbol, price);
    }
  });
  
  // Fetch cryptos in parallel
  const cryptoPromises = cryptos.map(async (symbol) => {
    const price = await getCryptoPrice(symbol);
    if (price) {
      results.set(symbol, price);
    }
  });
  
  await Promise.all([...stockPromises, ...cryptoPromises]);
  
  return results;
}

/**
 * Cache for prices (5 minute TTL)
 */
const priceCache = new Map<string, { price: RealTimePrice; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get price with caching
 */
export async function getPriceWithCache(
  symbol: string,
  type: 'stock' | 'crypto'
): Promise<RealTimePrice | null> {
  // Check cache
  const cached = priceCache.get(symbol);
  if (cached && cached.expires > Date.now()) {
    console.log(`Using cached price for ${symbol}`);
    return cached.price;
  }
  
  // Fetch fresh data
  const price = type === 'stock' 
    ? await getStockPrice(symbol)
    : await getCryptoPrice(symbol);
  
  if (price) {
    priceCache.set(symbol, {
      price,
      expires: Date.now() + CACHE_TTL,
    });
  }
  
  return price;
}
