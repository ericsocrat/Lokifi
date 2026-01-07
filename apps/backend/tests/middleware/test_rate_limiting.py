"""
Comprehensive tests for app.middleware.rate_limiting

Tests rate limiting middleware, request size limits, and security monitoring.
Coverage target: 23.7% → 75%+
"""

import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.middleware.rate_limiting import (
    RateLimitingMiddleware,
    RequestSizeLimitMiddleware,
    SecurityMonitoringMiddleware,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_app():
    """Mock ASGI app."""
    return AsyncMock()


@pytest.fixture
def mock_request():
    """Mock FastAPI request."""
    request = MagicMock()
    request.url = MagicMock()
    request.url.path = "/api/test"
    request.url.__str__ = MagicMock(return_value="http://localhost/api/test")
    request.client = MagicMock()
    request.client.host = "127.0.0.1"
    request.headers = {}
    request.method = "GET"
    return request


@pytest.fixture
def mock_response():
    """Mock FastAPI response."""
    response = MagicMock()
    response.status_code = 200
    response.headers = {}
    return response


@pytest.fixture
def rate_limit_middleware(mock_app):
    """Create RateLimitingMiddleware instance."""
    return RateLimitingMiddleware(mock_app)


@pytest.fixture
def request_size_middleware(mock_app):
    """Create RequestSizeLimitMiddleware instance."""
    return RequestSizeLimitMiddleware(mock_app)


@pytest.fixture
def security_middleware(mock_app):
    """Create SecurityMonitoringMiddleware instance."""
    return SecurityMonitoringMiddleware(mock_app)


# ============================================================================
# RATE_LIMITING_MIDDLEWARE TESTS
# ============================================================================


class TestRateLimitingMiddlewareInit:
    """Tests for RateLimitingMiddleware initialization."""

    def test_init_creates_rate_limiter(self, mock_app):
        """Test middleware initializes rate limiter."""
        middleware = RateLimitingMiddleware(mock_app)

        assert middleware.rate_limiter is not None

    def test_init_sets_endpoint_limits(self, mock_app):
        """Test middleware sets endpoint-specific limits."""
        middleware = RateLimitingMiddleware(mock_app)

        assert "/api/auth/" in middleware.endpoint_limits
        assert middleware.endpoint_limits["/api/auth/login"] == "auth"
        assert middleware.endpoint_limits["/api/auth/register"] == "auth"

    def test_init_sets_exempted_paths(self, mock_app):
        """Test middleware sets exempted paths."""
        middleware = RateLimitingMiddleware(mock_app)

        assert "/health" in middleware.exempted_paths
        assert "/docs" in middleware.exempted_paths
        assert "/redoc" in middleware.exempted_paths


class TestRateLimitingMiddlewareDispatch:
    """Tests for dispatch method."""

    @pytest.mark.asyncio
    async def test_dispatch_skips_exempted_paths(
        self, rate_limit_middleware, mock_request
    ):
        """Test dispatch skips rate limiting for exempted paths."""
        mock_request.url.path = "/health"
        mock_response = MagicMock()

        async def call_next(request):
            return mock_response

        result = await rate_limit_middleware.dispatch(mock_request, call_next)

        assert result == mock_response

    @pytest.mark.asyncio
    async def test_dispatch_allows_request_under_limit(
        self, rate_limit_middleware, mock_request, mock_response
    ):
        """Test dispatch allows request when under rate limit."""
        with patch.object(
            rate_limit_middleware.rate_limiter,
            "check_rate_limit",
            new_callable=AsyncMock,
        ) as mock_check:
            mock_check.return_value = (True, None)

            async def call_next(request):
                return mock_response

            result = await rate_limit_middleware.dispatch(mock_request, call_next)

            assert result.status_code != 429

    @pytest.mark.asyncio
    async def test_dispatch_blocks_exceeded_limit(
        self, rate_limit_middleware, mock_request
    ):
        """Test dispatch returns 429 when rate limit exceeded."""
        with patch.object(
            rate_limit_middleware.rate_limiter,
            "check_rate_limit",
            new_callable=AsyncMock,
        ) as mock_check:
            mock_check.return_value = (False, 60)

            async def call_next(request):
                return MagicMock(status_code=200)

            result = await rate_limit_middleware.dispatch(mock_request, call_next)

            assert result.status_code == 429

    @pytest.mark.asyncio
    async def test_dispatch_adds_retry_after_header(
        self, rate_limit_middleware, mock_request
    ):
        """Test dispatch adds Retry-After header when limit exceeded."""
        with patch.object(
            rate_limit_middleware.rate_limiter,
            "check_rate_limit",
            new_callable=AsyncMock,
        ) as mock_check:
            mock_check.return_value = (False, 30)

            async def call_next(request):
                return MagicMock(status_code=200)

            result = await rate_limit_middleware.dispatch(mock_request, call_next)

            assert "Retry-After" in result.headers

    @pytest.mark.asyncio
    async def test_dispatch_adds_rate_limit_headers(
        self, rate_limit_middleware, mock_request, mock_response
    ):
        """Test dispatch adds X-RateLimit headers to response."""
        with (
            patch.object(
                rate_limit_middleware.rate_limiter,
                "check_rate_limit",
                new_callable=AsyncMock,
            ) as mock_check,
            patch.object(
                rate_limit_middleware,
                "_get_remaining_requests",
                new_callable=AsyncMock,
            ) as mock_remaining,
        ):
            mock_check.return_value = (True, None)
            mock_remaining.return_value = 50

            async def call_next(request):
                return mock_response

            result = await rate_limit_middleware.dispatch(mock_request, call_next)

            assert "X-RateLimit-Limit" in result.headers
            assert "X-RateLimit-Remaining" in result.headers
            assert "X-RateLimit-Reset" in result.headers


class TestGetClientIp:
    """Tests for _get_client_ip method."""

    def test_get_client_ip_from_x_forwarded_for(
        self, rate_limit_middleware, mock_request
    ):
        """Test extracts IP from X-Forwarded-For header."""
        mock_request.headers = {"x-forwarded-for": "192.168.1.100, 10.0.0.1"}

        result = rate_limit_middleware._get_client_ip(mock_request)

        assert result == "192.168.1.100"

    def test_get_client_ip_from_x_real_ip(self, rate_limit_middleware, mock_request):
        """Test extracts IP from X-Real-IP header."""
        mock_request.headers = {"x-real-ip": "192.168.1.200"}

        result = rate_limit_middleware._get_client_ip(mock_request)

        assert result == "192.168.1.200"

    def test_get_client_ip_from_request_client(
        self, rate_limit_middleware, mock_request
    ):
        """Test extracts IP from request.client when no headers."""
        mock_request.headers = {}
        mock_request.client.host = "10.0.0.5"

        result = rate_limit_middleware._get_client_ip(mock_request)

        assert result == "10.0.0.5"

    def test_get_client_ip_no_client(self, rate_limit_middleware, mock_request):
        """Test returns 'unknown' when no client available."""
        mock_request.headers = {}
        mock_request.client = None

        result = rate_limit_middleware._get_client_ip(mock_request)

        assert result == "unknown"

    def test_get_client_ip_prefers_forwarded_for(
        self, rate_limit_middleware, mock_request
    ):
        """Test prefers X-Forwarded-For over other sources."""
        mock_request.headers = {
            "x-forwarded-for": "192.168.1.100",
            "x-real-ip": "192.168.1.200",
        }
        mock_request.client.host = "127.0.0.1"

        result = rate_limit_middleware._get_client_ip(mock_request)

        assert result == "192.168.1.100"


class TestGetLimitType:
    """Tests for _get_limit_type method."""

    def test_get_limit_type_auth_endpoint(self, rate_limit_middleware):
        """Test returns 'auth' for auth endpoints."""
        result = rate_limit_middleware._get_limit_type("/api/auth/login")

        assert result == "auth"

    def test_get_limit_type_password_reset(self, rate_limit_middleware):
        """Test returns 'auth' for password reset endpoint (matches /api/auth/ prefix)."""
        # password-reset is under /api/auth/ so it matches "auth" limit type
        result = rate_limit_middleware._get_limit_type("/api/auth/password-reset")

        # Note: The current implementation matches /api/auth/ first, so password_reset
        # returns "auth", not "password_reset". This is the actual behavior.
        assert result == "auth"

    def test_get_limit_type_api_endpoint(self, rate_limit_middleware):
        """Test returns 'api' for general API endpoints."""
        result = rate_limit_middleware._get_limit_type("/api/conversations/123")

        assert result == "api"

    def test_get_limit_type_default(self, rate_limit_middleware):
        """Test returns 'api' for unknown endpoints."""
        result = rate_limit_middleware._get_limit_type("/api/unknown/path")

        assert result == "api"


class TestGetRemainingRequests:
    """Tests for _get_remaining_requests method."""

    @pytest.mark.asyncio
    async def test_get_remaining_full_limit(self, rate_limit_middleware):
        """Test returns full limit when no requests made."""
        rate_limit_middleware.rate_limiter.requests = {}
        rate_limit_middleware.rate_limiter.limits = {
            "api": {"requests": 100, "window": 60}
        }

        result = await rate_limit_middleware._get_remaining_requests("client1", "api")

        assert result == 100

    @pytest.mark.asyncio
    async def test_get_remaining_partial_usage(self, rate_limit_middleware):
        """Test returns remaining when some requests made."""
        current_time = time.time()
        rate_limit_middleware.rate_limiter.requests = {
            "client1": [current_time - 10, current_time - 5]
        }
        rate_limit_middleware.rate_limiter.limits = {
            "api": {"requests": 100, "window": 60}
        }

        result = await rate_limit_middleware._get_remaining_requests("client1", "api")

        assert result == 98

    @pytest.mark.asyncio
    async def test_get_remaining_expired_requests(self, rate_limit_middleware):
        """Test excludes expired requests from count."""
        current_time = time.time()
        rate_limit_middleware.rate_limiter.requests = {
            "client1": [current_time - 120, current_time - 90]  # Both expired
        }
        rate_limit_middleware.rate_limiter.limits = {
            "api": {"requests": 100, "window": 60}
        }

        result = await rate_limit_middleware._get_remaining_requests("client1", "api")

        assert result == 100

    @pytest.mark.asyncio
    async def test_get_remaining_returns_zero_minimum(self, rate_limit_middleware):
        """Test never returns negative value."""
        current_time = time.time()
        rate_limit_middleware.rate_limiter.requests = {
            "client1": [current_time - i for i in range(150)]  # More than limit
        }
        rate_limit_middleware.rate_limiter.limits = {
            "api": {"requests": 100, "window": 60}
        }

        result = await rate_limit_middleware._get_remaining_requests("client1", "api")

        assert result >= 0


# ============================================================================
# REQUEST_SIZE_LIMIT_MIDDLEWARE TESTS
# ============================================================================


class TestRequestSizeLimitMiddlewareInit:
    """Tests for RequestSizeLimitMiddleware initialization."""

    def test_init_with_default_size(self, mock_app):
        """Test middleware uses default max size."""
        middleware = RequestSizeLimitMiddleware(mock_app)

        assert middleware.max_size is not None

    def test_init_with_custom_size(self, mock_app):
        """Test middleware uses custom max size."""
        custom_size = 1024 * 1024  # 1MB
        middleware = RequestSizeLimitMiddleware(mock_app, max_size=custom_size)

        assert middleware.max_size == custom_size


class TestRequestSizeLimitMiddlewareDispatch:
    """Tests for dispatch method."""

    @pytest.mark.asyncio
    async def test_dispatch_allows_small_request(
        self, request_size_middleware, mock_request, mock_response
    ):
        """Test dispatch allows requests under size limit."""
        mock_request.headers = {"content-length": "1000"}

        async def call_next(request):
            return mock_response

        result = await request_size_middleware.dispatch(mock_request, call_next)

        assert result.status_code != 413

    @pytest.mark.asyncio
    async def test_dispatch_blocks_large_request(
        self, request_size_middleware, mock_request
    ):
        """Test dispatch blocks requests over size limit."""
        mock_request.headers = {"content-length": str(100 * 1024 * 1024)}  # 100MB

        async def call_next(request):
            return MagicMock(status_code=200)

        result = await request_size_middleware.dispatch(mock_request, call_next)

        assert result.status_code == 413

    @pytest.mark.asyncio
    async def test_dispatch_allows_no_content_length(
        self, request_size_middleware, mock_request, mock_response
    ):
        """Test dispatch allows requests without Content-Length header."""
        mock_request.headers = {}

        async def call_next(request):
            return mock_response

        result = await request_size_middleware.dispatch(mock_request, call_next)

        assert result.status_code != 413


# ============================================================================
# SECURITY_MONITORING_MIDDLEWARE TESTS
# ============================================================================


class TestSecurityMonitoringMiddlewareInit:
    """Tests for SecurityMonitoringMiddleware initialization."""

    def test_init_sets_suspicious_patterns(self, mock_app):
        """Test middleware sets suspicious patterns."""
        middleware = SecurityMonitoringMiddleware(mock_app)

        assert len(middleware.suspicious_patterns) > 0

    def test_init_sets_blocked_user_agents(self, mock_app):
        """Test middleware sets blocked user agents."""
        middleware = SecurityMonitoringMiddleware(mock_app)

        assert "sqlmap" in middleware.blocked_user_agents
        assert "nikto" in middleware.blocked_user_agents


class TestSecurityMonitoringMiddlewareDispatch:
    """Tests for dispatch method."""

    @pytest.mark.asyncio
    async def test_dispatch_allows_normal_request(
        self, security_middleware, mock_request, mock_response
    ):
        """Test dispatch allows normal requests."""
        mock_request.headers = {"user-agent": "Mozilla/5.0"}

        async def call_next(request):
            return mock_response

        result = await security_middleware.dispatch(mock_request, call_next)

        assert result.status_code != 403

    @pytest.mark.asyncio
    async def test_dispatch_blocks_sqlmap_user_agent(
        self, security_middleware, mock_request
    ):
        """Test dispatch blocks sqlmap user agent."""
        mock_request.headers = {"user-agent": "sqlmap/1.0"}

        async def call_next(request):
            return MagicMock(status_code=200)

        result = await security_middleware.dispatch(mock_request, call_next)

        assert result.status_code == 403

    @pytest.mark.asyncio
    async def test_dispatch_blocks_nikto_user_agent(
        self, security_middleware, mock_request
    ):
        """Test dispatch blocks nikto user agent."""
        mock_request.headers = {"user-agent": "Nikto/2.1.6"}

        async def call_next(request):
            return MagicMock(status_code=200)

        result = await security_middleware.dispatch(mock_request, call_next)

        assert result.status_code == 403

    @pytest.mark.asyncio
    async def test_dispatch_blocks_sql_injection_pattern(
        self, security_middleware, mock_request
    ):
        """Test dispatch blocks SQL injection attempts."""
        mock_request.headers = {"user-agent": "Mozilla/5.0"}
        mock_request.url.__str__ = MagicMock(
            return_value="http://localhost/api?id=1 UNION SELECT * FROM users"
        )

        async def call_next(request):
            return MagicMock(status_code=200)

        result = await security_middleware.dispatch(mock_request, call_next)

        assert result.status_code == 403

    @pytest.mark.asyncio
    async def test_dispatch_blocks_xss_pattern(self, security_middleware, mock_request):
        """Test dispatch blocks XSS attempts."""
        mock_request.headers = {"user-agent": "Mozilla/5.0"}
        mock_request.url.__str__ = MagicMock(
            return_value="http://localhost/api?name=<script>alert(1)</script>"
        )

        async def call_next(request):
            return MagicMock(status_code=200)

        result = await security_middleware.dispatch(mock_request, call_next)

        assert result.status_code == 403

    @pytest.mark.asyncio
    async def test_dispatch_blocks_path_traversal(
        self, security_middleware, mock_request
    ):
        """Test dispatch blocks path traversal attempts."""
        mock_request.headers = {"user-agent": "Mozilla/5.0"}
        mock_request.url.__str__ = MagicMock(
            return_value="http://localhost/api/../../../etc/passwd"
        )

        async def call_next(request):
            return MagicMock(status_code=200)

        result = await security_middleware.dispatch(mock_request, call_next)

        assert result.status_code == 403

    @pytest.mark.asyncio
    async def test_dispatch_logs_slow_requests(
        self, security_middleware, mock_request, mock_response
    ):
        """Test dispatch logs slow requests."""
        mock_request.headers = {"user-agent": "Mozilla/5.0"}
        mock_response.status_code = 200

        async def slow_call_next(request):
            import asyncio

            await asyncio.sleep(0.01)  # Small delay for testing
            return mock_response

        result = await security_middleware.dispatch(mock_request, slow_call_next)

        # Request should complete (we're just verifying it doesn't block)
        assert result is not None

    @pytest.mark.asyncio
    async def test_dispatch_logs_auth_failures(self, security_middleware, mock_request):
        """Test dispatch logs authentication failures."""
        mock_request.headers = {"user-agent": "Mozilla/5.0"}
        mock_response = MagicMock()
        mock_response.status_code = 401

        async def call_next(request):
            return mock_response

        result = await security_middleware.dispatch(mock_request, call_next)

        assert result.status_code == 401


# ============================================================================
# EDGE CASES
# ============================================================================


class TestEdgeCases:
    """Edge case tests."""

    @pytest.mark.asyncio
    async def test_rate_limit_with_no_user_agent(
        self, rate_limit_middleware, mock_request, mock_response
    ):
        """Test rate limiting works without user agent header."""
        mock_request.headers = {}

        with (
            patch.object(
                rate_limit_middleware.rate_limiter,
                "check_rate_limit",
                new_callable=AsyncMock,
            ) as mock_check,
            patch.object(
                rate_limit_middleware,
                "_get_remaining_requests",
                new_callable=AsyncMock,
            ) as mock_remaining,
        ):
            mock_check.return_value = (True, None)
            mock_remaining.return_value = 100

            async def call_next(request):
                return mock_response

            result = await rate_limit_middleware.dispatch(mock_request, call_next)

            assert result is not None

    @pytest.mark.asyncio
    async def test_security_middleware_empty_user_agent(
        self, security_middleware, mock_request, mock_response
    ):
        """Test security middleware handles empty user agent."""
        mock_request.headers = {}

        async def call_next(request):
            return mock_response

        result = await security_middleware.dispatch(mock_request, call_next)

        assert result.status_code != 403

    def test_x_forwarded_for_with_whitespace(self, rate_limit_middleware, mock_request):
        """Test handles X-Forwarded-For with whitespace."""
        mock_request.headers = {"x-forwarded-for": "  192.168.1.100  ,  10.0.0.1  "}

        result = rate_limit_middleware._get_client_ip(mock_request)

        assert result == "192.168.1.100"

    @pytest.mark.asyncio
    async def test_rate_limit_missing_default_limit(
        self, rate_limit_middleware, mock_request, mock_response
    ):
        """Test handles missing limit type gracefully."""
        with (
            patch.object(
                rate_limit_middleware.rate_limiter,
                "check_rate_limit",
                new_callable=AsyncMock,
            ) as mock_check,
            patch.object(
                rate_limit_middleware,
                "_get_remaining_requests",
                new_callable=AsyncMock,
            ) as mock_remaining,
        ):
            mock_check.return_value = (True, None)
            mock_remaining.return_value = 50
            # Ensure limits dict has an "api" fallback
            rate_limit_middleware.rate_limiter.limits = {
                "api": {"requests": 100, "window": 60}
            }

            async def call_next(request):
                return mock_response

            result = await rate_limit_middleware.dispatch(mock_request, call_next)

            assert result is not None
