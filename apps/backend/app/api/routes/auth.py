from __future__ import annotations

__all__ = ["router"]

from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from jwt.exceptions import PyJWTError
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cached_queries import get_user_by_handle  # Phase 4b-1
from app.core.config import get_settings
from app.db.db import get_session, init_db
from app.db.models import User
from app.services.webhook_event_emitter import webhook_event_emitter

router = APIRouter()
init_db()

# Password hasher instance (Argon2)
ph = PasswordHasher()

# Get JWT configuration from settings
settings = get_settings()
JWT_SECRET = settings.get_jwt_secret()  # Will raise error if not set
JWT_ALG = "HS256"
JWT_TTL_MIN = settings.lokifi_jwt_ttl_min


class RegisterPayload(BaseModel):
    handle: str = Field(..., min_length=2, max_length=32)
    password: str = Field(..., min_length=6, max_length=128)
    avatar_url: str | None = Field(None, max_length=512)
    bio: str | None = Field(None, max_length=280)


class LoginPayload(BaseModel):
    handle: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: int


# Phase 4b-1: Removed _user_by_handle - now using cached get_user_by_handle from cached_queries
# def _user_by_handle(db: Session, handle: str) -> User | None:
#     return db.execute(select(User).where(User.handle == handle)).scalar_one_or_none()


def _issue_token(handle: str) -> TokenOut:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=JWT_TTL_MIN)
    payload = {"sub": handle, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    return TokenOut(access_token=token, expires_at=int(exp.timestamp()))


def _auth_handle(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 2)[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return data.get("sub")
    except PyJWTError:
        return None


@router.post("/auth/register", response_model=TokenOut)
def register(payload: RegisterPayload, background_tasks: BackgroundTasks):
    with get_session() as db:
        # Phase 4b-1: Use cached query for user lookup (prevents duplicate handles)
        existing = get_user_by_handle(db, payload.handle)
        if existing:
            raise HTTPException(status_code=409, detail="Handle already exists")
        pw_hash = ph.hash(payload.password)
        u = User(
            handle=payload.handle,
            password_hash=pw_hash,
            avatar_url=payload.avatar_url,
            bio=payload.bio,
        )
        db.add(u)
        db.flush()

        # Emit webhook event in background
        background_tasks.add_task(
            webhook_event_emitter.emit,
            "user.created",
            {
                "user_id": str(u.id),
                "username": u.handle,
                "email": "",
                "verified": False,
            },
        )

        return _issue_token(u.handle)


@router.post("/auth/login", response_model=TokenOut)
def login(payload: LoginPayload):
    with get_session() as db:
        # Phase 4b-1: Use cached query for user lookup (50-100x faster on cache hit)
        u = get_user_by_handle(db, payload.handle)
        if not u or not u.password_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        try:
            ph.verify(u.password_hash, payload.password)
            return _issue_token(u.handle)
        except VerifyMismatchError:
            raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/auth/me")
def me(authorization: str | None = Header(None)):
    handle = _auth_handle(authorization)
    if not handle:
        raise HTTPException(status_code=401, detail="Unauthorized")
    with get_session() as db:
        # Phase 4b-1: Use cached query for user lookup (300s cache, MEDIUM_TERM)
        u = get_user_by_handle(db, handle)
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "handle": u.handle,
            "avatar_url": u.avatar_url,
            "bio": u.bio,
            "created_at": u.created_at.isoformat(),
        }
