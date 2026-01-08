"""
Comprehensive tests for app.routers.smart_prices

Tests for smart prices router endpoints including:
- Health check
- Single price retrieval
- Batch price retrieval
- Historical data
- OHLCV data
- Crypto discovery endpoints
- Admin endpoints

Session 138 Part 3 - Backend coverage improvement
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel

from app.routers.smart_prices import (
    BatchPriceRequest,
    BatchPriceResponse,
    CryptoListResponse,
    CryptoSearchResponse,
    HealthResponse,
    HistoricalPriceResponse,
    OHLCVResponse,
    PriceResponse,
    UnifiedAssetsResponse,
    get_crypto_service,
    get_historical_service,
    get_price_service,
    get_unified_service,
    router,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_price_data():
    """Mock price data for testing"""
    mock = MagicMock()
    mock.symbol = "BTC"
    mock.price = 50000.0
    mock.change = 1000.0
    mock.change_percent = 2.0
    mock.volume = 1000000.0
    mock.market_cap = 1000000000.0
    mock.high = 51000.0
    mock.low = 49000.0
    mock.last_updated = datetime.now()
    mock.source = "coingecko"
    mock.cached = True
    return mock


@pytest.fixture
def mock_history_point():
    """Mock history point for testing"""
    mock = MagicMock()
    mock.to_dict.return_value = {"timestamp": 1700000000, "price": 50000.0}
    return mock


@pytest.fixture
def mock_ohlcv_point():
    """Mock OHLCV point for testing"""
    mock = MagicMock()
    mock.to_dict.return_value = {
        "timestamp": 1700000000,
        "open": 49000.0,
        "high": 51000.0,
        "low": 48000.0,
        "close": 50000.0,
        "volume": 1000000.0,
    }
    return mock


@pytest.fixture
def mock_crypto_data():
    """Mock crypto data for testing"""
    mock = MagicMock()
    mock.to_dict.return_value = {
        "id": "bitcoin",
        "symbol": "BTC",
        "name": "Bitcoin",
        "price": 50000.0,
        "market_cap": 1000000000000.0,
        "volume_24h": 50000000000.0,
        "change_24h": 2.5,
    }
    return mock


# ============================================================================
# PYDANTIC MODEL TESTS
# ============================================================================


class TestBatchPriceRequest:
    """Tests for BatchPriceRequest model"""

    def test_valid_request(self):
        """Test valid request with symbols"""
        request = BatchPriceRequest(symbols=["BTC", "ETH"])
        assert request.symbols == ["BTC", "ETH"]

    def test_single_symbol(self):
        """Test with single symbol"""
        request = BatchPriceRequest(symbols=["BTC"])
        assert len(request.symbols) == 1

    def test_max_symbols(self):
        """Test with max 100 symbols"""
        symbols = [f"SYM{i}" for i in range(100)]
        request = BatchPriceRequest(symbols=symbols)
        assert len(request.symbols) == 100


class TestPriceResponse:
    """Tests for PriceResponse model"""

    def test_create_response(self):
        """Test creating price response"""
        response = PriceResponse(
            symbol="BTC",
            price=50000.0,
            last_updated="2024-01-01T00:00:00",
            source="coingecko",
        )
        assert response.symbol == "BTC"
        assert response.price == 50000.0
        assert response.cached is False

    def test_with_optional_fields(self):
        """Test with all optional fields"""
        response = PriceResponse(
            symbol="ETH",
            price=3000.0,
            change=100.0,
            change_percent=3.5,
            volume=1000000.0,
            market_cap=400000000000.0,
            high=3100.0,
            low=2900.0,
            last_updated="2024-01-01T00:00:00",
            source="finnhub",
            cached=True,
        )
        assert response.change == 100.0
        assert response.cached is True


class TestBatchPriceResponse:
    """Tests for BatchPriceResponse model"""

    def test_create_response(self):
        """Test creating batch response"""
        response = BatchPriceResponse(
            success=True,
            data={},
            failed=["INVALID"],
            cache_hits=5,
            api_calls=2,
        )
        assert response.success is True
        assert response.cache_hits == 5

    def test_empty_response(self):
        """Test empty response"""
        response = BatchPriceResponse(success=False, data={})
        assert response.failed == []
        assert response.cache_hits == 0


class TestHealthResponse:
    """Tests for HealthResponse model"""

    def test_healthy_response(self):
        """Test healthy response"""
        response = HealthResponse(
            status="healthy",
            redis_connected=True,
            providers=["coingecko", "finnhub"],
        )
        assert response.status == "healthy"
        assert len(response.providers) == 2


class TestUnifiedAssetsResponse:
    """Tests for UnifiedAssetsResponse model"""

    def test_create_response(self):
        """Test creating unified response"""
        response = UnifiedAssetsResponse(
            success=True,
            types=["crypto", "stocks"],
            data={"crypto": [], "stocks": []},
            total_count=0,
            cached=False,
        )
        assert response.success is True
        assert "crypto" in response.types


class TestHistoricalPriceResponse:
    """Tests for HistoricalPriceResponse model"""

    def test_create_response(self):
        """Test creating historical response"""
        response = HistoricalPriceResponse(
            symbol="BTC",
            period="1m",
            data=[{"timestamp": 1700000000, "price": 50000.0}],
            count=1,
        )
        assert response.symbol == "BTC"
        assert response.count == 1


class TestOHLCVResponse:
    """Tests for OHLCVResponse model"""

    def test_create_response(self):
        """Test creating OHLCV response"""
        response = OHLCVResponse(
            symbol="BTC",
            period="1d",
            data=[],
            count=0,
        )
        assert response.period == "1d"


class TestCryptoListResponse:
    """Tests for CryptoListResponse model"""

    def test_create_response(self):
        """Test creating crypto list response"""
        response = CryptoListResponse(
            success=True,
            count=10,
            cryptos=[{"id": "bitcoin"}],
        )
        assert response.count == 10


class TestCryptoSearchResponse:
    """Tests for CryptoSearchResponse model"""

    def test_create_response(self):
        """Test creating search response"""
        response = CryptoSearchResponse(
            success=True,
            query="bitcoin",
            count=1,
            results=[],
        )
        assert response.query == "bitcoin"


# ============================================================================
# DEPENDENCY FUNCTION TESTS
# ============================================================================


class TestGetPriceService:
    """Tests for get_price_service dependency"""

    @pytest.mark.asyncio
    async def test_yields_service(self):
        """Test that dependency yields service"""
        with patch("app.routers.smart_prices.SmartPriceService") as mock_class:
            mock_instance = AsyncMock()
            mock_class.return_value.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_class.return_value.__aexit__ = AsyncMock(return_value=None)

            async for service in get_price_service():
                assert service == mock_instance


class TestGetHistoricalService:
    """Tests for get_historical_service dependency"""

    @pytest.mark.asyncio
    async def test_yields_service(self):
        """Test that dependency yields service"""
        with patch("app.routers.smart_prices.HistoricalPriceService") as mock_class:
            mock_instance = AsyncMock()
            mock_class.return_value.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_class.return_value.__aexit__ = AsyncMock(return_value=None)

            async for service in get_historical_service():
                assert service == mock_instance


class TestGetUnifiedService:
    """Tests for get_unified_service dependency"""

    @pytest.mark.asyncio
    async def test_yields_service(self):
        """Test that dependency yields service"""
        with patch("app.routers.smart_prices.UnifiedAssetService") as mock_class:
            mock_instance = AsyncMock()
            mock_class.return_value.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_class.return_value.__aexit__ = AsyncMock(return_value=None)

            async for service in get_unified_service():
                assert service == mock_instance


class TestGetCryptoService:
    """Tests for get_crypto_service dependency"""

    @pytest.mark.asyncio
    async def test_yields_service(self):
        """Test that dependency yields service"""
        with patch("app.routers.smart_prices.CryptoDiscoveryService") as mock_class:
            mock_instance = AsyncMock()
            mock_class.return_value.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_class.return_value.__aexit__ = AsyncMock(return_value=None)

            async for service in get_crypto_service():
                assert service == mock_instance


# ============================================================================
# ENDPOINT TESTS - HEALTH
# ============================================================================


class TestHealthCheckEndpoint:
    """Tests for /health endpoint"""

    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test successful health check"""
        from app.routers.smart_prices import health_check

        mock_service = AsyncMock()
        mock_service._check_redis_health = AsyncMock(return_value=True)
        mock_service.providers = {"coingecko": {}, "finnhub": {}}

        result = await health_check(service=mock_service)

        assert result.status == "healthy"
        assert result.redis_connected is True
        assert "coingecko" in result.providers

    @pytest.mark.asyncio
    async def test_health_check_redis_disconnected(self):
        """Test health check with Redis disconnected"""
        from app.routers.smart_prices import health_check

        mock_service = AsyncMock()
        mock_service._check_redis_health = AsyncMock(return_value=False)
        mock_service.providers = {"coingecko": {}}

        result = await health_check(service=mock_service)

        assert result.status == "healthy"
        assert result.redis_connected is False

    @pytest.mark.asyncio
    async def test_health_check_error(self):
        """Test health check error handling"""
        from fastapi import HTTPException

        from app.routers.smart_prices import health_check

        mock_service = AsyncMock()
        mock_service._check_redis_health = AsyncMock(side_effect=Exception("Error"))

        with pytest.raises(HTTPException) as exc_info:
            await health_check(service=mock_service)
        assert exc_info.value.status_code == 500


# ============================================================================
# ENDPOINT TESTS - GET PRICE
# ============================================================================


class TestGetPriceEndpoint:
    """Tests for /{symbol} endpoint"""

    @pytest.mark.asyncio
    async def test_get_price_success(self, mock_price_data):
        """Test successful price retrieval"""
        from app.routers.smart_prices import get_price

        mock_service = AsyncMock()
        mock_service.get_price = AsyncMock(return_value=mock_price_data)

        result = await get_price(symbol="btc", service=mock_service)

        assert result.symbol == "BTC"
        assert result.price == 50000.0
        mock_service.get_price.assert_called_once()
        assert mock_service.get_price.call_args.args[0] == "BTC"

    @pytest.mark.asyncio
    async def test_get_price_force_refresh(self, mock_price_data):
        """Test price retrieval with force refresh"""
        from app.routers.smart_prices import get_price

        mock_service = AsyncMock()
        mock_service.get_price = AsyncMock(return_value=mock_price_data)

        await get_price(symbol="BTC", force_refresh=True, service=mock_service)

        mock_service.get_price.assert_called_once()
        assert mock_service.get_price.call_args.args[0] == "BTC"

    @pytest.mark.asyncio
    async def test_get_price_not_found(self):
        """Test price not found"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_price

        mock_service = AsyncMock()
        mock_service.get_price = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await get_price(symbol="INVALID", service=mock_service)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_price_error(self):
        """Test price retrieval error"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_price

        mock_service = AsyncMock()
        mock_service.get_price = AsyncMock(side_effect=Exception("API Error"))

        with pytest.raises(HTTPException) as exc_info:
            await get_price(symbol="BTC", service=mock_service)
        assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_get_price_uppercase_conversion(self, mock_price_data):
        """Test symbol is converted to uppercase"""
        from app.routers.smart_prices import get_price

        mock_service = AsyncMock()
        mock_service.get_price = AsyncMock(return_value=mock_price_data)

        await get_price(symbol="btc", service=mock_service)

        mock_service.get_price.assert_called_once()
        assert mock_service.get_price.call_args.args[0] == "BTC"


# ============================================================================
# ENDPOINT TESTS - BATCH PRICES
# ============================================================================


class TestGetBatchPricesEndpoint:
    """Tests for /batch endpoint"""

    @pytest.mark.asyncio
    async def test_batch_prices_success(self, mock_price_data):
        """Test successful batch price retrieval"""
        from app.routers.smart_prices import get_batch_prices

        mock_service = AsyncMock()
        mock_service.get_batch_prices = AsyncMock(
            return_value={"BTC": mock_price_data, "ETH": mock_price_data}
        )

        request = BatchPriceRequest(symbols=["btc", "eth"])
        result = await get_batch_prices(request=request, service=mock_service)

        assert result.success is True
        assert "BTC" in result.data
        assert "ETH" in result.data
        assert result.cache_hits == 2  # Both are cached

    @pytest.mark.asyncio
    async def test_batch_prices_partial_failure(self, mock_price_data):
        """Test batch with some failures"""
        from app.routers.smart_prices import get_batch_prices

        mock_service = AsyncMock()
        mock_service.get_batch_prices = AsyncMock(return_value={"BTC": mock_price_data})

        request = BatchPriceRequest(symbols=["BTC", "INVALID"])
        result = await get_batch_prices(request=request, service=mock_service)

        assert result.success is True
        assert "BTC" in result.data
        assert "INVALID" in result.failed

    @pytest.mark.asyncio
    async def test_batch_prices_all_fail(self):
        """Test batch with all failures"""
        from app.routers.smart_prices import get_batch_prices

        mock_service = AsyncMock()
        mock_service.get_batch_prices = AsyncMock(return_value={})

        request = BatchPriceRequest(symbols=["INVALID1", "INVALID2"])
        result = await get_batch_prices(request=request, service=mock_service)

        assert result.success is False
        assert len(result.failed) == 2

    @pytest.mark.asyncio
    async def test_batch_prices_error(self):
        """Test batch error handling"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_batch_prices

        mock_service = AsyncMock()
        mock_service.get_batch_prices = AsyncMock(side_effect=Exception("Error"))

        request = BatchPriceRequest(symbols=["BTC"])
        with pytest.raises(HTTPException) as exc_info:
            await get_batch_prices(request=request, service=mock_service)
        assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_batch_prices_api_calls_tracking(self, mock_price_data):
        """Test API calls vs cache hits tracking"""
        from app.routers.smart_prices import get_batch_prices

        # Create uncached price data
        uncached_mock = MagicMock()
        uncached_mock.symbol = "ETH"
        uncached_mock.price = 3000.0
        uncached_mock.change = 50.0
        uncached_mock.change_percent = 1.7
        uncached_mock.volume = 500000.0
        uncached_mock.market_cap = 400000000000.0
        uncached_mock.high = 3050.0
        uncached_mock.low = 2950.0
        uncached_mock.last_updated = datetime.now()
        uncached_mock.source = "finnhub"
        uncached_mock.cached = False

        mock_service = AsyncMock()
        mock_service.get_batch_prices = AsyncMock(
            return_value={"BTC": mock_price_data, "ETH": uncached_mock}
        )

        request = BatchPriceRequest(symbols=["BTC", "ETH"])
        result = await get_batch_prices(request=request, service=mock_service)

        assert result.cache_hits == 1
        assert result.api_calls == 1


# ============================================================================
# ENDPOINT TESTS - ALL ASSETS
# ============================================================================


class TestGetAllAssetsEndpoint:
    """Tests for /all endpoint"""

    @pytest.mark.asyncio
    async def test_get_all_assets_success(self):
        """Test successful unified assets retrieval"""
        from app.routers.smart_prices import get_all_assets

        mock_service = AsyncMock()
        mock_service.get_all_assets = AsyncMock(
            return_value={"crypto": [{"symbol": "BTC"}], "stocks": [{"symbol": "AAPL"}]}
        )

        with patch(
            "app.core.advanced_redis_client.advanced_redis_client"
        ) as mock_redis:
            mock_redis.get = AsyncMock(return_value=None)
            mock_redis.set = AsyncMock()

            result = await get_all_assets(
                limit_per_type=10,
                types="crypto,stocks",
                force_refresh=False,
                service=mock_service,
            )

            assert result.success is True
            assert "crypto" in result.types
            assert result.total_count == 2

    @pytest.mark.asyncio
    async def test_get_all_assets_cached(self):
        """Test unified assets from cache"""
        from app.routers.smart_prices import get_all_assets

        mock_service = AsyncMock()
        cached_data = {"crypto": [{"symbol": "BTC"}]}

        with patch(
            "app.core.advanced_redis_client.advanced_redis_client"
        ) as mock_redis:
            mock_redis.get = AsyncMock(return_value=cached_data)

            result = await get_all_assets(
                limit_per_type=10,
                types="crypto",
                force_refresh=False,
                service=mock_service,
            )

            assert result.cached is True
            mock_service.get_all_assets.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_all_assets_invalid_types(self):
        """Test with invalid asset types"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_all_assets

        mock_service = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await get_all_assets(
                types="invalid_type",
                service=mock_service,
            )
        assert exc_info.value.status_code == 400
        assert "Invalid asset types" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_all_assets_empty_types(self):
        """Test with empty types"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_all_assets

        mock_service = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await get_all_assets(
                types="",
                service=mock_service,
            )
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_get_all_assets_force_refresh(self):
        """Test force refresh bypasses cache"""
        from app.routers.smart_prices import get_all_assets

        mock_service = AsyncMock()
        mock_service.get_all_assets = AsyncMock(return_value={"crypto": []})

        with patch(
            "app.core.advanced_redis_client.advanced_redis_client"
        ) as mock_redis:
            mock_redis.get = AsyncMock(return_value={"crypto": [{"old": "data"}]})
            mock_redis.set = AsyncMock()

            result = await get_all_assets(
                types="crypto",
                force_refresh=True,
                service=mock_service,
            )

            # Service should be called even though cache has data
            mock_service.get_all_assets.assert_called_once()


# ============================================================================
# ENDPOINT TESTS - HISTORICAL DATA
# ============================================================================


class TestGetPriceHistoryEndpoint:
    """Tests for /{symbol}/history endpoint"""

    @pytest.mark.asyncio
    async def test_get_history_success(self, mock_history_point):
        """Test successful history retrieval"""
        from app.routers.smart_prices import get_price_history

        mock_service = AsyncMock()
        mock_service.get_history = AsyncMock(return_value=[mock_history_point])

        result = await get_price_history(
            symbol="btc",
            period="1m",
            service=mock_service,
        )

        assert result.symbol == "BTC"
        assert result.period == "1m"
        assert result.count == 1

    @pytest.mark.asyncio
    async def test_get_history_not_found(self):
        """Test history not found"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_price_history

        mock_service = AsyncMock()
        mock_service.get_history = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await get_price_history(symbol="INVALID", service=mock_service)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_history_error(self):
        """Test history error handling"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_price_history

        mock_service = AsyncMock()
        mock_service.get_history = AsyncMock(side_effect=Exception("API Error"))

        with pytest.raises(HTTPException) as exc_info:
            await get_price_history(symbol="BTC", service=mock_service)
        assert exc_info.value.status_code == 500


# ============================================================================
# ENDPOINT TESTS - OHLCV DATA
# ============================================================================


class TestGetOHLCVEndpoint:
    """Tests for /{symbol}/ohlcv endpoint"""

    @pytest.mark.asyncio
    async def test_get_ohlcv_success(self, mock_ohlcv_point):
        """Test successful OHLCV retrieval"""
        from app.routers.smart_prices import get_ohlcv_data

        mock_service = AsyncMock()
        mock_service.get_ohlcv = AsyncMock(return_value=[mock_ohlcv_point])

        result = await get_ohlcv_data(
            symbol="btc",
            period="1d",
            service=mock_service,
        )

        assert result.symbol == "BTC"
        assert result.period == "1d"
        assert result.count == 1

    @pytest.mark.asyncio
    async def test_get_ohlcv_not_found(self):
        """Test OHLCV not found"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_ohlcv_data

        mock_service = AsyncMock()
        mock_service.get_ohlcv = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await get_ohlcv_data(symbol="INVALID", service=mock_service)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_ohlcv_error(self):
        """Test OHLCV error handling"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_ohlcv_data

        mock_service = AsyncMock()
        mock_service.get_ohlcv = AsyncMock(side_effect=Exception("API Error"))

        with pytest.raises(HTTPException) as exc_info:
            await get_ohlcv_data(symbol="BTC", service=mock_service)
        assert exc_info.value.status_code == 500


# ============================================================================
# ENDPOINT TESTS - CRYPTO DISCOVERY
# ============================================================================


class TestGetTopCryptosEndpoint:
    """Tests for /crypto/top endpoint"""

    @pytest.mark.asyncio
    async def test_get_top_cryptos_success(self, mock_crypto_data):
        """Test successful top cryptos retrieval"""
        from app.routers.smart_prices import get_top_cryptocurrencies

        mock_service = AsyncMock()
        mock_service.get_top_cryptos = AsyncMock(return_value=[mock_crypto_data])

        result = await get_top_cryptocurrencies(
            limit=10,
            service=mock_service,
        )

        assert result.success is True
        assert result.count == 1

    @pytest.mark.asyncio
    async def test_get_top_cryptos_error(self):
        """Test top cryptos error handling"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_top_cryptocurrencies

        mock_service = AsyncMock()
        mock_service.get_top_cryptos = AsyncMock(side_effect=Exception("Error"))

        with pytest.raises(HTTPException) as exc_info:
            await get_top_cryptocurrencies(service=mock_service)
        assert exc_info.value.status_code == 500


class TestSearchCryptosEndpoint:
    """Tests for /crypto/search endpoint"""

    @pytest.mark.asyncio
    async def test_search_cryptos_success(self, mock_crypto_data):
        """Test successful crypto search"""
        from app.routers.smart_prices import search_cryptocurrencies

        mock_service = AsyncMock()
        mock_service.search_cryptos = AsyncMock(return_value=[mock_crypto_data])

        result = await search_cryptocurrencies(
            q="bitcoin",
            service=mock_service,
        )

        assert result.success is True
        assert result.query == "bitcoin"
        assert result.count == 1

    @pytest.mark.asyncio
    async def test_search_cryptos_error(self):
        """Test crypto search error handling"""
        from fastapi import HTTPException

        from app.routers.smart_prices import search_cryptocurrencies

        mock_service = AsyncMock()
        mock_service.search_cryptos = AsyncMock(side_effect=Exception("Error"))

        with pytest.raises(HTTPException) as exc_info:
            await search_cryptocurrencies(q="test", service=mock_service)
        assert exc_info.value.status_code == 500


class TestGetCryptoMappingEndpoint:
    """Tests for /crypto/mapping endpoint"""

    @pytest.mark.asyncio
    async def test_get_mapping_success(self):
        """Test successful mapping retrieval"""
        from app.routers.smart_prices import get_crypto_symbol_mapping

        mock_service = AsyncMock()
        mock_service.get_symbol_to_id_mapping = AsyncMock(
            return_value={"BTC": "bitcoin", "ETH": "ethereum"}
        )

        result = await get_crypto_symbol_mapping(service=mock_service)

        assert result["BTC"] == "bitcoin"
        assert result["ETH"] == "ethereum"

    @pytest.mark.asyncio
    async def test_get_mapping_error(self):
        """Test mapping error handling"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_crypto_symbol_mapping

        mock_service = AsyncMock()
        mock_service.get_symbol_to_id_mapping = AsyncMock(
            side_effect=Exception("Error")
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_crypto_symbol_mapping(service=mock_service)
        assert exc_info.value.status_code == 500


# ============================================================================
# ENDPOINT TESTS - ADMIN
# ============================================================================


class TestAdminPerformanceEndpoint:
    """Tests for /admin/performance endpoint"""

    @pytest.mark.asyncio
    async def test_get_performance_stats(self):
        """Test performance stats retrieval"""
        from app.routers.smart_prices import get_performance_stats

        mock_perf = MagicMock()
        mock_perf.get_stats.return_value = {"requests": 100}
        mock_perf.total_requests = 100
        mock_perf.cache_hits = 80

        mock_crypto = MagicMock()
        mock_crypto.get_stats.return_value = {"fetches": 50}
        mock_crypto.total_fetches = 50
        mock_crypto.cache_hits = 40

        with patch(
            "app.services.historical_price_service.performance_metrics", mock_perf
        ):
            with patch(
                "app.services.crypto_discovery_service.crypto_metrics", mock_crypto
            ):
                result = await get_performance_stats()

                assert result["status"] == "ok"
                assert "services" in result
                assert "summary" in result

    @pytest.mark.asyncio
    async def test_get_performance_stats_error(self):
        """Test performance stats error handling"""
        from fastapi import HTTPException

        from app.routers.smart_prices import get_performance_stats

        with patch(
            "app.services.historical_price_service.performance_metrics"
        ) as mock_perf:
            mock_perf.get_stats.side_effect = Exception("Error")
            with pytest.raises(HTTPException) as exc_info:
                await get_performance_stats()
            assert exc_info.value.status_code == 500


class TestAdminResetStatsEndpoint:
    """Tests for /admin/reset-stats endpoint"""

    @pytest.mark.asyncio
    async def test_reset_stats(self):
        """Test stats reset"""
        from app.routers.smart_prices import reset_performance_stats

        result = await reset_performance_stats()

        assert "message" in result
        assert "reset" in result["message"].lower()


# ============================================================================
# ROUTER CONFIGURATION TESTS
# ============================================================================


class TestRouterConfiguration:
    """Tests for router configuration"""

    def test_router_prefix(self):
        """Test router has correct prefix"""
        assert router.prefix == "/v1/prices"

    def test_router_tags(self):
        """Test router has correct tags"""
        assert "prices" in router.tags
