"""
API Version Detection Middleware
Extracts and tracks API version from request, adds version info to responses
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.versioning import (
    APIVersion,
    get_api_version,
    get_deprecation_warning,
)


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

        deprecation = get_deprecation_warning(version, request.url.path)
        if deprecation:
            deprecation_headers = deprecation.to_header()
            for header_name, header_value in deprecation_headers.items():
                if header_name == "Link" and "Link" in response.headers:
                    response.headers["Link"] = (
                        f"{response.headers['Link']}, {header_value}"
                    )
                else:
                    response.headers[header_name] = header_value

        return response
