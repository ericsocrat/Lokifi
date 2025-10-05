/**
 * API Keys Configuration
 * 
 * Master configuration for all external API services.
 * Supports automatic fallback when rate limits are exceeded.
 */

export interface APIKeyConfig {
  key: string;
  isActive: boolean;
  requestCount: number;
  lastReset: number;
  rateLimit: number; // requests per day
  errorCount: number;
}

export interface APIProvider {
  name: string;
  keys: APIKeyConfig[];
  getCurrentKey: () => APIKeyConfig | null;
  markKeyAsFailed: (key: string) => void;
  resetKey: (key: string) => void;
}

/**
 * Alpha Vantage - Stock Market Data
 * Free tier: 25 requests/day
 * Premium: More requests
 */
export const ALPHA_VANTAGE: APIProvider = {
  name: 'Alpha Vantage',
  keys: [
    {
      key: 'D8RDSS583XDQ1DIA',
      isActive: true,
      requestCount: 0,
      lastReset: Date.now(),
      rateLimit: 25, // Free tier
      errorCount: 0,
    },
  ],
  getCurrentKey: function() {
    return this.keys.find(k => k.isActive && k.requestCount < k.rateLimit) || null;
  },
  markKeyAsFailed: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.errorCount++;
      if (config.errorCount >= 3) {
        config.isActive = false;
        console.warn(`Alpha Vantage key ${key.substring(0, 8)}... deactivated after 3 errors`);
      }
    }
  },
  resetKey: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.requestCount = 0;
      config.errorCount = 0;
      config.isActive = true;
      config.lastReset = Date.now();
    }
  },
};

/**
 * Finnhub - Real-time Stock & Crypto Data
 * Free tier: 60 calls/minute
 */
export const FINNHUB: APIProvider = {
  name: 'Finnhub',
  keys: [
    {
      key: 'd38p06hr01qthpo0qskgd38p06hr01qthpo0qsl0',
      isActive: true,
      requestCount: 0,
      lastReset: Date.now(),
      rateLimit: 3600, // 60 per minute = 3600 per hour
      errorCount: 0,
    },
  ],
  getCurrentKey: function() {
    return this.keys.find(k => k.isActive && k.requestCount < k.rateLimit) || null;
  },
  markKeyAsFailed: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.errorCount++;
      if (config.errorCount >= 3) {
        config.isActive = false;
        console.warn(`Finnhub key ${key.substring(0, 8)}... deactivated after 3 errors`);
      }
    }
  },
  resetKey: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.requestCount = 0;
      config.errorCount = 0;
      config.isActive = true;
      config.lastReset = Date.now();
    }
  },
};

/**
 * Polygon.io - Stock Market Data
 * Free tier: 5 calls/minute
 */
export const POLYGON: APIProvider = {
  name: 'Polygon',
  keys: [
    {
      key: 'UIBpOYOq5cbWTVpkurVX0R__ZIP4hG4H',
      isActive: true,
      requestCount: 0,
      lastReset: Date.now(),
      rateLimit: 300, // 5 per minute = 300 per hour
      errorCount: 0,
    },
  ],
  getCurrentKey: function() {
    return this.keys.find(k => k.isActive && k.requestCount < k.rateLimit) || null;
  },
  markKeyAsFailed: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.errorCount++;
      if (config.errorCount >= 3) {
        config.isActive = false;
        console.warn(`Polygon key ${key.substring(0, 8)}... deactivated after 3 errors`);
      }
    }
  },
  resetKey: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.requestCount = 0;
      config.errorCount = 0;
      config.isActive = true;
      config.lastReset = Date.now();
    }
  },
};

/**
 * CoinGecko - Cryptocurrency Data
 * Free tier: 10-50 calls/minute (demo key)
 * Pro: 500 calls/minute
 */
export const COINGECKO: APIProvider = {
  name: 'CoinGecko',
  keys: [
    {
      key: 'CG-1HovQkCEWGKF1g4s8ajM2hVC',
      isActive: true,
      requestCount: 0,
      lastReset: Date.now(),
      rateLimit: 3000, // 50 per minute = 3000 per hour (demo key)
      errorCount: 0,
    },
  ],
  getCurrentKey: function() {
    return this.keys.find(k => k.isActive && k.requestCount < k.rateLimit) || null;
  },
  markKeyAsFailed: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.errorCount++;
      if (config.errorCount >= 3) {
        config.isActive = false;
        console.warn(`CoinGecko key ${key.substring(0, 8)}... deactivated after 3 errors`);
      }
    }
  },
  resetKey: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.requestCount = 0;
      config.errorCount = 0;
      config.isActive = true;
      config.lastReset = Date.now();
    }
  },
};

/**
 * CoinMarketCap - Cryptocurrency Market Data
 * Free tier: 333 calls/day (10k/month)
 */
export const COINMARKETCAP: APIProvider = {
  name: 'CoinMarketCap',
  keys: [
    {
      key: '32c402b6-ea50-4ff8-8afc-3be24f19db59',
      isActive: true,
      requestCount: 0,
      lastReset: Date.now(),
      rateLimit: 333, // ~333 per day
      errorCount: 0,
    },
  ],
  getCurrentKey: function() {
    return this.keys.find(k => k.isActive && k.requestCount < k.rateLimit) || null;
  },
  markKeyAsFailed: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.errorCount++;
      if (config.errorCount >= 3) {
        config.isActive = false;
        console.warn(`CoinMarketCap key ${key.substring(0, 8)}... deactivated after 3 errors`);
      }
    }
  },
  resetKey: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.requestCount = 0;
      config.errorCount = 0;
      config.isActive = true;
      config.lastReset = Date.now();
    }
  },
};

/**
 * NewsAPI - News Articles
 * Free tier: 100 requests/day
 */
export const NEWS_API: APIProvider = {
  name: 'NewsAPI',
  keys: [
    {
      key: '710fce1f382a48d1bafd2cf8ce6620b8',
      isActive: true,
      requestCount: 0,
      lastReset: Date.now(),
      rateLimit: 100,
      errorCount: 0,
    },
  ],
  getCurrentKey: function() {
    return this.keys.find(k => k.isActive && k.requestCount < k.rateLimit) || null;
  },
  markKeyAsFailed: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.errorCount++;
      if (config.errorCount >= 3) {
        config.isActive = false;
        console.warn(`NewsAPI key ${key.substring(0, 8)}... deactivated after 3 errors`);
      }
    }
  },
  resetKey: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.requestCount = 0;
      config.errorCount = 0;
      config.isActive = true;
      config.lastReset = Date.now();
    }
  },
};

/**
 * Marketaux - Financial News
 * Free tier: 100 requests/day
 */
export const MARKETAUX: APIProvider = {
  name: 'Marketaux',
  keys: [
    {
      key: 'QSgwZamjUvYwXRHWePggLioR7EjSUeMLKuTSf1Yg',
      isActive: true,
      requestCount: 0,
      lastReset: Date.now(),
      rateLimit: 100,
      errorCount: 0,
    },
  ],
  getCurrentKey: function() {
    return this.keys.find(k => k.isActive && k.requestCount < k.rateLimit) || null;
  },
  markKeyAsFailed: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.errorCount++;
      if (config.errorCount >= 3) {
        config.isActive = false;
        console.warn(`Marketaux key ${key.substring(0, 8)}... deactivated after 3 errors`);
      }
    }
  },
  resetKey: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.requestCount = 0;
      config.errorCount = 0;
      config.isActive = true;
      config.lastReset = Date.now();
    }
  },
};

/**
 * Financial Modeling Prep - Stock Fundamentals
 * Free tier: 250 requests/day
 */
export const FMP: APIProvider = {
  name: 'Financial Modeling Prep',
  keys: [
    {
      key: 'I7bC0nt4WALTRLIzdYMpDzuAKRwfKotL',
      isActive: true,
      requestCount: 0,
      lastReset: Date.now(),
      rateLimit: 250,
      errorCount: 0,
    },
  ],
  getCurrentKey: function() {
    return this.keys.find(k => k.isActive && k.requestCount < k.rateLimit) || null;
  },
  markKeyAsFailed: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.errorCount++;
      if (config.errorCount >= 3) {
        config.isActive = false;
        console.warn(`FMP key ${key.substring(0, 8)}... deactivated after 3 errors`);
      }
    }
  },
  resetKey: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.requestCount = 0;
      config.errorCount = 0;
      config.isActive = true;
      config.lastReset = Date.now();
    }
  },
};

/**
 * Hugging Face - AI/ML Models
 * Free tier: Rate limited but generous
 */
export const HUGGING_FACE: APIProvider = {
  name: 'Hugging Face',
  keys: [
    {
      key: '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',
      isActive: true,
      requestCount: 0,
      lastReset: Date.now(),
      rateLimit: 1000, // Generous limit
      errorCount: 0,
    },
  ],
  getCurrentKey: function() {
    return this.keys.find(k => k.isActive && k.requestCount < k.rateLimit) || null;
  },
  markKeyAsFailed: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.errorCount++;
      if (config.errorCount >= 3) {
        config.isActive = false;
        console.warn(`Hugging Face key ${key.substring(0, 8)}... deactivated after 3 errors`);
      }
    }
  },
  resetKey: function(key: string) {
    const config = this.keys.find(k => k.key === key);
    if (config) {
      config.requestCount = 0;
      config.errorCount = 0;
      config.isActive = true;
      config.lastReset = Date.now();
    }
  },
};

/**
 * All providers in priority order
 */
export const API_PROVIDERS = {
  // Stock Data (in order of preference)
  stocks: [FINNHUB, POLYGON, ALPHA_VANTAGE, FMP],
  
  // Crypto Data (in order of preference)
  crypto: [COINGECKO, COINMARKETCAP],
  
  // News Data
  news: [NEWS_API, MARKETAUX],
  
  // AI/ML
  ai: [HUGGING_FACE],
};

/**
 * Reset all counters daily
 */
setInterval(() => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  Object.values(API_PROVIDERS).flat().forEach(provider => {
    if (Array.isArray(provider)) {
      provider.forEach(p => {
        p.keys.forEach(k => {
          if (k.lastReset < oneDayAgo) {
            p.resetKey(k.key);
            console.log(`Reset ${p.name} key ${k.key.substring(0, 8)}...`);
          }
        });
      });
    } else {
      provider.keys.forEach(k => {
        if (k.lastReset < oneDayAgo) {
          provider.resetKey(k.key);
          console.log(`Reset ${provider.name} key ${k.key.substring(0, 8)}...`);
        }
      });
    }
  });
}, 60 * 60 * 1000); // Check every hour

/**
 * Helper function to get next available provider with key
 */
export function getNextProvider(type: 'stocks' | 'crypto' | 'news' | 'ai'): { provider: APIProvider; key: string } | null {
  const providers = API_PROVIDERS[type];
  
  for (const provider of providers) {
    const keyConfig = provider.getCurrentKey();
    if (keyConfig) {
      // Increment request count
      keyConfig.requestCount++;
      return { provider, key: keyConfig.key };
    }
  }
  
  console.error(`No available ${type} API keys! All limits exceeded.`);
  return null;
}

/**
 * Track API usage statistics
 */
export function getAPIStats() {
  const stats: any = {};
  
  Object.entries(API_PROVIDERS).forEach(([type, providers]) => {
    stats[type] = providers.map(provider => ({
      name: provider.name,
      keys: provider.keys.map(k => ({
        key: k.key.substring(0, 8) + '...',
        isActive: k.isActive,
        requestCount: k.requestCount,
        rateLimit: k.rateLimit,
        utilization: ((k.requestCount / k.rateLimit) * 100).toFixed(1) + '%',
        errorCount: k.errorCount,
      })),
    }));
  });
  
  return stats;
}

/**
 * Export for frontend (without exposing actual keys)
 */
export function getPublicAPIStatus() {
  const status: any = {};
  
  Object.entries(API_PROVIDERS).forEach(([type, providers]) => {
    status[type] = providers.map(provider => ({
      name: provider.name,
      available: provider.keys.some(k => k.isActive && k.requestCount < k.rateLimit),
      totalKeys: provider.keys.length,
      activeKeys: provider.keys.filter(k => k.isActive).length,
    }));
  });
  
  return status;
}
