from __future__ import annotations

from fastapi import HTTPException
from jose import JWTError, jwt

from app.core.config import get_settings

# Get JWT configuration from settings
settings = get_settings()
JWT_SECRET = settings.get_jwt_secret()  # Will raise error if not set
JWT_ALG = "HS256"


def auth_handle_from_header(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return data.get("sub")
    except JWTError:
        return None


def require_handle(authorization: str | None, supplied_handle: str | None = None) -> str:
    """
    Returns the handle from JWT. If supplied_handle is given, it must match the token handle.
    Raises 401/403 accordingly.
    """
    handle = auth_handle_from_header(authorization)
    if not handle:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if supplied_handle and supplied_handle != handle:
        raise HTTPException(status_code=403, detail="Forbidden for another user")
    return handle
