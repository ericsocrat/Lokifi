/**
 * Tests for useUnifiedAssets Hook and related convenience hooks
 *
 * Tests cover:
 * - useUnifiedAssets: Fetches all asset types (crypto, stocks, indices, forex)
 * - useUnifiedCryptos: Convenience hook for crypto only
 * - useUnifiedStocks: Convenience hook for stocks only
 * - useUnifiedIndices: Convenience hook for indices only
 * - useUnifiedForex: Convenience hook for forex only
 *
 * All hooks use React Query for caching and deduplication.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  useUnifiedAssets,
  useUnifiedCryptos,
  useUnifiedForex,
  useUnifiedIndices,
  useUnifiedStocks,
  type UnifiedAssetsResponse,
} from '../../src/hooks/useUnifiedAssets';
import { server } from '../mocks/server';

// Create a new QueryClient for each test
let queryClient: QueryClient;

// Wrapper component with QueryClientProvider
function createWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock response data
const mockCryptos = [
  {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto' as const,
    current_price: 50000,
    price_change_24h: 1000,
    price_change_percentage_24h: 2.0,
    market_cap: 1000000000000,
    market_cap_rank: 1,
    total_volume: 50000000000,
  },
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'crypto' as const,
    current_price: 3000,
    price_change_24h: 50,
    price_change_percentage_24h: 1.7,
    market_cap: 350000000000,
    market_cap_rank: 2,
    total_volume: 20000000000,
  },
];

const mockStocks = [
  {
    id: 'AAPL',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stocks' as const,
    current_price: 175.5,
    price_change_24h: 2.3,
    price_change_percentage_24h: 1.3,
    market_cap: 2800000000000,
  },
];

const mockIndices = [
  {
    id: 'SPX',
    symbol: '^GSPC',
    name: 'S&P 500',
    type: 'indices' as const,
    current_price: 4500,
    price_change_24h: 25,
    price_change_percentage_24h: 0.56,
  },
];

const mockForex = [
  {
    id: 'EUR/USD',
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    type: 'forex' as const,
    current_price: 1.085,
    price_change_24h: 0.002,
    price_change_percentage_24h: 0.18,
  },
];

const createMockResponse = (
  types: string[] = ['crypto', 'stocks', 'indices', 'forex']
): UnifiedAssetsResponse => ({
  success: true,
  types,
  data: {
    crypto: types.includes('crypto') ? mockCryptos : undefined,
    stocks: types.includes('stocks') ? mockStocks : undefined,
    indices: types.includes('indices') ? mockIndices : undefined,
    forex: types.includes('forex') ? mockForex : undefined,
  },
  total_count:
    (types.includes('crypto') ? mockCryptos.length : 0) +
    (types.includes('stocks') ? mockStocks.length : 0) +
    (types.includes('indices') ? mockIndices.length : 0) +
    (types.includes('forex') ? mockForex.length : 0),
  cached: false,
});

describe('useUnifiedAssets', () => {
  beforeEach(() => {
    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries in tests
          staleTime: 0, // Consider data stale immediately for testing
        },
      },
    });
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
  });

  describe('successful fetching', () => {
    it('should fetch all asset types by default', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/prices/all', () => {
          return HttpResponse.json(createMockResponse());
        })
      );

      const { result } = renderHook(() => useUnifiedAssets(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.success).toBe(true);
      expect(result.current.data?.data.crypto).toHaveLength(2);
      expect(result.current.data?.data.stocks).toHaveLength(1);
      expect(result.current.data?.data.indices).toHaveLength(1);
      expect(result.current.data?.data.forex).toHaveLength(1);
    });

    it('should respect limitPerType parameter', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/prices/all', ({ request }) => {
          const url = new URL(request.url);
          const limitPerType = url.searchParams.get('limit_per_type');
          expect(limitPerType).toBe('5');
          return HttpResponse.json(createMockResponse());
        })
      );

      const { result } = renderHook(() => useUnifiedAssets(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should filter by specific asset types', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/prices/all', ({ request }) => {
          const url = new URL(request.url);
          const types = url.searchParams.get('types');
          expect(types).toContain('crypto');
          expect(types).toContain('stocks');
          return HttpResponse.json(createMockResponse(['crypto', 'stocks']));
        })
      );

      const { result } = renderHook(() => useUnifiedAssets(10, ['crypto', 'stocks']), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data.crypto).toBeDefined();
      expect(result.current.data?.data.stocks).toBeDefined();
      expect(result.current.data?.data.indices).toBeUndefined();
      expect(result.current.data?.data.forex).toBeUndefined();
    });

    it('should use cached data', async () => {
      const mockResponseWithCache: UnifiedAssetsResponse = {
        ...createMockResponse(),
        cached: true,
      };

      server.use(
        http.get('http://localhost:8000/api/v1/prices/all', () => {
          return HttpResponse.json(mockResponseWithCache);
        })
      );

      const { result } = renderHook(() => useUnifiedAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.cached).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/prices/all', () => {
          return HttpResponse.json({ detail: 'Internal server error' }, { status: 500 });
        })
      );

      const { result } = renderHook(() => useUnifiedAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/prices/all', () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useUnifiedAssets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('options', () => {
    it('should respect enabled option', async () => {
      let fetchCount = 0;
      server.use(
        http.get('http://localhost:8000/api/v1/prices/all', () => {
          fetchCount++;
          return HttpResponse.json(createMockResponse());
        })
      );

      const { result } = renderHook(() => useUnifiedAssets(10, ['crypto'], { enabled: false }), {
        wrapper: createWrapper(),
      });

      // Should not be loading when disabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(fetchCount).toBe(0);
    });

    it('should respect refetchInterval option', async () => {
      server.use(
        http.get('http://localhost:8000/api/v1/prices/all', () => {
          return HttpResponse.json(createMockResponse());
        })
      );

      const { result } = renderHook(
        () => useUnifiedAssets(10, ['crypto'], { refetchInterval: 5000 }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Hook should be configured with refetch interval
      // (actual interval behavior is React Query's responsibility)
      expect(result.current.data).toBeDefined();
    });
  });
});

describe('useUnifiedCryptos', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
  });

  it('should fetch only crypto assets', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/prices/all', ({ request }) => {
        const url = new URL(request.url);
        const types = url.searchParams.get('types');
        expect(types).toBe('crypto');
        return HttpResponse.json(createMockResponse(['crypto']));
      })
    );

    const { result } = renderHook(() => useUnifiedCryptos(10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].symbol).toBe('BTC');
    expect(result.current.data[1].symbol).toBe('ETH');
  });

  it('should return empty array on error', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/prices/all', () => {
        return HttpResponse.json({ detail: 'Error' }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useUnifiedCryptos(10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should return empty array, not undefined
    expect(result.current.data).toEqual([]);
  });
});

describe('useUnifiedStocks', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
  });

  it('should fetch only stock assets', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/prices/all', ({ request }) => {
        const url = new URL(request.url);
        const types = url.searchParams.get('types');
        expect(types).toBe('stocks');
        return HttpResponse.json(createMockResponse(['stocks']));
      })
    );

    const { result } = renderHook(() => useUnifiedStocks(10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].symbol).toBe('AAPL');
  });
});

describe('useUnifiedIndices', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
  });

  it('should fetch only indices assets with limit of 50', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/prices/all', ({ request }) => {
        const url = new URL(request.url);
        const types = url.searchParams.get('types');
        const limit = url.searchParams.get('limit_per_type');
        expect(types).toBe('indices');
        expect(limit).toBe('50'); // Indices uses limit 50
        return HttpResponse.json(createMockResponse(['indices']));
      })
    );

    const { result } = renderHook(() => useUnifiedIndices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].name).toBe('S&P 500');
  });
});

describe('useUnifiedForex', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
  });

  it('should fetch only forex assets', async () => {
    server.use(
      http.get('http://localhost:8000/api/v1/prices/all', ({ request }) => {
        const url = new URL(request.url);
        const types = url.searchParams.get('types');
        expect(types).toBe('forex');
        return HttpResponse.json(createMockResponse(['forex']));
      })
    );

    const { result } = renderHook(() => useUnifiedForex(10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].name).toBe('Euro / US Dollar');
  });
});
