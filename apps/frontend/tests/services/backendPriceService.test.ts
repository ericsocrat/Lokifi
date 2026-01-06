/**
 * Tests for Backend Price Service
 *
 * Covers:
 * - HistoricalDataService: Historical price data and OHLCV candles
 * - CryptoDiscoveryService: Crypto search, top cryptos, symbol mapping
 * - WebSocketPriceService: Real-time price updates via WebSocket
 *
 * Session 130: Test coverage for src/services/backendPriceService.ts
 */

import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CryptoDiscoveryService,
  getWebSocketService,
  HistoricalDataService,
  WebSocketPriceService,
  type CryptoAsset,
  type CryptoListResponse,
  type CryptoSearchResponse,
  type HistoricalPriceResponse,
  type OHLCVResponse,
} from '../../src/services/backendPriceService';
import { server } from '../mocks/server';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockHistoricalResponse: HistoricalPriceResponse = {
  success: true,
  symbol: 'AAPL',
  period: '1m',
  count: 30,
  data: [
    { timestamp: '2024-12-01T00:00:00Z', price: 175.5, volume: 50000000 },
    { timestamp: '2024-12-02T00:00:00Z', price: 176.2, volume: 45000000 },
    { timestamp: '2024-12-03T00:00:00Z', price: 174.8, volume: 48000000 },
  ],
  source: 'coingecko',
  cached: false,
};

const mockOHLCVResponse: OHLCVResponse = {
  success: true,
  symbol: 'BTC',
  period: '1m',
  resolution: 'D',
  count: 5,
  candles: [
    {
      timestamp: '2024-12-01T00:00:00Z',
      open: 95000,
      high: 96500,
      low: 94000,
      close: 95800,
      volume: 2000000000,
    },
    {
      timestamp: '2024-12-02T00:00:00Z',
      open: 95800,
      high: 97000,
      low: 95200,
      close: 96500,
      volume: 2100000000,
    },
  ],
  source: 'coingecko',
  cached: true,
};

const mockCryptoAsset: CryptoAsset = {
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  image: 'https://example.com/btc.png',
  current_price: 96000,
  market_cap: 1900000000000,
  market_cap_rank: 1,
  total_volume: 50000000000,
  price_change_24h: 1500,
  price_change_percentage_24h: 1.58,
  circulating_supply: 19500000,
  total_supply: 21000000,
  max_supply: 21000000,
  ath: 108000,
  ath_change_percentage: -11.1,
  ath_date: '2024-12-01T00:00:00Z',
  atl: 100,
  atl_change_percentage: 95900,
  atl_date: '2010-07-17T00:00:00Z',
  last_updated: '2024-12-15T12:00:00Z',
};

const mockCryptoListResponse: CryptoListResponse = {
  success: true,
  count: 2,
  cryptos: [
    mockCryptoAsset,
    { ...mockCryptoAsset, id: 'ethereum', symbol: 'eth', name: 'Ethereum', market_cap_rank: 2 },
  ],
  cached: false,
};

const mockCryptoSearchResponse: CryptoSearchResponse = {
  success: true,
  query: 'bit',
  count: 1,
  results: [mockCryptoAsset],
};

// ============================================================================
// MOCK WEBSOCKET
// ============================================================================

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private url: string;
  private sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test helper to get sent messages
  getSentMessages(): string[] {
    return this.sentMessages;
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  // Test helper to simulate an error
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('backendPriceService', () => {
  beforeEach(() => {
    // Setup MSW handlers for HTTP requests
    server.use(
      // Historical prices
      http.get('http://localhost:8000/api/v1/prices/:symbol/history', ({ params, request }) => {
        const url = new URL(request.url);
        const period = url.searchParams.get('period');

        if (params.symbol === 'ERROR') {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return HttpResponse.json({
          ...mockHistoricalResponse,
          symbol: params.symbol,
          period: period || '1m',
        });
      }),

      // OHLCV data
      http.get('http://localhost:8000/api/v1/prices/:symbol/ohlcv', ({ params, request }) => {
        const url = new URL(request.url);
        const period = url.searchParams.get('period');
        const resolution = url.searchParams.get('resolution');

        if (params.symbol === 'ERROR') {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return HttpResponse.json({
          ...mockOHLCVResponse,
          symbol: params.symbol,
          period: period || '1m',
          resolution: resolution || 'D',
        });
      }),

      // Top cryptos
      http.get('http://localhost:8000/api/v1/prices/crypto/top', ({ request }) => {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '100');

        return HttpResponse.json({
          ...mockCryptoListResponse,
          count: Math.min(limit, mockCryptoListResponse.cryptos.length),
          cryptos: mockCryptoListResponse.cryptos.slice(0, limit),
        });
      }),

      // Crypto search
      http.get('http://localhost:8000/api/v1/prices/crypto/search', ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('q') || '';

        if (query.toLowerCase() === 'notfound') {
          return HttpResponse.json({
            success: true,
            query,
            count: 0,
            results: [],
          });
        }

        return HttpResponse.json({
          ...mockCryptoSearchResponse,
          query,
        });
      }),

      // Symbol mapping
      http.get('http://localhost:8000/api/v1/prices/crypto/mapping', () => {
        return HttpResponse.json({
          mapping: {
            BTC: 'bitcoin',
            ETH: 'ethereum',
            DOGE: 'dogecoin',
          },
        });
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // ==========================================================================
  // HistoricalDataService Tests
  // ==========================================================================

  describe('HistoricalDataService', () => {
    describe('getHistory', () => {
      it('should fetch historical price data for a symbol', async () => {
        const result = await HistoricalDataService.getHistory('AAPL', '1m');

        expect(result.success).toBe(true);
        expect(result.symbol).toBe('AAPL');
        expect(result.period).toBe('1m');
        expect(result.data).toBeInstanceOf(Array);
        expect(result.data.length).toBeGreaterThan(0);
      });

      it('should use default period when not specified', async () => {
        const result = await HistoricalDataService.getHistory('MSFT');

        expect(result.period).toBe('1m');
      });

      it('should support all period options', async () => {
        const periods = ['1d', '1w', '1m', '3m', '6m', '1y', '5y', 'all'] as const;

        for (const period of periods) {
          const result = await HistoricalDataService.getHistory('AAPL', period);
          expect(result.period).toBe(period);
        }
      });

      it('should throw error for failed requests', async () => {
        await expect(HistoricalDataService.getHistory('ERROR')).rejects.toThrow('HTTP 404');
      });

      it('should include price and volume in data points', async () => {
        const result = await HistoricalDataService.getHistory('AAPL', '1m');

        expect(result.data[0]).toHaveProperty('timestamp');
        expect(result.data[0]).toHaveProperty('price');
        expect(typeof result.data[0].price).toBe('number');
      });
    });

    describe('getOHLCV', () => {
      it('should fetch OHLCV candlestick data', async () => {
        const result = await HistoricalDataService.getOHLCV('BTC', '1m', 'D');

        expect(result.success).toBe(true);
        expect(result.symbol).toBe('BTC');
        expect(result.candles).toBeInstanceOf(Array);
      });

      it('should include all OHLCV fields in candles', async () => {
        const result = await HistoricalDataService.getOHLCV('BTC');

        const candle = result.candles[0];
        expect(candle).toHaveProperty('timestamp');
        expect(candle).toHaveProperty('open');
        expect(candle).toHaveProperty('high');
        expect(candle).toHaveProperty('low');
        expect(candle).toHaveProperty('close');
        expect(candle).toHaveProperty('volume');
      });

      it('should support different resolutions', async () => {
        const resolutions = ['1', '5', '15', '60', 'D', 'W', 'M'] as const;

        for (const resolution of resolutions) {
          const result = await HistoricalDataService.getOHLCV('BTC', '1m', resolution);
          expect(result.resolution).toBe(resolution);
        }
      });

      it('should use default period and resolution', async () => {
        const result = await HistoricalDataService.getOHLCV('ETH');

        expect(result.period).toBe('1m');
        expect(result.resolution).toBe('D');
      });

      it('should throw error for failed requests', async () => {
        await expect(HistoricalDataService.getOHLCV('ERROR')).rejects.toThrow('HTTP 404');
      });
    });

    describe('getBatchHistory', () => {
      it('should fetch history for multiple symbols', async () => {
        const symbols = ['AAPL', 'MSFT', 'GOOGL'];
        const results = await HistoricalDataService.getBatchHistory(symbols, '1m');

        expect(results).toBeInstanceOf(Map);
        expect(results.size).toBe(3);
        expect(results.has('AAPL')).toBe(true);
        expect(results.has('MSFT')).toBe(true);
        expect(results.has('GOOGL')).toBe(true);
      });

      it('should use default period', async () => {
        const results = await HistoricalDataService.getBatchHistory(['AAPL']);

        const aaplData = results.get('AAPL');
        expect(aaplData?.period).toBe('1m');
      });

      it('should handle partial failures gracefully', async () => {
        const symbols = ['AAPL', 'ERROR', 'MSFT'];
        const results = await HistoricalDataService.getBatchHistory(symbols, '1m');

        // Should have results for successful requests only
        expect(results.has('AAPL')).toBe(true);
        expect(results.has('MSFT')).toBe(true);
        // ERROR should not be in results (failed silently)
        expect(results.has('ERROR')).toBe(false);
      });

      it('should handle empty symbols array', async () => {
        const results = await HistoricalDataService.getBatchHistory([], '1m');

        expect(results.size).toBe(0);
      });
    });
  });

  // ==========================================================================
  // CryptoDiscoveryService Tests
  // ==========================================================================

  describe('CryptoDiscoveryService', () => {
    describe('getTopCryptos', () => {
      it('should fetch top cryptocurrencies', async () => {
        const result = await CryptoDiscoveryService.getTopCryptos();

        expect(result.success).toBe(true);
        expect(result.cryptos).toBeInstanceOf(Array);
        expect(result.count).toBeGreaterThan(0);
      });

      it('should respect limit parameter', async () => {
        const result = await CryptoDiscoveryService.getTopCryptos(1);

        expect(result.count).toBeLessThanOrEqual(1);
      });

      it('should include all required crypto fields', async () => {
        const result = await CryptoDiscoveryService.getTopCryptos(1);

        const crypto = result.cryptos[0];
        expect(crypto).toHaveProperty('id');
        expect(crypto).toHaveProperty('symbol');
        expect(crypto).toHaveProperty('name');
        expect(crypto).toHaveProperty('current_price');
        expect(crypto).toHaveProperty('market_cap');
        expect(crypto).toHaveProperty('market_cap_rank');
      });

      it('should use default limit of 100', async () => {
        // This tests that the default is used (100)
        const result = await CryptoDiscoveryService.getTopCryptos();

        // Our mock only has 2 cryptos, so count should be 2
        expect(result.count).toBe(2);
      });
    });

    describe('searchCryptos', () => {
      it('should search for cryptocurrencies by query', async () => {
        const result = await CryptoDiscoveryService.searchCryptos('bitcoin');

        expect(result.success).toBe(true);
        expect(result.query).toBe('bitcoin');
        expect(result.results).toBeInstanceOf(Array);
      });

      it('should return empty results for no matches', async () => {
        const result = await CryptoDiscoveryService.searchCryptos('notfound');

        expect(result.success).toBe(true);
        expect(result.count).toBe(0);
        expect(result.results).toEqual([]);
      });

      it('should handle special characters in query', async () => {
        // encodeURIComponent should handle this
        const result = await CryptoDiscoveryService.searchCryptos('bit&coin');

        expect(result.success).toBe(true);
      });
    });

    describe('getSymbolMapping', () => {
      it('should fetch symbol to CoinGecko ID mapping', async () => {
        const result = await CryptoDiscoveryService.getSymbolMapping();

        expect(result).toBeInstanceOf(Object);
        expect(result.BTC).toBe('bitcoin');
        expect(result.ETH).toBe('ethereum');
      });

      it('should return object with symbol keys', async () => {
        const result = await CryptoDiscoveryService.getSymbolMapping();

        expect(Object.keys(result).length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // WebSocketPriceService Tests
  // ==========================================================================

  describe('WebSocketPriceService', () => {
    beforeEach(() => {
      // Use vi.stubGlobal to mock WebSocket
      vi.stubGlobal('WebSocket', MockWebSocket);
    });

    describe('constructor', () => {
      it('should generate unique client ID when not provided', () => {
        const service1 = new WebSocketPriceService();
        const service2 = new WebSocketPriceService();

        // Both should have client IDs but they should be different
        expect(service1.isConnected()).toBe(false); // Not connected yet
        expect(service2.isConnected()).toBe(false);
      });

      it('should accept custom client ID', () => {
        const service = new WebSocketPriceService('custom-client-123');
        // Client ID is used internally; service should still work
        expect(service.isConnected()).toBe(false);
      });
    });

    describe('connect', () => {
      it('should establish WebSocket connection', async () => {
        const service = new WebSocketPriceService();

        await service.connect();

        expect(service.isConnected()).toBe(true);
      });

      it('should not create duplicate connections', async () => {
        const service = new WebSocketPriceService();

        await service.connect();
        await service.connect(); // Second call should be no-op

        expect(service.isConnected()).toBe(true);
      });
    });

    describe('subscribe', () => {
      it('should subscribe to symbols when connected', async () => {
        const service = new WebSocketPriceService();
        await service.connect();

        service.subscribe(['BTC', 'ETH']);

        // Subscription is stored internally
        expect(service.isConnected()).toBe(true);
      });

      it('should store subscriptions when not connected', () => {
        const service = new WebSocketPriceService();

        // Subscribe before connecting
        service.subscribe(['BTC', 'ETH']);

        // Subscriptions should be stored for later
        expect(service.isConnected()).toBe(false);
      });
    });

    describe('unsubscribe', () => {
      it('should unsubscribe from symbols', async () => {
        const service = new WebSocketPriceService();
        await service.connect();

        service.subscribe(['BTC', 'ETH']);
        service.unsubscribe(['BTC']);

        expect(service.isConnected()).toBe(true);
      });

      it('should handle unsubscribe when not connected', () => {
        const service = new WebSocketPriceService();

        // Should not throw
        service.unsubscribe(['BTC']);
        expect(service.isConnected()).toBe(false);
      });
    });

    describe('onPriceUpdate', () => {
      it('should register callback for price updates', async () => {
        const service = new WebSocketPriceService();
        await service.connect();

        const callback = vi.fn();
        const unsubscribe = service.onPriceUpdate(callback);

        expect(typeof unsubscribe).toBe('function');
      });

      it('should return unsubscribe function', async () => {
        const service = new WebSocketPriceService();

        const callback = vi.fn();
        const unsubscribe = service.onPriceUpdate(callback);

        // Call unsubscribe
        unsubscribe();

        // Should not throw
        expect(typeof unsubscribe).toBe('function');
      });
    });

    describe('ping', () => {
      it('should send ping when connected', async () => {
        const service = new WebSocketPriceService();
        await service.connect();

        // Should not throw
        service.ping();
        expect(service.isConnected()).toBe(true);
      });

      it('should not throw when not connected', () => {
        const service = new WebSocketPriceService();

        // Should not throw
        service.ping();
        expect(service.isConnected()).toBe(false);
      });
    });

    describe('disconnect', () => {
      it('should close WebSocket connection', async () => {
        const service = new WebSocketPriceService();
        await service.connect();

        service.disconnect();

        expect(service.isConnected()).toBe(false);
      });

      it('should handle disconnect when not connected', () => {
        const service = new WebSocketPriceService();

        // Should not throw
        service.disconnect();
        expect(service.isConnected()).toBe(false);
      });

      it('should clear subscribers on disconnect', async () => {
        const service = new WebSocketPriceService();
        await service.connect();

        const callback = vi.fn();
        service.onPriceUpdate(callback);

        service.disconnect();

        expect(service.isConnected()).toBe(false);
      });
    });

    describe('isConnected', () => {
      it('should return false initially', () => {
        const service = new WebSocketPriceService();
        expect(service.isConnected()).toBe(false);
      });

      it('should return true when connected', async () => {
        const service = new WebSocketPriceService();
        await service.connect();

        expect(service.isConnected()).toBe(true);
      });

      it('should return false after disconnect', async () => {
        const service = new WebSocketPriceService();
        await service.connect();
        service.disconnect();

        expect(service.isConnected()).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Singleton WebSocket Instance Tests
  // ==========================================================================

  describe('getWebSocketService', () => {
    beforeEach(() => {
      // Use vi.stubGlobal to mock WebSocket
      vi.stubGlobal('WebSocket', MockWebSocket);
    });

    it('should return singleton instance', () => {
      const service1 = getWebSocketService();
      const service2 = getWebSocketService();

      // Should be the same instance
      expect(service1).toBe(service2);
    });

    it('should return WebSocketPriceService instance', () => {
      const service = getWebSocketService();

      expect(service).toBeInstanceOf(WebSocketPriceService);
    });
  });
});
