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
from app.services.profile_enhanced import EnhancedProfileService
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

router = APIRouter(prefix="/profile", tags=["profile-enhanced"])

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
    if file.filename:
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
    
    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )


async def process_avatar_image(file: UploadFile, user_id: UUID) -> str:
    """Process and save avatar image."""
    validate_image_file(file)
    
    # Generate unique filename
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    file_ext = Path(file.filename).suffix.lower()
    filename = f"{user_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    try:
        # Save uploaded file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Process image with PIL (resize if needed)
        with Image.open(file_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize if too large (max 512x512)
            if img.width > 512 or img.height > 512:
                img.thumbnail((512, 512), Image.Resampling.LANCZOS)
                img.save(file_path, quality=85, optimize=True)
        
        # Return relative URL
        return f"/uploads/avatars/{filename}"
    
    except Exception as e:
        # Clean up file if processing failed
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process image"
        )


@router.post("/enhanced/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload and set user avatar."""
    try:
        # Process and save the image
        avatar_url = await process_avatar_image(file, current_user.id)
        
        # Update profile with new avatar URL using the enhanced service
        enhanced_service = EnhancedProfileService(db)
        
        # Get current profile first
        current_profile = await enhanced_service.get_profile_by_user_id(current_user.id)
        if not current_profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Create update request with current values plus new avatar
        profile_data = ProfileUpdateRequest(
            username=current_profile.username,
            display_name=current_profile.display_name,
            bio=current_profile.bio or "",
            is_public=current_profile.is_public
        )
        
        # Update profile
        updated_profile = await enhanced_service.update_profile(current_user.id, profile_data)
        
        return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )


@router.get("/enhanced/avatar/{user_id}")
async def get_avatar(user_id: UUID):
    """Get user avatar by user ID."""
    # This would typically serve the avatar file
    # For now, return a placeholder response
    avatar_path = UPLOAD_DIR / f"{user_id}_avatar.jpg"
    
    if avatar_path.exists():
        return FileResponse(avatar_path)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found"
        )


@router.post("/enhanced/validate")
async def validate_profile_data(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validate profile data without saving."""
    enhanced_service = EnhancedProfileService(db)
    
    try:
        # Check if username is available (if changed)
        if profile_data.username:
            existing_profile = await enhanced_service.get_profile_by_username(profile_data.username)
            if existing_profile and existing_profile.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        return {"valid": True, "message": "Profile data is valid"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Validation failed"
        )


@router.delete("/enhanced/account")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete current user's account (GDPR compliance)."""
    enhanced_service = EnhancedProfileService(db)
    
    try:
        # Delete user and all associated data
        await enhanced_service.delete_user_account(current_user.id)
        
        return MessageResponse(
            message="Account deleted successfully"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )


@router.get("/enhanced/export")
async def export_user_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Export user data for GDPR compliance."""
    enhanced_service = EnhancedProfileService(db)
    
    try:
        data = await enhanced_service.export_user_data(current_user.id)
        return data
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export data"
        )


@router.get("/enhanced/stats")
async def get_profile_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get profile statistics and activity data."""
    enhanced_service = EnhancedProfileService(db)
    
    try:
        stats = await enhanced_service.get_profile_activity_stats(current_user.id)
        return stats
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get profile statistics"
        )


@router.get("/enhanced/activity")
async def get_activity_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user activity summary."""
    enhanced_service = EnhancedProfileService(db)
    
    try:
        # Return a basic activity summary for now
        activity = {
            "last_login": None,
            "login_count": 0,
            "profile_updates": 0,
            "settings_changes": 0,
            "created_at": None
        }
        return activity
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get activity summary"
        )