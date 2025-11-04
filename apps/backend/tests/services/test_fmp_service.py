"""
Tests for app.services.providers.fmp (FMP API Integration)

Tests the Financial Modeling Prep API integration for fetching
stock news, quotes, and fundamental data.

Session 66: Service Layer Tests - Financial Services
"""

from unittest.mock import AsyncMock, patch

import pytest

# Import module under test
try:
    from app.services.providers.fmp import fetch_news
except ImportError as e:
    pytest.skip(f"Module import failed: {e}", allow_module_level=True)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_fmp_news_response():
    """Mock FMP API news response"""
    return [
        {
            "site": "CNBC",
            "title": "Stock surges on earnings beat",
            "url": "https://example.com/article1",
            "published": "2025-11-02T10:00:00Z",
        },
        {
            "site": "Bloomberg",
            "title": "Market analysis and trends",
            "url": "https://example.com/article2",
            "published": "2025-11-02T09:30:00Z",
        },
        {
            "site": "Reuters",
            "title": "Breaking financial news",
            "url": "https://example.com/article3",
            "published": "2025-11-02T09:00:00Z",
        },
    ]


# ============================================================================
# UNIT TESTS - fetch_news
# ============================================================================


class TestFetchNews:
    """Test suite for fetch_news function"""

    @pytest.mark.asyncio
    @patch("app.services.providers.fmp._get")
    async def test_fetch_news_success(self, mock_get, mock_fmp_news_response):
        """Test successful news fetch with default limit"""
        # Arrange
        mock_get.return_value = mock_fmp_news_response

        # Act
        result = await fetch_news("AAPL")

        # Assert
        assert len(result) == 3
        assert result[0]["symbol"] == "AAPL"
        assert result[0]["source"] == "CNBC"
        assert result[0]["title"] == "Stock surges on earnings beat"
        assert result[0]["url"] == "https://example.com/article1"
        assert result[0]["published_at"] == "2025-11-02T10:00:00Z"
        assert "id" in result[0]

        # Verify API call
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert "tickers" in call_args[0][1]
        assert call_args[0][1]["tickers"] == "AAPL"
        assert call_args[0][1]["limit"] == 20  # default

    @pytest.mark.asyncio
    @patch("app.services.providers.fmp._get")
    async def test_fetch_news_custom_limit(self, mock_get, mock_fmp_news_response):
        """Test news fetch with custom limit"""
        # Arrange
        mock_get.return_value = mock_fmp_news_response

        # Act
        result = await fetch_news("TSLA", limit=5)

        # Assert
        assert len(result) == 3  # Response has 3 items
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert call_args[0][1]["limit"] == 5
        assert call_args[0][1]["tickers"] == "TSLA"

    @pytest.mark.asyncio
    @patch("app.services.providers.fmp._get")
    async def test_fetch_news_empty_response(self, mock_get):
        """Test handling of empty API response"""
        # Arrange
        mock_get.return_value = []

        # Act
        result = await fetch_news("INVALID")

        # Assert
        assert result == []
        assert isinstance(result, list)

    @pytest.mark.asyncio
    @patch("app.services.providers.fmp._get")
    async def test_fetch_news_missing_fields(self, mock_get):
        """Test handling of response with missing fields"""
        # Arrange
        mock_get.return_value = [
            {
                "site": "Source1",
                "title": "Title1",
                # Missing 'url' and 'published'
            },
            {
                # Missing all fields except one
                "url": "https://example.com/article"
            },
        ]

        # Act
        result = await fetch_news("AAPL")

        # Assert
        assert len(result) == 2
        assert result[0]["source"] == "Source1"
        assert result[0]["title"] == "Title1"
        assert result[0]["url"] is None  # .get() returns None for missing keys
        assert result[0]["published_at"] is None

        assert result[1]["source"] is None
        assert result[1]["title"] is None
        assert result[1]["url"] == "https://example.com/article"

    @pytest.mark.asyncio
    @patch("app.services.providers.fmp._get")
    async def test_fetch_news_multiple_symbols(self, mock_get, mock_fmp_news_response):
        """Test news fetch for comma-separated symbols"""
        # Arrange
        mock_get.return_value = mock_fmp_news_response

        # Act
        result = await fetch_news("AAPL,MSFT,GOOGL")

        # Assert
        assert len(result) == 3
        # Symbol is passed through as-is
        assert all(item["symbol"] == "AAPL,MSFT,GOOGL" for item in result)
        mock_get.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.providers.fmp._get")
    async def test_fetch_news_api_error_propagation(self, mock_get):
        """Test that API errors are propagated correctly"""
        # Arrange
        mock_get.side_effect = Exception("API Error: Rate limit exceeded")

        # Act & Assert
        with pytest.raises(Exception, match="API Error"):
            await fetch_news("AAPL")


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestFetchNewsEdgeCases:
    """Edge case and error handling tests"""

    @pytest.mark.asyncio
    @patch("app.services.providers.fmp._get")
    async def test_fetch_news_zero_limit(self, mock_get):
        """Test news fetch with zero limit"""
        # Arrange
        mock_get.return_value = []

        # Act
        result = await fetch_news("AAPL", limit=0)

        # Assert
        assert result == []
        mock_get.assert_called_once()
        assert mock_get.call_args[0][1]["limit"] == 0

    @pytest.mark.asyncio
    @patch("app.services.providers.fmp._get")
    async def test_fetch_news_large_limit(self, mock_get, mock_fmp_news_response):
        """Test news fetch with very large limit"""
        # Arrange
        mock_get.return_value = mock_fmp_news_response

        # Act
        result = await fetch_news("AAPL", limit=1000)

        # Assert
        assert len(result) == 3  # API returns only 3 items
        mock_get.assert_called_once()
        assert mock_get.call_args[0][1]["limit"] == 1000

    @pytest.mark.asyncio
    @patch("app.services.providers.fmp._get")
    async def test_fetch_news_special_characters_symbol(self, mock_get):
        """Test news fetch with special characters in symbol"""
        # Arrange
        mock_get.return_value = []

        # Act
        result = await fetch_news("BRK.B")  # Berkshire Hathaway Class B

        # Assert
        assert result == []
        mock_get.assert_called_once()
        assert mock_get.call_args[0][1]["tickers"] == "BRK.B"

    @pytest.mark.asyncio
    @patch("app.services.providers.fmp._get")
    async def test_fetch_news_lowercase_symbol(self, mock_get, mock_fmp_news_response):
        """Test news fetch with lowercase symbol"""
        # Arrange
        mock_get.return_value = mock_fmp_news_response

        # Act
        result = await fetch_news("aapl")  # lowercase

        # Assert
        assert len(result) == 3
        assert all(item["symbol"] == "aapl" for item in result)
        mock_get.assert_called_once()
        assert mock_get.call_args[0][1]["tickers"] == "aapl"

    # - External API calls
    # - Service interactions
    # - End-to-end workflows


# ============================================================================
# EDGE CASES & ERROR HANDLING
# ============================================================================


class TestfmpEdgeCases:
    """Edge case and error handling tests"""

    def test_null_input_handling(self):
        """Test handling of null/None inputs"""
        # TODO: Test null handling
        pass

    def test_invalid_input_handling(self):
        """Test handling of invalid inputs"""
        # TODO: Test invalid input handling
        pass

    def test_error_conditions(self):
        """Test error condition handling"""
        # TODO: Test error scenarios
        pass


# ============================================================================
# PERFORMANCE & LOAD TESTS (Optional)
# ============================================================================


@pytest.mark.slow
class TestfmpPerformance:
    """Performance and load tests"""

    @pytest.mark.skip(reason="Performance test - run manually")
    def test_performance_under_load(self):
        """Test performance under load"""
        # TODO: Add performance test
        pass
