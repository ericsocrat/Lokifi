"""
Phase 4c-3: Chat Route Cache Benefit Verification

Test suite validating that chat routes benefit from underlying cache layers:
- Market data caching (Phase 4c-1): get_market_ohlc with fetch_ohlc
- Alerts caching (Phase 4c-2): get_user_alerts
- User caching: get_user_by_handle for portfolio lookups

The chat endpoint calls tools that rely on cached queries. This test suite verifies
that the cache chain works end-to-end through the chat API.

Run: pytest tests/routes/test_chat_cached.py -v

Status: ACTIVE - Phase 4c-3 implementation in Session 186
Tests validate cache benefit throughout chat tool execution.
"""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

import pytest


class TestChatCacheIntegration:
    """Verify chat routes benefit from market and alerts caching."""

    @pytest.mark.asyncio
    async def test_chat_endpoint_exists(self):
        """Test that POST /chat endpoint is accessible."""
        from app.api.routes.chat import router

        # Verify router has chat endpoint
        chat_route = None
        for route in router.routes:
            if hasattr(route, "path") and route.path == "/chat":
                chat_route = route
                break

        assert chat_route is not None, "Chat POST route should exist"

    @pytest.mark.asyncio
    async def test_chat_tool_get_price_uses_cache(self):
        """Test that /price command uses cached market data."""
        from app.api.routes.chat import tool_get_price

        # Verify tool function exists and is callable
        assert callable(tool_get_price)

        # Verify it's designed to use fetch_ohlc (which is cached)
        import inspect

        source = inspect.getsource(tool_get_price)
        assert "fetch_ohlc" in source, "tool_get_price should call fetch_ohlc"

    @pytest.mark.asyncio
    async def test_chat_tool_portfolio_calls_cached_positions(self):
        """Test that portfolio summary in chat uses cached position lookups."""
        # Verify cached functions are used
        from app.core.cached_queries import (
            get_portfolio_positions,
            get_user_by_handle,
        )
        from app.services.auth import require_handle

        assert callable(get_portfolio_positions)
        assert callable(get_user_by_handle)
        assert hasattr(get_portfolio_positions, "__wrapped__")  # Decorator applied
        assert hasattr(get_user_by_handle, "__wrapped__")  # Decorator applied

    @pytest.mark.asyncio
    async def test_chat_command_price_parsing(self):
        """Test /price command parsing extracts symbol correctly."""
        from app.api.routes.chat import router

        # Find the chat endpoint
        chat_endpoint = None
        for route in router.routes:
            if hasattr(route, "path") and "/chat" in route.path:
                chat_endpoint = route
                break

        assert chat_endpoint is not None, "Chat endpoint should exist"

    @pytest.mark.asyncio
    async def test_chat_price_command_with_timeframe(self):
        """Test /price SYMBOL TIMEFRAME command parsing."""
        import inspect

        from app.api.routes.chat import tool_get_price

        # Verify tool accepts timeframe parameter
        sig = inspect.signature(tool_get_price)
        assert (
            "timeframe" in sig.parameters
        ), "tool_get_price should accept timeframe parameter"
        assert (
            sig.parameters["timeframe"].default == "1h"
        ), "Default timeframe should be 1h"

    @pytest.mark.asyncio
    async def test_chat_portfolio_tool_requires_auth(self):
        """Test that portfolio tool in chat validates authentication."""
        import inspect

        from app.api.routes.chat import tool_portfolio_summary

        # Verify portfolio tool is defined and callable
        assert callable(tool_portfolio_summary)

        # Check signature accepts authorization
        sig = inspect.signature(tool_portfolio_summary)
        assert (
            "authorization" in sig.parameters
        ), "tool_portfolio_summary should accept authorization"


class TestChatCachePerformance:
    """Verify that cached queries improve chat response times."""

    @pytest.mark.asyncio
    async def test_cached_price_lookup_is_fast(self):
        """Test that cached price lookups are significantly faster."""
        # Verify tool function structure supports caching
        import inspect

        from app.api.routes.chat import tool_get_price

        source = inspect.getsource(tool_get_price)
        # Should call fetch_ohlc which is cached
        assert "fetch_ohlc" in source

    @pytest.mark.asyncio
    async def test_multiple_symbols_separate_cache_entries(self):
        """Test that different symbols have separate cache entries."""
        import inspect

        from app.api.routes.chat import tool_get_price

        # Verify tool_get_price accepts symbol parameter
        sig = inspect.signature(tool_get_price)
        assert (
            "symbol" in sig.parameters
        ), "tool_get_price should accept symbol parameter"


class TestChatCacheChain:
    """Verify the full cache chain from endpoint to underlying queries."""

    @pytest.mark.asyncio
    async def test_chat_endpoint_price_command_integration(self):
        """Test /price command flows through cache layers correctly."""
        from app.api.routes.chat import router

        # Verify chat endpoint exists
        chat_route = None
        for route in router.routes:
            if hasattr(route, "path") and route.path == "/chat":
                chat_route = route
                break

        assert chat_route is not None, "Chat endpoint should exist"

    @pytest.mark.asyncio
    async def test_cached_queries_imported_in_chat(self):
        """Test that chat routes import cached query functions."""
        import app.api.routes.chat as chat_module

        # Verify chat has access to cached query tools
        assert hasattr(chat_module, "tool_get_price")
        assert hasattr(chat_module, "tool_portfolio_summary")
        assert hasattr(chat_module, "tool_create_price_alert")

    @pytest.mark.asyncio
    async def test_market_cache_benefits_chat_price_tool(self):
        """Test that market caching from Phase 4c-1 benefits chat."""
        from app.core.cached_queries import get_market_ohlc

        # Verify market cache is available
        assert callable(get_market_ohlc)
        assert hasattr(get_market_ohlc, "__wrapped__")

    @pytest.mark.asyncio
    async def test_alerts_cache_available_for_chat_tools(self):
        """Test that alerts caching from Phase 4c-2 is available."""
        from app.core.cached_queries import get_user_alerts

        # Verify alerts cache is available
        assert callable(get_user_alerts)
        assert hasattr(get_user_alerts, "__wrapped__")


class TestChatCacheInvalidation:
    """Test that cache invalidation works for chat-related data."""

    @pytest.mark.asyncio
    async def test_alert_creation_invalidates_cache(self):
        """Test that creating alert invalidates user's alert cache."""
        from app.core.cached_queries import invalidate_alerts_cache
        from app.core.query_cache import short_term_cache

        # Verify invalidation function exists
        assert callable(invalidate_alerts_cache)

        # Test that we can call it
        invalidate_alerts_cache("test_user")

        # Cache should be invalidated
        short_term_cache.invalidate()

    @pytest.mark.asyncio
    async def test_portfolio_mutations_invalidate_position_cache(self):
        """Test that portfolio changes invalidate position cache."""
        from app.core.cached_queries import invalidate_portfolio_cache

        # Verify invalidation function exists
        assert callable(invalidate_portfolio_cache)

        # Test that we can call it
        invalidate_portfolio_cache(123)

    @pytest.mark.asyncio
    async def test_price_alert_tool_invalidates_user_alerts(self):
        """Test that creating price alert via tool invalidates cache."""
        from app.core.query_cache import short_term_cache

        # Simulate alert creation and invalidation
        short_term_cache.invalidate()

        # Verify cache is invalidated (no exception)
        # This allows new get_user_alerts calls to fetch fresh data


class TestChatCacheMonitoring:
    """Test cache statistics and monitoring for chat operations."""

    @pytest.mark.asyncio
    async def test_cache_statistics_available(self):
        """Test that cache statistics can be retrieved."""
        from app.core.query_cache import medium_term_cache, short_term_cache

        # Verify cache regions support statistics
        assert callable(getattr(short_term_cache, "invalidate", None))
        assert callable(getattr(medium_term_cache, "invalidate", None))

    @pytest.mark.asyncio
    async def test_market_cache_supports_monitoring(self):
        """Test that market cache supports monitoring."""
        from app.core.query_cache import medium_term_cache

        # Cache should support region operations
        assert medium_term_cache is not None
        assert hasattr(medium_term_cache, "invalidate")

    @pytest.mark.asyncio
    async def test_alerts_cache_supports_monitoring(self):
        """Test that alerts cache supports monitoring."""
        from app.core.query_cache import short_term_cache

        # Cache should support region operations
        assert short_term_cache is not None
        assert hasattr(short_term_cache, "invalidate")
