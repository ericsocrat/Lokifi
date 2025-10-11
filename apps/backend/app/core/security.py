from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings

reusable_oauth2 = HTTPBearer(auto_error=False)

# Phase J: Password hasher instance
ph = PasswordHasher()


async def get_current_user(
    token: HTTPAuthorizationCredentials | None = Depends(reusable_oauth2),
) -> dict[str, Any]:
    if token is None:
        return {"id": 0, "email": "anon@local", "handle": "anon"}
    try:
        jwt_secret = settings.get_jwt_secret()
        payload = jwt.decode(
            token.credentials, jwt_secret, algorithms=["HS256"], options={"verify_aud": False}
        )
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "handle": payload.get("handle"),
        }
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


def create_jwt_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT token."""
    to_encode = data.copy()
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": now})
    jwt_secret = settings.get_jwt_secret()
    encoded_jwt = jwt.encode(to_encode, jwt_secret, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_jwt_token(token: str) -> dict[str, Any]:
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

    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_password_strength(password: str) -> bool:
    """
    Enhanced password strength validation with multiple security checks.

    Requirements:
    - Minimum 8 characters
    - At least 3 of 4 criteria: uppercase, lowercase, digit, special character
    - Not a common password
    - Sufficient entropy
    """
    import math
    import re

    # Length check
    if len(password) < 8:
        return False

    # Common passwords check (top 100 most common)
    common_passwords = {
        "password",
        "123456",
        "12345678",
        "qwerty",
        "abc123",
        "monkey",
        "1234567",
        "letmein",
        "trustno1",
        "dragon",
        "baseball",
        "iloveyou",
        "master",
        "sunshine",
        "ashley",
        "bailey",
        "passw0rd",
        "shadow",
        "123123",
        "654321",
        "superman",
        "qazwsx",
        "michael",
        "football",
        "password1",
        "welcome",
        "admin",
        "admin123",
    }
    if password.lower() in common_passwords:
        return False

    # Character variety checks
    has_upper = bool(re.search(r"[A-Z]", password))
    has_lower = bool(re.search(r"[a-z]", password))
    has_digit = bool(re.search(r"\d", password))
    has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))

    # Require at least 3 of the 4 criteria for flexibility
    criteria_met = sum([has_upper, has_lower, has_digit, has_special])
    if criteria_met < 3:
        return False

    # Calculate password entropy (information theory)
    # Higher entropy = more unpredictable password
    char_set_size = 0
    if has_lower:
        char_set_size += 26
    if has_upper:
        char_set_size += 26
    if has_digit:
        char_set_size += 10
    if has_special:
        char_set_size += 32  # approximate

    entropy = len(password) * math.log2(char_set_size) if char_set_size > 0 else 0

    # Require minimum entropy of 35 bits (NIST recommends 30+)
    if entropy < 35:
        return False

    return True
