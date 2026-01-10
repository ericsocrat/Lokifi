"""Health router endpoint tests."""

from fastapi.testclient import TestClient


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    """Ensure health endpoint responds with an ok payload."""
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True}
