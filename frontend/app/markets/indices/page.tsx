'use client';

/**
 * Market Indices Page
 * 
 * Shows major market indices with real-time data.
 * Currently displays mock data - will be replaced with real API when available.
 */

import { useUnifiedIndices } from '@/src/hooks/useUnifiedAssets';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import {
  TrendingDown,
  TrendingUp,
  RefreshCw,
  BarChart3,
  AlertCircle,
  Globe2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

function IndicesPageContent() {
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormatter();

  // Fetch indices data using React Query
  const { data: allIndices, response: indicesData, isLoading, error, refetch, isFetching } = useUnifiedIndices();

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h3 className="text-red-500 font-semibold mb-2">Error Loading Indices</h3>
            <p className="text-neutral-400 text-sm">{error?.message || 'Failed to load indices data'}</p>
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
                <BarChart3 className="w-6 h-6 text-blue-500" />
                Market Indices
                <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/30">
                  Mock Data
                </span>
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                {allIndices.length} major market indices worldwide
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

          {/* Mock Data Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-500 font-medium text-sm">Mock Data Notice</p>
              <p className="text-neutral-400 text-xs mt-1">
                This page currently displays mock market indices data. Real-time indices data will be integrated when a financial data API is connected.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-neutral-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading indices...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allIndices.map((index: any) => {
              const isPositive = index.price_change_percentage_24h >= 0;
              const regionColor = getRegionColor(index.name);

              return (
                <div
                  key={index.id}
                  className="bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/5"
                  onClick={() => router.push(`/asset/${index.symbol}`)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg ${regionColor.bg} flex items-center justify-center`}>
                        <Globe2 className={`w-6 h-6 ${regionColor.text}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{index.symbol}</h3>
                        <p className="text-sm text-neutral-500">{index.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-white mb-1">
                      {formatCurrency(index.current_price)}
                    </div>
                    <div className={`flex items-center gap-2 text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>
                        {isPositive ? '+' : ''}
                        {index.price_change_percentage_24h.toFixed(2)}%
                      </span>
                      <span className="text-neutral-500">
                        ({isPositive ? '+' : ''}{formatCurrency(index.price_change_24h)})
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">24h High</div>
                      <div className="text-sm font-medium text-white">
                        {formatCurrency(index.high_24h)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">24h Low</div>
                      <div className="text-sm font-medium text-white">
                        {formatCurrency(index.low_24h)}
                      </div>
                    </div>
                  </div>

                  {/* Market Cap (if available) */}
                  {index.market_cap && (
                    <div className="mt-4 pt-4 border-t border-neutral-800">
                      <div className="text-xs text-neutral-500 mb-1">Market Cap</div>
                      <div className="text-sm font-medium text-white">
                        {formatCurrency(index.market_cap)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Cache Status */}
        {indicesData && (
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 mt-8">
            <div className={`w-2 h-2 rounded-full ${indicesData.cached ? 'bg-green-500' : 'bg-blue-500'}`} />
            {indicesData.cached ? 'Data from cache' : 'Fresh data from API'}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to assign colors based on region/name
function getRegionColor(name: string) {
  if (name.includes('S&P') || name.includes('Dow') || name.includes('NASDAQ')) {
    return { bg: 'bg-blue-500/10', text: 'text-blue-500' };
  }
  if (name.includes('FTSE') || name.includes('DAX') || name.includes('CAC')) {
    return { bg: 'bg-purple-500/10', text: 'text-purple-500' };
  }
  if (name.includes('Nikkei') || name.includes('Hang') || name.includes('Shanghai')) {
    return { bg: 'bg-red-500/10', text: 'text-red-500' };
  }
  return { bg: 'bg-neutral-800', text: 'text-neutral-400' };
}

export default function IndicesPage() {
  return (
    <ProtectedRoute>
      <IndicesPageContent />
    </ProtectedRoute>
  );
}
