from __future__ import annotations

__all__ = ["router"]

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc, func, select
from sqlalchemy.orm import Session

from app.db.db import get_session, init_db
from app.db.models import Follow, Post, User
from app.services.auth import require_handle

router = APIRouter()

# Ensure tables exist when router loads (idempotent)
init_db()


# ===== Schemas =====
class UserCreate(BaseModel):
    handle: str = Field(..., min_length=2, max_length=32)
    avatar_url: str | None = Field(None, max_length=512)
    bio: str | None = Field(None, max_length=280)


class UserOut(BaseModel):
    handle: str
    avatar_url: str | None
    bio: str | None
    created_at: str
    following_count: int
    followers_count: int
    posts_count: int


class PostCreate(BaseModel):
    handle: str
    content: str = Field(..., min_length=1, max_length=1000)
    symbol: str | None = Field(None, max_length=24)


class PostOut(BaseModel):
    id: int
    handle: str
    content: str
    symbol: str | None
    created_at: str
    avatar_url: str | None = None


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
        existing = db.execute(
            select(User).where(User.handle == payload.handle)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Handle already exists")
        u = User(handle=payload.handle, avatar_url=payload.avatar_url, bio=payload.bio)
        db.add(u)
        db.commit()  # Commit to get id and trigger default values
        db.refresh(u)  # Refresh to ensure created_at is populated
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
    """Get user with counts using aggregation queries instead of N+1."""
    with get_session() as db:
        # Execute single query with aggregates instead of 3 separate count queries
        # This eliminates the N+1 pattern: 1 query to fetch user + 3 count queries
        result = db.execute(
            select(
                User,
                func.coalesce(
                    func.count(Follow.id).filter(Follow.follower_id == User.id), 0
                ).label("following_count"),
                func.coalesce(
                    func.count(Follow.id).filter(Follow.followee_id == User.id), 0
                ).label("followers_count"),
                func.coalesce(
                    func.count(Post.id).filter(Post.user_id == User.id), 0
                ).label("posts_count"),
            )
            .outerjoin(Follow, Follow.follower_id == User.id)
            .outerjoin(Post, Post.user_id == User.id)
            .where(User.handle == handle)
            .group_by(User.id)
        ).first()

        if not result:
            raise HTTPException(status_code=404, detail="User not found")

        u, following_count, followers_count, posts_count = result
        return UserOut(
            handle=u.handle,
            avatar_url=u.avatar_url,
            bio=u.bio,
            created_at=u.created_at.isoformat(),
            following_count=int(following_count),
            followers_count=int(followers_count),
            posts_count=int(posts_count),
        )


# ===== Follow / Unfollow =====
@router.post("/social/follow/{handle}")
def follow(handle: str, authorization: str | None = Header(None)):
    with get_session() as db:
        me = require_handle(authorization)
        me_u = _user_by_handle(db, me)
        target = _user_by_handle(db, handle)
        if me_u.id == target.id:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
        exists = db.execute(
            select(Follow).where(
                Follow.follower_id == me_u.id, Follow.followee_id == target.id
            )
        ).scalar_one_or_none()
        if exists:
            return {"ok": True, "following": True}
        db.add(Follow(follower_id=me_u.id, followee_id=target.id))
        return {"ok": True, "following": True}


@router.delete("/social/follow/{handle}")
def unfollow(handle: str, authorization: str | None = Header(None)):
    with get_session() as db:
        me = require_handle(authorization)
        me_u = _user_by_handle(db, me)
        target = _user_by_handle(db, handle)
        f = db.execute(
            select(Follow).where(
                Follow.follower_id == me_u.id, Follow.followee_id == target.id
            )
        ).scalar_one_or_none()
        if not f:
            return {"ok": True, "following": False}
        db.delete(f)
        return {"ok": True, "following": False}


# ===== Posts =====
@router.post("/social/posts", response_model=PostOut)
def create_post(payload: PostCreate, authorization: str | None = Header(None)):
    with get_session() as db:
        require_handle(authorization, payload.handle)
        u = _user_by_handle(db, payload.handle)
        p = Post(user_id=u.id, content=payload.content, symbol=payload.symbol)
        db.add(p)
        db.commit()  # Commit to get id and trigger default values
        db.refresh(p)  # Refresh to ensure created_at is populated
        return PostOut(
            id=p.id,
            handle=u.handle,
            content=p.content,
            symbol=p.symbol,
            created_at=p.created_at.isoformat(),
            avatar_url=u.avatar_url,
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
            out.append(
                PostOut(
                    id=p.id,
                    handle=u.handle,
                    content=p.content,
                    symbol=p.symbol,
                    created_at=p.created_at.isoformat(),
                    avatar_url=u.avatar_url,
                )
            )
        return out


# ===== Feed (people I follow) =====
@router.get("/social/feed", response_model=list[PostOut])
def feed(
    handle: str, symbol: str | None = None, limit: int = 50, after_id: int | None = None
):
    limit = max(1, min(200, limit))
    with get_session() as db:
        me = _user_by_handle(db, handle)

        # get followee ids
        followee_ids = [
            row[0]
            for row in db.execute(
                select(Follow.followee_id).where(Follow.follower_id == me.id)
            ).all()
        ]

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
            out.append(
                PostOut(
                    id=p.id,
                    handle=u.handle,
                    content=p.content,
                    symbol=p.symbol,
                    created_at=p.created_at.isoformat(),
                    avatar_url=u.avatar_url,
                )
            )
        return out
