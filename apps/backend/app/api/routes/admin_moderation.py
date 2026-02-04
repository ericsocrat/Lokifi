"""
Admin moderation API routes.
Handles content flagging, moderation actions, and appeals.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.admin_users import require_admin
from app.db.database import get_db
from app.models.moderation import (
    AppealStatus,
    ContentType,
    FlaggedContent,
    FlagReason,
    FlagStatus,
    ModerationAction,
    ModerationAppeal,
    ModerationDecision,
)
from app.models.user import User
from app.schemas.moderation import (
    ContentTypeStatistics,
    FlaggedContentCreate,
    FlaggedContentListResponse,
    FlaggedContentResponse,
    FlaggedContentUpdate,
    FlagReasonStatistics,
    ModerationAppealCreate,
    ModerationAppealListResponse,
    ModerationAppealResponse,
    ModerationAppealUpdate,
    ModerationDecisionCreate,
    ModerationDecisionListResponse,
    ModerationDecisionResponse,
    ModerationStatistics,
)

router = APIRouter(prefix="/admin/moderation", tags=["Admin Moderation"])


# ============================================================================
# Flagged Content Endpoints
# ============================================================================


@router.post(
    "/flags", response_model=FlaggedContentResponse, status_code=status.HTTP_201_CREATED
)
async def create_flag(
    data: FlaggedContentCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> FlaggedContentResponse:
    """
    Create a new content flag/report.

    Args:
        data: Flag creation data (content type, ID, reason, description)
        current_user: Authenticated admin user
        db: Database session

    Returns:
        Created flagged content response

    Raises:
        404: If content reporter/target user not found
        409: If content already flagged
    """
    # Verify reporter exists
    reporter = current_user

    # Check if content already flagged (prevent duplicates within 24h)
    existing = await db.execute(
        select(FlaggedContent).where(
            and_(
                FlaggedContent.content_type == data.content_type,
                FlaggedContent.content_id == data.content_id,
                FlaggedContent.status.in_(
                    [FlagStatus.PENDING, FlagStatus.UNDER_REVIEW]
                ),
                FlaggedContent.created_at
                > datetime.now(timezone.utc) - timedelta(hours=24),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This content has already been flagged recently",
        )

    # Verify target user exists if provided
    if data.target_user_id:
        target_user = await db.get(User, data.target_user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user not found",
            )

    # Create flagged content record
    flagged_content = FlaggedContent(
        reporter_id=reporter.id,
        content_type=data.content_type,
        content_id=data.content_id,
        reason=data.reason,
        description=data.description,
        target_user_id=data.target_user_id,
        status=FlagStatus.PENDING,
    )

    db.add(flagged_content)
    await db.commit()
    await db.refresh(flagged_content)

    return FlaggedContentResponse.from_orm(flagged_content)


@router.get("/flags", response_model=FlaggedContentListResponse)
async def list_flags(
    status_filter: FlagStatus | None = Query(None, alias="status"),
    content_type: ContentType | None = Query(None),
    reason: FlagReason | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> FlaggedContentListResponse:
    """
    List flagged content with filtering and pagination.

    Query Parameters:
        status: Filter by status (pending, under_review, resolved, dismissed, appealed)
        content_type: Filter by content type (post, comment, profile, message, etc.)
        reason: Filter by flag reason (spam, harassment, hate_speech, etc.)
        page: Page number (1-indexed)
        page_size: Results per page (1-100)
    """
    # Build query
    query = select(FlaggedContent)

    if status_filter:
        query = query.where(FlaggedContent.status == status_filter)
    if content_type:
        query = query.where(FlaggedContent.content_type == content_type)
    if reason:
        query = query.where(FlaggedContent.reason == reason)

    # Get total count
    count_query = select(func.count()).select_from(FlaggedContent)
    if status_filter:
        count_query = count_query.where(FlaggedContent.status == status_filter)
    if content_type:
        count_query = count_query.where(FlaggedContent.content_type == content_type)
    if reason:
        count_query = count_query.where(FlaggedContent.reason == reason)

    total = await db.scalar(count_query)

    # Order by created_at (newest first) and paginate
    query = query.order_by(desc(FlaggedContent.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    return FlaggedContentListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[FlaggedContentResponse.from_orm(item) for item in items],
    )


@router.get("/flags/{flag_id}", response_model=FlaggedContentResponse)
async def get_flag(
    flag_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> FlaggedContentResponse:
    """Get a specific flagged content report."""
    flagged_content = await db.get(FlaggedContent, flag_id)
    if not flagged_content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flagged content not found",
        )

    return FlaggedContentResponse.from_orm(flagged_content)


@router.put("/flags/{flag_id}", response_model=FlaggedContentResponse)
async def update_flag(
    flag_id: UUID,
    data: FlaggedContentUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> FlaggedContentResponse:
    """Update flagged content status and notes."""
    flagged_content = await db.get(FlaggedContent, flag_id)
    if not flagged_content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flagged content not found",
        )

    if data.status is not None:
        flagged_content.status = data.status
    if data.moderation_notes is not None:
        flagged_content.moderation_notes = data.moderation_notes

    flagged_content.reviewed_by = current_user.id
    flagged_content.reviewed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(flagged_content)

    return FlaggedContentResponse.from_orm(flagged_content)


# ============================================================================
# Moderation Decision Endpoints
# ============================================================================


@router.post(
    "/flags/{flag_id}/decision",
    response_model=ModerationDecisionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_moderation_decision(
    flag_id: UUID,
    data: ModerationDecisionCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ModerationDecisionResponse:
    """
    Create a moderation decision for a flagged content.

    Args:
        flag_id: ID of the flagged content
        data: Decision data (action, reasoning, suspension days)
        current_user: Moderator admin user
        db: Database session

    Returns:
        Created moderation decision

    Raises:
        404: If flagged content not found
        409: If decision already exists for this flag
    """
    # Get flagged content
    flagged_content = await db.get(FlaggedContent, flag_id)
    if not flagged_content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flagged content not found",
        )

    # Check if decision already exists
    existing = await db.execute(
        select(ModerationDecision).where(
            ModerationDecision.flagged_content_id == flag_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A decision already exists for this flagged content",
        )

    # Create decision
    decision = ModerationDecision(
        flagged_content_id=flag_id,
        decided_by=current_user.id,
        action=data.action,
        reasoning=data.reasoning,
        suspension_days=data.suspension_days,
        is_appealable=data.is_appealable,
    )

    # Update flag status
    flagged_content.status = FlagStatus.RESOLVED
    flagged_content.reviewed_by = current_user.id
    flagged_content.reviewed_at = datetime.now(timezone.utc)

    db.add(decision)
    await db.commit()
    await db.refresh(decision)

    return ModerationDecisionResponse.from_orm(decision)


@router.get("/decisions", response_model=ModerationDecisionListResponse)
async def list_decisions(
    action: ModerationAction | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ModerationDecisionListResponse:
    """List moderation decisions with pagination."""
    query = select(ModerationDecision)

    if action:
        query = query.where(ModerationDecision.action == action)

    # Get total count
    count_query = select(func.count()).select_from(ModerationDecision)
    if action:
        count_query = count_query.where(ModerationDecision.action == action)

    total = await db.scalar(count_query)

    # Order and paginate
    query = query.order_by(desc(ModerationDecision.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    return ModerationDecisionListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[ModerationDecisionResponse.from_orm(item) for item in items],
    )


# ============================================================================
# Appeal Endpoints
# ============================================================================


@router.post(
    "/decisions/{decision_id}/appeal",
    response_model=ModerationAppealResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_appeal(
    decision_id: UUID,
    data: ModerationAppealCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ModerationAppealResponse:
    """
    Create an appeal for a moderation decision.

    Args:
        decision_id: ID of the moderation decision
        data: Appeal data (reason)
        current_user: Appellant user
        db: Database session

    Returns:
        Created appeal

    Raises:
        404: If decision not found
        403: If decision is not appealable
        409: If appeal already exists
    """
    # Get decision
    decision = await db.get(ModerationDecision, decision_id)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Moderation decision not found",
        )

    # Check if appealable
    if not decision.is_appealable:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This decision cannot be appealed",
        )

    # Check for existing appeal
    existing = await db.execute(
        select(ModerationAppeal).where(
            ModerationAppeal.decision_id == decision_id,
            ModerationAppeal.status.in_([AppealStatus.PENDING, AppealStatus.APPROVED]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active appeal already exists for this decision",
        )

    # Create appeal
    appeal = ModerationAppeal(
        decision_id=decision_id,
        appellant_id=current_user.id,
        reason=data.reason,
        status=AppealStatus.PENDING,
    )

    db.add(appeal)

    # Update flagged content status
    flagged = await db.get(FlaggedContent, decision.flagged_content_id)
    if flagged:
        flagged.status = FlagStatus.APPEALED

    await db.commit()
    await db.refresh(appeal)

    return ModerationAppealResponse.from_orm(appeal)


@router.get("/appeals", response_model=ModerationAppealListResponse)
async def list_appeals(
    status_filter: AppealStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ModerationAppealListResponse:
    """List moderation appeals with filtering and pagination."""
    query = select(ModerationAppeal)

    if status_filter:
        query = query.where(ModerationAppeal.status == status_filter)

    # Get total count
    count_query = select(func.count()).select_from(ModerationAppeal)
    if status_filter:
        count_query = count_query.where(ModerationAppeal.status == status_filter)

    total = await db.scalar(count_query)

    # Order and paginate
    query = query.order_by(desc(ModerationAppeal.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    return ModerationAppealListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[ModerationAppealResponse.from_orm(item) for item in items],
    )


@router.put("/appeals/{appeal_id}", response_model=ModerationAppealResponse)
async def review_appeal(
    appeal_id: UUID,
    data: ModerationAppealUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ModerationAppealResponse:
    """Review and update an appeal status."""
    appeal = await db.get(ModerationAppeal, appeal_id)
    if not appeal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appeal not found",
        )

    if data.status is not None:
        appeal.status = data.status
    if data.review_notes is not None:
        appeal.review_notes = data.review_notes

    appeal.reviewed_by = current_user.id
    appeal.reviewed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(appeal)

    return ModerationAppealResponse.from_orm(appeal)


# ============================================================================
# Statistics Endpoints
# ============================================================================


@router.get("/statistics", response_model=ModerationStatistics)
async def get_moderation_statistics(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ModerationStatistics:
    """Get overall moderation statistics."""
    # Count flags by status
    total_flags = await db.scalar(select(func.count()).select_from(FlaggedContent))
    pending_flags = await db.scalar(
        select(func.count())
        .select_from(FlaggedContent)
        .where(FlaggedContent.status == FlagStatus.PENDING)
    )
    under_review = await db.scalar(
        select(func.count())
        .select_from(FlaggedContent)
        .where(FlaggedContent.status == FlagStatus.UNDER_REVIEW)
    )
    resolved = await db.scalar(
        select(func.count())
        .select_from(FlaggedContent)
        .where(FlaggedContent.status == FlagStatus.RESOLVED)
    )
    dismissed = await db.scalar(
        select(func.count())
        .select_from(FlaggedContent)
        .where(FlaggedContent.status == FlagStatus.DISMISSED)
    )

    # Count decisions by action
    total_decisions = await db.scalar(
        select(func.count()).select_from(ModerationDecision)
    )
    no_action = await db.scalar(
        select(func.count())
        .select_from(ModerationDecision)
        .where(ModerationDecision.action == ModerationAction.NO_ACTION)
    )
    warning = await db.scalar(
        select(func.count())
        .select_from(ModerationDecision)
        .where(ModerationDecision.action == ModerationAction.WARNING)
    )
    removal = await db.scalar(
        select(func.count())
        .select_from(ModerationDecision)
        .where(ModerationDecision.action == ModerationAction.REMOVE_CONTENT)
    )
    suspension = await db.scalar(
        select(func.count())
        .select_from(ModerationDecision)
        .where(
            ModerationDecision.action.in_(
                [ModerationAction.SUSPEND_TEMPORARY, ModerationAction.SUSPEND_PERMANENT]
            )
        )
    )
    ban = await db.scalar(
        select(func.count())
        .select_from(ModerationDecision)
        .where(ModerationDecision.action == ModerationAction.BAN)
    )

    # Count appeals
    total_appeals = await db.scalar(select(func.count()).select_from(ModerationAppeal))
    pending_appeals = await db.scalar(
        select(func.count())
        .select_from(ModerationAppeal)
        .where(ModerationAppeal.status == AppealStatus.PENDING)
    )
    approved_appeals = await db.scalar(
        select(func.count())
        .select_from(ModerationAppeal)
        .where(ModerationAppeal.status == AppealStatus.APPROVED)
    )
    rejected_appeals = await db.scalar(
        select(func.count())
        .select_from(ModerationAppeal)
        .where(ModerationAppeal.status == AppealStatus.REJECTED)
    )

    # Calculate average review time (resolved flags only)
    avg_review_time = await db.scalar(
        select(func.avg(FlaggedContent.reviewed_at - FlaggedContent.created_at))
        .select_from(FlaggedContent)
        .where(FlaggedContent.reviewed_at.isnot(None))
    )

    average_review_time_hours = None
    if avg_review_time:
        average_review_time_hours = avg_review_time.total_seconds() / 3600

    return ModerationStatistics(
        total_flags=total_flags or 0,
        pending_flags=pending_flags or 0,
        under_review_flags=under_review or 0,
        resolved_flags=resolved or 0,
        dismissed_flags=dismissed or 0,
        total_decisions=total_decisions or 0,
        no_action_count=no_action or 0,
        warning_count=warning or 0,
        content_removal_count=removal or 0,
        suspension_count=suspension or 0,
        ban_count=ban or 0,
        total_appeals=total_appeals or 0,
        pending_appeals=pending_appeals or 0,
        approved_appeals=approved_appeals or 0,
        rejected_appeals=rejected_appeals or 0,
        average_review_time_hours=average_review_time_hours,
    )


@router.get("/statistics/by-content-type", response_model=list[ContentTypeStatistics])
async def get_content_type_statistics(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[ContentTypeStatistics]:
    """Get moderation statistics by content type."""
    result = await db.execute(
        select(
            FlaggedContent.content_type,
            func.count().label("total"),
            func.sum((FlaggedContent.status == FlagStatus.PENDING).cast(int)).label(
                "pending"
            ),
            func.sum((FlaggedContent.status == FlagStatus.RESOLVED).cast(int)).label(
                "resolved"
            ),
        ).group_by(FlaggedContent.content_type)
    )

    rows = result.all()
    return [
        ContentTypeStatistics(
            content_type=row[0],
            total_flags=row[1],
            pending_flags=row[2] or 0,
            resolved_flags=row[3] or 0,
        )
        for row in rows
    ]


@router.get("/statistics/by-reason", response_model=list[FlagReasonStatistics])
async def get_reason_statistics(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[FlagReasonStatistics]:
    """Get moderation statistics by flag reason."""
    total_flags = await db.scalar(select(func.count()).select_from(FlaggedContent))

    result = await db.execute(
        select(
            FlaggedContent.reason,
            func.count().label("count"),
        )
        .group_by(FlaggedContent.reason)
        .order_by(desc(func.count()))
    )

    rows = result.all()
    return [
        FlagReasonStatistics(
            reason=row[0],
            total_flags=row[1],
            percentage=(row[1] / total_flags * 100) if total_flags else 0,
        )
        for row in rows
    ]
