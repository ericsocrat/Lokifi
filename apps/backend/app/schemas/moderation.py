"""
Pydantic schemas for content moderation API.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.moderation import (
    AppealStatus,
    ContentType,
    FlagReason,
    FlagStatus,
    ModerationAction,
)

# ============================================================================
# FlaggedContent Schemas
# ============================================================================


class FlaggedContentBase(BaseModel):
    """Base schema for flagged content."""

    content_type: ContentType
    content_id: str = Field(..., min_length=1, max_length=255)
    reason: FlagReason
    description: str | None = Field(None, max_length=5000)
    target_user_id: UUID | None = None


class FlaggedContentCreate(FlaggedContentBase):
    """Schema for creating flagged content reports."""

    pass


class FlaggedContentUpdate(BaseModel):
    """Schema for updating flagged content status."""

    status: FlagStatus | None = None
    moderation_notes: str | None = Field(None, max_length=5000)


class FlaggedContentResponse(FlaggedContentBase):
    """Schema for flagged content response."""

    id: UUID
    reporter_id: UUID
    status: FlagStatus
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    moderation_notes: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FlaggedContentListResponse(BaseModel):
    """Schema for list of flagged content."""

    total: int
    page: int
    page_size: int
    items: list[FlaggedContentResponse]


# ============================================================================
# ModerationDecision Schemas
# ============================================================================


class ModerationDecisionCreate(BaseModel):
    """Schema for creating moderation decisions."""

    action: ModerationAction
    reasoning: str | None = Field(None, max_length=5000)
    suspension_days: int | None = Field(None, ge=1, le=365)
    is_appealable: bool = True


class ModerationDecisionResponse(BaseModel):
    """Schema for moderation decision response."""

    id: UUID
    flagged_content_id: UUID
    decided_by: UUID
    action: ModerationAction
    reasoning: str | None = None
    suspension_days: int | None = None
    is_appealable: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ModerationDecisionListResponse(BaseModel):
    """Schema for list of moderation decisions."""

    total: int
    page: int
    page_size: int
    items: list[ModerationDecisionResponse]


# ============================================================================
# ModerationAppeal Schemas
# ============================================================================


class ModerationAppealCreate(BaseModel):
    """Schema for creating moderation appeals."""

    reason: str = Field(..., min_length=10, max_length=5000)


class ModerationAppealUpdate(BaseModel):
    """Schema for updating moderation appeals."""

    status: AppealStatus | None = None
    review_notes: str | None = Field(None, max_length=5000)


class ModerationAppealResponse(BaseModel):
    """Schema for moderation appeal response."""

    id: UUID
    decision_id: UUID
    appellant_id: UUID
    reason: str
    status: AppealStatus
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ModerationAppealListResponse(BaseModel):
    """Schema for list of moderation appeals."""

    total: int
    page: int
    page_size: int
    items: list[ModerationAppealResponse]


# ============================================================================
# Statistics Schemas
# ============================================================================


class ModerationStatistics(BaseModel):
    """Schema for moderation statistics."""

    total_flags: int
    pending_flags: int
    under_review_flags: int
    resolved_flags: int
    dismissed_flags: int

    total_decisions: int
    no_action_count: int
    warning_count: int
    content_removal_count: int
    suspension_count: int
    ban_count: int

    total_appeals: int
    pending_appeals: int
    approved_appeals: int
    rejected_appeals: int

    average_review_time_hours: float | None = None


class ContentTypeStatistics(BaseModel):
    """Schema for statistics by content type."""

    content_type: ContentType
    total_flags: int
    pending_flags: int
    resolved_flags: int


class FlagReasonStatistics(BaseModel):
    """Schema for statistics by flag reason."""

    reason: FlagReason
    total_flags: int
    percentage: float
