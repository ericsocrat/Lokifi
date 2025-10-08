"use client";
import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OHLCData {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  provider: string;
  timeframe: string;
}

interface MarketDataState {
  // Data cache
  ohlcData: Record<string, OHLCData[]>; // key: `${symbol}_${timeframe}`
  lastUpdate: Record<string, number>; // timestamps
  
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Settings
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  
  // Actions
  fetchOHLCData: (symbol: string, timeframe: string, limit?: number) => Promise<OHLCData[]>;
  subscribeToSymbol: (symbol: string, timeframe: string) => void;
  unsubscribeFromSymbol: (symbol: string, timeframe: string) => void;
  clearCache: () => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (seconds: number) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useMarketDataStore = create<MarketDataState>()(
  persist(
    (set, get) => ({
      // Initial state
      ohlcData: {},
      lastUpdate: {},
      isConnected: true,
      isLoading: false,
      error: null,
      autoRefresh: true,
      refreshInterval: 30,

      // Fetch OHLC data from API
      fetchOHLCData: async (symbol: string, timeframe: string = '1D', limit: number = 100) => {
        const cacheKey = `${symbol}_${timeframe}`;
        const now = Date.now();
        
        // Check cache first (5 minute TTL)
        const lastUpdate = get().lastUpdate[cacheKey];
        const cachedData = get().ohlcData[cacheKey];
        
        if (cachedData && lastUpdate && (now - lastUpdate) < 300000) {
          return cachedData;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await fetch(
            `${API_BASE_URL}/api/v1/ohlc/${symbol}?timeframe=${timeframe}&limit=${limit}`
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          const data: OHLCData[] = result.data || [];

          // Update cache
          set((state: any) => ({
            ohlcData: {
              ...state.ohlcData,
              [cacheKey]: data
            },
            lastUpdate: {
              ...state.lastUpdate,
              [cacheKey]: now
            },
            isLoading: false,
            isConnected: true
          }));

          return data;

        } catch (error) {
          console.error('Failed to fetch OHLC data:', error);
          
          // Generate mock data as fallback
          const mockData = generateMockOHLC(symbol, timeframe, limit);
          
          set((state: any) => ({
            ohlcData: {
              ...state.ohlcData,
              [cacheKey]: mockData
            },
            lastUpdate: {
              ...state.lastUpdate,
              [cacheKey]: now
            },
            isLoading: false,
            error: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isConnected: false
          }));

          return mockData;
        }
      },

      // Subscribe to real-time updates (placeholder)
      subscribeToSymbol: (symbol: string, timeframe: string) => {
        console.log(`Subscribing to ${symbol} ${timeframe} (WebSocket would be used here)`);
        // In a real implementation, this would establish a WebSocket connection
      },

      // Unsubscribe from updates
      unsubscribeFromSymbol: (symbol: string, timeframe: string) => {
        console.log(`Unsubscribing from ${symbol} ${timeframe}`);
      },

      // Clear all cached data
      clearCache: () => {
        set({
          ohlcData: {},
          lastUpdate: {},
          error: null
        });
      },

      // Enable/disable auto refresh
      setAutoRefresh: (enabled: boolean) => {
        set({ autoRefresh: enabled });
      },

      // Set refresh interval
      setRefreshInterval: (seconds: number) => {
        set({ refreshInterval: Math.max(5, seconds) }); // Minimum 5 seconds
      },
    }),
    {
      name: 'lokifi-market-data',
      partialize: (state: any) => ({
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval
      }),
    }
  )
);

// Generate realistic mock OHLC data
function generateMockOHLC(symbol: string, timeframe: string, limit: number): OHLCData[] {
  const data: OHLCData[] = [];
  let basePrice = 100;
  
  // Adjust base price based on symbol
  if (symbol.includes('BTC')) basePrice = 45000;
  else if (symbol.includes('ETH')) basePrice = 3000;
  else if (symbol.includes('AAPL')) basePrice = 180;
  else if (symbol.includes('TSLA')) basePrice = 250;
  
  const now = new Date();
  const intervalMs = getTimeframeMilliseconds(timeframe);

  for (let i = limit - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * intervalMs));
    
    // Generate realistic price movement
    const change = (Math.random() - 0.5) * (basePrice * 0.02); // ±2% max change
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + (Math.random() * basePrice * 0.01);
    const low = Math.min(open, close) - (Math.random() * basePrice * 0.01);
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      symbol,
      timestamp: timestamp.toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
      provider: 'mock',
      timeframe
    });

    basePrice = close; // Next candle starts where this one ended
  }

  return data;
}

// Convert timeframe to milliseconds
function getTimeframeMilliseconds(timeframe: string): number {
  const mapping: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  };
  
  return mapping[timeframe] || mapping['1D'];
}

// Hook for auto-refreshing data
export function useAutoRefresh() {
  const { autoRefresh, refreshInterval, fetchOHLCData } = useMarketDataStore();
  
  React.useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Refresh data for currently visible symbols
      // This would typically be managed by the chart components
      console.log('Auto-refresh triggered');
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);
}