from __future__ import annotations
from fastapi import APIRouter, HTTPException
from fastapi import Query, Path
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional
import asyncio
import json
import time

from sse_starlette.sse import EventSourceResponse

from app.services.alerts import store, hub, evaluator, Alert

router = APIRouter()

class PriceThresholdConfig(BaseModel):
    direction: Literal["above", "below"] = "above"
    price: float

class PctChangeConfig(BaseModel):
    direction: Literal["up", "down", "abs"] = "abs"
    window_minutes: int = Field(60, ge=1, le=1440)
    threshold_pct: float = 1.0  # + or -

class CreateAlert(BaseModel):
    type: Literal["price_threshold", "pct_change"]
    symbol: str
    timeframe: str = "1h"
    min_interval_sec: int = 300
    config: Dict[str, Any]

@router.on_event("startup")
async def _startup():
    await store.load()
    evaluator.start()

@router.on_event("shutdown")
async def _shutdown():
    await evaluator.stop()

@router.get("/alerts")
async def list_alerts() -> List[Dict[str, Any]]:
    alerts = await store.list()
    return [alert.__dict__ for alert in alerts]

@router.post("/alerts")
async def create_alert(payload: CreateAlert) -> Dict[str, Any]:
    # Validate config per type
    cfg = payload.config
    try:
        if payload.type == "price_threshold":
            PriceThresholdConfig(**cfg)
        elif payload.type == "pct_change":
            PctChangeConfig(**cfg)
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
        config=cfg,
    )
    await store.add(a)
    return a.__dict__

@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str = Path(...)) -> Dict[str, Any]:
    ok = await store.remove(alert_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"deleted": True, "id": alert_id}

@router.post("/alerts/{alert_id}/toggle")
async def toggle_alert(alert_id: str, active: bool = Query(...)) -> Dict[str, Any]:
    a = await store.set_active(alert_id, active)
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"id": a.id, "active": a.active}

@router.get("/alerts/stream")
async def stream_alerts():
    """
    SSE stream of triggered alerts. Each message is JSON in 'data'.
    """
    q = await hub.register()

    async def event_generator():
        try:
            # send an initial keepalive
            yield {"event": "hello", "data": json.dumps({"ok": True})}
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=25)
                    yield {"event": "alert", "data": json.dumps(msg)}
                except asyncio.TimeoutError:
                    # keep-alive comment (some proxies require activity)
                    yield {"event": "keepalive", "data": json.dumps({"ts": time.time()})}
        finally:
            await hub.unregister(q)

    return EventSourceResponse(event_generator())
