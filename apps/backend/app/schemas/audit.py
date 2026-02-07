"""
Schemas for admin audit log API.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AuditAction(StrEnum):
    """Audit action types."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    READ = "read"
    EXPORT = "export"
    LOGIN = "login"
    LOGOUT = "logout"
    APPROVE = "approve"
    REJECT = "reject"
    RESTORE = "restore"
    OTHER = "other"


class AuditResourceType(StrEnum):
    """Audit resource categories."""

    USER = "user"
    SETTINGS = "settings"
    MODERATION = "moderation"
    CONTENT = "content"
    SECURITY = "security"
    SYSTEM = "system"
    BILLING = "billing"
    ANALYTICS = "analytics"
    NOTIFICATION = "notification"
    OTHER = "other"


class AuditStatus(StrEnum):
    """Audit status values."""

    SUCCESS = "success"
    FAILURE = "failure"
    WARNING = "warning"


class AuditLogCreate(BaseModel):
    """Create a new audit log entry."""

    action: AuditAction
    resource_type: AuditResourceType
    resource_id: str | None = None
    status: AuditStatus = AuditStatus.SUCCESS
    description: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    metadata: dict[str, Any] | None = None
    changes: dict[str, Any] | None = None


class AuditLogEntry(BaseModel):
    """Audit log entry response."""

    id: UUID
    user_id: UUID
    action: AuditAction
    resource_type: AuditResourceType
    resource_id: str | None = None
    status: AuditStatus
    description: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    metadata: dict[str, Any] | None = Field(
        default=None, serialization_alias="metadata", validation_alias="audit_metadata"
    )
    changes: dict[str, Any] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AuditLogListResponse(BaseModel):
    """Paginated audit log response."""

    total: int
    entries: list[AuditLogEntry]
    oldest_entry_at: datetime | None = None
    newest_entry_at: datetime | None = None


class AuditLogSummary(BaseModel):
    """High-level summary for audit logs."""

    total: int
    last_24h: int
    by_action: dict[AuditAction, int] = Field(default_factory=dict)
    by_resource_type: dict[AuditResourceType, int] = Field(default_factory=dict)
    by_status: dict[AuditStatus, int] = Field(default_factory=dict)
