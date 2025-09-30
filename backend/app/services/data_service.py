"""
Symbol directory and OHLC data provider for Fynix trading platform.
Supports multiple data sources with failover capabilities.
"""

import logging
import os
from datetime import datetime, timedelta
from enum import Enum

import aiohttp
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class DataProvider(Enum):
    ALPHA_VANTAGE = "alphavantage"
    FINNHUB = "finnhub" 
    POLYGON = "polygon"
    TWELVE_DATA = "twelvedata"
    YAHOO_FINANCE = "yahoo"

class AssetType(Enum):
    STOCK = "stock"
    CRYPTO = "crypto"
    FOREX = "forex"
    COMMODITY = "commodity"
    INDEX = "index"

class Symbol(BaseModel):
    symbol: str
    name: str
    asset_type: AssetType
    exchange: str
    currency: str
    country: str | None = None
    sector: str | None = None
    industry: str | None = None
    market_cap: float | None = None
    description: str | None = None
    is_active: bool = True
    last_updated: datetime

class OHLCData(BaseModel):
    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    provider: DataProvider
    timeframe: str = "1D"

class DataProviderConfig(BaseModel):
    provider: DataProvider
    api_key: str
    base_url: str
    rate_limit: int  # requests per minute
    priority: int  # 1 = highest priority
    enabled: bool = True

class SymbolDirectory:
    """Manages symbol discovery and metadata"""
    
    def __init__(self):
        self.symbols: dict[str, Symbol] = {}
        self._load_default_symbols()
    
    def _load_default_symbols(self):
        """Load default symbol set"""
        default_symbols = [
            # Major stocks
            ("AAPL", "Apple Inc.", AssetType.STOCK, "NASDAQ", "USD", "US", "Technology", "Consumer Electronics"),
            ("MSFT", "Microsoft Corporation", AssetType.STOCK, "NASDAQ", "USD", "US", "Technology", "Software"),
            ("GOOGL", "Alphabet Inc.", AssetType.STOCK, "NASDAQ", "USD", "US", "Technology", "Internet"),
            ("TSLA", "Tesla Inc.", AssetType.STOCK, "NASDAQ", "USD", "US", "Consumer Discretionary", "Auto Manufacturers"),
            ("AMZN", "Amazon.com Inc.", AssetType.STOCK, "NASDAQ", "USD", "US", "Consumer Discretionary", "Internet Retail"),
            ("META", "Meta Platforms Inc.", AssetType.STOCK, "NASDAQ", "USD", "US", "Technology", "Internet"),
            ("NFLX", "Netflix Inc.", AssetType.STOCK, "NASDAQ", "USD", "US", "Communication Services", "Entertainment"),
            ("NVDA", "NVIDIA Corporation", AssetType.STOCK, "NASDAQ", "USD", "US", "Technology", "Semiconductors"),
            
            # Major indices
            ("SPY", "SPDR S&P 500 ETF", AssetType.INDEX, "NYSE", "USD", "US", "ETF", "Broad Market"),
            ("QQQ", "Invesco QQQ ETF", AssetType.INDEX, "NASDAQ", "USD", "US", "ETF", "Technology"),
            ("DIA", "SPDR Dow Jones ETF", AssetType.INDEX, "NYSE", "USD", "US", "ETF", "Broad Market"),
            
            # Cryptocurrencies
            ("BTCUSD", "Bitcoin", AssetType.CRYPTO, "CRYPTO", "USD", None, "Cryptocurrency", "Digital Currency"),
            ("ETHUSD", "Ethereum", AssetType.CRYPTO, "CRYPTO", "USD", None, "Cryptocurrency", "Smart Contracts"),
            ("ADAUSD", "Cardano", AssetType.CRYPTO, "CRYPTO", "USD", None, "Cryptocurrency", "Blockchain Platform"),
            ("SOLUSD", "Solana", AssetType.CRYPTO, "CRYPTO", "USD", None, "Cryptocurrency", "Web3 Platform"),
            ("DOGEUSDT", "Dogecoin", AssetType.CRYPTO, "CRYPTO", "USD", None, "Cryptocurrency", "Meme Coin"),
            
            # Major forex pairs
            ("EURUSD", "Euro / US Dollar", AssetType.FOREX, "FOREX", "USD", None, "Currency", "Major Pair"),
            ("GBPUSD", "British Pound / US Dollar", AssetType.FOREX, "FOREX", "USD", None, "Currency", "Major Pair"),
            ("USDJPY", "US Dollar / Japanese Yen", AssetType.FOREX, "FOREX", "JPY", None, "Currency", "Major Pair"),
            ("AUDUSD", "Australian Dollar / US Dollar", AssetType.FOREX, "FOREX", "USD", None, "Currency", "Major Pair"),
            ("USDCAD", "US Dollar / Canadian Dollar", AssetType.FOREX, "FOREX", "CAD", None, "Currency", "Major Pair"),
            
            # Commodities
            ("GOLD", "Gold Futures", AssetType.COMMODITY, "COMEX", "USD", None, "Precious Metals", "Gold"),
            ("SILVER", "Silver Futures", AssetType.COMMODITY, "COMEX", "USD", None, "Precious Metals", "Silver"),
            ("OIL", "Crude Oil Futures", AssetType.COMMODITY, "NYMEX", "USD", None, "Energy", "Crude Oil"),
        ]
        
        for symbol_data in default_symbols:
            symbol = Symbol(
                symbol=symbol_data[0],
                name=symbol_data[1],
                asset_type=symbol_data[2],
                exchange=symbol_data[3],
                currency=symbol_data[4],
                country=symbol_data[5],
                sector=symbol_data[6],
                industry=symbol_data[7],
                last_updated=datetime.now()
            )
            self.symbols[symbol.symbol] = symbol
    
    async def search_symbols(
        self, 
        query: str, 
        asset_type: AssetType | None = None,
        limit: int = 50
    ) -> list[Symbol]:
        """Search symbols by query string"""
        query = query.upper().strip()
        results = []
        
        for symbol in self.symbols.values():
            if not symbol.is_active:
                continue
                
            if asset_type and symbol.asset_type != asset_type:
                continue
            
            # Match symbol or name
            if (query in symbol.symbol or 
                query.lower() in symbol.name.lower()):
                results.append(symbol)
            
            if len(results) >= limit:
                break
        
        # Sort by relevance (exact symbol match first, then alphabetical)
        def sort_key(s):
            if s.symbol == query:
                return (0, s.symbol)
            elif s.symbol.startswith(query):
                return (1, s.symbol)
            else:
                return (2, s.symbol)
        
        results.sort(key=sort_key)
        return results
    
    def get_symbol(self, symbol: str) -> Symbol | None:
        """Get symbol metadata"""
        return self.symbols.get(symbol.upper())
    
    def get_symbols_by_type(self, asset_type: AssetType) -> list[Symbol]:
        """Get all symbols of a specific type"""
        return [s for s in self.symbols.values() 
                if s.asset_type == asset_type and s.is_active]

class OHLCAggregator:
    """Aggregates OHLC data from multiple providers with failover"""
    
    def __init__(self):
        self.providers: list[DataProviderConfig] = []
        self.session: aiohttp.ClientSession | None = None
        self.cache: dict[str, list[OHLCData]] = {}
        self.cache_ttl = timedelta(minutes=5)
        
    async def initialize(self):
        """Initialize HTTP session and providers"""
        # Lazily create a single shared aiohttp session
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        
        # Configure default providers (loaded from environment)
        self.providers = [
            DataProviderConfig(
                provider=DataProvider.ALPHA_VANTAGE,
                api_key=os.getenv("ALPHAVANTAGE_KEY", "demo"),
                base_url="https://www.alphavantage.co/query",
                rate_limit=5,
                priority=1,
                enabled=True
            ),
            DataProviderConfig(
                provider=DataProvider.FINNHUB,
                api_key=os.getenv("FINNHUB_KEY", "demo"),
                base_url="https://finnhub.io/api/v1",
                rate_limit=60,
                priority=2,
                enabled=True
            ),
            DataProviderConfig(
                provider=DataProvider.YAHOO_FINANCE,
                api_key="",  # No API key needed
                base_url="https://query1.finance.yahoo.com/v7/finance/chart",
                rate_limit=100,
                priority=3,
                enabled=True
            )
        ]
        
        # Sort by priority
        self.providers.sort(key=lambda p: p.priority)
    
    async def get_ohlc_data(
        self,
        symbol: str,
        timeframe: str = "1D",
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int = 100
    ) -> list[OHLCData]:
        """Get OHLC data with provider failover"""
        
        cache_key = f"{symbol}_{timeframe}_{limit}"
        
        # Check cache first
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            if cached_data and (datetime.now() - cached_data[0].timestamp) < self.cache_ttl:
                return cached_data[:limit]
        
        # Try each provider in order
        for provider_config in self.providers:
            if not provider_config.enabled:
                continue
                
            try:
                data = await self._fetch_from_provider(
                    provider_config, symbol, timeframe, start_date, end_date, limit
                )
                
                if data:
                    # Cache the data
                    self.cache[cache_key] = data
                    logger.info(f"Successfully fetched {len(data)} bars for {symbol} from {provider_config.provider.value}")
                    return data
                    
            except Exception as e:
                logger.warning(f"Provider {provider_config.provider.value} failed for {symbol}: {e}")
                continue
        
        # If all providers fail, return mock data
        logger.warning(f"All providers failed for {symbol}, returning mock data")
        return await self._generate_mock_data(symbol, timeframe, limit)
    
    async def _fetch_from_provider(
        self,
        config: DataProviderConfig,
        symbol: str,
        timeframe: str,
        start_date: datetime | None,
        end_date: datetime | None,
        limit: int
    ) -> list[OHLCData]:
        """Fetch data from specific provider"""
        
        if config.provider == DataProvider.YAHOO_FINANCE:
            return await self._fetch_yahoo_finance(config, symbol, timeframe, limit)
        elif config.provider == DataProvider.ALPHA_VANTAGE:
            return await self._fetch_alpha_vantage(config, symbol, timeframe, limit)
        elif config.provider == DataProvider.FINNHUB:
            return await self._fetch_finnhub(config, symbol, timeframe, limit)
        else:
            raise NotImplementedError(f"Provider {config.provider} not implemented")
    
    async def _fetch_yahoo_finance(
        self, 
        config: DataProviderConfig, 
        symbol: str, 
        timeframe: str, 
        limit: int
    ) -> list[OHLCData]:
        """Fetch from Yahoo Finance (free, no API key)"""
        
        # Convert timeframe
        interval = self._convert_timeframe_yahoo(timeframe)
        url = f"{config.base_url}/{symbol}"
        
        params = {
            "interval": interval,
            "range": f"{limit}d" if timeframe == "1D" else "1mo",
            "includePrePost": "false"
        }
        
        if not self.session:  # Defensive (should be initialized in initialize())
            raise RuntimeError("OHLCAggregator session not initialized. Call initialize() first.")
        async with self.session.get(url, params=params) as response:
            if response.status != 200:
                raise Exception(f"HTTP {response.status}")
            
            data = await response.json()
            
            if "chart" not in data or not data["chart"]["result"]:
                raise Exception("No data returned")
            
            result = data["chart"]["result"][0]
            timestamps = result["timestamp"]
            quotes = result["indicators"]["quote"][0]
            
            ohlc_data = []
            for i, timestamp in enumerate(timestamps):
                if quotes["open"][i] is not None:  # Skip null values
                    ohlc_data.append(OHLCData(
                        symbol=symbol,
                        timestamp=datetime.fromtimestamp(timestamp),
                        open=float(quotes["open"][i]),
                        high=float(quotes["high"][i]),
                        low=float(quotes["low"][i]),
                        close=float(quotes["close"][i]),
                        volume=int(quotes["volume"][i] or 0),
                        provider=config.provider,
                        timeframe=timeframe
                    ))
            
            return ohlc_data[-limit:] if len(ohlc_data) > limit else ohlc_data
    
    async def _fetch_alpha_vantage(
        self, 
        config: DataProviderConfig, 
        symbol: str, 
        timeframe: str, 
        limit: int
    ) -> list[OHLCData]:
        """Fetch from Alpha Vantage"""
        
        function = "TIME_SERIES_DAILY" if timeframe == "1D" else "TIME_SERIES_INTRADAY"
        params = {
            "function": function,
            "symbol": symbol,
            "apikey": config.api_key,
            "outputsize": "compact"
        }
        
        if function == "TIME_SERIES_INTRADAY":
            params["interval"] = self._convert_timeframe_av(timeframe)
        
        if not self.session:
            raise RuntimeError("OHLCAggregator session not initialized. Call initialize() first.")
        async with self.session.get(config.base_url, params=params) as response:
            if response.status != 200:
                raise Exception(f"HTTP {response.status}")
            
            data = await response.json()
            
            # Find the time series key
            ts_key = None
            for key in data.keys():
                if "Time Series" in key:
                    ts_key = key
                    break
            
            if not ts_key or ts_key not in data:
                raise Exception("No time series data found")
            
            time_series = data[ts_key]
            ohlc_data = []
            
            for date_str, values in time_series.items():
                ohlc_data.append(OHLCData(
                    symbol=symbol,
                    timestamp=datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S" if " " in date_str else "%Y-%m-%d"),
                    open=float(values["1. open"]),
                    high=float(values["2. high"]),
                    low=float(values["3. low"]),
                    close=float(values["4. close"]),
                    volume=int(values["5. volume"]),
                    provider=config.provider,
                    timeframe=timeframe
                ))
            
            # Sort by timestamp and return recent data
            ohlc_data.sort(key=lambda x: x.timestamp)
            return ohlc_data[-limit:]
    
    async def _fetch_finnhub(
        self, 
        config: DataProviderConfig, 
        symbol: str, 
        timeframe: str, 
        limit: int
    ) -> list[OHLCData]:
        """Fetch from Finnhub"""
        
        # Finnhub requires different endpoints for different data
        resolution = self._convert_timeframe_finnhub(timeframe)
        end_time = int(datetime.now().timestamp())
        start_time = end_time - (limit * self._get_timeframe_seconds(timeframe))
        
        url = f"{config.base_url}/stock/candle"
        params = {
            "symbol": symbol,
            "resolution": resolution,
            "from": start_time,
            "to": end_time,
            "token": config.api_key
        }
        
        if not self.session:
            raise RuntimeError("OHLCAggregator session not initialized. Call initialize() first.")
        async with self.session.get(url, params=params) as response:
            if response.status != 200:
                raise Exception(f"HTTP {response.status}")
            
            data = await response.json()
            
            if data.get("s") != "ok":
                raise Exception("No data available")
            
            ohlc_data = []
            timestamps = data["t"]
            opens = data["o"]
            highs = data["h"]
            lows = data["l"]
            closes = data["c"]
            volumes = data["v"]
            
            for i in range(len(timestamps)):
                ohlc_data.append(OHLCData(
                    symbol=symbol,
                    timestamp=datetime.fromtimestamp(timestamps[i]),
                    open=float(opens[i]),
                    high=float(highs[i]),
                    low=float(lows[i]),
                    close=float(closes[i]),
                    volume=int(volumes[i]),
                    provider=config.provider,
                    timeframe=timeframe
                ))
            
            return ohlc_data
    
    async def _generate_mock_data(
        self, 
        symbol: str, 
        timeframe: str, 
        limit: int
    ) -> list[OHLCData]:
        """Generate mock OHLC data for testing"""
        
        import random
        
        base_price = 100.0
        data = []
        current_time = datetime.now()
        
        for i in range(limit):
            # Generate realistic OHLC data
            open_price = base_price + random.uniform(-2, 2)
            close_price = open_price + random.uniform(-3, 3)
            high_price = max(open_price, close_price) + random.uniform(0, 2)
            low_price = min(open_price, close_price) - random.uniform(0, 2)
            volume = random.randint(100000, 10000000)
            
            data.append(OHLCData(
                symbol=symbol,
                timestamp=current_time - timedelta(days=limit-i),
                open=round(open_price, 2),
                high=round(high_price, 2),
                low=round(low_price, 2),
                close=round(close_price, 2),
                volume=volume,
                provider=DataProvider.YAHOO_FINANCE,  # Mock as Yahoo
                timeframe=timeframe
            ))
            
            base_price = close_price  # Use previous close as next base
        
        return data
    
    def _convert_timeframe_yahoo(self, timeframe: str) -> str:
        """Convert timeframe to Yahoo Finance format"""
        mapping = {
            "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
            "1h": "1h", "1D": "1d", "1W": "1wk", "1M": "1mo"
        }
        return mapping.get(timeframe, "1d")
    
    def _convert_timeframe_av(self, timeframe: str) -> str:
        """Convert timeframe to Alpha Vantage format"""
        mapping = {
            "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "60min"
        }
        return mapping.get(timeframe, "1min")
    
    def _convert_timeframe_finnhub(self, timeframe: str) -> str:
        """Convert timeframe to Finnhub format"""
        mapping = {
            "1m": "1", "5m": "5", "15m": "15", "30m": "30",
            "1h": "60", "1D": "D", "1W": "W", "1M": "M"
        }
        return mapping.get(timeframe, "D")
    
    def _get_timeframe_seconds(self, timeframe: str) -> int:
        """Get timeframe in seconds for calculations"""
        mapping = {
            "1m": 60, "5m": 300, "15m": 900, "30m": 1800,
            "1h": 3600, "1D": 86400, "1W": 604800, "1M": 2592000
        }
        return mapping.get(timeframe, 86400)
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()

# Global instances
symbol_directory = SymbolDirectory()
ohlc_aggregator = OHLCAggregator()

async def startup_data_services():
    """Initialize data services on startup"""
    await ohlc_aggregator.initialize()

async def shutdown_data_services():
    """Cleanup data services on shutdown"""
    await ohlc_aggregator.cleanup()