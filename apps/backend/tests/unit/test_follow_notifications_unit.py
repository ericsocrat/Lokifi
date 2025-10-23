import uuid

import pytest
from app.db.database import get_db_session
from app.main import app
from app.models.notification_models import Notification, NotificationType
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select


@pytest.fixture
def anyio_backend():
    return "asyncio"


async def _register(client, email, username):
    return await client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "testpassword123",
            "full_name": username.title(),
            "username": username,
        },
    )


async def _login(client, email):
    return await client.post(
        "/api/auth/login", json={"email": email, "password": "testpassword123"}
    )


@pytest.mark.anyio
async def test_follow_creates_notification():
    """Test that following a user creates a FOLLOW notification."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        suffix = uuid.uuid4().hex[:6]
        emails = {k: f"{k}_{suffix}@ex.com" for k in ["alice", "bob"]}
        usernames = {k: f"{k}{suffix}" for k in emails}
        r = {k: await _register(client, emails[k], usernames[k]) for k in emails}
        assert all(resp.status_code in (200, 201, 409) for resp in r.values())

        # Login as alice
        login = await _login(client, emails["alice"])
        token = login.cookies.get("access_token")
        headers_alice = {"Authorization": f"Bearer {token}"}
        bob_id = uuid.UUID(r["bob"].json()["user"]["id"])
        alice_id = uuid.UUID(r["alice"].json()["user"]["id"])

        # Count notifications for Bob before follow
        async for db in get_db_session():
            result = await db.execute(
                select(Notification).where(
                    Notification.user_id == bob_id, Notification.type == NotificationType.FOLLOW
                )
            )
            initial_count = len(result.scalars().all())
            break

        # Alice follows Bob via new REST endpoint
        follow_resp = await client.post(f"/api/follow/{bob_id}", headers=headers_alice)
        assert follow_resp.status_code == 200

        # Check that a FOLLOW notification was created for Bob
        async for db in get_db_session():
            result = await db.execute(
                select(Notification).where(
                    Notification.user_id == bob_id,
                    Notification.type == NotificationType.FOLLOW,
                    Notification.related_user_id == alice_id,
                )
            )
            notifications = result.scalars().all()
            assert len(notifications) == initial_count + 1

            # Verify notification content
            notification = notifications[-1]  # Get the latest one
            assert notification.type == NotificationType.FOLLOW
            assert notification.user_id == bob_id
            assert notification.related_user_id == alice_id
            assert "follower" in notification.message.lower()
            break

        # Following again should not create another notification (idempotent)
        follow_resp2 = await client.post(f"/api/follow/{bob_id}", headers=headers_alice)
        assert follow_resp2.status_code == 200
        assert follow_resp2.json()["action"] == "noop"

        # Check notification count hasn't increased
        async for db in get_db_session():
            result = await db.execute(
                select(Notification).where(
                    Notification.user_id == bob_id,
                    Notification.type == NotificationType.FOLLOW,
                    Notification.related_user_id == alice_id,
                )
            )
            final_notifications = result.scalars().all()
            assert len(final_notifications) == initial_count + 1  # Still only one
            break
