from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi.security import HTTPBearer
from fastapi import Depends, HTTPException, status
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from .config import settings

reusable_oauth2 = HTTPBearer(auto_error=False)

# Phase J: Password hasher instance
ph = PasswordHasher()

async def get_current_user(token=Depends(reusable_oauth2)):
    if token is None:
        return {"id": 0, "email": "anon@local", "handle": "anon"}
    try:
        jwt_secret = settings.get_jwt_secret()
        payload = jwt.decode(token.credentials, jwt_secret, algorithms=["HS256"], options={"verify_aud": False})
        return {"id": payload.get("sub"), "email": payload.get("email"), "handle": payload.get("handle")}
    except Exception:
        raise HTTPException(401, "Invalid token")


# Phase J: Authentication utilities

def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except VerifyMismatchError:
        return False


def create_jwt_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": now})
    jwt_secret = settings.get_jwt_secret()
    encoded_jwt = jwt.encode(to_encode, jwt_secret, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """Verify and decode a JWT token."""
    try:
        jwt_secret = settings.get_jwt_secret()
        payload = jwt.decode(token, jwt_secret, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def create_access_token(user_id: str, email: str) -> str:
    """Create an access token for a user."""
    data = {"sub": user_id, "email": email, "type": "access"}
    return create_jwt_token(data)


def create_refresh_token(user_id: str) -> str:
    """Create a refresh token for a user."""
    data = {"sub": user_id, "type": "refresh"}
    expires_delta = timedelta(days=30)  # Refresh tokens last longer
    return create_jwt_token(data, expires_delta)


def validate_email(email: str) -> bool:
    """Basic email validation."""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password_strength(password: str) -> bool:
    """Validate password strength (minimum 8 characters)."""
    return len(password) >= 8
