from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health, ohlc, news, social, portfolio, alerts, chat, mock_ohlc, market_data
from app.services.data_service import startup_data_services, shutdown_data_services

app = FastAPI(title=settings.PROJECT_NAME)

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    await startup_data_services()

@app.on_event("shutdown") 
async def shutdown_event():
    await shutdown_data_services()

import os
_frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(market_data.router)  # New market data API
app.include_router(mock_ohlc.router, prefix=settings.API_PREFIX)  # Mock data for testing
app.include_router(ohlc.router, prefix=settings.API_PREFIX)
app.include_router(news.router, prefix=settings.API_PREFIX)
app.include_router(social.router, prefix=settings.API_PREFIX)
app.include_router(portfolio.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)


@__import__('fastapi').FastAPI.get if False else app.get('/api/health')
def health_status():
    return {'ok': True}

# Quick mock endpoint for testing
@app.get('/api/mock/ohlc')
def mock_ohlc_endpoint(symbol: str = "BTCUSD", timeframe: str = "1h", limit: int = 100):
    import random
    import time
    
    candles = []
    base_price = 50000 if "BTC" in symbol else 100
    current_time = int(time.time()) - (limit * 3600)
    current_price = base_price
    
    for i in range(limit):
        change = random.uniform(-0.02, 0.02)
        open_price = current_price
        close_price = open_price * (1 + change)
        high_price = max(open_price, close_price) * random.uniform(1.001, 1.01)
        low_price = min(open_price, close_price) * random.uniform(0.99, 0.999)
        volume = random.uniform(100, 1000)
        
        candles.append({
            "ts": (current_time + i * 3600) * 1000,
            "o": round(open_price, 2),
            "h": round(high_price, 2),
            "l": round(low_price, 2),
            "c": round(close_price, 2),
            "v": round(volume, 2)
        })
        
        current_price = close_price
    
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "candles": candles
    }
