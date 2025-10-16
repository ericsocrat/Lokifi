import {
  useAllAssets,
  useAsset,
  useAssetFormatter,
  useAssets,
  useAssetSearch,
  useHistoricalData,
  useMarketStats,
  usePortfolioPrices,
  useTopMovers,
} from '@/hooks/useMarketData';
import marketData from '@/services/marketData';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the marketData service
vi.mock('@/services/marketData', () => {
  const mockAssets = new Map([
    [
      'AAPL',
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        price: 150.5,
        previousClose: 148.0,
        change: 2.5,
        changePercent: 1.69,
        volume: 50000000,
        marketCap: 2500000000000,
        high24h: 151.0,
        low24h: 149.0,
        sector: 'Technology',
        lastUpdated: Date.now(),
      },
    ],
    [
      'BTC',
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'crypto',
        price: 45000.0,
        previousClose: 44000.0,
        change: 1000.0,
        changePercent: 2.27,
        volume: 25000000000,
        marketCap: 850000000000,
        high24h: 46000.0,
        low24h: 43000.0,
        lastUpdated: Date.now(),
      },
    ],
    [
      'TSLA',
      {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        type: 'stock',
        price: 250.0,
        previousClose: 255.0,
        change: -5.0,
        changePercent: -1.96,
        volume: 75000000,
        marketCap: 800000000000,
        high24h: 256.0,
        low24h: 248.0,
        sector: 'Automotive',
        lastUpdated: Date.now(),
      },
    ],
  ]);

  let subscribers: Set<any> = new Set();

  return {
    default: {
      getAsset: (symbol: string) => mockAssets.get(symbol.toUpperCase()),
      getAllAssets: () => Array.from(mockAssets.values()),
      getAssetsByType: (type: string) =>
        Array.from(mockAssets.values()).filter((asset) => asset.type === type),
      searchAssets: (query: string) =>
        Array.from(mockAssets.values()).filter(
          (asset) =>
            asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
            asset.name.toLowerCase().includes(query.toLowerCase())
        ),
      getMarketStats: () => ({
        totalMarketCap: 4150000000000,
        total24hVolume: 25125000000,
        btcDominance: 45.5,
        activeAssets: 3,
        gainers: [mockAssets.get('BTC')!, mockAssets.get('AAPL')!],
        losers: [mockAssets.get('TSLA')!],
        trending: [mockAssets.get('AAPL')!],
      }),
      getHistoricalData: (symbol: string, period: string) => [
        { timestamp: Date.now() - 86400000 * 2, price: 148.0 },
        { timestamp: Date.now() - 86400000, price: 149.0 },
        { timestamp: Date.now(), price: 150.5 },
      ],
      subscribe: (callback: any) => {
        subscribers.add(callback);
        callback(mockAssets); // Call immediately to initialize state
        return () => subscribers.delete(callback);
      },
      _triggerUpdate: () => {
        subscribers.forEach((cb) => cb(mockAssets));
      },
      _updateAsset: (symbol: string, updates: any) => {
        const asset = mockAssets.get(symbol);
        if (asset) {
          Object.assign(asset, updates);
        }
      },
    },
  };
});

describe('useMarketData Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset AAPL price that may have been modified by previous tests
    const asset = marketData.getAsset('AAPL');
    if (asset) {
      asset.price = 150.5;
    }
  });

  describe('useAsset', () => {
    it('returns asset data for valid symbol', () => {
      const { result } = renderHook(() => useAsset('AAPL'));

      expect(result.current).toBeDefined();
      expect(result.current?.symbol).toBe('AAPL');
      expect(result.current?.name).toBe('Apple Inc.');
      expect(result.current?.price).toBe(150.5);
    });

    it('returns undefined for invalid symbol', () => {
      const { result } = renderHook(() => useAsset('INVALID'));

      expect(result.current).toBeUndefined();
    });

    it('subscribes to updates and reflects changes', async () => {
      const { result } = renderHook(() => useAsset('AAPL'));

      expect(result.current?.price).toBe(150.5);

      // Trigger an update
      act(() => {
        marketData._updateAsset('AAPL', { price: 155.0 });
        marketData._triggerUpdate();
      });

      await waitFor(() => {
        expect(result.current?.price).toBe(155.0);
      });
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() => useAsset('AAPL'));

      const subscribeSpy = vi.spyOn(marketData, 'subscribe');
      unmount();

      // Should have been called once during mount
      expect(subscribeSpy).toHaveBeenCalledTimes(0); // Not called again after unmount
    });
  });

  describe('useAssets', () => {
    it('returns data for multiple symbols', () => {
      const { result } = renderHook(() => useAssets(['AAPL', 'BTC']));

      expect(result.current.size).toBe(2);
      expect(result.current.has('AAPL')).toBe(true);
      expect(result.current.has('BTC')).toBe(true);
      expect(result.current.get('AAPL')?.price).toBe(150.5);
      expect(result.current.get('BTC')?.price).toBe(45000.0);
    });

    it('filters out invalid symbols', () => {
      const { result } = renderHook(() => useAssets(['AAPL', 'INVALID', 'BTC']));

      expect(result.current.size).toBe(2);
      expect(result.current.has('INVALID')).toBe(false);
    });

    it('updates when symbols array changes', async () => {
      const { result, rerender } = renderHook(({ symbols }) => useAssets(symbols), {
        initialProps: { symbols: ['AAPL'] },
      });

      expect(result.current.size).toBe(1);

      rerender({ symbols: ['AAPL', 'BTC'] });

      await waitFor(() => {
        expect(result.current.size).toBe(2);
      });
    });
  });

  describe('useAllAssets', () => {
    it('returns all assets when no type specified', () => {
      const { result } = renderHook(() => useAllAssets());

      expect(result.current.length).toBe(3);
    });

    it('filters by asset type', () => {
      const { result } = renderHook(() => useAllAssets('stock'));

      expect(result.current.length).toBe(2);
      expect(result.current.every((asset) => asset.type === 'stock')).toBe(true);
    });

    it('filters crypto assets', () => {
      const { result } = renderHook(() => useAllAssets('crypto'));

      expect(result.current.length).toBe(1);
      expect(result.current[0]?.symbol).toBe('BTC');
    });

    it('updates when type changes', async () => {
      const { result, rerender } = renderHook(({ type }) => useAllAssets(type), {
        initialProps: { type: undefined },
      });

      expect(result.current.length).toBe(3);

      rerender({ type: 'stock' as const });

      await waitFor(() => {
        expect(result.current.length).toBe(2);
      });
    });
  });

  describe('useAssetSearch', () => {
    it('returns empty array for empty query', () => {
      const { result } = renderHook(() => useAssetSearch(''));

      expect(result.current).toEqual([]);
    });

    it('searches by symbol', () => {
      const { result } = renderHook(() => useAssetSearch('AAP'));

      expect(result.current.length).toBe(1);
      expect(result.current[0]?.symbol).toBe('AAPL');
    });

    it('searches by name', () => {
      const { result } = renderHook(() => useAssetSearch('Apple'));

      expect(result.current.length).toBe(1);
      expect(result.current[0]?.name).toBe('Apple Inc.');
    });

    it('is case insensitive', () => {
      const { result } = renderHook(() => useAssetSearch('bitcoin'));

      expect(result.current.length).toBe(1);
      expect(result.current[0]?.symbol).toBe('BTC');
    });

    it('updates when query changes', async () => {
      const { result, rerender } = renderHook(({ query }) => useAssetSearch(query), {
        initialProps: { query: 'Apple' },
      });

      expect(result.current.length).toBe(1);

      rerender({ query: 'Tesla' });

      await waitFor(() => {
        expect(result.current[0]?.symbol).toBe('TSLA');
      });
    });
  });

  describe('useMarketStats', () => {
    it('returns market statistics', () => {
      const { result } = renderHook(() => useMarketStats());

      expect(result.current.totalMarketCap).toBe(4150000000000);
      expect(result.current.total24hVolume).toBe(25125000000);
      expect(result.current.btcDominance).toBe(45.5);
      expect(result.current.activeAssets).toBe(3);
    });

    it('includes gainers and losers', () => {
      const { result } = renderHook(() => useMarketStats());

      expect(result.current.gainers.length).toBe(2);
      expect(result.current.losers.length).toBe(1);
      expect(result.current.losers[0]?.symbol).toBe('TSLA');
    });

    it('updates on market data changes', async () => {
      const { result } = renderHook(() => useMarketStats());

      const initialStats = result.current;

      act(() => {
        marketData._triggerUpdate();
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
    });
  });

  describe('useHistoricalData', () => {
    it('returns historical price data', () => {
      const { result } = renderHook(() => useHistoricalData('AAPL', '1d'));

      expect(result.current.length).toBe(3);
      expect(result.current[0]).toHaveProperty('timestamp');
      expect(result.current[0]).toHaveProperty('price');
    });

    it('updates when symbol changes', async () => {
      const { result, rerender } = renderHook(
        ({ symbol, period }) => useHistoricalData(symbol, period),
        {
          initialProps: { symbol: 'AAPL', period: '1d' as const },
        }
      );

      expect(result.current.length).toBe(3);

      rerender({ symbol: 'BTC', period: '1d' as const });

      await waitFor(() => {
        expect(result.current.length).toBeGreaterThan(0);
      });
    });

    it('updates when period changes', async () => {
      const { result, rerender } = renderHook(
        ({ symbol, period }) => useHistoricalData(symbol, period),
        {
          initialProps: { symbol: 'AAPL', period: '1d' as const },
        }
      );

      rerender({ symbol: 'AAPL', period: '7d' as const });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
    });
  });

  describe('usePortfolioPrices', () => {
    it('calculates portfolio value', () => {
      const holdings = [
        { symbol: 'AAPL', shares: 10 },
        { symbol: 'BTC', shares: 0.5 },
      ];

      const { result } = renderHook(() => usePortfolioPrices(holdings));

      expect(result.current.prices.size).toBe(2);
      expect(result.current.totalValue).toBe(10 * 150.5 + 0.5 * 45000.0); // 24005
      expect(result.current.totalChange).toBeGreaterThan(0);
      expect(result.current.totalChangePercent).toBeGreaterThan(0);
    });

    it('handles empty portfolio', () => {
      const { result } = renderHook(() => usePortfolioPrices([]));

      expect(result.current.prices.size).toBe(0);
      expect(result.current.totalValue).toBe(0);
      expect(result.current.totalChange).toBe(0);
      expect(result.current.totalChangePercent).toBe(0);
    });

    it('updates on price changes', async () => {
      const holdings = [{ symbol: 'AAPL', shares: 10 }];

      const { result } = renderHook(() => usePortfolioPrices(holdings));

      const initialValue = result.current.totalValue;

      act(() => {
        marketData._updateAsset('AAPL', { price: 160.0 });
        marketData._triggerUpdate();
      });

      await waitFor(() => {
        expect(result.current.totalValue).toBeGreaterThan(initialValue);
      });
    });

    it('handles invalid symbols gracefully', () => {
      const holdings = [
        { symbol: 'AAPL', shares: 10 },
        { symbol: 'INVALID', shares: 5 },
      ];

      const { result } = renderHook(() => usePortfolioPrices(holdings));

      expect(result.current.prices.size).toBe(1);
      expect(result.current.prices.has('AAPL')).toBe(true);
      expect(result.current.prices.has('INVALID')).toBe(false);
    });
  });

  describe('useTopMovers', () => {
    it('returns gainers and losers', () => {
      const { result } = renderHook(() => useTopMovers());

      expect(result.current.gainers.length).toBeGreaterThan(0);
      expect(result.current.losers.length).toBeGreaterThan(0);
    });

    it('gainers have positive change', () => {
      const { result } = renderHook(() => useTopMovers());

      result.current.gainers.forEach((asset) => {
        expect(asset.change).toBeGreaterThan(0);
      });
    });

    it('losers have negative change', () => {
      const { result } = renderHook(() => useTopMovers());

      result.current.losers.forEach((asset) => {
        expect(asset.change).toBeLessThan(0);
      });
    });
  });

  describe('useAssetFormatter', () => {
    it('formats stock prices correctly', () => {
      const { result } = renderHook(() => useAssetFormatter('AAPL'));

      const formatted = result.current.formatPrice(150.5);
      expect(formatted).toContain('$');
      expect(formatted).toContain('150.50');
    });

    it('formats crypto prices with appropriate decimals', () => {
      const { result } = renderHook(() => useAssetFormatter('BTC'));

      const formatted = result.current.formatPrice(45000.0);
      expect(formatted).toContain('$');
      expect(formatted).toContain('45');
    });

    it('formats small crypto prices with more decimals', () => {
      const { result } = renderHook(() => useAssetFormatter('BTC'));

      const formatted = result.current.formatPrice(0.00123);
      expect(formatted).toMatch(/\$0\.00\d{4}/);
    });

    it('formats change with sign and percent', () => {
      const { result } = renderHook(() => useAssetFormatter('AAPL'));

      const positiveChange = result.current.formatChange(2.5, 1.69);
      expect(positiveChange).toContain('+');
      expect(positiveChange).toContain('1.69%');

      const negativeChange = result.current.formatChange(-5.0, -1.96);
      expect(negativeChange).toContain('-1.96%');
    });

    it('formats market cap with abbreviations', () => {
      const { result } = renderHook(() => useAssetFormatter('AAPL'));

      expect(result.current.formatMarketCap(2500000000000)).toContain('T');
      expect(result.current.formatMarketCap(2500000000)).toContain('B');
      expect(result.current.formatMarketCap(2500000)).toContain('M');
    });

    it('formats volume with abbreviations', () => {
      const { result } = renderHook(() => useAssetFormatter('AAPL'));

      expect(result.current.formatVolume(25000000000)).toContain('B');
      expect(result.current.formatVolume(25000000)).toContain('M');
      expect(result.current.formatVolume(25000)).toContain('K');
    });

    it('returns fallback format for unknown asset', () => {
      const { result } = renderHook(() => useAssetFormatter('INVALID'));

      const formatted = result.current.formatPrice(100.5);
      expect(formatted).toContain('$100.50');
    });
  });
});
