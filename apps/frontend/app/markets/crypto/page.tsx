'use client';

import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import { useCryptoSearch, useTopCryptos, useWebSocketPrices } from '@/src/hooks/useBackendPrices';
import type { CryptoAsset } from '@/src/services/backendPriceService';
import {
  Activity,
  ArrowUpDown,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type SortField =
  | 'symbol'
  | 'name'
  | 'current_price'
  | 'price_change_percentage_24h'
  | 'total_volume'
  | 'market_cap'
  | 'market_cap_rank';
type SortDirection = 'asc' | 'desc';

function MarketsPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('market_cap_rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const { formatCurrency } = useCurrencyFormatter();

  // Real backend data (300+ cryptos)
  const {
    cryptos: allCryptos,
    loading: cryptosLoading,
    error: _cryptosError,
    refetch,
  } = useTopCryptos(300);
  const { results: searchResults, loading: searchLoading } = useCryptoSearch(searchQuery, 300);

  // Real-time price updates
  const { prices: livePrices, connected, subscribe } = useWebSocketPrices({ autoConnect: true });

  // Subscribe to top 50 cryptos for real-time updates
  useEffect(() => {
    if (connected && allCryptos.length > 0) {
      const symbols = allCryptos.slice(0, 50).map((c: CryptoAsset) => c.symbol.toUpperCase());
      subscribe(symbols);
    }
  }, [connected, allCryptos, subscribe]);

  useEffect(() => {
    const savedWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setWatchlist(savedWatchlist);
    setLoading(false);
  }, []);

  const toggleWatchlist = (symbol: string) => {
    const newWatchlist = watchlist.includes(symbol)
      ? watchlist.filter((s: string) => s !== symbol)
      : [...watchlist, symbol];
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  // Use real crypto data
  const displayCryptos = searchQuery ? searchResults : allCryptos;

  // Calculate market stats from real data
  const marketStats = useMemo(() => {
    const topMovers = [...displayCryptos].sort(
      (a: CryptoAsset, b: CryptoAsset) =>
        (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
    );

    return {
      activeAssets: displayCryptos.length,
      totalMarketCap: displayCryptos.reduce(
        (sum: number, c: CryptoAsset) => sum + (c.market_cap || 0),
        0
      ),
      totalVolume: displayCryptos.reduce(
        (sum: number, c: CryptoAsset) => sum + (c.total_volume || 0),
        0
      ),
      topGainer: topMovers[0] || null,
      topLoser: topMovers[topMovers.length - 1] || null,
    };
  }, [displayCryptos]);

  const getSortedAssets = () => {
    return [...displayCryptos].sort((a: CryptoAsset, b: CryptoAsset) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case 'symbol':
        case 'name':
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
          break;
        case 'current_price':
        case 'price_change_percentage_24h':
        case 'total_volume':
        case 'market_cap':
        case 'market_cap_rank':
          aVal = a[sortField] || 0;
          bVal = b[sortField] || 0;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAssets = getSortedAssets();
  const isLoading = loading || cryptosLoading;

  // Get live price or use cached price
  const getLivePrice = (symbol: string, fallbackPrice: number) => {
    const livePrice = livePrices[symbol.toUpperCase()];
    return livePrice ? livePrice.price : fallbackPrice;
  };

  return (
    <main
      role="main"
      aria-label="Cryptocurrency Markets page"
      className="min-h-screen bg-surface-0"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lokifi via-electric to-lokifi-light mb-2">
                Crypto Markets
              </h1>
              <p className="text-surface-300 text-lg font-medium">
                Track {marketStats.activeAssets}+ cryptocurrencies in real-time
                {connected && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                    <span className="text-green-400 text-sm font-bold">LIVE</span>
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => refetch && refetch()}
              disabled={isLoading}
              aria-label="Refresh cryptocurrency market data"
              className="px-6 py-3 bg-gradient-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-lokifi text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-surface-100/80 backdrop-blur-lg rounded-2xl p-6 border border-lokifi/30 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-6 h-6 text-lokifi" />
                <h3 className="text-sm font-bold text-surface-300 uppercase tracking-wider">
                  Assets
                </h3>
              </div>
              <p className="text-4xl font-black text-white mb-1">{marketStats.activeAssets}</p>
              <p className="text-sm text-surface-300 font-medium">Tracked</p>
            </div>

            <div className="bg-surface-100/80 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <h3 className="text-sm font-bold text-surface-300 uppercase tracking-wider">
                  Top Gainer
                </h3>
              </div>
              {marketStats.topGainer && (
                <>
                  <p className="text-3xl font-black text-green-400 mb-1">
                    {marketStats.topGainer.symbol.toUpperCase()}
                  </p>
                  <p className="text-sm font-bold text-green-400 mb-1">
                    +{marketStats.topGainer.price_change_percentage_24h.toFixed(2)}%
                  </p>
                  <p className="text-xs text-surface-300 truncate">{marketStats.topGainer.name}</p>
                </>
              )}
            </div>

            <div className="bg-surface-100/80 backdrop-blur-lg rounded-2xl p-6 border border-red-500/30 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <TrendingDown className="w-6 h-6 text-red-400" />
                <h3 className="text-sm font-bold text-surface-300 uppercase tracking-wider">
                  Top Loser
                </h3>
              </div>
              {marketStats.topLoser && (
                <>
                  <p className="text-3xl font-black text-red-400 mb-1">
                    {marketStats.topLoser.symbol.toUpperCase()}
                  </p>
                  <p className="text-sm font-bold text-red-400 mb-1">
                    {marketStats.topLoser.price_change_percentage_24h.toFixed(2)}%
                  </p>
                  <p className="text-xs text-surface-300 truncate">{marketStats.topLoser.name}</p>
                </>
              )}
            </div>

            <div className="bg-surface-100/80 backdrop-blur-lg rounded-2xl p-6 border border-electric/30 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-6 h-6 text-electric" />
                <h3 className="text-sm font-bold text-surface-300 uppercase tracking-wider">
                  Market Cap
                </h3>
              </div>
              <p className="text-3xl font-black text-white mb-1">
                ${(marketStats.totalMarketCap / 1e12).toFixed(2)}T
              </p>
              <p className="text-sm text-surface-300 font-medium">Total Value</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-surface-300" />
            <input
              type="text"
              placeholder="Search cryptocurrencies by name or symbol..."
              aria-label="Search cryptocurrencies by name or symbol"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                setSearchQuery(e.target.value)
              }
              className="w-full pl-16 pr-6 py-5 bg-surface-100/80 backdrop-blur-lg border-2 border-surface-200 rounded-2xl text-lg font-medium text-white placeholder-surface-300 focus:outline-none focus:border-lokifi shadow-xl transition-all duration-200"
            />
            {searchLoading && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-surface-100/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-lokifi/20 to-electric/20 border-b-2 border-surface-200">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-black text-surface-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('market_cap_rank')}
                      aria-label="Sort by market cap rank"
                      className="flex items-center gap-2 hover:text-lokifi transition"
                    >
                      Rank {sortField === 'market_cap_rank' && <ArrowUpDown className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-black text-surface-300 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-surface-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('current_price')}
                      aria-label="Sort by current price"
                      className="flex items-center gap-2 ml-auto hover:text-lokifi transition"
                    >
                      Price {sortField === 'current_price' && <ArrowUpDown className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-surface-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('price_change_percentage_24h')}
                      aria-label="Sort by 24 hour price change"
                      className="flex items-center gap-2 ml-auto hover:text-lokifi transition"
                    >
                      24h Change{' '}
                      {sortField === 'price_change_percentage_24h' && (
                        <ArrowUpDown className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-surface-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('total_volume')}
                      aria-label="Sort by trading volume"
                      className="flex items-center gap-2 ml-auto hover:text-lokifi transition"
                    >
                      Volume {sortField === 'total_volume' && <ArrowUpDown className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-surface-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('market_cap')}
                      aria-label="Sort by market capitalization"
                      className="flex items-center gap-2 ml-auto hover:text-lokifi transition"
                    >
                      Market Cap {sortField === 'market_cap' && <ArrowUpDown className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-black text-surface-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center" aria-live="polite">
                      <RefreshCw className="w-8 h-8 text-lokifi animate-spin mx-auto mb-3" />
                      <p className="text-surface-300 font-medium">Loading market data...</p>
                    </td>
                  </tr>
                ) : sortedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className="text-surface-300 font-medium">No assets found</p>
                    </td>
                  </tr>
                ) : (
                  sortedAssets.map((asset) => {
                    const currentPrice = getLivePrice(asset.symbol, asset.current_price);
                    const isPositive = (asset.price_change_percentage_24h || 0) >= 0;

                    return (
                      <tr
                        key={asset.id}
                        onClick={() => router.push(`/asset/${asset.symbol.toUpperCase()}`)}
                        className="hover:bg-lokifi/10 cursor-pointer transition-colors duration-150"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-lg font-bold text-surface-300">
                            #{asset.market_cap_rank || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-4">
                            <Image
                              src={asset.image}
                              alt={asset.name}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                            <div>
                              <div className="font-bold text-white text-lg">{asset.name}</div>
                              <div className="text-sm text-surface-300 font-medium uppercase">
                                {asset.symbol}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-white text-lg">
                            {formatCurrency(currentPrice)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div
                            className={`flex items-center justify-end gap-2 font-bold text-lg ${isPositive ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-5 h-5" />
                            ) : (
                              <TrendingDown className="w-5 h-5" />
                            )}
                            {isPositive ? '+' : ''}
                            {(asset.price_change_percentage_24h || 0).toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-medium text-surface-300">
                            ${(asset.total_volume / 1e9).toFixed(2)}B
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-medium text-surface-300">
                            ${(asset.market_cap / 1e9).toFixed(2)}B
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              toggleWatchlist(asset.symbol.toUpperCase());
                            }}
                            aria-label={
                              watchlist.includes(asset.symbol.toUpperCase())
                                ? `Remove ${asset.name} from watchlist`
                                : `Add ${asset.name} to watchlist`
                            }
                            className="p-2 hover:bg-lokifi/20 rounded-lg transition-colors"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                watchlist.includes(asset.symbol.toUpperCase())
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-surface-300'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function MarketsPage() {
  return (
    <ProtectedRoute>
      <MarketsPageContent />
    </ProtectedRoute>
  );
}
