from typing import Any

from fastapi.responses import StreamingResponse


class EventSourceResponse(StreamingResponse):
    def __init__(self, content, *args: Any, **kwargs: Any):
        # Set media_type in kwargs if not already set
        kwargs.setdefault("media_type", "text/event-stream")
        super().__init__(self._wrap(content), *args, **kwargs)

    async def _wrap(self, agen):
        async for event in agen:
            yield f"event: {event.get('event', 'message')}\n".encode()
            yield f"data: {event['data']}\n\n".encode()
