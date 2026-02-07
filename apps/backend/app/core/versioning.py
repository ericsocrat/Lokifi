"""
API Versioning Utilities
Provides version detection, routing, and deprecation handling
"""

from enum import Enum

from fastapi import Header, Request


class APIVersion(str, Enum):
    """Supported API versions"""

    V1 = "v1"
    V2 = "v2"


class DeprecationWarning:
    """Represents a deprecation notice for an endpoint"""

    def __init__(
        self,
        version: str,
        sunset_date: str,
        replacement_endpoint: str | None = None,
        migration_guide_url: str | None = None,
    ):
        self.version = version
        self.sunset_date = sunset_date
        self.replacement_endpoint = replacement_endpoint
        self.migration_guide_url = migration_guide_url

    def to_header(self) -> dict[str, str]:
        """Convert to HTTP Deprecation headers"""
        headers = {
            "Deprecation": "true",
            "Sunset": self.sunset_date,
        }
        if self.replacement_endpoint:
            headers["Link"] = f'<{self.replacement_endpoint}>; rel="successor-version"'
        return headers


def get_api_version(
    request: Request,
    accept_version: str | None = Header(None),
) -> APIVersion:
    """
    Extract API version from request.

    Priority order:
    1. URL path (/api/v1/... or /api/v2/...)
    2. Accept-Version header (if provided)
    3. Default to v1 (backward compatibility)

    Args:
        request: FastAPI Request object
        accept_version: Optional Accept-Version header value

    Returns:
        APIVersion enum (V1 or V2)
    """
    # Try to extract from URL path
    path_parts = request.url.path.split("/")
    for i, part in enumerate(path_parts):
        if part.startswith("v") and len(part) == 2 and part[1].isdigit():
            version_str = part
            try:
                return APIVersion(version_str)
            except ValueError:
                pass

    # Try Accept-Version header
    if accept_version:
        accept_version_lower = accept_version.lower().strip()
        try:
            return APIVersion(accept_version_lower)
        except ValueError:
            pass

    # Default to v1 for backward compatibility
    return APIVersion.V1


def version_endpoint(
    description: str = "",
    deprecated: DeprecationWarning | None = None,
    versions: list[APIVersion] | None = None,
) -> dict:
    """
    Generate OpenAPI metadata for a versioned endpoint.

    Args:
        description: Endpoint description
        deprecated: Optional deprecation warning
        versions: List of versions this endpoint supports

    Returns:
        Dictionary of OpenAPI parameters
    """
    return {
        "summary": description,
        "deprecated": deprecated is not None if deprecated else False,
    }


# V1 Deprecation Notices (not yet deprecated, but for future use)
V1_DEPRECATION = {
    "users": DeprecationWarning(
        version="v1",
        sunset_date="2026-12-31T00:00:00Z",
        replacement_endpoint="/api/v2/users",
        migration_guide_url="https://docs.lokifi.com/api/migration-v1-to-v2",
    ),
}
