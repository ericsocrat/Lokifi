# 📐 Architecture Diagram - Tasks 6, 7, 8

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOKIFI FRONTEND                                 │
│                         (Next.js/React - Port 3000)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                    │
│  │   Charts     │   │  Crypto      │   │  Real-Time   │                    │
│  │  Component   │   │  Discovery   │   │  Dashboard   │                    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                    │
│         │                  │                  │                              │
│         │ HTTP             │ HTTP             │ WebSocket                    │
│         ▼                  ▼                  ▼                              │
└─────────┼──────────────────┼──────────────────┼──────────────────────────────┘
          │                  │                  │
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────────────────────────┐
│         │                  │                  │                              │
│         │     LOKIFI BACKEND (FastAPI - Port 8000)                          │
│         │                  │                  │                              │
│         ▼                  ▼                  ▼                              │
│  ┌────────────────┐ ┌──────────────┐ ┌───────────────────┐                │
│  │  smart_prices  │ │  smart_prices│ │ websocket_prices  │                │
│  │   Router       │ │   Router     │ │    Router         │                │
│  │                │ │              │ │                   │                │
│  │  /history      │ │  /crypto/top │ │  /ws/prices      │                │
│  │  /ohlcv        │ │  /crypto/*   │ │                   │                │
│  └────────┬───────┘ └──────┬───────┘ └─────────┬─────────┘                │
│           │                │                     │                          │
│           │                │                     │                          │
│           ▼                ▼                     ▼                          │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │                    SERVICE LAYER                          │              │
│  │                                                           │              │
│  │  ┌───────────────────┐  ┌──────────────────┐           │              │
│  │  │ Historical Price  │  │ Crypto Discovery │           │              │
│  │  │    Service        │  │     Service      │           │              │
│  │  │                   │  │                  │           │              │
│  │  │ • get_history()   │  │ • get_top_cryptos()         │              │
│  │  │ • get_ohlcv()     │  │ • search_cryptos()          │              │
│  │  │ • _fetch_*()      │  │ • get_mapping()             │              │
│  │  └─────────┬─────────┘  └──────────┬───────┘           │              │
│  │            │                        │                   │              │
│  │  ┌─────────────────────────────────────────┐           │              │
│  │  │    Smart Price Service (existing)        │           │              │
│  │  │                                           │           │              │
│  │  │  • get_price()                            │           │              │
│  │  │  • get_batch_prices()                     │           │              │
│  │  └─────────────────┬─────────────────────────┘           │              │
│  │                    │                                      │              │
│  │  ┌─────────────────────────────────────────┐            │              │
│  │  │    WebSocket Manager                     │            │              │
│  │  │                                           │            │              │
│  │  │  • PriceWebSocketManager                 │            │              │
│  │  │  • Connection tracking                   │            │              │
│  │  │  • Subscription management               │            │              │
│  │  │  • 30-second update loop                 │            │              │
│  │  └──────────────────┬──────────────────────┘            │              │
│  └───────────────────────┼──────────────────────────────────┘              │
│                          │                                                  │
└──────────────────────────┼──────────────────────────────────────────────────┘
                           │
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│                 │ │              │ │              │
│     REDIS       │ │   FINNHUB    │ │  COINGECKO   │
│   (Port 6379)   │ │     API      │ │     API      │
│                 │ │              │ │              │
│ • Price Cache   │ │ • Stock Data │ │ • Crypto Data│
│ • History Cache │ │ • OHLCV Data │ │ • OHLCV Data │
│ • Crypto Cache  │ │              │ │ • Top Cryptos│
│ • Pub/Sub       │ │              │ │ • Search     │
│                 │ │              │ │              │
└─────────────────┘ └──────────────┘ └──────────────┘
```

---

## 📊 Data Flow Diagrams

### 1. Historical Price Request

```
Client
  │
  │ GET /api/v1/prices/BTC/history?period=1m
  ▼
Router (smart_prices.py)
  │
  │ Dependency Injection
  ▼
HistoricalPriceService
  │
  ├─► Redis Cache Check (key: history:BTC:1m)
  │   │
  │   ├─► Cache HIT ✅
  │   │   └─► Return cached data (1-5ms)
  │   │
  │   └─► Cache MISS ❌
  │       │
  │       └─► Fetch from API
  │           │
  │           ├─► CoinGecko API (crypto)
  │           │   └─► /coins/bitcoin/market_chart
  │           │
  │           └─► Finnhub API (stocks)
  │               └─► /stock/candle
  │
  ├─► Transform Data
  │   └─► Convert to HistoricalPricePoint[]
  │
  ├─► Cache Result (TTL: 30 minutes)
  │
  └─► Return to Client

Total Time:
  • Cached: 1-5ms ⚡
  • API Call: 500-2000ms 🐢
```

### 2. Crypto Discovery Flow

```
Client
  │
  │ GET /api/v1/prices/crypto/top?limit=100
  ▼
Router (smart_prices.py)
  │
  │ Dependency Injection
  ▼
CryptoDiscoveryService
  │
  ├─► Redis Cache Check (key: crypto:top:100)
  │   │
  │   ├─► Cache HIT ✅ (within 1 hour)
  │   │   └─► Return cached data (10-20ms)
  │   │
  │   └─► Cache MISS ❌
  │       │
  │       └─► CoinGecko API
  │           │
  │           ├─► /coins/markets?per_page=100&page=1
  │           │   └─► Get first 100 cryptos
  │           │
  │           ├─► (Optional) /coins/markets?page=2
  │           │   └─► Get next batch if limit > 100
  │           │
  │           └─► Transform to CryptoAsset[]
  │
  ├─► Cache Result (TTL: 1 hour)
  │
  └─► Return to Client

Rate Limit: 10-50 requests/minute (CoinGecko)
```

### 3. WebSocket Real-Time Updates

```
Client Browser
  │
  │ WebSocket Connection
  │ ws://localhost:8000/api/ws/prices
  ▼
WebSocket Router
  │
  ├─► Accept Connection
  │   └─► Assign client_id
  │
  ├─► Add to active_connections{}
  │
  └─► Start Update Loop (if not running)
      │
      │ Every 30 seconds:
      │
      ├─► Collect all subscribed symbols
      │   └─► Set(['BTC', 'ETH', 'AAPL', ...])
      │
      ├─► Fetch prices
      │   │
      │   └─► SmartPriceService.get_batch_prices()
      │       │
      │       ├─► Check Redis cache
      │       │
      │       └─► Fetch missing from APIs
      │
      ├─► Publish to Redis Pub/Sub
      │   └─► Channel: lokifi:price_updates
      │       └─► Enables horizontal scaling
      │
      └─► Send to each client
          │
          ├─► Filter by client subscriptions
          │   └─► Client A: ['BTC', 'ETH']
          │   └─► Client B: ['AAPL', 'TSLA']
          │
          └─► ws.send_json({
                type: 'price_update',
                data: { BTC: {...}, ETH: {...} }
              })

Client receives update → Updates UI → Wait 30s → Repeat
```

---

## 🔄 Caching Strategy

```
┌────────────────────────────────────────────────────────┐
│                    REDIS CACHE                          │
├────────────────────────────────────────────────────────┤
│                                                         │
│  price:{SYMBOL}              TTL: 60 seconds           │
│  └─► Current price cache                               │
│                                                         │
│  history:{SYMBOL}:{PERIOD}   TTL: 1800 seconds (30m)  │
│  └─► Historical price data                             │
│                                                         │
│  ohlcv:{SYMBOL}:{PERIOD}     TTL: 1800 seconds (30m)  │
│  └─► Candlestick data                                  │
│                                                         │
│  crypto:top:{LIMIT}          TTL: 3600 seconds (1h)   │
│  └─► Top cryptocurrencies list                         │
│                                                         │
│  Channel: lokifi:price_updates                         │
│  └─► Pub/Sub for WebSocket scaling                     │
│                                                         │
└────────────────────────────────────────────────────────┘

Cache Hit Rates (Expected):
  • Current prices: 75-85%
  • Historical data: 85-95%
  • Crypto lists: 90-95%
```

---

## 🔌 WebSocket State Machine

```
┌─────────────┐
│   CREATED   │
└──────┬──────┘
       │
       │ client.connect()
       ▼
┌─────────────┐       ┌──────────────┐
│  CONNECTED  │◄──────┤ SUBSCRIBING  │
└──────┬──────┘       └──────────────┘
       │                      ▲
       │ Receive update       │
       │ every 30s            │
       ▼                      │
┌─────────────┐       subscribe/unsubscribe
│   ACTIVE    │──────────────►│
└──────┬──────┘
       │
       │ client.disconnect()
       │ or error
       ▼
┌─────────────┐
│DISCONNECTED │
└─────────────┘

States:
  • CREATED: Client instance created
  • CONNECTED: WebSocket handshake complete
  • SUBSCRIBING: Processing subscription request
  • ACTIVE: Receiving updates
  • DISCONNECTED: Connection closed
```

---

## 📦 Module Dependencies

```
app/
├── routers/
│   ├── smart_prices.py
│   │   └── Depends on:
│   │       ├── SmartPriceService
│   │       ├── HistoricalPriceService ✨ NEW
│   │       └── CryptoDiscoveryService ✨ NEW
│   │
│   └── websocket_prices.py ✨ NEW
│       └── Depends on:
│           └── SmartPriceService
│
├── services/
│   ├── smart_price_service.py
│   │   └── Uses:
│   │       ├── advanced_redis_client
│   │       ├── httpx
│   │       └── settings (FINNHUB_KEY, COINGECKO_KEY)
│   │
│   ├── historical_price_service.py ✨ NEW
│   │   └── Uses:
│   │       ├── advanced_redis_client
│   │       ├── httpx
│   │       └── settings (FINNHUB_KEY, COINGECKO_KEY)
│   │
│   └── crypto_discovery_service.py ✨ NEW
│       └── Uses:
│           ├── advanced_redis_client
│           ├── httpx
│           └── settings (COINGECKO_KEY)
│
└── core/
    ├── advanced_redis_client.py
    └── config.py
```

---

## 🎯 Request Flow Examples

### Example 1: Get Bitcoin 1-Week History

```
1. Client Request
   GET /api/v1/prices/BTC/history?period=1w

2. Router validates period
   ✅ "1w" is valid PeriodType

3. Service checks cache
   Key: "history:BTC:1w"
   Result: MISS (first request)

4. Service fetches from CoinGecko
   URL: /coins/bitcoin/market_chart?days=7
   Time: 1.2 seconds

5. Transform data
   CoinGecko format → HistoricalPricePoint[]
   168 data points (hourly for 7 days)

6. Cache result
   TTL: 1800 seconds (30 minutes)

7. Return to client
   {
     "symbol": "BTC",
     "period": "1w",
     "count": 168,
     "data": [...]
   }

8. Subsequent requests (within 30 min)
   ✅ Cache HIT
   Response time: 5ms
```

### Example 2: Search for "Doge" Cryptos

```
1. Client Request
   GET /api/v1/prices/crypto/search?q=doge

2. Service calls CoinGecko Search
   URL: /search?query=doge

3. Get search results
   - Dogecoin
   - Dogelon Mars
   - Baby Doge Coin
   - etc.

4. Fetch detailed market data
   URL: /coins/markets?ids=dogecoin,dogelon-mars,...

5. Return enriched data
   {
     "success": true,
     "query": "doge",
     "count": 5,
     "results": [
       {
         "id": "dogecoin",
         "symbol": "DOGE",
         "name": "Dogecoin",
         "current_price": 0.15,
         "image": "https://...",
         ...
       }
     ]
   }
```

### Example 3: WebSocket Price Streaming

```
1. Client connects
   ws://localhost:8000/api/ws/prices?client_id=abc123

2. Server accepts
   → Assigns client_id: abc123
   → Adds to active_connections
   → Sends welcome message

3. Client subscribes
   → Send: {"action": "subscribe", "symbols": ["BTC", "ETH"]}
   → Server adds to subscriptions[abc123]

4. Background loop (every 30 seconds)
   → Collect all symbols: ["BTC", "ETH"]
   → Fetch from SmartPriceService
   → Publish to Redis: lokifi:price_updates
   → Send to client:
     {
       "type": "price_update",
       "timestamp": "2025-10-06T12:00:00",
       "data": {
         "BTC": {price: 67234.50, change: +1.87%, ...},
         "ETH": {price: 4513.20, change: +2.31%, ...}
       }
     }

5. Client receives update
   → Updates UI
   → Waits for next update (30 seconds)
```

---

## 🎨 Color Legend

```
✨ NEW - Newly implemented features
✅ WORKING - Tested and operational
⚡ FAST - < 10ms response time
🐢 SLOW - > 500ms response time
📊 DATA - Data transformation
🔄 CACHE - Caching operation
🔌 WS - WebSocket operation
```

---

**All components working together to provide real-time, historical, and discovery capabilities! 🚀**
