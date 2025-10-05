'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAsset, useHistoricalData } from '@/src/hooks/useMarketData';
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

function AssetDetailContent() {
  const params = useParams();
  const router = useRouter();
  const symbol = typeof params.symbol === 'string' ? params.symbol.toUpperCase() : '';
  const asset = useAsset(symbol);
  
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('30d');
  const historicalData = useHistoricalData(symbol, selectedTimeFrame);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    if (!asset) {
      router.push('/markets');
    }
  }, [asset, router]);

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

  if (!asset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading asset data...</p>
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
                <div className="absolute -top-1 -right-1">
                  <div className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">{asset.name}</h1>
                  <span className="px-3 py-1.5 text-sm font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {symbol}
                  </span>
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-xl ${
                    asset.type === 'crypto' 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' 
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {asset.type.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-4">
                  {asset.sector || asset.category || 'Financial Asset'}
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
                  <span className="font-medium">Real-time data • Updates every 3 seconds</span>
                </div>
              </div>
            </div>

            {/* Action Buttons - Simplified to essential only */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={toggleWatchlist}
                className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 hover:scale-105 shadow-lg ${
                  isInWatchlist
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-yellow-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Star className={`w-5 h-5 ${isInWatchlist ? 'fill-current' : ''}`} />
                {isInWatchlist ? 'Watching' : 'Watch'}
              </button>

              <button className="px-5 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all flex items-center gap-2 hover:scale-105">
                <Bell className="w-5 h-5" />
                Set Alert
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all flex items-center gap-2 hover:scale-105 shadow-xl shadow-blue-500/30"
              >
                <Plus className="w-5 h-5" />
                Add to Portfolio
              </button>

              <button
                onClick={() => router.push(`/chart?symbol=${symbol}`)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 hover:scale-105 shadow-xl shadow-purple-500/30"
              >
                <Maximize2 className="w-5 h-5" />
                SuperChart
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section - MUCH LARGER */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enhanced Chart Card */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                    <LineChart className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Price Performance</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Historical data analysis</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {timeFrameButtons.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setSelectedTimeFrame(tf.value)}
                      className={`px-5 py-2.5 rounded-xl font-bold transition-all hover:scale-105 ${
                        selectedTimeFrame === tf.value
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period Performance Card */}
              <div className={`mb-8 p-6 rounded-xl transition-all ${
                periodChangePercent >= 0 
                  ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-green-900/20 border-2 border-green-200 dark:border-green-800' 
                  : 'bg-gradient-to-r from-red-50 via-rose-50 to-red-50 dark:from-red-900/20 dark:via-rose-900/20 dark:to-red-900/20 border-2 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      periodChangePercent >= 0 
                        ? 'bg-green-100 dark:bg-green-900/40' 
                        : 'bg-red-100 dark:bg-red-900/40'
                    }`}>
                      {periodChangePercent >= 0 ? (
                        <TrendingUp className="w-7 h-7 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="w-7 h-7 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Period Return</p>
                      <div className="flex items-baseline gap-3">
                        <span className={`text-4xl font-black ${
                          periodChangePercent >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {periodChangePercent >= 0 ? '+' : ''}{periodChangePercent.toFixed(2)}%
                        </span>
                        <span className={`text-lg font-bold ${
                          periodChangePercent >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          ({periodChangePercent >= 0 ? '+' : ''}{formatPrice(periodChange)})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide mb-2">Starting Price</p>
                    <p className="text-2xl font-black text-gray-700 dark:text-gray-300">{formatPrice(periodStart)}</p>
                  </div>
                </div>
              </div>

              {/* MUCH LARGER Chart Visualization - 600px height */}
              <div className="relative h-[600px] bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-950 dark:to-blue-950/30 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <svg className="w-full h-full">
                  {historicalData.length > 1 && (() => {
                    const width = 100;
                    const height = 100;
                    const padding = 5;
                    
                    const prices = historicalData.map(d => d.price);
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    const priceRange = maxPrice - minPrice || 1;
                    
                    const points = historicalData.map((d, i) => {
                      const x = padding + ((width - 2 * padding) * i) / (historicalData.length - 1);
                      const y = height - padding - ((d.price - minPrice) / priceRange) * (height - 2 * padding);
                      return `${x},${y}`;
                    }).join(' ');
                    
                    const isChartPositive = historicalData[historicalData.length - 1].price >= historicalData[0].price;
                    const lineColor = isChartPositive ? '#10b981' : '#ef4444';
                    const fillColor = isChartPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                    
                    return (
                      <>
                        <polygon
                          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
                          fill={fillColor}
                        />
                        <polyline
                          points={points}
                          fill="none"
                          stroke={lineColor}
                          strokeWidth="3"
                          vectorEffect="non-scaling-stroke"
                        />
                      </>
                    );
                  })()}
                </svg>
                
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-sm text-gray-600 dark:text-gray-400 font-bold py-6">
                  <span>{formatPrice(Math.max(...historicalData.map(d => d.price)))}</span>
                  <span>{formatPrice(Math.min(...historicalData.map(d => d.price)))}</span>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 dark:text-gray-400 font-medium px-6 pb-3">
                  <span>{new Date(historicalData[0]?.timestamp || Date.now()).toLocaleDateString()}</span>
                  <span>{new Date(historicalData[historicalData.length - 1]?.timestamp || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Enhanced 24h Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-2xl hover:scale-105 hover:border-green-300 dark:hover:border-green-700 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">24h High</p>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{formatPrice(asset.high24h)}</p>
              </div>

              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-2xl hover:scale-105 hover:border-red-300 dark:hover:border-red-700 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">24h Low</p>
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{formatPrice(asset.low24h)}</p>
              </div>

              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-2xl hover:scale-105 hover:border-blue-300 dark:hover:border-blue-700 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">52W High</p>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                    <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{formatPrice(asset.high52w || asset.high24h)}</p>
              </div>

              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-2xl hover:scale-105 hover:border-orange-300 dark:hover:border-orange-700 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">52W Low</p>
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                    <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{formatPrice(asset.low52w || asset.low24h)}</p>
              </div>
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Live Market Data Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-200 dark:border-green-800 p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-5 h-5 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-5 h-5 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <span className="font-black text-gray-900 dark:text-white text-xl">LIVE MARKET DATA</span>
              </div>
              <p className="text-base text-gray-700 dark:text-gray-300 mb-3 font-medium">
                Real-time updates every 3 seconds
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                <Activity className="w-4 h-4" />
                <span>Last updated: Just now</span>
              </div>
            </div>

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
                {asset.pe && (
                  <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">P/E Ratio</span>
                    <span className="font-black text-gray-900 dark:text-white text-base">{asset.pe.toFixed(2)}</span>
                  </div>
                )}
                {asset.eps && (
                  <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">EPS</span>
                    <span className="font-black text-gray-900 dark:text-white text-base">${asset.eps.toFixed(2)}</span>
                  </div>
                )}
                {asset.dividendYield && asset.dividendYield > 0 && (
                  <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Dividend Yield</span>
                    <span className="font-black text-green-600 dark:text-green-400 text-base">{asset.dividendYield.toFixed(2)}%</span>
                  </div>
                )}
                {asset.beta && (
                  <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Beta</span>
                    <span className="font-black text-gray-900 dark:text-white text-base">{asset.beta.toFixed(2)}</span>
                  </div>
                )}
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

            {/* Download Button */}
            <button className="w-full px-5 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all flex items-center justify-center gap-3">
              <Download className="w-5 h-5" />
              Export Data
            </button>
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
