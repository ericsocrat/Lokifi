import { APIClient, apiClient, APIError } from '@/lib/api/apiClient';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/server';

const API_URL = 'http://localhost:8000';

describe('APIClient', () => {
  let client: APIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new APIClient(API_URL);
  });

  describe('Constructor', () => {
    it('creates client with custom base URL', () => {
      const customClient = new APIClient('https://custom-api.com');
      expect(customClient).toBeInstanceOf(APIClient);
    });

    it('creates client with default URL from env', () => {
      const defaultClient = new APIClient();
      expect(defaultClient).toBeInstanceOf(APIClient);
    });
  });

  describe('getSymbols', () => {
    it('fetches all symbols successfully', async () => {
      const mockSymbols = {
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        data: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            base_asset: 'AAPL',
            quote_asset: 'USD',
            exchange: 'NASDAQ',
            type: 'stock',
            active: true,
          },
          {
            symbol: 'BTCUSD',
            name: 'Bitcoin',
            base_asset: 'BTC',
            quote_asset: 'USD',
            exchange: 'Crypto',
            type: 'crypto',
            active: true,
          },
        ],
        total: 2,
      };

      server.use(
        http.get(`${API_URL}/api/symbols`, () => {
          return HttpResponse.json(mockSymbols);
        })
      );

      const result = await client.getSymbols();

      expect(result).toEqual(mockSymbols);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('fetches symbols with search parameters', async () => {
      const mockSymbols = {
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        data: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            base_asset: 'AAPL',
            quote_asset: 'USD',
            exchange: 'NASDAQ',
            type: 'stock',
            active: true,
          },
        ],
        total: 1,
      };

      server.use(
        http.get(`${API_URL}/api/symbols`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('type')).toBe('stock');
          return HttpResponse.json(mockSymbols);
        })
      );

      const result = await client.getSymbols({ type: 'stock' } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('stock');
    });

    it('handles validation error for invalid response', async () => {
      server.use(
        http.get(`${API_URL}/api/symbols`, () => {
          return HttpResponse.json({
            success: true,
            timestamp: '2024-01-01',
            version: '1.0.0',
            data: 'invalid', // Should be array
            total: 0,
          });
        })
      );

      await expect(client.getSymbols()).rejects.toThrow(APIError);
      await expect(client.getSymbols()).rejects.toThrow('Invalid response format from server');
    });

    it('handles HTTP error responses', async () => {
      server.use(
        http.get(`${API_URL}/api/symbols`, () => {
          return HttpResponse.json(
            {
              success: false,
              timestamp: '2024-01-01',
              version: '1.0.0',
              error: 'Database connection failed',
              code: 'DB_ERROR',
            },
            { status: 500 }
          );
        })
      );

      await expect(client.getSymbols()).rejects.toThrow(APIError);
      await expect(client.getSymbols()).rejects.toThrow('Database connection failed');
    });
  });

  describe('getOHLC', () => {
    it('fetches OHLC data successfully', async () => {
      const mockOHLC = {
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        data: [
          {
            timestamp: 1704067200,
            open: 150.0,
            high: 152.0,
            low: 149.0,
            close: 151.0,
            volume: 1000000,
          },
          {
            timestamp: 1704070800,
            open: 151.0,
            high: 153.0,
            low: 150.5,
            close: 152.5,
            volume: 1200000,
          },
        ],
        symbol: 'AAPL',
        timeframe: '1h',
        from_timestamp: 1704067200,
        to_timestamp: 1704070800,
      };

      server.use(
        http.get(`${API_URL}/api/ohlc`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('symbol')).toBe('AAPL');
          expect(url.searchParams.get('timeframe')).toBe('1h');
          return HttpResponse.json(mockOHLC);
        })
      );

      const result = await client.getOHLC({
        symbol: 'AAPL',
        timeframe: '1h',
      } as any);

      expect(result).toEqual(mockOHLC);
      expect(result.data).toHaveLength(2);
      expect(result.symbol).toBe('AAPL');
      expect(result.timeframe).toBe('1h');
    });

    it('handles empty OHLC data', async () => {
      const mockOHLC = {
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        data: [],
        symbol: 'INVALID',
        timeframe: '1h',
      };

      server.use(
        http.get(`${API_URL}/api/ohlc`, () => {
          return HttpResponse.json(mockOHLC);
        })
      );

      const result = await client.getOHLC({
        symbol: 'INVALID',
        timeframe: '1h',
      } as any);

      expect(result.data).toHaveLength(0);
    });

    it('handles invalid OHLC data format', async () => {
      server.use(
        http.get(`${API_URL}/api/ohlc`, () => {
          return HttpResponse.json({
            success: true,
            timestamp: '2024-01-01',
            version: '1.0.0',
            data: [
              {
                timestamp: 'invalid', // Should be number
                open: 150,
                high: 152,
                low: 149,
                close: 151,
                volume: 1000,
              },
            ],
            symbol: 'AAPL',
            timeframe: '1h',
          });
        })
      );

      await expect(client.getOHLC({ symbol: 'AAPL', timeframe: '1h' } as any)).rejects.toThrow(
        APIError
      );
    });
  });

  describe('getTicker', () => {
    it('fetches ticker data successfully', async () => {
      const mockTicker = {
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        data: {
          symbol: 'BTCUSD',
          price: 45000.0,
          change_24h: 2.5,
          volume_24h: 1000000000,
          high_24h: 46000.0,
          low_24h: 44000.0,
          timestamp: 1704067200,
        },
      };

      server.use(
        http.get(`${API_URL}/api/ticker/:symbol`, ({ params }) => {
          expect(params['symbol']).toBe('BTCUSD');
          return HttpResponse.json(mockTicker);
        })
      );

      const result = await client.getTicker('BTCUSD');

      expect(result).toEqual(mockTicker);
      expect(result.data.symbol).toBe('BTCUSD');
      expect(result.data.price).toBe(45000.0);
    });

    it('handles special characters in symbol', async () => {
      const mockTicker = {
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        data: {
          symbol: 'BTC/USD',
          price: 45000.0,
          change_24h: 2.5,
          volume_24h: 1000000000,
          high_24h: 46000.0,
          low_24h: 44000.0,
          timestamp: 1704067200,
        },
      };

      server.use(
        http.get(`${API_URL}/api/ticker/:symbol`, () => {
          return HttpResponse.json(mockTicker);
        })
      );

      // Symbol with slash should be encoded
      const result = await client.getTicker('BTC/USD');

      expect(result.data.symbol).toBe('BTC/USD');
    });

    it('handles ticker not found', async () => {
      server.use(
        http.get(`${API_URL}/api/ticker/:symbol`, () => {
          return HttpResponse.json(
            {
              success: false,
              timestamp: '2024-01-01',
              version: '1.0.0',
              error: 'Symbol not found',
              code: 'NOT_FOUND',
            },
            { status: 404 }
          );
        })
      );

      await expect(client.getTicker('INVALID')).rejects.toThrow(APIError);
      await expect(client.getTicker('INVALID')).rejects.toThrow('Symbol not found');
    });

    it('validates ticker response structure', async () => {
      server.use(
        http.get(`${API_URL}/api/ticker/:symbol`, () => {
          return HttpResponse.json({
            success: true,
            timestamp: '2024-01-01',
            version: '1.0.0',
            data: {
              // Missing required fields
              symbol: 'BTC',
            },
          });
        })
      );

      await expect(client.getTicker('BTC')).rejects.toThrow(APIError);
      await expect(client.getTicker('BTC')).rejects.toThrow('Invalid response format');
    });
  });

  describe('getHealth', () => {
    it('fetches health status successfully', async () => {
      const mockHealth = {
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        status: 'healthy',
        uptime: 3600,
        api_version: '1.0.0',
        dependencies: {
          database: 'connected',
          redis: 'connected',
          external_api: 'healthy',
        },
      };

      server.use(
        http.get(`${API_URL}/api/health`, () => {
          return HttpResponse.json(mockHealth);
        })
      );

      const result = await client.getHealth();

      expect(result).toEqual(mockHealth);
      expect(result.status).toBe('healthy');
      expect(result.uptime).toBe(3600);
      expect(result.dependencies).toBeDefined();
    });

    it('handles degraded health status', async () => {
      const mockHealth = {
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        status: 'degraded',
        uptime: 3600,
        api_version: '1.0.0',
        dependencies: {
          database: 'connected',
          redis: 'disconnected',
          external_api: 'healthy',
        },
      };

      server.use(
        http.get(`${API_URL}/api/health`, () => {
          return HttpResponse.json(mockHealth);
        })
      );

      const result = await client.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.redis).toBe('disconnected');
    });
  });

  describe('Request Cancellation', () => {
    it('cancels pending requests', async () => {
      let requestStarted = false;
      let requestCompleted = false;

      server.use(
        http.get(`${API_URL}/api/symbols`, async () => {
          requestStarted = true;
          await new Promise((resolve) => setTimeout(resolve, 100));
          requestCompleted = true;
          return HttpResponse.json({
            success: true,
            timestamp: '2024-01-01',
            version: '1.0.0',
            data: [],
            total: 0,
          });
        })
      );

      // Start request but don't await
      const promise = client.getSymbols();

      // Wait a bit for request to start
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(requestStarted).toBe(true);

      // Cancel requests
      client.cancelRequests();

      // Request should be aborted
      await expect(promise).rejects.toThrow();
    });

    it('aborts previous request when new request starts', async () => {
      let firstRequestAborted = false;

      server.use(
        http.get(`${API_URL}/api/symbols`, async () => {
          // Simulate a slow request that can be aborted
          await new Promise((resolve) => setTimeout(resolve, 100));

          return HttpResponse.json({
            success: true,
            timestamp: '2024-01-01',
            version: '1.0.0',
            data: [],
            total: 0,
          });
        })
      );

      // Start first request
      const firstPromise = client.getSymbols();

      // Start second request quickly (should abort first)
      await new Promise((resolve) => setTimeout(resolve, 10));
      const secondPromise = client.getSymbols();

      // First request should be aborted
      await expect(firstPromise).rejects.toThrow();
      
      // Second request should succeed
      await expect(secondPromise).resolves.toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      server.use(
        http.get(`${API_URL}/api/health`, () => {
          return HttpResponse.error();
        })
      );

      await expect(client.getHealth()).rejects.toThrow();
    });

    it('handles malformed JSON responses', async () => {
      server.use(
        http.get(`${API_URL}/api/health`, () => {
          return new HttpResponse('Invalid JSON{', {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        })
      );

      await expect(client.getHealth()).rejects.toThrow();
    });

    it('creates APIError with proper properties', async () => {
      server.use(
        http.get(`${API_URL}/api/health`, () => {
          return HttpResponse.json(
            {
              success: false,
              timestamp: '2024-01-01',
              version: '1.0.0',
              error: 'Service unavailable',
              code: 'SERVICE_DOWN',
            },
            { status: 503 }
          );
        })
      );

      try {
        await client.getHealth();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).code).toBe('SERVICE_DOWN');
        expect((error as APIError).status).toBe(503);
        expect((error as APIError).message).toBe('Service unavailable');
      }
    });

    it('handles HTTP errors without error response', async () => {
      server.use(
        http.get(`${API_URL}/api/health`, () => {
          return HttpResponse.json(
            { some: 'data' },
            { status: 500, statusText: 'Internal Server Error' }
          );
        })
      );

      try {
        await client.getHealth();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).code).toBe('HTTP_ERROR');
        expect((error as APIError).status).toBe(500);
        expect((error as APIError).message).toContain('500');
      }
    });

    it('handles rate limiting', async () => {
      server.use(
        http.get(`${API_URL}/api/ticker/:symbol`, () => {
          return HttpResponse.json(
            {
              success: false,
              timestamp: '2024-01-01',
              version: '1.0.0',
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT',
              details: {
                limit: 100,
                remaining: 0,
                reset: 1704070800,
              },
            },
            { status: 429 }
          );
        })
      );

      try {
        await client.getTicker('AAPL');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).code).toBe('RATE_LIMIT');
        expect((error as APIError).status).toBe(429);
      }
    });
  });

  describe('APIError Class', () => {
    it('creates error with all properties', () => {
      const error = new APIError('Test error', 'TEST_CODE', 400, {
        field: 'value',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('APIError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.status).toBe(400);
      expect(error.details).toEqual({ field: 'value' });
    });

    it('creates error without details', () => {
      const error = new APIError('Test error', 'TEST_CODE', 500);

      expect(error.details).toBeUndefined();
    });
  });

  describe('Global Client Instance', () => {
    it('exports global apiClient instance', () => {
      expect(apiClient).toBeInstanceOf(APIClient);
    });

    it('global client can make requests', async () => {
      const mockHealth = {
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        status: 'healthy',
        uptime: 3600,
        api_version: '1.0.0',
        dependencies: {},
      };

      server.use(
        http.get(`${API_URL}/api/health`, () => {
          return HttpResponse.json(mockHealth);
        })
      );

      const result = await apiClient.getHealth();
      expect(result.status).toBe('healthy');
    });
  });
});
