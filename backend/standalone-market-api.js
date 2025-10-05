/**
 * Standalone Market Data API Server
 * Fetches real-time prices from multiple APIs and serves them to the frontend
 * No database required - runs independently
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// API Keys (from your configuration)
const API_KEYS = {
  ALPHA_VANTAGE: 'GEE8WHZXGR81YWZU',
  FINNHUB: 'd38p06hr01qthpo0qskgd38p06hr01qthpo0qsl0',
  POLYGON: 'KZxHcYAR4KdqzHABXwbzqwBZnJg9X5J_',
  COINGECKO: 'CG-1HovQkCEWGKF1g4s8ajM2hVC',
  COINMARKETCAP: '522263a2-92bc-49f9-9dcc-9ad90e36e685',
};

// Price cache (30 minutes - matches frontend refresh rate)
const priceCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Fetch stock price from Finnhub
async function fetchStockFromFinnhub(symbol) {
  try {
    const response = await axios.get(`https://finnhub.io/api/v1/quote`, {
      params: {
        symbol: symbol.toUpperCase(),
        token: API_KEYS.FINNHUB
      }
    });
    
    if (response.data && response.data.c) {
      return {
        symbol,
        price: response.data.c,
        change: response.data.d || 0,
        changePercent: response.data.dp || 0,
        high24h: response.data.h || response.data.c,
        low24h: response.data.l || response.data.c,
        volume: response.data.v || 0,
        lastUpdated: Date.now(),
        source: 'Finnhub'
      };
    }
    return null;
  } catch (error) {
    console.error(`Finnhub error for ${symbol}:`, error.message);
    return null;
  }
}

// Fetch stock price from Alpha Vantage
async function fetchStockFromAlphaVantage(symbol) {
  try {
    const response = await axios.get(`https://www.alphavantage.co/query`, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol.toUpperCase(),
        apikey: API_KEYS.ALPHA_VANTAGE
      }
    });
    
    const quote = response.data['Global Quote'];
    if (quote && quote['05. price']) {
      return {
        symbol,
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change'] || 0),
        changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || 0),
        high24h: parseFloat(quote['03. high'] || quote['05. price']),
        low24h: parseFloat(quote['04. low'] || quote['05. price']),
        volume: parseInt(quote['06. volume'] || 0),
        lastUpdated: Date.now(),
        source: 'Alpha Vantage'
      };
    }
    return null;
  } catch (error) {
    console.error(`Alpha Vantage error for ${symbol}:`, error.message);
    return null;
  }
}

// Fetch crypto price from CoinGecko
async function fetchCryptoFromCoinGecko(symbol) {
  try {
    const coinMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'AVAX': 'avalanche-2',
      'DOGE': 'dogecoin',
      'DOT': 'polkadot',
      'MATIC': 'matic-network',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'LTC': 'litecoin',
      'ATOM': 'cosmos',
      'SHIB': 'shiba-inu',
    };
    
    const coinId = coinMap[symbol.toUpperCase()] || symbol.toLowerCase();
    
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: 'usd',
        include_24hr_change: 'true',
        include_24hr_vol: 'true',
        include_market_cap: 'true'
      },
      headers: {
        'x-cg-demo-api-key': API_KEYS.COINGECKO
      }
    });
    
    const data = response.data[coinId];
    if (data && data.usd) {
      return {
        symbol,
        price: data.usd,
        change: data.usd_24h_change || 0,
        changePercent: data.usd_24h_change || 0,
        volume: data.usd_24h_vol || 0,
        marketCap: data.usd_market_cap || 0,
        lastUpdated: Date.now(),
        source: 'CoinGecko'
      };
    }
    return null;
  } catch (error) {
    console.error(`CoinGecko error for ${symbol}:`, error.message);
    return null;
  }
}

// Get price with cache
async function getPriceWithCache(symbol, type) {
  const cacheKey = `${type}:${symbol}`;
  const cached = priceCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }
  
  let price = null;
  
  if (type === 'stock') {
    // Try Finnhub first, then Alpha Vantage
    price = await fetchStockFromFinnhub(symbol);
    if (!price) {
      price = await fetchStockFromAlphaVantage(symbol);
    }
  } else if (type === 'crypto') {
    price = await fetchCryptoFromCoinGecko(symbol);
  }
  
  if (price) {
    priceCache.set(cacheKey, { data: price, timestamp: Date.now() });
  }
  
  return price;
}

// Batch fetch endpoint
app.post('/api/market/batch', async (req, res) => {
  try {
    const { stocks = [], cryptos = [] } = req.body;
    console.log(`\n📊 Batch request: ${stocks.length} stocks, ${cryptos.length} cryptos`);
    
    const results = {};
    const promises = [];
    
    // Fetch all stocks
    for (const symbol of stocks) {
      promises.push(
        getPriceWithCache(symbol, 'stock')
          .then(price => {
            if (price) {
              results[symbol] = price;
              console.log(`✓ ${symbol}: $${price.price.toFixed(2)} (${price.source})`);
            }
          })
          .catch(err => console.error(`✗ ${symbol}:`, err.message))
      );
    }
    
    // Fetch all cryptos
    for (const symbol of cryptos) {
      promises.push(
        getPriceWithCache(symbol, 'crypto')
          .then(price => {
            if (price) {
              results[symbol] = price;
              console.log(`✓ ${symbol}: $${price.price.toFixed(2)} (${price.source})`);
            }
          })
          .catch(err => console.error(`✗ ${symbol}:`, err.message))
      );
    }
    
    await Promise.all(promises);
    
    res.json({
      success: true,
      count: Object.keys(results).length,
      data: results,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Batch fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Single stock endpoint
app.get('/api/market/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await getPriceWithCache(symbol.toUpperCase(), 'stock');
    
    if (price) {
      res.json(price);
    } else {
      res.status(404).json({ error: 'Stock not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Single crypto endpoint
app.get('/api/market/crypto/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await getPriceWithCache(symbol.toUpperCase(), 'crypto');
    
    if (price) {
      res.json(price);
    } else {
      res.status(404).json({ error: 'Cryptocurrency not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    cacheSize: priceCache.size,
    timestamp: Date.now()
  });
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🚀 Real-Time Market Data API Server     ║
║                                            ║
║   Status: ✅ RUNNING                       ║
║   Port: ${PORT}                               ║
║   URL: http://localhost:${PORT}               ║
║                                            ║
║   Endpoints:                               ║
║   POST /api/market/batch                   ║
║   GET  /api/market/stock/:symbol           ║
║   GET  /api/market/crypto/:symbol          ║
║   GET  /api/health                         ║
║                                            ║
║   Cache: 5 minutes                         ║
║   Update: Every 30 seconds (frontend)      ║
╚════════════════════════════════════════════╝
  `);
});
