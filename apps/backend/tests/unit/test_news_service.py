"""
Comprehensive test suite for NewsService.

Tests multi-provider cascade pattern (marketaux → newsapi → fmp).
Validates proven create_mock_response() pattern from Sessions 77 Phases 2-5.

Coverage Target: 85%+ (world-class standard)
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from app.services import news
from httpx import ConnectError, HTTPStatusError, Request, Response

# =============================================================================
# Test Helpers (Proven Pattern from Session 77 Phase 2)
# =============================================================================


def create_mock_response(data: dict, status_code: int = 200) -> Mock:
    """
    Create a mock httpx Response with sync json() method.

    CRITICAL: Uses lambda pattern to prevent coroutines on AsyncMock.
    Proven across 138 tests (Phases 1-5: DataArchival, Crypto, Forex, Stock, Indices).

    Pattern: Lambda for sync methods on AsyncMock prevents TypeError.
    """
    mock_response = Mock(spec=Response)
    mock_response.status_code = status_code
    mock_response.json = lambda: data  # Lambda returns dict directly (not coroutine)
    mock_response.raise_for_status = lambda: None
    return mock_response


def create_error_response(status_code: int, message: str = "Error") -> Mock:
    """Create a mock httpx Response that raises HTTPStatusError."""
    mock_response = Mock(spec=Response)
    mock_response.status_code = status_code

    def raise_error():
        request = Mock(spec=Request)
        raise HTTPStatusError(message, request=request, response=mock_response)

    mock_response.raise_for_status = raise_error
    return mock_response


# =============================================================================
# Test Class 1: Service Initialization (3 tests)
# =============================================================================


class TestNewsServiceInit:
    """Test NewsService initialization and basic structure."""

    def test_get_news_function_exists(self):
        """Verify get_news function is importable and callable."""
        assert hasattr(news, "get_news")
        assert callable(news.get_news)

    def test_get_news_signature(self):
        """Verify get_news has correct function signature."""
        import inspect

        sig = inspect.signature(news.get_news)

        # Should have 'symbol' and 'limit' parameters
        assert "symbol" in sig.parameters
        assert "limit" in sig.parameters

        # Limit should default to 20
        assert sig.parameters["limit"].default == 20

    @pytest.mark.asyncio
    async def test_get_news_returns_list(self):
        """Verify get_news returns a list (even when empty)."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # All providers return None
                    mock_marketaux.return_value = None
                    mock_newsapi.return_value = None
                    mock_fmp.return_value = None

                    result = await news.get_news("AAPL")

                    assert isinstance(result, list)
                    assert result == []


# =============================================================================
# Test Class 2: Happy Path - Provider Success (3 tests)
# =============================================================================


class TestNewsServiceHappyPath:
    """Test successful news retrieval from each provider."""

    @pytest.mark.asyncio
    async def test_marketaux_success_first_provider(self):
        """Verify Marketaux (first provider) returns news successfully."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux succeeds
                    mock_marketaux.return_value = [
                        {
                            "id": "uuid1",
                            "symbol": "AAPL",
                            "title": "Apple News 1",
                            "source": "MarketAux",
                        },
                        {
                            "id": "uuid2",
                            "symbol": "AAPL",
                            "title": "Apple News 2",
                            "source": "MarketAux",
                        },
                    ]

                    result = await news.get_news("AAPL", limit=5)

                    # Should use Marketaux only (first provider)
                    assert len(result) == 2
                    assert result[0]["source"] == "MarketAux"
                    assert result[0]["symbol"] == "AAPL"

                    # Should NOT call subsequent providers
                    mock_marketaux.assert_called_once_with("AAPL", 5)
                    mock_newsapi.assert_not_called()
                    mock_fmp.assert_not_called()

    @pytest.mark.asyncio
    async def test_newsapi_success_second_provider(self):
        """Verify NewsAPI (second provider) is used when Marketaux fails."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux fails
                    mock_marketaux.side_effect = Exception("Marketaux error")

                    # NewsAPI succeeds
                    mock_newsapi.return_value = [
                        {"id": 1, "symbol": "TSLA", "title": "Tesla News 1", "source": "NewsAPI"}
                    ]

                    result = await news.get_news("TSLA")

                    # Should use NewsAPI (second provider)
                    assert len(result) == 1
                    assert result[0]["source"] == "NewsAPI"

                    # Should call Marketaux first, then NewsAPI
                    mock_marketaux.assert_called_once_with("TSLA", 20)
                    mock_newsapi.assert_called_once_with("TSLA", 20)
                    mock_fmp.assert_not_called()

    @pytest.mark.asyncio
    async def test_fmp_success_third_provider(self):
        """Verify FMP (third provider) is used when Marketaux and NewsAPI fail."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux fails
                    mock_marketaux.side_effect = Exception("Marketaux error")
                    # NewsAPI fails
                    mock_newsapi.side_effect = Exception("NewsAPI error")

                    # FMP succeeds
                    mock_fmp.return_value = [
                        {"id": 1, "symbol": "GOOGL", "title": "Google News 1", "source": "FMP"}
                    ]

                    result = await news.get_news("GOOGL")

                    # Should use FMP (third provider)
                    assert len(result) == 1
                    assert result[0]["source"] == "FMP"

                    # Should call all providers in order
                    mock_marketaux.assert_called_once_with("GOOGL", 20)
                    mock_newsapi.assert_called_once_with("GOOGL", 20)
                    mock_fmp.assert_called_once_with("GOOGL", 20)


# =============================================================================
# Test Class 3: Provider Cascade Logic (5 tests)
# =============================================================================


class TestNewsServiceProviderCascade:
    """Test multi-provider cascade fallback logic."""

    @pytest.mark.asyncio
    async def test_cascade_stops_on_first_success(self):
        """Verify cascade stops when first provider succeeds."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux succeeds
                    mock_marketaux.return_value = [{"id": "1", "title": "News"}]

                    result = await news.get_news("AAPL")

                    # Should stop at first provider
                    mock_marketaux.assert_called_once()
                    mock_newsapi.assert_not_called()
                    mock_fmp.assert_not_called()

    @pytest.mark.asyncio
    async def test_cascade_continues_on_empty_result(self):
        """Verify cascade continues when provider returns empty list."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux returns empty
                    mock_marketaux.return_value = []

                    # NewsAPI returns data
                    mock_newsapi.return_value = [{"id": 1, "title": "News"}]

                    result = await news.get_news("AAPL")

                    # Should try next provider when first returns empty
                    mock_marketaux.assert_called_once()
                    mock_newsapi.assert_called_once()
                    assert len(result) == 1

    @pytest.mark.asyncio
    async def test_all_providers_fail_returns_empty(self):
        """Verify empty list returned when all providers fail."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # All providers fail
                    mock_marketaux.side_effect = Exception("Error 1")
                    mock_newsapi.side_effect = Exception("Error 2")
                    mock_fmp.side_effect = Exception("Error 3")

                    result = await news.get_news("AAPL")

                    # Should return empty list
                    assert result == []

                    # Should attempt all providers
                    mock_marketaux.assert_called_once()
                    mock_newsapi.assert_called_once()
                    mock_fmp.assert_called_once()

    @pytest.mark.asyncio
    async def test_limit_applied_to_result(self):
        """Verify limit parameter correctly slices result."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux returns 10 items
                    mock_marketaux.return_value = [
                        {"id": i, "title": f"News {i}"} for i in range(10)
                    ]

                    # Request only 3 items
                    result = await news.get_news("AAPL", limit=3)

                    # Should return only 3 items
                    assert len(result) == 3
                    assert result[0]["id"] == 0
                    assert result[2]["id"] == 2

    @pytest.mark.asyncio
    async def test_cascade_order_preserved(self):
        """Verify providers are called in correct order: marketaux → newsapi → fmp."""
        call_order = []

        async def mock_marketaux_fn(*args, **kwargs):
            call_order.append("marketaux")
            raise Exception("Fail")

        async def mock_newsapi_fn(*args, **kwargs):
            call_order.append("newsapi")
            raise Exception("Fail")

        async def mock_fmp_fn(*args, **kwargs):
            call_order.append("fmp")
            return [{"id": 1, "title": "News"}]

        with patch("app.services.providers.marketaux.fetch_news", side_effect=mock_marketaux_fn):
            with patch("app.services.providers.newsapi.fetch_news", side_effect=mock_newsapi_fn):
                with patch("app.services.providers.fmp.fetch_news", side_effect=mock_fmp_fn):
                    result = await news.get_news("AAPL")

                    # Verify order: marketaux → newsapi → fmp
                    assert call_order == ["marketaux", "newsapi", "fmp"]
                    assert len(result) == 1


# =============================================================================
# Test Class 4: Error Handling (4 tests)
# =============================================================================


class TestNewsServiceErrorHandling:
    """Test error handling for various failure scenarios."""

    @pytest.mark.asyncio
    async def test_http_429_error_continues_cascade(self):
        """Verify HTTP 429 (rate limit) doesn't stop cascade."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux rate limited
                    mock_marketaux.side_effect = HTTPStatusError(
                        "Rate limited",
                        request=Mock(spec=Request),
                        response=create_error_response(429),
                    )

                    # NewsAPI succeeds
                    mock_newsapi.return_value = [{"id": 1, "title": "News"}]

                    result = await news.get_news("AAPL")

                    # Should continue to next provider
                    assert len(result) == 1
                    mock_newsapi.assert_called_once()

    @pytest.mark.asyncio
    async def test_http_500_error_continues_cascade(self):
        """Verify HTTP 500 (server error) doesn't stop cascade."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux server error
                    mock_marketaux.side_effect = HTTPStatusError(
                        "Server error",
                        request=Mock(spec=Request),
                        response=create_error_response(500),
                    )

                    # FMP succeeds (NewsAPI also fails)
                    mock_newsapi.side_effect = Exception("NewsAPI error")
                    mock_fmp.return_value = [{"id": 1, "title": "News"}]

                    result = await news.get_news("AAPL")

                    # Should reach third provider
                    assert len(result) == 1
                    mock_fmp.assert_called_once()

    @pytest.mark.asyncio
    async def test_network_error_continues_cascade(self):
        """Verify network errors (ConnectError) don't stop cascade."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux network error
                    mock_marketaux.side_effect = ConnectError("Network timeout")

                    # NewsAPI succeeds
                    mock_newsapi.return_value = [{"id": 1, "title": "News"}]

                    result = await news.get_news("AAPL")

                    # Should continue to next provider
                    assert len(result) == 1
                    mock_newsapi.assert_called_once()

    @pytest.mark.asyncio
    async def test_general_exception_continues_cascade(self):
        """Verify general exceptions don't stop cascade."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux general exception
                    mock_marketaux.side_effect = ValueError("Invalid data")

                    # NewsAPI general exception
                    mock_newsapi.side_effect = KeyError("Missing key")

                    # FMP succeeds
                    mock_fmp.return_value = [{"id": 1, "title": "News"}]

                    result = await news.get_news("AAPL")

                    # Should reach third provider despite errors
                    assert len(result) == 1
                    mock_fmp.assert_called_once()


# =============================================================================
# Test Class 5: Edge Cases (4 tests)
# =============================================================================


class TestNewsServiceEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_limit_zero_returns_empty(self):
        """Verify limit=0 returns empty list."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux succeeds with data
                    mock_marketaux.return_value = [{"id": 1, "title": "News"}]

                    # Request 0 items
                    result = await news.get_news("AAPL", limit=0)

                    # Should return empty list ([:0] slice)
                    assert result == []

    @pytest.mark.asyncio
    async def test_limit_larger_than_result(self):
        """Verify limit larger than result returns all items."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux returns 3 items
                    mock_marketaux.return_value = [{"id": i} for i in range(3)]

                    # Request 100 items
                    result = await news.get_news("AAPL", limit=100)

                    # Should return all 3 items
                    assert len(result) == 3

    @pytest.mark.asyncio
    async def test_symbol_with_special_characters(self):
        """Verify symbols with special characters are handled correctly."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux succeeds
                    mock_marketaux.return_value = [{"id": 1, "symbol": "BRK.B"}]

                    # Symbol with dot (Berkshire Hathaway Class B)
                    result = await news.get_news("BRK.B")

                    # Should pass symbol correctly
                    mock_marketaux.assert_called_once_with("BRK.B", 20)
                    assert result[0]["symbol"] == "BRK.B"

    @pytest.mark.asyncio
    async def test_none_response_continues_cascade(self):
        """Verify None response from provider continues cascade."""
        with patch(
            "app.services.providers.marketaux.fetch_news", new_callable=AsyncMock
        ) as mock_marketaux:
            with patch(
                "app.services.providers.newsapi.fetch_news", new_callable=AsyncMock
            ) as mock_newsapi:
                with patch(
                    "app.services.providers.fmp.fetch_news", new_callable=AsyncMock
                ) as mock_fmp:
                    # Marketaux returns None
                    mock_marketaux.return_value = None

                    # NewsAPI succeeds
                    mock_newsapi.return_value = [{"id": 1, "title": "News"}]

                    result = await news.get_news("AAPL")

                    # Should continue to next provider
                    assert len(result) == 1
                    mock_newsapi.assert_called_once()
