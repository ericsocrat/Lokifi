"""
Router/Endpoint Tests for Social Routes (Session 65)

Tests: User profile operations, follow/unfollow, posts, and feed.
Pattern: FastAPI TestClient with database mocking.
Coverage Goal: +3-5pp (target 34-37% backend coverage)

Related Files:
- app/api/routes/social.py - Social router implementation
- app/services/profile_service.py - Profile business logic (Session 30: 43% coverage)
- app/services/follow_service.py - Follow business logic (Session 30: 40% coverage)
"""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_db_user():
    """Mock User database model"""
    user = MagicMock()
    user.id = 1
    user.handle = "testuser"
    user.avatar_url = "https://example.com/avatar.jpg"
    user.bio = "Test bio"
    user.created_at = datetime(2024, 1, 1, 12, 0, 0)
    return user


@pytest.fixture
def mock_db_user_2():
    """Mock second User for follow testing"""
    user = MagicMock()
    user.id = 2
    user.handle = "anotheruser"
    user.avatar_url = "https://example.com/avatar2.jpg"
    user.bio = "Another test bio"
    user.created_at = datetime(2024, 1, 2, 12, 0, 0)
    return user


@pytest.fixture
def mock_db_post():
    """Mock Post database model"""
    post = MagicMock()
    post.id = 1
    post.user_id = 1
    post.content = "Test post content"
    post.symbol = "BTC"
    post.created_at = datetime(2024, 1, 1, 12, 0, 0)
    return post


@pytest.fixture
def mock_db_follow():
    """Mock Follow database model"""
    follow = MagicMock()
    follow.id = 1
    follow.follower_id = 1
    follow.followee_id = 2
    return follow


# ============================================================================
# USER TESTS
# ============================================================================


class TestUserEndpoints:
    """Tests for user profile endpoints"""

    @patch("app.api.routes.social.get_session")
    def test_create_user_success(self, mock_get_session, mock_db_user):
        """Test successful user creation"""
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock no existing user (first query for duplicate check)
        mock_session.execute.return_value.scalar_one_or_none.return_value = None

        # Mock the User object that will be created
        mock_new_user = MagicMock()
        mock_new_user.handle = "newuser"
        mock_new_user.avatar_url = "https://example.com/avatar.jpg"
        mock_new_user.bio = "Test bio"
        mock_new_user.created_at = datetime(2024, 1, 1, 12, 0, 0)  # Set timestamp

        # Mock db.add to capture the user being added
        def capture_add(user):
            # Copy properties from the real User object to our mock
            mock_new_user.handle = user.handle
            mock_new_user.avatar_url = user.avatar_url
            mock_new_user.bio = user.bio

        mock_session.add.side_effect = capture_add
        mock_session.commit.return_value = None

        # Mock db.refresh to ensure created_at is set
        def set_timestamps(user):
            user.created_at = mock_new_user.created_at

        mock_session.refresh.side_effect = set_timestamps

        payload = {
            "handle": "newuser",
            "avatar_url": "https://example.com/avatar.jpg",
            "bio": "Test bio",
        }

        # Act
        response = client.post("/api/social/users", json=payload)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["handle"] == "newuser"
        assert data["avatar_url"] == "https://example.com/avatar.jpg"
        assert data["bio"] == "Test bio"
        assert data["following_count"] == 0
        assert data["followers_count"] == 0
        assert data["posts_count"] == 0
        assert "created_at" in data  # Verify timestamp is present

    @patch("app.api.routes.social.get_session")
    def test_create_user_duplicate_handle(self, mock_get_session, mock_db_user):
        """Test user creation with existing handle"""
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock existing user
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_db_user

        payload = {
            "handle": "testuser",
            "avatar_url": "https://example.com/avatar.jpg",
            "bio": "Test bio",
        }

        # Act
        response = client.post("/api/social/users", json=payload)

        # Assert
        assert response.status_code == 409
        assert "Handle already exists" in response.json()["detail"]

    @patch("app.api.routes.social.get_session")
    def test_get_user_success(self, mock_get_session, mock_db_user):
        """Test successful user profile retrieval"""
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock user exists
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_db_user

        # Mock counts (following, followers, posts)
        mock_session.execute.return_value.scalar_one.side_effect = [5, 10, 20]

        # Act
        response = client.get("/api/social/users/testuser")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["handle"] == "testuser"
        assert data["avatar_url"] == "https://example.com/avatar.jpg"
        assert data["bio"] == "Test bio"
        assert data["following_count"] == 5
        assert data["followers_count"] == 10
        assert data["posts_count"] == 20

    @patch("app.api.routes.social.get_session")
    def test_get_user_not_found(self, mock_get_session):
        """Test user retrieval with non-existent handle"""
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock user not found
        mock_session.execute.return_value.scalar_one_or_none.return_value = None

        # Act
        response = client.get("/api/social/users/nonexistent")

        # Assert
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]


# ============================================================================
# FOLLOW TESTS
# ============================================================================


class TestFollowEndpoints:
    """Tests for follow/unfollow endpoints"""

    @patch("app.api.routes.social.require_handle")
    @patch("app.api.routes.social.get_session")
    def test_follow_success(
        self, mock_get_session, mock_require_handle, mock_db_user, mock_db_user_2
    ):
        """Test successful follow operation"""
        # Arrange
        mock_require_handle.return_value = "testuser"
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock user lookups
        mock_session.execute.return_value.scalar_one_or_none.side_effect = [
            mock_db_user,  # Me
            mock_db_user_2,  # Target
            None,  # No existing follow
        ]

        # Act
        response = client.post(
            "/api/social/follow/anotheruser",
            headers={"Authorization": "Bearer test_token"},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["following"] is True
        mock_session.add.assert_called_once()

    @patch("app.api.routes.social.require_handle")
    @patch("app.api.routes.social.get_session")
    def test_follow_already_following(
        self,
        mock_get_session,
        mock_require_handle,
        mock_db_user,
        mock_db_user_2,
        mock_db_follow,
    ):
        """Test follow when already following"""
        # Arrange
        mock_require_handle.return_value = "testuser"
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock user lookups + existing follow
        mock_session.execute.return_value.scalar_one_or_none.side_effect = [
            mock_db_user,  # Me
            mock_db_user_2,  # Target
            mock_db_follow,  # Existing follow
        ]

        # Act
        response = client.post(
            "/api/social/follow/anotheruser",
            headers={"Authorization": "Bearer test_token"},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["following"] is True
        mock_session.add.assert_not_called()  # Should not create duplicate

    @patch("app.api.routes.social.require_handle")
    @patch("app.api.routes.social.get_session")
    def test_follow_self_error(
        self, mock_get_session, mock_require_handle, mock_db_user
    ):
        """Test follow self returns error"""
        # Arrange
        mock_require_handle.return_value = "testuser"
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock same user for both lookups
        mock_session.execute.return_value.scalar_one_or_none.side_effect = [
            mock_db_user,  # Me
            mock_db_user,  # Target (same user)
        ]

        # Act
        response = client.post(
            "/api/social/follow/testuser",
            headers={"Authorization": "Bearer test_token"},
        )

        # Assert
        assert response.status_code == 400
        assert "Cannot follow yourself" in response.json()["detail"]

    @patch("app.api.routes.social.require_handle")
    @patch("app.api.routes.social.get_session")
    def test_unfollow_success(
        self,
        mock_get_session,
        mock_require_handle,
        mock_db_user,
        mock_db_user_2,
        mock_db_follow,
    ):
        """Test successful unfollow operation"""
        # Arrange
        mock_require_handle.return_value = "testuser"
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock user lookups + existing follow
        mock_session.execute.return_value.scalar_one_or_none.side_effect = [
            mock_db_user,  # Me
            mock_db_user_2,  # Target
            mock_db_follow,  # Existing follow to delete
        ]

        # Act
        response = client.delete(
            "/api/social/follow/anotheruser",
            headers={"Authorization": "Bearer test_token"},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["following"] is False
        mock_session.delete.assert_called_once_with(mock_db_follow)

    @patch("app.api.routes.social.require_handle")
    @patch("app.api.routes.social.get_session")
    def test_unfollow_not_following(
        self, mock_get_session, mock_require_handle, mock_db_user, mock_db_user_2
    ):
        """Test unfollow when not following"""
        # Arrange
        mock_require_handle.return_value = "testuser"
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock user lookups + no existing follow
        mock_session.execute.return_value.scalar_one_or_none.side_effect = [
            mock_db_user,  # Me
            mock_db_user_2,  # Target
            None,  # No follow to delete
        ]

        # Act
        response = client.delete(
            "/api/social/follow/anotheruser",
            headers={"Authorization": "Bearer test_token"},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["following"] is False
        mock_session.delete.assert_not_called()


# ============================================================================
# POST TESTS
# ============================================================================


class TestPostEndpoints:
    """Tests for post creation and listing endpoints"""

    @patch("app.api.routes.social.require_handle")
    @patch("app.api.routes.social.get_session")
    def test_create_post_success(
        self, mock_get_session, mock_require_handle, mock_db_user, mock_db_post
    ):
        """Test successful post creation"""
        # Arrange
        mock_require_handle.return_value = "testuser"
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock user lookup
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_db_user

        # Mock the Post object that will be created
        mock_new_post = MagicMock()
        mock_new_post.id = 1
        mock_new_post.user_id = mock_db_user.id
        mock_new_post.content = "Test post content"
        mock_new_post.symbol = "BTC"
        mock_new_post.created_at = datetime(2024, 1, 1, 12, 0, 0)

        # Mock db.add to capture the post being added
        def capture_add(post):
            # Copy properties from the real Post object to our mock
            mock_new_post.content = post.content
            mock_new_post.symbol = post.symbol
            mock_new_post.user_id = post.user_id

        mock_session.add.side_effect = capture_add
        mock_session.commit.return_value = None

        # Mock db.refresh to ensure created_at is set
        def set_timestamps(post):
            post.id = mock_new_post.id
            post.created_at = mock_new_post.created_at

        mock_session.refresh.side_effect = set_timestamps

        payload = {
            "handle": "testuser",
            "content": "Test post content",
            "symbol": "BTC",
        }

        # Act
        response = client.post(
            "/api/social/posts",
            json=payload,
            headers={"Authorization": "Bearer test_token"},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["handle"] == "testuser"
        assert data["content"] == "Test post content"
        assert data["symbol"] == "BTC"
        assert "id" in data
        assert "created_at" in data

    @patch("app.api.routes.social.get_session")
    def test_list_posts_success(self, mock_get_session, mock_db_user, mock_db_post):
        """Test successful posts listing"""
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock query results (post, user) tuples
        mock_session.execute.return_value.all.return_value = [
            (mock_db_post, mock_db_user)
        ]

        # Act
        response = client.get("/api/social/posts")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["handle"] == "testuser"
        assert data[0]["content"] == "Test post content"

    @patch("app.api.routes.social.get_session")
    def test_list_posts_with_symbol_filter(
        self, mock_get_session, mock_db_user, mock_db_post
    ):
        """Test posts listing with symbol filter"""
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock query results
        mock_session.execute.return_value.all.return_value = [
            (mock_db_post, mock_db_user)
        ]

        # Act
        response = client.get("/api/social/posts?symbol=BTC")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Symbol filtering is done at database level, we just verify endpoint accepts param

    @patch("app.api.routes.social.get_session")
    def test_list_posts_with_pagination(
        self, mock_get_session, mock_db_user, mock_db_post
    ):
        """Test posts listing with pagination"""
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock query results
        mock_session.execute.return_value.all.return_value = []

        # Act
        response = client.get("/api/social/posts?limit=10&after_id=100")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ============================================================================
# FEED TESTS
# ============================================================================


class TestFeedEndpoint:
    """Tests for personalized feed endpoint"""

    @patch("app.api.routes.social.get_session")
    def test_feed_with_follows(
        self, mock_get_session, mock_db_user, mock_db_user_2, mock_db_post
    ):
        """Test feed for user with follows"""
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock user lookup
        execute_mock = MagicMock()
        mock_get_session.return_value.__enter__.return_value.execute = execute_mock

        # First call: user lookup
        user_result = MagicMock()
        user_result.scalar_one_or_none.return_value = mock_db_user

        # Second call: followee IDs
        followee_result = MagicMock()
        followee_result.all.return_value = [(2,), (3,)]

        # Third call: posts
        posts_result = MagicMock()
        posts_result.all.return_value = [(mock_db_post, mock_db_user_2)]

        execute_mock.side_effect = [user_result, followee_result, posts_result]

        # Act
        response = client.get("/api/social/feed?handle=testuser")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @patch("app.api.routes.social.get_session")
    def test_feed_no_follows(self, mock_get_session, mock_db_user, mock_db_post):
        """Test feed for user with no follows (global feed)"""
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock user lookup
        execute_mock = MagicMock()
        mock_get_session.return_value.__enter__.return_value.execute = execute_mock

        # First call: user lookup
        user_result = MagicMock()
        user_result.scalar_one_or_none.return_value = mock_db_user

        # Second call: no followees
        followee_result = MagicMock()
        followee_result.all.return_value = []

        # Third call: global posts
        posts_result = MagicMock()
        posts_result.all.return_value = [(mock_db_post, mock_db_user)]

        execute_mock.side_effect = [user_result, followee_result, posts_result]

        # Act
        response = client.get("/api/social/feed?handle=testuser")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @patch("app.api.routes.social.get_session")
    def test_feed_user_not_found(self, mock_get_session):
        """Test feed for non-existent user"""
        # Arrange
        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        # Mock user not found
        mock_session.execute.return_value.scalar_one_or_none.return_value = None

        # Act
        response = client.get("/api/social/feed?handle=nonexistent")

        # Assert
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]
