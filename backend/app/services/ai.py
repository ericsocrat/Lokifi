import json
from collections.abc import AsyncGenerator
from typing import Any

import httpx

from app.core.config import settings
from app.services import news as news_svc
from app.services import prices as prices_svc
from app.services.indicators import ema, rsi, sma

DEFAULT_MODEL = "llama3.1"  # good default in Ollama

def _fmt_pct(x: float) -> str:
    return f"{x:+.2f}%"

async def _compose_symbol_context(symbol: str, timeframe: str = "1h", limit: int = 200) -> str:
    candles = await prices_svc.get_ohlc(symbol, timeframe, limit)
    if not candles:
        return f"- {symbol}: no market data available.\n"
    closes = [c["c"] for c in candles]
    last = candles[-1]
    prev = candles[-2] if len(candles) > 1 else last
    chg = (last["c"]/prev["c"] - 1.0) * 100 if prev["c"] else 0.0
    s20 = sma(closes, 20)
    s50 = sma(closes, 50)
    e20 = ema(closes, 20)
    r = rsi(closes, 14)

    s20v = s20[-1] if s20 and s20[-1] is not None else None
    s50v = s50[-1] if s50 and s50[-1] is not None else None
    e20v = e20[-1] if e20 and e20[-1] is not None else None
    rsiv = r[-1] if r and r[-1] is not None else None

    cross = None
    if s20v is not None and s50v is not None:
        prev20 = next((x for x in reversed(s20[:-1]) if x is not None), s20v)
        prev50 = next((x for x in reversed(s50[:-1]) if x is not None), s50v)
        if prev20 <= prev50 and s20v > s50v:
            cross = "bullish SMA20/50 crossover"
        elif prev20 >= prev50 and s20v < s50v:
            cross = "bearish SMA20/50 crossover"

    headlines = await news_svc.get_news(symbol, limit=3)
    news_lines = []
    for n in headlines[:3]:
        src = n.get("source") or "news"
        title = n.get("title") or ""
        news_lines.append(f"  • {src}: {title}")

    lines = [f"- {symbol} ({timeframe}): close={last['c']:.2f} ({_fmt_pct(chg)})",
             f"  SMA20={s20v:.2f}  SMA50={s50v:.2f}  EMA20={e20v:.2f}  RSI14={rsiv:.1f}" if all(v is not None for v in [s20v,s50v,e20v,rsiv]) else "  Indicators: insufficient data",
             f"  Signal: {cross}" if cross else "  Signal: —"]
    if news_lines:
        lines.append("  Recent news:")
        lines.extend(news_lines)
    return "\n".join(lines) + "\n"

async def _build_context(ctx_symbols: str | None, timeframe: str = "1h") -> str:
    if not ctx_symbols: 
        return ""
    symbols = [s.strip() for s in ctx_symbols.split(",") if s.strip()]
    sections = [await _compose_symbol_context(sym, timeframe=timeframe, limit=200) for sym in symbols[:5]]
    return "Market context for your query:\n" + "\n".join(sections) + "\n"

DEFAULT_MODEL = "llama3.1"  # good default in Ollama

async def _stream_ollama(prompt: str, model: str | None) -> AsyncGenerator[str, None]:
    host = settings.OLLAMA_BASE_URL or "http://localhost:11434"
    url = f"{host}/api/chat"
    payload = {
        "model": model or DEFAULT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        # modest defaults to keep latency low
        "options": {"temperature": 0.2, "mirostat": 0}
    }
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", url, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if "message" in data and data["message"].get("content"):
                    yield data["message"]["content"]
                if data.get("done"):
                    break

async def _stream_openai_compatible(prompt: str, base_url: str, api_key: str | None, model: str | None) -> AsyncGenerator[str, None]:
    url = f"{base_url.rstrip('/')}/v1/chat/completions"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    payload = {
        "model": model or "gpt-3.5-turbo",  # placeholder for compat servers
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                chunk = line[len("data:"):].strip()
                if chunk == "[DONE]":
                    break
                try:
                    data = json.loads(chunk)
                except json.JSONDecodeError:
                    continue
                for choice in data.get("choices", []):
                    delta = choice.get("delta") or choice.get("message") or {}
                    part = delta.get("content")
                    if part:
                        yield part

async def stream_answer(q: str, user: dict, ctx_symbols: str | None, ctx_timeframe: str | None = None, model: str | None = None) -> AsyncGenerator[str, None]:
    prompt = q if not ctx_symbols else f"""Context symbols: {ctx_symbols}
Question: {q}"""
    # Provider chain: Ollama -> OpenAI-compatible -> fallback
    providers: list[tuple[str, Any]] = []
    if settings.OLLAMA_BASE_URL:
        providers.append(("ollama", lambda: _stream_ollama(prompt, model)))
    if settings.openai_base:
        providers.append(("openai_compat", lambda: _stream_openai_compatible(prompt, settings.openai_base, settings.openai_api_key, model)))

    last_err: Exception | None = None
    for name, starter in providers:
        try:
            async for chunk in starter():
                yield chunk
            return
        except Exception as e:
            last_err = e
            continue

    # Final graceful fallback if nothing worked
    fallback = "I'm currently unable to reach any LLM backend. Please verify OLLAMA_HOST/LMSTUDIO_HOST/OPENAI_BASE_URL and try again."
    if last_err:
        fallback += f" (last error: {type(last_err).__name__})"
    yield fallback
