from fastapi.responses import StreamingResponse

class EventSourceResponse(StreamingResponse):
    def __init__(self, content, *args, **kwargs):
        super().__init__(self._wrap(content), media_type="text/event-stream", *args, **kwargs)

    async def _wrap(self, agen):
        async for event in agen:
            yield f"event: {event.get('event','message')}\n".encode()
            yield f"data: {event['data']}\n\n".encode()
