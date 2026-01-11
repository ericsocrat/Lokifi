from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.social import router as social_router


def create_test_app() -> TestClient:
    app = FastAPI()
    app.include_router(social_router)
    return TestClient(app, raise_server_exceptions=False)


def test_create_post_success():
    client = create_test_app()
    payload = {
        "body": "Hello world",
        "symbols": ["AAPL", "MSFT"],
        "media_url": None,
    }
    res = client.post("/social/posts", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["user_id"] == 0
    assert data["body"] == "Hello world"
    assert data["symbols"] == ["AAPL", "MSFT"]
    assert data["media_url"] is None
    assert "created_at" in data


def test_feed_default_params():
    client = create_test_app()
    res = client.get("/social/feed")
    assert res.status_code == 200
    assert res.json() == []


def test_feed_with_query_params():
    client = create_test_app()
    res = client.get("/social/feed", params={"symbol": "AAPL", "limit": 10})
    assert res.status_code == 200
    assert res.json() == []
