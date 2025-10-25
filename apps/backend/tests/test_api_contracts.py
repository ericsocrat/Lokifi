"""
Simplified API Contract Tests

Quick sanity checks for API contracts without heavy property-based testing.
For full contract testing, run: pytest -m contract
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_openapi_schema_available():
    """Test that OpenAPI schema endpoint is accessible."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "openapi" in schema
    assert "paths" in schema
    assert len(schema["paths"]) > 0


def test_health_endpoint():
    """Test that health endpoint works."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data or "status" in data


def test_api_responses_are_json():
    """Test that API endpoints return JSON."""
    # Test a few key endpoints (with correct API prefix)
    endpoints = ["/api/health"]

    for endpoint in endpoints:
        response = client.get(endpoint)
        if response.status_code == 200:
            assert (
                "application/json" in response.headers.get("content-type", "").lower()
            )


@pytest.mark.skip(reason="Property-based tests disabled for CI/CD speed")
def test_full_contract_suite():
    """
    Full property-based contract tests.

    To run: pytest -m contract tests/test_api_contracts.py
    """
    pass
