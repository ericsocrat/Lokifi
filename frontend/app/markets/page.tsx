'use client';

import { useUnifiedAssets } from '@/src/hooks/useUnifiedAssets';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import { MarketStats } from '@/src/components/markets/MarketStats';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Bitcoin,
  DollarSign,
  BarChart3,
  Globe2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import Image from 'next/image';

function MarketsOverviewContent() {
  const { formatCurrency } = useCurrencyFormatter();
  
  const { data, isLoading, isError, error, refetch, isFetching } = useUnifiedAssets(10, ['crypto', 'stocks', 'indices', 'forex']);

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h3 className="text-red-500 font-semibold mb-2">Error Loading Markets</h3>
            <p className="text-neutral-400 text-sm">{error?.message || 'Failed to load market data'}</p>
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

  const cryptos = data?.data.crypto || [];
  const stocks = data?.data.stocks || [];
  const indices = data?.data.indices || [];
  const forex = data?.data.forex || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="border-b border-neutral-800 bg-[#17171A]/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-500" />
                Markets Overview
              </h1>
              <p className="text-sm text-neutral-400 mt-1">All asset classes in one place</p>
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

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-neutral-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading markets...</span>
            </div>
          </div>
        )}

        {!isLoading && data && (
          <MarketStats data={data.data} />
        )}

        {!isLoading && cryptos.length > 0 && (
          <div className="border border-orange-500/20 rounded-lg bg-orange-500/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                  <Bitcoin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Cryptocurrencies</h2>
                  <p className="text-sm text-neutral-400">Top {cryptos.length} by market cap</p>
                </div>
              </div>
              <Link
                href="/markets/crypto"
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white text-sm transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {cryptos.map((asset: any) => (
                <Link
                  key={asset.id}
                  href={`/asset/${asset.symbol}`}
                  className="bg-neutral-900/50 hover:bg-neutral-800/50 border border-neutral-800 hover:border-neutral-700 rounded-lg p-4 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {asset.image ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-800">
                        <Image src={asset.image} alt={asset.name} fill className="object-cover" sizes="32px" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                        {asset.symbol?.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate text-sm">{asset.symbol}</div>
                      <div className="text-xs text-neutral-500 truncate">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-white mb-1">{formatCurrency(asset.current_price)}</div>
                  {asset.price_change_percentage_24h !== undefined && (
                    <div className={`flex items-center gap-1 text-sm ${asset.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {asset.price_change_percentage_24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {asset.price_change_percentage_24h >= 0 ? '+' : ''}{asset.price_change_percentage_24h.toFixed(2)}%
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {!isLoading && stocks.length > 0 && (
          <div className="border border-green-500/20 rounded-lg bg-green-500/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Stocks
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-500 rounded border border-green-500/30">Live Data</span>
                  </h2>
                  <p className="text-sm text-neutral-400">Top {stocks.length} • Real-time from Alpha Vantage</p>
                </div>
              </div>
              <Link
                href="/markets/stocks"
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white text-sm transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {stocks.map((asset: any) => (
                <Link
                  key={asset.id}
                  href={`/asset/${asset.symbol}`}
                  className="bg-neutral-900/50 hover:bg-neutral-800/50 border border-neutral-800 hover:border-neutral-700 rounded-lg p-4 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                      {asset.symbol?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate text-sm">{asset.symbol}</div>
                      <div className="text-xs text-neutral-500 truncate">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-white mb-1">{formatCurrency(asset.current_price)}</div>
                  {asset.price_change_percentage_24h !== undefined && (
                    <div className={`flex items-center gap-1 text-sm ${asset.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {asset.price_change_percentage_24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {asset.price_change_percentage_24h >= 0 ? '+' : ''}{asset.price_change_percentage_24h.toFixed(2)}%
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {data && (
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
            <div className={`w-2 h-2 rounded-full ${data.cached ? 'bg-green-500' : 'bg-blue-500'}`} />
            {data.cached ? 'Data from cache' : 'Fresh data from API'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarketsOverviewPage() {
  return (
    <ProtectedRoute>
      <MarketsOverviewContent />
    </ProtectedRoute>
  );
}
