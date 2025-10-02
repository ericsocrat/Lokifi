"""
Cryptocurrency data endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import httpx
from app.core.config import Settings

router = APIRouter()
settings = Settings()


class CryptoPrice(BaseModel):
    """Cryptocurrency price data"""
    symbol: str
    name: str
    price: float
    price_change_24h: float | None = None
    market_cap: float | None = None
    volume_24h: float | None = None
    last_updated: str


@router.get("/crypto/prices")
async def get_crypto_prices(
    symbols: str = Query(..., description="Comma-separated list of crypto symbols (e.g., bitcoin,ethereum,cardano)"),
    currency: str = Query("usd", description="Target currency for prices")
):
    """
    Get current prices for multiple cryptocurrencies from CoinGecko
    
    - **symbols**: Comma-separated crypto IDs (bitcoin, ethereum, etc.)
    - **currency**: Target currency (default: usd)
    """
    if not settings.COINGECKO_KEY:
        raise HTTPException(status_code=503, detail="CoinGecko API key not configured")
    
    try:
        symbol_list = [s.strip().lower() for s in symbols.split(",")]
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": ",".join(symbol_list),
                    "vs_currencies": currency,
                    "include_24hr_change": "true",
                    "include_market_cap": "true",
                    "include_24hr_vol": "true",
                    "x_cg_demo_api_key": settings.COINGECKO_KEY
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            results = []
            for symbol in symbol_list:
                if symbol in data:
                    price_data = data[symbol]
                    results.append(CryptoPrice(
                        symbol=symbol,
                        name=symbol.capitalize(),
                        price=price_data.get(currency, 0),
                        price_change_24h=price_data.get(f"{currency}_24h_change"),
                        market_cap=price_data.get(f"{currency}_market_cap"),
                        volume_24h=price_data.get(f"{currency}_24h_vol"),
                        last_updated="now"
                    ))
            
            return results
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"CoinGecko API error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch crypto prices: {str(e)}")


@router.get("/crypto/trending")
async def get_trending_crypto(
    limit: int = Query(10, ge=1, le=50, description="Number of trending cryptos to return")
):
    """
    Get trending cryptocurrencies from CoinGecko
    """
    if not settings.COINGECKO_KEY:
        raise HTTPException(status_code=503, detail="CoinGecko API key not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/search/trending",
                params={"x_cg_demo_api_key": settings.COINGECKO_KEY},
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            coins = data.get("coins", [])[:limit]
            return [
                {
                    "id": coin["item"]["id"],
                    "symbol": coin["item"]["symbol"],
                    "name": coin["item"]["name"],
                    "market_cap_rank": coin["item"].get("market_cap_rank"),
                    "thumb": coin["item"].get("thumb"),
                }
                for coin in coins
            ]
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"CoinGecko API error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trending cryptos: {str(e)}")


@router.get("/crypto/market-chart/{coin_id}")
async def get_crypto_market_chart(
    coin_id: str,
    vs_currency: str = Query("usd", description="Target currency"),
    days: int = Query(7, ge=1, le=365, description="Number of days of data")
):
    """
    Get historical market chart data for a cryptocurrency
    """
    if not settings.COINGECKO_KEY:
        raise HTTPException(status_code=503, detail="CoinGecko API key not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart",
                params={
                    "vs_currency": vs_currency,
                    "days": days,
                    "x_cg_demo_api_key": settings.COINGECKO_KEY
                },
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"CoinGecko API error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market chart: {str(e)}")
