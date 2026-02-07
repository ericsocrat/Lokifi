"""
API Versioning Utilities
Provides version detection, routing, and deprecation handling
"""

from datetime import datetime, timezone
from email.utils import format_datetime
from enum import Enum

from fastapi import Header, Request


class APIVersion(str, Enum):
    """Supported API versions"""

    V1 = "v1"
    V2 = "v2"


def _format_http_date(date_str: str) -> str:
    """Format ISO 8601 or HTTP-date to RFC 7231 HTTP-date."""
    if "," in date_str:
        return date_str
    normalized = date_str.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return format_datetime(parsed, usegmt=True)


class DeprecationWarning:
    """Represents a deprecation notice for an endpoint"""

    def __init__(
        self,
        version: str,
        sunset_date: str,
        deprecation_date: str | None = None,
        replacement_endpoint: str | None = None,
        migration_guide_url: str | None = None,
    ):
        self.version = version
        self.sunset_date = sunset_date
        self.deprecation_date = deprecation_date
        self.replacement_endpoint = replacement_endpoint
        self.migration_guide_url = migration_guide_url

    def to_header(self) -> dict[str, str]:
        """Convert to HTTP Deprecation headers"""
        deprecation_value = (
            "true"
            if self.deprecation_date is None
            else _format_http_date(self.deprecation_date)
        )
        headers = {
            "Deprecation": deprecation_value,
            "Sunset": _format_http_date(self.sunset_date),
        }
        links: list[str] = []
        if self.replacement_endpoint:
            links.append(f'<{self.replacement_endpoint}>; rel="successor-version"')
        if self.migration_guide_url:
            links.append(f'<{self.migration_guide_url}>; rel="deprecation"')
        if links:
            headers["Link"] = ", ".join(links)
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


# V1 Deprecation Notices (RFC 8594)
V1_GLOBAL_DEPRECATION = DeprecationWarning(
    version="v1",
    sunset_date="2026-12-31T23:59:59Z",
    migration_guide_url="https://docs.lokifi.com/api/migration-v1-to-v2",
)


def get_deprecation_warning(
    api_version: APIVersion,
    path: str,
) -> DeprecationWarning | None:
    """Return deprecation warning for this version/path if applicable."""
    if api_version == APIVersion.V1 and path.startswith("/api/"):
        return V1_GLOBAL_DEPRECATION
    return None
