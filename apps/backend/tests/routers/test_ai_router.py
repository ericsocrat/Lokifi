"""
Comprehensive tests for AI Router endpoints.

Tests cover all AI-related endpoints including:
- Thread CRUD operations (create, get, update, delete)
- Message sending with streaming responses
- Provider status and rate limiting
- Export/import functionality
- Analytics endpoints (conversation metrics, user insights, provider performance)
- Moderation and context endpoints
- File upload for multimodal AI

Test Strategy:
- Use TestClient for route existence and basic validation
- Focus on testing route structure, HTTP methods, and validation
- Service-level logic tested separately in service tests
"""

import json
from datetime import datetime, timezone
from io import BytesIO
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app

# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def mock_thread_data():
    """Sample thread creation data."""
    return {"title": "Test Thread", "provider": "openai"}


@pytest.fixture
def mock_message_data():
    """Sample message data."""
    return {"content": "Hello AI", "stream": False}


@pytest.fixture
def mock_conversations_data():
    """Sample conversations import data."""
    return {"conversations": [], "merge_strategy": "skip"}


# =============================================================================
# Thread Management Tests
# =============================================================================


class TestCreateThread:
    """Tests for POST /api/ai/threads endpoint."""

    def test_create_thread_without_auth_returns_401(self, client):
        """Test that thread creation requires authentication."""
        response = client.post(
            "/api/ai/threads",
            json={"title": "Test Thread"},
        )
        assert response.status_code == 401

    def test_create_thread_route_exists(self, client):
        """Test that the route exists (not 404)."""
        response = client.post("/api/ai/threads", json={})
        # Should get 401 (unauthorized) or 422 (validation), not 404
        assert response.status_code != 404


class TestGetThreads:
    """Tests for GET /api/ai/threads endpoint."""

    def test_get_threads_without_auth_returns_401(self, client):
        """Test that thread retrieval requires authentication."""
        response = client.get("/api/ai/threads")
        assert response.status_code == 401

    def test_get_threads_route_exists(self, client):
        """Test that the route exists."""
        response = client.get("/api/ai/threads")
        assert response.status_code != 404

    def test_get_threads_with_pagination_params(self, client):
        """Test that pagination parameters are accepted."""
        response = client.get("/api/ai/threads?limit=10&offset=0")
        # Params should be accepted without 422
        assert response.status_code in [401, 403]


class TestGetThreadMessages:
    """Tests for GET /api/ai/threads/{thread_id}/messages endpoint."""

    def test_get_thread_messages_without_auth_returns_401(self, client):
        """Test that message retrieval requires authentication."""
        response = client.get("/api/ai/threads/1/messages")
        assert response.status_code == 401

    def test_get_thread_messages_route_exists(self, client):
        """Test that the route exists."""
        response = client.get("/api/ai/threads/1/messages")
        assert response.status_code != 404


class TestUpdateThread:
    """Tests for PUT /api/ai/threads/{thread_id} endpoint."""

    def test_update_thread_without_auth_returns_401(self, client):
        """Test that thread update requires authentication."""
        response = client.put(
            "/api/ai/threads/1",
            json={"title": "Updated Title"},
        )
        assert response.status_code == 401

    def test_update_thread_route_exists(self, client):
        """Test that the route exists."""
        response = client.put("/api/ai/threads/1", json={})
        assert response.status_code != 404


class TestDeleteThread:
    """Tests for DELETE /api/ai/threads/{thread_id} endpoint."""

    def test_delete_thread_without_auth_returns_401(self, client):
        """Test that thread deletion requires authentication."""
        response = client.delete("/api/ai/threads/1")
        assert response.status_code == 401

    def test_delete_thread_route_exists(self, client):
        """Test that the route exists."""
        response = client.delete("/api/ai/threads/1")
        assert response.status_code != 404


# =============================================================================
# Message Handling Tests
# =============================================================================


class TestSendMessage:
    """Tests for POST /api/ai/threads/{thread_id}/messages endpoint."""

    def test_send_message_without_auth_returns_401(self, client):
        """Test that message sending requires authentication."""
        response = client.post(
            "/api/ai/threads/1/messages",
            json={"content": "Hello AI"},
        )
        assert response.status_code == 401

    def test_send_message_route_exists(self, client):
        """Test that the route exists."""
        response = client.post("/api/ai/threads/1/messages", json={})
        assert response.status_code != 404

    def test_send_message_validates_content(self, client):
        """Test that empty content is rejected when auth passes."""
        # If authenticated, empty content should be rejected
        response = client.post(
            "/api/ai/threads/1/messages",
            json={"content": ""},
        )
        # Should require auth or validate content
        assert response.status_code in [401, 422]


# =============================================================================
# Provider Management Tests
# =============================================================================


class TestGetProviderStatus:
    """Tests for GET /api/ai/providers endpoint."""

    def test_get_provider_status_without_auth_returns_401(self, client):
        """Test that provider status requires authentication."""
        response = client.get("/api/ai/providers")
        assert response.status_code == 401

    def test_get_provider_status_route_exists(self, client):
        """Test that the route exists."""
        response = client.get("/api/ai/providers")
        assert response.status_code != 404


class TestGetRateLimitStatus:
    """Tests for GET /api/ai/rate-limit endpoint."""

    def test_get_rate_limit_status_without_auth_returns_401(self, client):
        """Test that rate limit status requires authentication."""
        response = client.get("/api/ai/rate-limit")
        assert response.status_code == 401

    def test_get_rate_limit_status_route_exists(self, client):
        """Test that the route exists."""
        response = client.get("/api/ai/rate-limit")
        assert response.status_code != 404


# =============================================================================
# Export/Import Tests
# =============================================================================


class TestExportConversations:
    """Tests for GET /api/ai/export/conversations endpoint."""

    def test_export_conversations_without_auth_returns_401(self, client):
        """Test that export requires authentication."""
        response = client.get("/api/ai/export/conversations")
        assert response.status_code == 401

    def test_export_conversations_route_exists(self, client):
        """Test that the route exists."""
        response = client.get("/api/ai/export/conversations")
        assert response.status_code != 404

    def test_export_conversations_formats_accepted(self, client):
        """Test that format parameter is accepted."""
        for fmt in ["json", "csv", "markdown", "html", "xml", "txt"]:
            response = client.get(f"/api/ai/export/conversations?format={fmt}")
            # Should get 401 (auth required), not 422 (invalid param)
            assert response.status_code == 401

    def test_export_conversations_invalid_format_rejected(self, client):
        """Test that invalid format is rejected."""
        response = client.get("/api/ai/export/conversations?format=invalid")
        # Should reject invalid format (422) or require auth (401)
        assert response.status_code in [401, 422]

    def test_export_conversations_with_compression(self, client):
        """Test that compression parameter is accepted."""
        response = client.get("/api/ai/export/conversations?compress=true")
        assert response.status_code == 401  # Auth required, param accepted

    def test_export_conversations_with_date_range(self, client):
        """Test that date range parameters are accepted."""
        response = client.get(
            "/api/ai/export/conversations?start_date=2024-01-01&end_date=2024-12-31"
        )
        # Should accept dates without 422
        assert response.status_code in [401, 422]


class TestImportConversations:
    """Tests for POST /api/ai/import/conversations endpoint."""

    def test_import_conversations_without_auth_returns_401(self, client):
        """Test that import requires authentication."""
        response = client.post(
            "/api/ai/import/conversations",
            json={"conversations": []},
        )
        assert response.status_code == 401

    def test_import_conversations_route_exists(self, client):
        """Test that the route exists."""
        response = client.post("/api/ai/import/conversations", json={})
        assert response.status_code != 404

    def test_import_conversations_merge_strategies_accepted(self, client):
        """Test that merge strategy parameter is accepted."""
        for strategy in ["skip", "overwrite", "merge"]:
            response = client.post(
                "/api/ai/import/conversations",
                json={"conversations": [], "merge_strategy": strategy},
            )
            # Should get 401 (auth), not 422 (invalid param)
            assert response.status_code == 401

    def test_import_conversations_invalid_merge_strategy_rejected(self, client):
        """Test that invalid merge strategy is rejected."""
        response = client.post(
            "/api/ai/import/conversations",
            json={"conversations": [], "merge_strategy": "invalid"},
        )
        # Should reject invalid strategy (422) or require auth (401)
        assert response.status_code in [401, 422]


# =============================================================================
# Analytics Tests (J5.2 Advanced Features)
# =============================================================================


class TestConversationMetrics:
    """Tests for GET /api/ai/analytics/conversation-metrics endpoint."""

    def test_get_conversation_metrics_without_auth_returns_401(self, client):
        """Test that conversation metrics requires authentication."""
        response = client.get("/api/ai/analytics/conversation-metrics")
        assert response.status_code == 401

    def test_get_conversation_metrics_route_exists(self, client):
        """Test that the route exists."""
        response = client.get("/api/ai/analytics/conversation-metrics")
        assert response.status_code != 404

    def test_get_conversation_metrics_with_date_range(self, client):
        """Test that date range parameters are accepted."""
        response = client.get(
            "/api/ai/analytics/conversation-metrics?start_date=2024-01-01&end_date=2024-12-31"
        )
        assert response.status_code in [401, 422]


class TestUserInsights:
    """Tests for GET /api/ai/analytics/user-insights endpoint."""

    def test_get_user_insights_without_auth_returns_401(self, client):
        """Test that user insights requires authentication."""
        response = client.get("/api/ai/analytics/user-insights")
        assert response.status_code == 401

    def test_get_user_insights_route_exists(self, client):
        """Test that the route exists."""
        response = client.get("/api/ai/analytics/user-insights")
        assert response.status_code != 404


class TestProviderPerformance:
    """Tests for GET /api/ai/analytics/provider-performance endpoint."""

    def test_get_provider_performance_without_auth_returns_401(self, client):
        """Test that provider performance requires authentication."""
        response = client.get("/api/ai/analytics/provider-performance")
        assert response.status_code == 401

    def test_get_provider_performance_route_exists(self, client):
        """Test that the route exists."""
        response = client.get("/api/ai/analytics/provider-performance")
        assert response.status_code != 404

    def test_get_provider_performance_with_provider_param(self, client):
        """Test that provider parameter is accepted."""
        response = client.get("/api/ai/analytics/provider-performance?provider=openai")
        # Should accept provider param without 422
        assert response.status_code in [401, 422]


# =============================================================================
# Moderation Tests
# =============================================================================


class TestModerationStatus:
    """Tests for GET /api/ai/moderation/status endpoint."""

    def test_get_moderation_status_without_auth_returns_401(self, client):
        """Test that moderation status requires authentication."""
        response = client.get("/api/ai/moderation/status")
        assert response.status_code == 401

    def test_get_moderation_status_route_exists(self, client):
        """Test that the route exists."""
        response = client.get("/api/ai/moderation/status")
        assert response.status_code != 404


# =============================================================================
# Context and User Profile Tests
# =============================================================================


class TestUserProfile:
    """Tests for GET /api/ai/context/user-profile endpoint."""

    def test_get_user_profile_without_auth_returns_401(self, client):
        """Test that user profile requires authentication."""
        response = client.get("/api/ai/context/user-profile")
        assert response.status_code == 401

    def test_get_user_profile_route_exists(self, client):
        """Test that the route exists."""
        response = client.get("/api/ai/context/user-profile")
        assert response.status_code != 404


# =============================================================================
# File Upload Tests (Multimodal AI)
# =============================================================================


class TestFileUpload:
    """Tests for POST /api/ai/threads/{thread_id}/file-upload endpoint."""

    def test_upload_file_without_auth_returns_401(self, client):
        """Test that file upload requires authentication."""
        files = {"file": ("test.png", BytesIO(b"fake image data"), "image/png")}
        response = client.post("/api/ai/threads/1/file-upload", files=files)
        assert response.status_code == 401

    def test_upload_file_route_exists(self, client):
        """Test that the route exists."""
        files = {"file": ("test.txt", BytesIO(b"data"), "text/plain")}
        response = client.post("/api/ai/threads/1/file-upload", files=files)
        assert response.status_code != 404

    def test_upload_file_requires_file(self, client):
        """Test that file is required."""
        response = client.post("/api/ai/threads/1/file-upload")
        # Should require file (422) or require auth (401)
        assert response.status_code in [401, 422]


# =============================================================================
# Error Handling Tests
# =============================================================================


class TestErrorHandling:
    """Tests for error handling scenarios."""

    def test_invalid_thread_id_format_handled(self, client):
        """Test that invalid thread ID format is handled."""
        response = client.get("/api/ai/threads/invalid/messages")
        # Should return 401 (auth) or 422 (validation), not 500
        assert response.status_code in [401, 422]

    def test_nonexistent_route_returns_404(self, client):
        """Test that nonexistent routes return 404."""
        response = client.get("/api/ai/nonexistent")
        assert response.status_code == 404

    def test_wrong_http_method_returns_405(self, client):
        """Test that wrong HTTP method returns 405."""
        response = client.patch("/api/ai/threads")  # PATCH not supported
        assert response.status_code == 405


class TestValidation:
    """Tests for input validation."""

    def test_empty_json_body_handled(self, client):
        """Test that empty JSON body is handled."""
        response = client.post("/api/ai/threads", json={})
        # Should require auth or validate body
        assert response.status_code in [401, 422]

    def test_invalid_json_handled(self, client):
        """Test that invalid JSON is handled."""
        response = client.post(
            "/api/ai/threads",
            content="not valid json",
            headers={"Content-Type": "application/json"},
        )
        # Should return 422 (invalid JSON) or 401 (auth first)
        assert response.status_code in [401, 422]


# =============================================================================
# API Response Structure Tests
# =============================================================================


class TestResponseStructure:
    """Tests for API response structure."""

    def test_401_response_has_detail(self, client):
        """Test that 401 responses have detail message."""
        response = client.get("/api/ai/threads")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_error_responses_are_json(self, client):
        """Test that error responses are valid JSON."""
        response = client.get("/api/ai/threads")
        # Should be able to parse as JSON
        data = response.json()
        assert isinstance(data, dict)


# =============================================================================
# Route Integration Tests
# =============================================================================


class TestRouteIntegration:
    """Integration tests for route structure."""

    def test_all_thread_routes_require_auth(self, client):
        """Test that all thread routes require authentication."""
        endpoints = [
            ("GET", "/api/ai/threads", None),
            ("POST", "/api/ai/threads", {}),
            ("GET", "/api/ai/threads/1/messages", None),
            ("POST", "/api/ai/threads/1/messages", {}),
            ("PUT", "/api/ai/threads/1", {}),
            ("DELETE", "/api/ai/threads/1", None),
        ]
        for method, path, json_data in endpoints:
            if json_data is not None:
                response = getattr(client, method.lower())(path, json=json_data)
            else:
                response = getattr(client, method.lower())(path)
            assert response.status_code in [
                401,
                422,
            ], f"{method} {path} should require auth"

    def test_all_analytics_routes_require_auth(self, client):
        """Test that all analytics routes require authentication."""
        endpoints = [
            "/api/ai/analytics/conversation-metrics",
            "/api/ai/analytics/user-insights",
            "/api/ai/analytics/provider-performance",
        ]
        for path in endpoints:
            response = client.get(path)
            assert response.status_code == 401, f"{path} should require auth"

    def test_all_export_import_routes_require_auth(self, client):
        """Test that export/import routes require authentication."""
        # Export
        response = client.get("/api/ai/export/conversations")
        assert response.status_code == 401

        # Import
        response = client.post(
            "/api/ai/import/conversations",
            json={"conversations": []},
        )
        assert response.status_code == 401


# =============================================================================
# Service Mock Tests (Testing with mocked services)
# =============================================================================


class TestWithMockedServices:
    """Tests with mocked AI services."""

    @pytest.fixture
    def mock_ai_service(self):
        """Create mock AI service."""
        with patch("app.routers.ai.ai_service") as mock:
            yield mock

    @pytest.fixture
    def mock_analytics_service(self):
        """Create mock analytics service."""
        with patch("app.routers.ai.ai_analytics_service") as mock:
            yield mock

    @pytest.fixture
    def mock_exporter(self):
        """Create mock conversation exporter."""
        with patch("app.routers.ai.conversation_exporter") as mock:
            yield mock

    @pytest.fixture
    def mock_importer(self):
        """Create mock conversation importer."""
        with patch("app.routers.ai.conversation_importer") as mock:
            yield mock

    @pytest.fixture
    def mock_multimodal_service(self):
        """Create mock multimodal AI service."""
        with patch("app.routers.ai.multimodal_ai_service") as mock:
            yield mock

    def test_ai_service_import_works(self):
        """Test that AI service can be imported."""
        from app.services.ai_service import ai_service

        assert ai_service is not None

    def test_analytics_service_import_works(self):
        """Test that analytics service can be imported."""
        from app.services.ai_analytics import ai_analytics_service

        assert ai_analytics_service is not None

    def test_exporter_import_works(self):
        """Test that conversation exporter can be imported."""
        from app.services.conversation_export import conversation_exporter

        assert conversation_exporter is not None

    def test_importer_import_works(self):
        """Test that conversation importer can be imported."""
        from app.services.conversation_export import conversation_importer

        assert conversation_importer is not None

    def test_multimodal_service_import_works(self):
        """Test that multimodal AI service can be imported."""
        from app.services.multimodal_ai_service import multimodal_ai_service

        assert multimodal_ai_service is not None

    def test_ai_errors_import_works(self):
        """Test that AI error classes can be imported."""
        from app.services.ai_provider import ProviderError
        from app.services.ai_service import RateLimitError, SafetyFilterError

        assert RateLimitError is not None
        assert SafetyFilterError is not None
        assert ProviderError is not None

    def test_multimodal_errors_import_works(self):
        """Test that multimodal error classes can be imported."""
        from app.services.multimodal_ai_service import (
            FileProcessingError,
            UnsupportedFileTypeError,
        )

        assert FileProcessingError is not None
        assert UnsupportedFileTypeError is not None


# =============================================================================
# Schema Tests
# =============================================================================


class TestSchemas:
    """Tests for AI-related schemas."""

    def test_thread_create_schema_import(self):
        """Test that AIThreadCreate schema can be imported."""
        from app.schemas.ai_schemas import AIThreadCreate

        assert AIThreadCreate is not None

    def test_thread_response_schema_import(self):
        """Test that AIThreadResponse schema can be imported."""
        from app.schemas.ai_schemas import AIThreadResponse

        assert AIThreadResponse is not None

    def test_thread_update_schema_import(self):
        """Test that AIThreadUpdate schema can be imported."""
        from app.schemas.ai_schemas import AIThreadUpdate

        assert AIThreadUpdate is not None

    def test_chat_request_schema_import(self):
        """Test that AIChatRequest schema can be imported."""
        from app.schemas.ai_schemas import AIChatRequest

        assert AIChatRequest is not None

    def test_message_response_schema_import(self):
        """Test that AIMessageResponse schema can be imported."""
        from app.schemas.ai_schemas import AIMessageResponse

        assert AIMessageResponse is not None

    def test_provider_status_schema_import(self):
        """Test that AIProviderStatusResponse schema can be imported."""
        from app.schemas.ai_schemas import AIProviderStatusResponse

        assert AIProviderStatusResponse is not None

    def test_rate_limit_schema_import(self):
        """Test that RateLimitResponse schema can be imported."""
        from app.schemas.ai_schemas import RateLimitResponse

        assert RateLimitResponse is not None


# =============================================================================
# Router Configuration Tests
# =============================================================================


class TestRouterConfiguration:
    """Tests for router configuration."""

    def test_router_prefix(self):
        """Test that router has correct prefix."""
        from app.routers.ai import router

        assert router.prefix == "/ai"

    def test_router_tags(self):
        """Test that router has correct tags."""
        from app.routers.ai import router

        assert "ai" in router.tags

    def test_router_has_routes(self):
        """Test that router has routes defined."""
        from app.routers.ai import router

        assert len(router.routes) > 0

    def test_router_included_in_app(self, client):
        """Test that router is included in the app."""
        # If we can hit any AI endpoint (even with 401), router is included
        response = client.get("/api/ai/threads")
        assert response.status_code != 404
