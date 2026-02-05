"""
System Settings Models

Stores platform-wide configuration including site settings, feature flags,
and maintenance mode status. Single row per setting for simplicity.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, Boolean, Column, DateTime, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class SystemSettings(Base):
    """System-wide settings and configuration.

    Single row table (enforced in API layer).
    """

    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Site Information
    site_name: Mapped[str] = mapped_column(String(255), default="Lokifi")
    site_description: Mapped[str] = mapped_column(Text, default="Financial platform")
    site_domain: Mapped[str] = mapped_column(String(255), default="lokifi.com")
    site_logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Email Configuration
    email_from_address: Mapped[str] = mapped_column(
        String(255), default="noreply@lokifi.com"
    )
    email_from_name: Mapped[str] = mapped_column(String(255), default="Lokifi")
    email_smtp_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_smtp_port: Mapped[int | None] = mapped_column(nullable=True)
    email_smtp_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # email_smtp_password stored separately in environment

    # Maintenance Mode
    maintenance_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    maintenance_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    maintenance_allowed_ips: Mapped[str] = mapped_column(
        Text, default=""
    )  # Comma-separated IPs

    # Rate Limiting
    rate_limit_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    rate_limit_requests: Mapped[int] = mapped_column(default=100)  # requests
    rate_limit_window: Mapped[int] = mapped_column(default=3600)  # seconds

    # Security Settings
    session_timeout_minutes: Mapped[int] = mapped_column(default=30)
    require_email_verification: Mapped[bool] = mapped_column(default=True)
    password_min_length: Mapped[int] = mapped_column(default=8)
    max_login_attempts: Mapped[int] = mapped_column(default=5)
    lockout_duration_minutes: Mapped[int] = mapped_column(default=15)

    # API Settings
    api_key_expiration_days: Mapped[int] = mapped_column(default=365)
    cors_allowed_origins: Mapped[str] = mapped_column(
        Text, default="*"
    )  # Comma-separated

    # Feature Flags (JSON for flexibility)
    feature_flags: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        default={
            "user_registration": True,
            "portfolio_management": True,
            "social_features": True,
            "ai_features": True,
            "advanced_analytics": True,
            "api_access": True,
        },
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True
    )
    updated_by: Mapped[int | None] = mapped_column(
        nullable=True
    )  # User ID who made the change

    def __repr__(self) -> str:
        return f"<SystemSettings(site_name={self.site_name}, maintenance_mode={self.maintenance_mode})>"


class FeatureFlagEnum(StrEnum):
    """Available feature flags."""

    USER_REGISTRATION = "user_registration"
    PORTFOLIO_MANAGEMENT = "portfolio_management"
    SOCIAL_FEATURES = "social_features"
    AI_FEATURES = "ai_features"
    ADVANCED_ANALYTICS = "advanced_analytics"
    API_ACCESS = "api_access"
