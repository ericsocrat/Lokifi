'use client';

/**
 * Forex Markets Page
 * 
 * Shows major currency pairs with real-time exchange rates.
 * Real-time data from ExchangeRate-API.
 */

import { useUnifiedForex } from '@/src/hooks/useUnifiedAssets';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import {
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Globe2,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

type SortField = 'symbol' | 'name' | 'current_price' | 'price_change_percentage_24h';
type SortDirection = 'asc' | 'desc';

function ForexPageContent() {
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormatter();
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch forex data using React Query
  const { data: allPairs, response: forexData, isLoading, error, refetch, isFetching } = useUnifiedForex(50);

  // Sort forex pairs
  const sortedPairs = useMemo(() => {
    const sorted = [...allPairs].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [allPairs, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortDirection === 'asc' ? (
      <TrendingUp className="w-4 h-4 text-blue-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-blue-500" />
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h3 className="text-red-500 font-semibold mb-2">Error Loading Forex Data</h3>
            <p className="text-neutral-400 text-sm">{error?.message || 'Failed to load forex data'}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-500 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-[#17171A]/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Globe2 className="w-6 h-6 text-purple-500" />
                Forex Markets
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded border border-green-500/30">
                  Live Data
                </span>
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                {sortedPairs.length} currency pairs • Real-time from ExchangeRate-API
              </p>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-neutral-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading forex pairs...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedPairs.map((pair: any) => {
              const isPositive = pair.price_change_percentage_24h >= 0;

              return (
                <div
                  key={pair.id}
                  className="bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 rounded-lg p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-purple-500/5"
                  onClick={() => router.push(`/asset/${pair.symbol}`)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Globe2 className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{pair.symbol}</h3>
                        <p className="text-xs text-neutral-500">{pair.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Exchange Rate */}
                  <div className="mb-3">
                    <div className="text-xl font-bold text-white mb-1">
                      {pair.current_price.toFixed(4)}
                    </div>
                    <div className={`flex items-center gap-2 text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>
                        {isPositive ? '+' : ''}
                        {pair.price_change_percentage_24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-800">
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">24h High</div>
                      <div className="text-sm font-medium text-white">
                        {pair.high_24h.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">24h Low</div>
                      <div className="text-sm font-medium text-white">
                        {pair.low_24h.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cache Status */}
        {forexData && (
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 mt-8">
            <div className={`w-2 h-2 rounded-full ${forexData.cached ? 'bg-green-500' : 'bg-blue-500'}`} />
            {forexData.cached ? 'Data from cache' : 'Fresh data from API'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForexPage() {
  return (
    <ProtectedRoute>
      <ForexPageContent />
    </ProtectedRoute>
  );
}
