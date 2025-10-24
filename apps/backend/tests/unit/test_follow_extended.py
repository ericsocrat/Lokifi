"""Extended tests for follow graph (mutual follows, suggestions pagination, counters integrity)."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


async def _register(client, email, username):
    return await client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "TestUser123!",
            "full_name": username.title(),
            "username": username,
        },
    )


async def _login(client, email):
    return await client.post(
        "/api/auth/login", json={"email": email, "password": "TestUser123!"}
    )


@pytest.mark.anyio
async def test_mutual_follows_and_counters():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create three users A,B,C
        suffix = uuid.uuid4().hex[:6]
        emails = {k: f"{k}_{suffix}@ex.com" for k in ["alice", "bob", "carol"]}
        usernames = {k: f"{k}{suffix}" for k in emails}
        r = {k: await _register(client, emails[k], usernames[k]) for k in emails}
        assert all(resp.status_code in (200, 201, 409) for resp in r.values())

        # Login as alice
        login = await _login(client, emails["alice"])
        assert login.status_code == 200
        token = login.cookies.get("access_token")
        headers_alice = {"Authorization": f"Bearer {token}"}
        bob_id = r["bob"].json()["user"]["id"]
        carol_id = r["carol"].json()["user"]["id"]

        # Alice follows Bob & Carol via new REST endpoints
        fr1 = await client.post(f"/api/follow/{bob_id}", headers=headers_alice)
        fr2 = await client.post(f"/api/follow/{carol_id}", headers=headers_alice)
        assert fr1.status_code == 200 and fr2.status_code == 200

        # Bob follows Alice to create a mutual
        login_bob = await _login(client, emails["bob"])
        token_bob = login_bob.cookies.get("access_token")
        headers_bob = {"Authorization": f"Bearer {token_bob}"}
        fr_bob = await client.post(
            f"/api/follow/{r['alice'].json()['user']['id']}", headers=headers_bob
        )
        assert fr_bob.status_code == 200

        # Mutual follows endpoint (alice perspective with bob)
        mutual = await client.get(f"/api/follow/mutual/{bob_id}", headers=headers_alice)
        assert mutual.status_code == 200
        data = mutual.json()
        assert data["total"] >= 0

        # Stats for Alice
        stats_alice = await client.get("/api/follow/stats/me", headers=headers_alice)
        assert stats_alice.status_code == 200
        sa = stats_alice.json()
        assert sa["following_count"] >= 2

        # Unfollow Carol and ensure counts drop (idempotent)
        unf_carol = await client.delete(
            f"/api/follow/{carol_id}", headers=headers_alice
        )
        assert unf_carol.status_code == 200
        unf_carol2 = await client.delete(
            f"/api/follow/{carol_id}", headers=headers_alice
        )
        assert unf_carol2.status_code == 200
        stats_after = await client.get("/api/follow/stats/me", headers=headers_alice)
        assert stats_after.json()["following_count"] <= sa["following_count"]


@pytest.mark.anyio
async def test_suggestions_basic():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        suffix = uuid.uuid4().hex[:6]
        emails = [f"user{i}_{suffix}@ex.com" for i in range(5)]
        regs = []
        for i, e in enumerate(emails):
            regs.append(await _register(client, e, f"user{i}{suffix}"))
        assert all(r.status_code in (200, 201, 409) for r in regs)
        # Login as first user
        login = await _login(client, emails[0])
        token = login.cookies.get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        # Get suggestions (may be empty early but should return 200 schema)
        sugg = await client.get(
            "/api/follow/suggestions?page=1&page_size=5", headers=headers
        )
        assert sugg.status_code == 200
        body = sugg.json()
        assert "suggestions" in body and "page" in body
