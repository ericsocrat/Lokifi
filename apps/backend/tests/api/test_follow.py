"""
Comprehensive tests for app.routers.follow

Tests follow router endpoints: follow/unfollow, followers/following lists,
mutual follows, follow suggestions, statistics, and bulk operations.
Builds on follow_service tests from Session 30 Phase 3.

Coverage targets:
- Follow/unfollow operations (idempotent)
- Followers and following lists with pagination
- Mutual follows functionality
- Follow suggestions
- Follow statistics and activity
- Bulk follow/unfollow operations
- Edge cases and error handling
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.routers.follow import (
    bulk_follow_users,
    bulk_unfollow_users,
    follow_user,
    get_follow_status,
    get_follow_suggestions,
    get_mutual_follows,
    get_my_follow_activity,
    get_my_follow_stats,
    get_my_followers,
    get_my_following,
    get_user_follow_stats,
    get_user_followers,
    get_user_following,
    unfollow_user,
)
from app.schemas.follow import (
    FollowActionResponse,
    FollowActivityResponse,
    FollowersListResponse,
    FollowingListResponse,
    FollowStatsResponse,
    MutualFollowsResponse,
    SuggestedUsersResponse,
    UserFollowStatus,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_current_user():
    """Mock authenticated user"""
    user = MagicMock()
    user.id = uuid.uuid4()
    user.handle = "testuser"
    user.avatar_url = "https://example.com/avatar.jpg"
    return user


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    return MagicMock()


@pytest.fixture
def sample_follow_action_response():
    """Sample follow action response"""
    return FollowActionResponse(
        user_id=uuid.uuid4(),
        action="follow",
        is_following=True,
        follows_you=False,
        mutual_follow=False,
        follower_count=100,
        following_count=50,
        current_user_following_count=51,  # Added required field
    )


@pytest.fixture
def sample_followers_list():
    """Sample followers list with pagination"""
    follower = UserFollowStatus(
        user_id=uuid.uuid4(),
        username="follower1",
        display_name="Follower One",
        avatar_url="https://example.com/follower.jpg",
        is_following=False,
        follows_you=True,
        mutual_follow=False,
        created_at=datetime.now(timezone.utc),
    )

    return FollowersListResponse(
        followers=[follower],
        page=1,
        page_size=20,
        total=1,
        has_next=False,
    )


@pytest.fixture
def sample_following_list():
    """Sample following list with pagination"""
    following = UserFollowStatus(
        user_id=uuid.uuid4(),
        username="following1",
        display_name="Following One",
        avatar_url="https://example.com/following.jpg",
        is_following=True,
        follows_you=False,
        mutual_follow=False,
        created_at=datetime.now(timezone.utc),
    )

    return FollowingListResponse(
        following=[following],
        page=1,
        page_size=20,
        total=1,
        has_next=False,
    )


# ============================================================================
# TEST CLASS 1: Follow/Unfollow Operations
# ============================================================================


class TestFollowUnfollowOperations:
    @pytest.mark.asyncio
    @patch("app.routers.follow.trigger_follow_notification")
    @patch("app.routers.follow.FollowService")
    async def test_follow_user_success(
        self,
        mock_service_class,
        mock_trigger_notification,
        sample_follow_action_response,
        mock_current_user,
        mock_db_session,
    ):
        """✅ Test: Follow a user (first time follow)"""
        mock_service = MagicMock()
        target_user_id = uuid.uuid4()

        # User not yet following
        mock_service.is_following = AsyncMock(return_value=False)
        mock_service.follow_user = AsyncMock(return_value=None)
        mock_service.follow_action_response = AsyncMock(return_value=sample_follow_action_response)

        # Mock target user for notification
        target_user = MagicMock()
        target_user.id = target_user_id
        target_user.handle = "targetuser"
        target_user.avatar_url = "https://example.com/target.jpg"

        # Mock database query for target user
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=target_user)
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        mock_service_class.return_value = mock_service

        result = await follow_user(target_user_id, mock_current_user, mock_db_session)

        assert isinstance(result, FollowActionResponse)
        mock_service.follow_user.assert_awaited_once_with(mock_current_user.id, target_user_id)

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_follow_user_already_following(
        self,
        mock_service_class,
        sample_follow_action_response,
        mock_current_user,
        mock_db_session,
    ):
        """✅ Test: Follow a user (idempotent - already following)"""
        mock_service = MagicMock()
        target_user_id = uuid.uuid4()

        # User already following
        mock_service.is_following = AsyncMock(return_value=True)
        sample_follow_action_response.action = "noop"
        mock_service.follow_action_response = AsyncMock(return_value=sample_follow_action_response)

        mock_service_class.return_value = mock_service

        result = await follow_user(target_user_id, mock_current_user, mock_db_session)

        assert isinstance(result, FollowActionResponse)
        assert result.action == "noop"
        # follow_user should NOT be called if already following
        mock_service.follow_user.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_unfollow_user_success(
        self,
        mock_service_class,
        sample_follow_action_response,
        mock_current_user,
        mock_db_session,
    ):
        """✅ Test: Unfollow a user (first time unfollow)"""
        mock_service = MagicMock()
        target_user_id = uuid.uuid4()

        # User currently following
        mock_service.is_following = AsyncMock(return_value=True)
        mock_service.unfollow_user = AsyncMock(return_value=None)
        sample_follow_action_response.action = "unfollow"
        sample_follow_action_response.is_following = False
        mock_service.follow_action_response = AsyncMock(return_value=sample_follow_action_response)

        mock_service_class.return_value = mock_service

        result = await unfollow_user(target_user_id, mock_current_user, mock_db_session)

        assert isinstance(result, FollowActionResponse)
        assert result.action == "unfollow"
        assert result.is_following is False
        mock_service.unfollow_user.assert_awaited_once_with(mock_current_user.id, target_user_id)

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_unfollow_user_not_following(
        self,
        mock_service_class,
        sample_follow_action_response,
        mock_current_user,
        mock_db_session,
    ):
        """✅ Test: Unfollow a user (idempotent - not following)"""
        mock_service = MagicMock()
        target_user_id = uuid.uuid4()

        # User not following
        mock_service.is_following = AsyncMock(return_value=False)
        sample_follow_action_response.action = "noop"
        mock_service.follow_action_response = AsyncMock(return_value=sample_follow_action_response)

        mock_service_class.return_value = mock_service

        result = await unfollow_user(target_user_id, mock_current_user, mock_db_session)

        assert isinstance(result, FollowActionResponse)
        assert result.action == "noop"
        # unfollow_user should NOT be called if not following
        mock_service.unfollow_user.assert_not_called()


# ============================================================================
# TEST CLASS 2: Follow Status and Lists
# ============================================================================


class TestFollowStatusAndLists:
    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_follow_status_mutual(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get follow status (mutual follow)"""
        mock_service = MagicMock()
        target_user_id = uuid.uuid4()

        # Both users follow each other
        mock_service.is_following = AsyncMock(
            side_effect=[True, True]
        )  # Current → Target, Target → Current

        mock_service_class.return_value = mock_service

        result = await get_follow_status(target_user_id, mock_current_user, mock_db_session)

        assert result["user_id"] == target_user_id
        assert result["is_following"] is True
        assert result["follows_you"] is True
        assert result["mutual_follow"] is True

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_follow_status_one_way(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get follow status (one-way follow)"""
        mock_service = MagicMock()
        target_user_id = uuid.uuid4()

        # Only current user follows target
        mock_service.is_following = AsyncMock(side_effect=[True, False])

        mock_service_class.return_value = mock_service

        result = await get_follow_status(target_user_id, mock_current_user, mock_db_session)

        assert result["is_following"] is True
        assert result["follows_you"] is False
        assert result["mutual_follow"] is False

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_user_followers_success(
        self, mock_service_class, sample_followers_list, mock_current_user, mock_db_session
    ):
        """✅ Test: Get user's followers list"""
        mock_service = MagicMock()
        target_user_id = uuid.uuid4()

        mock_service.get_followers = AsyncMock(return_value=sample_followers_list)

        mock_service_class.return_value = mock_service

        result = await get_user_followers(
            target_user_id, page=1, page_size=20, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, FollowersListResponse)
        assert len(result.followers) == 1
        assert result.page == 1

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_user_following_success(
        self, mock_service_class, sample_following_list, mock_current_user, mock_db_session
    ):
        """✅ Test: Get user's following list"""
        mock_service = MagicMock()
        target_user_id = uuid.uuid4()

        mock_service.get_following = AsyncMock(return_value=sample_following_list)

        mock_service_class.return_value = mock_service

        result = await get_user_following(
            target_user_id, page=1, page_size=20, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, FollowingListResponse)
        assert len(result.following) == 1
        assert result.page == 1

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_my_followers_success(
        self, mock_service_class, sample_followers_list, mock_current_user, mock_db_session
    ):
        """✅ Test: Get current user's followers"""
        mock_service = MagicMock()

        mock_service.get_followers = AsyncMock(return_value=sample_followers_list)

        mock_service_class.return_value = mock_service

        result = await get_my_followers(
            page=1, page_size=20, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, FollowersListResponse)
        assert len(result.followers) == 1

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_my_following_success(
        self, mock_service_class, sample_following_list, mock_current_user, mock_db_session
    ):
        """✅ Test: Get current user's following"""
        mock_service = MagicMock()

        mock_service.get_following = AsyncMock(return_value=sample_following_list)

        mock_service_class.return_value = mock_service

        result = await get_my_following(
            page=1, page_size=20, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, FollowingListResponse)
        assert len(result.following) == 1


# ============================================================================
# TEST CLASS 3: Mutual Follows and Suggestions
# ============================================================================


class TestMutualFollowsAndSuggestions:
    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_mutual_follows_success(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get mutual follows between users"""
        mock_service = MagicMock()
        other_user_id = uuid.uuid4()

        mutual_user = UserFollowStatus(
            user_id=uuid.uuid4(),
            username="mutualfriend",
            display_name="Mutual Friend",
            avatar_url="https://example.com/mutual.jpg",
            is_following=True,
            follows_you=True,
            mutual_follow=True,
            created_at=datetime.now(timezone.utc),
        )

        mutual_response = MutualFollowsResponse(
            mutual_follows=[mutual_user],
            page=1,
            page_size=20,
            total=1,
            has_next=False,
        )

        mock_service.get_mutual_follows = AsyncMock(return_value=mutual_response)

        mock_service_class.return_value = mock_service

        result = await get_mutual_follows(
            other_user_id, page=1, page_size=20, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, MutualFollowsResponse)
        assert len(result.mutual_follows) == 1
        assert result.mutual_follows[0].username == "mutualfriend"

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_follow_suggestions_success(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get follow suggestions"""
        mock_service = MagicMock()

        suggested_user = UserFollowStatus(
            user_id=uuid.uuid4(),
            username="suggested",
            display_name="Suggested User",
            avatar_url="https://example.com/suggested.jpg",
            is_following=False,
            follows_you=False,
            mutual_follow=False,
            created_at=datetime.now(timezone.utc),
        )

        suggestions_response = SuggestedUsersResponse(
            suggestions=[suggested_user],
            reason="popular",  # Added required field
            page=1,
            page_size=10,
            total=1,
            has_next=False,
        )

        mock_service.get_follow_suggestions = AsyncMock(return_value=suggestions_response)

        mock_service_class.return_value = mock_service

        result = await get_follow_suggestions(
            page=1, page_size=10, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, SuggestedUsersResponse)
        assert len(result.suggestions) == 1
        assert result.suggestions[0].username == "suggested"


# ============================================================================
# TEST CLASS 4: Statistics and Activity
# ============================================================================


class TestStatisticsAndActivity:
    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_my_follow_stats_success(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get current user's follow statistics"""
        mock_service = MagicMock()

        stats = FollowStatsResponse(
            user_id=mock_current_user.id,
            username="testuser",  # Added required field
            display_name="Test User",  # Added required field
            follower_count=100,
            following_count=50,
            mutual_followers_count=20,  # Fixed field name
        )

        mock_service.get_follow_stats = AsyncMock(return_value=stats)

        mock_service_class.return_value = mock_service

        result = await get_my_follow_stats(current_user=mock_current_user, db=mock_db_session)

        assert isinstance(result, FollowStatsResponse)
        assert result.follower_count == 100
        assert result.following_count == 50

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_user_follow_stats_success(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get another user's follow statistics"""
        mock_service = MagicMock()
        target_user_id = uuid.uuid4()

        stats = FollowStatsResponse(
            user_id=target_user_id,
            username="targetuser",  # Added required field
            display_name="Target User",  # Added required field
            follower_count=500,
            following_count=200,
            mutual_followers_count=10,  # Fixed field name
        )

        mock_service.get_follow_stats = AsyncMock(return_value=stats)

        mock_service_class.return_value = mock_service

        result = await get_user_follow_stats(
            target_user_id, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, FollowStatsResponse)
        assert result.user_id == target_user_id
        assert result.follower_count == 500

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_my_follow_activity_success(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get current user's follow activity"""
        mock_service = MagicMock()

        activity = FollowActivityResponse(
            recent_followers=[],
            recent_following=[],
            follower_growth=5,  # Fixed field name (not recent_unfollows/activity_count)
            following_growth=3,  # Fixed field name
        )

        mock_service.get_follow_activity = AsyncMock(return_value=activity)

        mock_service_class.return_value = mock_service

        result = await get_my_follow_activity(current_user=mock_current_user, db=mock_db_session)

        assert isinstance(result, FollowActivityResponse)
        assert result.follower_growth == 5
        assert result.following_growth == 3


# ============================================================================
# TEST CLASS 5: Bulk Operations
# ============================================================================


class TestBulkOperations:
    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_bulk_follow_users_success(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Bulk follow multiple users"""
        mock_service = MagicMock()

        user_ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]

        # All follows succeed
        mock_service.follow_user = AsyncMock(return_value=None)

        mock_service_class.return_value = mock_service

        result = await bulk_follow_users(user_ids, mock_current_user, mock_db_session)

        assert result.success is True
        assert "Successfully followed 3 users" in result.message

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_bulk_follow_users_with_errors(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Bulk follow with some errors"""
        mock_service = MagicMock()

        user_ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]

        # First succeeds, second fails, third succeeds
        mock_service.follow_user = AsyncMock(
            side_effect=[
                None,
                HTTPException(status_code=404, detail="User not found"),
                None,
            ]
        )

        mock_service_class.return_value = mock_service

        result = await bulk_follow_users(user_ids, mock_current_user, mock_db_session)

        assert result.success is True  # At least one success
        assert "Successfully followed 2 users" in result.message
        assert "Errors:" in result.message

    @pytest.mark.asyncio
    async def test_bulk_follow_users_too_many(self, mock_current_user, mock_db_session):
        """✅ Test: Bulk follow exceeds limit (max 10)"""
        user_ids = [uuid.uuid4() for _ in range(11)]  # 11 users exceeds limit

        with pytest.raises(HTTPException) as exc_info:
            await bulk_follow_users(user_ids, mock_current_user, mock_db_session)

        assert exc_info.value.status_code == 400
        assert "Cannot follow more than 10 users" in exc_info.value.detail

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_bulk_unfollow_users_success(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Bulk unfollow multiple users"""
        mock_service = MagicMock()

        user_ids = [uuid.uuid4(), uuid.uuid4()]

        # All unfollows succeed
        mock_service.unfollow_user = AsyncMock(return_value=None)

        mock_service_class.return_value = mock_service

        result = await bulk_unfollow_users(user_ids, mock_current_user, mock_db_session)

        assert result.success is True
        assert "Successfully unfollowed 2 users" in result.message

    @pytest.mark.asyncio
    async def test_bulk_unfollow_users_too_many(self, mock_current_user, mock_db_session):
        """✅ Test: Bulk unfollow exceeds limit (max 10)"""
        user_ids = [uuid.uuid4() for _ in range(11)]

        with pytest.raises(HTTPException) as exc_info:
            await bulk_unfollow_users(user_ids, mock_current_user, mock_db_session)

        assert exc_info.value.status_code == 400
        assert "Cannot unfollow more than 10 users" in exc_info.value.detail


# ============================================================================
# TEST CLASS 6: Edge Cases
# ============================================================================


class TestEdgeCases:
    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_followers_empty_result(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get followers with empty result"""
        mock_service = MagicMock()
        target_user_id = uuid.uuid4()

        empty_list = FollowersListResponse(
            followers=[], page=1, page_size=20, total=0, has_next=False
        )

        mock_service.get_followers = AsyncMock(return_value=empty_list)

        mock_service_class.return_value = mock_service

        result = await get_user_followers(
            target_user_id, page=1, page_size=20, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, FollowersListResponse)
        assert len(result.followers) == 0
        assert result.total == 0

    @pytest.mark.asyncio
    @patch("app.routers.follow.FollowService")
    async def test_get_suggestions_empty_result(
        self, mock_service_class, mock_current_user, mock_db_session
    ):
        """✅ Test: Get follow suggestions with no suggestions"""
        mock_service = MagicMock()

        empty_suggestions = SuggestedUsersResponse(
            suggestions=[],
            reason="popular",  # Added required field
            page=1,
            page_size=10,
            total=0,
            has_next=False,
        )

        mock_service.get_follow_suggestions = AsyncMock(return_value=empty_suggestions)

        mock_service_class.return_value = mock_service

        result = await get_follow_suggestions(
            page=1, page_size=10, current_user=mock_current_user, db=mock_db_session
        )

        assert isinstance(result, SuggestedUsersResponse)
        assert len(result.suggestions) == 0
