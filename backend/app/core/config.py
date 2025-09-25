from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # LLM endpoints
    LMSTUDIO_HOST: str | None = None  # e.g., http://host.docker.internal:1234
    OPENAI_BASE_URL: str | None = None

    API_PREFIX: str = "/api"
    PROJECT_NAME: str = "Fynix API"
    DATABASE_URL: str = "postgresql+psycopg://fynix:fynix@db:5432/fynix"
    REDIS_URL: str = "redis://redis:6379/0"
    JWT_PUBLIC_KEY: str = ""
    JWT_ALGS: str = "RS256"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    POLYGON_KEY: Optional[str] = None
    ALPHAVANTAGE_KEY: Optional[str] = None
    FINNHUB_KEY: Optional[str] = None
    COINGECKO_KEY: Optional[str] = None
    CMC_KEY: Optional[str] = None
    NEWSAPI_KEY: Optional[str] = None
    MARKETAUX_KEY: Optional[str] = None
    FMP_KEY: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
