from __future__ import annotations

import csv
import io
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.redis_cache import cache_portfolio_data
from app.db.db import get_session, init_db
from app.db.models import PortfolioPosition, User
from app.services.auth import require_handle

# Optional alerts integration
try:
    from app.services.alerts import Alert as AlertModel
    from app.services.alerts import store as alerts_store

    ALERTS_AVAILABLE = True
except Exception:
    ALERTS_AVAILABLE = False

router = APIRouter()
init_db()


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
    by_symbol: dict[str, dict[str, float]]


class ImportTextPayload(BaseModel):
    handle: str | None = None  # optional legacy
    csv_text: str = Field(..., description="CSV headers: symbol,qty,cost_basis,tags")


def _user_by_handle(db: Session, handle: str) -> User:
    u = db.execute(select(User).where(User.handle == handle)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u


def _tags_to_str(tags: list[str] | None) -> str | None:
    if not tags:
        return None
    clean = [t.strip() for t in tags if t and t.strip()]
    return ",".join(sorted(set(clean))) if clean else None


def _tags_to_list(s: str | None) -> list[str] | None:
    if not s:
        return None
    return [t for t in s.split(",") if t]


def _latest_price(symbol: str, timeframe: str = "1h") -> float | None:
    try:
        # Simplified pricing - return None for now to avoid async complexity
        return None
    except Exception:
        return None


def _compute_fields(p: PortfolioPosition) -> dict[str, Any]:
    cur = _latest_price(p.symbol)
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
def list_positions(
    request: Request,
    handle: str | None = Query(None),
    authorization: str | None = Header(None),
):
    me = require_handle(authorization, handle)
    with get_session() as db:
        u = _user_by_handle(db, me)
        rows = (
            db.execute(select(PortfolioPosition).where(PortfolioPosition.user_id == u.id))
            .scalars()
            .all()
        )
        out: list[PositionOut] = []
        for r in rows:
            comp = _compute_fields(r)
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
        u = _user_by_handle(db, me)
        existing = db.execute(
            select(PortfolioPosition).where(
                PortfolioPosition.user_id == u.id,
                PortfolioPosition.symbol == payload.symbol,
            )
        ).scalar_one_or_none()
        now = datetime.now(UTC)
        if existing:
            existing.qty = payload.qty
            existing.cost_basis = payload.cost_basis
            existing.tags = _tags_to_str(payload.tags)
            existing.updated_at = now
            p = existing
        else:
            p = PortfolioPosition(
                user_id=u.id,
                symbol=payload.symbol,
                qty=payload.qty,
                cost_basis=payload.cost_basis,
                tags=_tags_to_str(payload.tags),
                created_at=now,
                updated_at=now,
            )
            db.add(p)
            db.flush()
        comp = _compute_fields(p)
    if create_alerts:
        await _maybe_create_alerts(me, payload.symbol, payload.cost_basis)
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
def delete_position(
    position_id: int,
    handle: str | None = Query(None),
    authorization: str | None = Header(None),
):
    me = require_handle(authorization, handle)
    with get_session() as db:
        u = _user_by_handle(db, me)
        row = db.execute(
            select(PortfolioPosition).where(
                PortfolioPosition.id == position_id, PortfolioPosition.user_id == u.id
            )
        ).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Position not found")
        db.delete(row)
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
    for row in reader:
        sym = (row.get("symbol") or "").strip()
        if not sym:
            continue
        try:
            qty = float(row.get("qty", "0"))
            cb = float(row.get("cost_basis", "0"))
            tags_raw = row.get("tags") or ""
            tags = [t.strip() for t in tags_raw.split(",") if t.strip()] if tags_raw else None
        except Exception:
            continue
        await add_or_update_position(
            PositionIn(handle=me, symbol=sym, qty=qty, cost_basis=cb, tags=tags),
            create_alerts=create_alerts,
            authorization=authorization,
        )
        added += 1
    return {"ok": True, "added": added}


@router.get("/portfolio/summary", response_model=SummaryOut)
@cache_portfolio_data(ttl=300)  # Cache for 5 minutes
def portfolio_summary(
    request: Request,
    handle: str | None = Query(None),
    authorization: str | None = Header(None),
):
    me = require_handle(authorization, handle)
    with get_session() as db:
        u = _user_by_handle(db, me)
        rows = (
            db.execute(select(PortfolioPosition).where(PortfolioPosition.user_id == u.id))
            .scalars()
            .all()
        )

    total_cost = 0.0
    total_value = 0.0
    by_symbol: dict[str, dict[str, float]] = {}

    for r in rows:
        cur = _latest_price(r.symbol)
        cost_val = r.qty * r.cost_basis
        total_cost += cost_val
        if cur is not None:
            val = r.qty * cur
            total_value += val
            by_symbol[r.symbol] = {  # type: ignore
                "qty": r.qty,
                "cost_basis": r.cost_basis,
                "cost_value": cost_val,
                "current_price": cur,
                "market_value": val,
                "unrealized_pl": val - cost_val,
                "pl_pct": (((cur - r.cost_basis) / r.cost_basis * 100.0) if r.cost_basis else 0.0),
            }
        else:
            by_symbol[r.symbol] = {  # type: ignore
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
