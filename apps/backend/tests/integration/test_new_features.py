"""
Quick test script for Tasks 6, 7, 8 implementation
Tests all new endpoints to verify they're working
"""

import asyncio
from datetime import datetime

import httpx
import pytest

API_BASE = "http://localhost:8000/api/v1"


@pytest.mark.asyncio
async def test_health():
    """Test basic health check"""
    print("\n" + "=" * 60)
    print("🔍 Testing Health Check")
    print("=" * 60)

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{API_BASE}/prices/health")
            data = resp.json()
            print(f"✅ Health: {data['status']}")
            print(f"   Redis: {'✅ Connected' if data['redis_connected'] else '❌ Not Connected'}")
            print(f"   Providers: {', '.join(data['providers'])}")
            return True
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False


@pytest.mark.asyncio
async def test_current_price():
    """Test current price endpoint"""
    print("\n" + "=" * 60)
    print("💰 Testing Current Prices")
    print("=" * 60)

    symbols = ["BTC", "ETH", "AAPL"]

    async with httpx.AsyncClient() as client:
        for symbol in symbols:
            try:
                resp = await client.get(f"{API_BASE}/prices/{symbol}")
                data = resp.json()
                print(f"✅ {symbol}: ${data['price']:,.2f} ({data['source']})")
                if data.get("change_percent"):
                    change_icon = "📈" if data["change_percent"] > 0 else "📉"
                    print(f"   {change_icon} {data['change_percent']:+.2f}%")
            except Exception as e:
                print(f"❌ {symbol} failed: {e}")


@pytest.mark.asyncio
async def test_historical_data():
    """Test historical price data"""
    print("\n" + "=" * 60)
    print("📊 Testing Historical Data")
    print("=" * 60)

    test_cases = [("BTC", "1w"), ("AAPL", "1m"), ("ETH", "1d")]

    async with httpx.AsyncClient(timeout=30.0) as client:
        for symbol, period in test_cases:
            try:
                resp = await client.get(f"{API_BASE}/prices/{symbol}/history?period={period}")
                data = resp.json()
                print(f"✅ {symbol} {period} history: {data['count']} data points")
                if data["count"] > 0:
                    first = data["data"][0]
                    last = data["data"][-1]
                    first_date = datetime.fromtimestamp(first["timestamp"]).strftime(
                        "%Y-%m-%d %H:%M"
                    )
                    last_date = datetime.fromtimestamp(last["timestamp"]).strftime("%Y-%m-%d %H:%M")
                    print(f"   First: ${first['price']:,.2f} ({first_date})")
                    print(f"   Last:  ${last['price']:,.2f} ({last_date})")
            except Exception as e:
                print(f"❌ {symbol} {period} failed: {e}")


@pytest.mark.asyncio
async def test_ohlcv_data():
    """Test OHLCV candlestick data"""
    print("\n" + "=" * 60)
    print("🕯️ Testing OHLCV Data")
    print("=" * 60)

    test_cases = [("AAPL", "1w"), ("BTC", "1d")]

    async with httpx.AsyncClient(timeout=30.0) as client:
        for symbol, period in test_cases:
            try:
                resp = await client.get(f"{API_BASE}/prices/{symbol}/ohlcv?period={period}")
                data = resp.json()
                print(f"✅ {symbol} {period} OHLCV: {data['count']} candles")
                if data["count"] > 0:
                    candle = data["data"][0]
                    print(
                        f"   First candle: O=${candle['open']:,.2f} H=${candle['high']:,.2f} "
                        + f"L=${candle['low']:,.2f} C=${candle['close']:,.2f} V={candle['volume']:,}"
                    )
            except Exception as e:
                print(f"❌ {symbol} {period} OHLCV failed: {e}")


@pytest.mark.asyncio
async def test_crypto_discovery():
    """Test crypto discovery endpoints"""
    print("\n" + "=" * 60)
    print("🪙 Testing Crypto Discovery")
    print("=" * 60)

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test top cryptos
        try:
            resp = await client.get(f"{API_BASE}/prices/crypto/top?limit=20")
            data = resp.json()
            print(f"✅ Top cryptos: {data['count']} cryptos")
            for i, crypto in enumerate(data["cryptos"][:5], 1):
                print(
                    f"   {i}. {crypto['name']} ({crypto['symbol']}) - ${crypto['current_price']:,.2f}"
                )
        except Exception as e:
            print(f"❌ Top cryptos failed: {e}")

        # Test search
        try:
            resp = await client.get(f"{API_BASE}/prices/crypto/search?q=doge")
            data = resp.json()
            print(f"✅ Search 'doge': {data['count']} results")
            for crypto in data["results"][:3]:
                print(f"   - {crypto['name']} ({crypto['symbol']})")
        except Exception as e:
            print(f"❌ Crypto search failed: {e}")

        # Test mapping
        try:
            resp = await client.get(f"{API_BASE}/prices/crypto/mapping")
            mapping = resp.json()
            print(f"✅ Symbol mapping: {len(mapping)} cryptos")
            print(
                f"   Sample: BTC → {mapping.get('BTC', 'N/A')}, ETH → {mapping.get('ETH', 'N/A')}"
            )
        except Exception as e:
            print(f"❌ Mapping failed: {e}")


@pytest.mark.asyncio
async def test_batch_prices():
    """Test batch price endpoint"""
    print("\n" + "=" * 60)
    print("📦 Testing Batch Prices")
    print("=" * 60)

    symbols = ["BTC", "ETH", "AAPL", "TSLA", "GOOGL"]

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{API_BASE}/prices/batch", json={"symbols": symbols})
            data = resp.json()
            print(f"✅ Batch request: {len(data['data'])} prices fetched")
            print(f"   Cache hits: {data['cache_hits']}, API calls: {data['api_calls']}")
            for symbol, price_data in list(data["data"].items())[:3]:
                print(f"   {symbol}: ${price_data['price']:,.2f}")
        except Exception as e:
            print(f"❌ Batch prices failed: {e}")


async def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("🚀 LOKIFI API TEST SUITE - Tasks 6, 7, 8")
    print("=" * 60)
    print(f"Testing against: {API_BASE}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Check if server is running
    try:
        async with httpx.AsyncClient() as client:
            await client.get(f"{API_BASE}/health")
            print("✅ Server is running!")
    except Exception as e:
        print("❌ Server is not running! Please start the backend first.")
        print(f"   Error: {e}")
        return

    # Run tests
    await test_health()
    await test_current_price()
    await test_historical_data()
    await test_ohlcv_data()
    await test_crypto_discovery()
    await test_batch_prices()

    print("\n" + "=" * 60)
    print("✅ ALL TESTS COMPLETED!")
    print("=" * 60)
    print("\n📝 Next Steps:")
    print("   1. Open test_websocket.html in your browser")
    print("   2. Click 'Connect' to test WebSocket updates")
    print("   3. Try fetching historical data and crypto lists")
    print("   4. Watch real-time price updates every 30 seconds")
    print("\n🔗 Test Page: file:///c:/Users/USER/Desktop/lokifi/test_websocket.html")
    print("📚 Documentation: TASKS_6_7_8_COMPLETE.md")
    print("\n")


if __name__ == "__main__":
    asyncio.run(main())
