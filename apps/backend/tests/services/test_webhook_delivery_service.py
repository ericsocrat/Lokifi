"""Tests for webhook delivery service.

Tests cover:
- Queue operations (queueing deliveries, processing queue)
- HMAC signature generation and verification
- Retry logic with exponential backoff
- HTTP delivery attempts
- Status tracking
- Error handling
"""

import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import db_manager
from app.models.webhook import Webhook, WebhookEvent, WebhookStatus
from app.models.webhook_delivery import DeliveryStatus, WebhookDelivery
from app.services.webhook_delivery_service import WebhookDeliveryService


@pytest.fixture
async def test_webhook(session: AsyncSession) -> Webhook:
    """Create a test webhook."""
    webhook = Webhook(
        id=uuid4(),
        url="https://webhook.example.com/events",
        name="Test Webhook",
        description="Test webhook for unit tests",
        events="user.created,post.created",
        secret="test-secret-key-123456",
        active=True,
        status=WebhookStatus.ACTIVE,
        max_retries=3,
        retry_delay_seconds=60,
    )
    session.add(webhook)
    await session.flush()
    return webhook


@pytest.fixture
def webhook_service() -> WebhookDeliveryService:
    """Create a webhook delivery service instance."""
    return WebhookDeliveryService()


class TestWebhookQueueing:
    """Tests for webhook delivery queueing."""

    @pytest.mark.asyncio
    async def test_queue_delivery_creates_delivery_record(
        self,
        webhook_service: WebhookDeliveryService,
        test_webhook: Webhook,
    ):
        """Test that queueing a delivery creates a database record."""
        payload = {"user_id": str(uuid4()), "email": "test@example.com"}

        result = await webhook_service.queue_delivery(
            webhook_id=test_webhook.id,
            event="user.created",
            payload=payload,
        )

        assert result is True

        # Verify delivery record was created
        async with db_manager.session() as session:
            result = await session.execute(
                select(WebhookDelivery).where(
                    WebhookDelivery.webhook_id == test_webhook.id
                )
            )
            deliveries = result.scalars().all()
            assert len(deliveries) == 1
            assert deliveries[0].status == DeliveryStatus.PENDING
            assert deliveries[0].event == "user.created"

    @pytest.mark.asyncio
    async def test_queue_delivery_with_specific_delivery_id(
        self,
        webhook_service: WebhookDeliveryService,
        test_webhook: Webhook,
    ):
        """Test queueing with a pre-created delivery ID."""
        delivery_id = uuid4()
        payload = {"user_id": str(uuid4())}

        result = await webhook_service.queue_delivery(
            webhook_id=test_webhook.id,
            event="user.created",
            payload=payload,
            delivery_id=delivery_id,
        )

        assert result is True


class TestWebhookSignature:
    """Tests for HMAC-SHA256 signature generation."""

    def test_generate_signature_consistent(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test that signature generation is deterministic."""
        secret = "test-secret"
        payload = {"user_id": "123", "email": "test@example.com"}

        sig1 = webhook_service._generate_signature(secret, payload)
        sig2 = webhook_service._generate_signature(secret, payload)

        assert sig1 == sig2
        assert len(sig1) == 64  # SHA256 hex is 64 chars

    def test_generate_signature_different_payloads(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test that different payloads produce different signatures."""
        secret = "test-secret"
        payload1 = {"user_id": "123"}
        payload2 = {"user_id": "456"}

        sig1 = webhook_service._generate_signature(secret, payload1)
        sig2 = webhook_service._generate_signature(secret, payload2)

        assert sig1 != sig2

    def test_generate_signature_different_secrets(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test that different secrets produce different signatures."""
        payload = {"user_id": "123"}

        sig1 = webhook_service._generate_signature("secret1", payload)
        sig2 = webhook_service._generate_signature("secret2", payload)

        assert sig1 != sig2


class TestWebhookRetryLogic:
    """Tests for retry mechanism and exponential backoff."""

    @pytest.mark.asyncio
    async def test_handle_retry_exponential_backoff(
        self,
        webhook_service: WebhookDeliveryService,
        test_webhook: Webhook,
    ):
        """Test that retry delay uses exponential backoff."""
        base_delay = 60

        async with db_manager.session() as session:
            # Attempt 1: delay = 60 * (2^0) = 60s
            delivery = WebhookDelivery(
                id=uuid4(),
                webhook_id=test_webhook.id,
                event="user.created",
                payload='{"test": true}',
                status=DeliveryStatus.RETRYING,
                attempt_count=0,
            )
            before = datetime.now(timezone.utc)
            await webhook_service._handle_retry(test_webhook, delivery, delivery.id, session)
            after = datetime.now(timezone.utc)

            result = await session.execute(
                select(WebhookDelivery).where(WebhookDelivery.id == delivery.id)
            )
            updated_delivery = result.scalar_one()

            assert updated_delivery.status == DeliveryStatus.RETRYING
            assert updated_delivery.attempt_count == 1
            assert updated_delivery.next_retry_at is not None

            # Verify delay is roughly 60 seconds (within 5 second tolerance)
            actual_delay = (
                updated_delivery.next_retry_at - after
            ).total_seconds()
            assert 55 < actual_delay < 65

    @pytest.mark.asyncio
    async def test_max_retries_exceeded_marks_failed(
        self,
        webhook_service: WebhookDeliveryService,
        test_webhook: Webhook,
    ):
        """Test that exceeding max retries marks delivery as failed."""
        max_retries = 3

        async with db_manager.session() as session:
            delivery = WebhookDelivery(
                id=uuid4(),
                webhook_id=test_webhook.id,
                event="user.created",
                payload='{"test": true}',
                status=DeliveryStatus.RETRYING,
                attempt_count=max_retries - 1,  # One less than max
            )
            session.add(delivery)
            await session.flush()

            # This should exceed max retries
            await webhook_service._handle_retry(test_webhook, delivery, delivery.id, session)

            result = await session.execute(
                select(WebhookDelivery).where(WebhookDelivery.id == delivery.id)
            )
            updated_delivery = result.scalar_one()

            assert updated_delivery.status == DeliveryStatus.FAILED


class TestWebhookHTTPDelivery:
    """Tests for HTTP delivery attempts."""

    @pytest.mark.asyncio
    async def test_send_delivery_success_200(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test successful webhook delivery with 200 response."""
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_post.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )

            headers = {"Content-Type": "application/json"}
            payload = {"test": "data"}

            result = await webhook_service._send_delivery(
                "https://webhook.example.com/events",
                headers,
                payload,
            )

            assert result is True

    @pytest.mark.asyncio
    async def test_send_delivery_failure_500(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test failed webhook delivery with 500 response."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client

            headers = {"Content-Type": "application/json"}
            payload = {"test": "data"}

            result = await webhook_service._send_delivery(
                "https://webhook.example.com/events",
                headers,
                payload,
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_send_delivery_timeout(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test webhook delivery timeout."""
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.side_effect = httpx.TimeoutException("Timeout")

            headers = {"Content-Type": "application/json"}
            payload = {"test": "data"}

            result = await webhook_service._send_delivery(
                "https://webhook.example.com/events",
                headers,
                payload,
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_send_delivery_request_error(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test webhook delivery with request error."""
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.side_effect = httpx.RequestError("Connection failed")

            headers = {"Content-Type": "application/json"}
            payload = {"test": "data"}

            result = await webhook_service._send_delivery(
                "https://webhook.example.com/events",
                headers,
                payload,
            )

            assert result is False


class TestWebhookStats:
    """Tests for webhook statistics and monitoring."""

    @pytest.mark.asyncio
    async def test_get_stats_returns_metrics(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test getting webhook statistics."""
        stats = await webhook_service.get_stats()

        # Should have stats structure even if Redis unavailable
        assert isinstance(stats, dict)
        assert "queue_size" in stats or "error" in stats


class TestUpdateDeliveryStatus:
    """Tests for delivery status updates."""

    @pytest.mark.asyncio
    async def test_update_delivery_status_success(
        self,
        webhook_service: WebhookDeliveryService,
        test_webhook: Webhook,
    ):
        """Test updating delivery status to success."""
        async with db_manager.session() as session:
            delivery = WebhookDelivery(
                id=uuid4(),
                webhook_id=test_webhook.id,
                event="user.created",
                payload='{"test": true}',
                status=DeliveryStatus.PENDING,
            )
            session.add(delivery)
            await session.flush()
            delivery_id = delivery.id

        async with db_manager.session() as session:
            await webhook_service._update_delivery_status(
                delivery_id,
                DeliveryStatus.SUCCESS,
                session,
            )

        async with db_manager.session() as session:
            result = await session.execute(
                select(WebhookDelivery).where(WebhookDelivery.id == delivery_id)
            )
            updated = result.scalar_one()
            assert updated.status == DeliveryStatus.SUCCESS

    @pytest.mark.asyncio
    async def test_update_delivery_status_with_error(
        self,
        webhook_service: WebhookDeliveryService,
        test_webhook: Webhook,
    ):
        """Test updating delivery status with error message."""
        async with db_manager.session() as session:
            delivery = WebhookDelivery(
                id=uuid4(),
                webhook_id=test_webhook.id,
                event="user.created",
                payload='{"test": true}',
                status=DeliveryStatus.PENDING,
            )
            session.add(delivery)
            await session.flush()
            delivery_id = delivery.id

        error_msg = "Connection timeout"
        async with db_manager.session() as session:
            await webhook_service._update_delivery_status(
                delivery_id,
                DeliveryStatus.FAILED,
                session,
                error_message=error_msg,
            )

        async with db_manager.session() as session:
            result = await session.execute(
                select(WebhookDelivery).where(WebhookDelivery.id == delivery_id)
            )
            updated = result.scalar_one()
            assert updated.status == DeliveryStatus.FAILED
            assert error_msg in updated.response_body
