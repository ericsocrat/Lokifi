import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/marketData', () => ({
  default: {
    subscribe: vi.fn(),
    getAsset: vi.fn(),
    getAllAssets: vi.fn(),
    getAssetsByType: vi.fn(),
    searchAssets: vi.fn(),
    getMarketStats: vi.fn(),
    getHistoricalData: vi.fn(),
  },
}));

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

describe('useMarketData Hook', () => {
  const mockAsset = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 150.5,
    change: 2.5,
    changePercent: 1.69,
    previousClose: 148.0,
    high: 151.0,
    low: 148.5,
    volume: 50000000,
    marketCap: 2500000000000,
    type: 'stock' as const,
  };

  const mockCryptoAsset = {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 45000,
    change: 1500,
    changePercent: 3.45,
    previousClose: 43500,
    high: 46000,
    low: 44000,
    volume: 30000000000,
    marketCap: 900000000000,
    type: 'crypto' as const,
  };

  const mockMarketStats = {
    totalMarketCap: 5000000000000,
    totalVolume: 100000000000,
    topGainers: [],
    topLosers: [],
    gainers: [mockAsset],
    losers: [],
  };

  let subscribeCallback: (assets: Map<string, typeof mockAsset>) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup subscribe to capture callback
    vi.mocked(marketData.subscribe).mockImplementation((callback) => {
      subscribeCallback = callback;
      return vi.fn(); // Return unsubscribe function
    });

    vi.mocked(marketData.getAsset).mockReturnValue(mockAsset);
    vi.mocked(marketData.getAllAssets).mockReturnValue([mockAsset, mockCryptoAsset]);
    vi.mocked(marketData.getMarketStats).mockReturnValue(mockMarketStats);
    vi.mocked(marketData.getHistoricalData).mockReturnValue([]);
    vi.mocked(marketData.searchAssets).mockReturnValue([]);
    vi.mocked(marketData.getAssetsByType).mockReturnValue([mockAsset]);
  });

  describe('useAsset', () => {
    it('should return asset data for given symbol', () => {
      const { result } = renderHook(() => useAsset('AAPL'));
      expect(result.current).toEqual(mockAsset);
    });

    it('should subscribe to market data updates', () => {
      renderHook(() => useAsset('AAPL'));
      expect(vi.mocked(marketData.subscribe)).toHaveBeenCalled();
    });

    it('should update when subscription callback is called', () => {
      const updatedAsset = { ...mockAsset, price: 155.0 };
      const assetsMap = new Map([['AAPL', updatedAsset]]);

      const { result } = renderHook(() => useAsset('AAPL'));

      act(() => {
        subscribeCallback(assetsMap);
      });

      expect(result.current).toEqual(updatedAsset);
    });

    it('should query asset with original symbol case', () => {
      const assetsMap = new Map([['AAPL', mockAsset]]);

      renderHook(() => useAsset('aapl'));

      act(() => {
        subscribeCallback(assetsMap);
      });

      expect(vi.mocked(marketData.getAsset)).toHaveBeenCalledWith('aapl');
    });

    it('should return undefined for non-existent asset', () => {
      vi.mocked(marketData.getAsset).mockReturnValue(undefined);
      const { result } = renderHook(() => useAsset('INVALID'));
      expect(result.current).toBeUndefined();
    });

    it('should unsubscribe on unmount', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(marketData.subscribe).mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useAsset('AAPL'));
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should resubscribe when symbol changes', () => {
      const { rerender } = renderHook(({ symbol }) => useAsset(symbol), {
        initialProps: { symbol: 'AAPL' },
      });

      const initialCallCount = vi.mocked(marketData.subscribe).mock.calls.length;

      rerender({ symbol: 'GOOGL' });

      expect(vi.mocked(marketData.subscribe).mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('useAssets', () => {
    it('should return map of assets for given symbols', () => {
      const assetsMap = new Map([
        ['AAPL', mockAsset],
        ['BTC', mockCryptoAsset],
      ]);

      const { result } = renderHook(() => useAssets(['AAPL', 'BTC']));

      act(() => {
        subscribeCallback(assetsMap);
      });

      expect(result.current.get('AAPL')).toEqual(mockAsset);
      expect(result.current.get('BTC')).toEqual(mockCryptoAsset);
    });

    it('should filter out non-requested symbols', () => {
      const assetsMap = new Map([
        ['AAPL', mockAsset],
        ['BTC', mockCryptoAsset],
        ['GOOGL', { ...mockAsset, symbol: 'GOOGL' }],
      ]);

      const { result } = renderHook(() => useAssets(['AAPL', 'BTC']));

      act(() => {
        subscribeCallback(assetsMap);
      });

      expect(result.current.size).toBe(2);
      expect(result.current.has('GOOGL')).toBe(false);
    });

    it('should handle empty symbols array', () => {
      const { result } = renderHook(() => useAssets([]));
      expect(result.current.size).toBe(0);
    });

    it('should convert symbols to uppercase', () => {
      const assetsMap = new Map([['AAPL', mockAsset]]);

      const { result } = renderHook(() => useAssets(['aapl']));

      act(() => {
        subscribeCallback(assetsMap);
      });

      expect(result.current.has('AAPL')).toBe(true);
    });
  });

  describe('useAllAssets', () => {
    it('should return all assets when no type specified', () => {
      const { result: _result } = renderHook(() => useAllAssets());

      act(() => {
        subscribeCallback(new Map());
      });

      expect(vi.mocked(marketData.getAllAssets)).toHaveBeenCalled();
    });

    it('should filter by type when specified', () => {
      renderHook(() => useAllAssets('stock'));

      act(() => {
        subscribeCallback(new Map());
      });

      expect(vi.mocked(marketData.getAssetsByType)).toHaveBeenCalledWith('stock');
    });

    it('should filter by crypto type', () => {
      renderHook(() => useAllAssets('crypto'));

      act(() => {
        subscribeCallback(new Map());
      });

      expect(vi.mocked(marketData.getAssetsByType)).toHaveBeenCalledWith('crypto');
    });

    it('should update when subscription callback fires', () => {
      const { result } = renderHook(() => useAllAssets());

      const newAssets = [mockAsset, mockCryptoAsset];
      vi.mocked(marketData.getAllAssets).mockReturnValue(newAssets);

      act(() => {
        subscribeCallback(new Map());
      });

      expect(result.current).toEqual(newAssets);
    });
  });

  describe('useAssetSearch', () => {
    it('should return empty array for empty query', () => {
      const { result } = renderHook(() => useAssetSearch(''));
      expect(result.current).toEqual([]);
    });

    it('should return empty array for whitespace-only query', () => {
      const { result } = renderHook(() => useAssetSearch('   '));
      expect(result.current).toEqual([]);
    });

    it('should search assets with query', () => {
      vi.mocked(marketData.searchAssets).mockReturnValue([mockAsset]);

      const { result } = renderHook(() => useAssetSearch('AAPL'));

      act(() => {
        subscribeCallback(new Map());
      });

      expect(vi.mocked(marketData.searchAssets)).toHaveBeenCalledWith('AAPL');
      expect(result.current).toEqual([mockAsset]);
    });

    it('should update results on subscription callback', () => {
      const initialResults = [mockAsset];
      const updatedResults = [mockAsset, mockCryptoAsset];

      vi.mocked(marketData.searchAssets).mockReturnValueOnce(initialResults);

      const { result } = renderHook(() => useAssetSearch('A'));

      act(() => {
        subscribeCallback(new Map());
      });

      vi.mocked(marketData.searchAssets).mockReturnValue(updatedResults);

      act(() => {
        subscribeCallback(new Map());
      });

      expect(result.current).toEqual(updatedResults);
    });
  });

  describe('useMarketStats', () => {
    it('should return market stats', () => {
      const { result } = renderHook(() => useMarketStats());
      expect(result.current).toEqual(mockMarketStats);
    });

    it('should update on subscription callback', () => {
      const { result } = renderHook(() => useMarketStats());

      const newStats = { ...mockMarketStats, totalMarketCap: 6000000000000 };
      vi.mocked(marketData.getMarketStats).mockReturnValue(newStats);

      act(() => {
        subscribeCallback(new Map());
      });

      expect(result.current).toEqual(newStats);
    });
  });

  describe('useHistoricalData', () => {
    const mockHistoricalData = [
      { time: 1704067200, price: 150.0 },
      { time: 1704153600, price: 152.5 },
    ];

    it('should return historical data for symbol and default period', () => {
      vi.mocked(marketData.getHistoricalData).mockReturnValue(mockHistoricalData);

      const { result } = renderHook(() => useHistoricalData('AAPL'));

      expect(vi.mocked(marketData.getHistoricalData)).toHaveBeenCalledWith('AAPL', '1d');
      expect(result.current).toEqual(mockHistoricalData);
    });

    it('should use specified period', () => {
      vi.mocked(marketData.getHistoricalData).mockReturnValue(mockHistoricalData);

      renderHook(() => useHistoricalData('AAPL', '30d'));

      expect(vi.mocked(marketData.getHistoricalData)).toHaveBeenCalledWith('AAPL', '30d');
    });

    it('should update on subscription callback', () => {
      const newData = [...mockHistoricalData, { time: 1704240000, price: 155.0 }];
      vi.mocked(marketData.getHistoricalData).mockReturnValue(mockHistoricalData);

      const { result } = renderHook(() => useHistoricalData('AAPL'));

      vi.mocked(marketData.getHistoricalData).mockReturnValue(newData);

      act(() => {
        subscribeCallback(new Map());
      });

      expect(result.current).toEqual(newData);
    });

    it('should support all period options', () => {
      const periods = ['1d', '7d', '30d', '1y', 'all'] as const;

      periods.forEach((period) => {
        renderHook(() => useHistoricalData('AAPL', period));
        expect(vi.mocked(marketData.getHistoricalData)).toHaveBeenCalledWith('AAPL', period);
      });
    });
  });

  describe('usePortfolioPrices', () => {
    const holdings = [
      { symbol: 'AAPL', shares: 10 },
      { symbol: 'BTC', shares: 0.5 },
    ];

    beforeEach(() => {
      vi.mocked(marketData.getAsset).mockImplementation((symbol: string) => {
        if (symbol === 'AAPL') return mockAsset;
        if (symbol === 'BTC') return mockCryptoAsset;
        return undefined;
      });
    });

    it('should calculate portfolio prices and value', () => {
      const { result } = renderHook(() => usePortfolioPrices(holdings));

      // AAPL: 150.50 * 10 = 1505
      // BTC: 45000 * 0.5 = 22500
      // Total: 24005
      expect(result.current.totalValue).toBeCloseTo(24005, 0);
    });

    it('should return prices map', () => {
      const { result } = renderHook(() => usePortfolioPrices(holdings));

      expect(result.current.prices.get('AAPL')).toBe(150.5);
      expect(result.current.prices.get('BTC')).toBe(45000);
    });

    it('should calculate total change', () => {
      const { result } = renderHook(() => usePortfolioPrices(holdings));

      // AAPL: (150.50 - 148.00) * 10 = 25
      // BTC: (45000 - 43500) * 0.5 = 750
      // Total change: 775
      expect(result.current.totalChange).toBeCloseTo(775, 0);
    });

    it('should calculate change percent', () => {
      const { result } = renderHook(() => usePortfolioPrices(holdings));

      // Previous value: 148 * 10 + 43500 * 0.5 = 1480 + 21750 = 23230
      // Change: 775
      // Percent: 775 / 23230 * 100 = ~3.34%
      expect(result.current.totalChangePercent).toBeCloseTo(3.34, 1);
    });

    it('should handle empty holdings', () => {
      const { result } = renderHook(() => usePortfolioPrices([]));

      expect(result.current.totalValue).toBe(0);
      expect(result.current.totalChange).toBe(0);
      expect(result.current.totalChangePercent).toBe(0);
      expect(result.current.prices.size).toBe(0);
    });

    it('should skip unknown assets', () => {
      const holdingsWithUnknown = [
        { symbol: 'AAPL', shares: 10 },
        { symbol: 'UNKNOWN', shares: 100 },
      ];

      const { result } = renderHook(() => usePortfolioPrices(holdingsWithUnknown));

      // Should only include AAPL value
      expect(result.current.totalValue).toBeCloseTo(1505, 0);
    });

    it('should update on subscription callback', () => {
      const { result } = renderHook(() => usePortfolioPrices(holdings));

      const updatedAsset = { ...mockAsset, price: 160.0, previousClose: 150.0 };
      vi.mocked(marketData.getAsset).mockImplementation((symbol: string) => {
        if (symbol === 'AAPL') return updatedAsset;
        if (symbol === 'BTC') return mockCryptoAsset;
        return undefined;
      });

      act(() => {
        subscribeCallback(new Map());
      });

      // New value: 160 * 10 + 45000 * 0.5 = 1600 + 22500 = 24100
      expect(result.current.totalValue).toBeCloseTo(24100, 0);
    });
  });

  describe('useTopMovers', () => {
    it('should return gainers and losers', () => {
      const gainers = [mockAsset];
      const losers = [{ ...mockCryptoAsset, change: -1000, changePercent: -2.5 }];

      vi.mocked(marketData.getMarketStats).mockReturnValue({
        ...mockMarketStats,
        gainers,
        losers,
      });

      const { result } = renderHook(() => useTopMovers());

      act(() => {
        subscribeCallback(new Map());
      });

      expect(result.current.gainers).toEqual(gainers);
      expect(result.current.losers).toEqual(losers);
    });

    it('should update on subscription callback', () => {
      const { result } = renderHook(() => useTopMovers());

      const newGainers = [mockCryptoAsset];
      vi.mocked(marketData.getMarketStats).mockReturnValue({
        ...mockMarketStats,
        gainers: newGainers,
        losers: [],
      });

      act(() => {
        subscribeCallback(new Map());
      });

      expect(result.current.gainers).toEqual(newGainers);
    });

    it('should return empty arrays when no movers', () => {
      vi.mocked(marketData.getMarketStats).mockReturnValue({
        ...mockMarketStats,
        gainers: [],
        losers: [],
      });

      const { result } = renderHook(() => useTopMovers());

      act(() => {
        subscribeCallback(new Map());
      });

      expect(result.current.gainers).toEqual([]);
      expect(result.current.losers).toEqual([]);
    });
  });

  describe('useAssetFormatter', () => {
    describe('formatPrice', () => {
      it('should format stock prices with 2 decimal places', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatPrice(150.5)).toBe('$150.50');
      });

      it('should format large stock prices with commas', () => {
        const largeAsset = { ...mockAsset, price: 1500.5 };
        vi.mocked(marketData.getAsset).mockReturnValue(largeAsset);

        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatPrice(1500.5)).toBe('$1,500.50');
      });

      it('should format very small crypto prices with 6 decimals', () => {
        const smallCrypto = { ...mockCryptoAsset, price: 0.001234 };
        vi.mocked(marketData.getAsset).mockReturnValue(smallCrypto);

        const { result } = renderHook(() => useAssetFormatter('BTC'));
        expect(result.current.formatPrice(0.001234)).toBe('$0.001234');
      });

      it('should format small crypto prices with 4 decimals', () => {
        const smallCrypto = { ...mockCryptoAsset, price: 0.5 };
        vi.mocked(marketData.getAsset).mockReturnValue(smallCrypto);

        const { result } = renderHook(() => useAssetFormatter('BTC'));
        expect(result.current.formatPrice(0.5)).toBe('$0.5000');
      });

      it('should format medium crypto prices with 2 decimals', () => {
        const mediumCrypto = { ...mockCryptoAsset, price: 50.0 };
        vi.mocked(marketData.getAsset).mockReturnValue(mediumCrypto);

        const { result } = renderHook(() => useAssetFormatter('BTC'));
        expect(result.current.formatPrice(50.0)).toBe('$50.00');
      });

      it('should format large crypto prices with commas', () => {
        vi.mocked(marketData.getAsset).mockReturnValue(mockCryptoAsset);

        const { result } = renderHook(() => useAssetFormatter('BTC'));
        expect(result.current.formatPrice(45000)).toBe('$45,000.00');
      });

      it('should fallback to 2 decimals when no asset', () => {
        vi.mocked(marketData.getAsset).mockReturnValue(undefined);

        const { result } = renderHook(() => useAssetFormatter('UNKNOWN'));
        expect(result.current.formatPrice(100.123)).toBe('$100.12');
      });
    });

    describe('formatChange', () => {
      it('should format positive change with plus sign', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatChange(2.5, 1.69)).toBe('+$2.50 (+1.69%)');
      });

      it('should format negative change correctly', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatChange(-2.5, -1.69)).toBe('$2.50 (-1.69%)');
      });

      it('should format zero change', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatChange(0, 0)).toBe('+$0.00 (+0.00%)');
      });
    });

    describe('formatMarketCap', () => {
      it('should format trillions', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatMarketCap(2500000000000)).toBe('$2.50T');
      });

      it('should format billions', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatMarketCap(500000000000)).toBe('$500.00B');
      });

      it('should format millions', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatMarketCap(500000000)).toBe('$500.00M');
      });

      it('should format smaller values with commas', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatMarketCap(500000)).toBe('$500,000');
      });
    });

    describe('formatVolume', () => {
      it('should format billions', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatVolume(50000000000)).toBe('$50.00B');
      });

      it('should format millions', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatVolume(50000000)).toBe('$50.00M');
      });

      it('should format thousands', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatVolume(50000)).toBe('$50.00K');
      });

      it('should format smaller values with commas', () => {
        const { result } = renderHook(() => useAssetFormatter('AAPL'));
        expect(result.current.formatVolume(500)).toBe('$500');
      });
    });
  });
});
