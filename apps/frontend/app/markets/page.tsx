'use client';

import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import { MarketStats } from '@/src/components/markets/MarketStats';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import type { UnifiedAsset } from '@/src/hooks/useUnifiedAssets';
import { useUnifiedAssets } from '@/src/hooks/useUnifiedAssets';
import {
  ArrowRight,
  BarChart3,
  Bitcoin,
  DollarSign,
  Globe2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function MarketsOverviewContent() {
  const { formatCurrency } = useCurrencyFormatter();

  const { data, isLoading, isError, error, refetch, isFetching } = useUnifiedAssets(10, [
    'crypto',
    'stocks',
    'indices',
    'forex',
  ]);

  if (isError) {
    return (
      <div className="min-h-screen bg-surface-0 p-6">
        <div className="max-w-7xl mx-auto">
          <div
            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center"
            role="alert"
            aria-live="assertive"
          >
            <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Error Loading Markets</h3>
            <p className="text-surface-300 mb-6">
              {error?.message || 'Failed to load market data'}
            </p>
            <button
              onClick={() => refetch()}
              aria-label="Retry loading market data"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lokifi to-electric rounded-xl text-white font-medium transition-all hover:from-lokifi-dark hover:to-electric/90"
            >
              <RefreshCw className="w-4 h-4" />
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
    <main role="main" aria-label="Markets page" className="min-h-screen bg-surface-0">
      {/* Sticky Header */}
      <div className="border-b border-surface-300/50 bg-surface-50/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-lokifi-light" />
                Markets Overview
              </h1>
              <p className="text-sm text-surface-300 mt-1">All asset classes in one place</p>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh market data"
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 hover:border-lokifi/30 rounded-xl text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {isLoading && (
          <div className="flex items-center justify-center py-12" aria-live="polite">
            <div className="flex items-center gap-3 text-surface-300">
              <div className="w-5 h-5 border-2 border-lokifi border-t-transparent rounded-full animate-spin" />
              <span>Loading markets...</span>
            </div>
          </div>
        )}

        {!isLoading && data && <MarketStats data={data.data} />}

        {!isLoading && !cryptos.length && !stocks.length && !indices.length && !forex.length && (
          <div className="border border-surface-200/60 rounded-2xl p-6 bg-surface-50/40 text-center">
            <p className="text-surface-200 font-semibold">No market data available right now.</p>
            <p className="text-surface-400 text-sm mt-2">
              Try refreshing or check back in a few moments.
            </p>
          </div>
        )}

        {/* Cryptocurrencies Section */}
        {!isLoading && cryptos.length > 0 && (
          <div className="border border-orange-500/30 rounded-2xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500/20 rounded-xl">
                  <Bitcoin className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Cryptocurrencies</h2>
                  <p className="text-sm text-surface-300">Top {cryptos.length} by market cap</p>
                </div>
              </div>
              <Link
                href="/markets/crypto"
                aria-label="View all cryptocurrencies"
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 hover:border-orange-500/30 rounded-xl text-white text-sm transition-all group"
              >
                View All
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {cryptos.map((asset: UnifiedAsset) => (
                <Link
                  key={asset.id}
                  href={`/asset/${asset.symbol}`}
                  className="bg-surface-100/50 hover:bg-surface-100 border border-surface-300/50 hover:border-orange-500/30 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {asset.image ? (
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-surface-200">
                        <Image
                          src={asset.image}
                          alt={asset.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-surface-200 flex items-center justify-center text-xs font-bold text-surface-300">
                        {asset.symbol?.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate text-sm group-hover:text-orange-400 transition-colors">
                        {asset.symbol}
                      </div>
                      <div className="text-xs text-surface-300 truncate">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-white mb-1">
                    {formatCurrency(asset.current_price)}
                  </div>
                  {asset.price_change_percentage_24h !== undefined && (
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${asset.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {asset.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {asset.price_change_percentage_24h >= 0 ? '+' : ''}
                      {asset.price_change_percentage_24h.toFixed(2)}%
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stocks Section */}
        {!isLoading && stocks.length > 0 && (
          <div className="border border-green-500/30 rounded-2xl bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/20 rounded-xl">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Stocks
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">
                      Live Data
                    </span>
                  </h2>
                  <p className="text-sm text-surface-300">
                    Top {stocks.length} • Real-time from Alpha Vantage
                  </p>
                </div>
              </div>
              <Link
                href="/markets/stocks"
                aria-label="View all stocks"
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 hover:border-green-500/30 rounded-xl text-white text-sm transition-all group"
              >
                View All
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {stocks.map((asset: UnifiedAsset) => (
                <Link
                  key={asset.id}
                  href={`/asset/${asset.symbol}`}
                  className="bg-surface-100/50 hover:bg-surface-100 border border-surface-300/50 hover:border-green-500/30 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-200 flex items-center justify-center text-xs font-bold text-surface-300">
                      {asset.symbol?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate text-sm group-hover:text-green-400 transition-colors">
                        {asset.symbol}
                      </div>
                      <div className="text-xs text-surface-300 truncate">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-white mb-1">
                    {formatCurrency(asset.current_price)}
                  </div>
                  {asset.price_change_percentage_24h !== undefined && (
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${asset.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {asset.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {asset.price_change_percentage_24h >= 0 ? '+' : ''}
                      {asset.price_change_percentage_24h.toFixed(2)}%
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Indices Section */}
        {!isLoading && indices.length > 0 && (
          <div className="border border-blue-500/30 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Market Indices
                    <span className="text-xs px-2 py-0.5 bg-yellow-500/15 text-yellow-400 rounded-lg border border-yellow-500/30">
                      Mock Data
                    </span>
                  </h2>
                  <p className="text-sm text-surface-300">Snapshot of {indices.length} indices</p>
                </div>
              </div>
              <Link
                href="/markets/indices"
                aria-label="View all market indices"
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 hover:border-blue-500/30 rounded-xl text-white text-sm transition-all group"
              >
                View All
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {indices.slice(0, 8).map((asset: UnifiedAsset) => {
                const isPositive = (asset.price_change_percentage_24h ?? 0) >= 0;

                return (
                  <Link
                    key={asset.id}
                    href={`/asset/${asset.symbol}`}
                    className="bg-surface-100/50 hover:bg-surface-100 border border-surface-300/50 hover:border-blue-500/30 rounded-xl p-4 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-blue-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate text-sm group-hover:text-blue-300 transition-colors">
                            {asset.symbol}
                          </div>
                          <div className="text-xs text-surface-300 truncate">{asset.name}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-white mb-1">
                      {formatCurrency(asset.current_price)}
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {isPositive ? '+' : ''}
                      {(asset.price_change_percentage_24h ?? 0).toFixed(2)}%
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Forex Section */}
        {!isLoading && forex.length > 0 && (
          <div className="border border-purple-500/30 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 rounded-xl">
                  <Globe2 className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Forex
                    <span className="text-xs px-2 py-0.5 bg-green-500/15 text-green-400 rounded-lg border border-green-500/30">
                      Live Data
                    </span>
                  </h2>
                  <p className="text-sm text-surface-300">Top {forex.length} currency pairs</p>
                </div>
              </div>
              <Link
                href="/markets/forex"
                aria-label="View all forex pairs"
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 hover:border-purple-500/30 rounded-xl text-white text-sm transition-all group"
              >
                View All
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {forex.slice(0, 8).map((pair: UnifiedAsset) => {
                const isPositive = (pair.price_change_percentage_24h ?? 0) >= 0;

                return (
                  <Link
                    key={pair.id}
                    href={`/asset/${pair.symbol}`}
                    className="bg-surface-100/50 hover:bg-surface-100 border border-surface-300/50 hover:border-purple-500/30 rounded-xl p-4 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                          <Globe2 className="w-5 h-5 text-purple-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate text-sm group-hover:text-purple-300 transition-colors">
                            {pair.symbol}
                          </div>
                          <div className="text-xs text-surface-300 truncate">{pair.name}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-white mb-1">
                      {pair.current_price.toFixed(4)}
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {isPositive ? '+' : ''}
                      {(pair.price_change_percentage_24h ?? 0).toFixed(2)}%
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Cache Status */}
        {data && (
          <div className="flex items-center justify-center gap-2 text-xs text-surface-300">
            <div className={`w-2 h-2 rounded-full ${data.cached ? 'bg-green-500' : 'bg-lokifi'}`} />
            {data.cached ? 'Data from cache' : 'Fresh data from API'}
          </div>
        )}
      </div>
    </main>
  );
}

export default function MarketsOverviewPage() {
  return (
    <ProtectedRoute>
      <MarketsOverviewContent />
    </ProtectedRoute>
  );
}
