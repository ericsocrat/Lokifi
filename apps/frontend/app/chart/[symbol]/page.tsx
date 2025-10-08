'use client';

import { useEffect, useState, useRef } from 'react';
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
  ChevronLeft,
  Maximize2,
  Minimize2,
  Settings,
  Eye,
  EyeOff,
  LineChart,
  CandlestickChart,
  AreaChart,
  Target,
  Crosshair,
  Layers,
  Grid3x3,
  Minus,
  X,
  Info,
  Calendar,
  Clock,
  Zap,
  TrendingUpIcon,
  BarChart2,
  ScatterChart,
  Share2,
  Bookmark,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Volume2,
  Percent
} from 'lucide-react';

type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
type ChartType = 'line' | 'candlestick' | 'area' | 'bar';
type Indicator = 'none' | 'sma' | 'ema' | 'bb' | 'rsi' | 'macd';

function ChartPageContent() {
  const params = useParams();
  const router = useRouter();
  const symbol = typeof params.symbol === 'string' ? params.symbol.toUpperCase() : '';
  const asset = useAsset(symbol);
  
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('1d');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [activeIndicators, setActiveIndicators] = useState<Indicator[]>(['none']);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showOrderBook, setShowOrderBook] = useState(true);
  const [showTrades, setShowTrades] = useState(true);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const historicalData = useHistoricalData(symbol, '30d'); // Get more data for charting

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

  const toggleIndicator = (indicator: Indicator) => {
    if (activeIndicators.includes(indicator)) {
      setActiveIndicators(activeIndicators.filter(i => i !== indicator));
    } else {
      setActiveIndicators([...activeIndicators, indicator]);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toLocaleString();
  };

  if (!asset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Loading chart data...</p>
        </div>
      </div>
    );
  }

  const isPositive = asset.changePercent >= 0;
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
  const changeBg = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';

  const timeFrameButtons: { value: TimeFrame; label: string }[] = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
    { value: '1w', label: '1W' },
    { value: '1M', label: '1M' },
  ];

  return (
    <div className="h-screen bg-gray-950 text-white overflow-hidden flex flex-col">
      {/* Top Toolbar - TradingView Style */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between gap-4 flex-shrink-0">
        {/* Left Section - Asset Info */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 border-r border-gray-800 pr-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-lg font-black text-white">{symbol.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{asset.name}</h1>
                <span className="text-xs text-gray-400 font-mono">{symbol}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-2xl font-black">{formatPrice(asset.price)}</span>
                <span className={`flex items-center gap-1 ${changeColor} font-bold`}>
                  {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Time Frame Selector */}
          <div className="flex items-center gap-1">
            {timeFrameButtons.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setSelectedTimeFrame(tf.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                  selectedTimeFrame === tf.value
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleWatchlist}
            className={`p-2 rounded-lg transition-colors ${
              isInWatchlist ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-gray-800 text-gray-400'
            }`}
            title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Star className={`w-5 h-5 ${isInWatchlist ? 'fill-current' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowCrosshair(!showCrosshair)}
            className={`p-2 rounded-lg transition-colors ${
              showCrosshair ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'
            }`}
            title="Toggle crosshair"
          >
            <Crosshair className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${
              showGrid ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'
            }`}
            title="Toggle grid"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <div className="h-6 w-px bg-gray-800"></div>

          <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg font-bold text-sm transition-colors">
            <Plus className="w-4 h-4 inline mr-1" />
            Trade
          </button>

          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Chart Type & Indicators */}
        <div className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-2 flex-shrink-0">
          <button
            onClick={() => setChartType('line')}
            className={`p-3 rounded-lg transition-colors ${
              chartType === 'line' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Line Chart"
          >
            <LineChart className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setChartType('candlestick')}
            className={`p-3 rounded-lg transition-colors ${
              chartType === 'candlestick' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Candlestick Chart"
          >
            <CandlestickChart className="w-5 h-5" />
          </button>

          <button
            onClick={() => setChartType('area')}
            className={`p-3 rounded-lg transition-colors ${
              chartType === 'area' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Area Chart"
          >
            <AreaChart className="w-5 h-5" />
          </button>

          <button
            onClick={() => setChartType('bar')}
            className={`p-3 rounded-lg transition-colors ${
              chartType === 'bar' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Bar Chart"
          >
            <BarChart2 className="w-5 h-5" />
          </button>

          <div className="h-px w-10 bg-gray-800 my-2"></div>

          <button
            onClick={() => toggleIndicator('sma')}
            className={`p-3 rounded-lg transition-colors text-xs font-bold ${
              activeIndicators.includes('sma') ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Simple Moving Average"
          >
            SMA
          </button>

          <button
            onClick={() => toggleIndicator('ema')}
            className={`p-3 rounded-lg transition-colors text-xs font-bold ${
              activeIndicators.includes('ema') ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Exponential Moving Average"
          >
            EMA
          </button>

          <button
            onClick={() => toggleIndicator('rsi')}
            className={`p-3 rounded-lg transition-colors text-xs font-bold ${
              activeIndicators.includes('rsi') ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Relative Strength Index"
          >
            RSI
          </button>

          <button
            onClick={() => toggleIndicator('bb')}
            className={`p-3 rounded-lg transition-colors text-xs font-bold ${
              activeIndicators.includes('bb') ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Bollinger Bands"
          >
            BB
          </button>
        </div>

        {/* Center - Main Chart Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chart Canvas */}
          <div ref={chartContainerRef} className="flex-1 bg-gray-950 relative">
            {/* Enhanced SVG Chart */}
            <svg className="w-full h-full">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.05" />
                </linearGradient>
                
                {/* Grid pattern */}
                {showGrid && (
                  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
                  </pattern>
                )}
              </defs>

              {/* Grid background */}
              {showGrid && <rect width="100%" height="100%" fill="url(#grid)" />}

              {/* Main Chart */}
              {historicalData.length > 1 && (() => {
                const width = 100;
                const height = showVolume ? 75 : 90;
                const padding = 3;
                
                const prices = historicalData.map(d => d.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceRange = maxPrice - minPrice || 1;
                
                const points = historicalData.map((d, i) => {
                  const x = padding + ((width - 2 * padding) * i) / (historicalData.length - 1);
                  const y = padding + ((maxPrice - d.price) / priceRange) * (height - 2 * padding);
                  return `${x},${y}`;
                }).join(' ');
                
                const isChartPositive = historicalData[historicalData.length - 1].price >= historicalData[0].price;
                const lineColor = isChartPositive ? '#10b981' : '#ef4444';
                
                return (
                  <g>
                    {/* Area fill */}
                    {chartType === 'area' && (
                      <polygon
                        points={`${padding},${height} ${points} ${width - padding},${height}`}
                        fill="url(#chartGradient)"
                      />
                    )}
                    
                    {/* Main line */}
                    <polyline
                      points={points}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Candlesticks (if candlestick mode) */}
                    {chartType === 'candlestick' && historicalData.map((d, i) => {
                      const x = padding + ((width - 2 * padding) * i) / (historicalData.length - 1);
                      const open = padding + ((maxPrice - d.price * 0.998) / priceRange) * (height - 2 * padding);
                      const close = padding + ((maxPrice - d.price) / priceRange) * (height - 2 * padding);
                      const high = padding + ((maxPrice - d.price * 1.002) / priceRange) * (height - 2 * padding);
                      const low = padding + ((maxPrice - d.price * 0.996) / priceRange) * (height - 2 * padding);
                      const isBullish = close < open;
                      
                      return (
                        <g key={i}>
                          {/* Wick */}
                          <line
                            x1={`${x}%`}
                            y1={`${high}%`}
                            x2={`${x}%`}
                            y2={`${low}%`}
                            stroke={isBullish ? '#10b981' : '#ef4444'}
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                          />
                          {/* Body */}
                          <rect
                            x={`${x - 0.3}%`}
                            y={`${Math.min(open, close)}%`}
                            width="0.6%"
                            height={`${Math.abs(close - open)}%`}
                            fill={isBullish ? '#10b981' : '#ef4444'}
                            stroke={isBullish ? '#10b981' : '#ef4444'}
                          />
                        </g>
                      );
                    })}

                    {/* Moving Average Lines */}
                    {activeIndicators.includes('sma') && (
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="5,5"
                        opacity="0.7"
                      />
                    )}

                    {activeIndicators.includes('ema') && (
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="3,3"
                        opacity="0.7"
                      />
                    )}

                    {/* Price labels on Y-axis */}
                    <g className="text-xs" fill="#9ca3af">
                      <text x="2%" y={`${padding + 2}%`} fontSize="10" fill="#9ca3af">
                        {formatPrice(maxPrice)}
                      </text>
                      <text x="2%" y={`${height - 2}%`} fontSize="10" fill="#9ca3af">
                        {formatPrice(minPrice)}
                      </text>
                    </g>
                  </g>
                );
              })()}

              {/* Volume bars */}
              {showVolume && historicalData.length > 1 && (
                <g>
                  {historicalData.map((d, i) => {
                    const maxVolume = Math.max(...historicalData.map(d => d.price * 1000)); // Mock volume
                    const volume = d.price * 1000;
                    const x = 3 + ((94) * i) / (historicalData.length - 1);
                    const barHeight = (volume / maxVolume) * 15;
                    const y = 90 - barHeight;
                    
                    return (
                      <rect
                        key={`vol-${i}`}
                        x={`${x}%`}
                        y={`${y}%`}
                        width={`${80 / historicalData.length}%`}
                        height={`${barHeight}%`}
                        fill={isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                      />
                    );
                  })}
                </g>
              )}

              {/* Crosshair overlay */}
              {showCrosshair && (
                <g className="pointer-events-none">
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" strokeDasharray="4,4" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" strokeDasharray="4,4" />
                </g>
              )}
            </svg>

            {/* Indicator Badges */}
            {activeIndicators.length > 0 && activeIndicators[0] !== 'none' && (
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {activeIndicators.map((indicator) => (
                  indicator !== 'none' && (
                    <div
                      key={indicator}
                      className="px-3 py-1 bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-lg text-xs font-bold flex items-center gap-2"
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        indicator === 'sma' ? 'bg-blue-500' :
                        indicator === 'ema' ? 'bg-purple-500' :
                        indicator === 'rsi' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      {indicator.toUpperCase()}
                      <button
                        onClick={() => toggleIndicator(indicator)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Live Price Indicator */}
            <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </div>
                <span className="text-xs text-gray-400 font-medium">LIVE</span>
              </div>
              <div className="text-3xl font-black mb-1">{formatPrice(asset.price)}</div>
              <div className={`flex items-center gap-2 ${changeColor} font-bold text-sm`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isPositive ? '+' : ''}{formatPrice(asset.change)}
                <span className="text-xs">({isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%)</span>
              </div>
            </div>
          </div>

          {/* Bottom Stats Bar */}
          <div className="bg-gray-900 border-t border-gray-800 px-6 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-8">
              <div>
                <div className="text-gray-400 text-xs mb-1">24h High</div>
                <div className="text-green-400 font-bold">{formatPrice(asset.high24h)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">24h Low</div>
                <div className="text-red-400 font-bold">{formatPrice(asset.low24h)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">24h Volume</div>
                <div className="font-bold">{formatVolume(asset.volume)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Market Cap</div>
                <div className="font-bold">{formatVolume(asset.marketCap)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Last updated: Just now</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Order Book & Trades */}
        {(showOrderBook || showTrades) && (
          <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0">
            {/* Tabs */}
            <div className="border-b border-gray-800 flex">
              <button
                onClick={() => setShowOrderBook(true)}
                className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
                  showOrderBook ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
                }`}
              >
                Order Book
              </button>
              <button
                onClick={() => setShowTrades(true)}
                className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
                  showTrades ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
                }`}
              >
                Recent Trades
              </button>
            </div>

            {/* Order Book */}
            {showOrderBook && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs text-gray-400 font-bold mb-2">
                    <span>Price ({symbol})</span>
                    <span>Amount</span>
                    <span>Total</span>
                  </div>
                  
                  {/* Sell Orders (Red) */}
                  {[...Array(8)].map((_, i) => {
                    const price = asset.price * (1 + (8 - i) * 0.001);
                    const amount = Math.random() * 10;
                    return (
                      <div key={`sell-${i}`} className="flex justify-between text-xs relative">
                        <div className="absolute inset-0 bg-red-500/10" style={{ width: `${Math.random() * 100}%` }}></div>
                        <span className="text-red-400 font-mono relative z-10">{formatPrice(price)}</span>
                        <span className="text-gray-400 relative z-10">{amount.toFixed(4)}</span>
                        <span className="text-gray-500 relative z-10">{(price * amount).toFixed(2)}</span>
                      </div>
                    );
                  })}

                  {/* Current Price */}
                  <div className={`flex items-center justify-center py-2 ${changeBg} ${changeColor} font-bold text-sm rounded`}>
                    {formatPrice(asset.price)}
                    <TrendingUp className="w-4 h-4 ml-1" />
                  </div>

                  {/* Buy Orders (Green) */}
                  {[...Array(8)].map((_, i) => {
                    const price = asset.price * (1 - i * 0.001);
                    const amount = Math.random() * 10;
                    return (
                      <div key={`buy-${i}`} className="flex justify-between text-xs relative">
                        <div className="absolute inset-0 bg-green-500/10" style={{ width: `${Math.random() * 100}%` }}></div>
                        <span className="text-green-400 font-mono relative z-10">{formatPrice(price)}</span>
                        <span className="text-gray-400 relative z-10">{amount.toFixed(4)}</span>
                        <span className="text-gray-500 relative z-10">{(price * amount).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Trades */}
            {showTrades && !showOrderBook && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400 font-bold mb-2">
                    <span>Price ({symbol})</span>
                    <span>Amount</span>
                    <span>Time</span>
                  </div>
                  
                  {[...Array(20)].map((_, i) => {
                    const isBuy = Math.random() > 0.5;
                    const price = asset.price * (1 + (Math.random() - 0.5) * 0.01);
                    const amount = Math.random() * 5;
                    const time = new Date(Date.now() - i * 1000 * 60);
                    
                    return (
                      <div key={`trade-${i}`} className="flex justify-between text-xs py-1">
                        <span className={`font-mono ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPrice(price)}
                        </span>
                        <span className="text-gray-400">{amount.toFixed(4)}</span>
                        <span className="text-gray-500">{time.toLocaleTimeString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Trade Panel */}
            <div className="border-t border-gray-800 p-4">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setSelectedOrderType('market')}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded transition-colors ${
                    selectedOrderType === 'market' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Market
                </button>
                <button
                  onClick={() => setSelectedOrderType('limit')}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded transition-colors ${
                    selectedOrderType === 'limit' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Limit
                </button>
                <button
                  onClick={() => setSelectedOrderType('stop')}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded transition-colors ${
                    selectedOrderType === 'stop' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Stop
                </button>
              </div>
              
              <div className="space-y-2 mb-3">
                <input
                  type="number"
                  placeholder="Price"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition-colors">
                  Buy
                </button>
                <button className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors">
                  Sell
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChartPage() {
  return (
    <ProtectedRoute>
      <ChartPageContent />
    </ProtectedRoute>
  );
}
