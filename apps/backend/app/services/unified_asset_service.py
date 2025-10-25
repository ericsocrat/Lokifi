"""
Unified Asset Service - Single source of truth for all assets
Prevents duplicates and manages crypto/stock/index discovery
"""

import logging
from dataclasses import dataclass

import httpx

from app.core.advanced_redis_client import advanced_redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class UnifiedAsset:
    """Unified asset representation"""

    symbol: str  # Trading symbol (BTC, AAPL, etc.)
    name: str  # Full name
    type: str  # crypto, stock, etf, index
    provider: str  # coingecko, finnhub
    provider_id: str | None = None  # CoinGecko ID or Finnhub symbol
    icon: str | None = None
    market_cap_rank: int | None = None


class UnifiedAssetService:
    """
    Central service to prevent duplicate asset fetching
    - Maintains single registry of all assets
    - Routes requests to correct provider
    - Prevents crypto/stock overlap
    """

    def __init__(self):
        self.client: httpx.AsyncClient | None = None
        self._asset_registry: dict[str, UnifiedAsset] = {}
        self._crypto_symbols: set[str] = set()
        self._stock_symbols: set[str] = set()

    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        await self._initialize_registry()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()

    async def _initialize_registry(self):
        """Initialize the asset registry from cache or API"""
        cache_key = "unified:asset_registry"

        try:
            data = await advanced_redis_client.get(cache_key)
            if data:
                self._crypto_symbols = set(data.get("crypto_symbols", []))
                self._stock_symbols = set(data.get("stock_symbols", []))
                logger.info(
                    f"✅ Loaded asset registry: {len(self._crypto_symbols)} cryptos, {len(self._stock_symbols)} stocks"
                )
                return
        except Exception as e:
            logger.warning(f"Could not load cached registry: {e}")

        # Initialize with known cryptos from CoinGecko
        await self._fetch_crypto_symbols()

        # Cache the registry for 1 hour
        await self._cache_registry()

    async def _fetch_crypto_symbols(self):
        """Fetch all crypto symbols from CoinGecko to build registry"""
        try:
            url = "https://api.coingecko.com/api/v3/coins/markets"
            params = {
                "vs_currency": "usd",
                "order": "market_cap_desc",
                "per_page": 250,  # Max per page (increased from 100)
                "page": 1,
                "sparkline": False,
            }

            if settings.COINGECKO_KEY:
                params["x_cg_demo_api_key"] = settings.COINGECKO_KEY

            if self.client is None:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(url, params=params)
            else:
                resp = await self.client.get(url, params=params)

            resp.raise_for_status()
            data = resp.json()

            for coin in data:
                symbol = coin["symbol"].upper()
                self._crypto_symbols.add(symbol)
                self._asset_registry[symbol] = UnifiedAsset(
                    symbol=symbol,
                    name=coin["name"],
                    type="crypto",
                    provider="coingecko",
                    provider_id=coin["id"],
                    icon=coin.get("image"),
                    market_cap_rank=coin.get("market_cap_rank"),
                )

            logger.info(f"✅ Initialized crypto registry with {len(self._crypto_symbols)} symbols")

        except Exception as e:
            logger.error(f"❌ Error fetching crypto symbols: {e}")

    async def _cache_registry(self):
        """Cache the asset registry"""
        try:
            data = {
                "crypto_symbols": list(self._crypto_symbols),
                "stock_symbols": list(self._stock_symbols),
            }
            await advanced_redis_client.set(
                "unified:asset_registry",
                data,
                expire=3600,  # 1 hour
            )
        except Exception as e:
            logger.warning(f"Could not cache registry: {e}")

    def is_crypto(self, symbol: str) -> bool:
        """Check if symbol is a cryptocurrency"""
        return symbol.upper() in self._crypto_symbols

    def is_stock(self, symbol: str) -> bool:
        """Check if symbol is a stock (or assume if not crypto)"""
        symbol_upper = symbol.upper()

        # If we know it's crypto, it's not a stock
        if symbol_upper in self._crypto_symbols:
            return False

        # Stock patterns: single letter or 2-5 letters
        # Crypto patterns: Usually 3-5 letters but in crypto list
        if len(symbol) >= 2 and len(symbol) <= 5 and symbol.isupper():
            return True

        return False

    def get_asset_info(self, symbol: str) -> UnifiedAsset | None:
        """Get asset information from registry"""
        return self._asset_registry.get(symbol.upper())

    def get_provider(self, symbol: str) -> str:
        """Get the correct provider for a symbol"""
        if self.is_crypto(symbol):
            return "coingecko"
        else:
            return "finnhub"

    def get_coingecko_id(self, symbol: str) -> str | None:
        """Get CoinGecko ID for a crypto symbol"""
        asset = self._asset_registry.get(symbol.upper())
        if asset and asset.type == "crypto":
            return asset.provider_id
        return None

    async def get_all_cryptos(self) -> list[str]:
        """Get all known crypto symbols"""
        return list(self._crypto_symbols)

    async def get_all_stocks(self) -> list[str]:
        """Get all known stock symbols"""
        return list(self._stock_symbols)

    def register_stock(self, symbol: str, name: str):
        """Register a new stock symbol"""
        symbol_upper = symbol.upper()
        if symbol_upper not in self._crypto_symbols:
            self._stock_symbols.add(symbol_upper)
            self._asset_registry[symbol_upper] = UnifiedAsset(
                symbol=symbol_upper,
                name=name,
                type="stock",
                provider="finnhub",
                provider_id=symbol_upper,
            )

    async def get_all_assets(
        self, limit_per_type: int = 10, types: list[str] | None = None, force_refresh: bool = False
    ) -> dict[str, list[dict]]:
        """
        Get unified assets from all requested types

        Args:
            limit_per_type: Number of assets per type
            types: List of asset types to fetch
            force_refresh: Force API refresh

        Returns:
            Dict with keys matching requested types, each containing list of assets
        """
        from app.services.crypto_discovery_service import CryptoDiscoveryService
        from app.services.forex_service import ForexService
        from app.services.stock_service import StockService

        if types is None:
            types = ["crypto", "stocks", "indices", "forex"]
        logger.info(f"🔄 Fetching unified assets: {types} (limit: {limit_per_type})")

        result = {}

        # Fetch crypto if requested (EXPANDED: now fetching 300 instead of 100)
        if "crypto" in types:
            try:
                async with CryptoDiscoveryService() as crypto_service:
                    # Fetch more cryptos - 300 for comprehensive coverage
                    crypto_limit = min(300, limit_per_type * 3) if limit_per_type < 100 else 300
                    cryptos = await crypto_service.get_top_cryptos(
                        limit=crypto_limit, force_refresh=force_refresh
                    )
                    result["crypto"] = [crypto.to_dict() for crypto in cryptos]
                    logger.info(
                        f"✅ Fetched {len(cryptos)} cryptos from CoinGecko (expanded coverage)"
                    )
            except Exception as e:
                logger.error(f"❌ Error fetching cryptos: {e}")
                result["crypto"] = []

        # Fetch stocks if requested - REAL API
        if "stocks" in types:
            try:
                stock_service = StockService(redis_client=advanced_redis_client)
                stocks = await stock_service.get_stocks(limit=limit_per_type)
                result["stocks"] = stocks
                logger.info(f"✅ Fetched {len(stocks)} stocks from Alpha Vantage")
            except Exception as e:
                logger.error(f"❌ Error fetching stocks: {e}")
                # Fallback to mock data if API fails
                result["stocks"] = self._get_mock_stocks(limit_per_type)
                logger.warning("⚠️ Using mock stock data as fallback")

        # Fetch indices if requested - REAL API
        if "indices" in types:
            try:
                from app.services.indices_service import IndicesService

                async with IndicesService(redis_client=advanced_redis_client) as indices_service:
                    indices = await indices_service.get_indices(limit=limit_per_type)
                    result["indices"] = indices
                    logger.info(f"✅ Fetched {len(indices)} indices from real API")
            except Exception as e:
                logger.error(f"❌ Error fetching indices: {e}")
                # Fallback to mock data if API fails
                result["indices"] = self._get_mock_indices()
                logger.warning("⚠️ Using mock indices data as fallback")

        # Fetch forex if requested - REAL API
        if "forex" in types:
            try:
                forex_service = ForexService(redis_client=advanced_redis_client)
                forex = await forex_service.get_forex_pairs(limit=limit_per_type)
                result["forex"] = forex
                logger.info(f"✅ Fetched {len(forex)} forex pairs from ExchangeRate-API")
            except Exception as e:
                logger.error(f"❌ Error fetching forex: {e}")
                # Fallback to mock data if API fails
                result["forex"] = self._get_mock_forex(limit_per_type)
                logger.warning("⚠️ Using mock forex data as fallback")

        return result

    def _get_mock_stocks(self, limit: int) -> list[dict]:
        """Get mock stock data - TODO: Implement real API"""
        stocks = [
            {
                "id": "AAPL",
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "type": "stocks",
                "current_price": 178.72,
                "price_change_percentage_24h": 1.22,
                "market_cap": 2800000000000,
                "volume_24h": 52000000,
                "rank": 1,
            },
            {
                "id": "MSFT",
                "symbol": "MSFT",
                "name": "Microsoft Corporation",
                "type": "stocks",
                "current_price": 378.91,
                "price_change_percentage_24h": 1.45,
                "market_cap": 2820000000000,
                "volume_24h": 21000000,
                "rank": 2,
            },
            {
                "id": "GOOGL",
                "symbol": "GOOGL",
                "name": "Alphabet Inc.",
                "type": "stocks",
                "current_price": 141.53,
                "price_change_percentage_24h": -0.61,
                "market_cap": 1780000000000,
                "volume_24h": 18000000,
                "rank": 3,
            },
            {
                "id": "AMZN",
                "symbol": "AMZN",
                "name": "Amazon.com Inc.",
                "type": "stocks",
                "current_price": 178.25,
                "price_change_percentage_24h": 1.78,
                "market_cap": 1850000000000,
                "volume_24h": 45000000,
                "rank": 4,
            },
            {
                "id": "NVDA",
                "symbol": "NVDA",
                "name": "NVIDIA Corporation",
                "type": "stocks",
                "current_price": 495.22,
                "price_change_percentage_24h": 2.56,
                "market_cap": 1220000000000,
                "volume_24h": 38000000,
                "rank": 5,
            },
            {
                "id": "TSLA",
                "symbol": "TSLA",
                "name": "Tesla Inc.",
                "type": "stocks",
                "current_price": 242.84,
                "price_change_percentage_24h": -2.28,
                "market_cap": 772000000000,
                "volume_24h": 95000000,
                "rank": 6,
            },
            {
                "id": "META",
                "symbol": "META",
                "name": "Meta Platforms Inc.",
                "type": "stocks",
                "current_price": 512.33,
                "price_change_percentage_24h": 1.77,
                "market_cap": 1310000000000,
                "volume_24h": 14000000,
                "rank": 7,
            },
            {
                "id": "BRK.B",
                "symbol": "BRK.B",
                "name": "Berkshire Hathaway Inc.",
                "type": "stocks",
                "current_price": 438.75,
                "price_change_percentage_24h": 0.56,
                "market_cap": 952000000000,
                "volume_24h": 3200000,
                "rank": 8,
            },
            {
                "id": "V",
                "symbol": "V",
                "name": "Visa Inc.",
                "type": "stocks",
                "current_price": 287.92,
                "price_change_percentage_24h": 0.43,
                "market_cap": 585000000000,
                "volume_24h": 5600000,
                "rank": 9,
            },
            {
                "id": "JPM",
                "symbol": "JPM",
                "name": "JPMorgan Chase & Co.",
                "type": "stocks",
                "current_price": 201.45,
                "price_change_percentage_24h": -0.66,
                "market_cap": 583000000000,
                "volume_24h": 8900000,
                "rank": 10,
            },
        ]
        return stocks[:limit]

    def _get_mock_indices(self) -> list[dict]:
        """Get mock indices data - TODO: Implement real API"""
        return [
            {
                "id": "SPX",
                "symbol": "SPX",
                "name": "S&P 500",
                "type": "indices",
                "current_price": 5751.13,
                "price_change_percentage_24h": 0.50,
            },
            {
                "id": "DJI",
                "symbol": "DJI",
                "name": "Dow Jones Industrial Average",
                "type": "indices",
                "current_price": 42352.75,
                "price_change_percentage_24h": 0.81,
            },
            {
                "id": "IXIC",
                "symbol": "IXIC",
                "name": "NASDAQ Composite",
                "type": "indices",
                "current_price": 18137.85,
                "price_change_percentage_24h": 0.28,
            },
            {
                "id": "RUT",
                "symbol": "RUT",
                "name": "Russell 2000",
                "type": "indices",
                "current_price": 2209.24,
                "price_change_percentage_24h": 0.56,
            },
            {
                "id": "VIX",
                "symbol": "VIX",
                "name": "CBOE Volatility Index",
                "type": "indices",
                "current_price": 18.45,
                "price_change_percentage_24h": -6.25,
            },
            {
                "id": "FTSE",
                "symbol": "FTSE",
                "name": "FTSE 100",
                "type": "indices",
                "current_price": 8272.46,
                "price_change_percentage_24h": 0.55,
            },
            {
                "id": "N225",
                "symbol": "N225",
                "name": "Nikkei 225",
                "type": "indices",
                "current_price": 38920.26,
                "price_change_percentage_24h": 0.61,
            },
            {
                "id": "DAX",
                "symbol": "DAX",
                "name": "DAX",
                "type": "indices",
                "current_price": 19189.48,
                "price_change_percentage_24h": 0.47,
            },
            {
                "id": "HSI",
                "symbol": "HSI",
                "name": "Hang Seng Index",
                "type": "indices",
                "current_price": 22640.06,
                "price_change_percentage_24h": 1.40,
            },
            {
                "id": "STOXX50E",
                "symbol": "STOXX50E",
                "name": "Euro Stoxx 50",
                "type": "indices",
                "current_price": 4912.34,
                "price_change_percentage_24h": 0.48,
            },
        ]

    def _get_mock_forex(self, limit: int) -> list[dict]:
        """Get mock forex data - TODO: Implement real API"""
        forex = [
            {
                "id": "EURUSD",
                "symbol": "EUR/USD",
                "name": "Euro / US Dollar",
                "type": "forex",
                "current_price": 1.0945,
                "price_change_percentage_24h": 0.21,
            },
            {
                "id": "GBPUSD",
                "symbol": "GBP/USD",
                "name": "British Pound / US Dollar",
                "type": "forex",
                "current_price": 1.3124,
                "price_change_percentage_24h": 0.26,
            },
            {
                "id": "USDJPY",
                "symbol": "USD/JPY",
                "name": "US Dollar / Japanese Yen",
                "type": "forex",
                "current_price": 148.92,
                "price_change_percentage_24h": -0.30,
            },
            {
                "id": "AUDUSD",
                "symbol": "AUD/USD",
                "name": "Australian Dollar / US Dollar",
                "type": "forex",
                "current_price": 0.6734,
                "price_change_percentage_24h": 0.18,
            },
            {
                "id": "USDCAD",
                "symbol": "USD/CAD",
                "name": "US Dollar / Canadian Dollar",
                "type": "forex",
                "current_price": 1.3589,
                "price_change_percentage_24h": -0.17,
            },
            {
                "id": "USDCHF",
                "symbol": "USD/CHF",
                "name": "US Dollar / Swiss Franc",
                "type": "forex",
                "current_price": 0.8567,
                "price_change_percentage_24h": -0.13,
            },
            {
                "id": "NZDUSD",
                "symbol": "NZD/USD",
                "name": "New Zealand Dollar / US Dollar",
                "type": "forex",
                "current_price": 0.6145,
                "price_change_percentage_24h": 0.13,
            },
            {
                "id": "EURGBP",
                "symbol": "EUR/GBP",
                "name": "Euro / British Pound",
                "type": "forex",
                "current_price": 0.8342,
                "price_change_percentage_24h": -0.06,
            },
            {
                "id": "EURJPY",
                "symbol": "EUR/JPY",
                "name": "Euro / Japanese Yen",
                "type": "forex",
                "current_price": 162.98,
                "price_change_percentage_24h": 0.21,
            },
            {
                "id": "GBPJPY",
                "symbol": "GBP/JPY",
                "name": "British Pound / Japanese Yen",
                "type": "forex",
                "current_price": 195.45,
                "price_change_percentage_24h": 0.34,
            },
        ]
        return forex[:limit]


# Global singleton
_unified_service: UnifiedAssetService | None = None


async def get_unified_service() -> UnifiedAssetService:
    """Get or create unified asset service singleton"""
    global _unified_service
    if _unified_service is None:
        _unified_service = UnifiedAssetService()
        await _unified_service.__aenter__()
    return _unified_service
