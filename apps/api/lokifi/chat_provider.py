"""One allowlisted Groq model. No fallback provider or local inference."""

import json

import httpx

from .config import settings

MODEL = "openai/gpt-oss-120b"
URL = "https://api.groq.com/openai/v1/chat/completions"


class ProviderError(Exception):
    def __init__(self, message: str, retry_after: int = 0):
        super().__init__(message)
        self.retry_after = retry_after


def credentials():
    cfg = settings()
    if not cfg.groq_api_key or not cfg.groq_free_confirmed:
        raise ProviderError("The assistant is not connected to a verified Groq Free account yet.")
    return {"Authorization": f"Bearer {cfg.groq_api_key.get_secret_value()}"}


async def stream_completion(messages: list, tools: list):
    payload = {
        "model": MODEL,
        "messages": messages,
        "tools": tools,
        "tool_choice": "auto",
        "reasoning_effort": "low",
        "max_completion_tokens": 1024,
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    calls = {}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(90, connect=10)) as client:
            async with client.stream("POST", URL, headers=credentials(), json=payload) as response:
                if response.status_code == 429:
                    raise ProviderError("The free AI allowance is temporarily busy. Try again shortly.", 60)
                if response.status_code != 200:
                    raise ProviderError("The AI provider is unavailable. No paid fallback was used.")
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    value = json.loads(data)
                    if value.get("usage"):
                        yield {"kind": "usage", "tokens": value["usage"]["total_tokens"]}
                    for choice in value.get("choices", []):
                        delta = choice.get("delta", {})
                        if delta.get("content"):
                            yield {"kind": "text", "text": delta["content"]}
                        for call in delta.get("tool_calls", []):
                            target = calls.setdefault(call["index"], {"id": "", "name": "", "arguments": ""})
                            if call.get("id"):
                                target["id"] = call["id"]
                            function = call.get("function", {})
                            target["name"] += function.get("name", "")
                            target["arguments"] += function.get("arguments", "")
                            if len(target["arguments"]) > 12000:
                                raise ProviderError(
                                    "The model proposed an oversized action. Please simplify the request."
                                )
        for call in calls.values():
            yield {"kind": "tool", **call}
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        raise ProviderError(
            "The assistant connection was interrupted. Your records were not changed."
        ) from None


async def research(symbol: str, topic: str):
    if not settings().research_enabled:
        return {"available": False, "reason": "Public research has not been verified on this free account."}
    # Deliberately independent of private conversation history and portfolio quantities.
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": f"Research public information about the asset symbol {symbol}. Topic: {topic}. "
                "Use reputable primary sources, include publication dates and cite source URLs. Do not give trading instructions.",
            }
        ],
        "tools": [{"type": "browser_search"}],
        "reasoning_effort": "low",
        "max_completion_tokens": 1024,
    }
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(URL, headers=credentials(), json=payload)
        if response.status_code != 200:
            raise ProviderError("Free public research is unavailable. No paid search service was used.")
        value = response.json()
    message = value["choices"][0]["message"]
    sources = []

    def collect(item, depth=0):
        if depth > 8:
            return
        if isinstance(item, dict):
            url = item.get("url")
            if isinstance(url, str) and url.startswith("https://"):
                sources.append({"url": url, "title": str(item.get("title", "Source"))[:160]})
            for child in item.values():
                collect(child, depth + 1)
        elif isinstance(item, list):
            for child in item[:20]:
                collect(child, depth + 1)

    collect(message.get("executed_tools", []))
    # Absence of machine-verifiable source URLs must not become a cited research claim.
    return {
        "available": bool(sources),
        "summary": message.get("content", "")[:6000]
        if sources
        else "No verifiable source links were returned.",
        "sources": sources[:8],
        "usage_tokens": value.get("usage", {}).get("total_tokens"),
    }
