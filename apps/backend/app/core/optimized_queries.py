"""
Optimized database queries for Phase 6A performance improvements.

This module provides high-performance query implementations using:
- CTE (Common Table Expressions) for efficient multi-step queries
- Timestamp-based cursor pagination (vs UUID-based)
- Efficient JOIN patterns to minimize result set size
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import and_, desc, func, select, text
from sqlalchemy.orm import Session

from app.db.models import Follow, Post, User

__all__ = [
    "create_database_indexes",
    "get_optimized_feed",
    "get_user_follower_stats",
]


def create_database_indexes(session: Session) -> dict[str, bool]:
    """
    Create performance-critical database indexes.

    Returns:
        Dictionary mapping index names to creation status (True = created or existed)
    """
    results = {}

    # Index 1: Composite index on follows (follower_id, followee_id)
    # Used for: Fast lookup of "does user A follow user B?"
    try:
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_follows_follower_followee
            ON follows(follower_id, followee_id);
            """))
        results["idx_follows_follower_followee"] = True
    except Exception as e:
        results["idx_follows_follower_followee"] = False

    # Index 2: Composite index on posts (user_id, created_at DESC)
    # Used for: Efficient ordered feed retrieval from specific users
    try:
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_posts_user_created_desc
            ON posts(user_id, created_at DESC);
            """))
        results["idx_posts_user_created_desc"] = True
    except Exception as e:
        results["idx_posts_user_created_desc"] = False

    # Index 3: Index on follows.followee_id for reverse follower lookups
    # Used for: Finding all followers of a user
    try:
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_follows_followee_id
            ON follows(followee_id);
            """))
        results["idx_follows_followee_id"] = True
    except Exception as e:
        results["idx_follows_followee_id"] = False

    # Index 4: Index on posts.symbol for symbol-filtered feeds
    # Used for: Fast filtering of posts by trading symbol
    try:
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_posts_symbol_created
            ON posts(symbol, created_at DESC) WHERE symbol IS NOT NULL;
            """))
        results["idx_posts_symbol_created"] = True
    except Exception as e:
        results["idx_posts_symbol_created"] = False

    session.commit()
    return results


def get_user_follower_stats(session: Session, user_id: str) -> dict[str, int]:
    """
    Get follower statistics for a user (optimized query).

    This replaces the three separate COUNT queries with a single aggregate query.

    Args:
        session: SQLAlchemy session
        user_id: User UUID

    Returns:
        Dictionary with counts: {"following": int, "followers": int, "posts": int}
    """
    # Use subqueries to avoid join multiplication issues
    following_subq = (
        select(func.count(Follow.id)).where(Follow.follower_id == user_id).subquery()
    )
    followers_subq = (
        select(func.count(Follow.id)).where(Follow.followee_id == user_id).subquery()
    )
    posts_subq = select(func.count(Post.id)).where(Post.user_id == user_id).subquery()

    result = session.execute(select(following_subq, followers_subq, posts_subq)).first()

    if not result:
        return {"following": 0, "followers": 0, "posts": 0}

    following_count, followers_count, posts_count = result
    return {
        "following": int(following_count) if following_count else 0,
        "followers": int(followers_count) if followers_count else 0,
        "posts": int(posts_count) if posts_count else 0,
    }


def get_optimized_feed(
    session: Session,
    user_id: str,
    symbol: str | None = None,
    after_timestamp: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Get personalized feed using optimized CTE and timestamp-based pagination.

    Session 205 Optimization:
    - Uses single CTE query (vs current 2-query pattern)
    - Timestamp-based cursor (vs UUID-based)
    - Composite indexes optimize JOIN performance
    - Returns only needed columns (no full object load)

    Args:
        session: SQLAlchemy session
        user_id: User ID to fetch feed for
        symbol: Optional symbol filter (e.g., "AAPL")
        after_timestamp: ISO timestamp for cursor pagination (for posts before this time)
        limit: Maximum posts to return (1-200)

    Returns:
        List of post dicts with minimal columns: {id, user_id, content, symbol, created_at, handle, avatar_url}
    """
    # Sanitize limit
    limit = max(1, min(200, limit))

    # Parse cursor timestamp if provided
    cursor_time = None
    if after_timestamp:
        try:
            cursor_time = datetime.fromisoformat(after_timestamp)
        except (ValueError, TypeError):
            cursor_time = None

    # Build the CTE query using raw SQL for clarity
    # This approach is more explicit about the join strategy
    query_str = """
    WITH followees AS (
        SELECT DISTINCT followee_id FROM follows WHERE follower_id = :user_id
    ),
    candidates AS (
        SELECT
            p.id,
            p.user_id,
            p.content,
            p.symbol,
            p.created_at,
            u.handle,
            u.avatar_url
        FROM posts p
        INNER JOIN users u ON u.id = p.user_id
        WHERE p.user_id IN (SELECT followee_id FROM followees)
    """

    # Add optional filters
    filters = []
    params = {"user_id": user_id}

    if cursor_time:
        filters.append("AND p.created_at < :cursor_time")
        params["cursor_time"] = cursor_time

    if symbol:
        filters.append("AND p.symbol = :symbol")
        params["symbol"] = symbol

    # Build WHERE clause
    where_clause = " ".join(filters) if filters else ""
    if where_clause:
        query_str += where_clause

    # Add ordering and limit
    query_str += """
    )
    SELECT * FROM candidates
    ORDER BY created_at DESC
    LIMIT :limit
    """
    params["limit"] = limit

    # Execute the optimized query
    result = session.execute(text(query_str), params)

    # Convert rows to dictionaries
    posts = []
    for row in result:
        # Handle created_at which may be a datetime or string from CTE
        created_at = row.created_at
        if hasattr(created_at, "isoformat"):  # It's a datetime object
            created_at = created_at.isoformat()
        # else: it's already a string from the CTE query

        posts.append(
            {
                "id": row.id,
                "user_id": str(row.user_id),
                "content": row.content,
                "symbol": row.symbol,
                "created_at": created_at,
                "handle": row.handle,
                "avatar_url": row.avatar_url,
            }
        )

    return posts


def get_optimized_feed_sqlalchemy(
    session: Session,
    user_id: str,
    symbol: str | None = None,
    after_timestamp: str | None = None,
    limit: int = 50,
) -> list[tuple[Post, User]]:
    """
    Alternative CTE-based feed using SQLAlchemy query builder (vs raw SQL).

    More maintainable than raw SQL but may not be as efficient.
    Leave as fallback for comparison testing.

    Args:
        session: SQLAlchemy session
        user_id: User ID to fetch feed for
        symbol: Optional symbol filter
        after_timestamp: ISO timestamp for cursor pagination
        limit: Maximum posts to return (1-200)

    Returns:
        List of (Post, User) tuples
    """
    limit = max(1, min(200, limit))

    # Parse cursor timestamp
    cursor_time = None
    if after_timestamp:
        try:
            cursor_time = datetime.fromisoformat(after_timestamp)
        except (ValueError, TypeError):
            cursor_time = None

    # Get followee IDs as subquery
    followee_subquery = select(Follow.followee_id).where(Follow.follower_id == user_id)

    # Build main query
    stmt = select(Post, User).join(User, User.id == Post.user_id)

    # Filter to followee posts
    stmt = stmt.where(Post.user_id.in_(followee_subquery))

    # Optional filters
    if cursor_time:
        stmt = stmt.where(Post.created_at < cursor_time)

    if symbol:
        stmt = stmt.where(Post.symbol == symbol)

    # Order and limit
    stmt = stmt.order_by(desc(Post.created_at)).limit(limit)

    # Execute and return
    results = session.execute(stmt).all()
    return [(row.Post, row.User) for row in results]
