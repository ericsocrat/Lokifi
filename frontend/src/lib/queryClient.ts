/**
 * React Query Configuration
 * 
 * Provides centralized caching, deduplication, and data synchronization
 * for all API calls across the application.
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Global Query Client Configuration
 * 
 * Default settings:
 * - staleTime: 30s - Data considered fresh for 30 seconds
 * - cacheTime: 5min - Unused data kept in cache for 5 minutes
 * - refetchOnWindowFocus: false - Don't refetch when window regains focus
 * - retry: 1 - Retry failed requests once
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Query Keys
 * 
 * Centralized query key factory for consistent cache management.
 * Benefits:
 * - Type-safe query keys
 * - Easy cache invalidation
 * - Consistent naming across app
 */
export const queryKeys = {
  // Unified assets (all types)
  allAssets: (limitPerType: number, types: string[]) => 
    ['assets', 'all', limitPerType, types.sort().join(',')] as const,
  
  // Crypto-specific
  cryptos: (limit: number) => ['assets', 'crypto', limit] as const,
  cryptoSearch: (query: string) => ['assets', 'crypto', 'search', query] as const,
  
  // Stocks-specific (future)
  stocks: (limit: number) => ['assets', 'stocks', limit] as const,
  stockSearch: (query: string) => ['assets', 'stocks', 'search', query] as const,
  
  // Indices-specific (future)
  indices: () => ['assets', 'indices'] as const,
  
  // Forex-specific (future)
  forex: (limit: number) => ['assets', 'forex', limit] as const,
  
  // Individual asset
  asset: (symbol: string) => ['asset', symbol.toUpperCase()] as const,
  assetHistory: (symbol: string, period: string) => 
    ['asset', symbol.toUpperCase(), 'history', period] as const,
};
