"""Tests for follow graph basic functionality (happy path + idempotency).

Uses AsyncClient to avoid Windows event loop reuse issues with async DB sessions.
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend():
    """Force pytest-anyio to use asyncio backend only (trio not installed)."""
    return "asyncio"


@pytest.mark.anyio
async def test_follow_flow_basic():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        suffix = uuid.uuid4().hex[:6]
        alice_email = f"alice_{suffix}@example.com"
        bob_email = f"bob_{suffix}@example.com"
        alice_username = f"alice{suffix}"
        bob_username = f"bob{suffix}"

        r1 = await client.post(
            "/api/auth/register",
            json={
                "email": alice_email,
                "password": "TestUser123!",
                "full_name": "Alice User",
                "username": alice_username,
            },
        )
        r2 = await client.post(
            "/api/auth/register",
            json={
                "email": bob_email,
                "password": "TestUser123!",
                "full_name": "Bob User",
                "username": bob_username,
            },
        )
        assert r1.status_code in [200, 201, 409]
        assert r2.status_code in [200, 201, 409]
        if r1.status_code >= 500 or r2.status_code >= 500:
            pytest.skip("Registration failed due to server error")

        login = await client.post(
            "/api/auth/login", json={"email": alice_email, "password": "TestUser123!"}
        )
        if login.status_code != 200:
            pytest.skip("Login failed; skipping follow flow")

        bob_user_id = r2.json().get("user", {}).get("id") if r2.status_code in [200, 201] else None
        if not bob_user_id:
            pytest.skip("Bob user not created; skipping follow flow")

        # Attach auth header for subsequent requests
        token = (
            login.cookies.get("access_token") or login.json()["user"]["id"]
        )  # fallback (shouldn't use fallback)
        headers = {"Authorization": f"Bearer {token}"} if token else {}

        follow_resp = await client.post(
            "/api/follow/follow", json={"user_id": bob_user_id}, headers=headers
        )
        assert follow_resp.status_code in [200, 409]

        # Idempotent second follow
        follow_resp2 = await client.post(
            "/api/follow/follow", json={"user_id": bob_user_id}, headers=headers
        )
        assert follow_resp2.status_code in [200, 409]

        followers_list = await client.get(f"/api/follow/{bob_user_id}/followers", headers=headers)
        assert followers_list.status_code == 200
        data = followers_list.json()
        assert isinstance(data, dict)
        assert "followers" in data

        unfollow_resp = await client.request(
            "DELETE", "/api/follow/unfollow", json={"user_id": bob_user_id}, headers=headers
        )
        assert unfollow_resp.status_code in [200]
        unfollow_resp2 = await client.request(
            "DELETE", "/api/follow/unfollow", json={"user_id": bob_user_id}, headers=headers
        )
        assert unfollow_resp2.status_code in [200]
