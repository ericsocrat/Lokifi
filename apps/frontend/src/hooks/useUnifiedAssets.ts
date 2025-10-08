/**
 * Unified Assets Hook
 * 
 * Fetches all asset types (crypto, stocks, indices, forex) in a single API call.
 * Uses React Query for automatic caching, deduplication, and background updates.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/lib/queryClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ============================================================================
// Types
// ============================================================================

export interface UnifiedAsset {
  id: string;
  symbol: string;
  name: string;
  type?: 'crypto' | 'stocks' | 'indices' | 'forex';
  current_price: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  market_cap_rank?: number;
  total_volume?: number;
  volume_24h?: number;
  rank?: number;
  image?: string;
}

export interface UnifiedAssetsResponse {
  success: boolean;
  types: string[];
  data: {
    crypto?: UnifiedAsset[];
    stocks?: UnifiedAsset[];
    indices?: UnifiedAsset[];
    forex?: UnifiedAsset[];
  };
  total_count: number;
  cached: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch unified assets from backend
 */
async function fetchUnifiedAssets(
  limitPerType: number,
  types: string[]
): Promise<UnifiedAssetsResponse> {
  const typesParam = types.join(',');
  const url = `${API_URL}/prices/all?limit_per_type=${limitPerType}&types=${typesParam}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch unified assets: ${response.statusText}`);
  }
  
  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook: useUnifiedAssets
 * 
 * Fetches all requested asset types in a single API call.
 * Perfect for the overview /markets page.
 * 
 * @param limitPerType - Number of assets per type (default: 10)
 * @param types - Asset types to fetch (default: all types)
 * @param options - React Query options
 * 
 * @example
 * ```tsx
 * // Get 10 of each type
 * const { data, isLoading } = useUnifiedAssets();
 * 
 * // Get 5 cryptos and stocks only
 * const { data } = useUnifiedAssets(5, ['crypto', 'stocks']);
 * ```
 */
export function useUnifiedAssets(
  limitPerType: number = 10,
  types: ('crypto' | 'stocks' | 'indices' | 'forex')[] = ['crypto', 'stocks', 'indices', 'forex'],
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: queryKeys.allAssets(limitPerType, types),
    queryFn: () => fetchUnifiedAssets(limitPerType, types),
    staleTime: 30 * 1000, // 30 seconds - matches backend cache
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: options?.refetchInterval || 60 * 1000, // Refetch every 60 seconds
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook: useUnifiedCryptos
 * 
 * Convenience hook for fetching only cryptocurrencies.
 * Uses the unified endpoint but filters to crypto only.
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useUnifiedCryptos(20);
 * const cryptos = data?.data.crypto || [];
 * ```
 */
export function useUnifiedCryptos(limit: number = 10) {
  const { data, ...rest } = useUnifiedAssets(limit, ['crypto']);
  
  return {
    data: data?.data.crypto || [],
    response: data,
    ...rest,
  };
}

/**
 * Hook: useUnifiedStocks
 * 
 * Convenience hook for fetching only stocks.
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useUnifiedStocks(10);
 * const stocks = data || [];
 * ```
 */
export function useUnifiedStocks(limit: number = 10) {
  const { data, ...rest } = useUnifiedAssets(limit, ['stocks']);
  
  return {
    data: data?.data.stocks || [],
    response: data,
    ...rest,
  };
}

/**
 * Hook: useUnifiedIndices
 * 
 * Convenience hook for fetching market indices.
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useUnifiedIndices();
 * const indices = data || [];
 * ```
 */
export function useUnifiedIndices() {
  const { data, ...rest } = useUnifiedAssets(50, ['indices']); // Get all indices
  
  return {
    data: data?.data.indices || [],
    response: data,
    ...rest,
  };
}

/**
 * Hook: useUnifiedForex
 * 
 * Convenience hook for fetching forex pairs.
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useUnifiedForex(10);
 * const forex = data || [];
 * ```
 */
export function useUnifiedForex(limit: number = 10) {
  const { data, ...rest } = useUnifiedAssets(limit, ['forex']);
  
  return {
    data: data?.data.forex || [],
    response: data,
    ...rest,
  };
}
