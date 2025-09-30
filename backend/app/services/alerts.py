from __future__ import annotations

import asyncio
import builtins
import json
import os
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Literal

from app.services.prices import fetch_ohlc

AlertType = Literal["price_threshold", "pct_change"]

@dataclass
class Alert:
    id: str
    type: AlertType
    symbol: str
    timeframe: str   # canonical: 1m,5m,15m,1h,4h,1d
    active: bool
    created_at: float
    # debouncing
    min_interval_sec: int
    last_triggered_at: float | None
    # free-form config per type
    config: dict[str, Any]
    owner_handle: str | None = None  # e.g., { "direction":"above","price":42000 } or { "window_minutes":60,"direction":"down","threshold_pct":-3 }

class AlertStore:
    def __init__(self, path: str):
        self.path = Path(path)
        self._alerts: dict[str, Alert] = {}
        self._lock = asyncio.Lock()

    async def load(self) -> None:
        if not self.path.exists():
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self._save_sync({})
            return
        try:
            data = json.loads(self.path.read_text("utf-8"))
            self._alerts = {k: Alert(**v) for k, v in data.items()}
        except Exception:
            self._alerts = {}
            self._save_sync({})

    def _save_sync(self, obj: dict[str, Any]) -> None:
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self.path)

    async def save(self) -> None:
        async with self._lock:
            obj = {k: asdict(v) for k, v in self._alerts.items()}
            await asyncio.to_thread(self._save_sync, obj)

    async def list(self) -> builtins.list[Alert]:
        return list(self._alerts.values())

    async def add(self, alert: Alert) -> Alert:
        async with self._lock:
            self._alerts[alert.id] = alert
        await self.save()
        return alert

    async def remove(self, alert_id: str) -> bool:
        async with self._lock:
            existed = alert_id in self._alerts
            self._alerts.pop(alert_id, None)
        await self.save()
        return existed

    async def get(self, alert_id: str) -> Alert | None:
        return self._alerts.get(alert_id)

    async def set_active(self, alert_id: str, active: bool) -> Alert | None:
        async with self._lock:
            a = self._alerts.get(alert_id)
            if not a:
                return None
            a.active = active
        await self.save()
        return a

# Simple SSE hub
class SSEHub:
    def __init__(self):
        self._clients: set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def register(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self._clients.add(q)
        return q

    async def unregister(self, q: asyncio.Queue) -> None:
        async with self._lock:
            self._clients.discard(q)

    async def broadcast(self, event: dict[str, Any]) -> None:
        async with self._lock:
            for q in list(self._clients):
                try:
                    q.put_nowait(event)
                except asyncio.QueueFull:
                    pass

# Evaluator
class AlertEvaluator:
    def __init__(self, store: AlertStore, hub: SSEHub, interval_sec: int = 15):
        self.store = store
        self.hub = hub
        self.interval_sec = interval_sec
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()

    def start(self):
        if self._task and not self._task.done():
            return
        self._stop.clear()
        self._task = asyncio.create_task(self._run(), name="alerts-evaluator")

    async def stop(self):
        self._stop.set()
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=3)
            except TimeoutError:
                self._task.cancel()

    async def _run(self):
        while not self._stop.is_set():
            try:
                await self._tick()
            except Exception:
                # swallow to keep loop alive
                pass
            await asyncio.wait([self._stop.wait()], timeout=self.interval_sec)

    async def _tick(self):
        alerts = await self.store.list()
        now = time.time()
        for a in alerts:
            if not a.active:
                continue
            try:
                triggered, payload = await self._evaluate(a)
            except Exception:
                continue
            if not triggered:
                continue
            # debounce
            if a.last_triggered_at and (now - a.last_triggered_at) < a.min_interval_sec:
                continue
            a.last_triggered_at = now
            await self.store.save()
            await self.hub.broadcast({
                "type": "alert.triggered",
                "alert": asdict(a),
                "payload": payload,
                "ts": now,
            })

    async def _evaluate(self, a: Alert) -> tuple[bool, dict[str, Any]]:
        # Reuse OHLC endpoint logic via services.prices
        # Fetch minimal data for evaluation
        tf = a.timeframe
        if a.type == "price_threshold":
            bars = fetch_ohlc(symbol=a.symbol, timeframe=tf, limit=1)
            last = bars[-1]
            price = float(last["close"])
            cfg = a.config
            direction = cfg.get("direction", "above")  # above|below
            target = float(cfg["price"])
            if direction == "above" and price >= target:
                return True, {"price": price, "target": target, "direction": direction}
            if direction == "below" and price <= target:
                return True, {"price": price, "target": target, "direction": direction}
            return False, {"price": price, "target": target, "direction": direction}

        elif a.type == "pct_change":
            cfg = a.config
            window_min = int(cfg.get("window_minutes", 60))
            bars_needed = max(2, window_min * 60 // 60)  # heuristic: at least 2 bars
            bars = fetch_ohlc(symbol=a.symbol, timeframe=tf, limit=max(2, bars_needed))
            first = float(bars[0]["close"])
            last = float(bars[-1]["close"])
            pct = ((last - first) / first) * 100.0 if first != 0 else 0.0
            direction = cfg.get("direction", "up")  # up|down|abs
            thresh = float(cfg.get("threshold_pct", 1.0))
            if direction == "up" and pct >= thresh:
                return True, {"pct_change": pct, "threshold_pct": thresh, "direction": direction}
            if direction == "down" and pct <= -abs(thresh):
                return True, {"pct_change": pct, "threshold_pct": -abs(thresh), "direction": direction}
            if direction == "abs" and abs(pct) >= abs(thresh):
                return True, {"pct_change": pct, "threshold_pct": thresh, "direction": direction}
            return False, {"pct_change": pct, "threshold_pct": thresh, "direction": direction}

        else:
            return False, {"reason": "unknown_type"}

# Singleton-like module state
STORE_PATH = os.getenv("FYNIX_ALERTS_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "data", "alerts.json"))
store = AlertStore(STORE_PATH)
hub = SSEHub()
evaluator = AlertEvaluator(store=store, hub=hub, interval_sec=int(os.getenv("FYNIX_ALERTS_INTERVAL", "15")))

