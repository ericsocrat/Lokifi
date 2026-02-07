"""Performance benchmarks for social features.

Tests the performance improvements from Phase 4C database optimizations:
- Follow table indexes (phase_3a_002 migration)
- Expected improvements: 5-50x faster for feed generation, follow checks, cache invalidation

Benchmark Categories:
1. Feed Generation: Test followee lookup performance (idx_follows_follower_id)
2. Follower Listings: Test follower lookup performance (idx_follows_followee_id)
3. is_following Checks: Test follow relationship lookups (idx_follows_follower_followee)
4. Cache Invalidation: Test follower query for feed cache invalidation

Usage:
    pytest benchmarks/test_social_performance.py -v --benchmark-only
    pytest benchmarks/test_social_performance.py --benchmark-compare
"""

import asyncio
import time
from collections.abc import Generator
from contextlib import contextmanager

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.database import get_sync_session
from app.db.models import Follow, Post, User


@contextmanager
def timer(name: str) -> Generator[dict]:
    """Context manager for timing operations."""
    result = {}
    start = time.perf_counter()
    try:
        yield result
    finally:
        result["elapsed"] = time.perf_counter() - start
        result["name"] = name


class TestFeedGenerationPerformance:
    """Benchmark feed generation queries that use idx_follows_follower_id."""

    def test_get_followees_for_feed(self, benchmark):
        """Benchmark: Get all followees for a user (feed generation).

        Optimized by: idx_follows_follower_id
        Expected: 10-50x faster with index vs sequential scan
        Query pattern: SELECT followee_id WHERE follower_id = X
        """

        def get_followees(user_id: int):
            with get_sync_session() as db:
                result = db.execute(
                    select(Follow.followee_id).where(Follow.follower_id == user_id)
                ).fetchall()
                return [row[0] for row in result]

        # Use first user as benchmark subject (assumes test data exists)
        with get_sync_session() as db:
            first_user = db.execute(select(User.id).limit(1)).scalar_one_or_none()
            if not first_user:
                pytest.skip("No test data available")

        # Benchmark the query
        result = benchmark(get_followees, first_user)

        # Assert reasonable performance (< 50ms with index for up to 1000 follows)
        assert benchmark.stats["mean"] < 0.050  # 50ms

    def test_feed_posts_generation(self, benchmark):
        """Benchmark: Generate personalized feed for a user.

        Optimized by: idx_follows_follower_id + idx_posts indexes
        Expected: Full feed generation < 100ms with indexes
        Query pattern: Get followees, then get their recent posts
        """

        def generate_feed(user_id: int, limit: int = 50):
            with get_sync_session() as db:
                # Step 1: Get followees (uses idx_follows_follower_id)
                followee_ids = db.execute(
                    select(Follow.followee_id).where(Follow.follower_id == user_id)
                ).fetchall()

                followee_id_list = [row[0] for row in followee_ids]

                if not followee_id_list:
                    return []

                # Step 2: Get recent posts from followees (uses idx_posts_user_id)
                posts = (
                    db.execute(
                        select(Post)
                        .where(Post.user_id.in_(followee_id_list))
                        .order_by(Post.created_at.desc())
                        .limit(limit)
                    )
                    .scalars()
                    .all()
                )

                return posts

        with get_sync_session() as db:
            # Find a user who follows others
            user_with_follows = db.execute(
                select(Follow.follower_id).limit(1)
            ).scalar_one_or_none()
            if not user_with_follows:
                pytest.skip("No follow relationships in test data")

        result = benchmark(generate_feed, user_with_follows, 50)

        # Assert reasonable performance (< 100ms for feed generation)
        assert benchmark.stats["mean"] < 0.100  # 100ms


class TestFollowerListingPerformance:
    """Benchmark follower listing queries that use idx_follows_followee_id."""

    def test_get_followers_list(self, benchmark):
        """Benchmark: Get all followers for a user.

        Optimized by: idx_follows_followee_id
        Expected: 20-100x faster with index vs sequential scan
        Query pattern: SELECT follower_id WHERE followee_id = X
        """

        def get_followers(user_id: int):
            with get_sync_session() as db:
                result = db.execute(
                    select(Follow.follower_id).where(Follow.followee_id == user_id)
                ).fetchall()
                return [row[0] for row in result]

        with get_sync_session() as db:
            # Find a user who has followers
            user_with_followers = db.execute(
                select(Follow.followee_id).limit(1)
            ).scalar_one_or_none()
            if not user_with_followers:
                pytest.skip("No follow relationships in test data")

        result = benchmark(get_followers, user_with_followers)

        # Assert reasonable performance (< 50ms with index)
        assert benchmark.stats["mean"] < 0.050  # 50ms

    def test_cache_invalidation_follower_lookup(self, benchmark):
        """Benchmark: Get followers for cache invalidation (post creation).

        Optimized by: idx_follows_followee_id
        Expected: Critical for post creation performance (called on every post)
        Query pattern: Same as get_followers, but specifically for cache invalidation
        """

        def get_followers_for_cache_invalidation(author_id: int):
            with get_sync_session() as db:
                # This mirrors the query in social.py line 321-328
                follower_ids = db.execute(
                    select(User.id)
                    .join(Follow, Follow.follower_id == User.id)
                    .where(Follow.followee_id == author_id)
                ).fetchall()
                return [row[0] for row in follower_ids]

        with get_sync_session() as db:
            user_with_followers = db.execute(
                select(Follow.followee_id).limit(1)
            ).scalar_one_or_none()
            if not user_with_followers:
                pytest.skip("No follow relationships in test data")

        result = benchmark(get_followers_for_cache_invalidation, user_with_followers)

        # Assert critical performance (< 30ms for post creation to stay fast)
        assert benchmark.stats["mean"] < 0.030  # 30ms


class TestFollowCheckPerformance:
    """Benchmark is_following checks that use idx_follows_follower_followee."""

    def test_is_following_check(self, benchmark):
        """Benchmark: Check if user A follows user B.

        Optimized by: idx_follows_follower_followee (composite index)
        Expected: 5-10x faster with composite index
        Query pattern: WHERE follower_id = X AND followee_id = Y
        """

        def is_following(follower_id: int, followee_id: int):
            with get_sync_session() as db:
                result = db.execute(
                    select(func.count()).where(
                        Follow.follower_id == follower_id,
                        Follow.followee_id == followee_id,
                    )
                ).scalar()
                return result > 0

        with get_sync_session() as db:
            # Get a valid follow relationship
            follow = db.execute(select(Follow).limit(1)).scalar_one_or_none()
            if not follow:
                pytest.skip("No follow relationships in test data")

            follower_id = follow.follower_id
            followee_id = follow.followee_id

        result = benchmark(is_following, follower_id, followee_id)

        # Assert critical performance (< 10ms for UI responsiveness)
        assert benchmark.stats["mean"] < 0.010  # 10ms

    def test_batch_follow_checks(self, benchmark):
        """Benchmark: Check follow status for multiple users (bulk operation).

        Optimized by: idx_follows_follower_followee
        Expected: Efficient for checking follow status in user lists
        Use case: Showing "Following" badges in user search results
        """

        def batch_is_following(current_user_id: int, target_user_ids: list[int]):
            with get_sync_session() as db:
                # Get all follow relationships in one query
                follows = db.execute(
                    select(Follow.followee_id).where(
                        Follow.follower_id == current_user_id,
                        Follow.followee_id.in_(target_user_ids),
                    )
                ).fetchall()

                following_ids = {row[0] for row in follows}
                return [uid in following_ids for uid in target_user_ids]

        with get_sync_session() as db:
            # Get a user and some potential followees
            follower = db.execute(
                select(Follow.follower_id).limit(1)
            ).scalar_one_or_none()
            target_users = db.execute(select(User.id).limit(10)).scalars().all()

            if not follower or not target_users:
                pytest.skip("Insufficient test data")

        result = benchmark(batch_is_following, follower, target_users)

        # Assert batch performance (< 50ms for 10 users)
        assert benchmark.stats["mean"] < 0.050  # 50ms


class TestComparisonMetrics:
    """Comparison tests to measure actual speedup from indexes."""

    def test_index_effectiveness_comparison(self):
        """Manual test: Compare query plans with/without indexes.

        Run with: pytest benchmarks/test_social_performance.py::TestComparisonMetrics -v -s

        This test prints EXPLAIN ANALYZE output to show index usage.
        Compare execution time and "Index Scan" vs "Seq Scan" in output.
        """
        with get_sync_session() as db:
            # Get a valid user
            user = db.execute(select(User).limit(1)).scalar_one_or_none()
            if not user:
                pytest.skip("No test data")

            print("\n\n=== Feed Generation Query (idx_follows_follower_id) ===")
            # PostgreSQL EXPLAIN ANALYZE
            result = db.execute(f"""
                EXPLAIN ANALYZE
                SELECT followee_id FROM follows WHERE follower_id = {user.id}
                """).fetchall()
            for row in result:
                print(row[0])

            print("\n\n=== Follower Listing Query (idx_follows_followee_id) ===")
            result = db.execute(f"""
                EXPLAIN ANALYZE  
                SELECT follower_id FROM follows WHERE followee_id = {user.id}
                """).fetchall()
            for row in result:
                print(row[0])

            print("\n\n=== is_following Query (idx_follows_follower_followee) ===")
            result = db.execute(f"""
                EXPLAIN ANALYZE
                SELECT COUNT(*) FROM follows 
                WHERE follower_id = {user.id} AND followee_id = {user.id}
                """).fetchall()
            for row in result:
                print(row[0])

            print("\n")


# pytest-benchmark configuration
# Run with: pytest benchmarks/test_social_performance.py -v --benchmark-only
# Compare runs: pytest benchmarks/test_social_performance.py --benchmark-compare
# Save baseline: pytest benchmarks/test_social_performance.py --benchmark-save=baseline
