from pydantic_settings import BaseSettings
from pydantic import Field
from pydantic_settings import SettingsConfigDict

class Settings(BaseSettings):
    # Application settings
    PROJECT_NAME: str = Field(default="Fynix", alias="PROJECT_NAME")
    API_PREFIX: str = Field(default="/api", alias="API_PREFIX")
    
    # Auth / JWT
    fynix_jwt_secret: str = Field(default="dev-secret", alias="FYNIX_JWT_SECRET")
    fynix_jwt_ttl_min: int = Field(default=1440, alias="FYNIX_JWT_TTL_MIN")

    # Frontend origin and CORS settings
    frontend_origin: str = Field(default="http://localhost:3000", alias="FRONTEND_ORIGIN")
    CORS_ORIGINS: list[str] = Field(default=["http://localhost:3000"], alias="CORS_ORIGINS")

    # Redis (for caching, pub/sub, etc.)
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # OpenAI / LLM integration
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_base: str = Field(default="https://api.openai.com/v1", alias="OPENAI_BASE")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")

    # External API keys (optional)
    POLYGON_KEY: str | None = Field(default=None, alias="POLYGON_KEY")
    ALPHAVANTAGE_KEY: str | None = Field(default=None, alias="ALPHAVANTAGE_KEY")
    FINNHUB_KEY: str | None = Field(default=None, alias="FINNHUB_KEY")
    COINGECKO_KEY: str | None = Field(default=None, alias="COINGECKO_KEY")
    CMC_KEY: str | None = Field(default=None, alias="CMC_KEY")
    NEWSAPI_KEY: str | None = Field(default=None, alias="NEWSAPI_KEY")
    MARKETAUX_KEY: str | None = Field(default=None, alias="MARKETAUX_KEY")
    FMP_KEY: str | None = Field(default=None, alias="FMP_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"  # allow harmless extra vars
    )

settings = Settings()
