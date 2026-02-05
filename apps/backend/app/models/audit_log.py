"""
Admin audit log model for tracking sensitive actions.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import StrEnum
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class AuditAction(StrEnum):
    """High-level audit actions."""

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
    """Resource categories targeted by admin actions."""

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
    """Outcome status for audit entries."""

    SUCCESS = "success"
    FAILURE = "failure"
    WARNING = "warning"


class AdminAuditLog(Base):
    """Admin audit log entry."""

    __tablename__ = "admin_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    action: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
    resource_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=AuditStatus.SUCCESS.value, index=True
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    audit_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    changes: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    user: Mapped[User] = relationship("User", lazy="joined")

    __table_args__ = (
        Index("idx_admin_audit_logs_user_id", "user_id"),
        Index("idx_admin_audit_logs_created_at", "created_at"),
    )
