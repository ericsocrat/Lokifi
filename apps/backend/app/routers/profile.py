"""
Profile router for user profile and settings management.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_deps import get_current_user, get_current_user_optional
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.profile import (
    NotificationPreferencesResponse,
    NotificationPreferencesUpdateRequest,
    ProfileResponse,
    ProfileSearchResponse,
    ProfileUpdateRequest,
    PublicProfileResponse,
    UserSettingsResponse,
    UserSettingsUpdateRequest,
)
from app.services.profile_service import ProfileService

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's profile."""
    profile_service = ProfileService(db)
    profile = await profile_service.get_profile_by_user_id(current_user.id)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return ProfileResponse.model_validate(profile)


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's profile."""
    profile_service = ProfileService(db)
    return await profile_service.update_profile(current_user.id, profile_data)


@router.get("/{profile_id}", response_model=PublicProfileResponse)
async def get_profile(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    """Get a user's public profile."""
    profile_service = ProfileService(db)
    current_user_id = current_user.id if current_user else None
    return await profile_service.get_public_profile(profile_id, current_user_id)


@router.get("/username/{username}", response_model=PublicProfileResponse)
async def get_profile_by_username(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    """Get a user's profile by username."""
    profile_service = ProfileService(db)
    
    # First get the profile by username
    profile = await profile_service.get_profile_by_username(username)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Then get public profile info
    current_user_id = current_user.id if current_user else None
    return await profile_service.get_public_profile(profile.id, current_user_id)


@router.get("", response_model=ProfileSearchResponse)
async def search_profiles(
    q: str = Query(..., min_length=2, max_length=50, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    """Search public profiles by username or display name."""
    profile_service = ProfileService(db)
    current_user_id = current_user.id if current_user else None
    
    return await profile_service.search_profiles(
        query=q,
        page=page,
        page_size=page_size,
        current_user_id=current_user_id
    )


# User Settings Endpoints
@router.get("/settings/user", response_model=UserSettingsResponse)
async def get_user_settings(
    current_user: User = Depends(get_current_user)
):
    """Get current user's settings."""
    return UserSettingsResponse.model_validate(current_user)


@router.put("/settings/user", response_model=UserSettingsResponse)
async def update_user_settings(
    settings_data: UserSettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's settings."""
    profile_service = ProfileService(db)
    return await profile_service.update_user_settings(current_user.id, settings_data)


# Notification Preferences Endpoints
@router.get("/settings/notifications", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's notification preferences."""
    profile_service = ProfileService(db)
    return await profile_service.get_notification_preferences(current_user.id)


@router.put("/settings/notifications", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    prefs_data: NotificationPreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's notification preferences."""
    profile_service = ProfileService(db)
    return await profile_service.update_notification_preferences(current_user.id, prefs_data)


@router.delete("/me", response_model=MessageResponse)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete current user's account (GDPR compliance)."""
    # This will be implemented in J8 GDPR Compliance
    # For now, just mark as inactive
    from sqlalchemy import func, update

    from app.models.user import User
    
    stmt = update(User).where(User.id == current_user.id).values(
        is_active=False,
        updated_at=func.now()
    )
    await db.execute(stmt)
    await db.commit()
    
    return MessageResponse(
        message="Account marked for deletion. Full deletion will be processed within 30 days.",
        success=True
    )