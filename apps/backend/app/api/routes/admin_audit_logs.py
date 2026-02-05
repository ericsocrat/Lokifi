"""
Admin Audit Logs Routes

Endpoints for viewing and creating admin audit log entries.
Only accessible to admin users.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.audit_log import AdminAuditLog
from app.models.user import User
from app.schemas.audit import (
    AuditAction,
    AuditLogCreate,
    AuditLogEntry,
    AuditLogListResponse,
    AuditLogSummary,
    AuditResourceType,
    AuditStatus,
)

router = APIRouter(prefix="/admin/audit-logs", tags=["admin-audit-logs"])
logger = logging.getLogger(__name__)


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: Require admin privileges."""
    if not current_user.is_admin:
        logger.warning(
            "Unauthorized audit log access attempt",
            extra={"user_id": str(current_user.id), "username": current_user.username},
        )
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _build_audit_filters(
    action: AuditAction | None,
    resource_type: AuditResourceType | None,
    status: AuditStatus | None,
    user_id: UUID | None,
    search: str | None,
    start_date: datetime | None,
    end_date: datetime | None,
) -> list[Any]:
    filters: list[Any] = []

    if action:
        filters.append(AdminAuditLog.action == action.value)
    if resource_type:
        filters.append(AdminAuditLog.resource_type == resource_type.value)
    if status:
        filters.append(AdminAuditLog.status == status.value)
    if user_id:
        filters.append(AdminAuditLog.user_id == user_id)
    if start_date:
        filters.append(AdminAuditLog.created_at >= start_date)
    if end_date:
        filters.append(AdminAuditLog.created_at <= end_date)
    if search:
        search_term = f"%{search}%"
        filters.append(
            or_(
                AdminAuditLog.description.ilike(search_term),
                AdminAuditLog.resource_id.ilike(search_term),
            )
        )

    return filters


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    action: AuditAction | None = None,
    resource_type: AuditResourceType | None = None,
    status: AuditStatus | None = None,
    user_id: UUID | None = None,
    search: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: Any = Depends(require_admin),
) -> AuditLogListResponse:
    """List audit log entries with filtering and pagination."""
    try:
        filters = _build_audit_filters(
            action, resource_type, status, user_id, search, start_date, end_date
        )

        base_query = select(AdminAuditLog).where(*filters)
        count_query = select(func.count()).select_from(AdminAuditLog).where(*filters)
        range_query = (
            select(
                func.min(AdminAuditLog.created_at), func.max(AdminAuditLog.created_at)
            )
            .select_from(AdminAuditLog)
            .where(*filters)
        )

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        range_result = await db.execute(range_query)
        oldest_entry_at, newest_entry_at = range_result.one()

        result = await db.execute(
            base_query.order_by(AdminAuditLog.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        entries = result.scalars().all()

        return AuditLogListResponse(
            total=total,
            entries=entries,
            oldest_entry_at=oldest_entry_at,
            newest_entry_at=newest_entry_at,
        )
    except Exception as e:
        logger.error("Failed to list audit logs", extra={"error": str(e)})
        raise HTTPException(
            status_code=500, detail="Failed to retrieve audit logs"
        ) from e


@router.post("", response_model=AuditLogEntry)
async def create_audit_log(
    payload: AuditLogCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AuditLogEntry:
    """Create an audit log entry for an admin action."""
    try:
        ip_address = payload.ip_address
        if not ip_address and request.client:
            ip_address = request.client.host

        user_agent = payload.user_agent or request.headers.get("user-agent")

        entry = AdminAuditLog(
            user_id=admin.id,
            action=payload.action.value,
            resource_type=payload.resource_type.value,
            resource_id=payload.resource_id,
            status=payload.status.value,
            description=payload.description,
            ip_address=ip_address,
            user_agent=user_agent,
            audit_metadata=payload.metadata,
            changes=payload.changes,
        )

        db.add(entry)
        await db.commit()
        await db.refresh(entry)

        logger.info(
            "Admin audit log created",
            extra={
                "admin_id": str(admin.id),
                "action": payload.action.value,
                "resource_type": payload.resource_type.value,
                "status": payload.status.value,
            },
        )

        return entry
    except Exception as e:
        await db.rollback()
        logger.error("Failed to create audit log", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to create audit log") from e


@router.get("/summary", response_model=AuditLogSummary)
async def audit_log_summary(
    db: AsyncSession = Depends(get_db),
    _: Any = Depends(require_admin),
) -> AuditLogSummary:
    """Get summary counts for audit logs."""
    try:
        total_result = await db.execute(select(func.count()).select_from(AdminAuditLog))
        total = total_result.scalar_one()

        last_24h_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        last_24h_result = await db.execute(
            select(func.count())
            .select_from(AdminAuditLog)
            .where(AdminAuditLog.created_at >= last_24h_cutoff)
        )
        last_24h = last_24h_result.scalar_one()

        action_counts_result = await db.execute(
            select(AdminAuditLog.action, func.count()).group_by(AdminAuditLog.action)
        )
        by_action = {
            AuditAction(action): count
            for action, count in action_counts_result.all()
            if action is not None
        }

        resource_counts_result = await db.execute(
            select(AdminAuditLog.resource_type, func.count()).group_by(
                AdminAuditLog.resource_type
            )
        )
        by_resource_type = {
            AuditResourceType(resource): count
            for resource, count in resource_counts_result.all()
            if resource is not None
        }

        status_counts_result = await db.execute(
            select(AdminAuditLog.status, func.count()).group_by(AdminAuditLog.status)
        )
        by_status = {
            AuditStatus(status): count
            for status, count in status_counts_result.all()
            if status is not None
        }

        return AuditLogSummary(
            total=total,
            last_24h=last_24h,
            by_action=by_action,
            by_resource_type=by_resource_type,
            by_status=by_status,
        )
    except Exception as e:
        logger.error("Failed to summarize audit logs", extra={"error": str(e)})
        raise HTTPException(
            status_code=500, detail="Failed to retrieve audit log summary"
        ) from e
