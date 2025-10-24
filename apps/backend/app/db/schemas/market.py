from typing import Literal

from pydantic import BaseModel

Timeframe = Literal["15m", "30m", "1h", "4h", "1d", "1w"]


class Candle(BaseModel):
    ts: int
    o: float
    h: float
    low: float
    c: float
    v: float


class OHLCResponse(BaseModel):
    symbol: str
    timeframe: Timeframe
    candles: list[Candle]
