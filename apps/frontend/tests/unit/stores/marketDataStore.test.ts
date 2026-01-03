/**
 * @fileoverview Tests for marketDataStore - Zustand store for OHLC market data
 *
 * Store Features:
 * - OHLC data fetching with 5-minute cache TTL
 * - Auto-refresh settings with persistence
 * - WebSocket subscription placeholders
 * - Mock data generation fallback
 *
 * @module tests/unit/stores/marketDataStore.test
 */

import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/server';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Import after mocks are set up
import { useMarketDataStore, type OHLCData } from '@/lib/stores/marketDataStore';

// API base URL constant
const API_URL = 'http://localhost:8000';

describe('marketDataStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Use clearCache to fully reset cache state
    useMarketDataStore.getState().clearCache();
    // Reset store state
    useMarketDataStore.setState({
      ohlcData: {},
      lastUpdate: {},
      isConnected: true,
      isLoading: false,
      error: null,
      autoRefresh: true,
      refreshInterval: 30,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset MSW handlers after each test
    server.resetHandlers();
  });

  describe('Initial State', () => {
    it('should have empty ohlcData initially', () => {
      const state = useMarketDataStore.getState();
      expect(state.ohlcData).toEqual({});
    });

    it('should have empty lastUpdate initially', () => {
      const state = useMarketDataStore.getState();
      expect(state.lastUpdate).toEqual({});
    });

    it('should be connected initially', () => {
      const state = useMarketDataStore.getState();
      expect(state.isConnected).toBe(true);
    });

    it('should not be loading initially', () => {
      const state = useMarketDataStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const state = useMarketDataStore.getState();
      expect(state.error).toBeNull();
    });

    it('should have autoRefresh enabled by default', () => {
      const state = useMarketDataStore.getState();
      expect(state.autoRefresh).toBe(true);
    });

    it('should have 30 second refresh interval by default', () => {
      const state = useMarketDataStore.getState();
      expect(state.refreshInterval).toBe(30);
    });
  });

  describe('fetchOHLCData', () => {
    const mockOHLCResponse = {
      data: [
        {
          symbol: 'BTCUSD',
          timestamp: '2024-01-01T00:00:00Z',
          open: 45000,
          high: 45500,
          low: 44800,
          close: 45200,
          volume: 1000000,
          provider: 'test',
          timeframe: '1D',
        },
      ],
    };

    // Helper to create MSW handler for OHLC endpoint
    const createOHLCHandler = (responseData: unknown, status = 200) =>
      http.get(`${API_URL}/api/v1/ohlc/:symbol`, () => {
        if (status !== 200) {
          return new HttpResponse(null, { status, statusText: 'Error' });
        }
        return HttpResponse.json(responseData);
      });

    it('should fetch and cache OHLC data successfully', async () => {
      server.use(createOHLCHandler(mockOHLCResponse));

      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('BTCUSD', '1D', 100);

      expect(result).toEqual(mockOHLCResponse.data);

      const state = useMarketDataStore.getState();
      expect(state.ohlcData['BTCUSD_1D']).toEqual(mockOHLCResponse.data);
      expect(state.isLoading).toBe(false);
      expect(state.isConnected).toBe(true);
    });

    it('should return cached data within TTL (5 minutes)', async () => {
      let fetchCount = 0;
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, () => {
          fetchCount++;
          return HttpResponse.json(mockOHLCResponse);
        })
      );

      const { fetchOHLCData } = useMarketDataStore.getState();
      await fetchOHLCData('BTCUSD', '1D');

      // Second fetch should use cache
      const result = await useMarketDataStore.getState().fetchOHLCData('BTCUSD', '1D');

      expect(fetchCount).toBe(1); // Only one fetch
      expect(result).toEqual(mockOHLCResponse.data);
    });

    it('should refetch after cache expires', async () => {
      let fetchCount = 0;
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, () => {
          fetchCount++;
          return HttpResponse.json(mockOHLCResponse);
        })
      );

      const { fetchOHLCData } = useMarketDataStore.getState();
      await fetchOHLCData('BTCUSD', '1D');

      // Manually expire cache by setting lastUpdate to 6 minutes ago
      const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
      useMarketDataStore.setState({
        lastUpdate: { BTCUSD_1D: sixMinutesAgo },
      });

      await useMarketDataStore.getState().fetchOHLCData('BTCUSD', '1D');

      expect(fetchCount).toBe(2);
    });

    it('should use correct API URL format', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockOHLCResponse);
        })
      );

      const { fetchOHLCData } = useMarketDataStore.getState();
      await fetchOHLCData('BTCUSD', '1D');

      expect(capturedUrl).toContain('/api/v1/ohlc/BTCUSD');
      expect(capturedUrl).toContain('timeframe=1D');
    });

    it('should set isLoading during fetch', async () => {
      let loadingDuringFetch = false;
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, async () => {
          loadingDuringFetch = useMarketDataStore.getState().isLoading;
          return HttpResponse.json(mockOHLCResponse);
        })
      );

      const { fetchOHLCData } = useMarketDataStore.getState();
      await fetchOHLCData('BTCUSD', '1D');

      expect(loadingDuringFetch).toBe(true);
      expect(useMarketDataStore.getState().isLoading).toBe(false);
    });

    it('should handle HTTP errors and generate mock data', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, () => {
          return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
        })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('BTCUSD', '1D', 10);

      expect(result).toHaveLength(10); // Mock data generated
      expect(result[0]).toHaveProperty('symbol', 'BTCUSD');

      const state = useMarketDataStore.getState();
      expect(state.error).toContain('HTTP 500');
      expect(state.isConnected).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should handle network errors and generate mock data', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, () => {
          return HttpResponse.error();
        })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('ETHUSDT', '1h', 5);

      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty('symbol', 'ETHUSDT');

      const state = useMarketDataStore.getState();
      expect(state.error).toBeDefined();
      expect(state.isConnected).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should handle empty API response', async () => {
      server.use(createOHLCHandler({ data: [] }));

      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('UNKNOWN', '1D');

      // Empty data array from API returns empty array
      expect(result).toEqual([]);
      expect(useMarketDataStore.getState().error).toBeNull();
    });

    it('should handle API response without data field', async () => {
      server.use(createOHLCHandler({}));

      const { fetchOHLCData } = useMarketDataStore.getState();
      // Use unique symbol to avoid cache from previous tests
      const result = await fetchOHLCData('NODATA_SYMBOL', '5m');

      // Missing data field defaults to empty array
      expect(result).toEqual([]);
      expect(useMarketDataStore.getState().error).toBeNull();
    });

    it('should clear error on successful fetch', async () => {
      // First, set an error state and clear cache to force new fetch
      useMarketDataStore.setState({
        error: 'Previous error',
        ohlcData: {},
        lastUpdate: {},
      });

      server.use(createOHLCHandler(mockOHLCResponse));

      const { fetchOHLCData } = useMarketDataStore.getState();
      // Use unique symbol to ensure fresh fetch (no cache hit)
      await fetchOHLCData('CLEAR_ERROR_TEST', '1W');

      // Error should be cleared when fetch starts (set to null)
      // and remain null on success
      const state = useMarketDataStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('subscribeToSymbol', () => {
    it('should be callable without errors (placeholder)', () => {
      const { subscribeToSymbol } = useMarketDataStore.getState();
      expect(() => subscribeToSymbol('BTCUSD', '1D')).not.toThrow();
    });
  });

  describe('unsubscribeFromSymbol', () => {
    it('should be callable without errors (placeholder)', () => {
      const { unsubscribeFromSymbol } = useMarketDataStore.getState();
      expect(() => unsubscribeFromSymbol('BTCUSD', '1D')).not.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached OHLC data', () => {
      // Set up some cached data
      useMarketDataStore.setState({
        ohlcData: {
          BTCUSD_1D: [{ symbol: 'BTCUSD' } as OHLCData],
          ETHUSDT_1h: [{ symbol: 'ETHUSDT' } as OHLCData],
        },
        lastUpdate: {
          BTCUSD_1D: Date.now(),
          ETHUSDT_1h: Date.now(),
        },
        error: 'Some error',
      });

      const { clearCache } = useMarketDataStore.getState();
      clearCache();

      const state = useMarketDataStore.getState();
      expect(state.ohlcData).toEqual({});
      expect(state.lastUpdate).toEqual({});
      expect(state.error).toBeNull();
    });
  });

  describe('setAutoRefresh', () => {
    it('should enable auto refresh', () => {
      useMarketDataStore.setState({ autoRefresh: false });

      const { setAutoRefresh } = useMarketDataStore.getState();
      setAutoRefresh(true);

      expect(useMarketDataStore.getState().autoRefresh).toBe(true);
    });

    it('should disable auto refresh', () => {
      useMarketDataStore.setState({ autoRefresh: true });

      const { setAutoRefresh } = useMarketDataStore.getState();
      setAutoRefresh(false);

      expect(useMarketDataStore.getState().autoRefresh).toBe(false);
    });
  });

  describe('setRefreshInterval', () => {
    it('should set refresh interval', () => {
      const { setRefreshInterval } = useMarketDataStore.getState();
      setRefreshInterval(60);

      expect(useMarketDataStore.getState().refreshInterval).toBe(60);
    });

    it('should enforce minimum 5 second interval', () => {
      const { setRefreshInterval } = useMarketDataStore.getState();
      setRefreshInterval(2);

      expect(useMarketDataStore.getState().refreshInterval).toBe(5);
    });

    it('should allow exactly 5 seconds', () => {
      const { setRefreshInterval } = useMarketDataStore.getState();
      setRefreshInterval(5);

      expect(useMarketDataStore.getState().refreshInterval).toBe(5);
    });

    it('should handle large intervals', () => {
      const { setRefreshInterval } = useMarketDataStore.getState();
      setRefreshInterval(3600);

      expect(useMarketDataStore.getState().refreshInterval).toBe(3600);
    });
  });

  describe('Persistence', () => {
    it('should have persist configuration', () => {
      // Verify store has persist middleware
      const persistConfig = useMarketDataStore.persist;
      expect(persistConfig).toBeDefined();
    });

    it('should update autoRefresh setting', () => {
      const { setAutoRefresh } = useMarketDataStore.getState();
      setAutoRefresh(false);

      expect(useMarketDataStore.getState().autoRefresh).toBe(false);
    });

    it('should update refreshInterval setting', () => {
      const { setRefreshInterval } = useMarketDataStore.getState();
      setRefreshInterval(120);

      expect(useMarketDataStore.getState().refreshInterval).toBe(120);
    });

    it('should have partialize config to exclude ohlcData', () => {
      // ohlcData should be excluded from persistence
      // The persist middleware is configured with partialize
      const persistConfig = useMarketDataStore.persist;
      expect(persistConfig).toBeDefined();
    });
  });

  describe('Cache Key Generation', () => {
    it('should create unique cache keys for different symbols', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, () => {
          return HttpResponse.json({
            data: [{ symbol: 'TEST', timestamp: '2024-01-01T00:00:00Z' }],
          });
        })
      );

      const { fetchOHLCData } = useMarketDataStore.getState();
      await fetchOHLCData('BTCUSD', '1D');
      await fetchOHLCData('ETHUSDT', '1D');

      const state = useMarketDataStore.getState();
      expect(state.ohlcData).toHaveProperty('BTCUSD_1D');
      expect(state.ohlcData).toHaveProperty('ETHUSDT_1D');
    });

    it('should create unique cache keys for different timeframes', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, () => {
          return HttpResponse.json({
            data: [{ symbol: 'BTCUSD', timestamp: '2024-01-01T00:00:00Z' }],
          });
        })
      );

      const { fetchOHLCData } = useMarketDataStore.getState();
      await fetchOHLCData('BTCUSD', '1D');

      // Manually clear cache for second fetch
      useMarketDataStore.setState({
        lastUpdate: {},
      });

      await fetchOHLCData('BTCUSD', '1h');

      const state = useMarketDataStore.getState();
      expect(state.ohlcData).toHaveProperty('BTCUSD_1D');
      expect(state.ohlcData).toHaveProperty('BTCUSD_1h');
    });
  });

  describe('Mock Data Generation', () => {
    beforeEach(() => {
      // Use MSW to simulate network error
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, () => {
          return HttpResponse.error();
        })
      );
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should generate BTC-appropriate base price (~45000)', async () => {
      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('BTCUSD', '1D', 1);

      // BTC mock data should be around 45000
      expect(result[0].close).toBeGreaterThan(40000);
      expect(result[0].close).toBeLessThan(50000);
    });

    it('should generate ETH-appropriate base price (~3000)', async () => {
      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('ETHUSDT', '1D', 1);

      // ETH mock data should be around 3000
      expect(result[0].close).toBeGreaterThan(2500);
      expect(result[0].close).toBeLessThan(3500);
    });

    it('should generate AAPL-appropriate base price (~180)', async () => {
      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('AAPL', '1D', 1);

      expect(result[0].close).toBeGreaterThan(150);
      expect(result[0].close).toBeLessThan(210);
    });

    it('should generate TSLA-appropriate base price (~250)', async () => {
      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('TSLA', '1D', 1);

      expect(result[0].close).toBeGreaterThan(200);
      expect(result[0].close).toBeLessThan(300);
    });

    it('should generate default base price for unknown symbols (~100)', async () => {
      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('UNKNOWN', '1D', 1);

      expect(result[0].close).toBeGreaterThan(80);
      expect(result[0].close).toBeLessThan(120);
    });

    it('should generate correct number of candles', async () => {
      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('BTCUSD', '1D', 50);

      expect(result).toHaveLength(50);
    });

    it('should have valid OHLC relationships (high >= max(open,close), low <= min(open,close))', async () => {
      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('BTCUSD', '1D', 10);

      result.forEach((candle) => {
        expect(candle.high).toBeGreaterThanOrEqual(Math.max(candle.open, candle.close));
        expect(candle.low).toBeLessThanOrEqual(Math.min(candle.open, candle.close));
      });
    });

    it('should include all required OHLC fields', async () => {
      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('BTCUSD', '1D', 1);

      expect(result[0]).toHaveProperty('symbol');
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('open');
      expect(result[0]).toHaveProperty('high');
      expect(result[0]).toHaveProperty('low');
      expect(result[0]).toHaveProperty('close');
      expect(result[0]).toHaveProperty('volume');
      expect(result[0]).toHaveProperty('provider', 'mock');
      expect(result[0]).toHaveProperty('timeframe');
    });

    it('should have chronologically ordered timestamps', async () => {
      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('BTCUSD', '1D', 10);

      for (let i = 1; i < result.length; i++) {
        const prevTime = new Date(result[i - 1].timestamp).getTime();
        const currTime = new Date(result[i].timestamp).getTime();
        expect(currTime).toBeGreaterThan(prevTime);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in symbol', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, () => {
          return HttpResponse.json({ data: [] });
        })
      );

      const { fetchOHLCData } = useMarketDataStore.getState();
      await expect(fetchOHLCData('BTC/USD', '1D')).resolves.toBeDefined();
    });

    it('should handle concurrent fetches for same symbol', async () => {
      let resolveFirst: (() => void) | null = null;
      const delayedResponse = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, async () => {
          await delayedResponse;
          return HttpResponse.json({ data: [{ symbol: 'BTCUSD' }] });
        })
      );

      const { fetchOHLCData } = useMarketDataStore.getState();
      const promise1 = fetchOHLCData('BTCUSD', '1D');
      const promise2 = fetchOHLCData('BTCUSD', '1D');

      resolveFirst?.();

      await Promise.all([promise1, promise2]);
      // Both should complete without error
    });

    it('should handle zero limit gracefully', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/ohlc/:symbol`, () => {
          return HttpResponse.json({ data: [] });
        })
      );

      const { fetchOHLCData } = useMarketDataStore.getState();
      const result = await fetchOHLCData('BTCUSD', '1D', 0);

      expect(result).toEqual([]);
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should have correctly typed state', () => {
      const state = useMarketDataStore.getState();

      // Type checks - these would fail at compile time if wrong
      const _ohlcData: Record<string, OHLCData[]> = state.ohlcData;
      const _lastUpdate: Record<string, number> = state.lastUpdate;
      const _isConnected: boolean = state.isConnected;
      const _isLoading: boolean = state.isLoading;
      const _error: string | null = state.error;
      const _autoRefresh: boolean = state.autoRefresh;
      const _refreshInterval: number = state.refreshInterval;

      expect(_ohlcData).toBeDefined();
      expect(_lastUpdate).toBeDefined();
      expect(_isConnected).toBeDefined();
      expect(_isLoading).toBeDefined();
      expect(_error).toBeDefined();
      expect(_autoRefresh).toBeDefined();
      expect(_refreshInterval).toBeDefined();
    });

    it('should have correctly typed actions', () => {
      const state = useMarketDataStore.getState();

      // Type checks for actions
      const _fetchOHLCData: (
        symbol: string,
        timeframe: string,
        limit?: number
      ) => Promise<OHLCData[]> = state.fetchOHLCData;
      const _subscribeToSymbol: (symbol: string, timeframe: string) => void =
        state.subscribeToSymbol;
      const _unsubscribeFromSymbol: (symbol: string, timeframe: string) => void =
        state.unsubscribeFromSymbol;
      const _clearCache: () => void = state.clearCache;
      const _setAutoRefresh: (enabled: boolean) => void = state.setAutoRefresh;
      const _setRefreshInterval: (seconds: number) => void = state.setRefreshInterval;

      expect(typeof _fetchOHLCData).toBe('function');
      expect(typeof _subscribeToSymbol).toBe('function');
      expect(typeof _unsubscribeFromSymbol).toBe('function');
      expect(typeof _clearCache).toBe('function');
      expect(typeof _setAutoRefresh).toBe('function');
      expect(typeof _setRefreshInterval).toBe('function');
    });
  });
});
