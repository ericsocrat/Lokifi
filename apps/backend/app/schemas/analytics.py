"""
Analytics schemas for admin dashboard metrics and insights.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class MetricPeriod(StrEnum):
    """Time period for metrics aggregation."""

    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"
    ALL_TIME = "all_time"


class TrendDirection(StrEnum):
    """Trend direction for metric changes."""

    UP = "up"
    DOWN = "down"
    STABLE = "stable"


# ============================================================================
# User Analytics Schemas
# ============================================================================


class UserGrowthMetrics(BaseModel):
    """User growth and registration metrics."""

    model_config = ConfigDict(from_attributes=True)

    total_users: int = Field(..., description="Total number of users")
    active_users: int = Field(..., description="Number of active users")
    verified_users: int = Field(..., description="Number of verified users")
    new_users_today: int = Field(..., description="New registrations today")
    new_users_week: int = Field(..., description="New registrations this week")
    new_users_month: int = Field(..., description="New registrations this month")
    growth_rate: float = Field(..., description="User growth rate percentage")
    trend: TrendDirection = Field(..., description="Growth trend direction")


class UserActivityMetrics(BaseModel):
    """User activity and engagement metrics."""

    model_config = ConfigDict(from_attributes=True)

    daily_active_users: int = Field(..., description="Users active in last 24 hours")
    weekly_active_users: int = Field(..., description="Users active in last 7 days")
    monthly_active_users: int = Field(..., description="Users active in last 30 days")
    avg_session_duration: float = Field(
        ..., description="Average session duration in minutes"
    )
    avg_sessions_per_user: float = Field(..., description="Average sessions per user")
    retention_rate: float = Field(..., description="User retention rate percentage")


class UserDemographics(BaseModel):
    """User demographic distribution."""

    model_config = ConfigDict(from_attributes=True)

    by_timezone: dict[str, int] = Field(..., description="Users by timezone")
    by_language: dict[str, int] = Field(..., description="Users by language")
    by_verification_status: dict[str, int] = Field(
        ..., description="Users by verification status"
    )
    by_account_status: dict[str, int] = Field(
        ..., description="Users by account status"
    )


# ============================================================================
# Content Analytics Schemas
# ============================================================================


class ContentMetrics(BaseModel):
    """Content creation and moderation metrics."""

    model_config = ConfigDict(from_attributes=True)

    total_posts: int = Field(..., description="Total number of posts")
    total_comments: int = Field(..., description="Total number of comments")
    total_reactions: int = Field(..., description="Total number of reactions")
    posts_today: int = Field(..., description="Posts created today")
    posts_week: int = Field(..., description="Posts created this week")
    posts_month: int = Field(..., description="Posts created this month")
    avg_posts_per_user: float = Field(..., description="Average posts per user")
    content_growth_rate: float = Field(
        ..., description="Content growth rate percentage"
    )


class ModerationMetrics(BaseModel):
    """Content moderation activity metrics."""

    model_config = ConfigDict(from_attributes=True)

    total_flags: int = Field(..., description="Total flagged content reports")
    pending_flags: int = Field(..., description="Flags awaiting review")
    resolved_flags: int = Field(..., description="Resolved flags")
    dismissed_flags: int = Field(..., description="Dismissed flags")
    appealed_flags: int = Field(..., description="Flags under appeal")
    avg_resolution_time: float = Field(
        ..., description="Average resolution time in hours"
    )
    flags_by_reason: dict[str, int] = Field(..., description="Flags by reason")
    flags_by_status: dict[str, int] = Field(..., description="Flags by status")
    actions_by_type: dict[str, int] = Field(..., description="Actions by type")


# ============================================================================
# Social Analytics Schemas
# ============================================================================


class SocialMetrics(BaseModel):
    """Social interaction and engagement metrics."""

    model_config = ConfigDict(from_attributes=True)

    total_follows: int = Field(..., description="Total follow relationships")
    total_conversations: int = Field(..., description="Total conversations")
    total_messages: int = Field(..., description="Total messages sent")
    avg_followers_per_user: float = Field(..., description="Average followers per user")
    avg_following_per_user: float = Field(..., description="Average following per user")
    messages_today: int = Field(..., description="Messages sent today")
    messages_week: int = Field(..., description="Messages sent this week")
    conversations_today: int = Field(..., description="Conversations started today")
    engagement_rate: float = Field(
        ..., description="Overall engagement rate percentage"
    )


# ============================================================================
# AI Analytics Schemas
# ============================================================================


class AIMetrics(BaseModel):
    """AI usage and performance metrics."""

    model_config = ConfigDict(from_attributes=True)

    total_threads: int = Field(..., description="Total AI conversation threads")
    active_threads: int = Field(..., description="Currently active AI threads")
    total_messages: int = Field(..., description="Total AI messages")
    threads_today: int = Field(..., description="Threads created today")
    threads_week: int = Field(..., description="Threads created this week")
    avg_messages_per_thread: float = Field(
        ..., description="Average messages per thread"
    )
    avg_response_time: float = Field(
        ..., description="Average AI response time in seconds"
    )
    usage_by_provider: dict[str, int] = Field(..., description="Usage by AI provider")


# ============================================================================
# Time Series Schemas
# ============================================================================


class TimeSeriesDataPoint(BaseModel):
    """Single data point in a time series."""

    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime = Field(..., description="Timestamp of the data point")
    value: int | float = Field(..., description="Metric value at this timestamp")
    label: str | None = Field(None, description="Optional label for the data point")


class TimeSeriesMetrics(BaseModel):
    """Time series data for trend analysis."""

    model_config = ConfigDict(from_attributes=True)

    metric_name: str = Field(..., description="Name of the metric")
    period: MetricPeriod = Field(..., description="Time period for aggregation")
    data_points: list[TimeSeriesDataPoint] = Field(..., description="Time series data")
    total: int | float = Field(..., description="Total value across all data points")
    average: float = Field(..., description="Average value")
    peak: int | float = Field(..., description="Peak value")
    trend: TrendDirection = Field(..., description="Overall trend direction")


# ============================================================================
# Dashboard Overview Schema
# ============================================================================


class DashboardOverview(BaseModel):
    """Complete analytics dashboard overview."""

    model_config = ConfigDict(from_attributes=True)

    user_growth: UserGrowthMetrics = Field(..., description="User growth metrics")
    user_activity: UserActivityMetrics = Field(..., description="User activity metrics")
    content: ContentMetrics = Field(..., description="Content creation metrics")
    moderation: ModerationMetrics = Field(..., description="Moderation metrics")
    social: SocialMetrics = Field(..., description="Social interaction metrics")
    ai: AIMetrics = Field(..., description="AI usage metrics")
    generated_at: datetime = Field(..., description="When these metrics were generated")


# ============================================================================
# Analytics Request Schemas
# ============================================================================


class AnalyticsDateRange(BaseModel):
    """Date range filter for analytics queries."""

    model_config = ConfigDict(from_attributes=True)

    start_date: datetime = Field(..., description="Start date for the range")
    end_date: datetime = Field(..., description="End date for the range")
    period: MetricPeriod = Field(
        default=MetricPeriod.DAY, description="Aggregation period"
    )


class AnalyticsQuery(BaseModel):
    """Query parameters for analytics endpoints."""

    model_config = ConfigDict(from_attributes=True)

    date_range: AnalyticsDateRange | None = Field(
        None, description="Optional date range filter"
    )
    metric_names: list[str] | None = Field(
        None, description="Specific metrics to retrieve"
    )
    include_timeseries: bool = Field(
        default=False, description="Include time series data"
    )
    group_by: str | None = Field(None, description="Group results by field")
