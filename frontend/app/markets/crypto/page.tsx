'use client';

import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import { useTopCryptos, useCryptoSearch, useWebSocketPrices } from '@/src/hooks/useBackendPrices';
import {
  ArrowUpDown,
  Search,
  TrendingDown,
  TrendingUp,
  Star,
  Activity,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

type SortField = 'symbol' | 'name' | 'current_price' | 'price_change_percentage_24h' | 'total_volume' | 'market_cap' | 'market_cap_rank';
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
  const { cryptos: allCryptos, loading: cryptosLoading, error: cryptosError, refetch } = useTopCryptos(300);
  const { results: searchResults, loading: searchLoading } = useCryptoSearch(searchQuery, 300);
  
  // Real-time price updates
  const { prices: livePrices, connected, subscribe } = useWebSocketPrices({ autoConnect: true });
  
  // Subscribe to top 50 cryptos for real-time updates
  useEffect(() => {
    if (connected && allCryptos.length > 0) {
      const symbols = allCryptos.slice(0, 50).map(c => c.symbol.toUpperCase());
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
      ? watchlist.filter(s => s !== symbol)
      : [...watchlist, symbol];
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  // Use real crypto data
  const displayCryptos = searchQuery ? searchResults : allCryptos;

  // Calculate market stats from real data
  const marketStats = useMemo(() => {
    const topMovers = [...displayCryptos]
      .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
    
    return {
      activeAssets: displayCryptos.length,
      totalMarketCap: displayCryptos.reduce((sum, c) => sum + (c.market_cap || 0), 0),
      totalVolume: displayCryptos.reduce((sum, c) => sum + (c.total_volume || 0), 0),
      topGainer: topMovers[0] || null,
      topLoser: topMovers[topMovers.length - 1] || null,
    };
  }, [displayCryptos]);

  const getSortedAssets = () => {
    return [...displayCryptos].sort((a, b) => {
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
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 mb-2">
                Crypto Markets
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                Track {marketStats.activeAssets}+ cryptocurrencies in real-time
                {connected && <span className="ml-2 inline-flex items-center gap-1">
                  <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                  <span className="text-green-600 dark:text-green-400 text-sm font-bold">LIVE</span>
                </span>}
              </p>
            </div>
            <button
              onClick={() => refetch && refetch()}
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-200 dark:border-purple-800 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Assets</h3>
              </div>
              <p className="text-4xl font-black text-gray-900 dark:text-gray-100 mb-1">{marketStats.activeAssets}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tracked</p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 border border-green-200 dark:border-green-800 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Top Gainer</h3>
              </div>
              {marketStats.topGainer && (
                <>
                  <p className="text-3xl font-black text-green-600 dark:text-green-400 mb-1">{marketStats.topGainer.symbol.toUpperCase()}</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400 mb-1">
                    +{marketStats.topGainer.price_change_percentage_24h.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{marketStats.topGainer.name}</p>
                </>
              )}
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 border border-red-200 dark:border-red-800 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Top Loser</h3>
              </div>
              {marketStats.topLoser && (
                <>
                  <p className="text-3xl font-black text-red-600 dark:text-red-400 mb-1">{marketStats.topLoser.symbol.toUpperCase()}</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">
                    {marketStats.topLoser.price_change_percentage_24h.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{marketStats.topLoser.name}</p>
                </>
              )}
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 border border-blue-200 dark:border-blue-800 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Market Cap</h3>
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-1">
                ${(marketStats.totalMarketCap / 1e12).toFixed(2)}T
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Value</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              placeholder="Search cryptocurrencies by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-2 border-purple-200 dark:border-purple-800 rounded-2xl text-lg font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 shadow-xl transition-all duration-200"
            />
            {searchLoading && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-purple-200 dark:border-purple-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border-b-2 border-purple-200 dark:border-purple-700">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <button onClick={() => handleSort('market_cap_rank')} className="flex items-center gap-2 hover:text-purple-600 dark:hover:text-purple-400 transition">
                      Rank {sortField === 'market_cap_rank' && <ArrowUpDown className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">Asset</th>
                  <th className="px-4 py-4 text-right text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <button onClick={() => handleSort('current_price')} className="flex items-center gap-2 ml-auto hover:text-purple-600 dark:hover:text-purple-400 transition">
                      Price {sortField === 'current_price' && <ArrowUpDown className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <button onClick={() => handleSort('price_change_percentage_24h')} className="flex items-center gap-2 ml-auto hover:text-purple-600 dark:hover:text-purple-400 transition">
                      24h Change {sortField === 'price_change_percentage_24h' && <ArrowUpDown className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <button onClick={() => handleSort('total_volume')} className="flex items-center gap-2 ml-auto hover:text-purple-600 dark:hover:text-purple-400 transition">
                      Volume {sortField === 'total_volume' && <ArrowUpDown className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <button onClick={() => handleSort('market_cap')} className="flex items-center gap-2 ml-auto hover:text-purple-600 dark:hover:text-purple-400 transition">
                      Market Cap {sortField === 'market_cap' && <ArrowUpDown className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 dark:divide-purple-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 font-medium">Loading market data...</p>
                    </td>
                  </tr>
                ) : sortedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className="text-gray-600 dark:text-gray-400 font-medium">No assets found</p>
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
                        className="hover:bg-purple-50/50 dark:hover:bg-purple-900/20 cursor-pointer transition-colors duration-150"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-lg font-bold text-gray-600 dark:text-gray-400">
                            #{asset.market_cap_rank || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-4">
                            <img src={asset.image} alt={asset.name} className="w-10 h-10 rounded-full" />
                            <div>
                              <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">{asset.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase">{asset.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                            {formatCurrency(currentPrice)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className={`flex items-center justify-end gap-2 font-bold text-lg ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            {isPositive ? '+' : ''}{(asset.price_change_percentage_24h || 0).toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-medium text-gray-700 dark:text-gray-300">
                            ${(asset.total_volume / 1e9).toFixed(2)}B
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-medium text-gray-700 dark:text-gray-300">
                            ${(asset.market_cap / 1e9).toFixed(2)}B
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(asset.symbol.toUpperCase());
                            }}
                            className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                watchlist.includes(asset.symbol.toUpperCase())
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-400'
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
    </div>
  );
}

export default function MarketsPage() {
  return (
    <ProtectedRoute>
      <MarketsPageContent />
    </ProtectedRoute>
  );
}
