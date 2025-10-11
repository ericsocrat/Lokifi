"""
Stock Service - Real-time stock market data from Alpha Vantage API

Provides real stock prices, market data, and related information
using Alpha Vantage's Global Quote endpoint.
"""

import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)


class StockService:
    """Service for fetching real-time stock market data from Alpha Vantage"""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.api_key = "D8RDSS583XDQ1DIA"
        self.base_url = "https://www.alphavantage.co/query"
        self.cache_ttl = 30  # 30 seconds cache
        
        # Major stock symbols to track
        self.stock_symbols = [
            "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA",
            "META", "NVDA", "JPM", "V", "WMT",
            "JNJ", "PG", "MA", "UNH", "HD",
            "DIS", "PYPL", "NFLX", "ADBE", "CRM",
            "CSCO", "PFE", "INTC", "AMD", "ORCL",
            "NKE", "MCD", "COST", "PEP", "KO",
            "ABBV", "TMO", "ABT", "ACN", "TXN",
            "AVGO", "QCOM", "DHR", "BMY", "NEE",
            "CVX", "LLY", "UPS", "MDT", "HON",
            "RTX", "LIN", "UNP", "LOW", "PM"
        ]
        
        # Stock name mapping
        self.stock_names = {
            "AAPL": "Apple Inc.",
            "MSFT": "Microsoft Corporation",
            "GOOGL": "Alphabet Inc.",
            "AMZN": "Amazon.com Inc.",
            "TSLA": "Tesla Inc.",
            "META": "Meta Platforms Inc.",
            "NVDA": "NVIDIA Corporation",
            "JPM": "JPMorgan Chase & Co.",
            "V": "Visa Inc.",
            "WMT": "Walmart Inc.",
            "JNJ": "Johnson & Johnson",
            "PG": "Procter & Gamble Co.",
            "MA": "Mastercard Inc.",
            "UNH": "UnitedHealth Group Inc.",
            "HD": "The Home Depot Inc.",
            "DIS": "The Walt Disney Company",
            "PYPL": "PayPal Holdings Inc.",
            "NFLX": "Netflix Inc.",
            "ADBE": "Adobe Inc.",
            "CRM": "Salesforce Inc.",
            "CSCO": "Cisco Systems Inc.",
            "PFE": "Pfizer Inc.",
            "INTC": "Intel Corporation",
            "AMD": "Advanced Micro Devices Inc.",
            "ORCL": "Oracle Corporation",
            "NKE": "Nike Inc.",
            "MCD": "McDonald's Corporation",
            "COST": "Costco Wholesale Corporation",
            "PEP": "PepsiCo Inc.",
            "KO": "The Coca-Cola Company",
            "ABBV": "AbbVie Inc.",
            "TMO": "Thermo Fisher Scientific Inc.",
            "ABT": "Abbott Laboratories",
            "ACN": "Accenture plc",
            "TXN": "Texas Instruments Inc.",
            "AVGO": "Broadcom Inc.",
            "QCOM": "QUALCOMM Inc.",
            "DHR": "Danaher Corporation",
            "BMY": "Bristol-Myers Squibb Co.",
            "NEE": "NextEra Energy Inc.",
            "CVX": "Chevron Corporation",
            "LLY": "Eli Lilly and Company",
            "UPS": "United Parcel Service Inc.",
            "MDT": "Medtronic plc",
            "HON": "Honeywell International Inc.",
            "RTX": "Raytheon Technologies Corp.",
            "LIN": "Linde plc",
            "UNP": "Union Pacific Corporation",
            "LOW": "Lowe's Companies Inc.",
            "PM": "Philip Morris International Inc."
        }
    
    async def get_stocks(self, limit: int = 50) -> list[dict]:
        """
        Get real-time stock data for major stocks
        
        Args:
            limit: Maximum number of stocks to return
            
        Returns:
            List of stock data dictionaries
        """
        try:
            # Check cache first
            cache_key = f"stocks:all:{limit}"
            if self.redis_client:
                try:
                    cached_data = await self.redis_client.get(cache_key)
                    if cached_data:
                        logger.info(f"Returning cached stock data for {limit} stocks")
                        return cached_data
                except Exception as e:
                    logger.warning(f"Redis cache read failed: {e}")
            
            # Limit to available symbols
            symbols_to_fetch = self.stock_symbols[:limit]
            stocks = []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                for symbol in symbols_to_fetch:
                    try:
                        stock_data = await self._fetch_stock_quote(client, symbol)
                        if stock_data:
                            stocks.append(stock_data)
                    except Exception as e:
                        logger.error(f"Error fetching stock {symbol}: {e}")
                        continue
            
            # Cache the results
            if self.redis_client and stocks:
                try:
                    await self.redis_client.set(cache_key, stocks, expire=self.cache_ttl)
                    logger.info(f"Cached {len(stocks)} stocks for {self.cache_ttl}s")
                except Exception as e:
                    logger.warning(f"Redis cache write failed: {e}")
            
            logger.info(f"Successfully fetched {len(stocks)} stocks from Alpha Vantage")
            return stocks
            
        except Exception as e:
            logger.error(f"Error in get_stocks: {e}")
            # Return empty list on error
            return []
    
    async def _fetch_stock_quote(self, client: httpx.AsyncClient, symbol: str) -> dict | None:
        """
        Fetch a single stock quote from Alpha Vantage
        
        Args:
            client: HTTP client
            symbol: Stock symbol
            
        Returns:
            Stock data dictionary or None
        """
        try:
            params = {
                "function": "GLOBAL_QUOTE",
                "symbol": symbol,
                "apikey": self.api_key
            }
            
            response = await client.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Check for API error or rate limit
            if "Error Message" in data:
                logger.error(f"Alpha Vantage API error for {symbol}: {data['Error Message']}")
                return None
            
            if "Note" in data:
                logger.warning(f"Alpha Vantage API rate limit: {data['Note']}")
                return None
            
            # Parse the quote data
            quote = data.get("Global Quote", {})
            if not quote:
                logger.warning(f"No quote data for {symbol}")
                return None
            
            # Extract values
            price = float(quote.get("05. price", 0))
            change = float(quote.get("09. change", 0))
            change_percent = quote.get("10. change percent", "0%").replace("%", "")
            volume = int(quote.get("06. volume", 0))
            previous_close = float(quote.get("08. previous close", 0))
            
            # Calculate market cap (simplified - would need separate API call for accurate data)
            # Using price * estimated shares outstanding (very rough estimate)
            market_cap = price * 1000000000  # Placeholder
            
            return {
                "id": symbol.lower(),
                "symbol": symbol,
                "name": self.stock_names.get(symbol, symbol),
                "current_price": price,
                "price_change_24h": change,
                "price_change_percentage_24h": float(change_percent),
                "market_cap": market_cap,
                "total_volume": volume,
                "high_24h": previous_close * 1.05,  # Estimate
                "low_24h": previous_close * 0.95,   # Estimate
                "image": f"https://logo.clearbit.com/{symbol.lower()}.com",  # Company logo
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "asset_type": "stock"
            }
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching {symbol}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing stock data for {symbol}: {e}")
            return None
