"""
API Contract Tests using Schemathesis

Property-based testing to validate all API endpoints conform to the OpenAPI schema.
Tests every endpoint with automatically generated test cases based on the schema.

Phase 1.6 Task 2: API Contract Testing
"""

import pytest
import schemathesis
from app.main import app
from hypothesis import HealthCheck, settings

# Load schema using schemathesis.openapi.from_asgi
# This creates test cases for all endpoints defined in the OpenAPI schema
schema = schemathesis.openapi.from_asgi("/openapi.json", app)


@schema.parametrize()
@settings(
    max_examples=10,  # Number of test cases per endpoint
    deadline=None,  # Disable deadline for slow endpoints
    suppress_health_check=[HealthCheck.too_slow],  # Allow slower tests
)
def test_api_conforms_to_schema(case):
    """
    Property-based test that validates all API endpoints against the OpenAPI schema.

    This test:
    - Automatically discovers all endpoints from the OpenAPI schema
    - Generates valid requests based on schema definitions
    - Validates responses match the schema
    - Checks status codes are as documented
    - Verifies response content types

    For each endpoint, it runs multiple test cases with different generated inputs.
    """
    # Make the API call and validate against schema
    response = case.call_asgi()
    case.validate_response(response)


@schema.parametrize()
@settings(
    max_examples=5,
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow],
)
def test_api_responses_are_json(case):
    """
    Test that API responses have proper JSON content type.

    This is a supplementary test to ensure consistency in response formats.
    """
    response = case.call_asgi()

    # Skip if it's an error response (those might have different content types)
    if response.status_code < 400:
        # Most successful API responses should be JSON
        # (Except for static files, redirects, etc.)
        if response.status_code not in [204, 301, 302, 303, 304, 307, 308]:
            content_type = response.headers.get("content-type", "")
            if content_type:
                assert (
                    "application/json" in content_type.lower()
                    or "text/html" in content_type.lower()
                ), f"Expected JSON or HTML response, got: {content_type}"


@schema.parametrize()
@settings(
    max_examples=10,
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow],
)
def test_get_endpoints_are_idempotent(case):
    """
    Test that GET requests are idempotent (multiple calls return same result).

    Makes the same GET request twice and verifies the responses are consistent.
    """
    # Only test GET endpoints
    if case.method != "GET":
        pytest.skip("This test only applies to GET endpoints")
    
    # Make first request
    response1 = case.call_asgi()

    # Make second identical request
    response2 = case.call_asgi()

    # Status codes should match
    assert (
        response1.status_code == response2.status_code
    ), "GET requests should return consistent status codes"

    # If successful, responses should match
    if response1.status_code == 200:
        assert response1.text == response2.text, "GET requests should return consistent data"


@schema.parametrize()
@settings(max_examples=3, deadline=None)
def test_health_endpoint_responds_quickly(case):
    """
    Test that the health check endpoint responds with 200 OK.

    Health endpoints should always be available and respond quickly.
    """
    # Only test the /health endpoint
    if "/health" not in case.path:
        pytest.skip("This test only applies to /health endpoint")
    
    response = case.call_asgi()

    # Health check should succeed
    assert (
        response.status_code == 200
    ), f"Health endpoint should return 200, got {response.status_code}"

    # Validate response against schema
    case.validate_response(response)


# Negative testing: Verify proper error handling
@schema.parametrize()
@settings(
    max_examples=5,
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow],
)
def test_invalid_auth_returns_401(case):
    """
    Test that endpoints requiring authentication return 401 for invalid auth.

    This validates proper security implementation.
    """
    # Skip if endpoint doesn't require auth
    if not case.operation.security:
        pytest.skip("Endpoint does not require authentication")

    # Make request without auth headers (or with invalid auth)
    response = case.call_asgi(headers={"Authorization": "Bearer invalid_token"})

    # Should return 401 Unauthorized or 403 Forbidden
    assert response.status_code in [
        401,
        403,
    ], f"Secured endpoint should return 401/403 for invalid auth, got {response.status_code}"


@pytest.mark.slow
@schema.parametrize()
@settings(
    max_examples=20,  # More thorough testing
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow, HealthCheck.filter_too_much],
)
def test_api_handles_edge_cases(case):
    """
    Extensive property-based test with more examples.

    This test is marked as 'slow' and runs more test cases to catch edge cases.
    Run with: pytest -m slow
    """
    response = case.call_asgi()

    # Validate against schema
    case.validate_response(response)

    # Additional checks
    assert response.status_code < 600, "Status code should be valid HTTP status"

    # Check for common security headers on successful responses
    if response.status_code == 200:
        # Note: These are recommendations, not strict requirements
        headers = response.headers

        # Log if security headers are missing (but don't fail)
        security_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "Content-Security-Policy",
        ]

        missing_headers = [h for h in security_headers if h not in headers]
        if missing_headers:
            print(f"Note: Missing security headers on {case.operation.path}: {missing_headers}")
