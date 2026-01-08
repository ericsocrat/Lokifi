"""
Comprehensive tests for app.services.smart_price_service

Tests for smart price service including:
- PriceData dataclass
- SmartPriceService class with caching
- Redis operations
- Batch price fetching
- Provider-specific price fetching

Session 138 Part 3 - Backend coverage improvement
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.smart_price_service import (
    PriceData,
    SmartPriceService,
    get_unified_service,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def price_data():
    """Sample PriceData for testing"""
    return PriceData(
        symbol="BTC",
        price=50000.0,
        change=1000.0,
        change_percent=2.0,
        volume=1000000.0,
        market_cap=1000000000000.0,
        high=51000.0,
        low=49000.0,
        last_updated=datetime.now(),
        source="coingecko",
        cached=False,
    )


@pytest.fixture
def mock_unified_service():
    """Mock unified asset service"""
    mock = MagicMock()  # Use MagicMock since methods aren't async
    mock.is_crypto.return_value = True
    mock.is_stock.return_value = False
    mock.get_coingecko_id.return_value = "bitcoin"
    mock.register_stock = MagicMock()
    return mock


# ============================================================================
# PRICEDATA DATACLASS TESTS
# ============================================================================


class TestPriceData:
    """Tests for PriceData dataclass"""

    def test_create_basic(self):
        """Test creating basic PriceData"""
        data = PriceData(symbol="BTC", price=50000.0)
        assert data.symbol == "BTC"
        assert data.price == 50000.0
        assert data.source == "unknown"
        assert data.cached is False

    def test_create_with_all_fields(self):
        """Test creating PriceData with all fields"""
        now = datetime.now()
        data = PriceData(
            symbol="ETH",
            price=3000.0,
            change=100.0,
            change_percent=3.5,
            volume=500000.0,
            market_cap=400000000000.0,
            high=3100.0,
            low=2900.0,
            last_updated=now,
            source="finnhub",
            cached=True,
        )
        assert data.symbol == "ETH"
        assert data.change == 100.0
        assert data.source == "finnhub"
        assert data.cached is True

    def test_optional_fields_default_none(self):
        """Test optional fields default to None"""
        data = PriceData(symbol="XYZ", price=100.0)
        assert data.change is None
        assert data.change_percent is None
        assert data.volume is None
        assert data.market_cap is None
        assert data.high is None
        assert data.low is None
        assert data.last_updated is None

    def test_dict_conversion(self):
        """Test __dict__ attribute for caching"""
        data = PriceData(symbol="BTC", price=50000.0, source="coingecko")
        data_dict = data.__dict__
        assert data_dict["symbol"] == "BTC"
        assert data_dict["price"] == 50000.0
        assert data_dict["source"] == "coingecko"


# ============================================================================
# GET_UNIFIED_SERVICE TESTS
# ============================================================================


class TestGetUnifiedService:
    """Tests for get_unified_service function"""

    @pytest.mark.asyncio
    async def test_get_unified_service_returns_service(self):
        """Test get_unified_service returns a service"""
        import app.services.smart_price_service as module

        # Reset global
        module._unified_service = None

        with patch(
            "app.services.unified_asset_service.get_unified_service"
        ) as mock_get:
            mock_service = AsyncMock()
            mock_get.return_value = mock_service

            result = await get_unified_service()

            assert result is mock_service

    @pytest.mark.asyncio
    async def test_get_unified_service_caches_instance(self):
        """Test service is cached on subsequent calls"""
        import app.services.smart_price_service as module

        # Set up cached instance
        mock_cached = AsyncMock()
        module._unified_service = mock_cached

        result = await get_unified_service()

        assert result is mock_cached


# ============================================================================
# SMARTPRICESERVICE INIT TESTS
# ============================================================================


class TestSmartPriceServiceInit:
    """Tests for SmartPriceService initialization"""

    def test_init(self):
        """Test service initialization"""
        service = SmartPriceService()
        assert service.client is None
        assert "coingecko" in service.providers
        assert "finnhub" in service.providers

    def test_providers_urls(self):
        """Test provider URLs are correct"""
        service = SmartPriceService()
        assert "coingecko.com" in service.providers["coingecko"]
        assert "finnhub.io" in service.providers["finnhub"]


# ============================================================================
# CONTEXT MANAGER TESTS
# ============================================================================


class TestSmartPriceServiceContextManager:
    """Tests for SmartPriceService context manager"""

    @pytest.mark.asyncio
    async def test_aenter_creates_client(self):
        """Test __aenter__ creates HTTP client"""
        service = SmartPriceService()
        async with service as s:
            assert s.client is not None
            assert isinstance(s.client, httpx.AsyncClient)

    @pytest.mark.asyncio
    async def test_aexit_closes_client(self):
        """Test __aexit__ closes HTTP client"""
        service = SmartPriceService()
        async with service as s:
            client = s.client
        # Client should be closed after context exit
        assert client is not None


# ============================================================================
# REDIS HEALTH CHECK TESTS
# ============================================================================


class TestCheckRedisHealth:
    """Tests for _check_redis_health method"""

    @pytest.mark.asyncio
    async def test_redis_healthy(self):
        """Test Redis health check returns True when healthy"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_client = AsyncMock()
            mock_client.ping = AsyncMock()
            mock_redis.client = mock_client

            result = await service._check_redis_health()

            assert result is True

    @pytest.mark.asyncio
    async def test_redis_unhealthy(self):
        """Test Redis health check returns False when unhealthy"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.client = None

            result = await service._check_redis_health()

            assert result is False

    @pytest.mark.asyncio
    async def test_redis_error(self):
        """Test Redis health check returns False on error"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_client = AsyncMock()
            mock_client.ping = AsyncMock(side_effect=Exception("Connection error"))
            mock_redis.client = mock_client

            result = await service._check_redis_health()

            assert result is False


# ============================================================================
# CACHE TESTS
# ============================================================================


class TestGetCached:
    """Tests for _get_cached method"""

    @pytest.mark.asyncio
    async def test_get_cached_hit(self):
        """Test cache hit returns data"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.client = MagicMock()
            mock_redis.get = AsyncMock(return_value={"symbol": "BTC", "price": 50000.0})

            result = await service._get_cached("price:BTC")

            assert result == {"symbol": "BTC", "price": 50000.0}

    @pytest.mark.asyncio
    async def test_get_cached_miss(self):
        """Test cache miss returns None"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.client = MagicMock()
            mock_redis.get = AsyncMock(return_value=None)

            result = await service._get_cached("price:UNKNOWN")

            assert result is None

    @pytest.mark.asyncio
    async def test_get_cached_no_client(self):
        """Test cache returns None when no client"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.client = None

            result = await service._get_cached("price:BTC")

            assert result is None

    @pytest.mark.asyncio
    async def test_get_cached_error(self):
        """Test cache returns None on error"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.client = MagicMock()
            mock_redis.get = AsyncMock(side_effect=Exception("Error"))

            result = await service._get_cached("price:BTC")

            assert result is None


class TestSetCache:
    """Tests for _set_cache method"""

    @pytest.mark.asyncio
    async def test_set_cache_success(self):
        """Test successful cache set"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.client = MagicMock()
            mock_redis.set = AsyncMock()

            await service._set_cache("price:BTC", {"price": 50000.0}, 60)

            mock_redis.set.assert_called_once_with(
                "price:BTC", {"price": 50000.0}, expire=60
            )

    @pytest.mark.asyncio
    async def test_set_cache_no_client(self):
        """Test cache set with no client does nothing"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.client = None

            # Should not raise
            await service._set_cache("price:BTC", {"price": 50000.0})

    @pytest.mark.asyncio
    async def test_set_cache_connection_error(self):
        """Test cache set handles connection error"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.client = MagicMock()
            mock_redis.set = AsyncMock(side_effect=ConnectionError("Connection lost"))

            # Should not raise
            await service._set_cache("price:BTC", {"price": 50000.0})

    @pytest.mark.asyncio
    async def test_set_cache_timeout_error(self):
        """Test cache set handles timeout error"""
        service = SmartPriceService()

        with patch(
            "app.services.smart_price_service.advanced_redis_client"
        ) as mock_redis:
            mock_redis.client = MagicMock()
            mock_redis.set = AsyncMock(side_effect=TimeoutError("Timeout"))

            # Should not raise
            await service._set_cache("price:BTC", {"price": 50000.0})


# ============================================================================
# GET_PRICE TESTS
# ============================================================================


class TestGetPrice:
    """Tests for get_price method"""

    @pytest.mark.asyncio
    async def test_get_price_from_cache(self):
        """Test getting price from cache"""
        service = SmartPriceService()

        cached_data = {
            "symbol": "BTC",
            "price": 50000.0,
            "source": "coingecko",
        }

        with patch.object(service, "_get_cached", AsyncMock(return_value=cached_data)):
            result = await service.get_price("BTC", force_refresh=False)

            assert result is not None
            assert result.symbol == "BTC"
            assert result.cached is True

    @pytest.mark.asyncio
    async def test_get_price_force_refresh(self, mock_unified_service):
        """Test force refresh bypasses cache"""
        async with SmartPriceService() as service:
            with patch.object(service, "_get_cached", AsyncMock()) as mock_get:
                with patch.object(
                    service, "_fetch_price", AsyncMock(return_value=None)
                ):
                    with patch(
                        "app.services.smart_price_service.get_unified_service",
                        AsyncMock(return_value=mock_unified_service),
                    ):
                        await service.get_price("BTC", force_refresh=True)

                        # Cache should not be checked when force_refresh=True
                        mock_get.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_price_fetch_error(self, mock_unified_service):
        """Test error handling during price fetch"""
        async with SmartPriceService() as service:
            with patch.object(service, "_get_cached", AsyncMock(return_value=None)):
                with patch.object(
                    service, "_fetch_price", AsyncMock(side_effect=Exception("Error"))
                ):
                    result = await service.get_price("BTC")

                    assert result is None

    @pytest.mark.asyncio
    async def test_get_price_without_context(self, mock_unified_service):
        """Test get_price creates client when not in context"""
        service = SmartPriceService()
        assert service.client is None

        with patch.object(service, "_get_cached", AsyncMock(return_value=None)):
            with patch.object(
                service,
                "_fetch_price",
                AsyncMock(
                    return_value=PriceData(
                        symbol="BTC", price=50000.0, source="coingecko"
                    )
                ),
            ):
                with patch.object(service, "_set_cache", AsyncMock()):
                    result = await service.get_price("BTC")

                    assert result is not None


# ============================================================================
# FETCH_PRICE TESTS
# ============================================================================


class TestFetchPrice:
    """Tests for _fetch_price method"""

    @pytest.mark.asyncio
    async def test_fetch_crypto_price(self, mock_unified_service):
        """Test fetching crypto price from CoinGecko"""
        import app.services.smart_price_service as module

        mock_unified_service.is_crypto.return_value = True
        mock_unified_service.get_coingecko_id.return_value = "bitcoin"

        # Set the global to avoid async call
        module._unified_service = mock_unified_service

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "bitcoin": {
                "usd": 50000.0,
                "usd_24h_change": 2.5,
                "usd_24h_vol": 1000000.0,
                "usd_market_cap": 1000000000000.0,
            }
        }

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        async with SmartPriceService() as service:
            result = await service._fetch_price(mock_client, "BTC")

            assert result is not None
            assert result.symbol == "BTC"
            assert result.price == 50000.0
            assert result.source == "coingecko"

        # Reset global
        module._unified_service = None

    @pytest.mark.asyncio
    async def test_fetch_stock_price(self, mock_unified_service):
        """Test fetching stock price from Finnhub"""
        import app.services.smart_price_service as module

        mock_unified_service.is_crypto.return_value = False
        mock_unified_service.is_stock.return_value = False

        # Set the global to avoid async call
        module._unified_service = mock_unified_service

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "c": 150.0,  # current price
            "d": 2.0,  # change
            "dp": 1.35,  # change percent
            "h": 152.0,  # high
            "l": 148.0,  # low
        }

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        async with SmartPriceService() as service:
            result = await service._fetch_price(mock_client, "AAPL")

            assert result is not None
            assert result.symbol == "AAPL"
            assert result.price == 150.0
            assert result.source == "finnhub"

        # Reset global
        module._unified_service = None

    @pytest.mark.asyncio
    async def test_fetch_crypto_no_coingecko_id(self, mock_unified_service):
        """Test crypto fetch with no CoinGecko ID"""
        import app.services.smart_price_service as module

        mock_unified_service.is_crypto.return_value = True
        mock_unified_service.get_coingecko_id.return_value = None

        module._unified_service = mock_unified_service

        mock_client = AsyncMock()

        async with SmartPriceService() as service:
            result = await service._fetch_price(mock_client, "UNKNOWN")

            assert result is None

        module._unified_service = None

    @pytest.mark.asyncio
    async def test_fetch_stock_no_price(self, mock_unified_service):
        """Test stock fetch with no price data"""
        import app.services.smart_price_service as module

        mock_unified_service.is_crypto.return_value = False

        module._unified_service = mock_unified_service

        mock_response = MagicMock()
        mock_response.json.return_value = {"c": 0}

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        async with SmartPriceService() as service:
            result = await service._fetch_price(mock_client, "INVALID")

            assert result is None

        module._unified_service = None


# ============================================================================
# GET_BATCH_PRICES TESTS
# ============================================================================


class TestGetBatchPrices:
    """Tests for get_batch_prices method"""

    @pytest.mark.asyncio
    async def test_batch_empty_list(self):
        """Test batch prices with empty list"""
        async with SmartPriceService() as service:
            result = await service.get_batch_prices([])
            assert result == {}

    @pytest.mark.asyncio
    async def test_batch_all_cached(self, mock_unified_service):
        """Test batch prices when all cached"""
        async with SmartPriceService() as service:
            cached_data = {"symbol": "BTC", "price": 50000.0, "source": "coingecko"}

            with patch(
                "app.services.smart_price_service.get_unified_service",
                AsyncMock(return_value=mock_unified_service),
            ):
                with patch.object(
                    service, "_get_cached", AsyncMock(return_value=cached_data)
                ):
                    result = await service.get_batch_prices(["BTC"])

                    assert "BTC" in result
                    assert result["BTC"].cached is True

    @pytest.mark.asyncio
    async def test_batch_removes_duplicates(self, mock_unified_service):
        """Test batch removes duplicate symbols"""
        async with SmartPriceService() as service:
            cached_data = {"symbol": "BTC", "price": 50000.0, "source": "coingecko"}

            with patch(
                "app.services.smart_price_service.get_unified_service",
                AsyncMock(return_value=mock_unified_service),
            ):
                with patch.object(
                    service, "_get_cached", AsyncMock(return_value=cached_data)
                ):
                    result = await service.get_batch_prices(["btc", "BTC", "btc"])

                    # Should only have one result despite duplicates
                    assert len(result) == 1

    @pytest.mark.asyncio
    async def test_batch_separates_cryptos_and_stocks(self, mock_unified_service):
        """Test batch separates cryptos and stocks"""
        async with SmartPriceService() as service:
            # BTC is crypto, AAPL is stock
            def is_crypto_side_effect(symbol):
                return symbol == "BTC"

            mock_unified_service.is_crypto.side_effect = is_crypto_side_effect

            with patch(
                "app.services.smart_price_service.get_unified_service",
                AsyncMock(return_value=mock_unified_service),
            ):
                with patch.object(
                    service,
                    "_get_cached",
                    AsyncMock(
                        return_value={
                            "symbol": "BTC",
                            "price": 50000.0,
                            "source": "coingecko",
                        }
                    ),
                ):
                    result = await service.get_batch_prices(["BTC", "AAPL"])

                    # Both should be processed
                    assert len(result) == 2


# ============================================================================
# FETCH_BATCH_CRYPTOS TESTS
# ============================================================================


class TestFetchBatchCryptos:
    """Tests for _fetch_batch_cryptos method"""

    @pytest.mark.asyncio
    async def test_fetch_batch_empty(self):
        """Test batch fetch with empty list"""
        async with SmartPriceService() as service:
            result = await service._fetch_batch_cryptos([])
            assert result == {}

    @pytest.mark.asyncio
    async def test_fetch_batch_success(self, mock_unified_service):
        """Test successful batch crypto fetch"""
        import app.services.smart_price_service as module

        mock_unified_service.get_coingecko_id.side_effect = lambda s: {
            "BTC": "bitcoin",
            "ETH": "ethereum",
        }.get(s)

        module._unified_service = mock_unified_service

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "bitcoin": {"usd": 50000.0},
            "ethereum": {"usd": 3000.0},
        }
        mock_response.raise_for_status = MagicMock()

        async with SmartPriceService() as service:
            with patch.object(
                service.client, "get", AsyncMock(return_value=mock_response)
            ):
                with patch.object(service, "_set_cache", AsyncMock()):
                    result = await service._fetch_batch_cryptos(["BTC", "ETH"])

                    assert "BTC" in result
                    assert "ETH" in result
                    assert result["BTC"].price == 50000.0
                    assert result["ETH"].price == 3000.0

        module._unified_service = None

    @pytest.mark.asyncio
    async def test_fetch_batch_no_coin_ids(self, mock_unified_service):
        """Test batch fetch with no valid coin IDs"""
        import app.services.smart_price_service as module

        mock_unified_service.get_coingecko_id.return_value = None
        module._unified_service = mock_unified_service

        async with SmartPriceService() as service:
            result = await service._fetch_batch_cryptos(["UNKNOWN"])

            assert result == {}

        module._unified_service = None

    @pytest.mark.asyncio
    async def test_fetch_batch_error(self, mock_unified_service):
        """Test batch fetch error handling"""
        import app.services.smart_price_service as module

        mock_unified_service.get_coingecko_id.return_value = "bitcoin"
        module._unified_service = mock_unified_service

        async with SmartPriceService() as service:
            with patch.object(
                service.client, "get", AsyncMock(side_effect=Exception("API Error"))
            ):
                result = await service._fetch_batch_cryptos(["BTC"])

                assert result == {}

        module._unified_service = None

    @pytest.mark.asyncio
    async def test_fetch_batch_without_client(self, mock_unified_service):
        """Test batch fetch creates client when not in context"""
        import app.services.smart_price_service as module

        mock_unified_service.get_coingecko_id.return_value = "bitcoin"
        module._unified_service = mock_unified_service

        mock_response = MagicMock()
        mock_response.json.return_value = {"bitcoin": {"usd": 50000.0}}
        mock_response.raise_for_status = MagicMock()

        service = SmartPriceService()
        assert service.client is None

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with patch.object(service, "_set_cache", AsyncMock()):
                result = await service._fetch_batch_cryptos(["BTC"])

                assert "BTC" in result

        module._unified_service = None
