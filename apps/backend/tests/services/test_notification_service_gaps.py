"""
Targeted tests for notification_service error paths and edge cases:
- get_unread_count with database errors
- mark_all_as_read with database errors
- get_notification_stats with missing data
- cleanup_expired_notifications error handling
- Event handler registration and removal
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.notification_service import NotificationService


@pytest.fixture
def service() -> NotificationService:
    return NotificationService()


@pytest.mark.asyncio
async def test_get_unread_count_handles_db_error(service: NotificationService):
    """Test get_unread_count handles database errors gracefully."""
    user_id = uuid4()

    with patch("app.services.notification_service.db_manager") as mock_db:
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(side_effect=Exception("DB connection lost"))
        mock_db.get_session = MagicMock(return_value=mock_session)

        result = await service.get_unread_count(user_id)
        assert result == 0  # Returns 0 on error


@pytest.mark.asyncio
async def test_mark_all_as_read_handles_db_error(service: NotificationService):
    """Test mark_all_as_read handles database errors gracefully."""
    user_id = uuid4()

    with patch("app.services.notification_service.db_manager") as mock_db:
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(side_effect=Exception("DB error"))
        mock_db.get_session = MagicMock(return_value=mock_session)

        result = await service.mark_all_as_read(user_id)
        assert result == 0  # Returns 0 on error


@pytest.mark.asyncio
async def test_get_notification_stats_handles_missing_data(
    service: NotificationService,
):
    """Test get_notification_stats handles missing notification data."""
    user_id = uuid4()

    with patch("app.services.notification_service.db_manager") as mock_db:
        mock_session = AsyncMock()
        mock_result = AsyncMock()
        mock_result.scalars = MagicMock(
            return_value=MagicMock(all=MagicMock(return_value=[]))
        )
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_db.get_session = MagicMock(return_value=mock_session)

        stats = await service.get_notification_stats(user_id)
        assert stats.total_notifications == 0
        assert stats.unread_count == 0


@pytest.mark.asyncio
async def test_cleanup_expired_notifications_handles_errors(
    service: NotificationService,
):
    """Test cleanup_expired_notifications handles database errors."""
    with patch("app.services.notification_service.db_manager") as mock_db:
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(side_effect=Exception("Cleanup failed"))
        mock_db.get_session = MagicMock(return_value=mock_session)

        result = await service.cleanup_expired_notifications()
        assert result == 0  # Returns 0 on error


@pytest.mark.asyncio
async def test_emit_event_with_handlers(service: NotificationService):
    """Test _emit_event calls registered handlers."""
    handler_called = []

    async def test_handler(data):
        handler_called.append(data)

    service.add_event_handler("test_event", test_handler)
    await service._emit_event("test_event", {"key": "value"})

    assert len(handler_called) == 1
    assert handler_called[0] == {"key": "value"}


@pytest.mark.asyncio
async def test_emit_event_handles_handler_exception(service: NotificationService):
    """Test _emit_event continues when handler throws exception."""
    handler1_called = []
    handler2_called = []

    async def failing_handler(data):
        raise Exception("Handler error")

    async def working_handler(data):
        handler2_called.append(data)

    service.add_event_handler("test", failing_handler)
    service.add_event_handler("test", working_handler)

    await service._emit_event("test", {"data": 1})

    # Second handler should still execute despite first failing
    assert len(handler2_called) == 1


def test_add_event_handler(service: NotificationService):
    """Test add_event_handler registers handlers correctly."""
    handler = MagicMock()
    service.add_event_handler("test", handler)

    assert "test" in service.event_handlers
    assert handler in service.event_handlers["test"]


def test_remove_event_handler(service: NotificationService):
    """Test remove_event_handler removes handlers correctly."""
    handler = MagicMock()
    service.add_event_handler("test", handler)
    service.remove_event_handler("test", handler)

    assert handler not in service.event_handlers.get("test", [])


def test_remove_event_handler_for_nonexistent_type(service: NotificationService):
    """Test remove_event_handler handles nonexistent event type."""
    handler = MagicMock()
    # Should not raise exception
    service.remove_event_handler("nonexistent", handler)
