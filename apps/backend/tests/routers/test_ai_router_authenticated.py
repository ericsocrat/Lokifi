"""
Integration tests for AI Router endpoints with mocked dependencies.

Session 150: Coverage expansion for app/routers/ai.py (52% → 80%+)

Tests cover main code paths and error handling.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.ai_schemas import AIThreadResponse as Thread


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_user():
    """Mock user."""
    user = MagicMock()
    user.id = 1
    user.handle = "testuser"
    user.avatar_url = "https://example.com/avatar.png"
    return user


@pytest.fixture
def override_get_current_user(mock_user):
    """Override get_current_user dependency."""

    def get_current_user_override():
        return mock_user

    return get_current_user_override


@pytest.fixture
def override_get_db():
    """Override get_db dependency."""

    def get_db_override():
        return MagicMock()

    return get_db_override


# =============================================================================
# Create Thread Tests
# =============================================================================


class TestCreateThreadEndpoint:
    """Tests for POST /api/ai/threads"""

    def test_create_thread_success(
        self, client, override_get_current_user, override_get_db
    ):
        """Test successful thread creation."""
        from app.api.deps import get_current_user, get_db

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db

        try:
            mock_thread = Thread(
                id=1,
                user_id=1,
                title="Test Thread",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )

            with patch(
                "app.routers.ai.ai_service.create_thread", new_callable=AsyncMock
            ) as mock_create:
                mock_create.return_value = mock_thread

                response = client.post("/api/ai/threads", json={"title": "Test Thread"})
                assert response.status_code in [200, 201]
        finally:
            app.dependency_overrides.clear()

    def test_create_thread_requires_auth(self, client):
        """Test thread creation requires authentication."""
        response = client.post("/api/ai/threads", json={"title": "Test"})
        assert response.status_code == 401


# =============================================================================
# Get Threads Tests
# =============================================================================


class TestGetThreadsEndpoint:
    """Tests for GET /api/ai/threads"""

    def test_get_threads_empty(
        self, client, override_get_current_user, override_get_db
    ):
        """Test getting empty thread list."""
        from app.api.deps import get_current_user, get_db

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db

        try:
            with patch(
                "app.routers.ai.ai_service.get_user_threads", new_callable=AsyncMock
            ) as mock_get:
                mock_get.return_value = []

                response = client.get("/api/ai/threads")
                assert response.status_code == 200
                assert response.json() == []
        finally:
            app.dependency_overrides.clear()

    def test_get_threads_success(
        self, client, override_get_current_user, override_get_db
    ):
        """Test getting threads successfully."""
        from app.api.deps import get_current_user, get_db

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db

        try:
            mock_thread = Thread(
                id=1,
                user_id=1,
                title="Test Thread",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )

            with patch(
                "app.routers.ai.ai_service.get_user_threads", new_callable=AsyncMock
            ) as mock_get:
                mock_get.return_value = [mock_thread]

                response = client.get("/api/ai/threads")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
        finally:
            app.dependency_overrides.clear()

    def test_get_threads_requires_auth(self, client):
        """Test get threads requires authentication."""
        response = client.get("/api/ai/threads")
        assert response.status_code == 401


# =============================================================================
# Get Single Thread Tests - REMOVED: No GET /threads/{thread_id} endpoint exists
# =============================================================================


# =============================================================================
# Delete Thread Tests
# =============================================================================


class TestDeleteThreadEndpoint:
    """Tests for DELETE /api/ai/threads/{thread_id}"""

    def test_delete_thread_success(
        self, client, override_get_current_user, override_get_db
    ):
        """Test successful thread deletion."""
        from app.api.deps import get_current_user, get_db

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db

        try:
            with patch(
                "app.routers.ai.ai_service.delete_thread", new_callable=AsyncMock
            ) as mock_delete:
                mock_delete.return_value = True

                response = client.delete("/api/ai/threads/1")
                assert response.status_code == 204 or response.status_code == 200
        finally:
            app.dependency_overrides.clear()


# =============================================================================
# Send Message Tests
# =============================================================================


class TestSendMessageEndpoint:
    """Tests for POST /api/ai/threads/{thread_id}/messages"""

    def test_send_message_requires_auth(self, client):
        """Test send message requires auth."""
        response = client.post("/api/ai/threads/1/messages", json={"content": "Hello"})
        assert response.status_code == 401


# =============================================================================
# Get Thread Messages Tests
# =============================================================================


class TestGetThreadMessagesEndpoint:
    """Tests for GET /api/ai/threads/{thread_id}/messages"""

    def test_get_thread_messages_success(
        self, client, override_get_current_user, override_get_db
    ):
        """Test getting thread messages."""
        from app.api.deps import get_current_user, get_db

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db

        try:
            with patch(
                "app.routers.ai.ai_service.get_thread_messages", new_callable=AsyncMock
            ) as mock_get:
                mock_get.return_value = []

                response = client.get("/api/ai/threads/1/messages")
                assert response.status_code == 200
        finally:
            app.dependency_overrides.clear()


# =============================================================================
# Export Tests
# =============================================================================


class TestExportEndpoint:
    """Tests for GET /api/ai/export/conversations"""

    def test_export_requires_auth(self, client):
        """Test export requires authentication."""
        response = client.get("/api/ai/export/conversations", params={"format": "json"})
        assert response.status_code == 401


# =============================================================================
# Provider Status Tests
# =============================================================================


class TestProviderStatusEndpoint:
    """Tests for GET /api/ai/providers"""

    def test_provider_status_requires_auth(self, client):
        """Test provider status requires authentication."""
        response = client.get("/api/ai/providers")
        assert response.status_code == 401


# =============================================================================
# Rate Limit Tests
# =============================================================================


class TestRateLimitEndpoint:
    """Tests for GET /api/ai/rate-limit"""

    def test_rate_limit_requires_auth(self, client):
        """Test rate limit requires authentication."""
        response = client.get("/api/ai/rate-limit")
        assert response.status_code == 401


# =============================================================================
# Conversation Metrics Tests
# =============================================================================


class TestConversationMetricsEndpoint:
    """Tests for GET /api/ai/analytics/conversation-metrics"""

    def test_metrics_requires_auth(self, client):
        """Test metrics requires authentication."""
        response = client.get("/api/ai/analytics/conversation-metrics")
        assert response.status_code == 401


# =============================================================================
# Authorization Tests
# =============================================================================


class TestAuthenticationRequired:
    """Tests that endpoints require authentication."""

    def test_create_thread_unauthorized(self, client):
        """Test create thread without auth."""
        response = client.post("/api/ai/threads", json={"title": "Test"})
        assert response.status_code == 401

    def test_get_threads_unauthorized(self, client):
        """Test get threads without auth."""
        response = client.get("/api/ai/threads")
        assert response.status_code == 401

    def test_delete_thread_unauthorized(self, client):
        """Test delete thread without auth."""
        response = client.delete("/api/ai/threads/1")
        assert response.status_code == 401

    def test_send_message_unauthorized(self, client):
        """Test send message without auth."""
        response = client.post("/api/ai/threads/1/messages", json={"content": "Test"})
        assert response.status_code == 401

    def test_get_thread_messages_unauthorized(self, client):
        """Test get thread messages without auth."""
        response = client.get("/api/ai/threads/1/messages")
        assert response.status_code == 401
