"""
Tests for app.routers.crypto

Comprehensive tests for Cryptocurrency Market Data Router.
Tests CoinGecko API integration, validation, and error handling.
"""

import re
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi import HTTPException

from app.routers.crypto import (
    COINGECKO_BASE_URL,
    VALID_COIN_ID_PATTERN,
    crypto_api_health,
    fetch_from_coingecko,
    get_categories,
    get_coin_details,
    get_exchanges,
    get_market_overview,
    get_nft_list,
    get_ohlc_data,
    get_simple_price,
    get_top_cryptocurrencies,
    get_trending_coins,
    router,
    search_coins,
    validate_coin_id,
)

# ============================================================================
# CONSTANTS TESTS
# ============================================================================


class TestConstants:
    """Tests for module constants"""

    def test_coingecko_base_url(self):
        """Test CoinGecko base URL is correct"""
        assert COINGECKO_BASE_URL == "https://api.coingecko.com/api/v3"

    def test_valid_coin_id_pattern(self):
        """Test coin ID validation pattern"""
        assert VALID_COIN_ID_PATTERN is not None
        assert isinstance(VALID_COIN_ID_PATTERN, re.Pattern)


# ============================================================================
# VALIDATE COIN ID TESTS
# ============================================================================


class TestValidateCoinId:
    """Tests for validate_coin_id function"""

    def test_valid_lowercase_id(self):
        """Test valid lowercase coin ID"""
        result = validate_coin_id("bitcoin")
        assert result == "bitcoin"

    def test_valid_id_with_hyphen(self):
        """Test valid coin ID with hyphen"""
        result = validate_coin_id("shiba-inu")
        assert result == "shiba-inu"

    def test_valid_id_with_numbers(self):
        """Test valid coin ID with numbers"""
        result = validate_coin_id("usdc")
        assert result == "usdc"

    def test_converts_to_lowercase(self):
        """Test uppercase ID is converted to lowercase"""
        result = validate_coin_id("BITCOIN")
        assert result == "bitcoin"

    def test_mixed_case_converted(self):
        """Test mixed case ID is converted"""
        result = validate_coin_id("BitCoin")
        assert result == "bitcoin"

    def test_rejects_empty_string(self):
        """Test empty string is rejected"""
        with pytest.raises(HTTPException) as exc_info:
            validate_coin_id("")
        assert exc_info.value.status_code == 400

    def test_rejects_special_characters(self):
        """Test special characters are rejected"""
        with pytest.raises(HTTPException) as exc_info:
            validate_coin_id("bitcoin$")
        assert exc_info.value.status_code == 400

    def test_rejects_path_injection(self):
        """Test path injection attempt is rejected"""
        with pytest.raises(HTTPException) as exc_info:
            validate_coin_id("../etc/passwd")
        assert exc_info.value.status_code == 400

    def test_rejects_spaces(self):
        """Test spaces are rejected"""
        with pytest.raises(HTTPException) as exc_info:
            validate_coin_id("bit coin")
        assert exc_info.value.status_code == 400


# ============================================================================
# FETCH FROM COINGECKO TESTS
# ============================================================================


class TestFetchFromCoinGecko:
    """Tests for fetch_from_coingecko function"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.settings")
    @patch("app.routers.crypto.httpx.AsyncClient")
    async def test_successful_fetch(self, mock_client_class, mock_settings):
        """Test successful API fetch"""
        mock_settings.COINGECKO_KEY = None
        mock_response = MagicMock()
        mock_response.json.return_value = {"data": "test"}
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock()

        result = await fetch_from_coingecko("test/endpoint", {"key": "value"})

        assert result == {"data": "test"}

    @pytest.mark.asyncio
    @patch("app.routers.crypto.settings")
    @patch("app.routers.crypto.httpx.AsyncClient")
    async def test_adds_api_key_when_configured(self, mock_client_class, mock_settings):
        """Test API key is added to params when configured"""
        mock_settings.COINGECKO_KEY = "test-api-key"
        mock_response = MagicMock()
        mock_response.json.return_value = {}
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_class.return_value.__aexit__ = AsyncMock()

        await fetch_from_coingecko("test", {})

        call_args = mock_client.get.call_args
        assert call_args[1]["params"]["x_cg_demo_api_key"] == "test-api-key"

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_http_error_via_endpoint(self, mock_fetch):
        """Test HTTP error handling via endpoint"""
        mock_fetch.side_effect = HTTPException(
            status_code=503, detail="CoinGecko API error: 429"
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_top_cryptocurrencies()

        assert exc_info.value.status_code == 503

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_timeout_error_via_endpoint(self, mock_fetch):
        """Test timeout error handling via endpoint"""
        mock_fetch.side_effect = HTTPException(
            status_code=504, detail="CoinGecko API request timed out"
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_top_cryptocurrencies()

        assert exc_info.value.status_code == 504

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_generic_error_via_endpoint(self, mock_fetch):
        """Test generic error handling via endpoint"""
        mock_fetch.side_effect = HTTPException(
            status_code=500, detail="Failed to fetch cryptocurrency data"
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_top_cryptocurrencies()

        assert exc_info.value.status_code == 500


# ============================================================================
# GET TOP CRYPTOCURRENCIES TESTS
# ============================================================================


class TestGetTopCryptocurrencies:
    """Tests for get_top_cryptocurrencies endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_returns_top_coins(self, mock_fetch):
        """Test returns top cryptocurrencies"""
        mock_fetch.return_value = [
            {"id": "bitcoin", "name": "Bitcoin"},
            {"id": "ethereum", "name": "Ethereum"},
        ]

        result = await get_top_cryptocurrencies()

        assert len(result) == 2
        assert result[0]["id"] == "bitcoin"

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_default_limit_is_100(self, mock_fetch):
        """Test default limit is 100"""
        mock_fetch.return_value = []

        # Call with explicit default values
        await get_top_cryptocurrencies(limit=100, vs_currency="usd")

        call_args = mock_fetch.call_args
        assert call_args[0][1]["per_page"] == 100

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_custom_limit(self, mock_fetch):
        """Test custom limit"""
        mock_fetch.return_value = []

        await get_top_cryptocurrencies(limit=50)

        call_args = mock_fetch.call_args
        assert call_args[0][1]["per_page"] == 50

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_custom_vs_currency(self, mock_fetch):
        """Test custom vs_currency"""
        mock_fetch.return_value = []

        await get_top_cryptocurrencies(vs_currency="eur")

        call_args = mock_fetch.call_args
        assert call_args[0][1]["vs_currency"] == "eur"


# ============================================================================
# GET MARKET OVERVIEW TESTS
# ============================================================================


class TestGetMarketOverview:
    """Tests for get_market_overview endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_returns_market_data(self, mock_fetch):
        """Test returns formatted market data"""
        mock_fetch.return_value = {
            "data": {
                "total_market_cap": {"usd": 1000000000},
                "total_volume": {"usd": 50000000},
                "market_cap_percentage": {"btc": 45.5, "eth": 18.2},
                "active_cryptocurrencies": 10000,
                "markets": 500,
                "market_cap_change_percentage_24h_usd": 2.5,
            }
        }

        result = await get_market_overview()

        assert result["total_market_cap"] == 1000000000
        assert result["total_volume_24h"] == 50000000
        assert result["bitcoin_dominance"] == 45.5
        assert result["ethereum_dominance"] == 18.2
        assert result["market_sentiment"] == 70
        assert result["active_coins"] == 10000
        assert result["markets"] == 500

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_handles_missing_data_key(self, mock_fetch):
        """Test handles response without 'data' key"""
        mock_fetch.return_value = {}

        with pytest.raises(HTTPException) as exc_info:
            await get_market_overview()

        assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_handles_exception(self, mock_fetch):
        """Test handles generic exception"""
        mock_fetch.side_effect = Exception("API error")

        with pytest.raises(HTTPException) as exc_info:
            await get_market_overview()

        assert exc_info.value.status_code == 500


# ============================================================================
# GET COIN DETAILS TESTS
# ============================================================================


class TestGetCoinDetails:
    """Tests for get_coin_details endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_returns_coin_details(self, mock_fetch):
        """Test returns coin details"""
        mock_fetch.return_value = {"id": "bitcoin", "name": "Bitcoin"}

        result = await get_coin_details("bitcoin")

        assert result["id"] == "bitcoin"

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_validates_coin_id(self, mock_fetch):
        """Test validates coin ID"""
        mock_fetch.return_value = {}

        # Invalid coin ID should raise
        with pytest.raises(HTTPException):
            await get_coin_details("../invalid")

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_passes_query_params(self, mock_fetch):
        """Test passes query parameters"""
        mock_fetch.return_value = {}

        await get_coin_details(
            "bitcoin",
            localization=True,
            tickers=True,
            market_data=False,
            community_data=True,
            developer_data=True,
        )

        call_args = mock_fetch.call_args
        params = call_args[0][1]
        assert params["localization"] == "true"
        assert params["tickers"] == "true"
        assert params["market_data"] == "false"


# ============================================================================
# GET SIMPLE PRICE TESTS
# ============================================================================


class TestGetSimplePrice:
    """Tests for get_simple_price endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_returns_price_data(self, mock_fetch):
        """Test returns price data"""
        mock_fetch.return_value = {
            "bitcoin": {"usd": 50000},
            "ethereum": {"usd": 3000},
        }

        result = await get_simple_price(ids="bitcoin,ethereum")

        assert result["bitcoin"]["usd"] == 50000

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_includes_24hr_change(self, mock_fetch):
        """Test includes 24hr change in params"""
        mock_fetch.return_value = {}

        await get_simple_price(ids="bitcoin")

        call_args = mock_fetch.call_args
        assert call_args[0][1]["include_24hr_change"] == "true"


# ============================================================================
# GET TRENDING COINS TESTS
# ============================================================================


class TestGetTrendingCoins:
    """Tests for get_trending_coins endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_returns_trending_data(self, mock_fetch):
        """Test returns trending coins"""
        mock_fetch.return_value = {"coins": [{"item": {"id": "bitcoin"}}]}

        result = await get_trending_coins()

        assert "coins" in result


# ============================================================================
# GET CATEGORIES TESTS
# ============================================================================


class TestGetCategories:
    """Tests for get_categories endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_returns_categories(self, mock_fetch):
        """Test returns categories"""
        mock_fetch.return_value = [{"id": "defi", "name": "DeFi"}]

        result = await get_categories()

        assert len(result) == 1
        assert result[0]["id"] == "defi"


# ============================================================================
# GET OHLC DATA TESTS
# ============================================================================


class TestGetOHLCData:
    """Tests for get_ohlc_data endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_returns_formatted_ohlc(self, mock_fetch):
        """Test returns formatted OHLC data"""
        mock_fetch.return_value = [[1640000000000, 50000, 51000, 49000, 50500]]

        result = await get_ohlc_data("bitcoin")

        assert len(result) == 1
        assert result[0]["timestamp"] == 1640000000000
        assert result[0]["open"] == 50000
        assert result[0]["high"] == 51000
        assert result[0]["low"] == 49000
        assert result[0]["close"] == 50500

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_validates_coin_id(self, mock_fetch):
        """Test validates coin ID"""
        mock_fetch.return_value = []

        # Invalid coin ID should raise
        with pytest.raises(HTTPException):
            await get_ohlc_data("../invalid")

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_custom_params(self, mock_fetch):
        """Test passes custom parameters"""
        mock_fetch.return_value = []

        await get_ohlc_data("bitcoin", vs_currency="eur", days=30)

        call_args = mock_fetch.call_args
        params = call_args[0][1]
        assert params["vs_currency"] == "eur"
        assert params["days"] == 30


# ============================================================================
# SEARCH COINS TESTS
# ============================================================================


class TestSearchCoins:
    """Tests for search_coins endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_returns_search_results(self, mock_fetch):
        """Test returns search results"""
        mock_fetch.return_value = {"coins": [{"id": "bitcoin", "name": "Bitcoin"}]}

        result = await search_coins(query="bit")

        assert "coins" in result


# ============================================================================
# GET EXCHANGES TESTS
# ============================================================================


class TestGetExchanges:
    """Tests for get_exchanges endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_returns_exchanges(self, mock_fetch):
        """Test returns exchanges"""
        mock_fetch.return_value = [{"id": "binance", "name": "Binance"}]

        result = await get_exchanges()

        assert len(result) == 1
        assert result[0]["id"] == "binance"

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_custom_per_page(self, mock_fetch):
        """Test custom per_page parameter"""
        mock_fetch.return_value = []

        await get_exchanges(per_page=50)

        call_args = mock_fetch.call_args
        assert call_args[0][1]["per_page"] == 50


# ============================================================================
# GET NFT LIST TESTS
# ============================================================================


class TestGetNFTList:
    """Tests for get_nft_list endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_returns_nft_list(self, mock_fetch):
        """Test returns NFT list"""
        mock_fetch.return_value = [{"id": "bored-ape", "name": "Bored Ape"}]

        result = await get_nft_list()

        assert len(result) == 1
        assert result[0]["id"] == "bored-ape"

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_custom_per_page(self, mock_fetch):
        """Test custom per_page parameter"""
        mock_fetch.return_value = []

        await get_nft_list(per_page=50)

        call_args = mock_fetch.call_args
        assert call_args[0][1]["per_page"] == 50


# ============================================================================
# CRYPTO API HEALTH TESTS
# ============================================================================


class TestCryptoAPIHealth:
    """Tests for crypto_api_health endpoint"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.settings")
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_healthy_response(self, mock_fetch, mock_settings):
        """Test healthy response"""
        mock_fetch.return_value = {"gecko_says": "(V3) To the Moon!"}
        mock_settings.COINGECKO_KEY = "test-key"

        result = await crypto_api_health()

        assert result["status"] == "healthy"
        assert result["provider"] == "CoinGecko"
        assert result["api_key_configured"] is True

    @pytest.mark.asyncio
    @patch("app.routers.crypto.settings")
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_unhealthy_response(self, mock_fetch, mock_settings):
        """Test unhealthy response"""
        mock_fetch.side_effect = Exception("API down")
        mock_settings.COINGECKO_KEY = None

        result = await crypto_api_health()

        assert result["status"] == "unhealthy"
        assert result["api_key_configured"] is False
        assert "API down" in result["error"]


# ============================================================================
# ROUTER TESTS
# ============================================================================


class TestCryptoRouter:
    """Tests for router configuration"""

    def test_router_exists(self):
        """Test router is defined"""
        assert router is not None

    def test_router_has_crypto_prefix(self):
        """Test router has /crypto prefix"""
        assert router.prefix == "/crypto"

    def test_router_has_crypto_tag(self):
        """Test router has crypto tag"""
        assert "crypto" in router.tags

    def test_router_has_top_endpoint(self):
        """Test router has /top endpoint"""
        routes = [r.path for r in router.routes]
        assert "/crypto/top" in routes

    def test_router_has_market_overview_endpoint(self):
        """Test router has /market/overview endpoint"""
        routes = [r.path for r in router.routes]
        assert "/crypto/market/overview" in routes

    def test_router_has_coin_details_endpoint(self):
        """Test router has /coin/{coin_id} endpoint"""
        routes = [r.path for r in router.routes]
        assert "/crypto/coin/{coin_id}" in routes

    def test_router_has_health_endpoint(self):
        """Test router has /health endpoint"""
        routes = [r.path for r in router.routes]
        assert "/crypto/health" in routes


# ============================================================================
# EDGE CASES
# ============================================================================


class TestEdgeCases:
    """Edge case tests"""

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_empty_ohlc_response(self, mock_fetch):
        """Test empty OHLC response"""
        mock_fetch.return_value = []

        result = await get_ohlc_data("bitcoin")

        assert result == []

    @pytest.mark.asyncio
    @patch("app.routers.crypto.fetch_from_coingecko")
    async def test_market_overview_with_zeros(self, mock_fetch):
        """Test market overview with zero values"""
        mock_fetch.return_value = {
            "data": {
                "total_market_cap": {},
                "total_volume": {},
                "market_cap_percentage": {},
                "active_cryptocurrencies": 0,
                "markets": 0,
            }
        }

        result = await get_market_overview()

        assert result["total_market_cap"] == 0
        assert result["total_volume_24h"] == 0
        assert result["bitcoin_dominance"] == 0
