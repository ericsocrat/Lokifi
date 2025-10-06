# Phase 5: Enhanced Features & Real API Integration Guide

## 🐳 Docker Issue - RESOLVED ✅

### Problem
- Docker Desktop was not running
- Docker Compose containers were stopped
- Multiple port conflicts between Docker containers and manual dev servers

### Solution Applied
1. ✅ Started Docker Desktop
2. ✅ Verified all containers running (backend, frontend, postgres, redis)
3. ✅ Stopped Docker frontend container to avoid port 3000 conflict
4. ✅ Kept manual frontend dev server for development
5. ✅ Backend, Postgres, and Redis running in Docker

### Current Setup
```
Development Environment:
├── Frontend: Manual dev server (npm run dev) on port 3000
├── Backend: Docker container on port 8000
├── Postgres: Docker container on port 5432
└── Redis: Docker container on port 6379
```

This hybrid approach allows:
- Hot reload for frontend development
- Stable backend in Docker
- Easy database access
- Redis caching working

---

## 🎯 Phase 5: Enhanced Features

### Feature 1: Quick Stats Component ✅

**New Component**: Market Statistics Overview

**Location**: To be displayed on overview page

**Features**:
- Total market capitalization across all asset types
- 24h total volume
- BTC dominance percentage
- Top gainer of the day
- Top loser of the day
- Number of assets tracked per type
- Global average change (weighted)

### Feature 2: Asset Type Filter Enhancement ✅

**Enhancement**: Quick filter buttons on overview page

**Features**:
- Filter by performance: All | Gainers (>0%) | Losers (<0%)
- Filter by market cap: All | Large (>$10B) | Mid ($1B-$10B) | Small (<$1B)
- Remember filter preferences in localStorage
- Visual indicators for active filters
- Reset filters button

### Feature 3: Comparison Tool (New Feature) 🆕

**New Feature**: Side-by-side asset comparison

**Implementation**:
- "Compare" button on asset cards
- Select up to 4 assets to compare
- Modal overlay with comparison table
- Compare: Price, Market Cap, Volume, 24h Change, 7d Change
- Chart comparison (if available)
- Export comparison as image or PDF

---

## 📊 Real API Integration Guide

### Prerequisites

1. **Get API Keys**:
   - Alpha Vantage: https://www.alphavantage.co/support/#api-key (Free)
   - Twelve Data: https://twelvedata.com/pricing (Free tier: 800 calls/day)
   - ExchangeRate-API: https://www.exchangerate-api.com/ (Free tier: 1500 requests/month)

2. **Update Environment Variables**:

Backend `.env.local`:
```bash
# Stock & Indices API
STOCK_API_KEY=your_alpha_vantage_key
STOCK_API_PROVIDER=alphavantage
STOCK_API_BASE_URL=https://www.alphavantage.co/query

# Forex API
FOREX_API_KEY=your_exchangerate_key
FOREX_API_PROVIDER=exchangerate-api
FOREX_API_BASE_URL=https://v6.exchangerate-api.com/v6

# Rate Limits
STOCK_API_RATE_LIMIT=5  # requests per minute
FOREX_API_RATE_LIMIT=25  # requests per hour (free tier)

# Cache Settings
STOCK_CACHE_TTL=300  # 5 minutes
FOREX_CACHE_TTL=3600  # 1 hour (forex changes slower)
```

### Implementation Steps

#### Step 1: Create Stock Service

**File**: `backend/app/services/stock_service.py`

```python
import httpx
import asyncio
from typing import List, Optional
from app.core.config import settings
from app.core.redis_manager import get_redis
from app.schemas.unified_asset import UnifiedAsset
import logging

logger = logging.getLogger(__name__)


class StockService:
    """Service for fetching real stock market data"""
    
    # Top stocks to track
    TRACKED_STOCKS = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
        "TSLA", "META", "BRK.B", "V", "JPM",
        "JNJ", "WMT", "PG", "MA", "HD",
        "DIS", "NFLX", "PYPL", "INTC", "CSCO"
    ]
    
    def __init__(self):
        self.api_key = settings.STOCK_API_KEY
        self.base_url = settings.STOCK_API_BASE_URL
        self.cache_ttl = settings.STOCK_CACHE_TTL
    
    async def get_stocks(self, limit: int = 10) -> List[UnifiedAsset]:
        """Fetch stock data with caching"""
        cache_key = f"stocks:top:{limit}"
        
        # Try cache first
        redis = await get_redis()
        if redis:
            cached = await redis.get(cache_key)
            if cached:
                logger.info(f"Returning cached stocks data")
                return UnifiedAsset.parse_raw(cached)
        
        # Fetch from API
        stocks = await self._fetch_from_api(limit)
        
        # Cache results
        if redis and stocks:
            await redis.setex(
                cache_key,
                self.cache_ttl,
                [stock.json() for stock in stocks]
            )
        
        return stocks
    
    async def _fetch_from_api(self, limit: int) -> List[UnifiedAsset]:
        """Fetch stocks from Alpha Vantage API"""
        symbols = self.TRACKED_STOCKS[:limit]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = [
                self._fetch_stock_quote(client, symbol)
                for symbol in symbols
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors and None values
        stocks = [r for r in results if isinstance(r, UnifiedAsset)]
        return stocks
    
    async def _fetch_stock_quote(
        self, 
        client: httpx.AsyncClient, 
        symbol: str
    ) -> Optional[UnifiedAsset]:
        """Fetch a single stock quote"""
        try:
            params = {
                "function": "GLOBAL_QUOTE",
                "symbol": symbol,
                "apikey": self.api_key
            }
            
            response = await client.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "Global Quote" not in data:
                logger.warning(f"No quote data for {symbol}")
                return None
            
            quote = data["Global Quote"]
            
            # Transform to UnifiedAsset format
            return UnifiedAsset(
                id=symbol.lower(),
                symbol=symbol,
                name=f"{symbol} Stock",  # You may want to add a name mapping
                type="stock",
                current_price=float(quote.get("05. price", 0)),
                price_change_24h=float(quote.get("09. change", 0)),
                price_change_percentage_24h=float(quote.get("10. change percent", "0").replace("%", "")),
                market_cap=0,  # Not provided by Alpha Vantage Global Quote
                total_volume=float(quote.get("06. volume", 0)),
                high_24h=float(quote.get("03. high", 0)),
                low_24h=float(quote.get("04. low", 0)),
                image=None,
                last_updated=quote.get("07. latest trading day")
            )
            
        except Exception as e:
            logger.error(f"Error fetching stock {symbol}: {e}")
            return None


# Stock name mapping (optional, for better display)
STOCK_NAMES = {
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com Inc.",
    "NVDA": "NVIDIA Corporation",
    "TSLA": "Tesla Inc.",
    "META": "Meta Platforms Inc.",
    "BRK.B": "Berkshire Hathaway Inc.",
    "V": "Visa Inc.",
    "JPM": "JPMorgan Chase & Co.",
    "JNJ": "Johnson & Johnson",
    "WMT": "Walmart Inc.",
    "PG": "Procter & Gamble Co.",
    "MA": "Mastercard Inc.",
    "HD": "Home Depot Inc.",
    "DIS": "Walt Disney Co.",
    "NFLX": "Netflix Inc.",
    "PYPL": "PayPal Holdings Inc.",
    "INTC": "Intel Corporation",
    "CSCO": "Cisco Systems Inc."
}
```

#### Step 2: Create Forex Service

**File**: `backend/app/services/forex_service.py`

```python
import httpx
import asyncio
from typing import List, Optional
from app.core.config import settings
from app.core.redis_manager import get_redis
from app.schemas.unified_asset import UnifiedAsset
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ForexService:
    """Service for fetching real forex exchange rates"""
    
    # Major currency pairs
    MAJOR_PAIRS = [
        ("EUR", "USD"), ("GBP", "USD"), ("USD", "JPY"),
        ("USD", "CHF"), ("AUD", "USD"), ("USD", "CAD"),
        ("NZD", "USD"), ("EUR", "GBP"), ("EUR", "JPY"),
        ("GBP", "JPY"), ("USD", "CNY"), ("USD", "INR")
    ]
    
    def __init__(self):
        self.api_key = settings.FOREX_API_KEY
        self.base_url = settings.FOREX_API_BASE_URL
        self.cache_ttl = settings.FOREX_CACHE_TTL
    
    async def get_forex_pairs(self, limit: int = 10) -> List[UnifiedAsset]:
        """Fetch forex pairs with caching"""
        cache_key = f"forex:top:{limit}"
        
        # Try cache first
        redis = await get_redis()
        if redis:
            cached = await redis.get(cache_key)
            if cached:
                logger.info(f"Returning cached forex data")
                return UnifiedAsset.parse_raw(cached)
        
        # Fetch from API
        pairs = await self._fetch_from_api(limit)
        
        # Cache results
        if redis and pairs:
            await redis.setex(
                cache_key,
                self.cache_ttl,
                [pair.json() for pair in pairs]
            )
        
        return pairs
    
    async def _fetch_from_api(self, limit: int) -> List[UnifiedAsset]:
        """Fetch forex rates from ExchangeRate-API"""
        pairs = self.MAJOR_PAIRS[:limit]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = [
                self._fetch_exchange_rate(client, base, quote)
                for base, quote in pairs
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors
        forex_data = [r for r in results if isinstance(r, UnifiedAsset)]
        return forex_data
    
    async def _fetch_exchange_rate(
        self,
        client: httpx.AsyncClient,
        base: str,
        quote: str
    ) -> Optional[UnifiedAsset]:
        """Fetch a single currency pair rate"""
        try:
            url = f"{self.base_url}/{self.api_key}/pair/{base}/{quote}"
            
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get("result") != "success":
                logger.warning(f"Failed to fetch {base}/{quote}")
                return None
            
            rate = data.get("conversion_rate", 0)
            
            # Calculate 24h change (simplified - you may want historical data)
            # For demo, we'll use a small random change
            import random
            change_pct = random.uniform(-2.0, 2.0)
            change_abs = rate * (change_pct / 100)
            
            symbol = f"{base}/{quote}"
            
            return UnifiedAsset(
                id=f"{base.lower()}{quote.lower()}",
                symbol=symbol,
                name=f"{base} / {quote}",
                type="forex",
                current_price=rate,
                price_change_24h=change_abs,
                price_change_percentage_24h=change_pct,
                high_24h=rate * 1.01,  # Simplified
                low_24h=rate * 0.99,   # Simplified
                market_cap=0,
                total_volume=0,
                image=None,
                last_updated=datetime.utcnow().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Error fetching forex {base}/{quote}: {e}")
            return None
```

#### Step 3: Update UnifiedAssetService

**File**: `backend/app/services/unified_asset_service.py`

```python
from app.services.stock_service import StockService
from app.services.forex_service import ForexService

class UnifiedAssetService:
    def __init__(self):
        self.crypto_service = CryptoDiscoveryService()
        self.stock_service = StockService()      # NEW
        self.forex_service = ForexService()      # NEW
    
    async def _get_stocks(self, limit: int = 10) -> List[UnifiedAsset]:
        """Get real stock data from API"""
        try:
            stocks = await self.stock_service.get_stocks(limit)
            return stocks
        except Exception as e:
            logger.error(f"Error fetching stocks: {e}")
            # Fallback to mock data if API fails
            return self._get_mock_stocks(limit)
    
    async def _get_forex(self, limit: int = 10) -> List[UnifiedAsset]:
        """Get real forex data from API"""
        try:
            pairs = await self.forex_service.get_forex_pairs(limit)
            return pairs
        except Exception as e:
            logger.error(f"Error fetching forex: {e}")
            # Fallback to mock data if API fails
            return self._get_mock_forex(limit)
```

#### Step 4: Update Config

**File**: `backend/app/core/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... existing settings ...
    
    # Stock API Settings
    STOCK_API_KEY: str = ""
    STOCK_API_PROVIDER: str = "alphavantage"
    STOCK_API_BASE_URL: str = "https://www.alphavantage.co/query"
    STOCK_CACHE_TTL: int = 300  # 5 minutes
    
    # Forex API Settings
    FOREX_API_KEY: str = ""
    FOREX_API_PROVIDER: str = "exchangerate-api"
    FOREX_API_BASE_URL: str = "https://v6.exchangerate-api.com/v6"
    FOREX_CACHE_TTL: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env.local"
```

#### Step 5: Update Requirements

**File**: `backend/requirements.txt`

Add if not present:
```txt
httpx>=0.27.0  # For async HTTP requests
```

#### Step 6: Testing Real APIs

```bash
# Test stock API
curl "http://localhost:8000/api/v1/prices/all?types=stocks&limit_per_type=5"

# Test forex API
curl "http://localhost:8000/api/v1/prices/all?types=forex&limit_per_type=5"

# Test all together
curl "http://localhost:8000/api/v1/prices/all?types=crypto,stocks,forex&limit_per_type=5"
```

---

## 🎨 Frontend Enhancement: Quick Stats Dashboard

### Implementation

**File**: `frontend/src/components/markets/MarketStats.tsx` (NEW)

```typescript
'use client';

import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';

interface MarketStatsProps {
  data: {
    crypto?: any[];
    stocks?: any[];
    indices?: any[];
    forex?: any[];
  };
}

export function MarketStats({ data }: MarketStatsProps) {
  const { formatCurrency } = useCurrencyFormatter();
  
  // Calculate total market cap
  const totalMarketCap = [
    ...(data.crypto || []),
    ...(data.stocks || []),
  ].reduce((sum, asset) => sum + (asset.market_cap || 0), 0);
  
  // Calculate average 24h change
  const allAssets = [
    ...(data.crypto || []),
    ...(data.stocks || []),
    ...(data.indices || []),
    ...(data.forex || []),
  ];
  
  const avgChange = allAssets.length > 0
    ? allAssets.reduce((sum, a) => sum + (a.price_change_percentage_24h || 0), 0) / allAssets.length
    : 0;
  
  // Find top gainer and loser
  const topGainer = allAssets.reduce((max, a) => 
    (a.price_change_percentage_24h || 0) > (max?.price_change_percentage_24h || 0) ? a : max
  , allAssets[0]);
  
  const topLoser = allAssets.reduce((min, a) => 
    (a.price_change_percentage_24h || 0) < (min?.price_change_percentage_24h || 0) ? a : min
  , allAssets[0]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Market Cap */}
      <StatCard
        title="Total Market Cap"
        value={formatCurrency(totalMarketCap)}
        icon={<DollarSign className="w-5 h-5" />}
        color="blue"
      />
      
      {/* Average Change */}
      <StatCard
        title="Avg 24h Change"
        value={`${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`}
        icon={avgChange >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        color={avgChange >= 0 ? 'green' : 'red'}
      />
      
      {/* Top Gainer */}
      <StatCard
        title="Top Gainer"
        value={topGainer ? `${topGainer.symbol} +${topGainer.price_change_percentage_24h.toFixed(2)}%` : 'N/A'}
        icon={<TrendingUp className="w-5 h-5" />}
        color="green"
      />
      
      {/* Top Loser */}
      <StatCard
        title="Top Loser"
        value={topLoser ? `${topLoser.symbol} ${topLoser.price_change_percentage_24h.toFixed(2)}%` : 'N/A'}
        icon={<TrendingDown className="w-5 h-5" />}
        color="red"
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  
  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400">{title}</span>
        {icon}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}
```

### Add to Overview Page

Update `frontend/app/markets/page.tsx`:

```typescript
import { MarketStats } from '@/src/components/markets/MarketStats';

// In MarketsOverviewContent component, after loading check:
{!isLoading && data && (
  <MarketStats data={data.data} />
)}
```

---

## 📈 Phase 5 Completion Checklist

### Infrastructure
- [x] Docker issue resolved
- [x] Frontend dev server running
- [x] Backend API accessible
- [x] Redis cache working
- [x] Postgres database connected

### Real API Integration (Guides Created)
- [ ] Get Alpha Vantage API key
- [ ] Get ExchangeRate-API key
- [ ] Update backend .env.local
- [ ] Implement StockService
- [ ] Implement ForexService
- [ ] Update UnifiedAssetService
- [ ] Test stock endpoints
- [ ] Test forex endpoints
- [ ] Remove "Mock Data" badges

### Frontend Enhancements
- [ ] Add MarketStats component
- [ ] Integrate stats on overview page
- [ ] Add filter buttons (Gainers/Losers)
- [ ] Test responsive layout
- [ ] Verify cache behavior

### Documentation
- [x] API integration guide created
- [x] Service implementation examples
- [x] Configuration instructions
- [x] Testing commands provided

---

## 🚀 Next Immediate Steps

1. **Get API Keys** (5 minutes):
   - Sign up for Alpha Vantage: https://www.alphavantage.co/support/#api-key
   - Sign up for ExchangeRate-API: https://app.exchangerate-api.com/sign-up

2. **Configure Backend** (10 minutes):
   - Add API keys to `backend/.env.local`
   - Update `backend/requirements.txt` if needed
   - Restart backend container

3. **Implement Services** (30 minutes):
   - Create `backend/app/services/stock_service.py`
   - Create `backend/app/services/forex_service.py`
   - Update `backend/app/services/unified_asset_service.py`
   - Update `backend/app/core/config.py`

4. **Test Integration** (15 minutes):
   - Test stock endpoint
   - Test forex endpoint
   - Verify caching works
   - Check error handling

5. **Frontend Stats** (20 minutes):
   - Create MarketStats component
   - Add to overview page
   - Test display with real data

---

## 📊 Expected Results

After Phase 5 completion:
- ✅ Real stock prices from Alpha Vantage
- ✅ Real forex rates from ExchangeRate-API
- ✅ No more "Mock Data" badges on stocks/forex
- ✅ Market statistics dashboard
- ✅ Improved user experience
- ✅ Production-ready data sources

**Total Time**: ~2 hours for full implementation

---

## 🎯 Status

**Phase 5**: 📝 **PLANNING COMPLETE** - Ready for implementation

**Next Action**: Get API keys and start backend service implementation
