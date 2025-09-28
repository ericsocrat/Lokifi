"""
Dependencies for Fynix API endpoints.
"""

from typing import Optional
from fastapi import HTTPException, Depends, Header
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import os

from app.db.db import get_session
from app.db.models import User

# JWT Configuration
JWT_SECRET = os.getenv("FYNIX_JWT_SECRET", "dev-insecure-secret")
JWT_ALG = "HS256"


def get_db():
    """Get database session."""
    with get_session() as db:
        yield db


def _auth_handle(authorization: Optional[str]) -> Optional[str]:
    """Extract user handle from authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 2)[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return data.get("sub")
    except JWTError:
        return None


def _user_by_handle(db: Session, handle: str) -> Optional[User]:
    """Get user by handle."""
    return db.query(User).filter(User.handle == handle).first()


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    handle = _auth_handle(authorization)
    if not handle:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user = _user_by_handle(db, handle)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, otherwise None."""
    handle = _auth_handle(authorization)
    if not handle:
        return None
    
    return _user_by_handle(db, handle)