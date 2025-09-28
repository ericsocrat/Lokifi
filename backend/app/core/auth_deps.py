"""
Authentication dependencies for FastAPI.
"""

import uuid
from typing import Optional

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.core.security import verify_jwt_token
from app.services.auth_service import AuthService

security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    token: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current user from token (optional - doesn't raise if no token)."""
    # Try to get token from Authorization header or cookie
    token_str = None
    if token:
        token_str = token.credentials
    elif access_token:
        token_str = access_token
    
    if not token_str:
        return None
    
    try:
        payload = verify_jwt_token(token_str)
        user_id = payload.get("sub")
        
        if not user_id:
            return None
        
        auth_service = AuthService(db)
        user = await auth_service.get_user_by_id(uuid.UUID(user_id))
        
        if not user or not user.is_active:
            return None
        
        return user
    
    except HTTPException:
        return None
    except Exception:
        return None


async def get_current_user(
    token: Optional[HTTPAuthorizationCredentials] = Depends(security),
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current user from token (required - raises if no valid token)."""
    user = await get_current_user_optional(token, access_token, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user