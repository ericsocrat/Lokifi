"""Webhook delivery service for processing and retrying webhook deliveries.

Handles:
- Queueing webhook deliveries to Redis
- Processing delivery attempts with retry logic
- HMAC-SHA256 signature generation
- HTTP requests to webhook endpoints
- Status tracking and updates
"""

__all__ = ["WebhookDeliveryService", "webhook_delivery_service"]

import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import db_manager
from app.core.redis_client import redis_client
from app.models.webhook import Webhook
from app.models.webhook_delivery import DeliveryStatus, WebhookDelivery

logger = logging.getLogger(__name__)

# Redis queue keys
WEBHOOK_QUEUE_KEY = "webhooks:delivery_queue"
WEBHOOK_PROCESSING_KEY = "webhooks:processing"
WEBHOOK_DEAD_LETTER_KEY = "webhooks:dead_letter"
WEBHOOK_STATS_KEY = "webhooks:delivery_stats"


class WebhookDeliveryService:
    """Service for processing webhook deliveries with retry logic."""

    def __init__(self):
        self.queue_key = WEBHOOK_QUEUE_KEY
        self.processing_key = WEBHOOK_PROCESSING_KEY
        self.dead_letter_key = WEBHOOK_DEAD_LETTER_KEY
        self.stats_key = WEBHOOK_STATS_KEY
        self.http_timeout = 10.0  # seconds
        self.max_payload_size = 1024 * 100  # 100KB

    async def queue_delivery(
        self,
        webhook_id: UUID,
        event: str,
        payload: dict[str, Any],
        delivery_id: UUID | None = None,
    ) -> bool:
        """Queue a webhook delivery for processing.

        Args:
            webhook_id: ID of the webhook to trigger
            event: Event type that triggered the webhook
            payload: Event payload to send to webhook endpoint
            delivery_id: Optional specific delivery ID (creates new if not provided)

        Returns:
            True if queued successfully, False otherwise
        """
        if not await redis_client.is_available():
            logger.warning("Redis unavailable, cannot queue webhook delivery")
            return False

        try:
            # Create delivery record in database
            if not delivery_id:
                async with db_manager.session() as session:
                    delivery = WebhookDelivery(
                        webhook_id=webhook_id,
                        event=event,
                        payload=json.dumps(payload),
                        status=DeliveryStatus.PENDING,
                        attempt_count=0,
                        next_retry_at=None,
                    )
                    session.add(delivery)
                    await session.flush()
                    delivery_id = delivery.id

            # Add to Redis queue
            queue_data = json.dumps(
                {
                    "webhook_id": str(webhook_id),
                    "delivery_id": str(delivery_id),
                    "event": event,
                    "payload": payload,
                    "queued_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            await redis_client.client.rpush(self.queue_key, queue_data)

            # Update stats
            await redis_client.client.hincrby(
                self.stats_key, "total_queued", 1
            )  # type: ignore[misc]

            logger.debug(
                f"✅ Queued webhook delivery: webhook_id={webhook_id}, "
                f"event={event}, delivery_id={delivery_id}"
            )
            return True

        except Exception as e:
            logger.error(f"❌ Failed to queue webhook delivery: {e}", exc_info=True)
            return False

    async def process_queue(self, batch_size: int = 10) -> int:
        """Process pending webhook deliveries from Redis queue.

        Args:
            batch_size: Number of deliveries to process in this batch

        Returns:
            Number of deliveries processed
        """
        if not await redis_client.is_available():
            logger.warning("Redis unavailable, skipping webhook processing")
            return 0

        processed_count = 0

        try:
            for _ in range(batch_size):
                # Pop from queue (non-blocking)
                queue_item = await redis_client.client.lpop(self.queue_key)

                if not queue_item:
                    break

                try:
                    data = json.loads(queue_item)
                    webhook_id = UUID(data["webhook_id"])
                    delivery_id = UUID(data["delivery_id"])
                    event = data["event"]
                    payload = data["payload"]

                    # Process the delivery
                    await self._process_delivery(webhook_id, delivery_id, event, payload)
                    processed_count += 1

                except (json.JSONDecodeError, KeyError, ValueError) as e:
                    logger.error(
                        f"❌ Invalid queue item format: {e}",
                        exc_info=True,
                    )
                    # Move to dead letter queue
                    await redis_client.client.rpush(self.dead_letter_key, queue_item)

            if processed_count > 0:
                logger.info(f"✅ Processed {processed_count} webhook deliveries")

            return processed_count

        except Exception as e:
            logger.error(f"❌ Error processing webhook queue: {e}", exc_info=True)
            return processed_count

    async def _process_delivery(
        self,
        webhook_id: UUID,
        delivery_id: UUID,
        event: str,
        payload: dict[str, Any],
    ) -> None:
        """Process a single webhook delivery attempt.

        Args:
            webhook_id: ID of the webhook
            delivery_id: ID of the delivery record
            event: Event type
            payload: Event payload
        """
        try:
            # Fetch webhook config and delivery record
            async with db_manager.session() as session:
                # Get webhook
                result = await session.execute(select(Webhook).where(Webhook.id == webhook_id))
                webhook = result.scalar_one_or_none()

                if not webhook:
                    logger.warning(
                        f"⚠️ Webhook not found: {webhook_id}, "
                        f"marking delivery {delivery_id} as failed"
                    )
                    await self._update_delivery_status(
                        delivery_id,
                        DeliveryStatus.FAILED,
                        session,
                        error_message="Webhook not found",
                    )
                    return

                # Get delivery record
                result = await session.execute(
                    select(WebhookDelivery).where(WebhookDelivery.id == delivery_id)
                )
                delivery = result.scalar_one_or_none()

                if not delivery:
                    logger.warning(f"⚠️ Delivery record not found: {delivery_id}")
                    return

                # Check if webhook is active
                if webhook.status.value != "ACTIVE":
                    logger.info(
                        f"⚠️ Webhook inactive: {webhook_id}, " f"skipping delivery {delivery_id}"
                    )
                    await self._update_delivery_status(
                        delivery_id,
                        DeliveryStatus.FAILED,
                        session,
                        error_message="Webhook is inactive",
                    )
                    return

                # Generate signature
                signature = self._generate_signature(webhook.secret, payload)

                # Prepare request
                headers = {
                    "Content-Type": "application/json",
                    "User-Agent": f"Lokifi/WebhookDelivery (+{settings.api_url})",
                    "X-Webhook-Event": event,
                    "X-Webhook-Delivery": str(delivery_id),
                    "X-Webhook-Signature": f"sha256={signature}",
                    "X-Webhook-Timestamp": datetime.now(timezone.utc).isoformat(),
                }

                # Attempt delivery
                success = await self._send_delivery(webhook.url, headers, payload)

                if success:
                    logger.info(
                        f"✅ Webhook delivered successfully: "
                        f"webhook_id={webhook_id}, delivery_id={delivery_id}"
                    )
                    await self._update_delivery_status(delivery_id, DeliveryStatus.SUCCESS, session)
                    # Update webhook last_triggered_at
                    await session.execute(
                        update(Webhook)
                        .where(Webhook.id == webhook_id)
                        .values(last_triggered_at=datetime.now(timezone.utc))
                    )

                else:
                    # Handle retry logic
                    await self._handle_retry(webhook, delivery, delivery_id, session)

        except Exception as e:
            logger.error(
                f"❌ Error processing delivery {delivery_id}: {e}",
                exc_info=True,
            )
            async with db_manager.session() as session:
                await self._update_delivery_status(
                    delivery_id,
                    DeliveryStatus.FAILED,
                    session,
                    error_message=str(e)[:500],
                )

    async def _send_delivery(
        self,
        url: str,
        headers: dict[str, str],
        payload: dict[str, Any],
    ) -> bool:
        """Send HTTP POST request to webhook endpoint.

        Args:
            url: Webhook endpoint URL
            headers: Request headers including signature
            payload: JSON payload to send

        Returns:
            True if successful (2xx response), False otherwise
        """
        try:
            # Validate payload size
            payload_str = json.dumps(payload)
            if len(payload_str) > self.max_payload_size:
                logger.warning(
                    f"⚠️ Payload exceeds max size: " f"{len(payload_str)} > {self.max_payload_size}"
                )
                return False

            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                )

                # Success for 2xx responses
                if 200 <= response.status_code < 300:
                    logger.debug(
                        f"✅ Webhook POST successful: {url} (status={response.status_code})"
                    )
                    return True
                else:
                    logger.warning(
                        f"⚠️ Webhook POST failed: {url} " f"(status={response.status_code})"
                    )
                    return False

        except httpx.TimeoutException:
            logger.warning(f"⚠️ Webhook request timeout: {url}")
            return False
        except httpx.RequestError as e:
            logger.warning(f"⚠️ Webhook request error: {url} - {e}")
            return False
        except Exception as e:
            logger.error(
                f"❌ Unexpected error sending webhook: {e}",
                exc_info=True,
            )
            return False

    async def _handle_retry(
        self,
        webhook: Webhook,
        delivery: WebhookDelivery,
        delivery_id: UUID,
        session: AsyncSession,
    ) -> None:
        """Handle retry logic for failed delivery.

        Uses exponential backoff with configurable max retries.

        Args:
            webhook: Webhook model
            delivery: WebhookDelivery model
            delivery_id: ID of the delivery
            session: Database session
        """
        attempt_count = delivery.attempt_count + 1
        max_retries = webhook.max_retries

        if attempt_count >= max_retries:
            logger.warning(
                f"⚠️ Max retries reached for delivery {delivery_id}, "
                f"marking as failed (attempts={attempt_count}/{max_retries})"
            )
            await self._update_delivery_status(
                delivery_id,
                DeliveryStatus.FAILED,
                session,
                error_message=f"Max retries reached: {attempt_count}/{max_retries}",
            )
        else:
            # Calculate exponential backoff delay
            base_delay = webhook.retry_delay_seconds
            # Exponential: base_delay * (2 ^ (attempt - 1))
            delay_seconds = min(
                base_delay * (2 ** (attempt_count - 1)),
                3600,  # Cap at 1 hour
            )
            next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)

            # Update delivery record
            await session.execute(
                update(WebhookDelivery)
                .where(WebhookDelivery.id == delivery_id)
                .values(
                    status=DeliveryStatus.RETRYING,
                    attempt_count=attempt_count,
                    next_retry_at=next_retry_at,
                )
            )
            await session.commit()

            # Re-queue for retry
            queue_data = json.dumps(
                {
                    "webhook_id": str(webhook.id),
                    "delivery_id": str(delivery_id),
                    "event": delivery.event,
                    "payload": json.loads(delivery.payload),
                    "queued_at": datetime.now(timezone.utc).isoformat(),
                    "retry_attempt": attempt_count,
                }
            )
            await redis_client.client.rpush(self.queue_key, queue_data)

            logger.info(
                f"↻ Webhook retry scheduled for delivery {delivery_id}, "
                f"attempt {attempt_count}/{max_retries}, "
                f"retry in {delay_seconds}s"
            )

    async def _update_delivery_status(
        self,
        delivery_id: UUID,
        status: DeliveryStatus,
        session: AsyncSession,
        error_message: str | None = None,
    ) -> None:
        """Update delivery status in database.

        Args:
            delivery_id: ID of the delivery
            status: New status
            session: Database session
            error_message: Optional error message
        """
        try:
            update_data = {"status": status}
            if error_message:
                update_data["response_body"] = error_message

            await session.execute(
                update(WebhookDelivery)
                .where(WebhookDelivery.id == delivery_id)
                .values(**update_data)
            )
            await session.commit()

        except Exception as e:
            logger.error(
                f"❌ Failed to update delivery status: {e}",
                exc_info=True,
            )

    def _generate_signature(self, secret: str, payload: dict[str, Any]) -> str:
        """Generate HMAC-SHA256 signature for webhook payload.

        Args:
            secret: Webhook secret key
            payload: Payload to sign

        Returns:
            Hex-encoded HMAC-SHA256 signature
        """
        payload_str = json.dumps(payload, separators=(",", ":"), sort_keys=True)
        signature = hmac.new(
            secret.encode(),
            payload_str.encode(),
            hashlib.sha256,
        ).hexdigest()
        return signature

    async def get_stats(self) -> dict[str, Any]:
        """Get webhook delivery statistics.

        Returns:
            Dictionary with delivery stats
        """
        if not await redis_client.is_available():
            return {"error": "Redis unavailable"}

        try:
            stats = await redis_client.client.hgetall(self.stats_key)  # type: ignore[misc]
            queue_size = await redis_client.client.llen(self.queue_key)
            dead_letter_size = await redis_client.client.llen(self.dead_letter_key)

            return {
                "total_queued": int(stats.get(b"total_queued", 0) or 0),
                "queue_size": queue_size,
                "dead_letter_size": dead_letter_size,
                "stats": stats,
            }

        except Exception as e:
            logger.error(f"❌ Error getting stats: {e}", exc_info=True)
            return {"error": str(e)}

    async def reset_stats(self) -> bool:
        """Reset delivery statistics.

        Returns:
            True if successful
        """
        if not await redis_client.is_available():
            return False

        try:
            await redis_client.client.delete(self.stats_key)
            return True
        except Exception as e:
            logger.error(f"❌ Error resetting stats: {e}", exc_info=True)
            return False


# Global instance
webhook_delivery_service = WebhookDeliveryService()
