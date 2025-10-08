'use client';

/**
 * Stocks Markets Page
 * 
 * Shows all available stocks with search, sort, and filtering capabilities.
 * Real-time data from Alpha Vantage API.
 */

import { useUnifiedStocks } from '@/src/hooks/useUnifiedAssets';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import {
  ArrowUpDown,
  Search,
  TrendingDown,
  TrendingUp,
  Star,
  RefreshCw,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

type SortField = 'symbol' | 'name' | 'current_price' | 'price_change_percentage_24h' | 'market_cap';
type SortDirection = 'asc' | 'desc';

function StocksPageContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('market_cap');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const { formatCurrency } = useCurrencyFormatter();

  // Fetch stocks data using React Query
  const { data: allStocks, response: stocksData, isLoading, error, refetch, isFetching } = useUnifiedStocks(100);

  useEffect(() => {
    const savedWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setWatchlist(savedWatchlist);
  }, []);

  const toggleWatchlist = (symbol: string) => {
    const newWatchlist = watchlist.includes(symbol)
      ? watchlist.filter((s: any) => s !== symbol)
      : [...watchlist, symbol];
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  // Filter and sort stocks
  const filteredAndSortedStocks = useMemo(() => {
    let filtered = allStocks;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (stock: any) =>
          stock.symbol.toLowerCase().includes(query) ||
          stock.name.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [allStocks, searchQuery, sortField, sortDirection]);

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
            <h3 className="text-red-500 font-semibold mb-2">Error Loading Stocks</h3>
            <p className="text-neutral-400 text-sm">{error?.message || 'Failed to load stock data'}</p>
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
                <DollarSign className="w-6 h-6 text-green-500" />
                Stock Markets
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded border border-green-500/30">
                  Live Data
                </span>
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                {filteredAndSortedStocks.length} stocks • Real-time from Alpha Vantage
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

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search stocks by name or symbol..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Mock Data Warning */}
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-500 font-medium text-sm">Mock Data Notice</p>
              <p className="text-neutral-400 text-xs mt-1">
                This page currently displays mock stock data. Real-time stock data will be integrated when a stock market API is connected.
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
              <span>Loading stocks...</span>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-neutral-800/50 text-neutral-400 text-sm font-medium border-b border-neutral-800">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-3 flex items-center gap-2 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                Stock
                {getSortIcon('name')}
              </div>
              <div className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-white transition-colors justify-end" onClick={() => handleSort('current_price')}>
                Price
                {getSortIcon('current_price')}
              </div>
              <div className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-white transition-colors justify-end" onClick={() => handleSort('price_change_percentage_24h')}>
                24h %
                {getSortIcon('price_change_percentage_24h')}
              </div>
              <div className="col-span-3 flex items-center gap-2 cursor-pointer hover:text-white transition-colors justify-end" onClick={() => handleSort('market_cap')}>
                Market Cap
                {getSortIcon('market_cap')}
              </div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-neutral-800">
              {filteredAndSortedStocks.map((stock: any, index: number) => (
                <div
                  key={stock.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-neutral-800/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/asset/${stock.symbol}`)}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center justify-center text-neutral-500 text-sm">
                    {index + 1}
                  </div>

                  {/* Stock Info */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-500">
                      {stock.symbol.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{stock.symbol}</div>
                      <div className="text-sm text-neutral-500 truncate">{stock.name}</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-span-2 flex items-center justify-end">
                    <span className="font-medium text-white">{formatCurrency(stock.current_price)}</span>
                  </div>

                  {/* 24h Change */}
                  <div className="col-span-2 flex items-center justify-end">
                    <span
                      className={`font-medium ${
                        stock.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {stock.price_change_percentage_24h >= 0 ? '+' : ''}
                      {stock.price_change_percentage_24h.toFixed(2)}%
                    </span>
                  </div>

                  {/* Market Cap */}
                  <div className="col-span-3 flex items-center justify-end">
                    <span className="text-neutral-400">{formatCurrency(stock.market_cap)}</span>
                  </div>

                  {/* Watchlist */}
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      onClick={(e: any) => {
                        e.stopPropagation();
                        toggleWatchlist(stock.symbol);
                      }}
                      className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          watchlist.includes(stock.symbol)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-neutral-500'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cache Status */}
        {stocksData && (
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 mt-6">
            <div className={`w-2 h-2 rounded-full ${stocksData.cached ? 'bg-green-500' : 'bg-blue-500'}`} />
            {stocksData.cached ? 'Data from cache' : 'Fresh data from API'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StocksPage() {
  return (
    <ProtectedRoute>
      <StocksPageContent />
    </ProtectedRoute>
  );
}
