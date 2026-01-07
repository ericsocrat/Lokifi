"""
Comprehensive tests for app.utils.sse

Tests for EventSourceResponse class which provides Server-Sent Events (SSE)
functionality for streaming responses in FastAPI.

Session 136: Created comprehensive tests for SSE utility
"""

import pytest
from fastapi.responses import StreamingResponse

from app.utils.sse import EventSourceResponse

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def simple_event():
    """Simple SSE event data."""
    return {"event": "message", "data": "Hello, World!"}


@pytest.fixture
def custom_event():
    """Custom named SSE event."""
    return {"event": "price_update", "data": '{"symbol": "BTCUSD", "price": 50000}'}


@pytest.fixture
def event_without_type():
    """Event without explicit event type (should default to 'message')."""
    return {"data": "Default event type"}


async def simple_event_generator():
    """Generator yielding simple events."""
    yield {"event": "message", "data": "event1"}
    yield {"event": "update", "data": "event2"}
    yield {"data": "event3"}  # No event type, should default


async def empty_generator():
    """Empty generator."""
    return
    yield  # Makes it a generator


async def single_event_generator():
    """Generator yielding a single event."""
    yield {"event": "ping", "data": "pong"}


async def json_event_generator():
    """Generator yielding JSON data."""
    yield {"event": "data", "data": '{"key": "value", "number": 123}'}
    yield {"event": "array", "data": "[1, 2, 3]"}


async def unicode_event_generator():
    """Generator yielding unicode data."""
    yield {"event": "message", "data": "Hello, 世界! 🌍"}
    yield {"event": "emoji", "data": "🚀💰📈"}


async def newline_event_generator():
    """Generator yielding data with newlines (should be encoded properly)."""
    yield {"event": "multiline", "data": "line1"}
    yield {"event": "message", "data": "line2"}


# ============================================================================
# EventSourceResponse INIT TESTS
# ============================================================================


class TestEventSourceResponseInit:
    """Test EventSourceResponse initialization."""

    @pytest.mark.asyncio
    async def test_creates_streaming_response(self):
        """Test that EventSourceResponse is a StreamingResponse."""
        response = EventSourceResponse(simple_event_generator())
        assert isinstance(response, StreamingResponse)

    @pytest.mark.asyncio
    async def test_default_media_type(self):
        """Test that default media type is text/event-stream."""
        response = EventSourceResponse(simple_event_generator())
        assert response.media_type == "text/event-stream"

    @pytest.mark.asyncio
    async def test_custom_media_type_override(self):
        """Test that custom media type can be provided."""
        response = EventSourceResponse(
            simple_event_generator(), media_type="text/custom"
        )
        # media_type should be overridden
        assert response.media_type == "text/custom"

    @pytest.mark.asyncio
    async def test_accepts_status_code(self):
        """Test that status code can be set."""
        response = EventSourceResponse(simple_event_generator(), status_code=201)
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_default_status_code(self):
        """Test that default status code is 200."""
        response = EventSourceResponse(simple_event_generator())
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_accepts_headers(self):
        """Test that custom headers can be added."""
        headers = {"X-Custom-Header": "test-value"}
        response = EventSourceResponse(simple_event_generator(), headers=headers)
        assert response.headers.get("X-Custom-Header") == "test-value"


# ============================================================================
# EventSourceResponse STREAMING TESTS
# ============================================================================


class TestEventSourceResponseStreaming:
    """Test EventSourceResponse streaming functionality."""

    @pytest.mark.asyncio
    async def test_wraps_generator_events(self):
        """Test that events are properly wrapped in SSE format."""
        response = EventSourceResponse(simple_event_generator())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        # Should have 6 chunks (2 per event: event line + data line)
        assert len(chunks) == 6

    @pytest.mark.asyncio
    async def test_event_format_with_type(self):
        """Test that events with type are formatted correctly."""
        response = EventSourceResponse(single_event_generator())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        assert chunks[0] == b"event: ping\n"
        assert chunks[1] == b"data: pong\n\n"

    @pytest.mark.asyncio
    async def test_event_format_default_type(self):
        """Test that events without type default to 'message'."""

        async def no_event_type():
            yield {"data": "test data"}

        response = EventSourceResponse(no_event_type())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        assert chunks[0] == b"event: message\n"
        assert chunks[1] == b"data: test data\n\n"

    @pytest.mark.asyncio
    async def test_empty_generator(self):
        """Test handling of empty generator."""
        response = EventSourceResponse(empty_generator())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        assert len(chunks) == 0

    @pytest.mark.asyncio
    async def test_json_data_preserved(self):
        """Test that JSON data is preserved in output."""
        response = EventSourceResponse(json_event_generator())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        # Check JSON is preserved
        assert b'data: {"key": "value", "number": 123}\n\n' in chunks

    @pytest.mark.asyncio
    async def test_unicode_data_encoded(self):
        """Test that unicode data is properly encoded."""
        response = EventSourceResponse(unicode_event_generator())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        # Unicode should be properly encoded as UTF-8 bytes
        # Check that we have output with unicode content
        all_bytes = b"".join(chunks)
        assert "世界".encode() in all_bytes
        assert "🚀".encode() in all_bytes

    @pytest.mark.asyncio
    async def test_multiple_events_streamed(self):
        """Test that multiple events are streamed in sequence."""
        response = EventSourceResponse(simple_event_generator())
        events = []
        current_event = {}

        async for chunk in response.body_iterator:
            decoded = chunk.decode("utf-8")
            if decoded.startswith("event:"):
                current_event["event"] = decoded.strip().split(": ", 1)[1]
            elif decoded.startswith("data:"):
                current_event["data"] = decoded.strip().split(": ", 1)[1].rstrip("\n")
                events.append(current_event.copy())
                current_event = {}

        assert len(events) == 3
        assert events[0]["event"] == "message"
        assert events[0]["data"] == "event1"
        assert events[1]["event"] == "update"
        assert events[2]["event"] == "message"  # Default


# ============================================================================
# EventSourceResponse EDGE CASES
# ============================================================================


class TestEventSourceResponseEdgeCases:
    """Test edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_empty_data(self):
        """Test handling of empty data string."""

        async def empty_data():
            yield {"event": "empty", "data": ""}

        response = EventSourceResponse(empty_data())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        assert chunks[0] == b"event: empty\n"
        assert chunks[1] == b"data: \n\n"

    @pytest.mark.asyncio
    async def test_special_characters_in_data(self):
        """Test handling of special characters in data."""

        async def special_chars():
            yield {"event": "special", "data": "Hello: World!; Test=123&foo=bar"}

        response = EventSourceResponse(special_chars())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        assert b"data: Hello: World!; Test=123&foo=bar" in chunks[1]

    @pytest.mark.asyncio
    async def test_event_with_spaces(self):
        """Test event name with spaces (unusual but should work)."""

        async def spaced_event():
            yield {"event": "test event", "data": "value"}

        response = EventSourceResponse(spaced_event())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        assert chunks[0] == b"event: test event\n"

    @pytest.mark.asyncio
    async def test_numeric_data(self):
        """Test that numeric data is converted to string properly."""

        async def numeric_data():
            yield {"event": "number", "data": "12345"}
            yield {"event": "float", "data": "123.456"}

        response = EventSourceResponse(numeric_data())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        assert b"data: 12345" in chunks[1]
        assert b"data: 123.456" in chunks[3]

    @pytest.mark.asyncio
    async def test_long_data_string(self):
        """Test handling of long data strings."""

        async def long_data():
            yield {"event": "long", "data": "x" * 10000}

        response = EventSourceResponse(long_data())
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)

        # Data should contain the full long string
        assert b"x" * 10000 in chunks[1]


# ============================================================================
# INTEGRATION TESTS
# ============================================================================


class TestEventSourceResponseIntegration:
    """Integration tests for EventSourceResponse with real use cases."""

    @pytest.mark.asyncio
    async def test_price_update_stream(self):
        """Test streaming price updates (real-world use case)."""

        async def price_stream():
            prices = [50000, 50100, 49900, 50050]
            for price in prices:
                yield {
                    "event": "price",
                    "data": f'{{"symbol": "BTCUSD", "price": {price}}}',
                }

        response = EventSourceResponse(price_stream())
        events = []

        async for chunk in response.body_iterator:
            decoded = chunk.decode("utf-8")
            if decoded.startswith("data:"):
                events.append(decoded)

        assert len(events) == 4

    @pytest.mark.asyncio
    async def test_chat_message_stream(self):
        """Test streaming chat messages (AI response use case)."""

        async def chat_stream():
            words = ["Hello", ", ", "how", " ", "can", " ", "I", " ", "help?"]
            for word in words:
                yield {"event": "message", "data": word}
            yield {"event": "done", "data": "[END]"}

        response = EventSourceResponse(chat_stream())
        chunks_count = 0

        async for _ in response.body_iterator:
            chunks_count += 1

        # 10 events * 2 chunks each = 20 chunks
        assert chunks_count == 20

    @pytest.mark.asyncio
    async def test_heartbeat_stream(self):
        """Test heartbeat/keepalive stream."""

        async def heartbeat_stream():
            for i in range(3):
                yield {"event": "heartbeat", "data": f"ping-{i}"}

        response = EventSourceResponse(heartbeat_stream())
        events = []

        async for chunk in response.body_iterator:
            decoded = chunk.decode("utf-8")
            if "heartbeat" in decoded:
                events.append(decoded)

        assert len(events) == 3
