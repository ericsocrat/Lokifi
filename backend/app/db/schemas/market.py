from pydantic import BaseModel
from typing import Literal

Timeframe = Literal["15m","30m","1h","4h","1d","1w"]

class Candle(BaseModel):
    ts: int
    o: float
    h: float
    l: float
    c: float
    v: float

class OHLCResponse(BaseModel):
    symbol: str
    timeframe: Timeframe
    candles: list[Candle]
