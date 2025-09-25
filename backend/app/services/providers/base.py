import httpx, backoff

class RateLimit(Exception):
    pass

@backoff.on_exception(backoff.expo, (httpx.HTTPError, RateLimit), max_time=30)
async def _get(url: str, params: dict):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url, params=params)
        if r.status_code == 429:
            raise RateLimit("rate limited")
        r.raise_for_status()
        return r.json()
