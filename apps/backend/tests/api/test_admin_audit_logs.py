"""Tests for admin audit log routes."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.api.routes.admin_audit_logs import (
    audit_log_summary,
    create_audit_log,
    list_audit_logs,
)
from app.models.audit_log import AdminAuditLog
from app.schemas.audit import (
    AuditAction,
    AuditLogCreate,
    AuditResourceType,
    AuditStatus,
)


class TestAdminAuditLogs:
    """Admin audit log route tests."""

    @pytest.mark.asyncio
    async def test_list_audit_logs_returns_entries(self) -> None:
        """Should return paginated audit log entries."""
        db = AsyncMock()

        count_result = MagicMock()
        count_result.scalar_one.return_value = 2
        range_result = MagicMock()
        oldest = datetime(2026, 2, 4, tzinfo=timezone.utc)
        newest = datetime(2026, 2, 5, tzinfo=timezone.utc)
        range_result.one.return_value = (oldest, newest)
        list_result = MagicMock()

        entry = MagicMock(spec=AdminAuditLog)
        entry.id = uuid4()
        entry.user_id = uuid4()
        entry.action = AuditAction.UPDATE.value
        entry.resource_type = AuditResourceType.SETTINGS.value
        entry.resource_id = "settings"
        entry.status = AuditStatus.SUCCESS.value
        entry.description = "Updated system settings"
        entry.ip_address = "127.0.0.1"
        entry.user_agent = "pytest"
        entry.audit_metadata = {"field": "site_name"}
        entry.changes = {"site_name": {"old": "A", "new": "B"}}
        entry.created_at = newest
        entry.user = MagicMock()
        entry.user.username = "admin"
        entry.user.email = "admin@example.com"

        list_result.scalars.return_value.all.return_value = [entry]

        db.execute.side_effect = [count_result, range_result, list_result]

        response = await list_audit_logs(
            db=db,
            action=None,
            resource_type=None,
            status=None,
            user_id=None,
            search=None,
            start_date=None,
            end_date=None,
            offset=0,
            limit=50,
            _=SimpleNamespace(),
        )

        assert response.total == 2
        assert response.entries[0].action == AuditAction.UPDATE
        assert response.oldest_entry_at == oldest
        assert response.newest_entry_at == newest

    @pytest.mark.asyncio
    async def test_create_audit_log_sets_admin_context(self) -> None:
        """Should create audit log entry with admin context."""
        db = AsyncMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        payload = AuditLogCreate(
            action=AuditAction.CREATE,
            resource_type=AuditResourceType.USER,
            resource_id="user_1",
            status=AuditStatus.SUCCESS,
            description="Created user",
        )

        admin = SimpleNamespace(id=uuid4(), is_admin=True, username="admin")
        request = SimpleNamespace(
            client=SimpleNamespace(host="192.168.1.1"),
            headers={"user-agent": "pytest-agent"},
        )

        entry = await create_audit_log(
            payload=payload, request=request, db=db, admin=admin
        )

        assert entry.user_id == admin.id
        assert entry.action == payload.action.value
        assert entry.resource_type == payload.resource_type.value
        assert entry.ip_address == "192.168.1.1"
        assert entry.user_agent == "pytest-agent"

    @pytest.mark.asyncio
    async def test_audit_log_summary_counts(self) -> None:
        """Should return summary counts for audit logs."""
        db = AsyncMock()

        total_result = MagicMock()
        total_result.scalar_one.return_value = 10
        last_24h_result = MagicMock()
        last_24h_result.scalar_one.return_value = 4

        by_action_result = MagicMock()
        by_action_result.all.return_value = [
            (AuditAction.UPDATE.value, 6),
            (AuditAction.CREATE.value, 4),
        ]

        by_resource_result = MagicMock()
        by_resource_result.all.return_value = [
            (AuditResourceType.SETTINGS.value, 5),
            (AuditResourceType.USER.value, 5),
        ]

        by_status_result = MagicMock()
        by_status_result.all.return_value = [
            (AuditStatus.SUCCESS.value, 9),
            (AuditStatus.FAILURE.value, 1),
        ]

        db.execute.side_effect = [
            total_result,
            last_24h_result,
            by_action_result,
            by_resource_result,
            by_status_result,
        ]

        summary = await audit_log_summary(db=db, _=SimpleNamespace())

        assert summary.total == 10
        assert summary.last_24h == 4
        assert summary.by_action[AuditAction.UPDATE] == 6
        assert summary.by_resource_type[AuditResourceType.SETTINGS] == 5
        assert summary.by_status[AuditStatus.SUCCESS] == 9
