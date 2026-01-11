"""Tests for security middleware."""

import pytest
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse
from fastapi.testclient import TestClient

from app.middleware.security import SecurityHeadersMiddleware


@pytest.fixture
def app_with_security():
    """Create a test app with security middleware."""
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/test")
    async def test_endpoint():
        return {"status": "ok"}

    return app


def test_security_headers_added(app_with_security):
    """Test that security headers are added to response."""
    client = TestClient(app_with_security)
    response = client.get("/test")

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"
    assert "Referrer-Policy" in response.headers
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_csp_header_present(app_with_security):
    """Test that Content Security Policy header is set."""
    client = TestClient(app_with_security)
    response = client.get("/test")

    assert "Content-Security-Policy" in response.headers
    csp = response.headers["Content-Security-Policy"]
    assert "default-src 'self'" in csp
    assert "script-src" in csp


def test_security_headers_on_different_endpoints(app_with_security):
    """Test security headers applied consistently across endpoints."""
    app = app_with_security

    @app.get("/another")
    async def another_endpoint():
        return {"another": "endpoint"}

    client = TestClient(app)
    response = client.get("/another")

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "Content-Security-Policy" in response.headers


def test_permissions_policy_header(app_with_security):
    """Test Permissions-Policy header restricts sensitive APIs."""
    client = TestClient(app_with_security)
    response = client.get("/test")

    assert "Permissions-Policy" in response.headers
    policy = response.headers["Permissions-Policy"]
    assert "geolocation=()" in policy
    assert "microphone=()" in policy
    assert "camera=()" in policy
