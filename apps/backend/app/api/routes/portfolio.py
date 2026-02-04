from __future__ import annotations

__all__ = ["router"]

import csv
import io
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cached_queries import (
    get_portfolio_positions,
    get_position_by_symbol,
    get_user_by_handle,
    invalidate_portfolio_cache,
)
from app.core.redis_cache import cache, cache_portfolio_data
from app.db.db import get_session, init_db
from app.db.models import PortfolioPosition
from app.services.auth import require_handle
from app.services.smart_price_service import PriceData, SmartPriceService

# Optional alerts integration
try:
    from app.services.alerts import Alert as AlertModel, store as alerts_store

    ALERTS_AVAILABLE = True
except Exception:
    ALERTS_AVAILABLE = False

router = APIRouter()
init_db()

PriceMap = dict[str, float | None]


class PositionIn(BaseModel):
    handle: str | None = None  # optional legacy; must match token if provided
    symbol: str
    qty: float = Field(..., gt=0)
    cost_basis: float = Field(..., gt=0)
    tags: list[str] | None = None


class PositionOut(BaseModel):
    id: int
    symbol: str
    qty: float
    cost_basis: float
    tags: list[str] | None = None
    created_at: str
    updated_at: str
    current_price: float | None = None
    market_value: float | None = None
    cost_value: float | None = None
    unrealized_pl: float | None = None
    pl_pct: float | None = None


class SummaryOut(BaseModel):
    handle: str
    total_cost: float
    total_value: float
    total_pl: float
    total_pl_pct: float
    by_symbol: dict[str, dict[str, float | None]]


class AllocationOut(BaseModel):
    symbol: str
    weight_pct: float
    market_value: float
    cost_value: float
    qty: float
    current_price: float | None = None
    unrealized_pl: float | None = None
    pl_pct: float | None = None


class MoverEntry(BaseModel):
    symbol: str
    pl_pct: float | None = None


class MoversOut(BaseModel):
    gainers: list[MoverEntry]
    losers: list[MoverEntry]


class ConcentrationOut(BaseModel):
    top3_weight_pct: float
    position_count: int
    priced_positions: int


class AnalyticsOut(BaseModel):
    handle: str
    total_cost: float
    total_value: float
    total_pl: float
    total_pl_pct: float
    allocations: list[AllocationOut]
    movers: MoversOut
    concentration: ConcentrationOut


class ImportTextPayload(BaseModel):
    handle: str | None = None  # optional legacy
    csv_text: str = Field(..., description="CSV headers: symbol,qty,cost_basis,tags")


# Phase 4b-2: Removed _user_by_handle - now using cached get_user_by_handle


def _tags_to_str(tags: list[str] | None) -> str | None:
    if not tags:
        return None
    clean = [t.strip() for t in tags if t and t.strip()]
    return ",".join(sorted(set(clean))) if clean else None


def _tags_to_list(s: str | None) -> list[str] | None:
    if not s:
        return None
    return [t for t in s.split(",") if t]


async def _get_price_map(symbols: list[str]) -> PriceMap:
    if not symbols:
        return {}

    unique = sorted({s.upper() for s in symbols if s})
    if not unique:
        return {}

    try:
        async with SmartPriceService() as svc:
            price_data: dict[str, PriceData] = await svc.get_batch_prices(unique)
        return {sym: data.price if data else None for sym, data in price_data.items()}
    except Exception:
        return dict.fromkeys(unique, None)


async def _latest_price(symbol: str, timeframe: str = "1h") -> float | None:
    try:
        _ = timeframe  # keep signature compatibility
        prices = await _get_price_map([symbol])
        return prices.get(symbol.upper())
    except Exception:
        return None


async def _compute_fields(
    p: PortfolioPosition, prices: PriceMap | None = None
) -> dict[str, Any]:
    cur = (prices or {}).get(p.symbol.upper())
    market_value = cur * p.qty if cur is not None else None
    cost_value = p.qty * p.cost_basis
    unreal = (market_value - cost_value) if market_value is not None else None
    pl_pct = (
        ((cur - p.cost_basis) / p.cost_basis * 100.0)
        if (cur is not None and p.cost_basis)
        else None
    )
    return dict(
        current_price=cur,
        market_value=market_value,
        cost_value=cost_value,
        unrealized_pl=unreal,
        pl_pct=pl_pct,
    )


def _upsert_position(
    db: Session, user_id: int, payload: PositionIn
) -> PortfolioPosition:
    existing = get_position_by_symbol(db, user_id, payload.symbol)
    now = datetime.now(timezone.utc)

    if existing:
        existing.qty = payload.qty
        existing.cost_basis = payload.cost_basis
        existing.tags = _tags_to_str(payload.tags)
        existing.updated_at = now
        return existing

    new_position = PortfolioPosition(
        user_id=user_id,
        symbol=payload.symbol,
        qty=payload.qty,
        cost_basis=payload.cost_basis,
        tags=_tags_to_str(payload.tags),
        created_at=now,
        updated_at=now,
    )
    db.add(new_position)
    db.flush()
    return new_position


async def _maybe_create_alerts(owner: str, symbol: str, cost_basis: float):
    if not ALERTS_AVAILABLE:
        return
    try:
        user_tf = "1h"
        dd_price = cost_basis * 0.90
        tp_price = cost_basis * 1.15
        a1 = AlertModel(
            id=__import__("uuid").uuid4().hex,
            type="price_threshold",
            symbol=symbol,
            timeframe=user_tf,
            active=True,
            created_at=__import__("time").time(),
            min_interval_sec=600,
            last_triggered_at=None,
            config={"direction": "below", "price": float(dd_price)},
            owner_handle=owner,
        )
        a2 = AlertModel(
            id=__import__("uuid").uuid4().hex,
            type="price_threshold",
            symbol=symbol,
            timeframe=user_tf,
            active=True,
            created_at=__import__("time").time(),
            min_interval_sec=600,
            last_triggered_at=None,
            config={"direction": "above", "price": float(tp_price)},
            owner_handle=owner,
        )
        await alerts_store.add(a1)
        await alerts_store.add(a2)
    except Exception:
        pass


@router.get("/portfolio", response_model=list[PositionOut])
@cache_portfolio_data(ttl=300)  # Cache for 5 minutes
async def list_positions(
    request: Request,
    handle: str | None = Query(None),
    authorization: str | None = Header(None),
):
    me = require_handle(authorization, handle)
    with get_session() as db:
        u = get_user_by_handle(db, me)
        rows = get_portfolio_positions(db, u.id)

    prices = await _get_price_map([r.symbol for r in rows])
    out: list[PositionOut] = []
    for r in rows:
        comp = await _compute_fields(r, prices)
        out.append(
            PositionOut(
                id=r.id,
                symbol=r.symbol,
                qty=r.qty,
                cost_basis=r.cost_basis,
                tags=_tags_to_list(r.tags),
                created_at=r.created_at.isoformat(),
                updated_at=r.updated_at.isoformat(),
                **comp,
            )
        )
    return out


@router.post("/portfolio/position", response_model=PositionOut)
async def add_or_update_position(
    payload: PositionIn,
    create_alerts: bool = Query(False),
    authorization: str | None = Header(None),
):
    me = require_handle(authorization, payload.handle)
    with get_session() as db:
        u = get_user_by_handle(db, me)
        user_id = u.id
        p = _upsert_position(db, user_id, payload)
    prices = await _get_price_map([payload.symbol])
    comp = await _compute_fields(p, prices)
    if create_alerts:
        await _maybe_create_alerts(me, payload.symbol, payload.cost_basis)
    invalidate_portfolio_cache(user_id)
    await cache.clear_pattern("cache:portfolio:*")
    return PositionOut(
        id=p.id,
        symbol=p.symbol,
        qty=p.qty,
        cost_basis=p.cost_basis,
        tags=_tags_to_list(p.tags),
        created_at=p.created_at.isoformat(),
        updated_at=p.updated_at.isoformat(),
        **comp,
    )


@router.delete("/portfolio/{position_id}")
async def delete_position(
    position_id: int,
    handle: str | None = Query(None),
    authorization: str | None = Header(None),
):
    me = require_handle(authorization, handle)
    with get_session() as db:
        # Phase 4b-2: Use cached query for user lookup (MEDIUM_TERM, 300s)
        u = get_user_by_handle(db, me)
        # Note: Position deletion still uses direct query (no cache for delete operations)
        row = db.execute(
            select(PortfolioPosition).where(
                PortfolioPosition.id == position_id, PortfolioPosition.user_id == u.id
            )
        ).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Position not found")
        user_id = u.id
        db.delete(row)
    invalidate_portfolio_cache(user_id)
    await cache.clear_pattern("cache:portfolio:*")
    return {"deleted": True, "id": position_id}


@router.post("/portfolio/import_text")
async def import_text(
    payload: ImportTextPayload,
    create_alerts: bool = Query(False),
    authorization: str | None = Header(None),
):
    me = require_handle(authorization, payload.handle)
    f = io.StringIO(payload.csv_text)
    reader = csv.DictReader(f)
    added = 0
    with get_session() as db:
        u = get_user_by_handle(db, me)
        user_id = u.id

        for row in reader:
            sym = row.get("symbol", "").strip()
            if not sym:
                continue
            try:
                qty = float(row.get("qty", 0))
                cb = float(row.get("cost_basis", 0))
                tags_raw = row.get("tags")
                tags = (
                    [t.strip() for t in tags_raw.split(",") if t.strip()]
                    if tags_raw
                    else None
                )
            except Exception:
                continue

            _upsert_position(
                db,
                user_id,
                PositionIn(handle=me, symbol=sym, qty=qty, cost_basis=cb, tags=tags),
            )
            added += 1

    if added:
        invalidate_portfolio_cache(user_id)
        await cache.clear_pattern("cache:portfolio:*")
    if create_alerts and added and sym and cb:
        # Best-effort alert creation for last processed entry
        await _maybe_create_alerts(me, sym, cb)
    return {"ok": True, "added": added}


@router.get("/portfolio/summary", response_model=SummaryOut)
@cache_portfolio_data(ttl=300)  # Cache for 5 minutes
async def portfolio_summary(
    request: Request,
    handle: str | None = Query(None),
    authorization: str | None = Header(None),
):
    me = require_handle(authorization, handle)
    with get_session() as db:
        u = get_user_by_handle(db, me)
        rows = get_portfolio_positions(db, u.id)

    prices = await _get_price_map([r.symbol for r in rows])

    total_cost = 0.0
    total_value = 0.0
    by_symbol: dict[str, dict[str, float | None]] = {}

    for r in rows:
        cur = prices.get(r.symbol.upper())
        cost_val = r.qty * r.cost_basis
        total_cost += cost_val
        if cur is not None:
            val = r.qty * cur
            total_value += val
            by_symbol[r.symbol] = {
                "qty": r.qty,
                "cost_basis": r.cost_basis,
                "cost_value": cost_val,
                "current_price": cur,
                "market_value": val,
                "unrealized_pl": val - cost_val,
                "pl_pct": (
                    ((cur - r.cost_basis) / r.cost_basis * 100.0)
                    if r.cost_basis
                    else 0.0
                ),
            }
        else:
            by_symbol[r.symbol] = {
                "qty": r.qty,
                "cost_basis": r.cost_basis,
                "cost_value": cost_val,
                "current_price": None,
                "market_value": None,
                "unrealized_pl": None,
                "pl_pct": None,
            }

    total_pl = total_value - total_cost
    total_pl_pct = (total_pl / total_cost * 100.0) if total_cost else 0.0

    return SummaryOut(
        handle=me,
        total_cost=round(total_cost, 8),
        total_value=round(total_value, 8),
        total_pl=round(total_pl, 8),
        total_pl_pct=round(total_pl_pct, 4),
        by_symbol=by_symbol,
    )


def _build_analytics(
    handle: str, rows: list[PortfolioPosition], prices: PriceMap
) -> AnalyticsOut:
    allocations: list[AllocationOut] = []
    total_cost = 0.0
    total_value = 0.0
    total_pl = 0.0

    for r in rows:
        cost_value = r.qty * r.cost_basis
        total_cost += cost_value
        cur = prices.get(r.symbol.upper())
        market_value = r.qty * cur if cur is not None else None
        unreal = market_value - cost_value if market_value is not None else None
        pl_pct = (
            ((cur - r.cost_basis) / r.cost_basis * 100.0)
            if (cur is not None and r.cost_basis)
            else None
        )
        if market_value is not None:
            total_value += market_value
            total_pl += unreal or 0.0

        allocations.append(
            AllocationOut(
                symbol=r.symbol,
                weight_pct=0.0,  # filled below
                market_value=market_value or 0.0,
                cost_value=cost_value,
                qty=r.qty,
                current_price=cur,
                unrealized_pl=unreal,
                pl_pct=pl_pct,
            )
        )

    base_total = sum(a.market_value or a.cost_value for a in allocations) or 1.0
    allocations_sorted = sorted(
        allocations,
        key=lambda a: a.market_value or a.cost_value,
        reverse=True,
    )
    for a in allocations_sorted:
        base_value = a.market_value or a.cost_value
        a.weight_pct = round(base_value / base_total * 100.0, 4)

    priced_positions = [a for a in allocations_sorted if a.current_price is not None]
    gainers = sorted(
        [
            MoverEntry(symbol=a.symbol, pl_pct=a.pl_pct)
            for a in priced_positions
            if (a.pl_pct is not None and a.pl_pct > 0)
        ],
        key=lambda x: x.pl_pct or 0.0,
        reverse=True,
    )[:3]
    losers = sorted(
        [
            MoverEntry(symbol=a.symbol, pl_pct=a.pl_pct)
            for a in priced_positions
            if (a.pl_pct is not None and a.pl_pct < 0)
        ],
        key=lambda x: x.pl_pct or 0.0,
    )[:3]

    top3_weight = sum(a.weight_pct for a in allocations_sorted[:3])

    total_pl_pct = (total_pl / total_cost * 100.0) if total_cost else 0.0

    return AnalyticsOut(
        handle=handle,
        total_cost=round(total_cost, 8),
        total_value=round(total_value, 8),
        total_pl=round(total_pl, 8),
        total_pl_pct=round(total_pl_pct, 4),
        allocations=allocations_sorted,
        movers=MoversOut(gainers=gainers, losers=losers),
        concentration=ConcentrationOut(
            top3_weight_pct=round(top3_weight, 4),
            position_count=len(allocations_sorted),
            priced_positions=len(priced_positions),
        ),
    )


@router.get("/portfolio/analytics", response_model=AnalyticsOut)
@cache_portfolio_data(ttl=180)  # Cache for 3 minutes
async def portfolio_analytics(
    request: Request,
    handle: str | None = Query(None),
    authorization: str | None = Header(None),
):
    me = require_handle(authorization, handle)
    with get_session() as db:
        u = get_user_by_handle(db, me)
        rows = get_portfolio_positions(db, u.id)

    prices = await _get_price_map([r.symbol for r in rows])
    return _build_analytics(me, rows, prices)
