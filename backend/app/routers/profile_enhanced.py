"""
Enhanced profile router with additional features for Phase J2.
"""

from typing import Optional
from uuid import UUID
import os
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
import aiofiles
from PIL import Image
import uuid

from app.db.database import get_db
from app.core.auth_deps import get_current_user, get_current_user_optional
from app.models.user import User
from app.services.profile_service import ProfileService
from app.schemas.profile import (
    ProfileUpdateRequest,
    UserSettingsUpdateRequest,
    NotificationPreferencesUpdateRequest,
    ProfileResponse,
    UserSettingsResponse,
    NotificationPreferencesResponse,
    PublicProfileResponse,
    ProfileSearchResponse
)
from app.schemas.auth import MessageResponse

router = APIRouter(prefix="/profile", tags=["profile"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed image extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def validate_image_file(file: UploadFile) -> None:
    """Validate uploaded image file."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    # Check file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size {file.size} exceeds maximum allowed size of {MAX_FILE_SIZE} bytes"
        )


async def process_avatar_image(file: UploadFile, user_id: UUID) -> str:
    """Process and save avatar image."""
    validate_image_file(file)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    filename = f"{user_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    try:
        # Save uploaded file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Process image with PIL
        with Image.open(file_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize to reasonable dimensions
            max_size = (400, 400)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save processed image
            img.save(file_path, format='JPEG', quality=85, optimize=True)
        
        return f"/uploads/avatars/{filename}"
    
    except Exception as e:
        # Clean up file if processing failed
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process image: {str(e)}"
        )


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


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload and set user avatar."""
    try:
        # Process and save the image
        avatar_url = await process_avatar_image(file, current_user.id)
        
        # Update profile with new avatar URL
        profile_service = ProfileService(db)
        profile_data = ProfileUpdateRequest(avatar_url=avatar_url)
        updated_profile = await profile_service.update_profile(current_user.id, profile_data)
        
        return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload avatar: {str(e)}"
        )


@router.get("/avatar/{filename}")
async def get_avatar(filename: str):
    """Serve avatar images."""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found"
        )
    
    return FileResponse(file_path)


@router.get("/{profile_id}", response_model=PublicProfileResponse)
async def get_public_profile(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get public profile by ID."""
    profile_service = ProfileService(db)
    current_user_id = current_user.id if current_user else None
    
    return await profile_service.get_public_profile(profile_id, current_user_id)


@router.get("", response_model=ProfileSearchResponse)
async def search_profiles(
    q: str = Query(..., min_length=2, max_length=50, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
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


# Account Management
@router.delete("/me", response_model=MessageResponse)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete current user's account (GDPR compliance)."""
    profile_service = ProfileService(db)
    
    try:
        # Delete user and all associated data
        await profile_service.delete_user_account(current_user.id)
        
        return MessageResponse(
            message="Account deleted successfully",
            success=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}"
        )


@router.get("/export/data")
async def export_user_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Export user data (GDPR compliance)."""
    profile_service = ProfileService(db)
    
    try:
        data = await profile_service.export_user_data(current_user.id)
        
        return {
            "user_data": data,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "format_version": "1.0"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export data: {str(e)}"
        )


# Profile Statistics
@router.get("/stats/activity")
async def get_profile_activity_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get profile activity statistics."""
    profile_service = ProfileService(db)
    
    try:
        stats = await profile_service.get_profile_activity_stats(current_user.id)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get activity stats: {str(e)}"
        )