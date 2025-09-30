"""
OpenAPI contract generation and validation for Fynix API
"""
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


# Base response models
class APIResponse(BaseModel):
    """Base API response with metadata"""
    success: bool = True
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"


class ErrorResponse(APIResponse):
    """Error response model"""
    success: bool = False
    error: str
    code: str
    details: dict[str, Any] | None = None


# Symbol models
class Symbol(BaseModel):
    """Symbol information"""
    symbol: str = Field(..., description="Trading symbol (e.g., BTCUSDT)")
    name: str = Field(..., description="Human readable name")
    base_asset: str = Field(..., description="Base asset (e.g., BTC)")
    quote_asset: str = Field(..., description="Quote asset (e.g., USDT)")
    exchange: str = Field(..., description="Exchange name")
    type: str = Field(..., description="Symbol type (spot, futures, etc.)")
    active: bool = Field(True, description="Whether symbol is actively traded")
    logo_url: str | None = Field(None, description="Logo URL if available")


class SymbolsResponse(APIResponse):
    """Response for /api/symbols endpoint"""
    data: list[Symbol]
    total: int = Field(..., description="Total number of symbols")


# OHLC models
class OHLCBar(BaseModel):
    """Single OHLC bar"""
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")
    open: float = Field(..., description="Opening price")
    high: float = Field(..., description="Highest price")
    low: float = Field(..., description="Lowest price")
    close: float = Field(..., description="Closing price")
    volume: float = Field(..., description="Trading volume")


class OHLCResponse(APIResponse):
    """Response for /api/ohlc endpoint"""
    data: list[OHLCBar]
    symbol: str = Field(..., description="Requested symbol")
    timeframe: str = Field(..., description="Requested timeframe")
    from_timestamp: int | None = Field(None, description="Data range start")
    to_timestamp: int | None = Field(None, description="Data range end")


# Market data models
class TickerData(BaseModel):
    """Real-time ticker data"""
    symbol: str
    price: float
    change_24h: float
    volume_24h: float
    high_24h: float
    low_24h: float
    timestamp: int


class TickerResponse(APIResponse):
    """Response for ticker data"""
    data: TickerData


# Indicator models
class IndicatorValue(BaseModel):
    """Indicator calculation result"""
    timestamp: int
    value: float
    metadata: dict[str, Any] | None = None


class IndicatorResponse(APIResponse):
    """Response for indicator calculations"""
    data: list[IndicatorValue]
    indicator: str = Field(..., description="Indicator name")
    parameters: dict[str, Any] = Field(..., description="Calculation parameters")


# WebSocket models
class WSMessage(BaseModel):
    """WebSocket message base"""
    type: str = Field(..., description="Message type")
    timestamp: int = Field(default_factory=lambda: int(datetime.now(UTC).timestamp() * 1000))


class WSTickerMessage(WSMessage):
    """WebSocket ticker update"""
    type: str = "ticker"
    data: TickerData


class WSOHLCMessage(WSMessage):
    """WebSocket OHLC update"""
    type: str = "ohlc"
    symbol: str
    timeframe: str
    data: OHLCBar


class WSErrorMessage(WSMessage):
    """WebSocket error message"""
    type: str = "error"
    error: str
    code: str


# Request models
class OHLCRequest(BaseModel):
    """Request for OHLC data"""
    symbol: str = Field(..., description="Trading symbol")
    timeframe: str = Field(..., description="Timeframe (1m, 5m, 1h, 1d, etc.)")
    from_timestamp: int | None = Field(None, description="Start timestamp (ms)")
    to_timestamp: int | None = Field(None, description="End timestamp (ms)")
    limit: int | None = Field(500, description="Maximum number of bars", le=1000)


class SymbolSearchRequest(BaseModel):
    """Request for symbol search"""
    query: str | None = Field(None, description="Search query")
    exchange: str | None = Field(None, description="Filter by exchange")
    type: str | None = Field(None, description="Filter by symbol type")
    active_only: bool = Field(True, description="Only return active symbols")
    limit: int | None = Field(100, description="Maximum results", le=500)
    offset: int | None = Field(0, description="Pagination offset")


# Health check model
class HealthResponse(APIResponse):
    """Health check response"""
    status: str = Field("healthy", description="Service status")
    uptime: float = Field(..., description="Uptime in seconds")
    api_version: str = Field(..., description="API version")
    dependencies: dict[str, str] = Field(..., description="Dependency status")