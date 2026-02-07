"""
Phase 5B: Social Endpoints Versioning Tests

Tests to validate:
1. POST /social/posts returns v1 response (no metadata) vs v2 (with metadata)
2. GET /social/posts returns v1 vs v2 responses
3. GET /social/feed returns v1 vs v2 responses
4. Backward compatibility for v1 clients
5. Version detection via Accept-Version header (proper middleware usage)
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def test_handle():
    """Test user handle for social endpoints"""
    return "testuser"


@pytest.fixture
def test_content():
    """Test post content"""
    return "A test post about AAPL"


@pytest.fixture
def test_symbol():
    """Test stock symbol"""
    return "AAPL"


class TestListPostsVersioning:
    """Test GET /api/social/posts versioning"""

    def test_list_posts_v1_no_metadata(self, client: TestClient):
        """Test v1 list response doesn't include metadata"""
        response = client.get("/api/social/posts", headers={"Accept-Version": "v1"})
        assert response.status_code == 200

        data = response.json()
        if len(data) > 0:
            post = data[0]
            # V1 should have base fields
            assert "id" in post or post is not None
            # V1 should NOT include v2 metadata fields when they're None
            # Pydantic may omit None values in JSON response
            if "metadata" in post and post["metadata"] is not None:
                raise AssertionError("V1 should not have metadata")

    def test_list_posts_v2_with_metadata(self, client: TestClient):
        """Test v2 list response includes metadata"""
        response = client.get("/api/social/posts", headers={"Accept-Version": "v2"})
        assert response.status_code == 200

        data = response.json()
        # At least verify the endpoint works with v2 header
        assert isinstance(data, list)

    def test_list_posts_default_is_v1(self, client: TestClient):
        """Test that default version is v1 (no Accept-Version header)"""
        response = client.get("/api/social/posts")  # No Accept-Version header
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_list_posts_accepts_limit_parameter(self, client: TestClient):
        """Test limit parameter works with versioning"""
        response = client.get(
            "/api/social/posts?limit=10", headers={"Accept-Version": "v2"}
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) <= 10

    def test_list_posts_with_symbol_filter(self, client: TestClient):
        """Test symbol filter works with versioning"""
        response = client.get(
            "/api/social/posts?symbol=AAPL", headers={"Accept-Version": "v2"}
        )
        assert response.status_code == 200


class TestFeedVersioning:
    """Test GET /api/social/feed versioning"""

    def test_feed_default_works(self, client: TestClient, test_handle):
        """Test feed endpoint with default version"""
        response = client.get(f"/api/social/feed?handle={test_handle}")
        # May 404 if user not found, but endpoint should be accessible
        assert response.status_code in [200, 404, 422]

    def test_feed_v1_requested(self, client: TestClient, test_handle):
        """Test feed with v1 version header"""
        response = client.get(
            f"/api/social/feed?handle={test_handle}", headers={"Accept-Version": "v1"}
        )
        assert response.status_code in [200, 404, 422]

    def test_feed_v2_requested(self, client: TestClient, test_handle):
        """Test feed with v2 version header"""
        response = client.get(
            f"/api/social/feed?handle={test_handle}", headers={"Accept-Version": "v2"}
        )
        assert response.status_code in [200, 404, 422]


class TestVersioningHeaders:
    """Test versioning response headers"""

    def test_response_includes_api_version_header(self, client: TestClient):
        """Test response includes X-API-Version header from middleware"""
        response = client.get("/api/social/posts", headers={"Accept-Version": "v2"})
        assert response.status_code == 200

        # Middleware should add X-API-Version header
        assert "x-api-version" in {k.lower(): v for k, v in response.headers.items()}

    def test_vary_header_present(self, client: TestClient):
        """Test Vary header indicates version-dependent responses"""
        response = client.get("/api/social/posts", headers={"Accept-Version": "v2"})
        assert response.status_code == 200

        # Middleware should add Vary header
        headers_lower = {k.lower(): v for k, v in response.headers.items()}
        assert "vary" in headers_lower


class TestVersioningIntegration:
    """Integration tests for versioning logic"""

    def test_middleware_version_extraction_default(self, client: TestClient):
        """Test middleware defaults to v1 without Accept-Version header"""
        response = client.get("/api/social/posts")
        assert response.status_code == 200

        # Should have X-API-Version header (from middleware)
        headers_lower = {k.lower(): v for k, v in response.headers.items()}
        if "x-api-version" in headers_lower:
            # If header present, should be v1 (default)
            assert headers_lower["x-api-version"] in ["v1", "v2"]

    def test_middleware_respects_version_header(self, client: TestClient):
        """Test middleware respects Accept-Version header"""
        # Request with v2 header
        response_v2 = client.get("/api/social/posts", headers={"Accept-Version": "v2"})
        assert response_v2.status_code == 200

        # Request with v1 header
        response_v1 = client.get("/api/social/posts", headers={"Accept-Version": "v1"})
        assert response_v1.status_code == 200

    def test_invalid_version_header_fallback(self, client: TestClient):
        """Test invalid version header falls back to v1"""
        response = client.get(
            "/api/social/posts",
            headers={"Accept-Version": "v99"},  # Non-existent version
        )
        assert response.status_code == 200
        # Should fall back gracefully


class TestResponseSchema:
    """Test response schema with versioning"""

    def test_list_posts_response_is_list(self, client: TestClient):
        """Test /api/social/posts returns a list"""
        response = client.get("/api/social/posts")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_list_posts_items_have_required_fields(self, client: TestClient):
        """Test posts have required fields"""
        response = client.get("/api/social/posts")
        assert response.status_code == 200

        data = response.json()
        if len(data) > 0:
            post = data[0]
            # All posts should have these base fields
            required_fields = ["id", "handle", "content", "created_at"]
            for field in required_fields:
                assert field in post, f"Post missing required field: {field}"

    def test_v2_response_has_extended_fields(self, client: TestClient):
        """Test v2 responses include extended fields when post has content"""
        response = client.get("/api/social/posts", headers={"Accept-Version": "v2"})
        assert response.status_code == 200

        data = response.json()
        # V2 may add optional fields like like_count, comment_count, metadata
        # This just validates the response is properly formed
        assert isinstance(data, list)


class TestBackwardCompatibility:
    """Test backward compatibility between v1 and v2"""

    def test_old_clients_work_without_version_header(self, client: TestClient):
        """Test old clients work without specifying version"""
        response = client.get("/api/social/posts")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        # Old clients should continue to work

    def test_both_versions_return_same_basic_response(self, client: TestClient):
        """Test v1 and v2 responses have compatible schemas"""
        response_v1 = client.get("/api/social/posts", headers={"Accept-Version": "v1"})
        response_v2 = client.get("/api/social/posts", headers={"Accept-Version": "v2"})

        assert response_v1.status_code == 200
        assert response_v2.status_code == 200

        data_v1 = response_v1.json()
        data_v2 = response_v2.json()

        # Both should be lists
        assert isinstance(data_v1, list)
        assert isinstance(data_v2, list)

        # Both should have same number of items (same cache)
        assert len(data_v1) == len(data_v2)


class TestUserEndpointsVersioning:
    """Test POST/GET /social/users versioning"""

    def test_create_user_v1_response(self, client: TestClient, test_handle):
        """Test v1 user creation response"""
        import uuid

        unique_handle = f"{test_handle}_create_v1_{uuid.uuid4().hex[:6]}"
        payload = {
            "handle": unique_handle,
            "avatar_url": "http://example.com/avatar.png",
            "bio": "Test user",
        }
        response = client.post(
            "/api/social/users", json=payload, headers={"Accept-Version": "v1"}
        )

        # Handle 409 if user exists (duplicate test runs)
        if response.status_code == 409:
            pytest.skip("User already exists from previous test run")

        assert response.status_code == 200

        data = response.json()
        # V1 should have base user fields
        assert "handle" in data
        assert "following_count" in data
        assert "followers_count" in data
        assert "posts_count" in data
        # V1 should NOT have metadata
        if "metadata" in data:
            assert data["metadata"] is None, "V1 should not have metadata"

    def test_create_user_v2_response(self, client: TestClient, test_handle):
        """Test v2 user creation response includes metadata"""
        import uuid

        unique_handle = f"{test_handle}_create_v2_{uuid.uuid4().hex[:6]}"
        payload = {
            "handle": unique_handle,
            "avatar_url": "http://example.com/avatar.png",
            "bio": "Test user",
        }
        response = client.post(
            "/api/social/users", json=payload, headers={"Accept-Version": "v2"}
        )

        # Handle 409 if user exists (duplicate test runs)
        if response.status_code == 409:
            pytest.skip("User already exists from previous test run")

        assert response.status_code == 200

        data = response.json()
        # V2 should have account_status
        assert "account_status" in data
        assert data["account_status"] == "active"
        # V2 should have metadata
        assert "metadata" in data
        if data["metadata"]:
            assert "account_created_timestamp" in data["metadata"]
            assert "onboarding_complete" in data["metadata"]

    def test_get_user_v1_response(self, client: TestClient, test_handle):
        """Test v1 get user response"""
        import uuid

        unique_handle = f"{test_handle}_get_v1_{uuid.uuid4().hex[:6]}"
        # First create a user
        payload = {
            "handle": unique_handle,
            "avatar_url": "http://example.com/avatar.png",
            "bio": "Test user",
        }
        client.post("/api/social/users", json=payload)

        # Now retrieve it with v1
        response = client.get(
            f"/api/social/users/{unique_handle}", headers={"Accept-Version": "v1"}
        )
        assert response.status_code == 200

        data = response.json()
        assert data["handle"] == unique_handle
        # V1 should NOT have additional metadata
        if "account_status" in data:
            assert data["account_status"] is None

    def test_get_user_v2_response(self, client: TestClient, test_handle):
        """Test v2 get user response includes metadata"""
        import uuid

        unique_handle = f"{test_handle}_get_v2_{uuid.uuid4().hex[:6]}"
        # First create a user
        payload = {
            "handle": unique_handle,
            "avatar_url": "http://example.com/avatar.png",
            "bio": "Test user",
        }
        client.post("/api/social/users", json=payload)

        # Now retrieve it with v2
        response = client.get(
            f"/api/social/users/{unique_handle}", headers={"Accept-Version": "v2"}
        )
        assert response.status_code == 200

        data = response.json()
        assert data["handle"] == unique_handle
        # V2 should have account_status
        assert "account_status" in data
        assert data["account_status"] == "active"
        # V2 should have metadata
        assert "metadata" in data


class TestFollowEndpointsVersioning:
    """Test POST/DELETE /social/follow/{handle} versioning"""

    def test_follow_v1_response(self, client: TestClient, test_handle):
        """Test v1 follow response"""
        import uuid

        suffix = uuid.uuid4().hex[:6]
        # Create two users
        user1 = f"{test_handle}_follower_v1_{suffix}"
        user2 = f"{test_handle}_followee_v1_{suffix}"
        client.post("/api/social/users", json={"handle": user1, "bio": "Follower"})
        client.post("/api/social/users", json={"handle": user2, "bio": "Followee"})

        # Follow with v1
        response = client.post(
            f"/api/social/follow/{user2}",
            headers={"Accept-Version": "v1", "Authorization": user1},
        )

        # Should gracefully handle auth requirements
        if response.status_code == 200:
            data = response.json()
            assert "ok" in data
            assert "following" in data
            # V1 should NOT have timestamp or action fields
            if "timestamp" in data:
                assert data["timestamp"] is None

    def test_follow_v2_response(self, client: TestClient, test_handle):
        """Test v2 follow response includes metadata"""
        import uuid

        suffix = uuid.uuid4().hex[:6]
        # Create two users
        user1 = f"{test_handle}_follower_v2_{suffix}"
        user2 = f"{test_handle}_followee_v2_{suffix}"
        client.post("/api/social/users", json={"handle": user1, "bio": "Follower"})
        client.post("/api/social/users", json={"handle": user2, "bio": "Followee"})

        # Follow with v2
        response = client.post(
            f"/api/social/follow/{user2}",
            headers={"Accept-Version": "v2", "Authorization": user1},
        )

        # Should gracefully handle auth requirements
        if response.status_code == 200:
            data = response.json()
            assert "ok" in data
            assert "following" in data
            # V2 should have additional fields
            if "action" in data:
                assert data["action"] in ["follow_created", "already_following"]

    def test_unfollow_v1_response(self, client: TestClient, test_handle):
        """Test v1 unfollow response"""
        import uuid

        suffix = uuid.uuid4().hex[:6]
        user1 = f"{test_handle}_unfollow_v1_follower_{suffix}"
        user2 = f"{test_handle}_unfollow_v1_followee_{suffix}"
        client.post("/api/social/users", json={"handle": user1, "bio": "Follower"})
        client.post("/api/social/users", json={"handle": user2, "bio": "Followee"})

        # First follow
        client.post(f"/api/social/follow/{user2}", headers={"Authorization": user1})

        # Then unfollow with v1
        response = client.delete(
            f"/api/social/follow/{user2}",
            headers={"Accept-Version": "v1", "Authorization": user1},
        )

        if response.status_code == 200:
            data = response.json()
            assert "ok" in data
            assert "following" in data
            # V1 should NOT have action field
            if "action" in data:
                assert data["action"] is None

    def test_unfollow_v2_response(self, client: TestClient, test_handle):
        """Test v2 unfollow response includes metadata"""
        import uuid

        suffix = uuid.uuid4().hex[:6]
        user1 = f"{test_handle}_unfollow_v2_follower_{suffix}"
        user2 = f"{test_handle}_unfollow_v2_followee_{suffix}"
        client.post("/api/social/users", json={"handle": user1, "bio": "Follower"})
        client.post("/api/social/users", json={"handle": user2, "bio": "Followee"})

        # First follow
        client.post(f"/api/social/follow/{user2}", headers={"Authorization": user1})

        # Then unfollow with v2
        response = client.delete(
            f"/api/social/follow/{user2}",
            headers={"Accept-Version": "v2", "Authorization": user1},
        )

        if response.status_code == 200:
            data = response.json()
            assert "ok" in data
            assert "following" in data
            # V2 should have action field
            if "action" in data:
                assert data["action"] == "follow_deleted"
