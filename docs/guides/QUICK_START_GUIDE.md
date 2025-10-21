# 🚀 Quick Start Guide - Tasks 6, 7, 8

## Overview
This guide helps you test the newly implemented features:
- **Task 6**: Historical Price Data & OHLCV Charts
- **Task 7**: Expanded Crypto Support (300+ cryptos)
- **Task 8**: WebSocket Real-Time Updates (30-second intervals)

---

## Prerequisites

Ensure these are running:
- ✅ Redis (port 6379)
- ✅ PostgreSQL (port 5432)
- ✅ Backend (port 8000)
- ✅ Frontend (port 3000) - optional

---

## Step 1: Start Redis

```powershell
# Option 1: Use existing task
# In VS Code: Terminal → Run Task → "🔴 Start Redis Server (Docker)"

# Option 2: Manual Docker command
docker run -d --name lokifi-redis -p 6379:6379 redis:latest
```powershell

**Verify Redis:**
```powershell
docker ps | Select-String "lokifi-redis"
```powershell

---

## Step 2: Start Backend

```powershell
cd C:\Users\USER\Desktop\lokifi\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```powershell

**Verify Backend:**
```powershell
# In another terminal
curl http://localhost:8000/api/v1/health
```powershell

Expected response:
```json
{"status": "ok"}
```json

---

## Step 3: Run API Tests

```powershell
cd C:\Users\USER\Desktop\lokifi\backend

# Make sure venv is activated
.\venv\Scripts\Activate.ps1

# Run test script
python test_new_features.py
```powershell

**Expected Output:**
```bash
🚀 LOKIFI API TEST SUITE - Tasks 6, 7, 8
============================================================
Testing against: http://localhost:8000/api/v1
✅ Server is running!

🔍 Testing Health Check
✅ Health: healthy
   Redis: ✅ Connected
   Providers: coingecko, finnhub

💰 Testing Current Prices
✅ BTC: $67,234.50 (coingecko)
   📈 +1.87%
✅ ETH: $4,513.20 (coingecko)
✅ AAPL: $178.72 (finnhub)

📊 Testing Historical Data
✅ BTC 1w history: 168 data points
✅ AAPL 1m history: 720 data points

🕯️ Testing OHLCV Data
✅ AAPL 1w OHLCV: 7 candles
✅ BTC 1d OHLCV: 24 candles

🪙 Testing Crypto Discovery
✅ Top cryptos: 20 cryptos
   1. Bitcoin (BTC) - $67,234.50
   2. Ethereum (ETH) - $4,513.20
✅ Search 'doge': 5 results
✅ Symbol mapping: 300 cryptos

📦 Testing Batch Prices
✅ Batch request: 5 prices fetched
   Cache hits: 3, API calls: 2
```bash

---

## Step 4: Test WebSocket in Browser

### Option 1: Use Test HTML Page

1. **Open the test page:**
   ```
   file:///C:/Users/USER/Desktop/lokifi/test_websocket.html
   ```

2. **Click "Connect"**
   - Should show "Connected" status
   - Auto-subscribes to BTC, ETH, AAPL, TSLA

3. **Watch for updates**
   - Prices update every 30 seconds
   - See real-time changes

4. **Test features:**
   - Add more symbols to subscription
   - Fetch historical data
   - Search for cryptos
   - Browse top cryptocurrencies

### Option 2: Use Browser Console

Open developer console (F12) and run:

```javascript
const ws = new WebSocket('ws://localhost:8000/api/ws/prices');

ws.onopen = () => {
  console.log('✅ Connected!');
  ws.send(JSON.stringify({
    action: 'subscribe',
    symbols: ['BTC', 'ETH', 'AAPL']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📊 Update:', data);
};
```javascript

---

## Step 5: Test Individual Endpoints

### Historical Data

```powershell
# Bitcoin 1-week history
curl "http://localhost:8000/api/v1/prices/BTC/history?period=1w"

# Apple OHLCV 1-month
curl "http://localhost:8000/api/v1/prices/AAPL/ohlcv?period=1m"

# Ethereum 1-day history
curl "http://localhost:8000/api/v1/prices/ETH/history?period=1d"
```powershell

### Crypto Discovery

```powershell
# Top 50 cryptos
curl "http://localhost:8000/api/v1/prices/crypto/top?limit=50"

# Search for cryptos
curl "http://localhost:8000/api/v1/prices/crypto/search?q=doge"

# Get symbol mapping
curl "http://localhost:8000/api/v1/prices/crypto/mapping"
```powershell

### Batch Prices

```powershell
# PowerShell
$body = @{
    symbols = @("BTC", "ETH", "AAPL", "TSLA")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/prices/batch" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```powershell

---

## Step 6: View API Documentation

Open in browser:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Navigate to the **prices** tag to see all new endpoints.

---

## Troubleshooting

### Backend won't start

**Error**: `ModuleNotFoundError: No module named 'httpx'`

**Solution**:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install httpx
```powershell

### Redis connection errors

**Error**: `Redis connection failed`

**Solution**:
```powershell
# Check if Redis is running
docker ps | Select-String "redis"

# If not running, start it
docker start lokifi-redis

# Or create new container
docker run -d --name lokifi-redis -p 6379:6379 redis:latest
```powershell

### WebSocket won't connect

**Error**: `WebSocket connection failed`

**Possible causes**:
1. Backend not running on port 8000
2. Firewall blocking WebSocket connections
3. Wrong URL (should be `ws://` not `wss://` for localhost)

**Solution**:
```powershell
# Verify backend is listening on port 8000
netstat -an | Select-String "8000"

# Should show:
# TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING
```powershell

### Historical data returns 404

**Error**: `Historical data not available for SYMBOL`

**Possible causes**:
1. Invalid symbol
2. API rate limit reached
3. API key missing or invalid

**Solution**:
```powershell
# Check backend logs
# Look for errors like "Rate limit exceeded"

# Check API keys in .env
cd backend
cat .env | Select-String "FINNHUB_KEY|COINGECKO_KEY"
```powershell

### Crypto discovery returns empty

**Error**: `count: 0`

**Possible causes**:
1. CoinGecko rate limit
2. Network issues
3. API timeout

**Solution**:
Wait 1 minute and try again (CoinGecko free tier has rate limits).

---

## Performance Tips

### Redis Caching
- Historical data cached for **30 minutes**
- Crypto list cached for **1 hour**
- Current prices cached for **1 minute**

To force refresh:
```powershell
# Add ?force_refresh=true to any endpoint
curl "http://localhost:8000/api/v1/prices/BTC/history?period=1w&force_refresh=true"
```powershell

### WebSocket Updates
- Default interval: **30 seconds**
- To change: Edit `update_interval` in `websocket_prices.py`
- Recommended: 15-60 seconds (balance freshness vs. API usage)

### API Rate Limits
- **Finnhub**: 60 requests/minute (free tier)
- **CoinGecko**: 10-50 requests/minute (depending on tier)
- **Batching**: Use batch endpoints to reduce API calls

---

## Next Steps

### Frontend Integration

1. **Install chart library:**
   ```bash
   cd frontend
   npm install recharts
   # or
   npm install chart.js react-chartjs-2
   ```

2. **Copy example code** from `TASKS_6_7_8_COMPLETE.md`

3. **Create chart component** for historical data

4. **Add WebSocket hook** for real-time updates

5. **Build crypto search** interface

### Production Deployment

1. **Set environment variables:**
   ```bash
   FINNHUB_KEY=your-key
   COINGECKO_KEY=your-key  # Optional but recommended
   ```

2. **Configure Nginx** for WebSocket support (see docs)

3. **Enable Redis persistence** for better caching

4. **Set up monitoring** for WebSocket connections

5. **Configure load balancer** for horizontal scaling

---

## Success Criteria

✅ **All tests pass** in `test_new_features.py`

✅ **WebSocket connects** and receives updates every 30 seconds

✅ **Historical data loads** for stocks and crypto

✅ **OHLCV data displays** correct candlestick info

✅ **Top 300 cryptos** load successfully

✅ **Crypto search** returns relevant results

✅ **Batch prices** work with 5+ symbols

✅ **No errors** in backend logs

---

## Resources

- **Full Documentation**: `TASKS_6_7_8_COMPLETE.md`
- **Test HTML Page**: `test_websocket.html`
- **Test Script**: `backend/test_new_features.py`
- **API Docs**: http://localhost:8000/docs
- **GitHub Commit**: See latest commit for implementation details

---

## Support

If you encounter issues:

1. Check backend logs for errors
2. Verify Redis is running
3. Check API keys in `.env`
4. Test endpoints with curl
5. Review implementation in source files
6. Check rate limits haven't been exceeded

**All features are production-ready and tested! 🎉**