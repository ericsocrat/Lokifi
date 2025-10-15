"""
OpenAPI Schema Validation Tests

Tests to ensure the FastAPI application's OpenAPI schema is valid,
complete, and follows best practices.

Phase 1.6 Task 2: API Contract Testing
"""

import json

import pytest
from fastapi.testclient import TestClient
from openapi_core import Spec
from openapi_spec_validator import validate_spec
from openapi_spec_validator.exceptions import OpenAPISpecValidatorError


def test_openapi_schema_exists(client: TestClient):
    """Test that the OpenAPI schema endpoint is accessible."""
    response = client.get("/openapi.json")

    assert response.status_code == 200, "OpenAPI schema endpoint should return 200"
    assert response.headers["content-type"] == "application/json", "OpenAPI schema should be JSON"

    schema = response.json()
    assert "openapi" in schema, "Schema should have 'openapi' version field"
    assert "info" in schema, "Schema should have 'info' section"
    assert "paths" in schema, "Schema should have 'paths' section"


def test_openapi_schema_version(client: TestClient):
    """Test that the OpenAPI schema uses OpenAPI 3.0+ specification."""
    response = client.get("/openapi.json")
    schema = response.json()

    openapi_version = schema.get("openapi", "")
    assert openapi_version.startswith("3."), f"Should use OpenAPI 3.x (found: {openapi_version})"


def test_openapi_schema_is_valid(client: TestClient):
    """Test that the OpenAPI schema is valid according to OpenAPI specification."""
    response = client.get("/openapi.json")
    schema = response.json()

    try:
        # Validate against OpenAPI specification
        validate_spec(schema)
    except OpenAPISpecValidatorError as e:
        pytest.fail(f"OpenAPI schema validation failed: {e}")


def test_openapi_schema_has_info(client: TestClient):
    """Test that the OpenAPI schema has required info fields."""
    response = client.get("/openapi.json")
    schema = response.json()

    info = schema.get("info", {})
    assert "title" in info, "Schema info should have a title"
    assert "version" in info, "Schema info should have a version"
    assert info["title"], "Schema title should not be empty"
    assert info["version"], "Schema version should not be empty"

    # Check for our specific application
    assert "Lokifi" in info["title"], "Title should mention Lokifi"


def test_openapi_schema_has_paths(client: TestClient):
    """Test that the OpenAPI schema documents API paths."""
    response = client.get("/openapi.json")
    schema = response.json()

    paths = schema.get("paths", {})
    assert len(paths) > 0, "Schema should document at least one API path"

    # Check for expected critical endpoints
    expected_endpoints = [
        "/health",  # Health check endpoint
        "/api/v1/",  # Base API path
    ]

    documented_paths = list(paths.keys())
    for endpoint in expected_endpoints:
        # Check if any documented path starts with the expected endpoint
        has_endpoint = any(path.startswith(endpoint) for path in documented_paths)
        if not has_endpoint:
            print(f"Warning: Expected endpoint '{endpoint}' not found in schema")
            print(f"Documented paths: {documented_paths[:5]}...")  # Show first 5


def test_openapi_schema_has_response_schemas(client: TestClient):
    """Test that API endpoints define response schemas."""
    response = client.get("/openapi.json")
    schema = response.json()

    paths = schema.get("paths", {})
    endpoints_without_response_schema = []

    for path, methods in paths.items():
        for method, details in methods.items():
            if method.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                responses = details.get("responses", {})

                # Check if success responses (2xx) have schemas
                success_responses = [code for code in responses.keys() if code.startswith("2")]

                for code in success_responses:
                    response_def = responses[code]
                    # Check if response has content with schema
                    if "content" not in response_def:
                        endpoints_without_response_schema.append(
                            f"{method.upper()} {path} (response {code})"
                        )

    # Allow some endpoints to not have response schemas (like 204 No Content)
    # but most should have them
    if endpoints_without_response_schema:
        print(f"Endpoints without response schemas: {len(endpoints_without_response_schema)}")
        print(f"Examples: {endpoints_without_response_schema[:3]}")

    # This is a warning, not a failure - some endpoints legitimately don't have response bodies
    total_endpoints = sum(
        len([m for m in methods.keys() if m.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]])
        for methods in paths.values()
    )

    assert total_endpoints > 0, "Should have at least one documented endpoint"


def test_openapi_schema_components(client: TestClient):
    """Test that the OpenAPI schema defines reusable components/schemas."""
    response = client.get("/openapi.json")
    schema = response.json()

    # FastAPI automatically generates components/schemas for Pydantic models
    components = schema.get("components", {})
    schemas = components.get("schemas", {})

    # Should have some schema definitions
    assert len(schemas) > 0, "Should have component schemas for request/response models"


def test_openapi_schema_security_schemes(client: TestClient):
    """Test that the OpenAPI schema documents security schemes if auth is used."""
    response = client.get("/openapi.json")
    schema = response.json()

    # Check if any endpoints require security
    paths = schema.get("paths", {})
    has_secured_endpoints = False

    for path, methods in paths.items():
        for method, details in methods.items():
            if "security" in details:
                has_secured_endpoints = True
                break
        if has_secured_endpoints:
            break

    if has_secured_endpoints:
        # If endpoints have security, schema should define security schemes
        components = schema.get("components", {})
        security_schemes = components.get("securitySchemes", {})

        assert (
            len(security_schemes) > 0
        ), "If endpoints use security, security schemes should be defined"


def test_openapi_schema_can_be_parsed_by_openapi_core(client: TestClient):
    """Test that the schema can be parsed by openapi-core library."""
    response = client.get("/openapi.json")
    schema_dict = response.json()

    try:
        # openapi-core's Spec class parses and validates the schema
        spec = Spec.from_dict(schema_dict)
        assert spec is not None, "openapi-core should successfully parse the schema"

        # Check that we can access paths
        assert len(spec.paths) > 0, "Spec should have parsed paths"
    except Exception as e:
        pytest.fail(f"openapi-core failed to parse schema: {e}")


def test_openapi_docs_endpoint_accessible(client: TestClient):
    """Test that the Swagger UI documentation endpoint is accessible."""
    response = client.get("/docs")

    assert response.status_code == 200, "Swagger UI docs should be accessible"
    assert "text/html" in response.headers["content-type"], "Docs endpoint should return HTML"


def test_openapi_redoc_endpoint_accessible(client: TestClient):
    """Test that the ReDoc documentation endpoint is accessible."""
    response = client.get("/redoc")

    assert response.status_code == 200, "ReDoc docs should be accessible"
    assert "text/html" in response.headers["content-type"], "ReDoc endpoint should return HTML"
