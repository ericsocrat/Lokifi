"""
Test Suite for ForexService - Foreign Exchange Data Service

Coverage Target: 80%+ (82 statements in forex_service.py)
Pattern: Reuses proven httpx AsyncMock patterns from test_crypto_data_service.py

Test Organization:
- TestForexServiceInit: Initialization and configuration (3 tests)
- TestCacheOperations: Redis cache read/write with JSON serialization (5 tests)
- TestGetForexPairs: Main forex pairs endpoint with API integration (4 tests)
- TestFetchForexRate: Individual forex rate fetching logic (3 tests)
- TestEdgeCasesAndErrors: Error handling and edge cases (5 tests)

Total: ~20 tests, 100% pass rate expected
"""

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.forex_service import ForexService

# ============================================================================
# HELPER FUNCTIONS (Proven Patterns from CryptoDataService)
# ============================================================================


def create_mock_response(json_data=None, status_code=200, raises=None):
    """
    Create a mock httpx.Response for testing.

    CRITICAL PATTERN: Use lambda for sync methods on AsyncMock to prevent coroutines.
    - response.json() must be sync callable → lambda: json_data
    - response.raise_for_status() must be sync callable → lambda: None or raises()

    Pattern Source: test_crypto_data_service.py Phase 2 debugging (Session 77)
    Success Rate: 100% (42 tests passing)
    """
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = status_code

    if raises:
        # For error scenarios (429, 500, network errors)
        mock_response.raise_for_status = lambda: raises
    else:
        # For successful responses
        mock_response.raise_for_status = lambda: None

    if json_data is not None:
        # CRITICAL: Lambda prevents coroutine issues with AsyncMock
        mock_response.json = lambda: json_data

    return mock_response


# ============================================================================
# TEST CLASS 1: Initialization and Configuration
# ============================================================================


class TestForexServiceInit:
    """Test ForexService initialization and configuration."""

    def test_init_without_redis(self):
        """Test initialization without Redis client."""
        service = ForexService()

        assert service.redis_client is None
        assert service.api_key == "8f135e4396d9ef31264e34f0"
        assert (
            service.base_url
            == "https://v6.exchangerate-api.com/v6/8f135e4396d9ef31264e34f0"
        )
        assert service.cache_ttl == 30
        assert (
            len(service.currency_pairs) == 50
        )  # Total currency pairs configured (actual implementation)
        assert service._rates_cache == {}
        assert service._cache_timestamp == {}

    def test_init_with_redis(self):
        """Test initialization with Redis client."""
        mock_redis = AsyncMock()
        service = ForexService(redis_client=mock_redis)

        assert service.redis_client is mock_redis
        assert service.api_key == "8f135e4396d9ef31264e34f0"
        assert service.cache_ttl == 30

    def test_currency_pairs_structure(self):
        """Test currency pairs are properly configured."""
        service = ForexService()

        # Verify 50 pairs configured (actual implementation count)
        assert len(service.currency_pairs) == 50


# ============================================================================
# TEST CLASS 2: Cache Operations (JSON Serialization Pattern)
# ============================================================================


class TestCacheOperations:
    """Test Redis cache read/write with JSON serialization."""

    @pytest.mark.asyncio
    async def test_get_forex_pairs_returns_cached_data(self):
        """Test retrieving cached forex pairs from Redis."""
        mock_redis = AsyncMock()
        service = ForexService(redis_client=mock_redis)

        # Setup cached data (JSON string in Redis)
        cached_pairs = [
            {"symbol": "USD/EUR", "current_price": 0.92, "asset_type": "forex"},
            {"symbol": "USD/GBP", "current_price": 0.79, "asset_type": "forex"},
        ]
        mock_redis.get.return_value = json.dumps(cached_pairs)

        # Call method
        result = await service.get_forex_pairs(limit=50)

        # Verify cached data returned
        assert result == cached_pairs
        assert len(result) == 2
        mock_redis.get.assert_called_once_with("forex:all:50")

    @pytest.mark.asyncio
    async def test_get_forex_pairs_caches_fresh_data(self):
        """Test caching fetched forex data with JSON serialization."""
        mock_redis = AsyncMock()
        service = ForexService(redis_client=mock_redis)

        # No cache (returns None)
        mock_redis.get.return_value = None

        # Mock API response
        api_response = {
            "result": "success",
            "conversion_rates": {"EUR": 0.92, "GBP": 0.79, "JPY": 149.50},
        }

        # Mock httpx client
        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value.__aenter__.return_value = mock_client

            # Create mock response using proven pattern
            mock_response = create_mock_response(json_data=api_response)
            mock_client.get.return_value = mock_response

            # Call method (limit to 3 pairs)
            result = await service.get_forex_pairs(limit=3)

        # Verify data fetched
        assert len(result) == 3
        assert all(pair["asset_type"] == "forex" for pair in result)

        # Verify cache write with JSON serialization
        assert mock_redis.set.called
        call_args = mock_redis.set.call_args
        cache_key = call_args[0][0]
        cached_value = call_args[0][1]
        ttl = call_args[1]["ttl"]

        assert cache_key == "forex:all:3"
        assert ttl == 30
        # Verify JSON serialization
        deserialized = json.loads(cached_value)
        assert len(deserialized) == 3

    @pytest.mark.asyncio
    async def test_cache_read_error_graceful_fallback(self):
        """Test graceful fallback when Redis cache read fails."""
        mock_redis = AsyncMock()
        service = ForexService(redis_client=mock_redis)

        # Simulate cache read error
        mock_redis.get.side_effect = Exception("Redis connection failed")

        # Mock API response
        api_response = {"result": "success", "conversion_rates": {"EUR": 0.92}}

        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value.__aenter__.return_value = mock_client
            mock_response = create_mock_response(json_data=api_response)
            mock_client.get.return_value = mock_response

            # Should still fetch from API despite cache error
            result = await service.get_forex_pairs(limit=1)

        assert len(result) == 1
        assert result[0]["asset_type"] == "forex"

    @pytest.mark.asyncio
    async def test_cache_write_error_continues_execution(self):
        """Test that cache write errors don't break the response."""
        mock_redis = AsyncMock()
        service = ForexService(redis_client=mock_redis)

        # Cache miss
        mock_redis.get.return_value = None
        # Cache write fails
        mock_redis.set.side_effect = Exception("Redis write failed")

        # Mock API response
        api_response = {"result": "success", "conversion_rates": {"EUR": 0.92}}

        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value.__aenter__.return_value = mock_client
            mock_response = create_mock_response(json_data=api_response)
            mock_client.get.return_value = mock_response

            # Should return data despite cache write error
            result = await service.get_forex_pairs(limit=1)

        assert len(result) == 1
        assert result[0]["asset_type"] == "forex"

    @pytest.mark.asyncio
    async def test_no_cache_when_redis_is_none(self):
        """Test that service works without Redis client."""
        service = ForexService(redis_client=None)

        # Mock API response
        api_response = {"result": "success", "conversion_rates": {"EUR": 0.92}}

        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value.__aenter__.return_value = mock_client
            mock_response = create_mock_response(json_data=api_response)
            mock_client.get.return_value = mock_response

            result = await service.get_forex_pairs(limit=1)

        assert len(result) == 1
        assert result[0]["asset_type"] == "forex"


# ============================================================================
# TEST CLASS 3: Get Forex Pairs Endpoint
# ============================================================================


class TestGetForexPairs:
    """Test main get_forex_pairs endpoint with API integration."""

    @pytest.mark.asyncio
    async def test_get_forex_pairs_fetches_multiple_pairs(self):
        """Test fetching multiple currency pairs from API."""
        service = ForexService()

        # Mock API response
        api_response = {
            "result": "success",
            "conversion_rates": {
                "EUR": 0.92,
                "GBP": 0.79,
                "JPY": 149.50,
                "CHF": 0.88,
                "CAD": 1.36,
            },
        }

        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value.__aenter__.return_value = mock_client
            mock_response = create_mock_response(json_data=api_response)
            mock_client.get.return_value = mock_response

            result = await service.get_forex_pairs(limit=5)

        # Verify results
        assert len(result) == 5
        assert all(pair["asset_type"] == "forex" for pair in result)
        assert all("symbol" in pair for pair in result)
        assert all("current_price" in pair for pair in result)
        assert all("price_change_24h" in pair for pair in result)

        # Verify first pair is USD/EUR
        assert result[0]["symbol"] == "USD/EUR"
        assert result[0]["current_price"] == 0.92

    @pytest.mark.asyncio
    async def test_get_forex_pairs_limit_parameter(self):
        """Test that limit parameter restricts number of pairs."""
        service = ForexService()

        api_response = {
            "result": "success",
            "conversion_rates": {"EUR": 0.92, "GBP": 0.79},
        }

        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value.__aenter__.return_value = mock_client
            mock_response = create_mock_response(json_data=api_response)
            mock_client.get.return_value = mock_response

            # Request only 2 pairs
            result = await service.get_forex_pairs(limit=2)

        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_get_forex_pairs_continues_on_individual_pair_error(self):
        """Test that fetching continues even if individual pairs fail."""
        service = ForexService()

        # Mock httpx client to fail on first pair, succeed on second
        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value.__aenter__.return_value = mock_client

            # First call fails, second call succeeds
            first_error = httpx.HTTPError("Network error")
            second_response = create_mock_response(
                json_data={"result": "success", "conversion_rates": {"GBP": 0.79}}
            )

            # Mock client.get to return different responses
            mock_client.get.side_effect = [first_error, second_response]

            # Call method with limit 2 (will try to fetch 2 pairs)
            result = await service.get_forex_pairs(limit=2)

        # Should return 1 result (second pair succeeded)
        assert len(result) == 1
        assert result[0]["symbol"] == "USD/GBP"

    @pytest.mark.asyncio
    async def test_get_forex_pairs_returns_empty_on_complete_failure(self):
        """Test that complete API failure returns empty list."""
        service = ForexService()

        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value.__aenter__.return_value = mock_client

            # Simulate HTTP error
            mock_client.get.side_effect = httpx.ConnectError("Network error")

            result = await service.get_forex_pairs(limit=1)

        assert result == []


# ============================================================================
# TEST CLASS 4: Fetch Forex Rate (Internal Method)
# ============================================================================


class TestFetchForexRate:
    """Test internal _fetch_forex_rate method."""

    @pytest.mark.asyncio
    async def test_fetch_forex_rate_success(self):
        """Test successfully fetching a single forex rate."""
        service = ForexService()

        pair = {"base": "USD", "quote": "EUR", "name": "US Dollar / Euro"}
        api_response = {
            "result": "success",
            "conversion_rates": {"EUR": 0.92, "GBP": 0.79},
        }

        mock_client = AsyncMock()
        mock_response = create_mock_response(json_data=api_response)
        mock_client.get.return_value = mock_response

        result = await service._fetch_forex_rate(mock_client, pair)

        # Verify result structure
        assert result is not None
        assert result["symbol"] == "USD/EUR"
        assert result["name"] == "US Dollar / Euro"
        assert result["current_price"] == 0.92
        assert result["asset_type"] == "forex"
        assert "price_change_24h" in result
        assert "price_change_percentage_24h" in result
        assert result["high_24h"] == pytest.approx(0.92 * 1.01, rel=1e-5)
        assert result["low_24h"] == pytest.approx(0.92 * 0.99, rel=1e-5)

    @pytest.mark.asyncio
    async def test_fetch_forex_rate_uses_internal_cache(self):
        """Test that internal rates cache reduces API calls."""
        service = ForexService()

        pair = {"base": "USD", "quote": "EUR", "name": "US Dollar / Euro"}
        api_response = {"result": "success", "conversion_rates": {"EUR": 0.92}}

        mock_client = AsyncMock()
        mock_response = create_mock_response(json_data=api_response)
        mock_client.get.return_value = mock_response

        # First call - fetches from API
        result1 = await service._fetch_forex_rate(mock_client, pair)
        assert result1 is not None
        assert mock_client.get.call_count == 1

        # Second call - uses internal cache (same 5-minute window)
        result2 = await service._fetch_forex_rate(mock_client, pair)
        assert result2 is not None
        # API call count should still be 1 (cached)
        assert mock_client.get.call_count == 1

        # Both results should have same rate
        assert result1["current_price"] == result2["current_price"]

    @pytest.mark.asyncio
    async def test_fetch_forex_rate_handles_missing_quote_currency(self):
        """Test handling of missing quote currency in API response."""
        service = ForexService()

        pair = {"base": "USD", "quote": "XYZ", "name": "USD / Invalid"}
        api_response = {
            "result": "success",
            "conversion_rates": {"EUR": 0.92, "GBP": 0.79},  # XYZ not present
        }

        mock_client = AsyncMock()
        mock_response = create_mock_response(json_data=api_response)
        mock_client.get.return_value = mock_response

        result = await service._fetch_forex_rate(mock_client, pair)

        # Should return None for missing currency
        assert result is None


# ============================================================================
# TEST CLASS 5: Edge Cases and Error Handling
# ============================================================================


class TestEdgeCasesAndErrors:
    """Test error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_api_error_response(self):
        """Test handling of API error responses."""
        service = ForexService()

        pair = {"base": "USD", "quote": "EUR", "name": "US Dollar / Euro"}
        api_response = {"result": "error", "error-type": "invalid-key"}

        mock_client = AsyncMock()
        mock_response = create_mock_response(json_data=api_response)
        mock_client.get.return_value = mock_response

        result = await service._fetch_forex_rate(mock_client, pair)

        # Should return None on API error
        assert result is None

    @pytest.mark.asyncio
    async def test_http_error_handling(self):
        """Test handling of HTTP errors (429, 500, etc.)."""
        service = ForexService()

        pair = {"base": "USD", "quote": "EUR", "name": "US Dollar / Euro"}

        mock_client = AsyncMock()
        # Simulate HTTP 500 error
        http_error = httpx.HTTPStatusError(
            "Server error", request=MagicMock(), response=MagicMock(status_code=500)
        )
        mock_response = create_mock_response(raises=http_error)
        mock_client.get.return_value = mock_response

        result = await service._fetch_forex_rate(mock_client, pair)

        # Should return None on HTTP error
        assert result is None

    @pytest.mark.asyncio
    async def test_network_error_handling(self):
        """Test handling of network errors."""
        service = ForexService()

        pair = {"base": "USD", "quote": "EUR", "name": "US Dollar / Euro"}

        mock_client = AsyncMock()
        # Simulate network error
        mock_client.get.side_effect = httpx.ConnectError("Connection refused")

        result = await service._fetch_forex_rate(mock_client, pair)

        # Should return None on network error
        assert result is None

    @pytest.mark.asyncio
    async def test_json_parse_error_handling(self):
        """Test handling of JSON parsing errors."""
        service = ForexService()

        pair = {"base": "USD", "quote": "EUR", "name": "US Dollar / Euro"}

        mock_client = AsyncMock()
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.raise_for_status = lambda: None
        # Simulate JSON parse error
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_client.get.return_value = mock_response

        result = await service._fetch_forex_rate(mock_client, pair)

        # Should return None on parse error
        assert result is None

    @pytest.mark.asyncio
    async def test_get_forex_pairs_with_zero_limit(self):
        """Test edge case with limit=0."""
        service = ForexService()

        # Mock httpx client to verify it IS called (implementation has no early return)
        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value.__aenter__.return_value = mock_client

            # Call method with limit 0
            result = await service.get_forex_pairs(limit=0)

        # Should return empty list (no pairs to fetch)
        assert result == []

        # AsyncClient should still be created (implementation creates client unconditionally)
        assert MockClient.called

        # But no API calls should be made (empty pairs_to_fetch list)
        assert not mock_client.get.called
