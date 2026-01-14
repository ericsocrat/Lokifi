from __future__ import annotations

__all__ = ["router"]

import asyncio
import json
import time
from typing import Any, Literal

from fastapi import APIRouter, Header, HTTPException, Path, Query
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.core.cached_queries import get_user_alerts, invalidate_alerts_cache
from app.services.alerts import Alert, hub, store
from app.services.auth import auth_handle_from_header, require_handle

router = APIRouter()


class PriceThresholdConfig(BaseModel):
    direction: Literal["above", "below"] = "above"
    price: float


class PctChangeConfig(BaseModel):
    direction: Literal["up", "down", "abs"] = "abs"
    window_minutes: int = Field(60, ge=1, le=1440)
    threshold_pct: float = 1.0


class CreateAlert(BaseModel):
    type: Literal["price_threshold", "pct_change"]
    symbol: str
    timeframe: str = "1h"
    min_interval_sec: int = 300
    config: dict[str, Any]
    handle: str | None = None  # optional legacy; must match token if provided


# NOTE: Startup/shutdown moved to main.py lifespan (Session 122)
# alerts_store.load() and alerts_evaluator.start()/stop() handled in app.main.lifespan()


@router.get("/alerts")
async def list_alerts(authorization: str | None = Header(None)) -> list[dict[str, Any]]:
    """List alerts for the authenticated user (cached 60s)"""
    me = require_handle(authorization)
    return await get_user_alerts(me)


@router.post("/alerts")
async def create_alert(
    payload: CreateAlert, authorization: str | None = Header(None)
) -> dict[str, Any]:
    me = require_handle(authorization, payload.handle)
    # Validate config
    try:
        if payload.type == "price_threshold":
            PriceThresholdConfig(**payload.config)
        elif payload.type == "pct_change":
            PctChangeConfig(**payload.config)
        else:
            raise ValueError("Unsupported alert type")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid config: {e}")

    a = Alert(
        id=__import__("uuid").uuid4().hex,
        type=payload.type,
        symbol=payload.symbol,
        timeframe=payload.timeframe,
        active=True,
        created_at=time.time(),
        min_interval_sec=payload.min_interval_sec,
        last_triggered_at=None,
        config=payload.config,
        owner_handle=me,
    )
    await store.add(a)

    # Invalidate cache for this user
    invalidate_alerts_cache(me)

    return a.__dict__


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: str = Path(...), authorization: str | None = Header(None)
) -> dict[str, Any]:
    me = require_handle(authorization)
    alerts = await store.list()
    target = next((a for a in alerts if a.id == alert_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Alert not found")
    if target.owner_handle not in (None, me):
        raise HTTPException(status_code=403, detail="Forbidden")
    ok = await store.remove(alert_id)

    # Invalidate cache for this user
    invalidate_alerts_cache(me)

    return {"deleted": ok, "id": alert_id}


@router.post("/alerts/{alert_id}/toggle")
async def toggle_alert(
    alert_id: str, active: bool = Query(...), authorization: str | None = Header(None)
) -> dict[str, Any]:
    me = require_handle(authorization)
    alerts = await store.list()
    target = next((a for a in alerts if a.id == alert_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Alert not found")
    if target.owner_handle not in (None, me):
        raise HTTPException(status_code=403, detail="Forbidden")
    a = await store.set_active(alert_id, active)
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Invalidate cache for this user (only after successful toggle)
    invalidate_alerts_cache(me)

    return {"id": a.id, "active": a.active}


@router.get("/alerts/stream")
async def stream_alerts(
    mine: bool = Query(False, description="If true, stream only my alerts"),
    authorization: str | None = Header(None),
):
    me = auth_handle_from_header(authorization)

    q = await hub.register()

    async def event_generator():
        try:
            yield {"event": "hello", "data": json.dumps({"ok": True})}
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=25)
                    if mine:
                        # filter by owner if logged in
                        owner = (msg.get("alert") or {}).get("owner_handle")
                        if not me or (owner is not None and owner != me):
                            # skip if not mine
                            continue
                    yield {"event": "alert", "data": json.dumps(msg)}
                except TimeoutError:
                    yield {
                        "event": "keepalive",
                        "data": json.dumps({"ts": time.time()}),
                    }
        finally:
            await hub.unregister(q)

    return EventSourceResponse(event_generator())
