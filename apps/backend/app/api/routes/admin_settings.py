"""
Admin System Settings Routes

Endpoints for managing platform-wide settings, feature flags, and configuration.
Only accessible to admin users.
"""

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.settings import FeatureFlagEnum, SystemSettings
from app.models.user import User
from app.schemas.settings import (
    SettingsValidationResponse,
    SystemHealthCheck,
    SystemSettingsResponse,
    SystemSettingsUpdate,
)

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])
logger = logging.getLogger(__name__)


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: Require admin privileges."""
    if not current_user.is_admin:
        logger.warning(
            "Unauthorized settings access attempt",
            extra={"user_id": str(current_user.id), "username": current_user.username},
        )
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def get_or_create_settings(db: AsyncSession) -> SystemSettings:
    """Get or create default system settings."""
    try:
        result = await db.execute(select(SystemSettings).limit(1))
        settings = result.scalar_one_or_none()

        if not settings:
            # Create default settings
            settings = SystemSettings()
            db.add(settings)
            await db.flush()
            logger.info("Created default system settings")

        return settings
    except Exception as e:
        logger.error("Error retrieving system settings", extra={"error": str(e)})
        raise HTTPException(
            status_code=500, detail="Failed to retrieve settings"
        ) from e


@router.get("", response_model=SystemSettingsResponse)
async def get_system_settings(
    db: AsyncSession = Depends(get_db),
    _: Any = Depends(require_admin),
) -> SystemSettingsResponse:
    """Get current system settings.

    Returns all platform configuration, feature flags, and security settings.
    """
    try:
        settings = await get_or_create_settings(db)
        logger.info("System settings retrieved")
        return settings
    except Exception as e:
        logger.error("Error retrieving system settings", extra={"error": str(e)})
        raise HTTPException(
            status_code=500, detail="Failed to retrieve settings"
        ) from e


@router.patch("", response_model=SystemSettingsResponse)
async def update_system_settings(
    update_data: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SystemSettingsResponse:
    """Update system settings.

    Only admin users can modify settings. Changes are applied immediately.
    """
    try:
        settings = await get_or_create_settings(db)

        # Update fields (only non-None values)
        update_dict = update_data.model_dump(
            exclude_none=True, exclude={"feature_flags"}
        )

        for key, value in update_dict.items():
            if hasattr(settings, key):
                setattr(settings, key, value)

        # Handle feature flags separately
        if update_data.feature_flags:
            flags_update = update_data.feature_flags.model_dump(exclude_none=True)
            settings.feature_flags.update(flags_update)

        settings.updated_at = datetime.utcnow()
        settings.updated_by = admin.id

        await db.commit()
        await db.refresh(settings)

        logger.info(
            "System settings updated",
            extra={
                "admin_id": str(admin.id),
                "admin_username": admin.username,
                "fields_changed": list(update_dict.keys()),
            },
        )

        return settings
    except Exception as e:
        await db.rollback()
        logger.error(
            "Error updating system settings",
            extra={
                "error": str(e),
                "admin_id": str(admin.id),
            },
        )
        raise HTTPException(status_code=500, detail="Failed to update settings") from e


@router.post("/validate", response_model=SettingsValidationResponse)
async def validate_settings(
    update_data: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SettingsValidationResponse:
    """Validate settings changes without applying them.

    Useful for preview before saving.
    """
    errors = {}
    warnings = {}

    try:
        # Validate email configuration if provided
        if update_data.email_smtp_host and update_data.email_smtp_port is None:
            warnings["email_smtp_port"] = "SMTP port not specified, using default 587"

        if update_data.email_smtp_port and not update_data.email_smtp_host:
            errors["email_smtp_host"] = "SMTP host required when port is specified"

        # Validate IP whitelist format
        if update_data.maintenance_allowed_ips:
            ips = [ip.strip() for ip in update_data.maintenance_allowed_ips.split(",")]
            for ip in ips:
                if ip and not _is_valid_ip_or_cidr(ip):
                    errors[f"maintenance_allowed_ips[{ip}]"] = (
                        f"Invalid IP format: {ip}"
                    )

        # Validate CORS origins
        if update_data.cors_allowed_origins:
            origins = [o.strip() for o in update_data.cors_allowed_origins.split(",")]
            for origin in origins:
                if origin and not origin.startswith(("http://", "https://", "*")):
                    errors[f"cors_allowed_origins[{origin}]"] = (
                        f"Invalid origin: {origin}"
                    )

        logger.info(
            "Settings validation completed",
            extra={
                "admin_id": str(admin.id),
                "is_valid": len(errors) == 0,
                "error_count": len(errors),
                "warning_count": len(warnings),
            },
        )

        return SettingsValidationResponse(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            updated_at=datetime.utcnow(),
        )
    except Exception as e:
        logger.error("Error validating settings", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Validation failed") from e


@router.post("/maintenance-mode/{enabled}", response_model=SystemSettingsResponse)
async def toggle_maintenance_mode(
    enabled: bool,
    message: str = "System maintenance in progress. We'll be back shortly.",
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SystemSettingsResponse:
    """Enable or disable maintenance mode.

    Quick endpoint for toggling maintenance mode without updating other settings.
    """
    try:
        settings = await get_or_create_settings(db)
        settings.maintenance_mode = enabled
        settings.maintenance_message = message if enabled else None
        settings.updated_at = datetime.utcnow()
        settings.updated_by = admin.id

        await db.commit()
        await db.refresh(settings)

        logger.info(
            "Maintenance mode toggled",
            extra={
                "enabled": enabled,
                "admin_id": str(admin.id),
                "admin_username": admin.username,
            },
        )

        return settings
    except Exception as e:
        await db.rollback()
        logger.error(
            "Error toggling maintenance mode",
            extra={"error": str(e), "admin_id": str(admin.id)},
        )
        raise HTTPException(
            status_code=500, detail="Failed to toggle maintenance mode"
        ) from e


@router.post(
    "/feature-flags/{flag_name}/{enabled}", response_model=SystemSettingsResponse
)
async def toggle_feature_flag(
    flag_name: str,
    enabled: bool,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SystemSettingsResponse:
    """Toggle a specific feature flag.

    Quick endpoint for toggling individual feature flags.
    """
    try:
        # Validate flag name
        valid_flags = {f.value for f in FeatureFlagEnum}
        if flag_name not in valid_flags:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid flag name. Valid flags: {', '.join(valid_flags)}",
            )

        settings = await get_or_create_settings(db)
        settings.feature_flags[flag_name] = enabled
        settings.updated_at = datetime.utcnow()
        settings.updated_by = admin.id

        await db.commit()
        await db.refresh(settings)

        logger.info(
            "Feature flag toggled",
            extra={
                "flag_name": flag_name,
                "enabled": enabled,
                "admin_id": str(admin.id),
                "admin_username": admin.username,
            },
        )

        return settings
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(
            "Error toggling feature flag",
            extra={
                "error": str(e),
                "flag_name": flag_name,
                "admin_id": str(admin.id),
            },
        )
        raise HTTPException(
            status_code=500, detail="Failed to toggle feature flag"
        ) from e


@router.get("/health", response_model=SystemHealthCheck)
async def health_check(db: AsyncSession = Depends(get_db)) -> SystemHealthCheck:
    """Check system health and maintenance status.

    Public endpoint (no auth required) for checking if system is in maintenance mode.
    """
    try:
        settings = await get_or_create_settings(db)

        message = "System operational"
        if settings.maintenance_mode:
            message = settings.maintenance_message or "System under maintenance"

        return SystemHealthCheck(
            is_healthy=not settings.maintenance_mode,
            maintenance_mode_active=settings.maintenance_mode,
            message=message,
            timestamp=datetime.utcnow(),
        )
    except Exception as e:
        logger.error("Error checking system health", extra={"error": str(e)})
        # Return unhealthy response but don't expose error
        return SystemHealthCheck(
            is_healthy=False,
            maintenance_mode_active=True,
            message="System unavailable",
            timestamp=datetime.utcnow(),
        )


@router.get("/feature-flags", response_model=dict[str, bool])
async def get_feature_flags(
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    """Get all feature flags (public endpoint, no auth required).

    Frontend uses this to determine enabled features.
    """
    try:
        settings = await get_or_create_settings(db)
        return settings.feature_flags
    except Exception as e:
        logger.error("Error retrieving feature flags", extra={"error": str(e)})
        # Return safe defaults on error
        return {
            "user_registration": True,
            "portfolio_management": True,
            "social_features": True,
            "ai_features": True,
            "advanced_analytics": True,
            "api_access": True,
        }


@router.post("/reset-to-defaults", response_model=SystemSettingsResponse)
async def reset_to_defaults(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SystemSettingsResponse:
    """Reset all settings to defaults.

    This operation cannot be undone. Use with caution.
    """
    try:
        settings = await get_or_create_settings(db)

        # Store old values for logging
        old_settings = {
            "site_name": settings.site_name,
            "maintenance_mode": settings.maintenance_mode,
        }

        # Reset to defaults
        settings.site_name = "Lokifi"
        settings.site_description = "Financial platform"
        settings.site_domain = "lokifi.com"
        settings.maintenance_mode = False
        settings.rate_limit_enabled = True
        settings.rate_limit_requests = 100
        settings.rate_limit_window = 3600
        settings.session_timeout_minutes = 30
        settings.require_email_verification = True
        settings.password_min_length = 8
        settings.max_login_attempts = 5
        settings.lockout_duration_minutes = 15
        settings.api_key_expiration_days = 365
        settings.feature_flags = {
            "user_registration": True,
            "portfolio_management": True,
            "social_features": True,
            "ai_features": True,
            "advanced_analytics": True,
            "api_access": True,
        }
        settings.updated_at = datetime.utcnow()
        settings.updated_by = admin.id

        await db.commit()
        await db.refresh(settings)

        logger.warning(
            "System settings reset to defaults",
            extra={
                "admin_id": str(admin.id),
                "admin_username": admin.username,
                "old_settings": old_settings,
            },
        )

        return settings
    except Exception as e:
        await db.rollback()
        logger.error(
            "Error resetting settings to defaults",
            extra={"error": str(e), "admin_id": str(admin.id)},
        )
        raise HTTPException(status_code=500, detail="Failed to reset settings") from e


def _is_valid_ip_or_cidr(value: str) -> bool:
    """Check if string is valid IP or CIDR notation."""
    import ipaddress

    try:
        ipaddress.ip_network(value, strict=False)
        return True
    except ValueError:
        try:
            ipaddress.ip_address(value)
            return True
        except ValueError:
            return False
