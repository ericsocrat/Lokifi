"""
Example versioned endpoints demonstrating API versioning

This file shows how to create endpoints that respond differently
based on the API version detected in the request.

Example:
  - GET /api/v1/example/version -> Returns v1 schema
  - GET /api/v2/example/version -> Returns v2 schema with additional fields
"""

from fastapi import APIRouter, Request

from app.core.versioning import APIVersion

router = APIRouter(prefix="/example", tags=["Versioning Examples"])


@router.get("/version")
async def get_version(request: Request):
    """
    Get API version being used for this request

    Returns version detected from URL path or Accept-Version header
    """
    api_version = request.state.api_version
    return {
        "version": api_version.value,
        "message": f"You are using API {api_version.value}",
    }


@router.get("/schema")
async def get_schema(request: Request):
    """
    Example showing different response schema for v1 vs v2

    v1: Returns basic user object
    v2: Returns user object with additional metadata
    """
    api_version = request.state.api_version

    base_response = {
        "id": "usr_123",
        "name": "John Doe",
        "email": "john@example.com",
    }

    if api_version == APIVersion.V2:
        # V2 adds additional fields
        base_response.update({
            "created_at": "2026-02-07T00:00:00Z",
            "updated_at": "2026-02-07T12:00:00Z",
            "metadata": {
                "last_login": "2026-02-07T11:30:00Z",
                "login_count": 42,
            },
        })

    return base_response


@router.get("/compatibility")
async def compatibility_info(request: Request):
    """
    Information about endpoint compatibility across versions
    """
    api_version = request.state.api_version

    return {
        "current_version": api_version.value,
        "supported_versions": ["v1", "v2"],
        "default_version": "v1",
        "v1": {
            "status": "stable",
            "sunset_date": None,
            "features": ["basic_endpoints"],
        },
        "v2": {
            "status": "stable",
            "sunset_date": None,
            "features": ["basic_endpoints", "enhanced_metadata", "new_fields"],
        },
    }
