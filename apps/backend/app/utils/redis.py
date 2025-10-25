import json
from typing import Any

from redis.asyncio import from_url

from app.core.config import settings

r = from_url(settings.redis_url, decode_responses=True)


async def redis_json_get(key: str):
    val = await r.get(key)
    return json.loads(val) if val else None


async def redis_json_set(key: str, value: Any, ttl: int | None = None):
    s = json.dumps(value)
    if ttl:
        await r.setex(key, ttl, s)
    else:
        await r.set(key, s)
