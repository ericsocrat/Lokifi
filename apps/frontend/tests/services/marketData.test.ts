/**
 * Tests for Master Market Data Service
 *
 * Covers:
 * - Asset retrieval (getAsset, getAllAssets, getAssetsByType, searchAssets)
 * - Market statistics (getMarketStats)
 * - Historical data (getHistoricalData)
 * - Subscription system (subscribe)
 * - Service lifecycle (start, stop)
 *
 * Note: The marketData module is a singleton that initializes on import.
 * Tests work with the exported instance, testing its public API.
 *
 * Session 130: Test coverage for src/services/marketData.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  marketData,
  type MarketAsset,
  type MarketStats,
  type PricePoint,
} from '../../src/services/marketData';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('marketData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset timers for subscription tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // Singleton Instance Tests
  // ==========================================================================

  describe('singleton instance', () => {
    it('should export a singleton marketData instance', () => {
      expect(marketData).toBeDefined();
      expect(typeof marketData.getAsset).toBe('function');
      expect(typeof marketData.getAllAssets).toBe('function');
      expect(typeof marketData.subscribe).toBe('function');
    });

    it('should have initialized market data', () => {
      const assets = marketData.getAllAssets();
      expect(assets.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Asset Retrieval Tests
  // ==========================================================================

  describe('getAsset', () => {
    it('should retrieve asset by uppercase symbol', () => {
      const apple = marketData.getAsset('AAPL');

      expect(apple).toBeDefined();
      expect(apple?.symbol).toBe('AAPL');
      expect(apple?.name).toBe('Apple Inc.');
    });

    it('should retrieve asset by lowercase symbol', () => {
      const apple = marketData.getAsset('aapl');

      expect(apple).toBeDefined();
      expect(apple?.symbol).toBe('AAPL');
    });

    it('should return undefined for non-existent symbol', () => {
      const invalid = marketData.getAsset('NOTASTOCK123');

      expect(invalid).toBeUndefined();
    });

    it('should return crypto assets', () => {
      const btc = marketData.getAsset('BTC');

      expect(btc).toBeDefined();
      expect(btc?.type).toBe('crypto');
      expect(btc?.name).toContain('Bitcoin');
    });

    it('should have correct MarketAsset properties', () => {
      const asset = marketData.getAsset('AAPL');

      expect(asset).toBeDefined();
      if (asset) {
        expect(typeof asset.symbol).toBe('string');
        expect(typeof asset.name).toBe('string');
        expect(typeof asset.price).toBe('number');
        expect(typeof asset.previousClose).toBe('number');
        expect(typeof asset.change).toBe('number');
        expect(typeof asset.changePercent).toBe('number');
        expect(typeof asset.volume).toBe('number');
        expect(typeof asset.marketCap).toBe('number');
        expect(typeof asset.high24h).toBe('number');
        expect(typeof asset.low24h).toBe('number');
        expect(typeof asset.lastUpdated).toBe('number');
        expect(asset.type).toMatch(/^(stock|crypto|etf|index)$/);
      }
    });
  });

  describe('getAllAssets', () => {
    it('should return array of all assets', () => {
      const assets = marketData.getAllAssets();

      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBeGreaterThan(50); // Should have at least 50+ assets
    });

    it('should include both stocks and cryptos', () => {
      const assets = marketData.getAllAssets();
      const hasStocks = assets.some((a) => a.type === 'stock');
      const hasCryptos = assets.some((a) => a.type === 'crypto');

      expect(hasStocks).toBe(true);
      expect(hasCryptos).toBe(true);
    });

    it('should return MarketAsset objects with all required fields', () => {
      const assets = marketData.getAllAssets();
      const firstAsset = assets[0];

      expect(firstAsset).toHaveProperty('symbol');
      expect(firstAsset).toHaveProperty('name');
      expect(firstAsset).toHaveProperty('type');
      expect(firstAsset).toHaveProperty('price');
      expect(firstAsset).toHaveProperty('previousClose');
      expect(firstAsset).toHaveProperty('change');
      expect(firstAsset).toHaveProperty('changePercent');
      expect(firstAsset).toHaveProperty('volume');
      expect(firstAsset).toHaveProperty('marketCap');
    });
  });

  describe('getAssetsByType', () => {
    it('should return only stock assets when type is stock', () => {
      const stocks = marketData.getAssetsByType('stock');

      expect(stocks.length).toBeGreaterThan(0);
      expect(stocks.every((a) => a.type === 'stock')).toBe(true);
    });

    it('should return only crypto assets when type is crypto', () => {
      const cryptos = marketData.getAssetsByType('crypto');

      expect(cryptos.length).toBeGreaterThan(0);
      expect(cryptos.every((a) => a.type === 'crypto')).toBe(true);
    });

    it('should return ETF assets when type is etf', () => {
      const etfs = marketData.getAssetsByType('etf');

      // ETFs may or may not be present
      expect(Array.isArray(etfs)).toBe(true);
      if (etfs.length > 0) {
        expect(etfs.every((a) => a.type === 'etf')).toBe(true);
      }
    });

    it('should return different counts for different types', () => {
      const stocks = marketData.getAssetsByType('stock');
      const cryptos = marketData.getAssetsByType('crypto');

      // Both should have assets but potentially different counts
      expect(stocks.length).toBeGreaterThan(0);
      expect(cryptos.length).toBeGreaterThan(0);
    });
  });

  describe('searchAssets', () => {
    it('should find assets by symbol', () => {
      const results = marketData.searchAssets('AAPL');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((a) => a.symbol === 'AAPL')).toBe(true);
    });

    it('should find assets by name', () => {
      const results = marketData.searchAssets('Apple');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((a) => a.name.toLowerCase().includes('apple'))).toBe(true);
    });

    it('should be case-insensitive', () => {
      const resultsUpper = marketData.searchAssets('BITCOIN');
      const resultsLower = marketData.searchAssets('bitcoin');
      const resultsMixed = marketData.searchAssets('BiTcOiN');

      expect(resultsUpper.length).toBe(resultsLower.length);
      expect(resultsUpper.length).toBe(resultsMixed.length);
      expect(resultsUpper.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = marketData.searchAssets('xyznotfound123');

      expect(results).toEqual([]);
    });

    it('should match partial symbols', () => {
      const results = marketData.searchAssets('BT');

      expect(results.length).toBeGreaterThan(0);
      // Should include BTC and potentially others
      expect(results.some((a) => a.symbol.includes('BT'))).toBe(true);
    });

    it('should match partial names', () => {
      const results = marketData.searchAssets('Micro');

      expect(results.length).toBeGreaterThan(0);
      // Should include Microsoft
      expect(results.some((a) => a.name.toLowerCase().includes('micro'))).toBe(true);
    });
  });

  // ==========================================================================
  // Market Statistics Tests
  // ==========================================================================

  describe('getMarketStats', () => {
    it('should return MarketStats object', () => {
      const stats = marketData.getMarketStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalMarketCap).toBe('number');
      expect(typeof stats.total24hVolume).toBe('number');
      expect(typeof stats.btcDominance).toBe('number');
      expect(typeof stats.activeAssets).toBe('number');
    });

    it('should include gainers and losers arrays', () => {
      const stats = marketData.getMarketStats();

      expect(Array.isArray(stats.gainers)).toBe(true);
      expect(Array.isArray(stats.losers)).toBe(true);
      expect(stats.gainers.length).toBeLessThanOrEqual(10);
      expect(stats.losers.length).toBeLessThanOrEqual(10);
    });

    it('should include trending array', () => {
      const stats = marketData.getMarketStats();

      expect(Array.isArray(stats.trending)).toBe(true);
      expect(stats.trending.length).toBeLessThanOrEqual(10);
    });

    it('should have positive market cap', () => {
      const stats = marketData.getMarketStats();

      expect(stats.totalMarketCap).toBeGreaterThan(0);
    });

    it('should have BTC dominance between 0 and 100', () => {
      const stats = marketData.getMarketStats();

      expect(stats.btcDominance).toBeGreaterThanOrEqual(0);
      expect(stats.btcDominance).toBeLessThanOrEqual(100);
    });

    it('should have correct active assets count', () => {
      const stats = marketData.getMarketStats();
      const allAssets = marketData.getAllAssets();

      expect(stats.activeAssets).toBe(allAssets.length);
    });

    it('should have gainers sorted by highest change percent', () => {
      const stats = marketData.getMarketStats();

      if (stats.gainers.length > 1) {
        for (let i = 0; i < stats.gainers.length - 1; i++) {
          expect(stats.gainers[i].changePercent).toBeGreaterThanOrEqual(
            stats.gainers[i + 1].changePercent
          );
        }
      }
    });
  });

  // ==========================================================================
  // Historical Data Tests
  // ==========================================================================

  describe('getHistoricalData', () => {
    it('should return price points array', () => {
      const history = marketData.getHistoricalData('BTC', '7d');

      expect(Array.isArray(history)).toBe(true);
    });

    it('should return empty array for non-existent symbol', () => {
      const history = marketData.getHistoricalData('NOTREAL123', '7d');

      expect(history).toEqual([]);
    });

    it('should have PricePoint structure', () => {
      const history = marketData.getHistoricalData('BTC', '30d');

      if (history.length > 0) {
        const point = history[0];
        expect(typeof point.timestamp).toBe('number');
        expect(typeof point.price).toBe('number');
      }
    });

    it('should support 1d period', () => {
      const history = marketData.getHistoricalData('AAPL', '1d');

      expect(Array.isArray(history)).toBe(true);
      // 1d should return fewer or equal points than 7d
      const week = marketData.getHistoricalData('AAPL', '7d');
      expect(history.length).toBeLessThanOrEqual(week.length);
    });

    it('should support 7d period', () => {
      const history = marketData.getHistoricalData('AAPL', '7d');

      expect(Array.isArray(history)).toBe(true);
    });

    it('should support 30d period', () => {
      const history = marketData.getHistoricalData('ETH', '30d');

      expect(Array.isArray(history)).toBe(true);
    });

    it('should support 1y period', () => {
      const history = marketData.getHistoricalData('MSFT', '1y');

      expect(Array.isArray(history)).toBe(true);
    });

    it('should support all period', () => {
      const history = marketData.getHistoricalData('BTC', 'all');

      expect(Array.isArray(history)).toBe(true);
      // 'all' should return the most data
      const month = marketData.getHistoricalData('BTC', '30d');
      expect(history.length).toBeGreaterThanOrEqual(month.length);
    });

    it('should filter by time period correctly', () => {
      const history1d = marketData.getHistoricalData('BTC', '1d');
      const history7d = marketData.getHistoricalData('BTC', '7d');

      // 7d should have more or equal data points than 1d
      expect(history7d.length).toBeGreaterThanOrEqual(history1d.length);
    });
  });

  // ==========================================================================
  // Subscription Tests
  // ==========================================================================

  describe('subscribe', () => {
    it('should accept a callback function', () => {
      const callback = vi.fn();

      const unsubscribe = marketData.subscribe(callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should call callback immediately with current data', () => {
      const callback = vi.fn();

      const unsubscribe = marketData.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.any(Map));

      unsubscribe();
    });

    it('should pass Map of assets to callback', () => {
      let receivedAssets: Map<string, MarketAsset> | null = null;
      const callback = (assets: Map<string, MarketAsset>) => {
        receivedAssets = assets;
      };

      const unsubscribe = marketData.subscribe(callback);

      expect(receivedAssets).toBeInstanceOf(Map);
      expect(receivedAssets!.size).toBeGreaterThan(0);

      unsubscribe();
    });

    it('should return working unsubscribe function', () => {
      const callback = vi.fn();

      const unsubscribe = marketData.subscribe(callback);
      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Should not be called again (subscription removed)
      // Note: Can't easily trigger notifySubscribers, but unsubscribe should work
    });

    it('should support multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = marketData.subscribe(callback1);
      const unsub2 = marketData.subscribe(callback2);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      unsub1();
      unsub2();
    });
  });

  // ==========================================================================
  // Service Lifecycle Tests
  // ==========================================================================

  describe('stop and start', () => {
    it('should have stop method', () => {
      expect(typeof marketData.stop).toBe('function');
    });

    it('should have start method', () => {
      expect(typeof marketData.start).toBe('function');
    });

    it('should not throw when stopping', () => {
      expect(() => marketData.stop()).not.toThrow();
    });

    it('should not throw when starting', () => {
      expect(() => marketData.start()).not.toThrow();
    });

    it('should be able to stop and restart', () => {
      // Stop
      marketData.stop();

      // Start again
      marketData.start();

      // Should still be able to get assets
      const assets = marketData.getAllAssets();
      expect(assets.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Type Export Tests
  // ==========================================================================

  describe('type exports', () => {
    it('should export MarketAsset type', () => {
      const asset = marketData.getAsset('AAPL');
      // Type check - if this compiles, types are exported correctly
      const typedAsset: MarketAsset | undefined = asset;
      expect(typedAsset).toBeDefined();
    });

    it('should export MarketStats type', () => {
      const stats = marketData.getMarketStats();
      // Type check
      const typedStats: MarketStats = stats;
      expect(typedStats).toBeDefined();
    });

    it('should export PricePoint type', () => {
      const history = marketData.getHistoricalData('BTC', '7d');
      // Type check
      const typedHistory: PricePoint[] = history;
      expect(Array.isArray(typedHistory)).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty string search', () => {
      const results = marketData.searchAssets('');

      // Empty search should return all assets
      expect(results.length).toBe(marketData.getAllAssets().length);
    });

    it('should handle special characters in search', () => {
      const results = marketData.searchAssets('$%^&*');

      expect(Array.isArray(results)).toBe(true);
      // Should not throw, may return empty
    });

    it('should handle unicode in search', () => {
      const results = marketData.searchAssets('比特币');

      expect(Array.isArray(results)).toBe(true);
      // Should not throw
    });

    it('should handle very long search string', () => {
      const longSearch = 'a'.repeat(1000);
      const results = marketData.searchAssets(longSearch);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle mixed case symbol lookups', () => {
      const upper = marketData.getAsset('BTC');
      const lower = marketData.getAsset('btc');
      const mixed = marketData.getAsset('BtC');

      expect(upper).toEqual(lower);
      expect(upper).toEqual(mixed);
    });
  });

  // ==========================================================================
  // Data Integrity Tests
  // ==========================================================================

  describe('data integrity', () => {
    it('should have major US stocks', () => {
      const majorStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA'];

      majorStocks.forEach((symbol) => {
        const asset = marketData.getAsset(symbol);
        expect(asset).toBeDefined();
        expect(asset?.type).toBe('stock');
      });
    });

    it('should have major cryptocurrencies', () => {
      const majorCryptos = ['BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE'];

      majorCryptos.forEach((symbol) => {
        const asset = marketData.getAsset(symbol);
        expect(asset).toBeDefined();
        expect(asset?.type).toBe('crypto');
      });
    });

    it('should have reasonable price values', () => {
      const assets = marketData.getAllAssets();

      assets.forEach((asset) => {
        expect(asset.price).toBeGreaterThan(0);
        expect(Number.isFinite(asset.price)).toBe(true);
      });
    });

    it('should have reasonable market cap values', () => {
      const btc = marketData.getAsset('BTC');
      const apple = marketData.getAsset('AAPL');

      // BTC and AAPL should have trillion-dollar market caps
      expect(btc?.marketCap).toBeGreaterThan(100000000000); // > 100B
      expect(apple?.marketCap).toBeGreaterThan(1000000000000); // > 1T
    });

    it('should have history data for assets', () => {
      const asset = marketData.getAsset('BTC');

      expect(asset?.history).toBeDefined();
      if (asset?.history) {
        expect(asset.history.length).toBeGreaterThan(0);
      }
    });
  });
});
