"""
Tests for Phase 6A optimized queries (Session 205).

Tests verify:
1. CTE-based feed query returns correct posts
2. Timestamp-based cursor pagination works
3. Symbol filtering works
4. User stats aggregation is accurate
5. Database indexes are created successfully
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.optimized_queries import (
    create_database_indexes,
    get_optimized_feed,
    get_optimized_feed_sqlalchemy,
    get_user_follower_stats,
)
from app.db.db import get_session
from app.db.models import Follow, Post, User


@pytest.fixture
def sample_users():
    """Create test users."""
    # First, clean up any existing test users and their posts in a separate session
    test_handles = ["alice", "bob", "charlie", "diana"]
    with get_session() as db:
        # Get IDs of test users before deleting
        test_user_ids = db.query(User.id).filter(User.handle.in_(test_handles)).all()
        test_user_ids = (
            [id_tuple[0] for id_tuple in test_user_ids] if test_user_ids else []
        )

        # Delete their posts first
        if test_user_ids:
            db.query(Post).filter(Post.user_id.in_(test_user_ids)).delete()

        # Delete the users
        for handle in test_handles:
            db.query(User).filter(User.handle == handle).delete(
                synchronize_session="fetch"
            )
        db.commit()

    # Now create new users in a fresh session
    users_dict = {}
    with get_session() as db:
        users = [
            User(
                handle="alice",
                avatar_url="https://example.com/alice.jpg",
                bio="Alice bio",
            ),
            User(handle="bob", avatar_url="https://example.com/bob.jpg", bio="Bob bio"),
            User(
                handle="charlie",
                avatar_url="https://example.com/charlie.jpg",
                bio="Charlie bio",
            ),
            User(
                handle="diana",
                avatar_url="https://example.com/diana.jpg",
                bio="Diana bio",
            ),
        ]
        for u in users:
            db.add(u)
        db.commit()
        for u in users:
            db.refresh(u)
            users_dict[u.handle] = {"id": u.id, "handle": u.handle}
    return users_dict


@pytest.fixture
def sample_follows(sample_users):
    """Create follow relationships."""
    alice_id = sample_users["alice"]["id"]
    bob_id = sample_users["bob"]["id"]
    charlie_id = sample_users["charlie"]["id"]

    with get_session() as db:
        # Clean up any existing follows between test users
        db.query(Follow).filter(
            Follow.follower_id.in_([alice_id, bob_id, charlie_id])
            | Follow.followee_id.in_([alice_id, bob_id, charlie_id])
        ).delete()
        db.commit()

        # Alice follows Bob and Charlie
        db.add(Follow(follower_id=alice_id, followee_id=bob_id))
        db.add(Follow(follower_id=alice_id, followee_id=charlie_id))
        db.commit()


@pytest.fixture
def sample_posts(sample_users):
    """Create sample posts."""
    bob_id = sample_users["bob"]["id"]
    charlie_id = sample_users["charlie"]["id"]
    diana_id = sample_users["diana"]["id"]

    with get_session() as db:
        # Clean up any existing posts by test users
        db.query(Post).filter(Post.user_id.in_([bob_id, charlie_id, diana_id])).delete()
        db.commit()

        posts = [
            Post(
                user_id=bob_id,
                content="Bob's first post about AAPL",
                symbol="AAPL",
                created_at=datetime.now() - timedelta(hours=3),
            ),
            Post(
                user_id=charlie_id,
                content="Charlie's tech thoughts",
                symbol=None,
                created_at=datetime.now() - timedelta(hours=2),
            ),
            Post(
                user_id=bob_id,
                content="Bob's second post about GOOGL",
                symbol="GOOGL",
                created_at=datetime.now() - timedelta(hours=1),
            ),
            Post(
                user_id=diana_id,
                content="Diana's post (not followed by Alice)",
                symbol="MSFT",
                created_at=datetime.now() - timedelta(minutes=30),
            ),
        ]
        for p in posts:
            db.add(p)
        db.commit()
        for p in posts:
            db.refresh(p)
        return posts


class TestOptimizedFeedQuery:
    """Test optimized feed query."""

    def test_get_optimized_feed_basic(self, sample_users, sample_follows, sample_posts):
        """Test basic feed retrieval without filters."""
        alice_id = sample_users["alice"]["id"]

        with get_session() as db:
            posts = get_optimized_feed(db, user_id=str(alice_id))

        # Alice follows Bob and Charlie, so should see 3 posts (2 from Bob, 1 from Charlie)
        assert len(posts) == 3
        assert all("id" in p and "content" in p for p in posts)
        # Most recent first
        assert posts[0]["content"] == "Bob's second post about GOOGL"

    def test_get_optimized_feed_symbol_filter(
        self, sample_users, sample_follows, sample_posts
    ):
        """Test feed with symbol filter."""
        alice_id = sample_users["alice"]["id"]

        with get_session() as db:
            posts = get_optimized_feed(db, user_id=str(alice_id), symbol="AAPL")

        # Only AAPL posts from followees
        assert len(posts) == 1
        assert posts[0]["content"] == "Bob's first post about AAPL"
        assert posts[0]["symbol"] == "AAPL"

    def test_get_optimized_feed_timestamp_cursor(
        self, sample_users, sample_follows, sample_posts
    ):
        """Test timestamp-based cursor pagination."""
        alice_id = sample_users["alice"]["id"]

        with get_session() as db:
            # Get all posts first
            all_posts = get_optimized_feed(db, user_id=str(alice_id))
            assert len(all_posts) == 3

            # Get posts created before the second post
            cursor_time = all_posts[1]["created_at"]  # "2 hours old" post
            older_posts = get_optimized_feed(
                db, user_id=str(alice_id), after_timestamp=cursor_time
            )

            # Should get posts older than cursor (1 post older than 2-hour mark)
            assert len(older_posts) == 1
            assert older_posts[0]["content"] == "Bob's first post about AAPL"

    def test_get_optimized_feed_limit(self, sample_users, sample_follows, sample_posts):
        """Test limit parameter."""
        alice_id = sample_users["alice"]["id"]

        with get_session() as db:
            posts = get_optimized_feed(db, user_id=str(alice_id), limit=2)

        assert len(posts) == 2
        # Most recent first
        assert posts[0]["content"] == "Bob's second post about GOOGL"

    def test_get_optimized_feed_no_posts(self, sample_users):
        """Test feed for user with no following."""
        diana_id = sample_users["diana"]["id"]

        with get_session() as db:
            posts = get_optimized_feed(db, user_id=str(diana_id))

        # Diana follows no one
        assert len(posts) == 0

    def test_get_optimized_feed_sqlalchemy_equivalence(
        self, sample_users, sample_follows, sample_posts
    ):
        """Test that SQLAlchemy and raw SQL implementations match."""
        alice_id = sample_users["alice"]["id"]

        with get_session() as db:
            # Raw SQL version
            raw_posts = get_optimized_feed(db, user_id=str(alice_id))

            # SQLAlchemy version
            sqlalchemy_results = get_optimized_feed_sqlalchemy(
                db, user_id=str(alice_id)
            )
            sqlalchemy_posts = [
                {
                    "id": p.id,
                    "user_id": str(p.user_id),
                    "content": p.content,
                    "symbol": p.symbol,
                    "created_at": p.created_at.isoformat(),
                    "handle": u.handle,
                    "avatar_url": u.avatar_url,
                }
                for p, u in sqlalchemy_results
            ]

        # Should have same count
        assert len(raw_posts) == len(sqlalchemy_posts)

        # Should have same posts (in same order)
        for raw, sa in zip(raw_posts, sqlalchemy_posts, strict=True):
            assert raw["id"] == sa["id"]
            assert raw["content"] == sa["content"]


class TestUserFollowerStats:
    """Test optimized user follower statistics."""

    def test_get_user_follower_stats_basic(self, sample_users, sample_follows):
        """Test accurate follower count calculations."""
        alice_id = sample_users["alice"]["id"]
        bob_id = sample_users["bob"]["id"]

        with get_session() as db:
            # Refresh to ensure relationships are loaded
            alice_stats = get_user_follower_stats(db, str(alice_id))
            bob_stats = get_user_follower_stats(db, str(bob_id))

        # Alice follows 2 people, has 0 followers
        assert alice_stats["following"] == 2
        assert alice_stats["followers"] == 0
        assert alice_stats["posts"] == 0

        # Bob has 1 follower (Alice), follows 0 people, has 0 posts (created 1 post earlier)
        assert bob_stats["following"] == 0
        assert bob_stats["followers"] == 1

    def test_get_user_follower_stats_with_posts(
        self, sample_users, sample_follows, sample_posts
    ):
        """Test stats with posts included."""
        bob_id = sample_users["bob"]["id"]

        with get_session() as db:
            stats = get_user_follower_stats(db, str(bob_id))

        # Bob has 1 follower, 0 following, 2 posts
        assert stats["followers"] == 1
        assert stats["following"] == 0
        assert stats["posts"] == 2

    def test_get_user_follower_stats_zero_counts(self, sample_users):
        """Test stats for user with no relationships."""
        diana_id = sample_users["diana"]["id"]

        with get_session() as db:
            stats = get_user_follower_stats(db, str(diana_id))

        assert stats["following"] == 0
        assert stats["followers"] == 0
        assert stats["posts"] == 0


class TestDatabaseIndexes:
    """Test database index creation."""

    def test_create_database_indexes(self):
        """Test that all required indexes are created."""
        with get_session() as db:
            results = create_database_indexes(db)

        # All indexes should be created successfully
        assert results["idx_follows_follower_followee"] is True
        assert results["idx_follows_followee_id"] is True
        assert results["idx_posts_user_created_desc"] is True
        assert results["idx_posts_symbol_created"] is True

    def test_create_database_indexes_idempotent(self):
        """Test that creating indexes twice doesn't fail (idempotent)."""
        with get_session() as db:
            # First creation
            results1 = create_database_indexes(db)
            # Second creation (should reuse indexes)
            results2 = create_database_indexes(db)

        # Both should succeed
        assert all(results1.values())
        assert all(results2.values())


class TestPerformanceCharacteristics:
    """Performance-related tests (informational)."""

    def test_feed_query_execution_time(
        self, sample_users, sample_follows, sample_posts
    ):
        """Test that optimized feed query executes quickly (informational)."""
        import time

        alice_id = sample_users["alice"]["id"]

        with get_session() as db:
            start = time.perf_counter()
            posts = get_optimized_feed(db, user_id=str(alice_id))
            elapsed_ms = (time.perf_counter() - start) * 1000

        # Should complete in <100ms (cold run, no cache)
        # Note: This is informational; actual performance depends on system load
        assert len(posts) == 3
        # Don't hard-fail on timing - just log for visibility
        print(
            f"\nOptimized feed query executed in {elapsed_ms:.2f}ms ({len(posts)} posts)"
        )

    def test_user_stats_query_execution_time(
        self, sample_users, sample_follows, sample_posts
    ):
        """Test that stats query executes quickly (informational)."""
        import time

        bob_id = sample_users["bob"]["id"]

        with get_session() as db:
            start = time.perf_counter()
            stats = get_user_follower_stats(db, str(bob_id))
            elapsed_ms = (time.perf_counter() - start) * 1000

        print(f"\nUser stats query executed in {elapsed_ms:.2f}ms")
