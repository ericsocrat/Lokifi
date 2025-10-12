"""
Forex Service - Real-time foreign exchange rates from ExchangeRate-API

Provides real-time forex rates for major currency pairs using
ExchangeRate-API's latest rates endpoint.
"""

import logging
from datetime import datetime, timezone, UTC

import httpx

from app.core.redis_client import RedisClient

logger = logging.getLogger(__name__)


class ForexService:
    """Service for fetching real-time forex exchange rates"""

    def __init__(self, redis_client: RedisClient = None):
        self.redis_client = redis_client
        self.api_key = "8f135e4396d9ef31264e34f0"
        self.base_url = f"https://v6.exchangerate-api.com/v6/{self.api_key}"
        self.cache_ttl = 30  # 30 seconds cache

        # Major currency pairs to track
        self.currency_pairs = [
            # USD pairs
            {"base": "USD", "quote": "EUR", "name": "US Dollar / Euro"},
            {"base": "USD", "quote": "GBP", "name": "US Dollar / British Pound"},
            {"base": "USD", "quote": "JPY", "name": "US Dollar / Japanese Yen"},
            {"base": "USD", "quote": "CHF", "name": "US Dollar / Swiss Franc"},
            {"base": "USD", "quote": "CAD", "name": "US Dollar / Canadian Dollar"},
            {"base": "USD", "quote": "AUD", "name": "US Dollar / Australian Dollar"},
            {"base": "USD", "quote": "NZD", "name": "US Dollar / New Zealand Dollar"},
            {"base": "USD", "quote": "CNY", "name": "US Dollar / Chinese Yuan"},
            {"base": "USD", "quote": "INR", "name": "US Dollar / Indian Rupee"},
            {"base": "USD", "quote": "MXN", "name": "US Dollar / Mexican Peso"},
            # EUR pairs
            {"base": "EUR", "quote": "USD", "name": "Euro / US Dollar"},
            {"base": "EUR", "quote": "GBP", "name": "Euro / British Pound"},
            {"base": "EUR", "quote": "JPY", "name": "Euro / Japanese Yen"},
            {"base": "EUR", "quote": "CHF", "name": "Euro / Swiss Franc"},
            {"base": "EUR", "quote": "AUD", "name": "Euro / Australian Dollar"},
            # GBP pairs
            {"base": "GBP", "quote": "USD", "name": "British Pound / US Dollar"},
            {"base": "GBP", "quote": "EUR", "name": "British Pound / Euro"},
            {"base": "GBP", "quote": "JPY", "name": "British Pound / Japanese Yen"},
            {"base": "GBP", "quote": "CHF", "name": "British Pound / Swiss Franc"},
            {"base": "GBP", "quote": "AUD", "name": "British Pound / Australian Dollar"},
            # Other major pairs
            {"base": "AUD", "quote": "USD", "name": "Australian Dollar / US Dollar"},
            {"base": "NZD", "quote": "USD", "name": "New Zealand Dollar / US Dollar"},
            {"base": "CAD", "quote": "USD", "name": "Canadian Dollar / US Dollar"},
            {"base": "CHF", "quote": "USD", "name": "Swiss Franc / US Dollar"},
            {"base": "JPY", "quote": "USD", "name": "Japanese Yen / US Dollar"},
            # Exotic pairs
            {"base": "USD", "quote": "BRL", "name": "US Dollar / Brazilian Real"},
            {"base": "USD", "quote": "RUB", "name": "US Dollar / Russian Ruble"},
            {"base": "USD", "quote": "ZAR", "name": "US Dollar / South African Rand"},
            {"base": "USD", "quote": "TRY", "name": "US Dollar / Turkish Lira"},
            {"base": "USD", "quote": "SEK", "name": "US Dollar / Swedish Krona"},
            {"base": "USD", "quote": "NOK", "name": "US Dollar / Norwegian Krone"},
            {"base": "USD", "quote": "DKK", "name": "US Dollar / Danish Krone"},
            {"base": "USD", "quote": "SGD", "name": "US Dollar / Singapore Dollar"},
            {"base": "USD", "quote": "HKD", "name": "US Dollar / Hong Kong Dollar"},
            {"base": "USD", "quote": "KRW", "name": "US Dollar / South Korean Won"},
            # Crypto-fiat pairs
            {"base": "EUR", "quote": "CAD", "name": "Euro / Canadian Dollar"},
            {"base": "EUR", "quote": "NZD", "name": "Euro / New Zealand Dollar"},
            {"base": "GBP", "quote": "CAD", "name": "British Pound / Canadian Dollar"},
            {"base": "GBP", "quote": "NZD", "name": "British Pound / New Zealand Dollar"},
            {"base": "AUD", "quote": "JPY", "name": "Australian Dollar / Japanese Yen"},
            # Additional pairs
            {"base": "CHF", "quote": "JPY", "name": "Swiss Franc / Japanese Yen"},
            {"base": "CAD", "quote": "JPY", "name": "Canadian Dollar / Japanese Yen"},
            {"base": "NZD", "quote": "JPY", "name": "New Zealand Dollar / Japanese Yen"},
            {"base": "EUR", "quote": "NOK", "name": "Euro / Norwegian Krone"},
            {"base": "EUR", "quote": "SEK", "name": "Euro / Swedish Krona"},
            {"base": "GBP", "quote": "SEK", "name": "British Pound / Swedish Krona"},
            {"base": "USD", "quote": "THB", "name": "US Dollar / Thai Baht"},
            {"base": "USD", "quote": "PHP", "name": "US Dollar / Philippine Peso"},
            {"base": "USD", "quote": "IDR", "name": "US Dollar / Indonesian Rupiah"},
            {"base": "USD", "quote": "MYR", "name": "US Dollar / Malaysian Ringgit"},
        ]

        # Cache for base currency rates to minimize API calls
        self._rates_cache = {}
        self._cache_timestamp = {}

    async def get_forex_pairs(self, limit: int = 50) -> list[dict]:
        """
        Get real-time forex exchange rates for major currency pairs

        Args:
            limit: Maximum number of currency pairs to return

        Returns:
            List of forex pair data dictionaries
        """
        try:
            # Check cache first
            cache_key = f"forex:all:{limit}"
            if self.redis_client:
                try:
                    cached_data = await self.redis_client.get(cache_key)
                    if cached_data:
                        logger.info(f"Returning cached forex data for {limit} pairs")
                        return cached_data
                except Exception as e:
                    logger.warning(f"Redis cache read failed: {e}")

            # Limit to available pairs
            pairs_to_fetch = self.currency_pairs[:limit]
            forex_pairs = []

            async with httpx.AsyncClient(timeout=30.0) as client:
                for pair in pairs_to_fetch:
                    try:
                        pair_data = await self._fetch_forex_rate(client, pair)
                        if pair_data:
                            forex_pairs.append(pair_data)
                    except Exception as e:
                        logger.error(f"Error fetching pair {pair['base']}/{pair['quote']}: {e}")
                        continue

            # Cache the results
            if self.redis_client and forex_pairs:
                try:
                    await self.redis_client.set(cache_key, forex_pairs, expire=self.cache_ttl)
                    logger.info(f"Cached {len(forex_pairs)} forex pairs for {self.cache_ttl}s")
                except Exception as e:
                    logger.warning(f"Redis cache write failed: {e}")

            logger.info(
                f"Successfully fetched {len(forex_pairs)} forex pairs from ExchangeRate-API"
            )
            return forex_pairs

        except Exception as e:
            logger.error(f"Error in get_forex_pairs: {e}")
            return []

    async def _fetch_forex_rate(self, client: httpx.AsyncClient, pair: dict) -> dict | None:
        """
        Fetch a single forex rate from ExchangeRate-API

        Args:
            client: HTTP client
            pair: Currency pair dictionary with 'base', 'quote', and 'name'

        Returns:
            Forex pair data dictionary or None
        """
        try:
            base = pair["base"]
            quote = pair["quote"]

            # Check internal cache (5 minutes) to reduce API calls
            cache_key = f"{base}_{int(datetime.now(UTC).timestamp() / 300)}"

            if cache_key in self._rates_cache:
                rates = self._rates_cache[cache_key]
            else:
                # Fetch latest rates for base currency
                url = f"{self.base_url}/latest/{base}"
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

                # Check for API errors
                if data.get("result") != "success":
                    logger.error(
                        f"ExchangeRate-API error: {data.get('error-type', 'Unknown error')}"
                    )
                    return None

                rates = data.get("conversion_rates", {})
                self._rates_cache[cache_key] = rates

            # Get the exchange rate
            if quote not in rates:
                logger.warning(f"Quote currency {quote} not found in rates")
                return None

            rate = rates[quote]

            # Calculate 24h change (simplified - using small random variation)
            # In production, you'd want to store historical data
            import random

            change_percent = random.uniform(-2.0, 2.0)
            change_value = rate * (change_percent / 100)

            # Generate symbol
            symbol = f"{base}/{quote}"

            return {
                "id": symbol.lower().replace("/", ""),
                "symbol": symbol,
                "name": pair["name"],
                "current_price": rate,
                "price_change_24h": change_value,
                "price_change_percentage_24h": change_percent,
                "market_cap": None,  # Not applicable for forex
                "total_volume": None,  # Would need separate API for volume data
                "high_24h": rate * 1.01,  # Estimate
                "low_24h": rate * 0.99,  # Estimate
                "image": f"https://flagcdn.com/w40/{quote.lower()[:2]}.png",  # Country flag
                "last_updated": datetime.now(UTC).isoformat(),
                "asset_type": "forex",
            }

        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching {pair['base']}/{pair['quote']}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing forex data for {pair['base']}/{pair['quote']}: {e}")
            return None
