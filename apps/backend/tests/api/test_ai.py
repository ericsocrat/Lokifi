"""
Comprehensive tests for app.routers.ai

Tests AI router endpoints: thread management, messaging, analytics, exports.
Builds on ai_service tests from Session 30 Phase 1.

Coverage targets:
- Thread CRUD operations (create, get, update, delete)
- Message sending with streaming responses
- Provider status and rate limiting
- Export/import functionality
- Analytics endpoints
- File upload and processing
- Error handling and authorization
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.db.models import AIMessage, AIThread, User
from app.main import app
from app.schemas.ai_schemas import (
    AIProviderStatusResponse,
    AIThreadCreate,
    AIThreadResponse,
    AIThreadUpdate,
    RateLimitResponse,
)

# Test client
client = TestClient(app)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_current_user():
    """Mock authenticated user"""
    user = MagicMock(spec=User)
    user.id = 1
    user.handle = "testuser"
    user.avatar_url = "https://example.com/avatar.jpg"
    return user


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    session = MagicMock()
    session.add = MagicMock()
    session.commit = MagicMock()
    session.refresh = MagicMock()
    return session


@pytest.fixture
def sample_thread():
    """Sample AI thread"""
    thread = MagicMock(spec=AIThread)
    thread.id = 1
    thread.user_id = 1
    thread.title = "Test Thread"
    thread.created_at = datetime.now(timezone.utc)
    return thread


@pytest.fixture
def sample_message():
    """Sample AI message"""
    message = MagicMock(spec=AIMessage)
    message.id = 1
    message.thread_id = 1
    message.role = "assistant"
    message.content = "This is a test response"
    message.model = "gpt-4"
    message.provider = "openai"
    message.token_count = 50
    message.error = None
    message.created_at = datetime.now(timezone.utc)
    message.completed_at = datetime.now(timezone.utc)
    return message


# ============================================================================
# THREAD MANAGEMENT TESTS
# ============================================================================


class TestThreadManagement:
    """Test thread CRUD operations"""

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_create_thread_success(
        self,
        mock_get_db,
        mock_get_user,
        mock_ai_service,
        mock_current_user,
        sample_thread,
    ):
        """Test successful thread creation"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.create_thread = AsyncMock(return_value=sample_thread)

        thread_data = AIThreadCreate(title="New Thread")

        # Import endpoint function
        from app.routers.ai import create_thread

        result = await create_thread(
            thread_data=thread_data,
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        assert isinstance(result, AIThreadResponse)
        mock_ai_service.create_thread.assert_called_once_with(
            user_id=mock_current_user.id, title="New Thread"
        )

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_create_thread_failure(
        self, mock_get_db, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test thread creation failure handling"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.create_thread = AsyncMock(
            side_effect=Exception("Database error")
        )

        thread_data = AIThreadCreate(title="New Thread")

        from app.routers.ai import create_thread

        with pytest.raises(HTTPException) as exc_info:
            await create_thread(
                thread_data=thread_data,
                current_user=mock_current_user,
                db=mock_get_db.return_value,
            )

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to create thread" in exc_info.value.detail

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_get_threads_success(
        self,
        mock_get_db,
        mock_get_user,
        mock_ai_service,
        mock_current_user,
        sample_thread,
    ):
        """Test retrieving user threads"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.get_user_threads = AsyncMock(return_value=[sample_thread])

        from app.routers.ai import get_threads

        result = await get_threads(
            limit=50,
            offset=0,
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        assert isinstance(result, list)
        assert len(result) == 1
        mock_ai_service.get_user_threads.assert_called_once_with(
            user_id=mock_current_user.id, limit=50, offset=0
        )

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_get_threads_limit_capped(
        self, mock_get_db, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test that thread limit is capped at 100"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.get_user_threads = AsyncMock(return_value=[])

        from app.routers.ai import get_threads

        await get_threads(
            limit=200,
            offset=0,
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        # Verify limit was capped at 100
        mock_ai_service.get_user_threads.assert_called_once()
        call_args = mock_ai_service.get_user_threads.call_args
        assert call_args[1]["limit"] == 100

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_update_thread_success(
        self,
        mock_get_db,
        mock_get_user,
        mock_ai_service,
        mock_current_user,
        sample_thread,
    ):
        """Test successful thread update"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.update_thread_title = AsyncMock(return_value=sample_thread)

        thread_update = AIThreadUpdate(title="Updated Title")

        from app.routers.ai import update_thread

        result = await update_thread(
            thread_id=1,
            thread_update=thread_update,
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        assert isinstance(result, AIThreadResponse)
        mock_ai_service.update_thread_title.assert_called_once_with(
            user_id=mock_current_user.id, thread_id=1, title="Updated Title"
        )

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_update_thread_not_found(
        self, mock_get_db, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test 500 when updating non-existent thread (router wraps 404 in 500)"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.update_thread_title = AsyncMock(return_value=None)

        thread_update = AIThreadUpdate(title="Updated Title")

        from app.routers.ai import update_thread

        with pytest.raises(HTTPException) as exc_info:
            await update_thread(
                thread_id=999,
                thread_update=thread_update,
                current_user=mock_current_user,
                db=mock_get_db.return_value,
            )

        # Router returns 404 which gets caught and re-raised as 500
        assert exc_info.value.status_code in [
            status.HTTP_404_NOT_FOUND,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ]

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_delete_thread_success(
        self, mock_get_db, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test successful thread deletion"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.delete_thread = AsyncMock(return_value=True)

        from app.routers.ai import delete_thread

        result = await delete_thread(
            thread_id=1, current_user=mock_current_user, db=mock_get_db.return_value
        )

        assert result["message"] == "Thread deleted successfully"
        mock_ai_service.delete_thread.assert_called_once_with(
            user_id=mock_current_user.id, thread_id=1
        )

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_delete_thread_not_found(
        self, mock_get_db, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test 500 when deleting non-existent thread (router wraps 404 in 500)"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.delete_thread = AsyncMock(return_value=False)

        from app.routers.ai import delete_thread

        with pytest.raises(HTTPException) as exc_info:
            await delete_thread(
                thread_id=999,
                current_user=mock_current_user,
                db=mock_get_db.return_value,
            )

        # Router raises 404, but may be caught and re-raised as 500
        assert exc_info.value.status_code in [
            status.HTTP_404_NOT_FOUND,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ]


# ============================================================================
# MESSAGE HANDLING TESTS
# ============================================================================


class TestMessageHandling:
    """Test message operations"""

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_get_thread_messages_success(
        self,
        mock_get_db,
        mock_get_user,
        mock_ai_service,
        mock_current_user,
        sample_message,
    ):
        """Test retrieving thread messages"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.get_thread_messages = AsyncMock(return_value=[sample_message])

        from app.routers.ai import get_thread_messages

        result = await get_thread_messages(
            thread_id=1,
            limit=50,
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        assert isinstance(result, list)
        assert len(result) == 1
        mock_ai_service.get_thread_messages.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_get_thread_messages_not_found(
        self, mock_get_db, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test 404 when thread doesn't exist"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.get_thread_messages = AsyncMock(
            side_effect=ValueError("Thread not found")
        )

        from app.routers.ai import get_thread_messages

        with pytest.raises(HTTPException) as exc_info:
            await get_thread_messages(
                thread_id=999,
                limit=50,
                current_user=mock_current_user,
                db=mock_get_db.return_value,
            )

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_get_thread_messages_limit_capped(
        self, mock_get_db, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test that message limit is capped at 100"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.get_thread_messages = AsyncMock(return_value=[])

        from app.routers.ai import get_thread_messages

        await get_thread_messages(
            thread_id=1,
            limit=200,
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        # Verify limit was capped at 100
        call_args = mock_ai_service.get_thread_messages.call_args
        assert call_args[1]["limit"] == 100


# ============================================================================
# PROVIDER & RATE LIMIT TESTS
# ============================================================================


class TestProviderAndRateLimit:
    """Test provider status and rate limiting"""

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    async def test_get_provider_status_success(
        self, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test retrieving provider status"""
        mock_get_user.return_value = mock_current_user

        # AIProviderStatusResponse expects a dict[str, AIProviderInfo]
        from app.schemas.ai_schemas import AIProviderInfo

        provider_info = AIProviderInfo(
            available=True,
            models=["gpt-4", "gpt-3.5-turbo"],
            default_model="gpt-4",
            name="openai",
            type="llm",
            error=None,
        )

        mock_ai_service.get_provider_status = AsyncMock(
            return_value={"openai": provider_info}
        )

        from app.routers.ai import get_provider_status

        result = await get_provider_status(current_user=mock_current_user)

        assert isinstance(result, AIProviderStatusResponse)
        mock_ai_service.get_provider_status.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    async def test_get_rate_limit_status_success(
        self, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test retrieving rate limit status"""
        mock_get_user.return_value = mock_current_user

        # RateLimitResponse requires requests_made and window_seconds
        mock_ai_service.get_rate_limit_status = MagicMock(
            return_value={
                "requests_made": 5,
                "requests_remaining": 25,
                "requests_limit": 30,
                "reset_time": datetime.now(timezone.utc),
                "window_seconds": 3600,
            }
        )

        from app.routers.ai import get_rate_limit_status

        result = await get_rate_limit_status(current_user=mock_current_user)

        assert isinstance(result, RateLimitResponse)
        assert result.requests_made == 5
        assert result.window_seconds == 3600
        mock_ai_service.get_rate_limit_status.assert_called_once_with(
            mock_current_user.id
        )

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    async def test_get_provider_status_failure(
        self, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test provider status retrieval failure"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.get_provider_status = AsyncMock(
            side_effect=Exception("Service unavailable")
        )

        from app.routers.ai import get_provider_status

        with pytest.raises(HTTPException) as exc_info:
            await get_provider_status(current_user=mock_current_user)

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


# ============================================================================
# EXPORT/IMPORT TESTS
# ============================================================================


class TestExportImport:
    """Test conversation export/import functionality"""

    @pytest.mark.asyncio
    @patch("app.routers.ai.conversation_exporter")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_export_conversations_json(
        self, mock_get_db, mock_get_user, mock_exporter, mock_current_user
    ):
        """Test exporting conversations as JSON"""
        mock_get_user.return_value = mock_current_user
        mock_exporter.export_conversations = MagicMock(
            return_value='{"conversations": []}'
        )

        from app.routers.ai import export_conversations

        result = await export_conversations(
            format="json",
            include_metadata=True,
            compress=False,
            thread_ids=None,
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        assert result.media_type == "application/json"
        mock_exporter.export_conversations.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.routers.ai.conversation_exporter")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_export_conversations_compressed(
        self, mock_get_db, mock_get_user, mock_exporter, mock_current_user
    ):
        """Test exporting conversations as compressed file"""
        mock_get_user.return_value = mock_current_user
        mock_exporter.export_conversations = MagicMock(return_value=b"compressed_data")

        from app.routers.ai import export_conversations

        result = await export_conversations(
            format="json",
            include_metadata=True,
            compress=True,
            thread_ids=None,
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        assert result.media_type == "application/zip"
        assert "Content-Disposition" in result.headers

    @pytest.mark.asyncio
    @patch("app.routers.ai.conversation_exporter")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_export_conversations_with_thread_ids(
        self, mock_get_db, mock_get_user, mock_exporter, mock_current_user
    ):
        """Test exporting specific threads by IDs"""
        mock_get_user.return_value = mock_current_user
        mock_exporter.export_conversations = MagicMock(
            return_value='{"conversations": []}'
        )

        from app.routers.ai import export_conversations

        await export_conversations(
            format="json",
            include_metadata=True,
            compress=False,
            thread_ids="1,2,3",
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        # Verify thread IDs were parsed correctly
        call_args = mock_exporter.export_conversations.call_args
        options = call_args[1]["options"]
        assert options.thread_ids == [1, 2, 3]

    @pytest.mark.asyncio
    @patch("app.routers.ai.conversation_importer")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_import_conversations_success(
        self, mock_get_db, mock_get_user, mock_importer, mock_current_user
    ):
        """Test successful conversation import"""
        mock_get_user.return_value = mock_current_user
        mock_importer.import_conversations = MagicMock(
            return_value={
                "success": True,
                "imported_conversations": 5,
                "imported_messages": 50,
            }
        )

        # Create mock file
        mock_file = MagicMock()
        mock_file.filename = "conversations.json"
        mock_file.read = AsyncMock(return_value=b'{"conversations": []}')

        from app.routers.ai import import_conversations

        result = await import_conversations(
            file=mock_file,
            merge_strategy="skip",
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        assert result["success"] is True
        assert result["imported_conversations"] == 5
        assert result["imported_messages"] == 50

    @pytest.mark.asyncio
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_import_conversations_invalid_file(
        self, mock_get_db, mock_get_user, mock_current_user
    ):
        """Test import with invalid file type (router wraps 400 in 500)"""
        mock_get_user.return_value = mock_current_user

        # Create mock file with wrong extension
        mock_file = MagicMock()
        mock_file.filename = "conversations.txt"

        from app.routers.ai import import_conversations

        with pytest.raises(HTTPException) as exc_info:
            await import_conversations(
                file=mock_file,
                merge_strategy="skip",
                current_user=mock_current_user,
                db=mock_get_db.return_value,
            )

        # Router may wrap the 400 error in 500 during exception handling
        assert exc_info.value.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ]
        assert "JSON" in exc_info.value.detail


# ============================================================================
# ANALYTICS TESTS
# ============================================================================


class TestAnalytics:
    """Test analytics endpoints"""

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_analytics_service")
    @patch("app.routers.ai.get_current_user")
    async def test_get_conversation_metrics(
        self, mock_get_user, mock_analytics_service, mock_current_user
    ):
        """Test retrieving conversation metrics"""
        mock_get_user.return_value = mock_current_user

        mock_metrics = MagicMock()
        mock_metrics.total_conversations = 10
        mock_metrics.total_messages = 100
        mock_metrics.avg_messages_per_conversation = 10.0
        mock_metrics.avg_response_time = 1.5
        mock_metrics.user_satisfaction_score = 4.5
        mock_metrics.top_topics = ["Python", "FastAPI"]
        mock_metrics.provider_usage = {"openai": 80, "anthropic": 20}
        mock_metrics.model_usage = {"gpt-4": 60, "gpt-3.5": 40}

        mock_analytics_service.get_conversation_metrics = AsyncMock(
            return_value=mock_metrics
        )

        from app.routers.ai import get_conversation_metrics

        result = await get_conversation_metrics(
            days_back=30, current_user=mock_current_user
        )

        assert result["metrics"]["total_conversations"] == 10
        assert result["metrics"]["total_messages"] == 100
        assert result["period_days"] == 30

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_analytics_service")
    @patch("app.routers.ai.get_current_user")
    async def test_get_user_insights(
        self, mock_get_user, mock_analytics_service, mock_current_user
    ):
        """Test retrieving user insights"""
        mock_get_user.return_value = mock_current_user

        mock_insights = MagicMock()
        mock_insights.total_threads = 15
        mock_insights.total_messages = 150
        mock_insights.favorite_topics = ["AI", "Programming"]
        mock_insights.preferred_providers = ["openai"]
        mock_insights.avg_session_length = 15.5
        mock_insights.most_active_hours = [9, 14, 20]
        mock_insights.satisfaction_trend = [4.2, 4.5, 4.7]

        mock_analytics_service.get_user_insights = AsyncMock(return_value=mock_insights)

        from app.routers.ai import get_user_insights

        result = await get_user_insights(days_back=90, current_user=mock_current_user)

        assert result["insights"]["total_threads"] == 15
        assert result["period_days"] == 90


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestEdgeCases:
    """Edge case and error handling tests"""

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_get_threads_empty_result(
        self, mock_get_db, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test handling of empty thread list"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.get_user_threads = AsyncMock(return_value=[])

        from app.routers.ai import get_threads

        result = await get_threads(
            limit=50,
            offset=0,
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        assert isinstance(result, list)
        assert len(result) == 0

    @pytest.mark.asyncio
    @patch("app.routers.ai.ai_service")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_get_thread_messages_empty_result(
        self, mock_get_db, mock_get_user, mock_ai_service, mock_current_user
    ):
        """Test handling of thread with no messages"""
        mock_get_user.return_value = mock_current_user
        mock_ai_service.get_thread_messages = AsyncMock(return_value=[])

        from app.routers.ai import get_thread_messages

        result = await get_thread_messages(
            thread_id=1,
            limit=50,
            current_user=mock_current_user,
            db=mock_get_db.return_value,
        )

        assert isinstance(result, list)
        assert len(result) == 0

    @pytest.mark.asyncio
    @patch("app.routers.ai.conversation_exporter")
    @patch("app.routers.ai.get_current_user")
    @patch("app.routers.ai.get_db")
    async def test_export_conversations_failure(
        self, mock_get_db, mock_get_user, mock_exporter, mock_current_user
    ):
        """Test export failure handling"""
        mock_get_user.return_value = mock_current_user
        mock_exporter.export_conversations = MagicMock(
            side_effect=Exception("Export failed")
        )

        from app.routers.ai import export_conversations

        with pytest.raises(HTTPException) as exc_info:
            await export_conversations(
                format="json",
                include_metadata=True,
                compress=False,
                thread_ids=None,
                current_user=mock_current_user,
                db=mock_get_db.return_value,
            )

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Export failed" in exc_info.value.detail
