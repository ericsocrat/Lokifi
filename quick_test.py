import asyncio, httpx
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def test_health():
    print("\n🏥 Testing Backend Health...")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{BASE_URL}/api/health")
        print(f"   Backend: {r.status_code}")

async def test_smart_prices():
    print("\n🎯 Testing Smart Price Service...")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{BASE_URL}/api/v1/prices/health")
        if r.status_code == 200:
            data = r.json()
            print(f"   ✅ Status: {data.get('status')}")
            print(f"   ✅ Redis: {data.get('redis_connected')}")
            print(f"   ✅ Providers: {data.get('providers')}")
        else:
            print(f"   ❌ Failed: {r.status_code}")

async def test_prices():
    print("\n📊 Testing Price Fetching...")
    async with httpx.AsyncClient(timeout=30) as client:
        for symbol in ["AAPL", "BTC", "ETH"]:
            try:
                r = await client.get(f"{BASE_URL}/api/v1/prices/{symbol}")
                if r.status_code == 200:
                    data = r.json()
                    cached = "🔵 CACHED" if data.get("cached") else "📡 API"
                    print(f"   {symbol}: ${data['price']:.2f} ({cached})")
                else:
                    print(f"   {symbol}: Failed")
            except Exception as e:
                print(f"   {symbol}: Error - {e}")

async def main():
    print("\n" + "="*50)
    print("🚀 LOKIFI SYSTEM TEST")
    print("="*50)
    await test_health()
    await test_smart_prices()
    await test_prices()
    print("\n" + "="*50)
    print("✅ Tests Complete!")
    print("="*50 + "\n")

asyncio.run(main())
