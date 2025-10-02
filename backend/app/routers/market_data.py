"""
API routes for symbol directory and OHLC data.
Provides endpoints for symbol search and market data retrieval.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel

from ..services.data_service import (
    AssetType,
    OHLCData,
    Symbol,
    ohlc_aggregator,
    symbol_directory,
)

router = APIRouter(prefix="/v1", tags=["market-data"])


# Response models
class SymbolSearchResponse(BaseModel):
    symbols: list[Symbol]
    total: int
    query: str


class OHLCResponse(BaseModel):
    symbol: str
    timeframe: str
    data: list[OHLCData]
    count: int
    provider: str


class AssetTypeStats(BaseModel):
    asset_type: AssetType
    count: int


class MarketOverview(BaseModel):
    total_symbols: int
    asset_types: list[AssetTypeStats]
    last_updated: datetime


@router.get("/symbols/search", response_model=SymbolSearchResponse)
async def search_symbols(
    q: str = Query(None, min_length=1, max_length=50, description="Search query"),
    query: str = Query(None, min_length=1, max_length=50, description="Search query (alias)"),
    asset_type: AssetType | None = Query(None, description="Filter by asset type"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results to return"),
):
    """
    Search for symbols by name or ticker.

    - **q**: Search query (symbol or company name)
    - **query**: Search query (alias for q)
    - **asset_type**: Filter by asset type (stock, crypto, forex, etc.)
    - **limit**: Maximum number of results
    """
    # Support both 'q' and 'query' parameters
    search_query = q or query
    if not search_query:
        raise HTTPException(status_code=422, detail="Either 'q' or 'query' parameter is required")
    
    try:
        symbols = await symbol_directory.search_symbols(
            query=search_query, asset_type=asset_type, limit=limit
        )

        return SymbolSearchResponse(symbols=symbols, total=len(symbols), query=q)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/symbols/popular", response_model=list[Symbol])
async def get_popular_symbols(
    limit: int = Query(
        20, ge=1, le=100, description="Number of popular symbols to return"
    )
):
    """
    Get a list of popular/featured symbols for quick access.
    """
    # Define popular symbols across different asset types
    popular_tickers = [
        "AAPL",
        "MSFT",
        "GOOGL",
        "TSLA",
        "AMZN",
        "META",
        "NFLX",
        "NVDA",  # Tech stocks
        "SPY",
        "QQQ",
        "DIA",  # ETFs
        "BTCUSD",
        "ETHUSD",
        "ADAUSD",  # Crypto
        "EURUSD",
        "GBPUSD",
        "USDJPY",  # Forex
        "GOLD",
        "OIL",  # Commodities
    ]

    popular_symbols = []
    for ticker in popular_tickers[:limit]:
        symbol = symbol_directory.get_symbol(ticker)
        if symbol and symbol.is_active:
            popular_symbols.append(symbol)

    return popular_symbols


@router.get("/symbols/{symbol}", response_model=Symbol)
async def get_symbol_info(
    symbol: str = Path(..., description="Symbol ticker (e.g., AAPL, BTCUSD)")
):
    """
    Get detailed information for a specific symbol.

    - **symbol**: The symbol ticker to look up
    """
    symbol_info = symbol_directory.get_symbol(symbol.upper())

    if not symbol_info:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")

    return symbol_info


@router.get("/symbols", response_model=list[Symbol])
async def list_symbols(
    asset_type: AssetType | None = Query(None, description="Filter by asset type"),
    limit: int = Query(100, ge=1, le=500, description="Maximum results to return"),
):
    """
    List all available symbols, optionally filtered by asset type.

    - **asset_type**: Filter by specific asset type
    - **limit**: Maximum number of symbols to return
    """
    if asset_type:
        symbols = symbol_directory.get_symbols_by_type(asset_type)
    else:
        symbols = list(symbol_directory.symbols.values())

    # Filter active symbols and apply limit
    active_symbols = [s for s in symbols if s.is_active][:limit]

    return active_symbols


@router.get("/ohlc/{symbol}", response_model=OHLCResponse)
async def get_ohlc_data(
    symbol: str = Path(..., description="Symbol ticker"),
    timeframe: str = Query(
        "1D", description="Timeframe (1m, 5m, 15m, 30m, 1h, 1D, 1W, 1M)"
    ),
    limit: int = Query(100, ge=1, le=1000, description="Number of bars to return"),
    start_date: datetime | None = Query(None, description="Start date (ISO format)"),
    end_date: datetime | None = Query(None, description="End date (ISO format)"),
):
    """
    Get OHLC (Open, High, Low, Close) data for a symbol.

    - **symbol**: The symbol ticker
    - **timeframe**: Data timeframe (1m, 5m, 15m, 30m, 1h, 1D, 1W, 1M)
    - **limit**: Number of bars to return (max 1000)
    - **start_date**: Optional start date filter
    - **end_date**: Optional end date filter
    """
    # Validate symbol exists
    symbol_info = symbol_directory.get_symbol(symbol.upper())
    if not symbol_info:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")

    # Validate timeframe
    valid_timeframes = ["1m", "5m", "15m", "30m", "1h", "1D", "1W", "1M"]
    if timeframe not in valid_timeframes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timeframe. Must be one of: {', '.join(valid_timeframes)}",
        )

    try:
        ohlc_data = await ohlc_aggregator.get_ohlc_data(
            symbol=symbol.upper(),
            timeframe=timeframe,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
        )

        # Determine the provider used (from first data point)
        provider = ohlc_data[0].provider.value if ohlc_data else "none"

        return OHLCResponse(
            symbol=symbol.upper(),
            timeframe=timeframe,
            data=ohlc_data,
            count=len(ohlc_data),
            provider=provider,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch OHLC data: {str(e)}"
        )


@router.get("/market/overview", response_model=MarketOverview)
async def get_market_overview():
    """
    Get market overview with symbol statistics.
    """
    all_symbols = list(symbol_directory.symbols.values())
    active_symbols = [s for s in all_symbols if s.is_active]

    # Count by asset type
    asset_type_counts = {}
    for symbol in active_symbols:
        asset_type = symbol.asset_type
        asset_type_counts[asset_type] = asset_type_counts.get(asset_type, 0) + 1

    asset_type_stats = [
        AssetTypeStats(asset_type=asset_type, count=count)
        for asset_type, count in asset_type_counts.items()
    ]

    return MarketOverview(
        total_symbols=len(active_symbols),
        asset_types=asset_type_stats,
        last_updated=datetime.now(),
    )


@router.get("/symbols/{symbol}/similar", response_model=list[Symbol])
async def get_similar_symbols(
    symbol: str = Path(..., description="Base symbol to find similar symbols for"),
    limit: int = Query(
        10, ge=1, le=50, description="Number of similar symbols to return"
    ),
):
    """
    Get symbols similar to the given symbol (same sector/industry).
    """
    base_symbol = symbol_directory.get_symbol(symbol.upper())
    if not base_symbol:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")

    similar_symbols = []

    for sym in symbol_directory.symbols.values():
        if (
            sym.symbol != base_symbol.symbol
            and sym.is_active
            and sym.asset_type == base_symbol.asset_type
            and (
                sym.sector == base_symbol.sector or sym.industry == base_symbol.industry
            )
        ):
            similar_symbols.append(sym)

            if len(similar_symbols) >= limit:
                break

    return similar_symbols


# WebSocket endpoint for real-time data (placeholder)
@router.get("/stream/{symbol}")
async def stream_symbol_data(symbol: str):
    """
    Placeholder for real-time data streaming.
    In a production system, this would be a WebSocket endpoint.
    """
    return {
        "message": f"Real-time streaming for {symbol} would be available here",
        "endpoint": f"ws://localhost:8000/api/v1/stream/{symbol}",
        "status": "not_implemented",
    }
