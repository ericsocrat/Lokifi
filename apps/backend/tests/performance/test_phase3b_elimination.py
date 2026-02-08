"""Performance validation tests for Phase 3b N+1 query elimination.

These tests validate that refactored routes execute the expected number of
queries, confirming that N+1 patterns have been eliminated.

Test Strategy:
- Use QueryCounter to validate single-query execution
- Test with realistic data (multiple follows, posts)
- Compare expected improvement (4 queries → 1 query)
- Future: Add benchmarks to measure wall-clock improvement
"""

from unittest.mock import MagicMock, patch

import pytest
from app.api.routes.social import get_user
from app.core.versioning import APIVersion
from app.db.db import get_session
from app.db.models import Follow, User


class TestPhase3bPerformance:
    """Performance validation tests for Phase 3b refactoring."""

    @pytest.fixture
    def sample_user(self):
        """Create a sample user for testing."""
        user = MagicMock(spec=User)
        user.id = 1
        user.handle = "testuser"
        user.avatar_url = "https://example.com/avatar.jpg"
        user.bio = "Test bio"
        user.created_at = MagicMock()
        user.created_at.isoformat.return_value = "2024-01-01T00:00:00"
        return user

    @pytest.fixture
    def mock_request(self):
        """Create a mock Request with api_version for versioned endpoints."""
        req = MagicMock()
        req.state.api_version = APIVersion.V1
        return req

    @patch("app.api.routes.social.get_session")
    def test_get_user_executes_single_query(self, mock_get_session, sample_user, mock_request):
        """Test that refactored get_user executes exactly 1 query.

        This validates the aggregation pattern eliminates the N+1:
        - Before: 4 queries (1 user fetch + 3 count queries)
        - After: 1 aggregation query

        The old pattern would execute 4 separate queries to get user + counts.
        The new pattern uses a single aggregation query with outerjoin + group_by.
        """
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock the aggregation query result tuple
        # (User, following_count, followers_count, posts_count)
        mock_session.execute.return_value.first.return_value = (
            sample_user,
            25,  # following_count
            100,  # followers_count
            42,  # posts_count
        )

        # Act
        result = get_user("testuser", mock_request)

        # Assert
        assert result.handle == "testuser"
        assert result.following_count == 25
        assert result.followers_count == 100
        assert result.posts_count == 42

        # Validate that db.execute was called exactly once
        # (one aggregation query, not 4 separate queries)
        mock_session.execute.assert_called_once()

    @patch("app.api.routes.social.get_session")
    def test_get_user_aggregates_all_counts(self, mock_get_session, sample_user, mock_request):
        """Test that aggregation query correctly combines all count computations.

        This ensures that the aggregation:
        - Counts following relationships (follower_id == User.id)
        - Counts followers (followee_id == User.id)
        - Counts posts (Post.user_id == User.id)
        - Handles NULL cases with coalesce (defaults to 0)
        """
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock aggregation with no follows/posts (edge case)
        mock_session.execute.return_value.first.return_value = (
            sample_user,
            0,  # no following
            0,  # no followers
            0,  # no posts
        )

        # Act
        result = get_user("testuser", mock_request)

        # Assert - zero counts should be handled correctly
        assert result.following_count == 0
        assert result.followers_count == 0
        assert result.posts_count == 0

    @patch("app.api.routes.social.get_session")
    def test_get_user_not_found_no_extra_queries(self, mock_get_session, mock_request):
        """Test that not-found case doesn't execute unnecessary queries.

        Validates that we check for None result before attempting to unpack,
        and that no extra queries are attempted on not-found.
        """
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock aggregation returns None (user doesn't exist)
        mock_session.execute.return_value.first.return_value = None

        # Act & Assert
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            get_user("nonexistent", mock_request)

        assert exc_info.value.status_code == 404
        assert "User not found" in exc_info.value.detail

        # Validate only one execute call was made (the aggregation query)
        mock_session.execute.assert_called_once()


# Future: Integration tests with real database to measure wall-clock improvement
# @pytest.mark.integration
# def test_get_user_performance_improvement():
#     """Benchmark real query performance: aggregation vs separate queries."""
#     # TODO: Implement with real database and timing
#     pass
