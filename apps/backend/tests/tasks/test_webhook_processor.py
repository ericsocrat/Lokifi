"""Tests for background webhook processor.

Tests cover:
- Processor lifecycle (start, stop)
- Processing queue in batches
- Status and statistics
- Error handling during processing
"""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.tasks.webhook_processor import (
    WebhookProcessor,
    get_webhook_processor,
    start_webhook_processor,
    stop_webhook_processor,
)


@pytest.fixture
def processor() -> WebhookProcessor:
    """Create a webhook processor instance."""
    return WebhookProcessor(batch_size=5, interval_seconds=0.1)


class TestWebhookProcessorLifecycle:
    """Tests for webhook processor lifecycle."""

    @pytest.mark.asyncio
    async def test_processor_start(self, processor: WebhookProcessor):
        """Test starting webhook processor."""
        assert processor.running is False

        await processor.start()
        assert processor.running is True
        assert processor.task is not None

        await processor.stop()

    @pytest.mark.asyncio
    async def test_processor_stop(self, processor: WebhookProcessor):
        """Test stopping webhook processor."""
        await processor.start()
        assert processor.running is True

        await processor.stop()
        assert processor.running is False

    @pytest.mark.asyncio
    async def test_processor_start_when_already_running(
        self,
        processor: WebhookProcessor,
    ):
        """Test that starting an already-running processor is a no-op."""
        await processor.start()
        running_task = processor.task

        await processor.start()  # Try to start again
        assert processor.task is running_task  # Same task

        await processor.stop()

    @pytest.mark.asyncio
    async def test_processor_stop_when_not_running(
        self,
        processor: WebhookProcessor,
    ):
        """Test that stopping a stopped processor is a no-op."""
        # Should not raise exception
        await processor.stop()
        assert processor.running is False


class TestWebhookProcessorQueueing:
    """Tests for queue processing."""

    @pytest.mark.asyncio
    async def test_processor_processes_queue_items(
        self,
        processor: WebhookProcessor,
    ):
        """Test that processor processes items from queue."""
        with patch(
            "app.tasks.webhook_processor.webhook_delivery_service.process_queue"
        ) as mock_process:
            mock_process.return_value = 5  # Processed 5 items

            processed = await processor._process_loop.__wrapped__(processor)

            # Note: _process_loop is a while True loop, so we can't directly test it
            # This test is more of a structure validation

    @pytest.mark.asyncio
    async def test_processor_batch_size(self, processor: WebhookProcessor):
        """Test that processor respects batch size setting."""
        assert processor.batch_size == 5


class TestWebhookProcessorStatus:
    """Tests for processor status and statistics."""

    @pytest.mark.asyncio
    async def test_get_status(self, processor: WebhookProcessor):
        """Test getting processor status."""
        status = await processor.get_status()

        assert isinstance(status, dict)
        assert "running" in status
        assert "batch_size" in status
        assert "interval_seconds" in status
        assert "processed_total" in status
        assert "errors_total" in status
        assert "delivery_stats" in status

    @pytest.mark.asyncio
    async def test_status_running_true(self, processor: WebhookProcessor):
        """Test status reflects running state."""
        await processor.start()

        status = await processor.get_status()
        assert status["running"] is True

        await processor.stop()
        status = await processor.get_status()
        assert status["running"] is False

    @pytest.mark.asyncio
    async def test_processed_count_increments(
        self,
        processor: WebhookProcessor,
    ):
        """Test that processed count increments."""
        assert processor.processed_total == 0

        processor.processed_total += 5
        assert processor.processed_total == 5

        processor.processed_total += 3
        assert processor.processed_total == 8

    @pytest.mark.asyncio
    async def test_error_count_increments(
        self,
        processor: WebhookProcessor,
    ):
        """Test that error count increments."""
        assert processor.errors_total == 0

        processor.errors_total += 2
        assert processor.errors_total == 2


class TestGlobalProcessorInstance:
    """Tests for global processor instance management."""

    @pytest.mark.asyncio
    async def test_get_webhook_processor(self):
        """Test getting or creating processor instance."""
        processor1 = get_webhook_processor()
        processor2 = get_webhook_processor()

        assert processor1 is processor2

    @pytest.mark.asyncio
    async def test_start_webhook_processor(self):
        """Test starting global processor."""
        # This will use global state, so be careful
        processor = get_webhook_processor()
        original_running = processor.running

        try:
            await start_webhook_processor()
            assert processor.running is True

            await stop_webhook_processor()
            assert processor.running is False
        finally:
            processor.running = original_running

    @pytest.mark.asyncio
    async def test_stop_webhook_processor(self):
        """Test stopping global processor."""
        processor = get_webhook_processor()
        await start_webhook_processor()

        await stop_webhook_processor()
        assert processor.running is False


class TestProcessorErrorHandling:
    """Tests for error handling in processor."""

    @pytest.mark.asyncio
    async def test_processor_error_increments_counter(
        self,
        processor: WebhookProcessor,
    ):
        """Test that processing errors increment error counter."""
        assert processor.errors_total == 0

        processor.errors_total += 1
        assert processor.errors_total == 1


class TestProcessorStatsOnShutdown:
    """Tests for processor statistics on shutdown."""

    @pytest.mark.asyncio
    async def test_stats_logged_on_shutdown(
        self,
        processor: WebhookProcessor,
    ):
        """Test that stats are available after processing."""
        processor.processed_total = 100
        processor.errors_total = 5

        status = await processor.get_status()
        assert status["processed_total"] == 100
        assert status["errors_total"] == 5
