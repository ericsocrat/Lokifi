from __future__ import annotations
from typing import Optional
import os
from fastapi import HTTPException, Header
from jose import jwt, JWTError

JWT_SECRET = os.getenv("FYNIX_JWT_SECRET", "dev-insecure-secret")
JWT_ALG = "HS256"

def auth_handle_from_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return data.get("sub")
    except JWTError:
        return None

def require_handle(authorization: Optional[str], supplied_handle: Optional[str] = None) -> str:
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
