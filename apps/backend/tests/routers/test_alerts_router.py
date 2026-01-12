"""
Tests for alerts router endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from app.db.schemas.alert import AlertCreate
from app.main import app

client = TestClient(app)


class TestAlertsRouter:
    """Test alerts router endpoints."""

    def test_get_alerts_index(self):
        """Test GET /api/alerts/ returns empty list."""
        response = client.get("/api/alerts/")
        assert response.status_code == 200
        assert response.json() == []

    def test_post_create_alert(self):
        """Test POST /api/alerts/ creates alert with provided data."""
        alert_data = {
            "type": "price",
            "payload": {"symbol": "BTC", "price_threshold": 50000},
            "cooldown_s": 3600,
        }
        response = client.post("/api/alerts/", json=alert_data)
        assert response.status_code == 200
        result = response.json()
        assert result["id"] == 1
        assert result["type"] == "price"
        assert result["payload"] == {"symbol": "BTC", "price_threshold": 50000}
        assert result["is_active"] is True
        assert result["cooldown_s"] == 3600
