"""
API Version Detection Middleware
Extracts and tracks API version from request, adds version info to responses
"""

from app.core.versioning import APIVersion, get_api_version
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class VersionDetectionMiddleware(BaseHTTPMiddleware):
    """Middleware to detect and track API version in requests/responses"""

    async def dispatch(self, request: Request, call_next) -> Response:
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
