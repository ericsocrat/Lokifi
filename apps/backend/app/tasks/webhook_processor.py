"""Background task processor for webhook delivery queue.

Handles continuous processing of pending webhook deliveries from Redis queue.
Integrates with FastAPI app lifecycle (startup/shutdown).
"""

__all__ = [
    "WebhookProcessor",
    "start_webhook_processor",
    "stop_webhook_processor",
]

import asyncio
import logging
from typing import Any

from app.services.webhook_delivery_service import webhook_delivery_service

logger = logging.getLogger(__name__)


class WebhookProcessor:
    """Background processor for webhook deliveries."""

    def __init__(self, batch_size: int = 10, interval_seconds: float = 5.0):
        """Initialize webhook processor.

        Args:
            batch_size: Number of deliveries to process per batch
            interval_seconds: Interval between processing batches (seconds)
        """
        self.batch_size = batch_size
        self.interval_seconds = interval_seconds
        self.running = False
        self.task: asyncio.Task[Any] | None = None
        self.processed_total = 0
        self.errors_total = 0

    async def start(self) -> None:
        """Start the webhook processor background task."""
        if self.running:
            logger.warning("⚠️ Webhook processor already running")
            return

        logger.info(
            f"🚀 Starting webhook processor "
            f"(batch_size={self.batch_size}, interval={self.interval_seconds}s)"
        )
        self.running = True
        self.task = asyncio.create_task(self._process_loop())

    async def stop(self) -> None:
        """Stop the webhook processor background task."""
        if not self.running:
            logger.warning("⚠️ Webhook processor not running")
            return

        logger.info("🛑 Stopping webhook processor")
        self.running = False

        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                logger.debug("✅ Webhook processor task cancelled")

        logger.info(
            f"📊 Webhook processor stats: "
            f"processed={self.processed_total}, errors={self.errors_total}"
        )

    async def _process_loop(self) -> None:
        """Main processing loop that continuously processes webhook deliveries."""
        logger.info("🔄 Webhook processor loop started")

        while self.running:
            try:
                # Process a batch of deliveries
                processed = await webhook_delivery_service.process_queue(batch_size=self.batch_size)
                self.processed_total += processed

                # Wait before next batch
                if self.running:
                    await asyncio.sleep(self.interval_seconds)

            except asyncio.CancelledError:
                logger.debug("🛑 Webhook processor loop cancelled")
                break
            except Exception as e:
                logger.error(
                    f"❌ Error in webhook processor loop: {e}",
                    exc_info=True,
                )
                self.errors_total += 1

                # Wait before retrying on error
                if self.running:
                    await asyncio.sleep(self.interval_seconds * 2)

        logger.info("✅ Webhook processor loop stopped")

    async def get_status(self) -> dict[str, Any]:
        """Get processor status and statistics.

        Returns:
            Dictionary with status information
        """
        stats = await webhook_delivery_service.get_stats()
        return {
            "running": self.running,
            "batch_size": self.batch_size,
            "interval_seconds": self.interval_seconds,
            "processed_total": self.processed_total,
            "errors_total": self.errors_total,
            "delivery_stats": stats,
        }


# Global processor instance
_webhook_processor: WebhookProcessor | None = None


def get_webhook_processor() -> WebhookProcessor:
    """Get or create the global webhook processor instance."""
    global _webhook_processor
    if _webhook_processor is None:
        _webhook_processor = WebhookProcessor()
    return _webhook_processor


async def start_webhook_processor() -> None:
    """Start the global webhook processor.

    Call this in FastAPI app startup event.
    """
    processor = get_webhook_processor()
    await processor.start()


async def stop_webhook_processor() -> None:
    """Stop the global webhook processor.

    Call this in FastAPI app shutdown event.
    """
    processor = get_webhook_processor()
    await processor.stop()
