"""Smart Prices Router"""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.crypto_discovery_service import CryptoDiscoveryService
from app.services.historical_price_service import (
    HistoricalPriceService,
    PeriodType,
)
from app.services.smart_price_service import SmartPriceService
from app.services.unified_asset_service import UnifiedAssetService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/prices", tags=["prices"])

class BatchPriceRequest(BaseModel):
    symbols: list[str] = Field(..., min_length=1, max_length=100)

class PriceResponse(BaseModel):
    symbol: str
    price: float
    change: float | None = None
    change_percent: float | None = None
    volume: float | None = None
    market_cap: float | None = None
    high: float | None = None
    low: float | None = None
    last_updated: str
    source: str
    cached: bool = False

class BatchPriceResponse(BaseModel):
    success: bool
    data: dict[str, PriceResponse]
    failed: list[str] = []
    cache_hits: int = 0
    api_calls: int = 0

class HealthResponse(BaseModel):
    status: str
    redis_connected: bool
    providers: list[str]

class UnifiedAssetsResponse(BaseModel):
    """Response model for unified multi-type assets"""
    success: bool
    types: list[str]
    data: dict[str, list[dict]]  # e.g., {"crypto": [...], "stocks": [...]}
    total_count: int
    cached: bool

async def get_price_service():
    async with SmartPriceService() as service:
        yield service

async def get_historical_service():
    async with HistoricalPriceService() as service:
        yield service

async def get_unified_service():
    async with UnifiedAssetService() as service:
        yield service

@router.get("/health", response_model=HealthResponse)
async def health_check(service: SmartPriceService = Depends(get_price_service)):
    try:
        redis_connected = await service._check_redis_health()
        providers = list(service.providers.keys())
        return HealthResponse(status="healthy", redis_connected=redis_connected, providers=providers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all", response_model=UnifiedAssetsResponse)
async def get_all_assets(
    limit_per_type: int = Query(default=10, ge=1, le=100, description="Assets per type"),
    types: str = Query(default="crypto,stocks,indices,forex", description="Comma-separated asset types"),
    force_refresh: bool = Query(default=False, description="Force API refresh"),
    service: UnifiedAssetService = Depends(get_unified_service)
):
    """
    🚀 **UNIFIED MULTI-ASSET ENDPOINT** - Get all asset types in one call
    
    **Perfect for `/markets` overview page showing all asset types!**
    
    **Features:**
    - ✅ Single API call for multiple asset types
    - ✅ 30-second Redis caching (efficient!)
    - ✅ Parallel fetching (fast!)
    - ✅ Consistent data format across types
    
    **Supported Types:**
    - `crypto` - Top cryptocurrencies by market cap
    - `stocks` - Top stocks (currently mock data)
    - `indices` - Major market indices (currently mock data)
    - `forex` - Top forex pairs (currently mock data)
    
    **Example Usage:**
    ```
    GET /api/v1/prices/all?limit_per_type=10&types=crypto,stocks
    ```
    
    **Returns:**
    ```json
    {
      "success": true,
      "types": ["crypto", "stocks"],
      "data": {
        "crypto": [{...}, {...}],  // 10 cryptos
        "stocks": [{...}, {...}]   // 10 stocks
      },
      "total_count": 20,
      "cached": true
    }
    ```
    
    **Benefits:**
    - Overview page: Show top 10 of each type (40 total)
    - Single API call = faster loading
    - Redis cache = no duplicate API calls
    - Navigate to specific pages = data already cached!
    """
    try:
        # Parse types from comma-separated string
        type_list = [t.strip() for t in types.split(",") if t.strip()]
        
        if not type_list:
            raise HTTPException(status_code=400, detail="At least one asset type required")
        
        # Validate types
        valid_types = {"crypto", "stocks", "indices", "forex"}
        invalid_types = set(type_list) - valid_types
        if invalid_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid asset types: {invalid_types}. Valid: {valid_types}"
            )
        
        logger.info(f"🌐 Fetching unified assets: {type_list} (limit: {limit_per_type})")
        
        # Check if data is cached
        from app.core.advanced_redis_client import advanced_redis_client
        cache_key = f"unified_assets:{':'.join(sorted(type_list))}:{limit_per_type}"
        cached_data = None
        is_cached = False
        
        if not force_refresh:
            try:
                cached_data = await advanced_redis_client.get(cache_key)
                if cached_data:
                    is_cached = True
                    logger.info("✅ Cache HIT: Unified assets")
            except Exception as e:
                logger.debug(f"Cache check failed: {e}")
        
        # Fetch data if not cached
        if not is_cached:
            # Use the unified service to fetch all types
            data = await service.get_all_assets(
                limit_per_type=limit_per_type,
                types=type_list,
                force_refresh=force_refresh
            )
            
            # Cache the result for 30 seconds
            try:
                await advanced_redis_client.set(cache_key, data, expire=30)
                logger.debug("💾 Cached unified assets for 30s")
            except Exception as e:
                logger.debug(f"Cache set failed: {e}")
        else:
            data = cached_data
        
        # Ensure data is not None
        if data is None:
            data = {}
        
        # Calculate total count
        total_count = sum(len(assets) for assets in data.values())
        
        logger.info(f"✅ Returned {total_count} assets across {len(data)} types")
        
        return UnifiedAssetsResponse(
            success=True,
            types=list(data.keys()),
            data=data,
            total_count=total_count,
            cached=is_cached
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching unified assets: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}", response_model=PriceResponse)
async def get_price(symbol: str, force_refresh: bool = Query(False), service: SmartPriceService = Depends(get_price_service)):
    try:
        price_data = await service.get_price(symbol.upper(), force_refresh=force_refresh)
        if not price_data:
            raise HTTPException(status_code=404, detail=f"Price not available for {symbol}")
        return PriceResponse(
            symbol=price_data.symbol, price=price_data.price, change=price_data.change,
            change_percent=price_data.change_percent, volume=price_data.volume,
            market_cap=price_data.market_cap, high=price_data.high, low=price_data.low,
            last_updated=price_data.last_updated.isoformat(), source=price_data.source, cached=price_data.cached
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch", response_model=BatchPriceResponse)
async def get_batch_prices(request: BatchPriceRequest, force_refresh: bool = Query(False), service: SmartPriceService = Depends(get_price_service)):
    try:
        symbols = [s.upper() for s in request.symbols]
        price_data_dict = await service.get_batch_prices(symbols, force_refresh=force_refresh)
        data, failed, cache_hits, api_calls = {}, [], 0, 0
        for symbol in symbols:
            if symbol in price_data_dict:
                pd = price_data_dict[symbol]
                data[symbol] = PriceResponse(symbol=pd.symbol, price=pd.price, change=pd.change, change_percent=pd.change_percent, volume=pd.volume, market_cap=pd.market_cap, high=pd.high, low=pd.low, last_updated=pd.last_updated.isoformat(), source=pd.source, cached=pd.cached)
                if pd.cached:
                    cache_hits += 1
                else:
                    api_calls += 1
            else:
                failed.append(symbol)
        return BatchPriceResponse(success=len(data) > 0, data=data, failed=failed, cache_hits=cache_hits, api_calls=api_calls)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/performance")
async def get_performance_stats():
    """Get comprehensive performance statistics for monitoring"""
    try:
        from app.services.crypto_discovery_service import crypto_metrics
        from app.services.historical_price_service import performance_metrics
        
        return {
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "historical_prices": performance_metrics.get_stats(),
                "crypto_discovery": crypto_metrics.get_stats()
            },
            "summary": {
                "total_operations": performance_metrics.total_requests + crypto_metrics.total_fetches,
                "overall_cache_hit_rate": f"{((performance_metrics.cache_hits + crypto_metrics.cache_hits) / max(performance_metrics.total_requests + crypto_metrics.total_fetches, 1)) * 100:.1f}%"
            }
        }
    except Exception as e:
        logger.error(f"Error getting performance stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/reset-stats")
async def reset_performance_stats():
    """Reset performance statistics"""
    try:
        # Placeholder for reset
        return {"message": "Performance statistics reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# 📊 HISTORICAL PRICE DATA ENDPOINTS
# ============================================================================

class HistoricalPriceResponse(BaseModel):
    """Response model for historical prices"""
    symbol: str
    period: str
    data: list[dict]  # List of {timestamp: int, price: float}
    count: int

class OHLCVResponse(BaseModel):
    """Response model for OHLCV data"""
    symbol: str
    period: str
    data: list[dict]  # List of {timestamp, open, high, low, close, volume}
    count: int

@router.get("/{symbol}/history", response_model=HistoricalPriceResponse)
async def get_price_history(
    symbol: str,
    period: PeriodType = Query(default="1m", description="Time period: 1d, 1w, 1m, 3m, 6m, 1y, 5y, all"),
    force_refresh: bool = Query(default=False, description="Force refresh from API"),
    service: HistoricalPriceService = Depends(get_historical_service)
):
    """
    Get historical price data for a symbol
    
    **Supported Periods:**
    - `1d`: Last 24 hours
    - `1w`: Last 7 days
    - `1m`: Last 30 days (default)
    - `3m`: Last 90 days
    - `6m`: Last 180 days
    - `1y`: Last 365 days
    - `5y`: Last 5 years
    - `all`: All available data
    
    **Supported Assets:**
    - Stocks (via Finnhub)
    - Cryptocurrencies (via CoinGecko)
    
    Returns array of {timestamp, price} objects
    """
    try:
        history = await service.get_history(symbol.upper(), period, force_refresh)
        
        if not history:
            raise HTTPException(
                status_code=404, 
                detail=f"Historical data not available for {symbol}"
            )
        
        return HistoricalPriceResponse(
            symbol=symbol.upper(),
            period=period,
            data=[point.to_dict() for point in history],
            count=len(history)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}/ohlcv", response_model=OHLCVResponse)
async def get_ohlcv_data(
    symbol: str,
    period: PeriodType = Query(default="1m", description="Time period: 1d, 1w, 1m, 3m, 6m, 1y, 5y, all"),
    force_refresh: bool = Query(default=False, description="Force refresh from API"),
    service: HistoricalPriceService = Depends(get_historical_service)
):
    """
    Get OHLCV (candlestick) data for a symbol
    
    **OHLCV = Open, High, Low, Close, Volume**
    
    Perfect for:
    - Candlestick charts
    - Technical analysis
    - Trading indicators
    
    **Supported Periods:**
    - `1d`: 5-minute candles
    - `1w`: 15-minute candles
    - `1m`: Hourly candles (default)
    - `3m`+: Daily candles
    
    Returns array of {timestamp, open, high, low, close, volume} objects
    """
    try:
        ohlcv = await service.get_ohlcv(symbol.upper(), period, force_refresh)
        
        if not ohlcv:
            raise HTTPException(
                status_code=404,
                detail=f"OHLCV data not available for {symbol}"
            )
        
        return OHLCVResponse(
            symbol=symbol.upper(),
            period=period,
            data=[point.to_dict() for point in ohlcv],
            count=len(ohlcv)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching OHLCV for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# 🪙 CRYPTO DISCOVERY ENDPOINTS
# ============================================================================


async def get_crypto_service():
    async with CryptoDiscoveryService() as service:
        yield service

class CryptoListResponse(BaseModel):
    """Response model for crypto list"""
    success: bool
    count: int
    cryptos: list[dict]

class CryptoSearchResponse(BaseModel):
    """Response model for crypto search"""
    success: bool
    query: str
    count: int
    results: list[dict]

@router.get("/crypto/top", response_model=CryptoListResponse)
async def get_top_cryptocurrencies(
    limit: int = Query(default=100, ge=1, le=300, description="Number of cryptos to return"),
    force_refresh: bool = Query(default=False, description="Force refresh from API"),
    service: CryptoDiscoveryService = Depends(get_crypto_service)
):
    """
    Get top cryptocurrencies by market cap
    
    **Features:**
    - Up to 300 cryptocurrencies
    - Ranked by market capitalization
    - Includes price, volume, 24h change
    - Icon URLs for frontend display
    - Cached for 1 hour
    
    **Perfect for:**
    - Populating crypto asset lists
    - Building crypto search/filter interfaces
    - Getting current market overview
    """
    try:
        cryptos = await service.get_top_cryptos(limit=limit, force_refresh=force_refresh)
        
        return CryptoListResponse(
            success=True,
            count=len(cryptos),
            cryptos=[crypto.to_dict() for crypto in cryptos]
        )
    except Exception as e:
        logger.error(f"Error fetching top cryptos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/crypto/search", response_model=CryptoSearchResponse)
async def search_cryptocurrencies(
    q: str = Query(..., min_length=1, description="Search query (name or symbol)"),
    limit: int = Query(default=50, ge=1, le=100, description="Max results"),
    service: CryptoDiscoveryService = Depends(get_crypto_service)
):
    """
    Search for cryptocurrencies by name or symbol
    
    **Examples:**
    - `q=bitcoin` → Find Bitcoin
    - `q=eth` → Find Ethereum
    - `q=doge` → Find Dogecoin
    
    Returns full market data for matching cryptos
    """
    try:
        results = await service.search_cryptos(query=q, limit=limit)
        
        return CryptoSearchResponse(
            success=True,
            query=q,
            count=len(results),
            results=[crypto.to_dict() for crypto in results]
        )
    except Exception as e:
        logger.error(f"Error searching cryptos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/crypto/mapping", response_model=dict[str, str])
async def get_crypto_symbol_mapping(
    service: CryptoDiscoveryService = Depends(get_crypto_service)
):
    """
    Get symbol → CoinGecko ID mapping
    
    **Use Case:**
    Frontend needs to map trading symbols (BTC, ETH) to CoinGecko IDs (bitcoin, ethereum)
    for fetching detailed data.
    
    Returns: `{"BTC": "bitcoin", "ETH": "ethereum", ...}`
    """
    try:
        mapping = await service.get_symbol_to_id_mapping()
        return mapping
    except Exception as e:
        logger.error(f"Error fetching crypto mapping: {e}")
        raise HTTPException(status_code=500, detail=str(e))
