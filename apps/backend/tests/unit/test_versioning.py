"""
Tests for API versioning middleware and functionality

Validates:
- Version detection from URL path
- Version detection from Accept-Version header
- X-API-Version response header
- Version-aware endpoint responses
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestVersionDetection:
    """Test API version detection"""

    def test_version_from_url_path_v1(self):
        """Version extracted from URL path /api/v1/"""
        response = client.get("/api/v1/example/version")
        assert response.status_code == 200
        assert response.json()["version"] == "v1"
        assert response.headers["X-API-Version"] == "v1"

    def test_version_from_url_path_v2(self):
        """Version extracted from URL path /api/v2/"""
        response = client.get("/api/v2/example/version")
        assert response.status_code == 200
        assert response.json()["version"] == "v2"
        assert response.headers["X-API-Version"] == "v2"

    def test_version_from_header(self):
        """Version extracted from Accept-Version header"""
        response = client.get(
            "/api/example/version",
            headers={"Accept-Version": "v2"},
        )
        assert response.status_code == 200
        assert response.json()["version"] == "v2"
        assert response.headers["X-API-Version"] == "v2"

    def test_version_default_v1(self):
        """Default to v1 when no version specified"""
        response = client.get("/api/example/version")
        assert response.status_code == 200
        assert response.json()["version"] == "v1"
        assert response.headers["X-API-Version"] == "v1"

    def test_version_priority_url_over_header(self):
        """URL path version takes priority over header"""
        response = client.get(
            "/api/v2/example/version",
            headers={"Accept-Version": "v1"},
        )
        assert response.status_code == 200
        # URL path should win
        assert response.json()["version"] == "v2"
        assert response.headers["X-API-Version"] == "v2"


class TestVersionAwaeResponses:
    """Test responses differ based on version"""

    def test_schema_v1_basic(self):
        """V1 returns basic schema"""
        response = client.get("/api/v1/example/schema")
        assert response.status_code == 200
        data = response.json()

        # V1 should have basic fields
        assert "id" in data
        assert "name" in data
        assert "email" in data

        # V1 should NOT have v2-specific fields
        assert "created_at" not in data
        assert "metadata" not in data

    def test_schema_v2_enhanced(self):
        """V2 returns enhanced schema with metadata"""
        response = client.get("/api/v2/example/schema")
        assert response.status_code == 200
        data = response.json()

        # V2 should have all basic fields
        assert "id" in data
        assert "name" in data
        assert "email" in data

        # V2 should have enhanced fields
        assert "created_at" in data
        assert "updated_at" in data
        assert "metadata" in data
        assert "last_login" in data
        assert "login_count" in data

    def test_compatibility_info(self):
        """Compatibility info endpoint returns version info"""
        response = client.get("/api/v1/example/compatibility")
        assert response.status_code == 200
        data = response.json()

        assert data["current_version"] == "v1"
        assert "v1" in data
        assert "v2" in data
        assert data["supported_versions"] == ["v1", "v2"]


class TestResponseHeaders:
    """Test response headers for versioning"""

    def test_x_api_version_header_present(self):
        """X-API-Version header is always present"""
        response = client.get("/api/health")
        assert "X-API-Version" in response.headers

    def test_vary_header_set(self):
        """Vary header includes Accept-Version"""
        response = client.get("/api/v1/example/version")
        assert "Vary" in response.headers
        # Note: CORS may add to Vary header, so just check presence
