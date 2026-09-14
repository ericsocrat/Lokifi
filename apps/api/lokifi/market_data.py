"""Narrow, source-labelled market automation. No synthetic fallbacks."""

import asyncio
import re
import time
from datetime import date, datetime, timedelta, timezone
from datetime import time as day_time
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from .identity import current_user
from .models import User
from .schemas import AssetMatch, AutomatedHolding, InstrumentInput, PriceReference

router = APIRouter(prefix="/market-data", tags=["market data"])
BASE = "https://api.exchange.coinbase.com"
VENUE = "Coinbase Exchange"
SOURCE = "Coinbase Exchange public market data"
SYMBOL = re.compile(r"^[A-Z0-9]{2,15}$")
_catalog: tuple[float, list[dict[str, Any]], dict[str, str]] | None = None
_catalog_lock = asyncio.Lock()


async def _request_json(path: str) -> Any:
    try:
        async with httpx.AsyncClient(
            base_url=BASE,
            timeout=httpx.Timeout(8.0),
            headers={"Accept": "application/json", "User-Agent": "Lokifi/2.1 portfolio-reference-data"},
        ) as client:
            response = await client.get(path)
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            503, "Automatic market data is temporarily unavailable. You can enter the holding manually."
        ) from error


async def _load_catalog() -> tuple[list[dict[str, Any]], dict[str, str]]:
    global _catalog
    if _catalog and _catalog[0] > time.monotonic():
        return _catalog[1], _catalog[2]
    async with _catalog_lock:
        if _catalog and _catalog[0] > time.monotonic():
            return _catalog[1], _catalog[2]
        products, currencies = await asyncio.gather(_request_json("/products"), _request_json("/currencies"))
        names = {str(item.get("id", "")).upper(): str(item.get("name", "")) for item in currencies}
        eligible = [
            item
            for item in products
            if item.get("quote_currency") == "EUR"
            and item.get("status") == "online"
            and not item.get("trading_disabled", False)
            and SYMBOL.fullmatch(str(item.get("base_currency", "")).upper())
        ]
        _catalog = (time.monotonic() + 3600, eligible, names)
        return eligible, names


def _match(product: dict[str, Any], names: dict[str, str]) -> AssetMatch:
    symbol = str(product["base_currency"]).upper()
    return AssetMatch(
        symbol=symbol,
        name=names.get(symbol) or symbol,
        category="crypto",
        product_id=str(product["id"]),
        venue=VENUE,
        currency="EUR",
        source=SOURCE,
    )


async def search(query: str) -> list[AssetMatch]:
    normalized = query.strip().upper()
    if len(normalized) < 2 or len(normalized) > 40:
        return []
    products, names = await _load_catalog()
    exact = []
    partial = []
    for product in products:
        result = _match(product, names)
        if normalized in {result.symbol, result.name.upper(), result.product_id}:
            exact.append(result)
        elif normalized in result.symbol or normalized in result.name.upper():
            partial.append(result)
    return (exact + partial)[:8]


def _decimal(value: Any) -> str:
    try:
        parsed = Decimal(str(value))
        if not parsed.is_finite() or parsed < 0:
            raise InvalidOperation
        return format(parsed, "f")
    except (InvalidOperation, ValueError, TypeError) as error:
        raise HTTPException(502, "The market-data provider returned an invalid price.") from error


async def reference(product_id: str, on_date: date) -> PriceReference:
    if not re.fullmatch(r"[A-Z0-9]{2,15}-EUR", product_id):
        raise HTTPException(422, "Only resolved EUR crypto products can be priced automatically")
    if on_date > date.today():
        raise HTTPException(422, "A purchase date cannot be in the future")
    start = datetime.combine(on_date, day_time.min, timezone.utc)
    end = start + timedelta(days=1)
    path = (
        f"/products/{quote(product_id, safe='-')}/candles?granularity=86400"
        f"&start={quote(start.isoformat())}&end={quote(end.isoformat())}"
    )
    candles = await _request_json(path)
    expected = int(start.timestamp())
    candle = next(
        (row for row in candles if isinstance(row, list) and len(row) >= 5 and row[0] == expected), None
    )
    if candle is None:
        raise HTTPException(
            404,
            f"No EUR daily close is available for {on_date.isoformat()}. Enter your execution price manually.",
        )
    return PriceReference(
        product_id=product_id,
        price=_decimal(candle[4]),
        date=on_date,
        observed_at=end.isoformat().replace("+00:00", "Z"),
        kind="daily_close",
        source=f"{VENUE} {product_id} UTC daily close",
    )


async def latest(product_id: str) -> PriceReference:
    if not re.fullmatch(r"[A-Z0-9]{2,15}-EUR", product_id):
        raise HTTPException(422, "Only resolved EUR crypto products can be priced automatically")
    ticker = await _request_json(f"/products/{quote(product_id, safe='-')}/ticker")
    observed = str(ticker.get("time", ""))
    try:
        instant = datetime.fromisoformat(observed.replace("Z", "+00:00"))
    except ValueError as error:
        raise HTTPException(502, "The market-data provider returned an invalid timestamp.") from error
    if instant.tzinfo is None:
        raise HTTPException(502, "The market-data provider returned an incomplete timestamp.")
    return PriceReference(
        product_id=product_id,
        price=_decimal(ticker.get("price")),
        date=instant.astimezone(timezone.utc).date(),
        observed_at=instant.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        kind="latest_trade",
        source=f"{VENUE} {product_id} latest trade",
    )


@router.get("/assets", response_model=list[AssetMatch])
async def assets(q: str = Query(min_length=2, max_length=40), _user: User = Depends(current_user)):
    return await search(q)


@router.get("/assets/{symbol}/holding", response_model=AutomatedHolding)
async def automated_holding(
    symbol: str,
    acquired_at: date,
    _user: User = Depends(current_user),
):
    matches = await search(symbol)
    exact = next((item for item in matches if item.symbol == symbol.upper()), None)
    if exact is None:
        raise HTTPException(404, "No supported EUR crypto market matched that symbol")
    acquisition, valuation = await asyncio.gather(
        reference(exact.product_id, acquired_at), latest(exact.product_id)
    )
    return AutomatedHolding(
        instrument=InstrumentInput(
            name=exact.name,
            category="crypto",
            identifier=exact.symbol,
            venue=exact.venue,
            currency="EUR",
        ),
        acquisition=acquisition,
        valuation=valuation,
    )
