"""Smart Prices Router"""
import logging
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from app.services.smart_price_service import SmartPriceService, PriceData

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/prices", tags=["prices"])

class BatchPriceRequest(BaseModel):
    symbols: List[str] = Field(..., min_items=1, max_items=100)

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
    data: Dict[str, PriceResponse]
    failed: List[str] = []
    cache_hits: int = 0
    api_calls: int = 0

class HealthResponse(BaseModel):
    status: str
    redis_connected: bool
    providers: List[str]

async def get_price_service():
    async with SmartPriceService() as service:
        yield service

@router.get("/health", response_model=HealthResponse)
async def health_check(service: SmartPriceService = Depends(get_price_service)):
    try:
        redis_connected = await service._check_redis_health()
        providers = list(service.providers.keys())
        return HealthResponse(status="healthy", redis_connected=redis_connected, providers=providers)
    except Exception as e:
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
    """Get performance statistics for monitoring"""
    from app.services.smart_price_service import performance_stats
    try:
        stats = performance_stats.get_stats()
        return {
            "status": "ok",
            "metrics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/reset-stats")
async def reset_performance_stats():
    """Reset performance statistics"""
    from app.services.smart_price_service import performance_stats
    try:
        performance_stats.reset()
        return {"message": "Performance statistics reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
