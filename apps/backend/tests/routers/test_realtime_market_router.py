"""Tests for real-time market router placeholder endpoints."""

from fastapi.testclient import TestClient


# Endpoints currently raise HTTP 501 to indicate work-in-progress integrations.
def test_stock_endpoint_returns_not_implemented(client: TestClient) -> None:
    response = client.get("/api/market/stock/AAPL")

    assert response.status_code == 501
    assert response.json()["detail"] == (
        "Real-time stock prices coming soon. Service integration in progress."
    )


def test_crypto_endpoint_returns_not_implemented(client: TestClient) -> None:
    response = client.get("/api/market/crypto/BTC")

    assert response.status_code == 501
    assert response.json()["detail"] == (
        "Real-time crypto prices coming soon. Service integration in progress."
    )


def test_batch_endpoint_returns_not_implemented(client: TestClient) -> None:
    response = client.post(
        "/api/market/batch",
        json={"stocks": ["AAPL"], "cryptos": ["BTC"]},
    )

    assert response.status_code == 501
    assert response.json()["detail"] == (
        "Batch fetching coming soon. Service integration in progress."
    )


def test_status_endpoint_returns_not_implemented(client: TestClient) -> None:
    response = client.get("/api/market/status")

    assert response.status_code == 501
    assert response.json()["detail"] == "API status endpoint coming soon."


def test_stats_endpoint_returns_not_implemented(client: TestClient) -> None:
    response = client.get("/api/market/stats")

    assert response.status_code == 501
    assert response.json()["detail"] == "API stats endpoint coming soon."
