"""
System Settings Schemas

Pydantic models for system settings API requests and responses.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class FeatureFlagsUpdate(BaseModel):
    """Feature flags update payload."""

    user_registration: bool | None = None
    portfolio_management: bool | None = None
    social_features: bool | None = None
    ai_features: bool | None = None
    advanced_analytics: bool | None = None
    api_access: bool | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_registration": True,
                "portfolio_management": True,
                "social_features": False,
            }
        }
    )


class SystemSettingsResponse(BaseModel):
    """System settings response model."""

    id: int
    site_name: str
    site_description: str
    site_domain: str
    site_logo_url: str | None = None
    email_from_address: str
    email_from_name: str
    email_smtp_host: str | None = None
    email_smtp_port: int | None = None
    email_smtp_username: str | None = None
    maintenance_mode: bool
    maintenance_message: str | None = None
    rate_limit_enabled: bool
    rate_limit_requests: int
    rate_limit_window: int
    session_timeout_minutes: int
    require_email_verification: bool
    password_min_length: int
    max_login_attempts: int
    lockout_duration_minutes: int
    api_key_expiration_days: int
    cors_allowed_origins: str
    feature_flags: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemSettingsUpdate(BaseModel):
    """Update system settings."""

    site_name: str | None = Field(None, min_length=1, max_length=255)
    site_description: str | None = Field(None, max_length=1000)
    site_domain: str | None = Field(None, min_length=1, max_length=255)
    site_logo_url: str | None = Field(None, max_length=500)
    email_from_address: EmailStr | None = None
    email_from_name: str | None = Field(None, min_length=1, max_length=255)
    email_smtp_host: str | None = Field(None, max_length=255)
    email_smtp_port: int | None = Field(None, ge=1, le=65535)
    email_smtp_username: str | None = Field(None, max_length=255)
    maintenance_mode: bool | None = None
    maintenance_message: str | None = None
    maintenance_allowed_ips: str | None = None
    rate_limit_enabled: bool | None = None
    rate_limit_requests: int | None = Field(None, ge=1, le=10000)
    rate_limit_window: int | None = Field(None, ge=1, le=86400)
    session_timeout_minutes: int | None = Field(None, ge=5, le=1440)
    require_email_verification: bool | None = None
    password_min_length: int | None = Field(None, ge=6, le=64)
    max_login_attempts: int | None = Field(None, ge=1, le=100)
    lockout_duration_minutes: int | None = Field(None, ge=1, le=1440)
    api_key_expiration_days: int | None = Field(None, ge=1, le=3650)
    cors_allowed_origins: str | None = None
    feature_flags: FeatureFlagsUpdate | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "site_name": "Lokifi Pro",
                "maintenance_mode": False,
                "rate_limit_requests": 200,
            }
        }
    )


class SettingsAuditEntry(BaseModel):
    """Record of a settings change."""

    id: int
    user_id: int
    setting_name: str
    old_value: str | None = None
    new_value: str
    change_reason: str | None = None
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SettingsAuditResponse(BaseModel):
    """Settings audit history response."""

    total: int
    entries: list[SettingsAuditEntry]
    oldest_change_at: datetime | None = None
    newest_change_at: datetime | None = None


class SystemHealthCheck(BaseModel):
    """Health check response including settings status."""

    is_healthy: bool
    maintenance_mode_active: bool
    message: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class SettingsValidationResponse(BaseModel):
    """Validation results for settings changes."""

    is_valid: bool
    errors: dict[str, str] = Field(default_factory=dict)
    warnings: dict[str, str] = Field(default_factory=dict)
    updated_at: datetime
