from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query, Path, Header
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional
import asyncio
import json
import time

from sse_starlette.sse import EventSourceResponse

from app.services.alerts import store, hub, evaluator, Alert
from app.services.auth import require_handle, auth_handle_from_header

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
    config: Dict[str, Any]
    handle: Optional[str] = None  # optional legacy; must match token if provided

@router.on_event("startup")
async def _startup():
    await store.load()
    evaluator.start()

@router.on_event("shutdown")
async def _shutdown():
    await evaluator.stop()

@router.get("/alerts")
async def list_alerts(authorization: Optional[str] = Header(None)) -> List[Dict[str, Any]]:
    me = require_handle(authorization)
    alerts = await store.list()
    # Only return my alerts (owner_handle==me) or legacy entries with None owner (treat as visible)
    visible = []
    for a in alerts:
        if a.owner_handle is None or a.owner_handle == me:
            visible.append(a.__dict__)
    return visible

@router.post("/alerts")
async def create_alert(payload: CreateAlert, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
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
        type=payload.type, symbol=payload.symbol, timeframe=payload.timeframe,
        active=True, created_at=time.time(),
        min_interval_sec=payload.min_interval_sec,
        last_triggered_at=None,
        config=payload.config,
        owner_handle=me,
    )
    await store.add(a)
    return a.__dict__

@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str = Path(...), authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    me = require_handle(authorization)
    alerts = await store.list()
    target = next((a for a in alerts if a.id == alert_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Alert not found")
    if target.owner_handle not in (None, me):
        raise HTTPException(status_code=403, detail="Forbidden")
    ok = await store.remove(alert_id)
    return {"deleted": ok, "id": alert_id}

@router.post("/alerts/{alert_id}/toggle")
async def toggle_alert(alert_id: str, active: bool = Query(...), authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
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
    return {"id": a.id, "active": a.active}

@router.get("/alerts/stream")
async def stream_alerts(
    mine: bool = Query(False, description="If true, stream only my alerts"),
    authorization: Optional[str] = Header(None),
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
                except asyncio.TimeoutError:
                    yield {"event": "keepalive", "data": json.dumps({"ts": time.time()})}
        finally:
            await hub.unregister(q)

    return EventSourceResponse(event_generator())
