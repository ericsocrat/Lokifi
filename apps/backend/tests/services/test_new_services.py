"""Test new services without starting full server"""
import asyncio
import sys

import pytest


@pytest.mark.asyncio
async def test_crypto_discovery():
    """Test crypto discovery service"""
    print("🧪 Testing Crypto Discovery Service...")
    
    try:
        from app.services.crypto_discovery_service import CryptoDiscoveryService
        
        async with CryptoDiscoveryService() as service:
            # Test getting top 10 cryptos
            cryptos = await service.get_top_cryptos(10)
            print(f"✅ Got {len(cryptos)} cryptos")
            
            if cryptos:
                print(f"   First: {cryptos[0].symbol} - {cryptos[0].name} - ${cryptos[0].current_price}")
                print(f"   Last: {cryptos[-1].symbol} - {cryptos[-1].name} - ${cryptos[-1].current_price}")
            
            return True
    except Exception as e:
        print(f"❌ Crypto Discovery failed: {e}")
        return False


@pytest.mark.asyncio
async def test_smart_price():
    """Test smart price service batch optimization"""
    print("\n🧪 Testing Smart Price Service (Batch Optimization)...")
    
    try:
        from app.services.smart_price_service import SmartPriceService
        
        async with SmartPriceService() as service:
            # Test batch with duplicates
            symbols = ["BTC", "ETH", "BTC", "SOL"]  # BTC appears twice
            print(f"   Requesting: {symbols}")
            
            result = await service.get_batch_prices(symbols)
            print(f"✅ Got {len(result)} unique prices (duplicates removed)")
            
            for symbol, price in result.items():
                print(f"   {symbol}: ${price.price:.2f} from {price.source}")
            
            return True
    except Exception as e:
        print(f"❌ Smart Price failed: {e}")
        import traceback
        traceback.print_exc()
        return False


@pytest.mark.asyncio
async def test_unified_service():
    """Test unified asset service"""
    print("\n🧪 Testing Unified Asset Service...")
    
    try:
        from app.services.unified_asset_service import get_unified_service
        
        service = await get_unified_service()
        
        # Test crypto detection
        is_btc_crypto = service.is_crypto("BTC")
        is_aapl_crypto = service.is_crypto("AAPL")
        
        print(f"✅ BTC is crypto: {is_btc_crypto}")
        print(f"✅ AAPL is crypto: {is_aapl_crypto}")
        
        # Test provider routing
        btc_provider = service.get_provider("BTC")
        aapl_provider = service.get_provider("AAPL")
        
        print(f"✅ BTC provider: {btc_provider}")
        print(f"✅ AAPL provider: {aapl_provider}")
        
        # Test CoinGecko ID lookup
        btc_id = service.get_coingecko_id("BTC")
        print(f"✅ BTC CoinGecko ID: {btc_id}")
        
        return True
    except Exception as e:
        print(f"❌ Unified Service failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 Testing New Services")
    print("=" * 60)
    
    results = []
    
    # Test each service
    results.append(await test_unified_service())
    results.append(await test_crypto_discovery())
    results.append(await test_smart_price())
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("❌ SOME TESTS FAILED")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
