"""
Query caching layer for core models: User, Portfolio, and related queries.

This module implements Layer 2 of Phase 4a query result caching:
- User.by_handle() and User.by_id() queries
- Portfolio positions and holdings
- User relationships (followers, following)
- Cache invalidation on mutations

Uses @cached_query decorator from query_cache.py with appropriate cache regions:
- User queries: MEDIUM_TERM (300s) - profile updates are infrequent
- Portfolio queries: MEDIUM_TERM (300s) - positions update on trades
- Feed/Social: SHORT_TERM (60s) - high volatility
"""

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.query_cache import (
    cached_query,
    invalidate_cache,
    invalidate_cache_pattern,
    long_term_cache,
    medium_term_cache,
    short_term_cache,
)
from app.db.models import Follow, PortfolioPosition, User

logger = logging.getLogger(__name__)


# ============================================================================
# USER QUERIES
# ============================================================================


@cached_query(region=medium_term_cache)
def get_user_by_handle(db: Session, handle: str) -> User | None:
    """
    Get user by handle with caching.

    Cache key: user:handle:{handle}
    TTL: 300 seconds (MEDIUM_TERM)
    Invalidation: On user profile update, handle change

    Args:
        db: Database session
        handle: User handle (username)

    Returns:
        User object or None if not found
    """
    return db.query(User).filter(User.handle == handle).first()


@cached_query(region=medium_term_cache)
def get_user_by_id(db: Session, user_id: int) -> User | None:
    """
    Get user by ID with caching.

    Cache key: user:id:{user_id}
    TTL: 300 seconds (MEDIUM_TERM)
    Invalidation: On user profile update

    Args:
        db: Database session
        user_id: User ID

    Returns:
        User object or None if not found
    """
    return db.query(User).filter(User.id == user_id).first()


@cached_query(region=medium_term_cache)
def get_user_by_email(db: Session, email: str) -> User | None:
    """
    Get user by email with caching.

    Note: User model doesn't have an email field currently.
    This function is provided for future compatibility.

    Args:
        db: Database session
        email: User email address (not used, placeholder)

    Returns:
        None (email field not available in User model)
    """
    # User model doesn't have email field - this is a placeholder for future
    return None


# ============================================================================
# PORTFOLIO QUERIES (PortfolioPosition)
# ============================================================================


@cached_query(region=medium_term_cache)
def get_portfolio_positions(db: Session, user_id: int) -> list[PortfolioPosition]:
    """
    Get all positions for a user with caching.

    Cache key: portfolio:positions:{user_id}
    TTL: 300 seconds (MEDIUM_TERM)
    Invalidation: On any position add/update/delete

    Args:
        db: Database session
        user_id: User ID

    Returns:
        List of PortfolioPosition objects
    """
    return (
        db.query(PortfolioPosition).filter(PortfolioPosition.user_id == user_id).all()
    )


@cached_query(region=medium_term_cache)
def get_position_by_symbol(
    db: Session, user_id: int, symbol: str
) -> PortfolioPosition | None:
    """
    Get a specific position for a user by symbol with caching.

    Cache key: portfolio:position:{user_id}:{symbol}
    TTL: 300 seconds (MEDIUM_TERM)
    Invalidation: On position update/delete

    Args:
        db: Database session
        user_id: User ID
        symbol: Asset symbol (e.g., 'BTC', 'AAPL')

    Returns:
        PortfolioPosition object or None if not found
    """
    return (
        db.query(PortfolioPosition)
        .filter(
            PortfolioPosition.user_id == user_id,
            PortfolioPosition.symbol == symbol,
        )
        .first()
    )


# ============================================================================
# FOLLOW RELATIONSHIP QUERIES
# ============================================================================


@cached_query(region=short_term_cache)
def get_follower_count(db: Session, user_id: int) -> int:
    """
    Get follower count for a user with caching.

    Cache key: social:followers:count:{user_id}
    TTL: 60 seconds (SHORT_TERM) - high volatility
    Invalidation: On follow/unfollow

    Args:
        db: Database session
        user_id: User ID

    Returns:
        Follower count
    """
    return db.query(Follow).filter(Follow.followee_id == user_id).count()


@cached_query(region=short_term_cache)
def get_following_count(db: Session, user_id: int) -> int:
    """
    Get following count for a user with caching.

    Cache key: social:following:count:{user_id}
    TTL: 60 seconds (SHORT_TERM) - high volatility
    Invalidation: On follow/unfollow

    Args:
        db: Database session
        user_id: User ID

    Returns:
        Following count
    """
    return db.query(Follow).filter(Follow.follower_id == user_id).count()


@cached_query(region=short_term_cache)
def is_following(db: Session, follower_id: int, followee_id: int) -> bool:
    """
    Check if one user follows another with caching.

    Cache key: social:follows:{follower_id}:{followee_id}
    TTL: 60 seconds (SHORT_TERM) - high volatility
    Invalidation: On follow/unfollow

    Args:
        db: Database session
        follower_id: Follower user ID
        followee_id: Followee user ID

    Returns:
        True if follower_id follows followee_id
    """
    return (
        db.query(Follow)
        .filter(
            Follow.follower_id == follower_id,
            Follow.followee_id == followee_id,
        )
        .first()
        is not None
    )


# ============================================================================
# CACHE INVALIDATION HELPERS
# ============================================================================


def invalidate_user_cache(user_id: int) -> None:
    """
    Invalidate all cached data for a user.

    Called when user profile is updated (handle, bio, avatar, etc.)

    Args:
        user_id: User ID to invalidate
    """
    invalidate_cache_pattern("user:*")
    invalidate_cache_pattern(f"portfolio:user:{user_id}*")
    invalidate_cache_pattern(f"social:*:{user_id}*")
    logger.info(f"Invalidated cache for user {user_id}")


def invalidate_portfolio_cache(user_id: int) -> None:
    """
    Invalidate all cached portfolio data for a user.

    Called when portfolio positions are added/updated/deleted.

    Args:
        user_id: User ID to invalidate
    """
    invalidate_cache_pattern(f"portfolio:user:{user_id}*")
    invalidate_cache_pattern(f"portfolio:positions:{user_id}*")
    invalidate_cache_pattern(f"portfolio:position:{user_id}*")
    logger.info(f"Invalidated portfolio cache for user {user_id}")


def invalidate_follow_cache(follower_id: int, followee_id: int) -> None:
    """
    Invalidate follow relationship caches.

    Called when a follow/unfollow action occurs.

    Args:
        follower_id: Follower user ID
        followee_id: Followee user ID
    """
    invalidate_cache_pattern(f"social:followers:count:{followee_id}*")
    invalidate_cache_pattern(f"social:following:count:{follower_id}*")
    invalidate_cache_pattern(f"social:follows:{follower_id}:{followee_id}*")
    logger.info(f"Invalidated follow cache: {follower_id} -> {followee_id}")


__all__ = [
    "get_follower_count",
    "get_following_count",
    "get_portfolio_positions",
    "get_position_by_symbol",
    "get_user_by_email",
    "get_user_by_handle",
    "get_user_by_id",
    "invalidate_follow_cache",
    "invalidate_portfolio_cache",
    "invalidate_user_cache",
    "is_following",
]
