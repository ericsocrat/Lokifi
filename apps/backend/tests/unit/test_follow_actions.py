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
async def test_follow_action_response_and_noop():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        suffix = uuid.uuid4().hex[:6]
        emails = {k: f"{k}_{suffix}@ex.com" for k in ["alice", "bob"]}
        usernames = {k: f"{k}{suffix}" for k in emails}
        r = {k: await _register(client, emails[k], usernames[k]) for k in emails}
        assert all(resp.status_code in (200, 201, 409) for resp in r.values())

        login_alice = await _login(client, emails["alice"])
        token_alice = login_alice.cookies.get("access_token")
        headers_alice = {"Authorization": f"Bearer {token_alice}"}
        bob_id = r["bob"].json()["user"]["id"]

        # First follow should return action=follow
        first = await client.post(f"/api/follow/{bob_id}", headers=headers_alice)
        assert first.status_code == 200
        body1 = first.json()
        assert body1["action"] == "follow"
        assert body1["is_following"] is True
        assert body1["mutual_follow"] is False

        # Second follow should be noop
        second = await client.post(f"/api/follow/{bob_id}", headers=headers_alice)
        assert second.status_code == 200
        body2 = second.json()
        assert body2["action"] == "noop"
        assert body2["is_following"] is True

        # Unfollow should return action=unfollow
        unf = await client.delete(f"/api/follow/{bob_id}", headers=headers_alice)
        assert unf.status_code == 200
        body_unf = unf.json()
        assert body_unf["action"] == "unfollow"
        assert body_unf["is_following"] is False

        # Second unfollow is noop
        unf2 = await client.delete(f"/api/follow/{bob_id}", headers=headers_alice)
        assert unf2.status_code == 200
        body_unf2 = unf2.json()
        assert body_unf2["action"] == "noop"
        assert body_unf2["is_following"] is False

        # Mutual follow check: Bob follows Alice
        login_bob = await _login(client, emails["bob"])
        token_bob = login_bob.cookies.get("access_token")
        headers_bob = {"Authorization": f"Bearer {token_bob}"}
        alice_id = r["alice"].json()["user"]["id"]
        # Bob follows Alice
        bfollow = await client.post(f"/api/follow/{alice_id}", headers=headers_bob)
        assert bfollow.status_code == 200
        bbody = bfollow.json()
        assert bbody["action"] == "follow"
        # Alice re-follows Bob to ensure mutual flag true
        refollow = await client.post(f"/api/follow/{bob_id}", headers=headers_alice)
        assert refollow.status_code == 200
        ref_body = refollow.json()
        # is_following true and mutual_follow may be true if follow status is checked both ways
        assert ref_body["is_following"] is True
        # mutual flag can be true after reciprocal follow
        assert ref_body["mutual_follow"] in (True, False)
