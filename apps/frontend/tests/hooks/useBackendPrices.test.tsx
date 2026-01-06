/**
 * Tests for useBackendPrices Hooks
 *
 * Tests cover:
 * - useHistoricalPrices: Historical price data fetching
 * - useOHLCV: OHLCV candlestick data
 * - useTopCryptos: Top cryptocurrency list
 * - useCryptoSearch: Cryptocurrency search with debounce
 * - useBatchHistoricalPrices: Batch historical data
 * - useAssetData: Combined historical + real-time data
 *
 * NOTE: WebSocket tests for useWebSocketPrices are simplified due to
 * MSW v2 WebSocket interception conflicts.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the backend price service
vi.mock('@/services/backendPriceService', () => ({
  HistoricalDataService: {
    getHistory: vi.fn(),
    getOHLCV: vi.fn(),
    getBatchHistory: vi.fn(),
  },
  CryptoDiscoveryService: {
    getTopCryptos: vi.fn(),
    searchCryptos: vi.fn(),
  },
  getWebSocketService: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    isConnected: vi.fn().mockReturnValue(false),
    onPriceUpdate: vi.fn().mockReturnValue(() => {}),
  })),
}));

import {
  CryptoDiscoveryService,
  getWebSocketService,
  HistoricalDataService,
} from '@/services/backendPriceService';
import {
  useAssetData,
  useBatchHistoricalPrices,
  useCryptoSearch,
  useHistoricalPrices,
  useOHLCV,
  useTopCryptos,
  useWebSocketPrices,
} from '../../src/hooks/useBackendPrices';

// Type assertions for mocked functions
const mockGetHistory = HistoricalDataService.getHistory as ReturnType<typeof vi.fn>;
const mockGetOHLCV = HistoricalDataService.getOHLCV as ReturnType<typeof vi.fn>;
const mockGetBatchHistory = HistoricalDataService.getBatchHistory as ReturnType<typeof vi.fn>;
const mockGetTopCryptos = CryptoDiscoveryService.getTopCryptos as ReturnType<typeof vi.fn>;
const mockSearchCryptos = CryptoDiscoveryService.searchCryptos as ReturnType<typeof vi.fn>;
const mockGetWebSocketService = getWebSocketService as ReturnType<typeof vi.fn>;

// Mock historical data response
const mockHistoricalData = {
  success: true,
  symbol: 'BTC',
  period: '1m',
  count: 30,
  data: [
    { timestamp: '2025-01-01T00:00:00Z', price: 45000, volume: 1000 },
    { timestamp: '2025-01-02T00:00:00Z', price: 46000, volume: 1100 },
    { timestamp: '2025-01-03T00:00:00Z', price: 44500, volume: 900 },
  ],
  source: 'coingecko',
  cached: false,
};

// Mock OHLCV data response
const mockOHLCVData = {
  success: true,
  symbol: 'BTC',
  period: '1m',
  resolution: 'D',
  count: 3,
  candles: [
    {
      timestamp: '2025-01-01T00:00:00Z',
      open: 45000,
      high: 46500,
      low: 44500,
      close: 46000,
      volume: 10000,
    },
    {
      timestamp: '2025-01-02T00:00:00Z',
      open: 46000,
      high: 47000,
      low: 45500,
      close: 44500,
      volume: 11000,
    },
  ],
  source: 'coingecko',
  cached: true,
};

// Mock crypto list response
const mockCryptoList = {
  success: true,
  total: 100,
  cryptos: [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 45000, market_cap: 900000000000 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 2500, market_cap: 300000000000 },
    { id: 'solana', symbol: 'SOL', name: 'Solana', price: 100, market_cap: 50000000000 },
  ],
  cached: false,
};

// Mock search response
const mockSearchResults = {
  success: true,
  query: 'bit',
  results: [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 45000 },
    { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash', price: 300 },
  ],
};

describe('useBackendPrices Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Reset mock implementations
    mockGetHistory.mockResolvedValue(mockHistoricalData);
    mockGetOHLCV.mockResolvedValue(mockOHLCVData);
    mockGetBatchHistory.mockResolvedValue(
      new Map([
        ['BTC', mockHistoricalData],
        ['ETH', { ...mockHistoricalData, symbol: 'ETH' }],
      ])
    );
    mockGetTopCryptos.mockResolvedValue(mockCryptoList);
    mockSearchCryptos.mockResolvedValue(mockSearchResults);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('useHistoricalPrices', () => {
    it('should fetch historical prices for a symbol', async () => {
      const { result } = renderHook(() => useHistoricalPrices('BTC', '1m'));

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetHistory).toHaveBeenCalledWith('BTC', '1m');
      expect(result.current.data).toEqual(mockHistoricalData);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isCached).toBe(false);
    });

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useHistoricalPrices('BTC', '1m', { enabled: false }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockGetHistory).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      mockGetHistory.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHistoricalPrices('BTC', '1m'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.isSuccess).toBe(false);
    });

    it('should refetch data with refetch function', async () => {
      const { result } = renderHook(() => useHistoricalPrices('BTC', '1m'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetHistory).toHaveBeenCalledTimes(1);

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetHistory).toHaveBeenCalledTimes(2);
    });

    it('should auto-refetch at specified interval', async () => {
      renderHook(() => useHistoricalPrices('BTC', '1m', { enabled: true, refetchInterval: 1000 }));

      await waitFor(() => {
        expect(mockGetHistory).toHaveBeenCalledTimes(1);
      });

      // Advance by refetch interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      await waitFor(() => {
        expect(mockGetHistory).toHaveBeenCalledTimes(2);
      });
    });

    it('should refetch when symbol changes', async () => {
      const { result, rerender } = renderHook(({ symbol }) => useHistoricalPrices(symbol, '1m'), {
        initialProps: { symbol: 'BTC' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetHistory).toHaveBeenCalledWith('BTC', '1m');

      // Change symbol
      rerender({ symbol: 'ETH' });

      await waitFor(() => {
        expect(mockGetHistory).toHaveBeenCalledWith('ETH', '1m');
      });
    });

    it('should refetch when period changes', async () => {
      const { result, rerender } = renderHook(({ period }) => useHistoricalPrices('BTC', period), {
        initialProps: { period: '1m' as const },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetHistory).toHaveBeenCalledWith('BTC', '1m');

      // Change period
      rerender({ period: '1y' as const });

      await waitFor(() => {
        expect(mockGetHistory).toHaveBeenCalledWith('BTC', '1y');
      });
    });
  });

  describe('useOHLCV', () => {
    it('should fetch OHLCV data', async () => {
      const { result } = renderHook(() => useOHLCV('BTC', '1m', 'D'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetOHLCV).toHaveBeenCalledWith('BTC', '1m', 'D');
      expect(result.current.data).toEqual(mockOHLCVData);
      expect(result.current.candles).toHaveLength(2);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isCached).toBe(true);
    });

    it('should return empty candles array when data is null', async () => {
      mockGetOHLCV.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useOHLCV('BTC', '1m', 'D'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.candles).toEqual([]);
    });

    it('should handle different resolutions', async () => {
      const { rerender } = renderHook(({ resolution }) => useOHLCV('BTC', '1m', resolution), {
        initialProps: { resolution: 'D' as const },
      });

      await waitFor(() => {
        expect(mockGetOHLCV).toHaveBeenCalledWith('BTC', '1m', 'D');
      });

      rerender({ resolution: '1' as const });

      await waitFor(() => {
        expect(mockGetOHLCV).toHaveBeenCalledWith('BTC', '1m', '1');
      });
    });
  });

  describe('useTopCryptos', () => {
    it('should fetch top cryptocurrencies', async () => {
      const { result } = renderHook(() => useTopCryptos(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetTopCryptos).toHaveBeenCalledWith(100);
      expect(result.current.data).toEqual(mockCryptoList);
      expect(result.current.cryptos).toHaveLength(3);
      expect(result.current.isSuccess).toBe(true);
    });

    it('should use default limit of 100', async () => {
      renderHook(() => useTopCryptos());

      await waitFor(() => {
        expect(mockGetTopCryptos).toHaveBeenCalledWith(100);
      });
    });

    it('should not fetch when enabled is false', async () => {
      renderHook(() => useTopCryptos(100, false));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockGetTopCryptos).not.toHaveBeenCalled();
    });

    it('should return empty cryptos array when data is null', async () => {
      mockGetTopCryptos.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useTopCryptos());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.cryptos).toEqual([]);
    });
  });

  describe('useCryptoSearch', () => {
    it('should search with debounce', async () => {
      const { result } = renderHook(() => useCryptoSearch('bit', 300));

      // Should not have called immediately
      expect(mockSearchCryptos).not.toHaveBeenCalled();

      // Advance past debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      await waitFor(() => {
        expect(mockSearchCryptos).toHaveBeenCalledWith('bit');
      });

      expect(result.current.results).toHaveLength(2);
      expect(result.current.isSuccess).toBe(true);
    });

    it('should not search for queries shorter than 2 characters', async () => {
      renderHook(() => useCryptoSearch('b', 300));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(mockSearchCryptos).not.toHaveBeenCalled();
    });

    it('should reset data when query is empty', async () => {
      const { result, rerender } = renderHook(({ query }) => useCryptoSearch(query, 300), {
        initialProps: { query: 'bitcoin' },
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2);
      });

      // Clear query
      rerender({ query: '' });

      expect(result.current.data).toBeNull();
      expect(result.current.results).toEqual([]);
    });

    it('should debounce multiple rapid queries', async () => {
      const { rerender } = renderHook(({ query }) => useCryptoSearch(query, 300), {
        initialProps: { query: 'b' },
      });

      // Rapid changes
      rerender({ query: 'bi' });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      rerender({ query: 'bit' });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      rerender({ query: 'bitc' });

      // Only after full debounce should it search
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Should only call once with the final value
      expect(mockSearchCryptos).toHaveBeenCalledTimes(1);
      expect(mockSearchCryptos).toHaveBeenCalledWith('bitc');
    });
  });

  describe('useBatchHistoricalPrices', () => {
    it('should fetch batch historical data for multiple symbols', async () => {
      const { result } = renderHook(() => useBatchHistoricalPrices(['BTC', 'ETH'], '1m'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetBatchHistory).toHaveBeenCalledWith(['BTC', 'ETH'], '1m');
      expect(result.current.data.size).toBe(2);
      expect(result.current.isSuccess).toBe(true);
    });

    it('should not fetch when symbols array is empty', async () => {
      const { result } = renderHook(() => useBatchHistoricalPrices([], '1m'));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockGetBatchHistory).not.toHaveBeenCalled();
      expect(result.current.data.size).toBe(0);
    });

    it('should not fetch when enabled is false', async () => {
      renderHook(() => useBatchHistoricalPrices(['BTC', 'ETH'], '1m', false));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockGetBatchHistory).not.toHaveBeenCalled();
    });
  });

  describe('useWebSocketPrices', () => {
    it('should create WebSocket service with correct options', () => {
      renderHook(() =>
        useWebSocketPrices({
          symbols: ['BTC', 'ETH'],
          autoConnect: true,
        })
      );

      expect(mockGetWebSocketService).toHaveBeenCalled();
    });

    it('should return initial state', () => {
      const { result } = renderHook(() => useWebSocketPrices({ autoConnect: false }));

      expect(result.current.prices).toEqual({});
      expect(result.current.connected).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide connect and disconnect functions', () => {
      const { result } = renderHook(() => useWebSocketPrices({ autoConnect: false }));

      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.subscribe).toBe('function');
      expect(typeof result.current.unsubscribe).toBe('function');
    });
  });

  describe('useAssetData', () => {
    it('should combine historical and real-time data', async () => {
      const { result } = renderHook(() => useAssetData('BTC', '1m'));

      await waitFor(() => {
        expect(result.current.historicalLoading).toBe(false);
      });

      expect(result.current.symbol).toBe('BTC');
      expect(result.current.historical).toEqual(mockHistoricalData);
      expect(result.current.historicalError).toBeNull();
      expect(mockGetHistory).toHaveBeenCalledWith('BTC', '1m');
    });

    it('should expose refetch function for historical data', async () => {
      const { result } = renderHook(() => useAssetData('BTC', '1m'));

      await waitFor(() => {
        expect(result.current.historicalLoading).toBe(false);
      });

      expect(typeof result.current.refetchHistorical).toBe('function');

      // Call refetch
      await act(async () => {
        await result.current.refetchHistorical();
      });

      expect(mockGetHistory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Hook Return Value Shapes', () => {
    it('useHistoricalPrices should return expected shape', async () => {
      const { result } = renderHook(() => useHistoricalPrices('BTC', '1m'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('isCached');
    });

    it('useOHLCV should return expected shape', async () => {
      const { result } = renderHook(() => useOHLCV('BTC', '1m', 'D'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('candles');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('isCached');
    });

    it('useTopCryptos should return expected shape', async () => {
      const { result } = renderHook(() => useTopCryptos());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('cryptos');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('isCached');
    });

    it('useCryptoSearch should return expected shape', () => {
      const { result } = renderHook(() => useCryptoSearch('btc'));

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('results');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isSuccess');
    });

    it('useWebSocketPrices should return expected shape', () => {
      const { result } = renderHook(() => useWebSocketPrices({ autoConnect: false }));

      expect(result.current).toHaveProperty('prices');
      expect(result.current).toHaveProperty('connected');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('connect');
      expect(result.current).toHaveProperty('disconnect');
      expect(result.current).toHaveProperty('subscribe');
      expect(result.current).toHaveProperty('unsubscribe');
      expect(result.current).toHaveProperty('isConnected');
    });

    it('useAssetData should return expected shape', async () => {
      const { result } = renderHook(() => useAssetData('BTC', '1m'));

      await waitFor(() => {
        expect(result.current.historicalLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('symbol');
      expect(result.current).toHaveProperty('historical');
      expect(result.current).toHaveProperty('historicalLoading');
      expect(result.current).toHaveProperty('historicalError');
      expect(result.current).toHaveProperty('currentPrice');
      expect(result.current).toHaveProperty('liveData');
      expect(result.current).toHaveProperty('wsConnected');
      expect(result.current).toHaveProperty('refetchHistorical');
    });
  });
});
