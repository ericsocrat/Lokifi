'use client';

import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import {
  useAllAssets,
  useMarketStats,
  useAssetSearch,
  useTopMovers,
} from '@/src/hooks/useMarketData';
import type { MarketAsset } from '@/src/services/marketData';
import {
  ArrowUpDown,
  Search,
  TrendingDown,
  TrendingUp,
  Star,
  Eye,
  Activity,
  BarChart3,
  Zap,
  Filter,
  Download,
  RefreshCw,
  Sparkles,
  LineChart,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

type AssetType = 'all' | 'stock' | 'crypto' | 'etf';
type SortField = 'symbol' | 'name' | 'price' | 'change' | 'changePercent' | 'volume' | 'marketCap';
type SortDirection = 'asc' | 'desc';

function MarketsPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType>('all');
  const [sortField, setSortField] = useState<SortField>('marketCap');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const { formatCurrency } = useCurrencyFormatter();

  const allAssets = useAllAssets();
  const marketStats = useMarketStats();
  const searchResults = useAssetSearch(searchQuery);
  const { gainers, losers } = useTopMovers();

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

  const getFilteredAssets = (): MarketAsset[] => {
    let assets = searchQuery ? searchResults : allAssets;
    if (selectedType !== 'all') {
      assets = assets.filter((asset) => asset.type === selectedType);
    }
    return assets;
  };

  const getSortedAssets = (): MarketAsset[] => {
    const filtered = getFilteredAssets();
    return [...filtered].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (sortField) {
        case 'symbol':
        case 'name':
          aVal = a[sortField];
          bVal = b[sortField];
          break;
        case 'price':
        case 'change':
        case 'changePercent':
        case 'volume':
        case 'marketCap':
          aVal = a[sortField];
          bVal = b[sortField];
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
      setSortDirection('desc');
    }
  };

  const formatMarketCap = (value: number): string => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
  };

  const formatVolume = (value: number): string => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(0);
  };

  const displayedAssets = getSortedAssets();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading global markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950 p-6 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Premium Header with Animated Gradient */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-3xl p-8 mb-8 overflow-hidden shadow-2xl">
          {/* Animated dot pattern background */}
          <div className="absolute inset-0 opacity-10">
            <div 
              className="h-full" 
              style={{ 
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', 
                backgroundSize: '32px 32px'
              }}
            />
          </div>
          
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-8 h-8 text-yellow-300" />
                <h1 className="text-4xl md:text-5xl font-bold text-white">Global Markets</h1>
              </div>
              <p className="text-white/90 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                  </span>
                  <span className="text-xs uppercase tracking-wide font-bold">LIVE</span>
                </span>
                <span className="text-sm">Real-time data • Updates every 3s</span>
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => window.location.reload()}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all hover:scale-105 group"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5 text-white group-hover:rotate-180 transition-transform duration-500" />
              </button>
              <button 
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all hover:scale-105"
                title="Export data"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
              <button 
                onClick={() => router.push('/chart')}
                className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-white/90 text-blue-600 font-bold rounded-xl transition-all hover:scale-105 hover:shadow-2xl"
              >
                <BarChart3 className="w-5 h-5" />
                <span>SuperChart</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Active Assets Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 transition-all hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-700 hover:scale-105 hover:-translate-y-1 group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Assets</p>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-4xl font-black text-gray-900 dark:text-gray-100 mb-1">{marketStats.activeAssets}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Trading now</p>
          </div>

          {/* Top Gainer Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 transition-all hover:shadow-2xl hover:border-green-300 dark:hover:border-green-700 hover:scale-105 hover:-translate-y-1 group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Gainer</p>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-green-600 dark:text-green-400 mb-1">{gainers[0]?.symbol || 'N/A'}</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400 mb-1">{gainers[0] ? `+${gainers[0].changePercent.toFixed(2)}%` : ''}</p>
            {gainers[0] && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{gainers[0].name}</p>}
          </div>

          {/* Top Loser Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 transition-all hover:shadow-2xl hover:border-red-300 dark:hover:border-red-700 hover:scale-105 hover:-translate-y-1 group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Loser</p>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-red-600 dark:text-red-400 mb-1">{losers[0]?.symbol || 'N/A'}</p>
            <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">{losers[0] ? `${losers[0].changePercent.toFixed(2)}%` : ''}</p>
            {losers[0] && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{losers[0].name}</p>}
          </div>

          {/* Market Cap Card */}
          <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-6 transition-all hover:shadow-2xl hover:scale-105 hover:-translate-y-1 group cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Total Market Cap</p>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-800/30 dark:to-pink-800/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-4xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 dark:from-purple-400 dark:via-blue-400 dark:to-pink-400 bg-clip-text text-transparent mb-1">
                ${(marketStats.totalMarketCap / 1e12).toFixed(2)}T
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-bold">Global valuation</p>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter Bar */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-8 shadow-lg">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px] relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search markets by name, symbol, or sector..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium" 
              />
            </div>
            
            {/* Category Filters */}
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedType('all')} 
                className={`px-5 py-3 rounded-xl font-bold transition-all ${
                  selectedType === 'all' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                }`}
              >
                All Markets
              </button>
              <button 
                onClick={() => setSelectedType('stock')} 
                className={`px-5 py-3 rounded-xl font-bold transition-all ${
                  selectedType === 'stock' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                }`}
              >
                Stocks
              </button>
              <button 
                onClick={() => setSelectedType('crypto')} 
                className={`px-5 py-3 rounded-xl font-bold transition-all ${
                  selectedType === 'crypto' 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 scale-105' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                }`}
              >
                Crypto
              </button>
            </div>

            {/* Advanced Filter Toggle */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-5 pt-5 border-t-2 border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select className="px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium focus:ring-2 focus:ring-blue-500 transition-all">
                  <option>Price Range</option>
                  <option>Under $1</option>
                  <option>$1 - $10</option>
                  <option>$10 - $100</option>
                  <option>Over $100</option>
                </select>
                <select className="px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium focus:ring-2 focus:ring-blue-500 transition-all">
                  <option>Market Cap</option>
                  <option>Mega Cap (&gt;$200B)</option>
                  <option>Large Cap ($10B-$200B)</option>
                  <option>Mid Cap ($2B-$10B)</option>
                  <option>Small Cap (&lt;$2B)</option>
                </select>
                <select className="px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium focus:ring-2 focus:ring-blue-500 transition-all">
                  <option>Performance</option>
                  <option>Top Gainers</option>
                  <option>Top Losers</option>
                  <option>Most Active</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Market Table */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 via-blue-50 to-purple-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-4 text-left">
                    <div className="w-8"></div>
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors" onClick={() => handleSort('symbol')}>
                    <div className="flex items-center gap-2">
                      Symbol
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">
                      Name
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors" onClick={() => handleSort('price')}>
                    <div className="flex items-center justify-end gap-2">
                      Price
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors" onClick={() => handleSort('changePercent')}>
                    <div className="flex items-center justify-end gap-2">
                      24h Change
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors" onClick={() => handleSort('volume')}>
                    <div className="flex items-center justify-end gap-2">
                      Volume
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors" onClick={() => handleSort('marketCap')}>
                    <div className="flex items-center justify-end gap-2">
                      Market Cap
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {displayedAssets.map((asset) => {
                  const isInWatchlist = watchlist.includes(asset.symbol);
                  return (
                    <tr 
                      key={asset.symbol}
                      className="hover:bg-gradient-to-r hover:from-blue-50 hover:via-purple-50/50 hover:to-pink-50/50 dark:hover:from-blue-900/10 dark:hover:via-purple-900/10 dark:hover:to-pink-900/10 transition-all duration-200 group"
                    >
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(asset.symbol);
                          }}
                          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110"
                          title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                        >
                          <Star 
                            className={`w-5 h-5 transition-all ${
                              isInWatchlist 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-400 hover:text-yellow-400'
                            }`} 
                          />
                        </button>
                      </td>
                      <td 
                        className="px-4 py-4 cursor-pointer"
                        onClick={() => router.push(`/asset/${asset.symbol}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all">
                            {asset.symbol.charAt(0)}
                          </div>
                          <div>
                            <span className="text-sm font-mono font-black text-gray-900 dark:text-gray-100">{asset.symbol}</span>
                            <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full font-bold ${
                              asset.type === 'crypto' 
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}>
                              {asset.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td 
                        className="px-4 py-4 cursor-pointer"
                        onClick={() => router.push(`/asset/${asset.symbol}`)}
                      >
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{asset.name}</div>
                        {asset.sector && <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{asset.sector}</div>}
                        {asset.category && <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{asset.category}</div>}
                      </td>
                      <td 
                        className="px-4 py-4 text-right cursor-pointer"
                        onClick={() => router.push(`/asset/${asset.symbol}`)}
                      >
                        <div className="text-sm font-black text-gray-900 dark:text-gray-100">
                          ${asset.price.toFixed(asset.price < 1 ? 4 : 2)}
                        </div>
                      </td>
                      <td 
                        className="px-4 py-4 text-right cursor-pointer"
                        onClick={() => router.push(`/asset/${asset.symbol}`)}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${
                            asset.changePercent >= 0 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            {asset.changePercent >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                            <span className={`text-sm ${
                              asset.changePercent >= 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td 
                        className="px-4 py-4 text-right cursor-pointer"
                        onClick={() => router.push(`/asset/${asset.symbol}`)}
                      >
                        <div className="text-sm text-gray-700 dark:text-gray-300 font-bold">{formatVolume(asset.volume)}</div>
                      </td>
                      <td 
                        className="px-4 py-4 text-right cursor-pointer"
                        onClick={() => router.push(`/asset/${asset.symbol}`)}
                      >
                        <div className="text-sm font-black text-gray-900 dark:text-gray-100">{formatMarketCap(asset.marketCap)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/asset/${asset.symbol}`)}
                            className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-all hover:scale-110 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/chart/${asset.symbol}`)}
                            className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 transition-all hover:scale-110 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                            title="View in SuperChart"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {displayedAssets.length === 0 && (
            <div className="text-center py-16">
              <LineChart className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No assets found</p>
            </div>
          )}
          {displayedAssets.length > 0 && (
            <div className="px-6 py-5 bg-gradient-to-r from-gray-50 via-blue-50/50 to-purple-50/50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 border-t-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">
                  Showing {displayedAssets.length} asset{displayedAssets.length !== 1 ? 's' : ''}
                </p>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 font-bold hover:scale-105 transition-transform">
                  <Download className="w-4 h-4" />
                  Export All Data
                </button>
              </div>
            </div>
          )}
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
