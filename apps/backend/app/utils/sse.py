from fastapi.responses import StreamingResponse
from typing import Any



class EventSourceResponse(StreamingResponse):
    def __init__(self, content, *args: Any, **kwargs: Any):
        super().__init__(self._wrap(content), media_type="text/event-stream", *args, **kwargs)

    async def _wrap(self, agen):
        async for event in agen:
            yield f"event: {event.get('event','message')}\n".encode()
            yield f"data: {event['data']}\n\n".encode()
