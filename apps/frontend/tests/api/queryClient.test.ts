import { queryClient, queryKeys } from '@/lib/api/queryClient';
import { describe, expect, it } from 'vitest';

describe('queryClient', () => {
  describe('configuration', () => {
    it('should be a QueryClient instance', () => {
      expect(queryClient).toBeDefined();
      expect(typeof queryClient.getDefaultOptions).toBe('function');
    });

    it('should have correct default options', () => {
      const defaults = queryClient.getDefaultOptions();

      expect(defaults.queries?.staleTime).toBe(30 * 1000); // 30 seconds
      expect(defaults.queries?.gcTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
      expect(defaults.queries?.retry).toBe(1);
    });
  });
});

describe('queryKeys', () => {
  describe('allAssets', () => {
    it('should generate correct key for all assets', () => {
      const key = queryKeys.allAssets(10, ['crypto', 'stocks']);
      expect(key).toEqual(['assets', 'all', 10, 'crypto,stocks']);
    });

    it('should sort types alphabetically', () => {
      const key = queryKeys.allAssets(10, ['stocks', 'crypto', 'forex']);
      expect(key).toEqual(['assets', 'all', 10, 'crypto,forex,stocks']);
    });

    it('should handle single type', () => {
      const key = queryKeys.allAssets(20, ['crypto']);
      expect(key).toEqual(['assets', 'all', 20, 'crypto']);
    });

    it('should handle empty types array', () => {
      const key = queryKeys.allAssets(10, []);
      expect(key).toEqual(['assets', 'all', 10, '']);
    });
  });

  describe('cryptos', () => {
    it('should generate correct key with limit', () => {
      const key = queryKeys.cryptos(100);
      expect(key).toEqual(['assets', 'crypto', 100]);
    });
  });

  describe('cryptoSearch', () => {
    it('should generate correct key with query', () => {
      const key = queryKeys.cryptoSearch('bitcoin');
      expect(key).toEqual(['assets', 'crypto', 'search', 'bitcoin']);
    });

    it('should handle empty query', () => {
      const key = queryKeys.cryptoSearch('');
      expect(key).toEqual(['assets', 'crypto', 'search', '']);
    });
  });

  describe('stocks', () => {
    it('should generate correct key with limit', () => {
      const key = queryKeys.stocks(50);
      expect(key).toEqual(['assets', 'stocks', 50]);
    });
  });

  describe('stockSearch', () => {
    it('should generate correct key with query', () => {
      const key = queryKeys.stockSearch('apple');
      expect(key).toEqual(['assets', 'stocks', 'search', 'apple']);
    });
  });

  describe('indices', () => {
    it('should generate correct key', () => {
      const key = queryKeys.indices();
      expect(key).toEqual(['assets', 'indices']);
    });
  });

  describe('forex', () => {
    it('should generate correct key with limit', () => {
      const key = queryKeys.forex(20);
      expect(key).toEqual(['assets', 'forex', 20]);
    });
  });

  describe('asset', () => {
    it('should generate correct key for symbol', () => {
      const key = queryKeys.asset('BTC');
      expect(key).toEqual(['asset', 'BTC']);
    });

    it('should uppercase symbol', () => {
      const key = queryKeys.asset('btc');
      expect(key).toEqual(['asset', 'BTC']);
    });

    it('should handle mixed case', () => {
      const key = queryKeys.asset('bTc');
      expect(key).toEqual(['asset', 'BTC']);
    });
  });

  describe('assetHistory', () => {
    it('should generate correct key with symbol and period', () => {
      const key = queryKeys.assetHistory('BTC', '1d');
      expect(key).toEqual(['asset', 'BTC', 'history', '1d']);
    });

    it('should uppercase symbol', () => {
      const key = queryKeys.assetHistory('eth', '7d');
      expect(key).toEqual(['asset', 'ETH', 'history', '7d']);
    });

    it('should handle various periods', () => {
      expect(queryKeys.assetHistory('BTC', '1h')).toEqual(['asset', 'BTC', 'history', '1h']);
      expect(queryKeys.assetHistory('BTC', '30d')).toEqual(['asset', 'BTC', 'history', '30d']);
      expect(queryKeys.assetHistory('BTC', '1y')).toEqual(['asset', 'BTC', 'history', '1y']);
    });
  });

  describe('key uniqueness', () => {
    it('should generate unique keys for different parameters', () => {
      const key1 = queryKeys.cryptos(10);
      const key2 = queryKeys.cryptos(20);

      expect(key1).not.toEqual(key2);
    });

    it('should generate unique keys for different asset types', () => {
      const cryptoKey = queryKeys.cryptos(10);
      const stocksKey = queryKeys.stocks(10);

      expect(cryptoKey).not.toEqual(stocksKey);
    });

    it('should generate unique keys for different search queries', () => {
      const key1 = queryKeys.cryptoSearch('btc');
      const key2 = queryKeys.cryptoSearch('eth');

      expect(key1).not.toEqual(key2);
    });
  });

  describe('key structure', () => {
    it('should return readonly tuples', () => {
      const key = queryKeys.cryptos(10);
      // This is a compile-time check - at runtime we verify it's a proper array
      expect(Array.isArray(key)).toBe(true);
    });
  });
});
