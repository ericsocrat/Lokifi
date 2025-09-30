"""
Authentication router with login, register, and OAuth endpoints.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.config import settings
from app.core.auth_deps import get_current_user, get_current_user_optional
from app.models.user import User
from app.services.auth_service import AuthService
from app.schemas.auth import (
    UserRegisterRequest, 
    UserLoginRequest, 
    GoogleOAuthRequest,
    AuthUserResponse,
    MessageResponse
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=AuthUserResponse)
async def register(
    user_data: UserRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    auth_service = AuthService(db)
    result = await auth_service.register_user(user_data)
    
    # Set HTTP-only cookie with access token
    response_content = jsonable_encoder({
        "user": result["user"],
        "profile": result["profile"],
        "access_token": result["tokens"].access_token,
        "refresh_token": result["tokens"].refresh_token,
        "token_type": result["tokens"].token_type,
        "expires_in": result["tokens"].expires_in
    })
    response = JSONResponse(content=response_content)
    
    response.set_cookie(
        key="access_token",
        value=result["tokens"].access_token,
        max_age=result["tokens"].expires_in,
        httponly=True,
        secure=False,  # Set to False for local/testing; enforce True in production
        samesite="lax"
    )
    
    response.set_cookie(
        key="refresh_token", 
        value=result["tokens"].refresh_token,
        max_age=30 * 24 * 60 * 60,  # 30 days
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return response


@router.post("/login", response_model=AuthUserResponse)
async def login(
    login_data: UserLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login a user."""
    auth_service = AuthService(db)
    result = await auth_service.login_user(login_data)
    
    # Set HTTP-only cookie with access token
    response_content = jsonable_encoder({
        "user": result["user"],
        "profile": result["profile"],
        "access_token": result["tokens"].access_token,
        "refresh_token": result["tokens"].refresh_token,
        "token_type": result["tokens"].token_type,
        "expires_in": result["tokens"].expires_in
    })
    response = JSONResponse(content=response_content)
    
    response.set_cookie(
        key="access_token",
        value=result["tokens"].access_token,
        max_age=result["tokens"].expires_in,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=result["tokens"].refresh_token,
        max_age=30 * 24 * 60 * 60,  # 30 days
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return response


@router.post("/google", response_model=AuthUserResponse)
async def google_oauth(
    oauth_data: GoogleOAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate with Google OAuth."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured"
        )
    
    try:
        # Verify the access token with Google
        async with httpx.AsyncClient() as client:
            google_response = await client.get(
                f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={oauth_data.access_token}"
            )
            
            if google_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google access token"
                )
            
            user_info = google_response.json()
            
        # Extract user information
        email = user_info.get("email")
        name = user_info.get("name", email)
        google_id = user_info.get("id")
        
        if not email or not google_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to get user information from Google"
            )
        
        # Create or get user
        auth_service = AuthService(db)
        result = await auth_service.create_user_from_oauth(email, name, google_id)
        
        # Set HTTP-only cookie with access token
        response_content = jsonable_encoder({
            "user": result["user"],
            "profile": result["profile"],
            "access_token": result["tokens"].access_token,
            "refresh_token": result["tokens"].refresh_token,
            "token_type": result["tokens"].token_type,
            "expires_in": result["tokens"].expires_in
        })
        response = JSONResponse(content=response_content)
        
        response.set_cookie(
            key="access_token",
            value=result["tokens"].access_token,
            max_age=result["tokens"].expires_in,
            httponly=True,
            secure=False,
            samesite="lax"
        )
        
        response.set_cookie(
            key="refresh_token",
            value=result["tokens"].refresh_token,
            max_age=30 * 24 * 60 * 60,  # 30 days
            httponly=True,
            secure=False,
            samesite="lax"
        )
        
        return response
        
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify Google token"
        )


@router.post("/logout", response_model=MessageResponse)
async def logout():
    """Logout a user by clearing cookies."""
    response = JSONResponse(content={"message": "Successfully logged out", "success": True})
    
    # Clear cookies
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    
    return response


@router.get("/me", response_model=AuthUserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user information."""
    # Get user's profile
    from sqlalchemy import select
    from app.models.profile import Profile
    
    stmt = select(Profile).where(Profile.user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    return {
        "user": current_user,
        "profile": profile
    }


@router.get("/check", response_model=dict)
async def check_auth_status(
    current_user: User = Depends(get_current_user_optional)
):
    """Check authentication status."""
    return {
        "authenticated": current_user is not None,
        "user_id": str(current_user.id) if current_user else None,
        "email": current_user.email if current_user else None
    }