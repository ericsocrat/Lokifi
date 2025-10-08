"""
Rate Limiting Middleware for Lokifi API
Implements sliding window rate limiting with Redis backend
"""

import logging
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.security_config import security_config
from app.services.enhanced_rate_limiter import EnhancedRateLimiter

logger = logging.getLogger(__name__)


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce rate limiting on API endpoints"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.rate_limiter = EnhancedRateLimiter()

        # Endpoint-specific rate limit mappings
        self.endpoint_limits = {
            "/api/auth/": "auth",
            "/api/auth/login": "auth",
            "/api/auth/register": "auth",
            "/api/auth/password-reset": "password_reset",
            "/api/conversations/": "api",
            "/api/profile/": "api",
            "/api/follow/": "api",
            "/api/search/": "api",
        }

        # Rate limit exemptions (health checks, etc.)
        self.exempted_paths = {
            "/health",
            "/api/health",
            "/docs",
            "/redoc",
            "/openapi.json",
        }

    async def dispatch(self, request: Request, call_next):
        """Apply rate limiting before processing request"""

        # Skip rate limiting for exempted paths
        if request.url.path in self.exempted_paths:
            return await call_next(request)

        # Get client identifier (IP + User-Agent for better uniqueness)
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "unknown")
        client_id = f"{client_ip}:{hash(user_agent) % 10000}"

        # Determine rate limit type based on endpoint
        limit_type = self._get_limit_type(request.url.path)

        # Check rate limit
        is_allowed, retry_after = await self.rate_limiter.check_rate_limit(
            client_id, limit_type
        )

        if not is_allowed:
            logger.warning(
                f"Rate limit exceeded for {client_ip} on {request.url.path} "
                f"(type: {limit_type})"
            )

            # Return rate limit exceeded response
            headers = {}
            if retry_after:
                headers["Retry-After"] = str(int(retry_after))

            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Try again in {int(retry_after) if retry_after else 60} seconds.",
                    "type": "rate_limit_error",
                },
                headers=headers,
            )

        # Add rate limiting headers to response
        response = await call_next(request)

        # Get current usage for headers
        limit_config = self.rate_limiter.limits.get(
            limit_type, self.rate_limiter.limits["api"]
        )
        remaining = await self._get_remaining_requests(client_id, limit_type)

        response.headers["X-RateLimit-Limit"] = str(limit_config["requests"])
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(
            int(time.time() + limit_config["window"])
        )

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded IP headers (from load balancers/proxies)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fallback to direct client IP
        return request.client.host if request.client else "unknown"

    def _get_limit_type(self, path: str) -> str:
        """Determine rate limit type based on request path"""
        for endpoint, limit_type in self.endpoint_limits.items():
            if path.startswith(endpoint):
                return limit_type

        # Default to general API rate limit
        return "api"

    async def _get_remaining_requests(self, client_id: str, limit_type: str) -> int:
        """Get remaining requests for rate limit headers"""
        limit_config = self.rate_limiter.limits.get(
            limit_type, self.rate_limiter.limits["api"]
        )
        max_requests = limit_config["requests"]

        # Get current request count
        request_times = self.rate_limiter.requests.get(client_id, [])
        current_time = time.time()
        window_size = limit_config["window"]

        # Count requests in current window
        cutoff_time = current_time - window_size
        recent_requests = len([t for t in request_times if t > cutoff_time])

        return max(0, max_requests - recent_requests)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to limit request payload size"""

    def __init__(self, app: ASGIApp, max_size: int | None = None):
        super().__init__(app)
        self.max_size = max_size or security_config.MAX_REQUEST_SIZE

    async def dispatch(self, request: Request, call_next):
        """Check request size before processing"""

        # Check Content-Length header
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            logger.warning(
                f"Request size {content_length} exceeds limit {self.max_size} "
                f"from {request.client.host if request.client else 'unknown'}"
            )

            return JSONResponse(
                status_code=413,
                content={
                    "error": "Payload too large",
                    "message": f"Request size exceeds maximum allowed size of {self.max_size} bytes",
                    "max_size": self.max_size,
                },
            )

        return await call_next(request)


class SecurityMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for security event monitoring and alerting"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.suspicious_patterns = [
            # SQL injection attempts
            r"(?i)(union|select|insert|delete|drop|create|alter)\s+",
            # XSS attempts
            r"(?i)<script|javascript:|on\w+\s*=",
            # Path traversal
            r"\.\./|\.\.\\",
            # Command injection
            r"(?i)(;|\||&|`|\$\()",
        ]

        self.blocked_user_agents = ["sqlmap", "nikto", "nmap", "masscan", "zap"]

    async def dispatch(self, request: Request, call_next):
        """Monitor requests for security threats"""

        # Check for suspicious user agents
        user_agent = request.headers.get("user-agent", "").lower()
        if any(blocked in user_agent for blocked in self.blocked_user_agents):
            logger.critical(
                f"Blocked suspicious user agent: {user_agent} "
                f"from {request.client.host if request.client else 'unknown'}"
            )
            return JSONResponse(
                status_code=403,
                content={"error": "Forbidden", "message": "Access denied"},
            )

        # Check for suspicious patterns in URL and query parameters
        full_url = str(request.url)
        for pattern in self.suspicious_patterns:
            import re

            if re.search(pattern, full_url):
                logger.critical(
                    f"Suspicious request pattern detected: {pattern} "
                    f"in URL: {full_url} "
                    f"from {request.client.host if request.client else 'unknown'}"
                )
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "Forbidden",
                        "message": "Suspicious request detected",
                    },
                )

        # Process request and monitor response
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        # Log slow requests (potential DoS attempts)
        if process_time > 5.0:  # 5 seconds
            logger.warning(
                f"Slow request detected: {process_time:.2f}s "
                f"for {request.method} {request.url.path} "
                f"from {request.client.host if request.client else 'unknown'}"
            )

        # Log authentication failures
        if response.status_code == 401:
            logger.warning(
                f"Authentication failure: {request.method} {request.url.path} "
                f"from {request.client.host if request.client else 'unknown'}"
            )

        return response
