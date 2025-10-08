#!/usr/bin/env node
/**
 * Universal Asset Fetcher - Replaces 19 Individual Fetch Scripts
 * 
 * Consolidates all asset data fetching into one intelligent script:
 * ✓ Cryptocurrencies (CoinGecko API)
 * ✓ US Stocks (Financial Modeling Prep)
 * ✓ International Markets
 * ✓ Commodities & Indexes
 * ✓ Smart caching & rate limiting
 * ✓ Progress tracking & error handling
 * 
 * REPLACES THESE 19 SCRIPTS:
 * ✗ fetch-all-assets.js (296 lines)
 * ✗ fetch-top-cryptos.js
 * ✗ fetch-sp500.js
 * ✗ fetch-smallcap.js + fetch-smallcap-new.js
 * ✗ fetch-russell-midcap.js
 * ✗ fetch-phase2.js + fetch-phase2b.js + fetch-phase2c.js
 * ✗ fetch-midcap-stocks.js
 * ✗ fetch-largecap.js
 * ✗ fetch-international.js + fetch-international-new.js
 * ✗ fetch-indexes.js
 * ✗ fetch-final-50.js
 * ✗ fetch-commodities.js
 * ✗ fetch-quick.js
 * ✗ merge-all.js
 * ✗ generate-code.js
 * 
 * Usage:
 *   node universal-fetcher.js --all                    # Fetch everything
 *   node universal-fetcher.js --crypto --limit 500     # Top 500 cryptos
 *   node universal-fetcher.js --stocks --market us     # US stocks only
 *   node universal-fetcher.js --update                 # Update existing data
 * 
 * @version 2.0.0
 * @created October 8, 2025
 * @consolidates 19 scripts → 1 universal tool
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { Command } = require('commander');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    apis: {
        coingecko: {
            base: 'https://api.coingecko.com/api/v3',
            rateLimit: 10, // requests per minute (free tier)
            delay: 6000    // 6 seconds between requests
        },
        fmp: {
            base: 'https://financialmodelingprep.com/api/v3',
            key: 'I7bC0nt4WALTRLIzdYMpDzuAKRwfKotL',
            rateLimit: 250, // requests per day (free tier)  
            delay: 1000     // 1 second between requests
        }
    },
    limits: {
        crypto: 1000,
        stocks: 2000,
        international: 500,
        commodities: 100
    },
    output: {
        directory: './data',
        combined: 'all-assets.json',
        individual: true,
        format: 'json'
    },
    cache: {
        enabled: true,
        ttl: 3600000 // 1 hour in milliseconds
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
class Logger {
    static info(message) {
        console.log(`ℹ️  ${message}`);
    }
    
    static success(message) {
        console.log(`✅ ${message}`);
    }
    
    static warning(message) {
        console.log(`⚠️  ${message}`);
    }
    
    static error(message) {
        console.log(`❌ ${message}`);
    }
    
    static progress(current, total, item) {
        const percent = Math.round((current / total) * 100);
        const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
        process.stdout.write(`\r[${bar}] ${percent}% (${current}/${total}) ${item || ''}`);
        if (current === total) console.log('');
    }
}

class RateLimiter {
    constructor(requestsPerMinute) {
        this.requests = [];
        this.limit = requestsPerMinute;
    }
    
    async waitIfNeeded() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < 60000); // Keep only requests from last minute
        
        if (this.requests.length >= this.limit) {
            const oldestRequest = Math.min(...this.requests);
            const waitTime = 60000 - (now - oldestRequest) + 100; // Add 100ms buffer
            if (waitTime > 0) {
                Logger.info(`Rate limit reached, waiting ${Math.round(waitTime/1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        this.requests.push(now);
    }
}

async function ensureDirectory(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
}

async function saveData(data, filename, directory = CONFIG.output.directory) {
    await ensureDirectory(directory);
    const filePath = path.join(directory, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    Logger.success(`Saved ${data.length || Object.keys(data).length} items to ${filename}`);
}

async function loadCache(cacheKey) {
    if (!CONFIG.cache.enabled) return null;
    
    try {
        const cacheFile = path.join(CONFIG.output.directory, `.cache_${cacheKey}.json`);
        const stats = await fs.stat(cacheFile);
        
        // Check if cache is still valid
        if (Date.now() - stats.mtime > CONFIG.cache.ttl) {
            return null;
        }
        
        const cacheData = await fs.readFile(cacheFile, 'utf8');
        Logger.info(`Using cached data for ${cacheKey}`);
        return JSON.parse(cacheData);
    } catch {
        return null;
    }
}

async function saveCache(data, cacheKey) {
    if (!CONFIG.cache.enabled) return;
    
    try {
        await ensureDirectory(CONFIG.output.directory);
        const cacheFile = path.join(CONFIG.output.directory, `.cache_${cacheKey}.json`);
        await fs.writeFile(cacheFile, JSON.stringify(data));
    } catch (error) {
        Logger.warning(`Failed to save cache: ${error.message}`);
    }
}

// ============================================
// API FETCHERS
// ============================================
class CryptoFetcher {
    constructor() {
        this.rateLimiter = new RateLimiter(CONFIG.apis.coingecko.rateLimit);
        this.baseUrl = CONFIG.apis.coingecko.base;
    }
    
    async fetchTopCryptocurrencies(limit = 270) {
        const cacheKey = `crypto_top_${limit}`;
        const cached = await loadCache(cacheKey);
        if (cached) return cached;
        
        Logger.info(`Fetching top ${limit} cryptocurrencies from CoinGecko...`);
        
        const cryptos = [];
        const perPage = 250; // CoinGecko max per request
        const pages = Math.ceil(limit / perPage);
        
        for (let page = 1; page <= pages; page++) {
            await this.rateLimiter.waitIfNeeded();
            
            try {
                const remaining = limit - cryptos.length;
                const pageSize = Math.min(perPage, remaining);
                
                Logger.progress(page, pages, `Page ${page}/${pages}`);
                
                const response = await axios.get(`${this.baseUrl}/coins/markets`, {
                    params: {
                        vs_currency: 'usd',
                        order: 'market_cap_desc',
                        per_page: pageSize,
                        page: page,
                        sparkline: false,
                        price_change_percentage: '24h'
                    },
                    timeout: 10000
                });
                
                const batch = response.data.map(crypto => ({
                    symbol: crypto.symbol.toUpperCase(),
                    name: crypto.name,
                    type: 'crypto',
                    market_cap_rank: crypto.market_cap_rank,
                    current_price: crypto.current_price,
                    market_cap: crypto.market_cap,
                    price_change_24h: crypto.price_change_percentage_24h,
                    image: crypto.image,
                    coingecko_id: crypto.id,
                    last_updated: new Date().toISOString()
                }));
                
                cryptos.push(...batch);
                
                if (cryptos.length >= limit) break;
                
            } catch (error) {
                Logger.error(`Failed to fetch crypto page ${page}: ${error.message}`);
                if (error.response?.status === 429) {
                    Logger.info('Rate limited, waiting 60 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 60000));
                }
            }
        }
        
        Logger.success(`Fetched ${cryptos.length} cryptocurrencies`);
        await saveCache(cryptos, cacheKey);
        return cryptos;
    }
}

class StockFetcher {
    constructor() {
        this.rateLimiter = new RateLimiter(CONFIG.apis.fmp.rateLimit);
        this.baseUrl = CONFIG.apis.fmp.base;
        this.apiKey = CONFIG.apis.fmp.key;
    }
    
    async fetchStocksByCategory(category = 'sp500') {
        const cacheKey = `stocks_${category}`;
        const cached = await loadCache(cacheKey);
        if (cached) return cached;
        
        Logger.info(`Fetching ${category.toUpperCase()} stocks...`);
        
        const endpoints = {
            sp500: '/sp500_constituent',
            nasdaq: '/nasdaq_constituent', 
            dowjones: '/dowjones_constituent',
            available_traded: '/available-traded/list'
        };
        
        const endpoint = endpoints[category] || endpoints.available_traded;
        
        await this.rateLimiter.waitIfNeeded();
        
        try {
            const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                params: { apikey: this.apiKey },
                timeout: 15000
            });
            
            let stocks = response.data;
            
            // Filter and format stocks
            if (category === 'available_traded') {
                // Filter for US stocks only, exclude OTC and penny stocks
                stocks = stocks.filter(stock => 
                    stock.exchangeShortName && 
                    ['NASDAQ', 'NYSE', 'AMEX'].includes(stock.exchangeShortName) &&
                    stock.price > 1 && // Exclude penny stocks
                    stock.marketCap > 100000000 // Min $100M market cap
                );
            }
            
            const formattedStocks = stocks.map(stock => ({
                symbol: stock.symbol,
                name: stock.name || stock.companyName,
                type: 'stock',
                exchange: stock.exchangeShortName || stock.exchange,
                sector: stock.sector,
                industry: stock.industry,
                market_cap: stock.marketCap,
                price: stock.price,
                country: stock.country || 'US',
                last_updated: new Date().toISOString()
            })).filter(stock => stock.symbol && stock.name);
            
            Logger.success(`Fetched ${formattedStocks.length} ${category} stocks`);
            await saveCache(formattedStocks, cacheKey);
            return formattedStocks;
            
        } catch (error) {
            Logger.error(`Failed to fetch ${category} stocks: ${error.message}`);
            return [];
        }
    }
    
    async fetchInternationalStocks() {
        const cacheKey = 'stocks_international';
        const cached = await loadCache(cacheKey);
        if (cached) return cached;
        
        Logger.info('Fetching international stocks...');
        
        const exchanges = ['LSE', 'TSX', 'FRA', 'AMS', 'SWX', 'BIT', 'BME'];
        const internationalStocks = [];
        
        for (const exchange of exchanges) {
            await this.rateLimiter.waitIfNeeded();
            
            try {
                Logger.progress(exchanges.indexOf(exchange) + 1, exchanges.length, `${exchange} Exchange`);
                
                const response = await axios.get(`${this.baseUrl}/symbol/${exchange}`, {
                    params: { apikey: this.apiKey },
                    timeout: 15000
                });
                
                const stocks = response.data
                    .filter(stock => stock.type === 'stock' && stock.name)
                    .slice(0, 100) // Limit per exchange
                    .map(stock => ({
                        symbol: stock.symbol,
                        name: stock.name,
                        type: 'stock',
                        exchange: exchange,
                        country: this.getCountryFromExchange(exchange),
                        last_updated: new Date().toISOString()
                    }));
                
                internationalStocks.push(...stocks);
                
            } catch (error) {
                Logger.warning(`Failed to fetch ${exchange} stocks: ${error.message}`);
            }
        }
        
        Logger.success(`Fetched ${internationalStocks.length} international stocks`);
        await saveCache(internationalStocks, cacheKey);
        return internationalStocks;
    }
    
    getCountryFromExchange(exchange) {
        const countryMap = {
            'LSE': 'UK',
            'TSX': 'Canada', 
            'FRA': 'Germany',
            'AMS': 'Netherlands',
            'SWX': 'Switzerland',
            'BIT': 'Italy',
            'BME': 'Spain'
        };
        return countryMap[exchange] || 'Unknown';
    }
}

class CommodityFetcher {
    constructor() {
        this.rateLimiter = new RateLimiter(CONFIG.apis.fmp.rateLimit);
        this.baseUrl = CONFIG.apis.fmp.base;
        this.apiKey = CONFIG.apis.fmp.key;
    }
    
    async fetchCommodities() {
        const cacheKey = 'commodities';
        const cached = await loadCache(cacheKey);
        if (cached) return cached;
        
        Logger.info('Fetching commodities and indexes...');
        
        // Define commodity and index symbols
        const commoditySymbols = [
            'GCUSD', 'SIUSD', 'CLUSD', 'NGUSD', // Precious metals & Energy
            'WHAUSD', 'CORNUSD', 'SOYUSD', 'SUGUSD', // Agriculture
            'CCUSD', 'CTUSD' // Soft commodities
        ];
        
        const indexSymbols = [
            '^GSPC', '^DJI', '^IXIC', '^RUT', // US Indexes
            '^FTSE', '^GDAXI', '^FCHI', '^N225' // International Indexes
        ];
        
        const allSymbols = [...commoditySymbols, ...indexSymbols];
        const commodities = [];
        
        for (const symbol of allSymbols) {
            await this.rateLimiter.waitIfNeeded();
            
            try {
                Logger.progress(allSymbols.indexOf(symbol) + 1, allSymbols.length, symbol);
                
                const response = await axios.get(`${this.baseUrl}/quote/${symbol}`, {
                    params: { apikey: this.apiKey },
                    timeout: 10000
                });
                
                const data = response.data[0];
                if (data) {
                    commodities.push({
                        symbol: symbol,
                        name: data.name,
                        type: commoditySymbols.includes(symbol) ? 'commodity' : 'index',
                        price: data.price,
                        change: data.change,
                        changesPercentage: data.changesPercentage,
                        exchange: data.exchange,
                        last_updated: new Date().toISOString()
                    });
                }
                
            } catch (error) {
                Logger.warning(`Failed to fetch ${symbol}: ${error.message}`);
            }
        }
        
        Logger.success(`Fetched ${commodities.length} commodities and indexes`);
        await saveCache(commodities, cacheKey);
        return commodities;
    }
}

// ============================================
// MAIN FETCHER CLASS
// ============================================
class UniversalFetcher {
    constructor() {
        this.cryptoFetcher = new CryptoFetcher();
        this.stockFetcher = new StockFetcher();
        this.commodityFetcher = new CommodityFetcher();
    }
    
    async fetchAll(options = {}) {
        Logger.info('🚀 Starting Universal Asset Fetch...\n');
        
        const results = {
            crypto: [],
            stocks: [],
            international: [],
            commodities: [],
            summary: {}
        };
        
        try {
            // Fetch Cryptocurrencies
            if (options.crypto !== false) {
                const cryptoLimit = options.cryptoLimit || CONFIG.limits.crypto;
                results.crypto = await this.cryptoFetcher.fetchTopCryptocurrencies(cryptoLimit);
                
                if (CONFIG.output.individual) {
                    await saveData(results.crypto, 'top-cryptocurrencies.json');
                }
            }
            
            // Fetch US Stocks
            if (options.stocks !== false) {
                results.stocks = await this.stockFetcher.fetchStocksByCategory('available_traded');
                
                if (CONFIG.output.individual) {
                    await saveData(results.stocks, 'us-stocks.json');
                }
            }
            
            // Fetch International Stocks
            if (options.international !== false) {
                results.international = await this.stockFetcher.fetchInternationalStocks();
                
                if (CONFIG.output.individual) {
                    await saveData(results.international, 'international-stocks.json');
                }
            }
            
            // Fetch Commodities
            if (options.commodities !== false) {
                results.commodities = await this.commodityFetcher.fetchCommodities();
                
                if (CONFIG.output.individual) {
                    await saveData(results.commodities, 'commodities-indexes.json');
                }
            }
            
            // Combine all data
            const allAssets = [
                ...results.crypto,
                ...results.stocks,
                ...results.international,
                ...results.commodities
            ];
            
            // Sort by type, then by symbol
            allAssets.sort((a, b) => {
                if (a.type !== b.type) return a.type.localeCompare(b.type);
                return a.symbol.localeCompare(b.symbol);
            });
            
            // Save combined file
            await saveData(allAssets, CONFIG.output.combined);
            
            // Generate summary
            results.summary = {
                total_assets: allAssets.length,
                by_type: {
                    crypto: results.crypto.length,
                    stocks: results.stocks.length,
                    international: results.international.length,
                    commodities: results.commodities.length
                },
                generated_at: new Date().toISOString(),
                data_sources: ['CoinGecko', 'Financial Modeling Prep']
            };
            
            await saveData(results.summary, 'fetch-summary.json');
            
            Logger.success(`\n🎉 Universal Fetch Complete!`);
            Logger.info(`📊 Total Assets: ${results.summary.total_assets}`);
            Logger.info(`   💰 Crypto: ${results.summary.by_type.crypto}`);
            Logger.info(`   📈 US Stocks: ${results.summary.by_type.stocks}`);
            Logger.info(`   🌍 International: ${results.summary.by_type.international}`);
            Logger.info(`   🏭 Commodities: ${results.summary.by_type.commodities}`);
            
            return results;
            
        } catch (error) {
            Logger.error(`Universal fetch failed: ${error.message}`);
            throw error;
        }
    }
    
    async updateExisting() {
        Logger.info('🔄 Updating existing asset data...');
        
        // Clear cache to force fresh data
        CONFIG.cache.enabled = false;
        
        return await this.fetchAll();
    }
}

// ============================================
// CLI INTERFACE
// ============================================
const program = new Command();

program
    .name('universal-fetcher')
    .description('Universal Asset Fetcher - Replaces 19 individual fetch scripts')
    .version('2.0.0');

program
    .command('all')
    .description('Fetch all asset types (crypto, stocks, international, commodities)')
    .option('--crypto-limit <number>', 'Number of top cryptocurrencies to fetch', '1000')
    .option('--no-cache', 'Disable caching, fetch fresh data')
    .action(async (options) => {
        if (options.noCache) CONFIG.cache.enabled = false;
        const fetcher = new UniversalFetcher();
        await fetcher.fetchAll({ cryptoLimit: parseInt(options.cryptoLimit) });
    });

program
    .command('crypto')
    .description('Fetch cryptocurrencies only')
    .option('--limit <number>', 'Number of top cryptocurrencies', '500')
    .action(async (options) => {
        const fetcher = new UniversalFetcher();
        await fetcher.fetchAll({ 
            cryptoLimit: parseInt(options.limit),
            stocks: false,
            international: false,
            commodities: false
        });
    });

program
    .command('stocks')
    .description('Fetch stocks only')
    .option('--market <type>', 'Market type: us, international, all', 'all')
    .action(async (options) => {
        const fetcher = new UniversalFetcher();
        await fetcher.fetchAll({ 
            crypto: false,
            stocks: options.market !== 'international',
            international: options.market !== 'us',
            commodities: false
        });
    });

program
    .command('update')
    .description('Update existing data (ignores cache)')
    .action(async () => {
        const fetcher = new UniversalFetcher();
        await fetcher.updateExisting();
    });

// Default action (backwards compatibility)
if (process.argv.length === 2) {
    Logger.info('No command specified, running full fetch...\n');
    const fetcher = new UniversalFetcher();
    fetcher.fetchAll().catch(error => {
        Logger.error(`Fetch failed: ${error.message}`);
        process.exit(1);
    });
} else {
    program.parse();
}

module.exports = { UniversalFetcher, CONFIG };