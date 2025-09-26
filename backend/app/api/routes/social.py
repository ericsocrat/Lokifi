from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.db.db import get_session
from app.db.models import User, Follow, Post

from app.services.auth import require_handle

router = APIRouter()

# Ensure tables exist when router loads (idempotent)
init_db()

# ===== Schemas =====
class UserCreate(BaseModel):
    handle: str = Field(..., min_length=2, max_length=32)
    avatar_url: Optional[str] = Field(None, max_length=512)
    bio: Optional[str] = Field(None, max_length=280)

class UserOut(BaseModel):
    handle: str
    avatar_url: Optional[str]
    bio: Optional[str]
    created_at: str
    following_count: int
    followers_count: int
    posts_count: int

class PostCreate(BaseModel):
    handle: str
    content: str = Field(..., min_length=1, max_length=1000)
    symbol: Optional[str] = Field(None, max_length=24)

class PostOut(BaseModel):
    id: int
    handle: str
    content: str
    symbol: Optional[str]
    created_at: str
    avatar_url: Optional[str] = None

# ===== Helpers =====
def _user_by_handle(db: Session, handle: str) -> User:
    u = db.execute(select(User).where(User.handle == handle)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u

# ===== Users =====
@router.post("/social/users", response_model=UserOut)
def create_user(payload: UserCreate):
    with get_session() as db:
        existing = db.execute(select(User).where(User.handle == payload.handle)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Handle already exists")
        u = User(handle=payload.handle, avatar_url=payload.avatar_url, bio=payload.bio)
        db.add(u)
        db.flush()  # get id
        # counts
        out = UserOut(
            handle=u.handle,
            avatar_url=u.avatar_url,
            bio=u.bio,
            created_at=u.created_at.isoformat(),
            following_count=0,
            followers_count=0,
            posts_count=0,
        )
        return out

@router.get("/social/users/{handle}", response_model=UserOut)
def get_user(handle: str):
    with get_session() as db:
        u = _user_by_handle(db, handle)
        following_ct = db.execute(select(func.count()).select_from(Follow).where(Follow.follower_id == u.id)).scalar_one()
        followers_ct = db.execute(select(func.count()).select_from(Follow).where(Follow.followee_id == u.id)).scalar_one()
        posts_ct = db.execute(select(func.count()).select_from(Post).where(Post.user_id == u.id)).scalar_one()
        return UserOut(
            handle=u.handle,
            avatar_url=u.avatar_url,
            bio=u.bio,
            created_at=u.created_at.isoformat(),
            following_count=int(following_ct),
            followers_count=int(followers_ct),
            posts_count=int(posts_ct),
        )

# ===== Follow / Unfollow =====
@router.post("/social/follow/{handle}")
def follow(handle: str, authorization: str | None = Header(None)):
    with get_session() as db:
        me = require_handle(authorization); me = require_handle(authorization); me_u = _user_by_handle(db, me)
        target = _user_by_handle(db, handle)
        if me_u.id == target.id:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
        exists = db.execute(
            select(Follow).where(Follow.follower_id == me_u.id, Follow.followee_id == target.id)
        ).scalar_one_or_none()
        if exists:
            return {"ok": True, "following": True}
        db.add(Follow(follower_id=me_u.id, followee_id=target.id))
        return {"ok": True, "following": True}

@router.delete("/social/follow/{handle}")
def unfollow(handle: str, authorization: str | None = Header(None)):
    with get_session() as db:
        me = require_handle(authorization); me = require_handle(authorization); me_u = _user_by_handle(db, me)
        target = _user_by_handle(db, handle)
        f = db.execute(
            select(Follow).where(Follow.follower_id == me_u.id, Follow.followee_id == target.id)
        ).scalar_one_or_none()
        if not f:
            return {"ok": True, "following": False}
        db.delete(f)
        return {"ok": True, "following": False}

# ===== Posts =====
@router.post("/social/posts", response_model=PostOut)
def create_post(payload: PostCreate, authorization: str | None = Header(None)):
    with get_session() as db:
        require_handle(authorization, payload.handle); u = _user_by_handle(db, payload.handle)
        p = Post(user_id=u.id, content=payload.content, symbol=payload.symbol)
        db.add(p)
        db.flush()
        return PostOut(
            id=p.id, handle=u.handle, content=p.content, symbol=p.symbol,
            created_at=p.created_at.isoformat(), avatar_url=u.avatar_url
        )

@router.get("/social/posts", response_model=list[PostOut])
def list_posts(symbol: str | None = None, limit: int = 50, after_id: int | None = None):
    limit = max(1, min(200, limit))
    with get_session() as db:
        stmt = select(Post, User).join(User, User.id == Post.user_id)
        if symbol:
            stmt = stmt.where(Post.symbol == symbol)
        if after_id:
            stmt = stmt.where(Post.id < after_id)
        stmt = stmt.order_by(desc(Post.id)).limit(limit)
        rows = db.execute(stmt).all()
        out: list[PostOut] = []
        for p, u in rows:
            out.append(PostOut(
                id=p.id, handle=u.handle, content=p.content, symbol=p.symbol,
                created_at=p.created_at.isoformat(), avatar_url=u.avatar_url
            ))
        return out

# ===== Feed (people I follow) =====
@router.get("/social/feed", response_model=list[PostOut])
def feed(handle: str, symbol: str | None = None, limit: int = 50, after_id: int | None = None):
    limit = max(1, min(200, limit))
    with get_session() as db:
        me = _user_by_handle(db, handle)

        # get followee ids
        followee_ids = [row[0] for row in db.execute(
            select(Follow.followee_id).where(Follow.follower_id == me.id)
        ).all()]

        stmt = select(Post, User).join(User, User.id == Post.user_id)

        if followee_ids:
            stmt = stmt.where(Post.user_id.in_(followee_ids))
        else:
            # if user follows no one, fall back to global feed
            pass

        if symbol:
            stmt = stmt.where(Post.symbol == symbol)
        if after_id:
            stmt = stmt.where(Post.id < after_id)

        stmt = stmt.order_by(desc(Post.id)).limit(limit)
        rows = db.execute(stmt).all()

        out: list[PostOut] = []
        for p, u in rows:
            out.append(PostOut(
                id=p.id, handle=u.handle, content=p.content, symbol=p.symbol,
                created_at=p.created_at.isoformat(), avatar_url=u.avatar_url
            ))
        return out

