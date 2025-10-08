'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTopCryptos, useHistoricalPrices, useWebSocketPrices } from '@/src/hooks/useBackendPrices';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  DollarSign,
  Star,
  Bell,
  Download,
  Plus,
  Maximize2,
  ChevronLeft,
  Target,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

type TimeFrame = '1d' | '7d' | '30d' | '1y' | 'all';

interface AssetData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  high24h: number;
  low24h: number;
  high52w: number;
  low52w: number;
  previousClose: number;
  type: 'crypto';
  category: string;
  sector: string;
  pe?: number | null;
  eps?: number | null;
  dividendYield?: number | null;
  beta?: number | null;
}

function AssetDetailContent() {
  const params = useParams();
  const router = useRouter();
  const symbol = typeof params.symbol === 'string' ? params.symbol.toUpperCase() : '';
  
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('30d');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // Fetch real crypto data from backend
  const { cryptos, loading: cryptosLoading, error: cryptosError } = useTopCryptos(250);
  
  // Map timeframe to API period
  const periodMap: Record<TimeFrame, '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '5y' | 'all'> = {
    '1d': '1d',
    '7d': '1w',
    '30d': '1m',
    '1y': '1y',
    'all': 'all',
  };
  
  // Fetch historical data from backend
  const { data: historicalResponse, loading: historyLoading } = useHistoricalPrices(
    symbol,
    periodMap[selectedTimeFrame]
  );
  
  // WebSocket for real-time price updates
  const { prices: livePrices, connected, subscribe } = useWebSocketPrices({ 
    symbols: [symbol],
    autoConnect: true 
  });

  // Find the crypto in the list
  const cryptoData = useMemo(() => {
    return cryptos.find(c => c.symbol.toUpperCase() === symbol);
  }, [cryptos, symbol]);

  // Convert historical data to expected format
  const historicalData = useMemo(() => {
    if (!historicalResponse?.data) return [];
    return historicalResponse.data.map(p => ({
      date: new Date(p.timestamp).toISOString(),
      price: p.price,
      timestamp: p.timestamp,
    }));
  }, [historicalResponse]);

  // Build asset object from crypto data with live price overlay
  const asset: AssetData | null = useMemo(() => {
    if (!cryptoData) return null;
    
    const livePrice = livePrices[symbol]?.price || cryptoData.current_price;
    const livePriceChange = livePrices[symbol]?.change;
    const livePriceChangePercent = livePrices[symbol]?.change_percent;
    
    return {
      symbol: cryptoData.symbol.toUpperCase(),
      name: cryptoData.name,
      price: livePrice,
      change: livePriceChange ?? (cryptoData.price_change_24h || 0),
      changePercent: livePriceChangePercent ?? (cryptoData.price_change_percentage_24h || 0),
      marketCap: cryptoData.market_cap || 0,
      volume: cryptoData.total_volume || 0,
      high24h: livePrices[symbol]?.high_24h || livePrice,
      low24h: livePrices[symbol]?.low_24h || livePrice,
      high52w: cryptoData.ath || livePrice * 1.5,
      low52w: cryptoData.atl || livePrice * 0.5,
      previousClose: livePrice / (1 + (cryptoData.price_change_percentage_24h || 0) / 100),
      type: 'crypto' as const,
      category: 'Cryptocurrency',
      sector: 'Digital Assets',
      pe: null,
      eps: null,
      dividendYield: null,
      beta: null,
    };
  }, [cryptoData, livePrices, symbol]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (connected && symbol) {
      subscribe([symbol]);
    }
  }, [connected, symbol, subscribe]);

  useEffect(() => {
    if (!cryptosLoading && !asset) {
      // Asset not found, redirect to markets
      router.push('/markets');
    }
  }, [asset, cryptosLoading, router]);

  useEffect(() => {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setIsInWatchlist(watchlist.includes(symbol));
  }, [symbol]);

  const toggleWatchlist = () => {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    let newWatchlist;
    
    if (isInWatchlist) {
      newWatchlist = watchlist.filter((s: string) => s !== symbol);
    } else {
      newWatchlist = [...watchlist, symbol];
    }
    
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
    setIsInWatchlist(!isInWatchlist);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toLocaleString();
  };

  if (!asset || cryptosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading asset data from backend...</p>
          {connected && <p className="text-green-600 dark:text-green-400 text-sm mt-2">✅ Live updates connected</p>}
        </div>
      </div>
    );
  }

  const isPositive = asset.changePercent >= 0;
  const changeColor = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  const timeFrameButtons: { value: TimeFrame; label: string }[] = [
    { value: '1d', label: '1D' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' },
  ];

  const periodStart = historicalData.length > 0 ? historicalData[0].price : asset.price;
  const periodEnd = asset.price;
  const periodChange = periodEnd - periodStart;
  const periodChangePercent = (periodChange / periodStart) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950 p-6 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/markets')}
          className="mb-6 px-4 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300 shadow-lg"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Markets
        </button>

        {/* Asset Header Card */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-start gap-5">
              {/* Premium Asset Icon */}
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl flex items-center justify-center">
                  <span className="text-4xl font-black text-white">
                    {symbol.charAt(0)}
                  </span>
                </div>
                {/* Live indicator */}
                {connected && (
                  <div className="absolute -top-1 -right-1">
                    <div className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">{asset.name}</h1>
                  <span className="px-3 py-1.5 text-sm font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {symbol}
                  </span>
                  <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                    CRYPTO
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-4">
                  {asset.category}
                </p>

                {/* Massive Price Display */}
                <div className="flex items-baseline gap-4 flex-wrap mb-3">
                  <span className="text-6xl md:text-7xl font-black text-gray-900 dark:text-white">
                    {formatPrice(asset.price)}
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${
                      isPositive 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {isPositive ? (
                        <ArrowUpRight className={`w-6 h-6 ${changeColor}`} />
                      ) : (
                        <ArrowDownRight className={`w-6 h-6 ${changeColor}`} />
                      )}
                      <span className={`text-2xl font-black ${changeColor}`}>
                        {isPositive ? '+' : ''}{formatPrice(asset.change)}
                      </span>
                    </div>
                    
                    <div className={`px-4 py-2.5 rounded-xl text-2xl font-black ${
                      isPositive 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {isPositive ? '↑' : '↓'} {Math.abs(asset.changePercent).toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                  <Activity className="w-4 h-4" />
                  <span className="font-medium">
                    {connected ? '🔴 LIVE • Real-time updates' : 'Real-time data from CoinGecko'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={toggleWatchlist}
                className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 hover:scale-105 shadow-lg ${
                  isInWatchlist
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700'
                }`}
              >
                <Star className={`w-5 h-5 ${isInWatchlist ? 'fill-current' : ''}`} />
                {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Chart Section - Takes 2 columns */}
          <div className="xl:col-span-2 space-y-6">
            {/* Chart Card */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <LineChart className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white">Price Chart</h2>
                </div>
                
                {/* Time Frame Selector */}
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl">
                  {timeFrameButtons.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setSelectedTimeFrame(tf.value)}
                      className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
                        selectedTimeFrame === tf.value
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Area */}
              {historyLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading chart data...</p>
                  </div>
                </div>
              ) : historicalData.length === 0 ? (
                <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <p>No historical data available for this period</p>
                </div>
              ) : (
                <div className="relative">
                  <svg className="w-full h-[400px]" viewBox="0 0 800 400" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    
                    {(() => {
                      const prices = historicalData.map(d => d.price);
                      const maxPrice = Math.max(...prices);
                      const minPrice = Math.min(...prices);
                      const priceRange = maxPrice - minPrice;
                      
                      const points = historicalData.map((d, i) => {
                        const x = (i / (historicalData.length - 1)) * 800;
                        const y = 400 - ((d.price - minPrice) / priceRange) * 380;
                        return `${x},${y}`;
                      }).join(' ');

                      const areaPoints = `0,400 ${points} 800,400`;

                      return (
                        <>
                          <polyline
                            points={areaPoints}
                            fill="url(#priceGradient)"
                          />
                          <polyline
                            points={points}
                            fill="none"
                            stroke={isPositive ? '#22c55e' : '#ef4444'}
                            strokeWidth="3"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        </>
                      );
                    })()}
                  </svg>
                  
                  {/* Chart Stats */}
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">High</p>
                      <span className="text-lg font-black text-green-600 dark:text-green-400">
                        {formatPrice(Math.max(...historicalData.map(d => d.price)))}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Low</p>
                      <span className="text-lg font-black text-red-600 dark:text-red-400">
                        {formatPrice(Math.min(...historicalData.map(d => d.price)))}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Change</p>
                      <span className={`text-lg font-black ${periodChangePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {periodChangePercent >= 0 ? '+' : ''}{periodChangePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Data Points</p>
                      <span className="text-lg font-black text-gray-900 dark:text-white">
                        {historicalData.length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Price Range Card */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-200 dark:border-green-800 p-6 shadow-lg group hover:scale-105 transition-all cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400">52W High</h3>
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{formatPrice(asset.high52w)}</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl border-2 border-orange-200 dark:border-orange-800 p-6 shadow-lg group hover:scale-105 transition-all cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                    <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400">52W Low</h3>
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{formatPrice(asset.low52w)}</p>
              </div>
            </div>
          </div>

          {/* Sidebar - Stats */}
          <div className="space-y-6">
            {/* Live Market Data Card */}
            {connected && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-200 dark:border-green-800 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-5 h-5 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-5 h-5 bg-green-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="font-black text-gray-900 dark:text-white text-xl">LIVE MARKET DATA</span>
                </div>
                <p className="text-base text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Real-time updates via WebSocket
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                  <Activity className="w-4 h-4" />
                  <span>Connected to backend</span>
                </div>
              </div>
            )}

            {/* Market Statistics Card */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <PieChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Market Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Market Cap</span>
                  <span className="font-black text-gray-900 dark:text-white text-base">{formatMarketCap(asset.marketCap)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Volume (24h)</span>
                  <span className="font-black text-gray-900 dark:text-white text-base">{formatVolume(asset.volume)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">24h High</span>
                  <span className="font-black text-green-600 dark:text-green-400 text-base">{formatPrice(asset.high24h)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">24h Low</span>
                  <span className="font-black text-red-600 dark:text-red-400 text-base">{formatPrice(asset.low24h)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Prev. Close</span>
                  <span className="font-black text-gray-900 dark:text-white text-base">{formatPrice(asset.previousClose)}</span>
                </div>
              </div>
            </div>

            {/* Performance Metrics Card */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                Performance Metrics
              </h3>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-gray-600 dark:text-gray-400">Today's Change</span>
                    <span className={`font-black ${changeColor}`}>
                      {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isPositive ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}
                      style={{ width: `${Math.min(Math.abs(asset.changePercent) * 10, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-gray-600 dark:text-gray-400">Period Change</span>
                    <span className={`font-black ${periodChangePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {periodChangePercent >= 0 ? '+' : ''}{periodChangePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${periodChangePercent >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}
                      style={{ width: `${Math.min(Math.abs(periodChangePercent) * 5, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Data Source Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-6">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                💎 Real Data from Backend
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>✅ CoinGecko API integration</li>
                <li>✅ Historical price data</li>
                <li>✅ WebSocket live updates</li>
                <li>✅ Batch optimized (no duplicates)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssetDetailPage() {
  return (
    <ProtectedRoute>
      <AssetDetailContent />
    </ProtectedRoute>
  );
}
