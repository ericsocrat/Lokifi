from __future__ import annotations

__all__ = ["router"]

import asyncio
import json

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select

from app.core.cached_queries import (
    get_user_by_handle,
    invalidate_all_feeds_for_followees,
    invalidate_feed_cache,
    invalidate_follow_cache,
    invalidate_post_cache,
    is_following,
)
from app.core.redis_cache import cache
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
# Phase 4b-3: Removed _user_by_handle - now using cached get_user_by_handle


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
    """Get user with counts using aggregation queries instead of N+1.

    Phase 3c-1 Cache: User profiles cached for 10 minutes.
    Invalidated on: profile updates, follow/unfollow changes.
    Expected improvement: 50-100x faster on cache hit.
    """
    # Phase 3c-1: Try to get from cache first
    cache_key = f"user:profile:{handle}"
    try:
        # Simple blocking get for sync context
        if hasattr(cache, "_redis") and cache._redis:
            cached = cache._redis.get(cache_key)
            if cached:
                return UserOut(**json.loads(cached))
    except Exception:
        pass  # Cache miss or error - proceed to database

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
        out = UserOut(
            handle=u.handle,
            avatar_url=u.avatar_url,
            bio=u.bio,
            created_at=u.created_at.isoformat(),
            following_count=int(following_count),
            followers_count=int(followers_count),
            posts_count=int(posts_count),
        )

        # Phase 3c-1: Cache the result for 10 minutes
        try:
            if hasattr(cache, "_redis") and cache._redis:
                cache._redis.setex(cache_key, 600, json.dumps(out.dict()))
        except Exception:
            pass  # Cache error - still return valid result

        return out


# ===== Follow / Unfollow =====
@router.post("/social/follow/{handle}")
def follow(handle: str, authorization: str | None = Header(None)):
    """Follow a user and invalidate both users' profile caches."""
    with get_session() as db:
        me = require_handle(authorization)
        # Phase 4b-3: Use cached queries (MEDIUM_TERM, 300s)
        me_u = get_user_by_handle(db, me)
        target = get_user_by_handle(db, handle)
        if me_u.id == target.id:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
        # Phase 4b-3: Use cached is_following check (SHORT_TERM, 60s)
        if is_following(db, me_u.id, target.id):
            return {"ok": True, "following": True}
        db.add(Follow(follower_id=me_u.id, followee_id=target.id))
        db.commit()

        # Phase 3c-1: Invalidate both users' caches
        # Phase 3c-2: Invalidate follower's feed cache
        # Phase 4d-2: Add dogpile + Redis cache invalidation
        invalidate_follow_cache(me_u.id, target.id)
        invalidate_feed_cache(me_u.id)
        try:
            if hasattr(cache, "_redis") and cache._redis:
                cache._redis.delete(f"user:profile:{handle}")
                cache._redis.delete(f"user:profile:{me}")

                # Invalidate follower's personal feed cache
                # (their feed will now include target's posts)
                for limit_val in [50, 100, 200]:
                    cache._redis.delete(f"feed:{me}:global:p1:l{limit_val}")
                    # Note: Symbol-specific feeds will expire via TTL
        except Exception:
            pass

        return {"ok": True, "following": True}


@router.delete("/social/follow/{handle}")
def unfollow(handle: str, authorization: str | None = Header(None)):
    """Unfollow a user and invalidate both users' profile caches."""
    with get_session() as db:
        me = require_handle(authorization)
        # Phase 4b-3: Use cached queries (MEDIUM_TERM, 300s)
        me_u = get_user_by_handle(db, me)
        target = get_user_by_handle(db, handle)
        f = db.execute(
            select(Follow).where(
                Follow.follower_id == me_u.id, Follow.followee_id == target.id
            )
        ).scalar_one_or_none()
        if not f:
            return {"ok": True, "following": False}
        db.delete(f)
        db.commit()

        # Phase 3c-1: Invalidate both users' caches
        # Phase 3c-2: Invalidate follower's feed cache
        # Phase 4d-2: Add dogpile + Redis cache invalidation
        invalidate_follow_cache(me_u.id, target.id)
        invalidate_feed_cache(me_u.id)
        try:
            if hasattr(cache, "_redis") and cache._redis:
                cache._redis.delete(f"user:profile:{handle}")
                cache._redis.delete(f"user:profile:{me}")

                # Invalidate follower's personal feed cache
                # (their feed will no longer include target's posts)
                for limit_val in [50, 100, 200]:
                    cache._redis.delete(f"feed:{me}:global:p1:l{limit_val}")
                    # Note: Symbol-specific feeds will expire via TTL
        except Exception:
            pass

        return {"ok": True, "following": False}


# ===== Posts =====
@router.post("/social/posts", response_model=PostOut)
def create_post(payload: PostCreate, authorization: str | None = Header(None)):
    with get_session() as db:
        require_handle(authorization, payload.handle)
        # Phase 4b-3: Use cached query (MEDIUM_TERM, 300s)
        u = get_user_by_handle(db, payload.handle)
        p = Post(user_id=u.id, content=payload.content, symbol=payload.symbol)
        db.add(p)
        db.commit()  # Commit to get id and trigger default values
        db.refresh(p)  # Refresh to ensure created_at is populated

        post_out = PostOut(
            id=p.id,
            handle=u.handle,
            content=p.content,
            symbol=p.symbol,
            created_at=p.created_at.isoformat(),
            avatar_url=u.avatar_url,
        )

        # Phase 4d-2: Invalidate dogpile caches for posts and feeds
        invalidate_post_cache(p.id, u.id, payload.symbol)
        invalidate_all_feeds_for_followees(db, u.id)

        # Invalidate list_posts caches (first page for common limits)
        try:
            if hasattr(cache, "_redis") and cache._redis:
                for limit_val in [50, 100, 200]:
                    # Global feed first page
                    cache._redis.delete(f"posts:list:global:p1:l{limit_val}")

                    # Symbol-specific feed first page (if applicable)
                    if payload.symbol:
                        cache._redis.delete(
                            f"posts:list:{payload.symbol}:p1:l{limit_val}"
                        )

                # Invalidate follower feeds (get author's followers)
                follower_handles = [
                    row[0]
                    for row in db.execute(
                        select(User.handle)
                        .join(Follow, Follow.follower_id == User.id)
                        .where(Follow.followee_id == u.id)
                    ).all()
                ]

                # Only invalidate if follower count is reasonable (<= 100 for sync)
                # For high-follower-count users, rely on TTL expiration (2 minutes)
                if len(follower_handles) <= 100:
                    for follower_handle in follower_handles:
                        for limit_val in [50, 100, 200]:
                            # Invalidate global personal feed
                            cache._redis.delete(
                                f"feed:{follower_handle}:global:p1:l{limit_val}"
                            )

                            # Invalidate symbol-specific personal feed (if applicable)
                            if payload.symbol:
                                cache._redis.delete(
                                    f"feed:{follower_handle}:{payload.symbol}:p1:l{limit_val}"
                                )
        except Exception:
            pass  # Cache invalidation failure shouldn't block responses

        return post_out


@router.get("/social/posts", response_model=list[PostOut])
def list_posts(symbol: str | None = None, limit: int = 50, after_id: int | None = None):
    limit = max(1, min(200, limit))

    # Build cache key
    symbol_key = symbol if symbol else "global"
    cursor_key = "p1" if not after_id else f"after{after_id}"
    cache_key = f"posts:list:{symbol_key}:{cursor_key}:l{limit}"

    # Check cache
    try:
        if hasattr(cache, "_redis") and cache._redis:
            cached = cache._redis.get(cache_key)
            if cached:
                posts_data = json.loads(cached)
                return [PostOut(**post) for post in posts_data]
    except Exception:
        pass  # Cache failure shouldn't block responses

    # Cache miss - query database
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

        # Cache result with TTL
        # 60s for symbol-specific (more volatile), 120s for global (less volatile)
        try:
            if hasattr(cache, "_redis") and cache._redis:
                ttl = 60 if symbol else 120
                posts_json = json.dumps([p.dict() for p in out])
                cache._redis.setex(cache_key, ttl, posts_json)
        except Exception:
            pass  # Cache write failure shouldn't block responses

        return out


# ===== Feed (people I follow) =====
@router.get("/social/feed", response_model=list[PostOut])
def feed(
    handle: str, symbol: str | None = None, limit: int = 50, after_id: int | None = None
):
    limit = max(1, min(200, limit))

    # Build cache key
    symbol_key = symbol if symbol else "global"
    cursor_key = "p1" if not after_id else f"after{after_id}"
    cache_key = f"feed:{handle}:{symbol_key}:{cursor_key}:l{limit}"

    # Check cache
    try:
        if hasattr(cache, "_redis") and cache._redis:
            cached = cache._redis.get(cache_key)
            if cached:
                posts_data = json.loads(cached)
                return [PostOut(**post) for post in posts_data]
    except Exception:
        pass  # Cache failure shouldn't block responses

    # Cache miss - query database
    with get_session() as db:
        # Phase 4b-3: Use cached query (MEDIUM_TERM, 300s)
        me = get_user_by_handle(db, handle)

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

        # Cache result with TTL
        # 60s for symbol-specific (more volatile), 120s for global (less volatile)
        try:
            if hasattr(cache, "_redis") and cache._redis:
                ttl = 60 if symbol else 120
                posts_json = json.dumps([p.dict() for p in out])
                cache._redis.setex(cache_key, ttl, posts_json)
        except Exception:
            pass  # Cache write failure shouldn't block responses

        return out
