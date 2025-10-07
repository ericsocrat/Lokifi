# 🎨 Frontend Integration Guide - Tasks 6-8

**Created**: October 6, 2025  
**Purpose**: Complete guide for integrating backend price features into frontend pages

---

## 📁 New Files Created

### 1. Backend Service (`src/services/backendPriceService.ts`)
- ✅ `HistoricalDataService` - Fetch historical prices & OHLCV data
- ✅ `CryptoDiscoveryService` - Get top 300 cryptos & search
- ✅ `WebSocketPriceService` - Real-time price updates (30-second intervals)
- ✅ Singleton WebSocket instance with auto-reconnect

### 2. React Hooks (`src/hooks/useBackendPrices.ts`)
- ✅ `useHistoricalPrices()` - Fetch & cache historical data
- ✅ `useOHLCV()` - Fetch candlestick data for charts
- ✅ `useTopCryptos()` - Get top cryptocurrencies
- ✅ `useCryptoSearch()` - Search cryptos with debouncing
- ✅ `useWebSocketPrices()` - Real-time price subscriptions
- ✅ `useBatchHistoricalPrices()` - Fetch multiple symbols at once
- ✅ `useAssetData()` - Combined historical + real-time data

---

## 🚀 Quick Start Examples

### Example 1: Add Historical Chart to Asset Page

**File**: `app/asset/[symbol]/page.tsx`

```typescript
import { useHistoricalPrices } from '@/src/hooks/useBackendPrices';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AssetPage({ params }: { params: { symbol: string } }) {
  const { data, loading, error } = useHistoricalPrices(params.symbol, '1m');

  if (loading) return <div>Loading chart...</div>;
  if (error) return <div>Error loading chart</div>;

  return (
    <div className="w-full h-96">
      <h2>Price History - {params.symbol}</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data?.data || []}>
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(ts) => new Date(ts).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip 
            labelFormatter={(ts) => new Date(ts).toLocaleString()}
            formatter={(value: number) => ['$' + value.toFixed(2), 'Price']}
          />
          <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Example 2: Add Crypto Discovery to Markets Page

**File**: `app/markets/page.tsx`

```typescript
import { useTopCryptos, useCryptoSearch } from '@/src/hooks/useBackendPrices';
import { useState } from 'react';

export default function MarketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { cryptos, loading } = useTopCryptos(100);
  const { results: searchResults, loading: searching } = useCryptoSearch(searchQuery);

  const displayCryptos = searchQuery ? searchResults : cryptos;

  return (
    <div>
      <h1>Crypto Markets</h1>
      
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search cryptocurrencies..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-3 border rounded-lg"
      />

      {/* Crypto List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {displayCryptos.map((crypto) => (
          <div key={crypto.id} className="border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <img src={crypto.image} alt={crypto.name} className="w-10 h-10" />
              <div>
                <h3 className="font-bold">{crypto.name}</h3>
                <p className="text-sm text-gray-500">{crypto.symbol.toUpperCase()}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">${crypto.current_price.toFixed(2)}</p>
              <p className={crypto.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}>
                {crypto.price_change_percentage_24h.toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 3: Add Real-Time Updates to Portfolio

**File**: `app/portfolio/page.tsx`

```typescript
import { useWebSocketPrices } from '@/src/hooks/useBackendPrices';
import { useEffect } from 'react';

export default function PortfolioPage() {
  const { prices, connected, subscribe } = useWebSocketPrices({
    autoConnect: true,
  });

  const portfolioSymbols = ['BTC', 'ETH', 'AAPL', 'TSLA'];

  useEffect(() => {
    if (connected) {
      subscribe(portfolioSymbols);
    }
  }, [connected]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{connected ? 'Live' : 'Disconnected'}</span>
      </div>

      <div className="space-y-4">
        {portfolioSymbols.map((symbol) => {
          const price = prices[symbol];
          return (
            <div key={symbol} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">{symbol}</h3>
                {price && (
                  <div className="text-right">
                    <p className="text-2xl font-bold">${price.price.toFixed(2)}</p>
                    <p className={price.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {price.change_percent >= 0 ? '+' : ''}{price.change_percent.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      Updated: {new Date(price.last_updated).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Example 4: OHLCV Candlestick Chart

**File**: `app/charts/page.tsx`

```typescript
import { useOHLCV } from '@/src/hooks/useBackendPrices';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ChartsPage() {
  const [symbol, setSymbol] = useState('BTC');
  const [period, setPeriod] = useState<'1d' | '1w' | '1m'>('1w');
  const { candles, loading } = useOHLCV(symbol, period, 'D');

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          <option value="BTC">Bitcoin</option>
          <option value="ETH">Ethereum</option>
          <option value="AAPL">Apple</option>
        </select>
        
        <select value={period} onChange={(e) => setPeriod(e.target.value as any)}>
          <option value="1d">1 Day</option>
          <option value="1w">1 Week</option>
          <option value="1m">1 Month</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={candles}>
          <XAxis 
            dataKey="timestamp"
            tickFormatter={(ts) => new Date(ts).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="volume" fill="#e5e7eb" opacity={0.3} />
          <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 📊 Integration Checklist by Page

### ✅ `/markets` Page
**Features to Add:**
- [ ] Top 300 crypto list using `useTopCryptos()`
- [ ] Crypto search bar using `useCryptoSearch()`
- [ ] Display crypto icons from `crypto.image`
- [ ] Real-time price updates using `useWebSocketPrices()`
- [ ] Filter by market cap rank
- [ ] Sort by 24h change

**Code Location**: `frontend/app/markets/page.tsx`

### ✅ `/charts` Page  
**Features to Add:**
- [ ] Historical price charts using `useHistoricalPrices()`
- [ ] OHLCV candlestick charts using `useOHLCV()`
- [ ] Period selector (1d, 1w, 1m, 3m, 6m, 1y, 5y, all)
- [ ] Resolution selector (1min, 5min, 15min, 1hour, 1day, 1week)
- [ ] Technical indicators (RSI, MACD, Bollinger Bands)
- [ ] Compare multiple assets

**Code Location**: `frontend/app/charts/page.tsx` (needs creation)

### ✅ `/assets` or `/portfolio/assets` Page
**Features to Add:**
- [ ] Asset price history using `useHistoricalPrices()`
- [ ] Real-time price updates using `useWebSocketPrices()`
- [ ] Performance metrics (1D, 7D, 30D, 1Y changes)
- [ ] Mini charts for each asset
- [ ] WebSocket connection status indicator

**Code Location**: `frontend/app/portfolio/assets/page.tsx`

### ✅ `/asset/[symbol]` Detail Page
**Features to Add:**
- [ ] Full historical chart using `useHistoricalPrices()`
- [ ] OHLCV candlestick view using `useOHLCV()`
- [ ] Real-time price ticker using `useWebSocketPrices()`
- [ ] Period selector
- [ ] Chart type toggle (Line / Candlestick)
- [ ] Price statistics (high, low, volume, market cap)

**Code Location**: `frontend/app/asset/[symbol]/page.tsx`

### ✅ Dashboard/Portfolio Overview
**Features to Add:**
- [ ] Portfolio value tracking with real-time updates
- [ ] WebSocket price feed for all holdings
- [ ] Historical performance chart for portfolio
- [ ] Top gainers/losers from holdings

**Code Location**: `frontend/app/dashboard/page.tsx`

---

## 🎨 Component Examples

### Historical Chart Component

```typescript
// components/HistoricalChart.tsx
import { useHistoricalPrices } from '@/src/hooks/useBackendPrices';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  symbol: string;
  period?: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '5y' | 'all';
  className?: string;
}

export function HistoricalChart({ symbol, period = '1m', className }: Props) {
  const { data, loading, error, isCached } = useHistoricalPrices(symbol, period);

  if (loading) {
    return <div className={className}>Loading chart...</div>;
  }

  if (error) {
    return <div className={className}>Failed to load chart</div>;
  }

  return (
    <div className={className}>
      <div className="flex justify-between mb-2">
        <h3 className="font-bold">{symbol} - {period.toUpperCase()}</h3>
        {isCached && <span className="text-xs text-gray-500">⚡ Cached</span>}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data?.data || []}>
          <XAxis dataKey="timestamp" tickFormatter={(ts) => new Date(ts).toLocaleDateString()} />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip 
            labelFormatter={(ts) => new Date(ts).toLocaleString()}
            formatter={(value: number) => ['$' + value.toFixed(2), 'Price']}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Crypto Search Component

```typescript
// components/CryptoSearch.tsx
import { useCryptoSearch } from '@/src/hooks/useBackendPrices';
import { useState } from 'react';
import { Search } from 'lucide-react';

interface Props {
  onSelect?: (crypto: any) => void;
}

export function CryptoSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const { results, loading } = useCryptoSearch(query);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search cryptocurrencies..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      {loading && (
        <div className="absolute top-full left-0 right-0 mt-1 p-4 bg-white border rounded-lg shadow-lg">
          <p className="text-sm text-gray-500">Searching...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-96 overflow-y-auto bg-white border rounded-lg shadow-lg">
          {results.map((crypto) => (
            <button
              key={crypto.id}
              onClick={() => onSelect?.(crypto)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
            >
              <img src={crypto.image} alt={crypto.name} className="w-8 h-8" />
              <div className="flex-1">
                <p className="font-medium">{crypto.name}</p>
                <p className="text-sm text-gray-500">{crypto.symbol.toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">${crypto.current_price.toFixed(2)}</p>
                <p className={`text-sm ${crypto.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {crypto.price_change_percentage_24h.toFixed(2)}%
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Real-Time Price Ticker

```typescript
// components/PriceTicker.tsx
import { useWebSocketPrices } from '@/src/hooks/useBackendPrices';
import { useEffect } from 'react';
import { Activity } from 'lucide-react';

interface Props {
  symbol: string;
  showChange?: boolean;
  className?: string;
}

export function PriceTicker({ symbol, showChange = true, className }: Props) {
  const { prices, connected, subscribe } = useWebSocketPrices({ autoConnect: true });

  useEffect(() => {
    if (connected) {
      subscribe([symbol]);
    }
  }, [connected, symbol, subscribe]);

  const price = prices[symbol];

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Activity className={`w-4 h-4 ${connected ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
        {price ? (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">${price.price.toFixed(2)}</span>
            {showChange && (
              <span className={`text-sm font-medium ${price.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {price.change_percent >= 0 ? '+' : ''}{price.change_percent.toFixed(2)}%
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">Connecting...</span>
        )}
      </div>
    </div>
  );
}
```

---

## 🔧 Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api
```

For production:

```bash
NEXT_PUBLIC_API_URL=https://api.lokifi.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.lokifi.com/api
```

---

## 📦 Required Packages

Install chart library (if not already installed):

```bash
npm install recharts
# or
npm install chart.js react-chartjs-2
```

---

## 🎯 Priority Implementation Order

1. **HIGH PRIORITY** - Real-time updates in Portfolio page
   - Use `useWebSocketPrices()` for live price feed
   - Update portfolio values in real-time

2. **HIGH PRIORITY** - Crypto discovery in Markets page
   - Use `useTopCryptos()` to show 300+ cryptos
   - Use `useCryptoSearch()` for search functionality

3. **MEDIUM PRIORITY** - Historical charts in Asset pages
   - Use `useHistoricalPrices()` for price history
   - Add period selector (1d, 1w, 1m, etc.)

4. **MEDIUM PRIORITY** - OHLCV charts for advanced analysis
   - Use `useOHLCV()` for candlestick charts
   - Add to dedicated Charts page

5. **LOW PRIORITY** - Performance optimizations
   - Implement data caching
   - Add loading skeletons
   - Optimize re-renders

---

## 🚨 Important Notes

1. **Backend Must Be Running**: Start backend before testing:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --port 8000
   ```

2. **Redis Required**: WebSocket pub/sub needs Redis running

3. **CORS**: Backend already configured for `http://localhost:3000`

4. **Rate Limits**: Be mindful of API rate limits (especially for search)

5. **Error Handling**: All hooks include error states - use them!

6. **TypeScript**: All services are fully typed - enjoy autocomplete! ✨

---

## ✅ Testing Checklist

- [ ] Historical data loads for BTC
- [ ] OHLCV data displays candlesticks
- [ ] Crypto search returns results
- [ ] Top 300 cryptos load
- [ ] WebSocket connects successfully
- [ ] Real-time prices update every 30 seconds
- [ ] Charts render correctly
- [ ] Loading states work
- [ ] Error states work
- [ ] Reconnection works after disconnect

---

**Ready to integrate! Start with the high-priority items and progressively enhance your pages.** 🚀
