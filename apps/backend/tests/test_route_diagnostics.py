"""Quick diagnostics to check registered routes"""

import pytest
from fastapi.testclient import TestClient


def test_available_routes(client: TestClient):
    """Print all available routes"""
    routes = []
    for route in client.app.routes:
        if hasattr(route, "path"):
            routes.append(
                f"{route.path} - {route.methods if hasattr(route, 'methods') else 'N/A'}"
            )

    # Filter for social routes
    social_routes = [r for r in routes if "social" in r.lower()]
    print("\n=== SOCIAL ROUTES ===")
    for route in social_routes:
        print(route)

    # Check if v1/v2 routes are available
    print("\n=== ALL ROUTES (filtered) ===")
    for route in sorted(routes):
        if "/social" in route or "/api" in route:
            print(route)


def test_health_endpoint(client: TestClient):
    """Test basic health endpoint to ensure app is working"""
    response = client.get("/health")
    print(f"Health status: {response.status_code}")
    print(
        f"Response: {response.json() if response.status_code == 200 else response.text}"
    )


def test_direct_social_post_no_version(client: TestClient):
    """Test /social/posts (no version prefix)"""
    response = client.get("/social/posts")
    print(f"\nGET /social/posts: {response.status_code}")


def test_versioned_social_post_v1(client: TestClient):
    """Test /api/v1/social/posts"""
    response = client.get("/api/v1/social/posts")
    print(f"GET /api/v1/social/posts: {response.status_code}")
    if response.status_code != 200:
        print(f"Response: {response.text[:200]}")


def test_versioned_social_post_v2(client: TestClient):
    """Test /api/v2/social/posts"""
    response = client.get("/api/v2/social/posts")
    print(f"GET /api/v2/social/posts: {response.status_code}")
    if response.status_code != 200:
        print(f"Response: {response.text[:200]}")
