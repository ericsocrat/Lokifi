"""
API Version Detection Middleware
Extracts and tracks API version from request, adds version info to responses
"""

from typing import Callable

from fastapi import Request, Response

from app.core.versioning import APIVersion, get_api_version


class VersionDetectionMiddleware:
    """Middleware to detect and track API version in requests/responses"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, request: Request, call_next: Callable) -> Response:
        """
        Detect API version from request and attach to state
        Also add version headers to response
        """
        # Extract version from path or headers
        version = get_api_version(request, request.headers.get("Accept-Version"))

        # Store version in request state for use in endpoints
        request.state.api_version = version

        # Call next middleware/endpoint
        response = await call_next(request)

        # Add version header to response
        response.headers["X-API-Version"] = version.value
        response.headers["Vary"] = "Accept-Version"

        return response
