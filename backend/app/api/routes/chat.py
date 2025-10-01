from __future__ import annotations

import json
import os
from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.api.routes.alerts import CreateAlert as CreateAlertModel
from app.api.routes.alerts import create_alert as _create_alert  # reuse Pydantic validation
from app.api.routes.portfolio import portfolio_summary as _portfolio_summary  # reuse
from app.services.auth import auth_handle_from_header
from app.services.prices import fetch_ohlc

router = APIRouter()

# ---- Tools that the assistant can call ----
async def tool_get_price(symbol: str, timeframe: str = "1h") -> dict[str, Any]:
    bars = fetch_ohlc(symbol=symbol, timeframe=timeframe, limit=1)
    last = bars[-1]
    return {"symbol": symbol, "timeframe": timeframe, "price": float(last["close"]), "bar": last}

async def tool_portfolio_summary(authorization: str | None) -> dict[str, Any]:
    # Reuse the route function; it expects (handle optional, authorization header)
    # Here we call its logic by using FastAPI callable directly.
    return _portfolio_summary(handle=None, authorization=authorization)  # type: ignore

async def tool_create_price_alert(symbol: str, direction: str, price: float, authorization: str | None) -> dict[str, Any]:
    payload = CreateAlertModel(type="price_threshold", symbol=symbol, timeframe="1h",
                               min_interval_sec=300, config={"direction": direction, "price": float(price)})
    res = await _create_alert(payload, authorization=authorization)  # type: ignore
    return res

# ---- OpenAI glue (optional) ----
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE = os.getenv("OPENAI_BASE", "https://api.openai.com/v1")

SYSTEM_PROMPT = """You are Lokifi, a market assistant. You can call tools to:
1) get_price(symbol, timeframe)
2) portfolio_summary()
3) create_price_alert(symbol, direction, price)

Be concise. When unsure, ask for a symbol/ticker. Direction for alerts is "above" or "below".
"""

async def openai_chat(messages: list[dict], tools: list[dict]) -> dict:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not set")
    body = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "messages": messages,
        "tools": tools,
        "tool_choice": "auto",
        "temperature": 0.2,
    }
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(f"{OPENAI_BASE}/chat/completions", headers=headers, json=body)
        r.raise_for_status()
        return r.json()

# ---- Schemas ----
class ChatMessage(BaseModel):
    role: str
    content: str
    name: str | None = None

class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., description="chat history, user-then-assistant, etc.")

@router.post("/chat")
async def chat(req: ChatRequest, authorization: str | None = Header(None)) -> dict[str, Any]:
    # Identify user (optional); some tools require auth
    me = auth_handle_from_header(authorization)

    # Quick command parsing for offline mode:
    user_last = next((m for m in reversed(req.messages) if m.role == "user"), None)
    text = user_last.content.strip() if user_last else ""

    # Supported slash commands for deterministic behavior:
    # /price BTCUSD [1h]
    # /alert BTCUSD above 45000
    # /portfolio
    if text.startswith("/price"):
        parts = text.split()
        if len(parts) >= 2:
            sym = parts[1]
            tf = parts[2] if len(parts) >= 3 else "1h"
            data = await tool_get_price(sym, tf)
            return {"mode": "command", "result": data, "answer": f"{data['symbol']} {data['timeframe']} price: {data['price']}"}
        else:
            raise HTTPException(status_code=400, detail="Usage: /price SYMBOL [TF]")

    if text.startswith("/alert"):
        parts = text.split()
        if len(parts) < 4:
            raise HTTPException(status_code=400, detail="Usage: /alert SYMBOL above|below PRICE")
        if not me:
            raise HTTPException(status_code=401, detail="Login required to create alerts")
        sym, direction, price = parts[1], parts[2], float(parts[3])
        data = await tool_create_price_alert(sym, direction, price, authorization)
        return {"mode": "command", "result": data, "answer": f"Alert created on {sym} {direction} {price}"}

    if text.startswith("/portfolio"):
        if not me:
            raise HTTPException(status_code=401, detail="Login required to view portfolio")
        data = await tool_portfolio_summary(authorization)
        return {"mode": "command", "result": data, "answer": f"Your portfolio value: {data['total_value']} (P/L {data['total_pl']} / {data['total_pl_pct']}%)"}

    # If OpenAI is available, let it reason and call tools:
    if OPENAI_API_KEY:
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_price",
                    "description": "Get latest price for a symbol at a timeframe",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "symbol": {"type": "string"},
                            "timeframe": {"type": "string", "enum": ["1m","5m","15m","1h","4h","1d"]},
                        },
                        "required": ["symbol"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "portfolio_summary",
                    "description": "Get the authenticated user's portfolio summary",
                    "parameters": {"type": "object","properties":{}}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_price_alert",
                    "description": "Create a price threshold alert",
                    "parameters": {
                        "type":"object",
                        "properties": {
                            "symbol":{"type":"string"},
                            "direction":{"type":"string","enum":["above","below"]},
                            "price":{"type":"number"}
                        },
                        "required":["symbol","direction","price"]
                    }
                }
            }
        ]

        # inject system prompt
        msgs = [{"role":"system","content": SYSTEM_PROMPT}] + [m.dict() for m in req.messages]
        try:
            first = await openai_chat(msgs, tools)
        except Exception:
            # fall back to offline
            first = None

        # Tool-call loop (single round for simplicity)
        if first and first.get("choices"):
            choice = first["choices"][0]
            msg = choice["message"]
            if "tool_calls" in msg:
                for tc in msg["tool_calls"]:
                    fn = tc["function"]["name"]
                    args = json.loads(tc["function"]["arguments"] or "{}")
                    if fn == "get_price":
                        out = await tool_get_price(args.get("symbol",""), args.get("timeframe","1h"))
                        return {"mode":"tool","tool":fn,"args":args,"result":out,"answer": f"{out['symbol']} {out['timeframe']} price: {out['price']}"}
                    elif fn == "portfolio_summary":
                        if not me:
                            raise HTTPException(status_code=401, detail="Login required to view portfolio")
                        out = await tool_portfolio_summary(authorization)
                        return {"mode":"tool","tool":fn,"args":args,"result":out,"answer": f"Your portfolio value: {out['total_value']} (P/L {out['total_pl']} / {out['total_pl_pct']}%)"}
                    elif fn == "create_price_alert":
                        if not me:
                            raise HTTPException(status_code=401, detail="Login required to create alerts")
                        out = await tool_create_price_alert(args["symbol"], args["direction"], float(args["price"]), authorization)
                        return {"mode":"tool","tool":fn,"args":args,"result":out,"answer": f"Alert created on {args['symbol']} {args['direction']} {args['price']}"}
            # No tools; just return assistant text
            return {"mode":"llm","answer": msg.get("content","")}

    # Offline fallback: simple intents
    lower = text.lower()
    if "price" in lower:
        # try to grab a symbol-like token
        tok = next((w for w in text.replace(","," ").split() if w.isalpha() and len(w) in (3,4,5,6)), "BTCUSD")
        out = await tool_get_price(tok, "1h")
        return {"mode":"offline","answer": f"{out['symbol']} 1h price: {out['price']}", "result": out}
    if "portfolio" in lower and me:
        out = await tool_portfolio_summary(authorization)
        return {"mode":"offline","answer": f"Your portfolio value: {out['total_value']} (P/L {out['total_pl']} / {out['total_pl_pct']}%)", "result": out}
    return {"mode":"offline","answer":"Try /price BTCUSD, /alert BTCUSD above 45000, or /portfolio (requires login)."}
