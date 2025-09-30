from fastapi import APIRouter, Query

from app.services.ai import stream_answer
from app.utils.sse import EventSourceResponse

router = APIRouter(prefix="/chat", tags=["ai"])

@router.get("/stream")
async def chat_stream(q: str, ctx_symbols: str | None = None, ctx_timeframe: str | None = Query(None, description="e.g., 15m,1h,4h,1d,1w"), model: str | None = Query(None, description="Preferred model id")):
    async def gen():
        async for chunk in stream_answer(q, {"id":0}, ctx_symbols, ctx_timeframe=ctx_timeframe, model=model):
            yield {"event": "message", "data": chunk}
    return EventSourceResponse(gen())
