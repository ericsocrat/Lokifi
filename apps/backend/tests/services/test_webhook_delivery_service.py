"""Tests for webhook delivery service.

Tests cover:
- Queue operations (queueing deliveries, processing queue)
- HMAC signature generation and verification
- Retry logic with exponential backoff
- HTTP delivery attempts
- Status tracking
- Error handling
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import httpx
import pytest

from app.models.webhook import Webhook, WebhookStatus
from app.models.webhook_delivery import DeliveryStatus, WebhookDelivery
from app.services.webhook_delivery_service import WebhookDeliveryService


@pytest.fixture
def test_webhook() -> MagicMock:
    """Create a mock test webhook."""
    webhook = MagicMock(spec=Webhook)
    webhook.id = uuid4()
    webhook.url = "https://webhook.example.com/events"
    webhook.name = "Test Webhook"
    webhook.description = "Test webhook for unit tests"
    webhook.events = "user.created,post.created"
    webhook.secret = "test-secret-key-123456"
    webhook.active = True
    webhook.status = WebhookStatus.ACTIVE
    webhook.max_retries = 3
    webhook.retry_delay_seconds = 60
    webhook.created_at = datetime.now(timezone.utc)
    webhook.updated_at = datetime.now(timezone.utc)
    webhook.last_triggered_at = None
    webhook.successful_deliveries = 0
    webhook.failed_deliveries = 0
    webhook.parse_events.return_value = ["user.created", "post.created"]
    return webhook


@pytest.fixture
def webhook_service() -> WebhookDeliveryService:
    """Create a webhook delivery service instance."""
    return WebhookDeliveryService()


class TestWebhookQueueing:
    """Tests for webhook delivery queueing."""

    @pytest.mark.asyncio
    async def test_queue_delivery_returns_false_without_redis(
        self,
        webhook_service: WebhookDeliveryService,
        test_webhook: MagicMock,
    ):
        """Test that queueing fails gracefully without Redis."""
        with patch(
            "app.services.webhook_delivery_service.redis_client"
        ) as mock_redis:
            mock_redis.is_available = AsyncMock(return_value=False)

            result = await webhook_service.queue_delivery(
                webhook_id=test_webhook.id,
                event="user.created",
                payload={"user_id": str(uuid4())},
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_queue_delivery_queues_to_redis(
        self,
        webhook_service: WebhookDeliveryService,
        test_webhook: MagicMock,
    ):
        """Test that delivery is queued to Redis when available."""
        mock_session = AsyncMock()
        mock_delivery = MagicMock()
        mock_delivery.id = uuid4()

        # Patch db_manager.session() context manager
        mock_session_cm = AsyncMock()
        mock_session_cm.__aenter__.return_value = mock_session

        with (
            patch(
                "app.services.webhook_delivery_service.redis_client"
            ) as mock_redis,
            patch(
                "app.services.webhook_delivery_service.db_manager"
            ) as mock_db_manager,
        ):
            mock_redis.is_available = AsyncMock(return_value=True)
            mock_redis.client = AsyncMock()
            mock_redis.client.rpush = AsyncMock()
            mock_db_manager.session.return_value = mock_session_cm

            # Mock the flush to set the delivery ID
            async def mock_flush():
                pass

            mock_session.flush = mock_flush
            mock_session.add = MagicMock()

            result = await webhook_service.queue_delivery(
                webhook_id=test_webhook.id,
                event="user.created",
                payload={"user_id": str(uuid4())},
            )

            assert result is True
            mock_redis.client.rpush.assert_called_once()


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
    async def test_handle_retry_schedules_retry(
        self,
        webhook_service: WebhookDeliveryService,
        test_webhook: MagicMock,
    ):
        """Test that retry handler schedules retry with backoff."""
        mock_session = AsyncMock()
        mock_delivery = MagicMock()
        mock_delivery.attempt = 0
        mock_delivery.event = "user.created"
        mock_delivery.payload = '{"test": true}'
        delivery_id = uuid4()

        with patch(
            "app.services.webhook_delivery_service.redis_client"
        ) as mock_redis:
            mock_redis.client = AsyncMock()
            mock_redis.client.rpush = AsyncMock()

            await webhook_service._handle_retry(
                test_webhook, mock_delivery, delivery_id, mock_session
            )

            # Should execute update query and commit
            mock_session.execute.assert_called_once()
            mock_session.commit.assert_called_once()
            # Should re-queue to Redis
            mock_redis.client.rpush.assert_called_once()

    @pytest.mark.asyncio
    async def test_max_retries_exceeded_marks_failed(
        self,
        webhook_service: WebhookDeliveryService,
        test_webhook: MagicMock,
    ):
        """Test that exceeding max retries marks delivery as failed."""
        mock_session = AsyncMock()
        mock_delivery = MagicMock()
        # Set attempt at max_retries - 1 so next attempt exceeds
        mock_delivery.attempt = test_webhook.max_retries - 1
        mock_delivery.event = "user.created"
        mock_delivery.payload = '{"test": true}'
        delivery_id = uuid4()

        with patch.object(
            webhook_service, "_update_delivery_status", new_callable=AsyncMock
        ) as mock_update:
            await webhook_service._handle_retry(
                test_webhook, mock_delivery, delivery_id, mock_session
            )

            # Should call _update_delivery_status with FAILED
            mock_update.assert_called_once()
            call_args = mock_update.call_args
            assert call_args[0][1] == DeliveryStatus.FAILED


class TestWebhookHTTPDelivery:
    """Tests for HTTP delivery attempts."""

    @pytest.mark.asyncio
    async def test_send_delivery_success_200(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test successful webhook delivery with 200 response."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client

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
            mock_response = MagicMock()
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
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.post.side_effect = httpx.TimeoutException("Timeout")
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
    async def test_send_delivery_request_error(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test webhook delivery with request error."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.post.side_effect = httpx.RequestError("Connection failed")
            mock_client_class.return_value.__aenter__.return_value = mock_client

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
        with patch(
            "app.services.webhook_delivery_service.redis_client"
        ) as mock_redis:
            mock_redis.is_available = AsyncMock(return_value=False)

            stats = await webhook_service.get_stats()

            assert isinstance(stats, dict)


class TestUpdateDeliveryStatus:
    """Tests for delivery status updates."""

    @pytest.mark.asyncio
    async def test_update_delivery_status_success(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test updating delivery status to success."""
        mock_session = AsyncMock()
        delivery_id = uuid4()

        await webhook_service._update_delivery_status(
            delivery_id,
            DeliveryStatus.SUCCESS,
            mock_session,
        )

        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_delivery_status_with_error(
        self,
        webhook_service: WebhookDeliveryService,
    ):
        """Test updating delivery status with error message."""
        mock_session = AsyncMock()
        delivery_id = uuid4()

        await webhook_service._update_delivery_status(
            delivery_id,
            DeliveryStatus.FAILED,
            mock_session,
            error_message="Connection timeout",
        )

        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()
