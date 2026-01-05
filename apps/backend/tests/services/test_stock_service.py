"""
Tests for StockService - Real-time stock market data from Alpha Vantage

Pattern: Reuses proven httpx AsyncMock patterns from CryptoDataService and ForexService
- create_mock_response() helper for sync methods on AsyncMock
- Async context manager mocking (__aenter__/__aexit__)
- Redis JSON caching validation (30s TTL)
- Mock side_effect for sequential call testing
- Implementation verification (50 stock symbols configured)

Test Coverage Target: 80%+ (based on ForexService 94% success)
Success Criteria: 100% pass rate, comprehensive edge cases, production-ready error handling
"""

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.stock_service import StockService


# ============================================================================
# Test Class 1: Initialization & Configuration
# ============================================================================
class TestStockServiceInit:
    """Test StockService initialization and configuration"""

    def test_init_without_redis(self):
        """StockService should initialize without Redis client"""
        service = StockService()

        assert service.redis_client is None
        assert service.api_key == "D8RDSS583XDQ1DIA"
        assert service.base_url == "https://www.alphavantage.co/query"
        assert service.cache_ttl == 30
        assert (
            len(service.stock_symbols) == 50
        )  # Implementation verification: 50 major stocks
        assert len(service.stock_names) == 50  # 50 stock name mappings

    def test_init_with_redis(self):
        """StockService should initialize with Redis client"""
        mock_redis = AsyncMock()
        service = StockService(redis_client=mock_redis)

        assert service.redis_client is mock_redis
        assert service.api_key == "D8RDSS583XDQ1DIA"
        assert service.cache_ttl == 30

    def test_stock_symbols_configuration(self):
        """StockService should have 50 configured stock symbols"""
        service = StockService()

        # Implementation verification: Check exact count and sample symbols
        assert len(service.stock_symbols) == 50
        assert "AAPL" in service.stock_symbols
        assert "MSFT" in service.stock_symbols
        assert "GOOGL" in service.stock_symbols
        assert "TSLA" in service.stock_symbols
        assert "NVDA" in service.stock_symbols


# ============================================================================
# Test Class 2: Redis Cache Operations
# ============================================================================
class TestCacheOperations:
    """Test Redis caching behavior (30s TTL)"""

    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached_data(self):
        """get_stocks() should return cached data if available"""
        # Arrange
        mock_redis = AsyncMock()
        cached_stocks = [
            {
                "id": "aapl",
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "current_price": 150.0,
                "price_change_24h": 2.5,
                "price_change_percentage_24h": 1.69,
                "market_cap": 2500000000000,
                "total_volume": 50000000,
            }
        ]
        mock_redis.get.return_value = json.dumps(
            cached_stocks
        )  # Pattern: JSON serialization
        service = StockService(redis_client=mock_redis)

        # Act
        result = await service.get_stocks(limit=1)

        # Assert
        assert result == cached_stocks
        mock_redis.get.assert_called_once_with("stocks:all:1")

    @pytest.mark.asyncio
    async def test_cache_miss_fetches_from_api(self):
        """get_stocks() should fetch from API on cache miss"""
        # Arrange
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None  # Cache miss
        mock_redis.set = AsyncMock()
        service = StockService(redis_client=mock_redis)

        # Mock HTTP response
        def create_mock_response(status_code: int, json_data: dict):
            """Pattern: Lambda helper for sync methods on AsyncMock (prevents coroutines)"""
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.00",
                "09. change": "2.50",
                "10. change percent": "1.69%",
                "06. volume": "50000000",
                "08. previous close": "147.50",
            }
        }

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client.get.return_value = create_mock_response(200, api_response)
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=1)

        # Assert
        assert len(result) == 1
        assert result[0]["symbol"] == "AAPL"
        assert result[0]["current_price"] == 150.0
        mock_redis.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_cache_write_after_api_fetch(self):
        """get_stocks() should cache results after fetching from API"""
        # Arrange
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None  # Cache miss
        mock_redis.set = AsyncMock()
        service = StockService(redis_client=mock_redis)

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.00",
                "09. change": "2.50",
                "10. change percent": "1.69%",
                "06. volume": "50000000",
                "08. previous close": "147.50",
            }
        }

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client.get.return_value = create_mock_response(200, api_response)
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=1)

        # Assert - verify cache write with 30s TTL
        assert mock_redis.set.called
        call_args = mock_redis.set.call_args
        assert call_args[0][0] == "stocks:all:1"  # cache key
        cached_data = json.loads(call_args[0][1])  # Parse JSON
        assert len(cached_data) == 1
        assert cached_data[0]["symbol"] == "AAPL"
        assert call_args[1]["expire"] == 30  # 30 seconds TTL

    @pytest.mark.asyncio
    async def test_cache_error_graceful_degradation(self):
        """get_stocks() should handle cache errors gracefully"""
        # Arrange
        mock_redis = AsyncMock()
        mock_redis.get.side_effect = Exception("Redis connection failed")
        service = StockService(redis_client=mock_redis)

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.00",
                "09. change": "2.50",
                "10. change percent": "1.69%",
                "06. volume": "50000000",
                "08. previous close": "147.50",
            }
        }

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client.get.return_value = create_mock_response(200, api_response)
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=1)

        # Assert - should still return API data despite cache error
        assert len(result) == 1
        assert result[0]["symbol"] == "AAPL"

    @pytest.mark.asyncio
    async def test_cache_write_error_graceful_degradation(self):
        """get_stocks() should handle cache write errors gracefully"""
        # Arrange
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None  # Cache miss
        mock_redis.set.side_effect = Exception("Redis write failed")
        service = StockService(redis_client=mock_redis)

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.00",
                "09. change": "2.50",
                "10. change percent": "1.69%",
                "06. volume": "50000000",
                "08. previous close": "147.50",
            }
        }

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client.get.return_value = create_mock_response(200, api_response)
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=1)

        # Assert - should still return API data despite cache write error
        assert len(result) == 1
        assert result[0]["symbol"] == "AAPL"


# ============================================================================
# Test Class 3: get_stocks() Method
# ============================================================================
class TestGetStocks:
    """Test get_stocks() primary method"""

    @pytest.mark.asyncio
    async def test_get_stocks_limit_parameter(self):
        """get_stocks() should respect limit parameter"""
        # Arrange
        service = StockService()

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.00",
                "09. change": "2.50",
                "10. change percent": "1.69%",
                "06. volume": "50000000",
                "08. previous close": "147.50",
            }
        }

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client.get.return_value = create_mock_response(200, api_response)
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=3)

        # Assert - should fetch exactly 3 stocks
        assert len(result) == 3
        assert mock_client.get.call_count == 3  # 3 API calls

    @pytest.mark.asyncio
    async def test_get_stocks_default_limit(self):
        """get_stocks() should default to 50 stocks if no limit specified"""
        # Arrange
        service = StockService()

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.00",
                "09. change": "2.50",
                "10. change percent": "1.69%",
                "06. volume": "50000000",
                "08. previous close": "147.50",
            }
        }

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client.get.return_value = create_mock_response(200, api_response)
            mock_client_class.return_value = mock_client

            result = await service.get_stocks()  # No limit parameter

        # Assert - should fetch 50 stocks (default)
        assert len(result) == 50
        assert mock_client.get.call_count == 50  # 50 API calls

    @pytest.mark.asyncio
    async def test_get_stocks_data_format(self):
        """get_stocks() should return properly formatted stock data"""
        # Arrange
        service = StockService()

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.00",
                "09. change": "2.50",
                "10. change percent": "1.69%",
                "06. volume": "50000000",
                "08. previous close": "147.50",
            }
        }

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client.get.return_value = create_mock_response(200, api_response)
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=1)

        # Assert - verify data structure
        assert len(result) == 1
        stock = result[0]
        assert stock["id"] == "aapl"
        assert stock["symbol"] == "AAPL"
        assert stock["name"] == "Apple Inc."  # From stock_names mapping
        assert stock["current_price"] == 150.0
        assert stock["price_change_24h"] == 2.5
        assert stock["price_change_percentage_24h"] == 1.69
        assert stock["market_cap"] == 150.0 * 1000000000  # Calculated
        assert stock["total_volume"] == 50000000
        assert stock["asset_type"] == "stock"
        assert "last_updated" in stock

    @pytest.mark.asyncio
    async def test_get_stocks_partial_failure_continues(self):
        """get_stocks() should continue fetching if individual stock fails"""
        # Arrange - Pattern: Mock side_effect for sequential calls
        service = StockService()

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        def create_error_response():
            mock_resp = MagicMock()
            mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
                "API Error", request=MagicMock(), response=MagicMock()
            )
            return mock_resp

        success_response = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.00",
                "09. change": "2.50",
                "10. change percent": "1.69%",
                "06. volume": "50000000",
                "08. previous close": "147.50",
            }
        }

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            # First call fails, second succeeds
            mock_client.get.side_effect = [
                create_error_response(),
                create_mock_response(200, success_response),
            ]
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=2)

        # Assert - should have 1 successful result (second stock MSFT, since AAPL failed)
        assert len(result) == 1
        assert result[0]["symbol"] == "MSFT"  # Second stock succeeds after first fails


# ============================================================================
# Test Class 4: _fetch_stock_quote() Helper Method
# ============================================================================
class TestFetchStockQuote:
    """Test _fetch_stock_quote() internal method"""

    @pytest.mark.asyncio
    async def test_fetch_stock_quote_success(self):
        """_fetch_stock_quote() should return formatted stock data"""
        # Arrange
        service = StockService()

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.00",
                "09. change": "2.50",
                "10. change percent": "1.69%",
                "06. volume": "50000000",
                "08. previous close": "147.50",
            }
        }

        mock_client = AsyncMock()
        mock_client.get.return_value = create_mock_response(200, api_response)

        # Act
        result = await service._fetch_stock_quote(mock_client, "AAPL")

        # Assert
        assert result is not None
        assert result["symbol"] == "AAPL"
        assert result["current_price"] == 150.0

    @pytest.mark.asyncio
    async def test_fetch_stock_quote_api_error_message(self):
        """_fetch_stock_quote() should handle Alpha Vantage error messages"""
        # Arrange
        service = StockService()

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {"Error Message": "Invalid API call"}

        mock_client = AsyncMock()
        mock_client.get.return_value = create_mock_response(200, api_response)

        # Act
        result = await service._fetch_stock_quote(mock_client, "INVALID")

        # Assert - should return None on API error
        assert result is None

    @pytest.mark.asyncio
    async def test_fetch_stock_quote_rate_limit(self):
        """_fetch_stock_quote() should handle Alpha Vantage rate limits"""
        # Arrange
        service = StockService()

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {
            "Note": "Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute"
        }

        mock_client = AsyncMock()
        mock_client.get.return_value = create_mock_response(200, api_response)

        # Act
        result = await service._fetch_stock_quote(mock_client, "AAPL")

        # Assert - should return None on rate limit
        assert result is None

    @pytest.mark.asyncio
    async def test_fetch_stock_quote_empty_quote(self):
        """_fetch_stock_quote() should handle empty quote data"""
        # Arrange
        service = StockService()

        def create_mock_response(status_code: int, json_data: dict):
            mock_resp = MagicMock()
            mock_resp.status_code = status_code
            mock_resp.json = lambda: json_data
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        api_response = {"Global Quote": {}}  # Empty quote

        mock_client = AsyncMock()
        mock_client.get.return_value = create_mock_response(200, api_response)

        # Act
        result = await service._fetch_stock_quote(mock_client, "AAPL")

        # Assert - should return None on empty quote
        assert result is None


# ============================================================================
# Test Class 5: Edge Cases & Error Handling
# ============================================================================
class TestEdgeCasesAndErrors:
    """Test edge cases and error scenarios"""

    @pytest.mark.asyncio
    async def test_http_status_error_429(self):
        """get_stocks() should handle 429 Too Many Requests"""
        # Arrange
        service = StockService()

        def create_error_response():
            mock_resp = MagicMock()
            mock_resp.status_code = 429
            mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
                "Too Many Requests", request=MagicMock(), response=MagicMock()
            )
            return mock_resp

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client.get.return_value = create_error_response()
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=1)

        # Assert - should return empty list on HTTP error
        assert result == []

    @pytest.mark.asyncio
    async def test_http_status_error_500(self):
        """get_stocks() should handle 500 Internal Server Error"""
        # Arrange
        service = StockService()

        def create_error_response():
            mock_resp = MagicMock()
            mock_resp.status_code = 500
            mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
                "Internal Server Error", request=MagicMock(), response=MagicMock()
            )
            return mock_resp

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client.get.return_value = create_error_response()
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=1)

        # Assert - should return empty list on HTTP error
        assert result == []

    @pytest.mark.asyncio
    async def test_network_error(self):
        """get_stocks() should handle network connection errors"""
        # Arrange
        service = StockService()

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client.get.side_effect = httpx.ConnectError("Connection failed")
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=1)

        # Assert - should return empty list on network error
        assert result == []

    @pytest.mark.asyncio
    async def test_json_parse_error(self):
        """_fetch_stock_quote() should handle JSON parsing errors"""
        # Arrange
        service = StockService()

        def create_invalid_json_response():
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.side_effect = ValueError("Invalid JSON")
            mock_resp.raise_for_status = lambda: None
            return mock_resp

        mock_client = AsyncMock()
        mock_client.get.return_value = create_invalid_json_response()

        # Act
        result = await service._fetch_stock_quote(mock_client, "AAPL")

        # Assert - should return None on JSON parse error
        assert result is None

    @pytest.mark.asyncio
    async def test_zero_limit_edge_case(self):
        """get_stocks() should handle zero limit gracefully"""
        # Arrange
        service = StockService()

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = AsyncMock()
            mock_client_class.return_value = mock_client

            result = await service.get_stocks(limit=0)

        # Assert - should return empty list for zero limit
        assert result == []
        mock_client.get.assert_not_called()  # No API calls made

    @pytest.mark.asyncio
    async def test_general_exception_in_get_stocks(self):
        """get_stocks() should handle unexpected exceptions gracefully"""
        # Arrange
        service = StockService()

        # Act
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client_class.side_effect = Exception("Unexpected error")

            result = await service.get_stocks(limit=1)

        # Assert - should return empty list on unexpected error
        assert result == []
