from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.core.config import get_settings
from app.db.db import get_session, init_db
from app.db.models import User
from fastapi import APIRouter, Header, HTTPException
from jose import JWTError, jwt
from passlib.hash import bcrypt
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter()
init_db()

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


def _user_by_handle(db: Session, handle: str) -> User | None:
    return db.execute(select(User).where(User.handle == handle)).scalar_one_or_none()


def _issue_token(handle: str) -> TokenOut:
    now = datetime.now(UTC)
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
    except JWTError:
        return None


@router.post("/auth/register", response_model=TokenOut)
def register(payload: RegisterPayload):
    with get_session() as db:
        existing = _user_by_handle(db, payload.handle)
        if existing:
            raise HTTPException(status_code=409, detail="Handle already exists")
        pw_hash = bcrypt.hash(payload.password)
        u = User(
            handle=payload.handle,
            password_hash=pw_hash,
            avatar_url=payload.avatar_url,
            bio=payload.bio,
        )
        db.add(u)
        db.flush()
        return _issue_token(u.handle)


@router.post("/auth/login", response_model=TokenOut)
def login(payload: LoginPayload):
    with get_session() as db:
        u = _user_by_handle(db, payload.handle)
        if not u or not u.password_hash or not bcrypt.verify(payload.password, u.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return _issue_token(u.handle)


@router.get("/auth/me")
def me(authorization: str | None = Header(None)):
    handle = _auth_handle(authorization)
    if not handle:
        raise HTTPException(status_code=401, detail="Unauthorized")
    with get_session() as db:
        u = _user_by_handle(db, handle)
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "handle": u.handle,
            "avatar_url": u.avatar_url,
            "bio": u.bio,
            "created_at": u.created_at.isoformat(),
        }
