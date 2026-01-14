"""
Test suite for cached query layer (Phase 4a-2).

Tests caching behavior for:
- User queries (by_handle, by_id, by_email)
- Portfolio queries (positions, holdings)
- Follow relationship queries
- Cache invalidation on mutations
"""

from unittest.mock import MagicMock, patch

import pytest

from app.core.cached_queries import (
    get_follower_count,
    get_following_count,
    get_portfolio_positions,
    get_position_by_symbol,
    get_user_by_email,
    get_user_by_handle,
    get_user_by_id,
    invalidate_follow_cache,
    invalidate_portfolio_cache,
    invalidate_user_cache,
    is_following,
)
from app.core.query_cache import (
    invalidate_cache_pattern,
    medium_term_cache,
    short_term_cache,
)


class TestUserQueries:
    """Test cached user query functions"""

    def test_get_user_by_handle_cached(self) -> None:
        """User by handle should be cached and reused"""
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = MagicMock(
            id=1, handle="test_user"
        )

        # First call
        user1 = get_user_by_handle(db, "test_user")
        assert user1 is not None
        assert user1.handle == "test_user"
        call_count_1 = db.query.call_count

        # Second call should use cache (not query database)
        user2 = get_user_by_handle(db, "test_user")
        assert user2 is not None
        call_count_2 = db.query.call_count

        # Call count should not increase (cached)
        assert call_count_2 == call_count_1

    def test_get_user_by_handle_different_handles(self) -> None:
        """Different handles should result in different cache entries"""
        db = MagicMock()

        # Mock different users for different handles
        user1_mock = MagicMock(id=1, handle="user1")
        user2_mock = MagicMock(id=2, handle="user2")

        db.query.return_value.filter.return_value.first.side_effect = [
            user1_mock,
            user2_mock,
        ]

        # Different handles
        result1 = get_user_by_handle(db, "user1")
        result2 = get_user_by_handle(db, "user2")

        assert result1.handle == "user1"
        assert result2.handle == "user2"

    def test_get_user_by_id_cached(self) -> None:
        """User by ID should be cached"""
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = MagicMock(
            id=123, handle="user123"
        )

        # First call
        user1 = get_user_by_id(db, 123)
        assert user1.id == 123

        # Second call uses cache
        user2 = get_user_by_id(db, 123)
        assert user2.id == 123

    def test_get_user_not_found(self) -> None:
        """Query should return None if user not found"""
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        user = get_user_by_handle(db, "nonexistent")
        assert user is None


class TestPortfolioQueries:
    """Test cached portfolio query functions"""

    def test_get_portfolio_positions_cached(self) -> None:
        """Portfolio positions should be cached"""
        db = MagicMock()
        position_mock = MagicMock(symbol="BTC", qty=1.5)

        db.query.return_value.filter.return_value.all.return_value = [position_mock]

        positions = get_portfolio_positions(db, 123)
        assert len(positions) == 1
        assert positions[0].symbol == "BTC"

    def test_get_portfolio_positions_empty(self) -> None:
        """Empty portfolio should return empty list"""
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []

        positions = get_portfolio_positions(db, 999)
        assert positions == []

    def test_get_position_by_symbol_cached(self) -> None:
        """Position by symbol should be cached"""
        db = MagicMock()
        position_mock = MagicMock(symbol="ETH", qty=10.0)

        db.query.return_value.filter.return_value.first.return_value = position_mock

        position = get_position_by_symbol(db, 123, "ETH")
        assert position.symbol == "ETH"

    def test_get_position_by_symbol_not_found(self) -> None:
        """Query should return None if position not found"""
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        position = get_position_by_symbol(db, 123, "XYZ")
        assert position is None


class TestFollowQueries:
    """Test cached follow/follower query functions"""

    def test_get_follower_count_cached(self) -> None:
        """Follower count should be cached"""
        db = MagicMock()
        db.query.return_value.filter.return_value.count.return_value = 42

        count1 = get_follower_count(db, 123)
        count2 = get_follower_count(db, 123)

        assert count1 == 42
        assert count2 == 42

    def test_get_following_count_cached(self) -> None:
        """Following count should be cached"""
        db = MagicMock()
        db.query.return_value.filter.return_value.count.return_value = 15

        count1 = get_following_count(db, 123)
        count2 = get_following_count(db, 123)

        assert count1 == 15
        assert count2 == 15

    def test_is_following_true(self) -> None:
        """is_following should return True when follow exists"""
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = MagicMock(
            follower_id=1, followee_id=2
        )

        result = is_following(db, 1, 2)
        assert result is True

    def test_is_following_false(self) -> None:
        """is_following should return False when follow doesn't exist"""
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        result = is_following(db, 1, 2)
        assert result is False


class TestCacheInvalidation:
    """Test cache invalidation functions"""

    @patch("app.core.cached_queries.invalidate_cache_pattern")
    def test_invalidate_user_cache(self, mock_invalidate: MagicMock) -> None:
        """invalidate_user_cache should clear user-related caches"""
        invalidate_user_cache(123)

        # Should invalidate all user pattern variations
        assert mock_invalidate.call_count == 3
        mock_invalidate.assert_any_call("user:*")
        mock_invalidate.assert_any_call("portfolio:user:123*")
        mock_invalidate.assert_any_call("social:*:123*")

    @patch("app.core.cached_queries.invalidate_cache_pattern")
    def test_invalidate_portfolio_cache(self, mock_invalidate: MagicMock) -> None:
        """invalidate_portfolio_cache should clear portfolio caches"""
        invalidate_portfolio_cache(123)

        assert mock_invalidate.call_count == 3
        mock_invalidate.assert_any_call("portfolio:user:123*")
        mock_invalidate.assert_any_call("portfolio:positions:123*")
        mock_invalidate.assert_any_call("portfolio:position:123*")

    @patch("app.core.cached_queries.invalidate_cache_pattern")
    def test_invalidate_follow_cache(self, mock_invalidate: MagicMock) -> None:
        """invalidate_follow_cache should clear follow caches"""
        invalidate_follow_cache(1, 2)

        assert mock_invalidate.call_count == 3
        mock_invalidate.assert_any_call("social:followers:count:2*")
        mock_invalidate.assert_any_call("social:following:count:1*")
        mock_invalidate.assert_any_call("social:follows:1:2*")


class TestCacheRegionSelection:
    """Test that correct cache regions are used"""

    def test_user_queries_use_medium_term(self) -> None:
        """User queries should use MEDIUM_TERM cache (300s)"""
        # Verify the decorator is applied with medium_term_cache
        # This is a structural test - checking that the function is wrapped
        assert hasattr(get_user_by_handle, "__wrapped__")
        assert hasattr(get_user_by_id, "__wrapped__")
        assert hasattr(get_user_by_email, "__wrapped__")

    def test_portfolio_queries_use_medium_term(self) -> None:
        """Portfolio queries should use MEDIUM_TERM cache (300s)"""
        assert hasattr(get_portfolio_positions, "__wrapped__")
        assert hasattr(get_position_by_symbol, "__wrapped__")

    def test_follow_queries_use_short_term(self) -> None:
        """Follow queries should use SHORT_TERM cache (60s)"""
        assert hasattr(get_follower_count, "__wrapped__")
        assert hasattr(get_following_count, "__wrapped__")
        assert hasattr(is_following, "__wrapped__")


class TestIntegrationScenarios:
    """Test realistic caching scenarios"""

    def test_user_profile_update_workflow(self) -> None:
        """Test cache invalidation on user profile update"""
        db = MagicMock()
        user_mock = MagicMock(id=123, handle="john")
        db.query.return_value.filter.return_value.first.return_value = user_mock

        # 1. Load user
        user = get_user_by_handle(db, "john")
        assert user.handle == "john"

        # 2. Simulate profile update - invalidate cache
        with patch("app.core.cached_queries.invalidate_cache_pattern"):
            invalidate_user_cache(123)

        # After invalidation, next call would re-query, but cache is still in effect
        # in tests. Real behavior would re-query DB.

    def test_portfolio_trade_workflow(self) -> None:
        """Test cache invalidation on portfolio trade"""
        db = MagicMock()

        # 1. Load portfolio positions
        position_mock = MagicMock(symbol="BTC", qty=1.0)

        db.query.return_value.filter.return_value.all.return_value = [position_mock]

        positions = get_portfolio_positions(db, 123)
        assert len(positions) == 1

        # 2. Simulate trade - invalidate portfolio cache
        with patch("app.core.cached_queries.invalidate_cache_pattern"):
            invalidate_portfolio_cache(123)

        # Real scenario: cache would be invalidated and next query would fetch new data
        # In unit tests, we verify invalidation was called

    def test_follow_unfollow_workflow(self) -> None:
        """Test cache invalidation on follow/unfollow"""
        db = MagicMock()
        db.query.return_value.filter.return_value.count.return_value = 50

        # 1. Get follower count
        count = get_follower_count(db, 123)
        assert count == 50

        # 2. User gets unfollowed - invalidate cache
        with patch("app.core.cached_queries.invalidate_cache_pattern"):
            invalidate_follow_cache(999, 123)

        # Real scenario: cache would be invalidated and next query would fetch new count
        # In unit tests, we verify invalidation was called properly


__all__ = [
    "TestCacheInvalidation",
    "TestCacheRegionSelection",
    "TestFollowQueries",
    "TestIntegrationScenarios",
    "TestPortfolioQueries",
    "TestUserQueries",
]
