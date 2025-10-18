/**
 * @vitest-environment jsdom
 */
import { useMarketDataStore } from '@/lib/stores/marketDataStore';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/server';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('MarketDataStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Bypass MSW server for these tests - we're testing the store directly with mockFetch
    server.resetHandlers();
    server.close();
    const { result } = renderHook(() => useMarketDataStore());
    act(() => {
      result.current.clearCache();
      result.current.setAutoRefresh(true);
      result.current.setRefreshInterval(30);
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Restart MSW for other tests
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  describe('Initial State', () => {
    it('should initialize with empty cache', () => {
      const { result } = renderHook(() => useMarketDataStore());
      expect(result.current.ohlcData).toEqual({});
      expect(result.current.lastUpdate).toEqual({});
    });

    it('should be connected by default', () => {
      const { result } = renderHook(() => useMarketDataStore());
      expect(result.current.isConnected).toBe(true);
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useMarketDataStore());
      expect(result.current.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const { result } = renderHook(() => useMarketDataStore());
      expect(result.current.error).toBeNull();
    });

    it('should have auto refresh enabled by default', () => {
      const { result } = renderHook(() => useMarketDataStore());
      expect(result.current.autoRefresh).toBe(true);
    });

    it('should have 30 second refresh interval by default', () => {
      const { result } = renderHook(() => useMarketDataStore());
      expect(result.current.refreshInterval).toBe(30);
    });
  });

  describe('Settings Management', () => {
    it('should enable auto refresh', () => {
      const { result } = renderHook(() => useMarketDataStore());

      act(() => {
        result.current.setAutoRefresh(true);
      });

      expect(result.current.autoRefresh).toBe(true);
    });

    it('should disable auto refresh', () => {
      const { result } = renderHook(() => useMarketDataStore());

      act(() => {
        result.current.setAutoRefresh(false);
      });

      expect(result.current.autoRefresh).toBe(false);
    });

    it('should set refresh interval', () => {
      const { result } = renderHook(() => useMarketDataStore());

      act(() => {
        result.current.setRefreshInterval(60);
      });

      expect(result.current.refreshInterval).toBe(60);
    });

    it('should enforce minimum refresh interval of 5 seconds', () => {
      const { result } = renderHook(() => useMarketDataStore());

      act(() => {
        result.current.setRefreshInterval(2);
      });

      expect(result.current.refreshInterval).toBe(5);
    });

    it('should allow refresh interval of exactly 5 seconds', () => {
      const { result } = renderHook(() => useMarketDataStore());

      act(() => {
        result.current.setRefreshInterval(5);
      });

      expect(result.current.refreshInterval).toBe(5);
    });
  });

  describe('Cache Management', () => {
    it('should clear all cached data', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ symbol: 'BTCUSD', open: 100 }] }),
      } as Response);

      await act(async () => {
        await result.current.fetchOHLCData('BTCUSD', '1D', 10);
      });

      expect(result.current.ohlcData).not.toEqual({});

      act(() => {
        result.current.clearCache();
      });

      expect(result.current.ohlcData).toEqual({});
      expect(result.current.lastUpdate).toEqual({});
      expect(result.current.error).toBeNull();
    });
  });

  describe('Fetch OHLC Data - Success', () => {
    it('should fetch data successfully from API', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      const mockData = [
        {
          symbol: 'BTCUSD',
          timestamp: '2024-01-01T00:00:00Z',
          open: 45000,
          high: 46000,
          low: 44000,
          close: 45500,
          volume: 1000000,
          provider: 'api',
          timeframe: '1D',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      } as Response);

      let data;
      await act(async () => {
        data = await result.current.fetchOHLCData('BTCUSD', '1D', 100);
      });

      expect(data).toEqual(mockData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should cache fetched data', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      const mockData = [{ symbol: 'ETHUSDT', open: 3000 }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      } as Response);

      await act(async () => {
        await result.current.fetchOHLCData('ETHUSDT', '1h', 50);
      });

      expect(result.current.ohlcData['ETHUSDT_1h']).toEqual(mockData);
      expect(result.current.lastUpdate['ETHUSDT_1h']).toBeDefined();
      expect(result.current.lastUpdate['ETHUSDT_1h']).toBeGreaterThan(0);
    });

    it('should return cached data within TTL (5 minutes)', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      const mockData = [{ symbol: 'SOLUSDT', open: 100 }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      } as Response);

      await act(async () => {
        await result.current.fetchOHLCData('SOLUSDT', '15m', 20);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second fetch should use cache
      let cachedData;
      await act(async () => {
        cachedData = await result.current.fetchOHLCData('SOLUSDT', '15m', 20);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, not called again
      expect(cachedData).toEqual(mockData);
    });

    it('should make API call when cache is expired', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      const firstData = [{ symbol: 'ADAUSDT', open: 1 }];
      const secondData = [{ symbol: 'ADAUSDT', open: 1.1 }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: firstData }),
      } as Response);

      await act(async () => {
        await result.current.fetchOHLCData('ADAUSDT', '1D', 10);
      });

      // Manually expire cache by setting old timestamp
      act(() => {
        result.current.lastUpdate['ADAUSDT_1D'] = Date.now() - 400000; // 6+ minutes ago
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: secondData }),
      } as Response);

      let newData;
      await act(async () => {
        newData = await result.current.fetchOHLCData('ADAUSDT', '1D', 10);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(newData).toEqual(secondData);
    });

    it('should construct correct API URL', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await act(async () => {
        await result.current.fetchOHLCData('BTCUSD', '4h', 200);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/ohlc/BTCUSD?timeframe=4h&limit=200')
      );
    });
  });

  describe('Fetch OHLC Data - Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      let data;
      await act(async () => {
        data = await result.current.fetchOHLCData('INVALID', '1D', 10);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toContain('HTTP 500'); // Error from the mock
      expect(data).toBeDefined(); // Should return mock data as fallback
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle network errors', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let data;
      await act(async () => {
        data = await result.current.fetchOHLCData('BTCUSD', '1D', 10);
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toContain('Network error'); // Error from the mock
      expect(data).toBeDefined(); // Should return mock data
    });

    it('should generate mock data on API failure', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockRejectedValueOnce(new Error('API down'));

      const mockData: any[] = [];
      await act(async () => {
        const data = await result.current.fetchOHLCData('BTCUSD', '1h', 50);
        mockData.push(...(data || []));
      });

      expect(mockData).toHaveLength(50);
      if (mockData.length > 0) {
        mockData.forEach((candle: any) => {
          expect(candle).toHaveProperty('symbol', 'BTCUSD');
          expect(candle).toHaveProperty('open');
          expect(candle).toHaveProperty('high');
          expect(candle).toHaveProperty('low');
          expect(candle).toHaveProperty('close');
          expect(candle).toHaveProperty('volume');
          expect(candle.high).toBeGreaterThanOrEqual(candle.open);
          expect(candle.low).toBeLessThanOrEqual(candle.close);
        });
      }
    });

    it('should cache mock data on error', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      await act(async () => {
        await result.current.fetchOHLCData('ETHUSDT', '1D', 30);
      });

      expect(result.current.ohlcData['ETHUSDT_1D']).toBeDefined();
      expect(result.current.ohlcData['ETHUSDT_1D']).toHaveLength(30);
      expect(result.current.lastUpdate['ETHUSDT_1D']).toBeGreaterThan(0);
    });
  });

  describe('Mock Data Generation', () => {
    it('should generate correct number of candles', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockRejectedValueOnce(new Error('Offline'));

      let data: any;
      await act(async () => {
        data = await result.current.fetchOHLCData('TEST', '1D', 100);
      });

      expect(data).toHaveLength(100);
    });

    it('should generate realistic BTC prices', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockRejectedValueOnce(new Error('Offline'));

      let data: any;
      await act(async () => {
        data = await result.current.fetchOHLCData('BTCUSD', '1h', 10);
      });

      const avgPrice = data!.reduce((sum: number, c: any) => sum + c.close, 0) / data!.length;
      expect(avgPrice).toBeGreaterThan(40000); // Realistic BTC price range
      expect(avgPrice).toBeLessThan(50000);
    });

    it('should generate realistic ETH prices', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockRejectedValueOnce(new Error('Offline'));

      let data: any;
      await act(async () => {
        data = await result.current.fetchOHLCData('ETHUSDT', '1D', 10);
      });

      const avgPrice = data!.reduce((sum: number, c: any) => sum + c.close, 0) / data!.length;
      expect(avgPrice).toBeGreaterThan(2500);
      expect(avgPrice).toBeLessThan(3500);
    });

    it('should generate realistic stock prices', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockRejectedValueOnce(new Error('Offline'));

      let data: any;
      await act(async () => {
        data = await result.current.fetchOHLCData('AAPL', '1D', 5);
      });

      const avgPrice = data!.reduce((sum: number, c: any) => sum + c.close, 0) / data!.length;
      expect(avgPrice).toBeGreaterThan(150);
      expect(avgPrice).toBeLessThan(220);
    });

    it('should generate valid OHLC relationships', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockRejectedValueOnce(new Error('Offline'));

      let data: any;
      await act(async () => {
        data = await result.current.fetchOHLCData('SOLUSDT', '1h', 20);
      });

      if (data) {
        data.forEach((candle: any) => {
          expect(candle.high).toBeGreaterThanOrEqual(candle.open);
          expect(candle.high).toBeGreaterThanOrEqual(candle.close);
          expect(candle.low).toBeLessThanOrEqual(candle.open);
          expect(candle.low).toBeLessThanOrEqual(candle.close);
          expect(candle.volume).toBeGreaterThan(0);
        });
      }
    });

    it('should have correct provider field in mock data', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockRejectedValueOnce(new Error('Offline'));

      let data: any;
      await act(async () => {
        data = await result.current.fetchOHLCData('TEST', '1D', 5);
      });

      if (data) {
        data.forEach((candle: any) => {
          expect(candle.provider).toBe('mock');
        });
      }
    });
  });

  describe('Subscription Operations', () => {
    it('should subscribe to symbol updates', () => {
      const { result } = renderHook(() => useMarketDataStore());
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      act(() => {
        result.current.subscribeToSymbol('BTCUSD', '1h');
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Subscribing to BTCUSD 1h')
      );

      consoleLogSpy.mockRestore();
    });

    it('should unsubscribe from symbol updates', () => {
      const { result } = renderHook(() => useMarketDataStore());
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      act(() => {
        result.current.unsubscribeFromSymbol('ETHUSDT', '4h');
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unsubscribing from ETHUSDT 4h')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent fetches for different symbols', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [{ symbol: 'BTC' }] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [{ symbol: 'ETH' }] }),
        } as Response);

      await act(async () => {
        await Promise.all([
          result.current.fetchOHLCData('BTCUSD', '1h', 10),
          result.current.fetchOHLCData('ETHUSDT', '1h', 10),
        ]);
      });

      expect(result.current.ohlcData['BTCUSD_1h']).toBeDefined();
      expect(result.current.ohlcData['ETHUSDT_1h']).toBeDefined();
    });

    it('should handle empty API response', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      let data;
      await act(async () => {
        data = await result.current.fetchOHLCData('EMPTY', '1D', 10);
      });

      expect(data).toEqual([]);
      expect(result.current.ohlcData['EMPTY_1D']).toEqual([]);
    });

    it('should handle malformed API response', async () => {
      const { result } = renderHook(() => useMarketDataStore());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'structure' }),
      } as Response);

      let data;
      await act(async () => {
        data = await result.current.fetchOHLCData('MALFORMED', '1h', 5);
      });

      expect(data).toEqual([]); // result.data is undefined, defaults to []
    });
  });
});
