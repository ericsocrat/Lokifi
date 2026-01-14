"""
Tests for app.api.routes.market

Tests the /market endpoints including health check.
OHLC endpoint integration tests are in test_market_cached_integration.py
"""

from app.api.routes.market import health

# ============================================================================
# HEALTH ENDPOINT TESTS
# ============================================================================


class TestHealthEndpoint:
    """Tests for /market/health endpoint"""

    def test_health_returns_ok(self):
        """Test that health endpoint returns OK status"""
        result = health()
        assert result == {"ok": True}
        assert isinstance(result, dict)
        assert "ok" in result
        assert result["ok"] is True


# ============================================================================
# NOTE: OHLC Endpoint Tests
# ============================================================================
# OHLC endpoint tests are in test_market_cached_integration.py
# Unit tests for OHLC are complex due to @cached_query decorator and
# dogpile.cache interactions. Integration tests provide better coverage.
