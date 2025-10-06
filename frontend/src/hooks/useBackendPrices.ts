/**
 * React Hooks for Backend Price Services
 * 
 * These hooks provide easy integration with Tasks 6-8 backend features:
 * - useHistoricalPrices: Fetch historical price data
 * - useOHLCV: Fetch OHLCV candlestick data
 * - useTopCryptos: Get top cryptocurrencies
 * - useCryptoSearch: Search cryptocurrencies
 * - useWebSocketPrices: Real-time price updates
 * 
 * Created: October 6, 2025
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  HistoricalDataService,
  CryptoDiscoveryService,
  getWebSocketService,
  type HistoricalPriceResponse,
  type OHLCVResponse,
  type CryptoListResponse,
  type CryptoSearchResponse,
  type PriceUpdate,
} from '@/src/services/backendPriceService';

// ============================================================================
// HISTORICAL DATA HOOK (Task 6)
// ============================================================================

export interface UseHistoricalPricesOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useHistoricalPrices(
  symbol: string,
  period: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '5y' | 'all' = '1m',
  options: UseHistoricalPricesOptions = {}
) {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<HistoricalPriceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !symbol) return;

    try {
      setLoading(true);
      setError(null);
      const result = await HistoricalDataService.getHistory(symbol, period);
      setData(result);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch historical prices:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, period, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [refetchInterval, enabled, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isSuccess: !loading && !error && data !== null,
    isCached: data?.cached ?? false,
  };
}

// ============================================================================
// OHLCV DATA HOOK (Task 6)
// ============================================================================

export function useOHLCV(
  symbol: string,
  period: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '5y' | 'all' = '1m',
  resolution: '1' | '5' | '15' | '60' | 'D' | 'W' | 'M' = 'D',
  options: UseHistoricalPricesOptions = {}
) {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<OHLCVResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !symbol) return;

    try {
      setLoading(true);
      setError(null);
      const result = await HistoricalDataService.getOHLCV(symbol, period, resolution);
      setData(result);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch OHLCV data:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, period, resolution, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [refetchInterval, enabled, fetchData]);

  return {
    data,
    candles: data?.candles ?? [],
    loading,
    error,
    refetch: fetchData,
    isSuccess: !loading && !error && data !== null,
    isCached: data?.cached ?? false,
  };
}

// ============================================================================
// TOP CRYPTOS HOOK (Task 7)
// ============================================================================

export function useTopCryptos(limit: number = 100, enabled: boolean = true) {
  const [data, setData] = useState<CryptoListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);
      const result = await CryptoDiscoveryService.getTopCryptos(limit);
      setData(result);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch top cryptos:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    cryptos: data?.cryptos ?? [],
    loading,
    error,
    refetch: fetchData,
    isSuccess: !loading && !error && data !== null,
    isCached: data?.cached ?? false,
  };
}

// ============================================================================
// CRYPTO SEARCH HOOK (Task 7)
// ============================================================================

export function useCryptoSearch(query: string, debounceMs: number = 300) {
  const [data, setData] = useState<CryptoSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await CryptoDiscoveryService.searchCryptos(searchQuery);
      setData(result);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to search cryptos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query && query.length >= 2) {
      timeoutRef.current = setTimeout(() => {
        search(query);
      }, debounceMs);
    } else {
      setData(null);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debounceMs, search]);

  return {
    data,
    results: data?.results ?? [],
    loading,
    error,
    isSuccess: !loading && !error && data !== null,
  };
}

// ============================================================================
// WEBSOCKET REAL-TIME HOOK (Task 8)
// ============================================================================

export interface UseWebSocketPricesOptions {
  symbols?: string[];
  autoConnect?: boolean;
  reconnect?: boolean;
}

export function useWebSocketPrices(options: UseWebSocketPricesOptions = {}) {
  const { symbols = [], autoConnect = true, reconnect = true } = options;
  const [prices, setPrices] = useState<PriceUpdate>({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef(getWebSocketService());

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      setError(null);
      await wsRef.current.connect();
      setConnected(true);
    } catch (err) {
      setError(err as Error);
      setConnected(false);
      console.error('Failed to connect to WebSocket:', err);
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsRef.current.disconnect();
    setConnected(false);
  }, []);

  // Subscribe to symbols
  const subscribe = useCallback((newSymbols: string[]) => {
    if (wsRef.current.isConnected()) {
      wsRef.current.subscribe(newSymbols);
    }
  }, []);

  // Unsubscribe from symbols
  const unsubscribe = useCallback((removeSymbols: string[]) => {
    if (wsRef.current.isConnected()) {
      wsRef.current.unsubscribe(removeSymbols);
    }
  }, []);

  // Auto-connect and subscribe
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Setup price update listener
    const unsubscribeCallback = wsRef.current.onPriceUpdate((update) => {
      setPrices((prev) => ({ ...prev, ...update }));
    });

    return () => {
      unsubscribeCallback();
      if (!reconnect) {
        disconnect();
      }
    };
  }, [autoConnect, reconnect, connect, disconnect]);

  // Subscribe to initial symbols
  useEffect(() => {
    if (connected && symbols.length > 0) {
      subscribe(symbols);
    }
  }, [connected, symbols, subscribe]);

  return {
    prices,
    connected,
    error,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    isConnected: connected,
  };
}

// ============================================================================
// BATCH HISTORICAL DATA HOOK
// ============================================================================

export function useBatchHistoricalPrices(
  symbols: string[],
  period: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '5y' | 'all' = '1m',
  enabled: boolean = true
) {
  const [data, setData] = useState<Map<string, HistoricalPriceResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || symbols.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      const results = await HistoricalDataService.getBatchHistory(symbols, period);
      setData(results);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch batch historical prices:', err);
    } finally {
      setLoading(false);
    }
  }, [symbols, period, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isSuccess: !loading && !error && data.size > 0,
  };
}

// ============================================================================
// COMBINED ASSET DATA HOOK (Historical + Real-Time)
// ============================================================================

export function useAssetData(symbol: string, period: string = '1m') {
  const historical = useHistoricalPrices(symbol, period as any);
  const { prices, connected } = useWebSocketPrices({
    symbols: [symbol],
    autoConnect: true,
  });

  const currentPrice = prices[symbol]?.price;
  const liveData = prices[symbol];

  return {
    symbol,
    historical: historical.data,
    historicalLoading: historical.loading,
    historicalError: historical.error,
    currentPrice,
    liveData,
    wsConnected: connected,
    refetchHistorical: historical.refetch,
  };
}
