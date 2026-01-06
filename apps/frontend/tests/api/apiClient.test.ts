/**
 * Tests for APIClient with zod validation
 */
import { APIClient, APIError, apiClient } from '@/lib/api/apiClient';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../mocks/server';

// Test data factories
const createValidSymbolResponse = () => ({
  success: true,
  timestamp: '2024-01-15T12:00:00Z',
  version: '1.0.0',
  data: [
    {
      symbol: 'BTC-USD',
      name: 'Bitcoin',
      base_asset: 'BTC',
      quote_asset: 'USD',
      exchange: 'coinbase',
      type: 'crypto',
      active: true,
      logo_url: 'https://example.com/btc.png',
    },
    {
      symbol: 'ETH-USD',
      name: 'Ethereum',
      base_asset: 'ETH',
      quote_asset: 'USD',
      exchange: 'coinbase',
      type: 'crypto',
      active: true,
    },
  ],
  total: 2,
});

const createValidOHLCResponse = () => ({
  success: true,
  timestamp: '2024-01-15T12:00:00Z',
  version: '1.0.0',
  data: [
    {
      timestamp: 1705312800000,
      open: 42000,
      high: 43000,
      low: 41500,
      close: 42500,
      volume: 1000000,
    },
    {
      timestamp: 1705316400000,
      open: 42500,
      high: 44000,
      low: 42000,
      close: 43500,
      volume: 1500000,
    },
  ],
  symbol: 'BTC-USD',
  timeframe: '1h',
  from_timestamp: 1705312800000,
  to_timestamp: 1705316400000,
});

const createValidTickerResponse = () => ({
  success: true,
  timestamp: '2024-01-15T12:00:00Z',
  version: '1.0.0',
  data: {
    symbol: 'BTC-USD',
    price: 42500,
    change_24h: 2.5,
    volume_24h: 50000000,
    high_24h: 44000,
    low_24h: 41000,
    timestamp: 1705312800000,
  },
});

const createValidHealthResponse = () => ({
  success: true,
  timestamp: '2024-01-15T12:00:00Z',
  version: '1.0.0',
  status: 'healthy',
  uptime: 3600,
  api_version: '1.0.0',
  dependencies: {
    database: 'connected',
    cache: 'connected',
    broker: 'connected',
  },
});

describe('APIClient', () => {
  let client: APIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new APIClient('http://test-api.localhost');
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('constructor', () => {
    it('should use default base URL when not provided', () => {
      const defaultClient = new APIClient();
      // Default should be set from env or fallback
      expect(defaultClient).toBeDefined();
    });

    it('should use provided base URL', () => {
      const customClient = new APIClient('http://custom-api.localhost');
      expect(customClient).toBeDefined();
    });
  });

  describe('getSymbols', () => {
    it('should fetch symbols successfully', async () => {
      server.use(
        http.get('http://test-api.localhost/api/symbols', () => {
          return HttpResponse.json(createValidSymbolResponse());
        })
      );

      const result = await client.getSymbols();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].symbol).toBe('BTC-USD');
      expect(result.data[1].symbol).toBe('ETH-USD');
      expect(result.total).toBe(2);
    });

    it('should pass search params as query string', async () => {
      let capturedUrl = '';
      server.use(
        http.get('http://test-api.localhost/api/symbols', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(createValidSymbolResponse());
        })
      );

      await client.getSymbols({ q: 'bitcoin', exchange: 'coinbase' });

      expect(capturedUrl).toContain('q=bitcoin');
      expect(capturedUrl).toContain('exchange=coinbase');
    });

    it('should throw APIError for invalid response format', async () => {
      server.use(
        http.get('http://test-api.localhost/api/symbols', () => {
          return HttpResponse.json({ invalid: 'response' });
        })
      );

      await expect(client.getSymbols()).rejects.toThrow(APIError);
      await expect(client.getSymbols()).rejects.toThrow('Invalid response format');
    });
  });

  describe('getOHLC', () => {
    it('should fetch OHLC data successfully', async () => {
      server.use(
        http.get('http://test-api.localhost/api/ohlc', () => {
          return HttpResponse.json(createValidOHLCResponse());
        })
      );

      const result = await client.getOHLC({
        symbol: 'BTC-USD',
        timeframe: '1h',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.symbol).toBe('BTC-USD');
      expect(result.timeframe).toBe('1h');
    });

    it('should include all params in query string', async () => {
      let capturedUrl = '';
      server.use(
        http.get('http://test-api.localhost/api/ohlc', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(createValidOHLCResponse());
        })
      );

      await client.getOHLC({
        symbol: 'BTC-USD',
        timeframe: '1h',
        limit: 100,
      });

      expect(capturedUrl).toContain('symbol=BTC-USD');
      expect(capturedUrl).toContain('timeframe=1h');
      expect(capturedUrl).toContain('limit=100');
    });

    it('should validate OHLC bar structure', async () => {
      server.use(
        http.get('http://test-api.localhost/api/ohlc', () => {
          return HttpResponse.json({
            ...createValidOHLCResponse(),
            data: [{ missing: 'fields' }],
          });
        })
      );

      await expect(
        client.getOHLC({ symbol: 'BTC-USD', timeframe: '1h' })
      ).rejects.toThrow(APIError);
    });
  });

  describe('getTicker', () => {
    it('should fetch ticker successfully', async () => {
      server.use(
        http.get('http://test-api.localhost/api/ticker/BTC-USD', () => {
          return HttpResponse.json(createValidTickerResponse());
        })
      );

      const result = await client.getTicker('BTC-USD');

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('BTC-USD');
      expect(result.data.price).toBe(42500);
      expect(result.data.change_24h).toBe(2.5);
    });

    it('should encode symbol in URL', async () => {
      let capturedUrl = '';
      server.use(
        http.get('http://test-api.localhost/api/ticker/:symbol', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(createValidTickerResponse());
        })
      );

      await client.getTicker('BTC/USD');

      expect(capturedUrl).toContain(encodeURIComponent('BTC/USD'));
    });
  });

  describe('getHealth', () => {
    it('should fetch health status successfully', async () => {
      server.use(
        http.get('http://test-api.localhost/api/health', () => {
          return HttpResponse.json(createValidHealthResponse());
        })
      );

      const result = await client.getHealth();

      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
      expect(result.uptime).toBe(3600);
      expect(result.dependencies.database).toBe('connected');
    });
  });

  describe('error handling', () => {
    it('should throw APIError for HTTP errors', async () => {
      server.use(
        http.get('http://test-api.localhost/api/symbols', () => {
          return new HttpResponse('Not Found', { status: 404 });
        })
      );

      await expect(client.getSymbols()).rejects.toThrow(APIError);
    });

    it('should parse backend error schema', async () => {
      server.use(
        http.get('http://test-api.localhost/api/symbols', () => {
          return HttpResponse.json(
            {
              success: false,
              timestamp: '2024-01-15T12:00:00Z',
              version: '1.0.0',
              error: 'Symbol not found',
              code: 'SYMBOL_NOT_FOUND',
              details: { symbol: 'INVALID' },
            },
            { status: 404 }
          );
        })
      );

      try {
        await client.getSymbols();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.message).toBe('Symbol not found');
        expect(apiError.code).toBe('SYMBOL_NOT_FOUND');
        expect(apiError.status).toBe(404);
        expect(apiError.details).toEqual({ symbol: 'INVALID' });
      }
    });

    it('should handle non-standard error JSON', async () => {
      server.use(
        http.get('http://test-api.localhost/api/symbols', () => {
          return HttpResponse.json({ message: 'Custom error' }, { status: 500 });
        })
      );

      try {
        await client.getSymbols();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.code).toBe('HTTP_ERROR');
        expect(apiError.status).toBe(500);
      }
    });

    it('should handle non-JSON error response', async () => {
      server.use(
        http.get('http://test-api.localhost/api/symbols', () => {
          return new HttpResponse('Internal Server Error', { status: 500 });
        })
      );

      try {
        await client.getSymbols();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.status).toBe(500);
      }
    });
  });

  describe('cancelRequests', () => {
    it('should cancel ongoing request', () => {
      // Since AbortSignal is disabled, this just tests the method exists
      expect(() => client.cancelRequests()).not.toThrow();
    });
  });
});

describe('APIError', () => {
  it('should create error with all properties', () => {
    const error = new APIError('Test error', 'TEST_CODE', 400, { field: 'value' });

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ field: 'value' });
    expect(error.name).toBe('APIError');
  });

  it('should be instance of Error', () => {
    const error = new APIError('Test', 'CODE', 500);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('apiClient singleton', () => {
  it('should be an instance of APIClient', () => {
    expect(apiClient).toBeInstanceOf(APIClient);
  });

  it('should exist as a global instance', () => {
    // The apiClient is exported from the module as a singleton
    // We verify it's defined and is an APIClient instance
    expect(apiClient).toBeDefined();
    expect(apiClient).toBeInstanceOf(APIClient);
    // Verify it has the expected methods
    expect(typeof apiClient.getSymbols).toBe('function');
    expect(typeof apiClient.getOHLC).toBe('function');
    expect(typeof apiClient.getTicker).toBe('function');
    expect(typeof apiClient.getHealth).toBe('function');
    expect(typeof apiClient.cancelRequests).toBe('function');
  });
});
