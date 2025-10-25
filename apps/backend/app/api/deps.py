"""
Dependencies for Lokifi API endpoints.
"""

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.db import get_session
from app.db.models import User

# JWT Configuration from settings
settings = get_settings()
JWT_SECRET = settings.get_jwt_secret()  # Will raise error if not set
JWT_ALG = "HS256"


def get_db():
    """Get database session."""
    with get_session() as db:
        yield db


def _auth_handle(authorization: str | None) -> str | None:
    """Extract user handle from authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 2)[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return data.get("sub")
    except JWTError:
        return None


def _user_by_handle(db: Session, handle: str) -> User | None:
    """Get user by handle."""
    return db.query(User).filter(User.handle == handle).first()


def get_current_user(
    authorization: str | None = Header(None), db: Session = Depends(get_db)
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
    authorization: str | None = Header(None), db: Session = Depends(get_db)
) -> User | None:
    """Get current user if authenticated, otherwise None."""
    handle = _auth_handle(authorization)
    if not handle:
        return None

    return _user_by_handle(db, handle)
