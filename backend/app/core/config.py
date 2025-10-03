from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application settings
    PROJECT_NAME: str = Field(default="Lokifi", alias="PROJECT_NAME")
    API_PREFIX: str = Field(default="/api", alias="API_PREFIX")

    # Auth / JWT - Must be set via environment variable
    fynix_jwt_secret: str | None = Field(default=None, alias="FYNIX_JWT_SECRET")
    fynix_jwt_ttl_min: int = Field(default=1440, alias="FYNIX_JWT_TTL_MIN")

    # Phase J: Database Configuration
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://lokifi:lokifi2025@localhost:5432/lokifi", alias="DATABASE_URL"
    )

    # Production Database Settings
    DATABASE_REPLICA_URL: str | None = Field(default=None, alias="DATABASE_REPLICA_URL")
    DATABASE_POOL_SIZE: int = Field(default=5, alias="DATABASE_POOL_SIZE")
    DATABASE_MAX_OVERFLOW: int = Field(default=10, alias="DATABASE_MAX_OVERFLOW")
    DATABASE_POOL_TIMEOUT: int = Field(default=30, alias="DATABASE_POOL_TIMEOUT")
    DATABASE_POOL_RECYCLE: int = Field(default=3600, alias="DATABASE_POOL_RECYCLE")

    # Storage and Archival Settings
    ENABLE_DATA_ARCHIVAL: bool = Field(default=False, alias="ENABLE_DATA_ARCHIVAL")
    ARCHIVE_THRESHOLD_DAYS: int = Field(default=365, alias="ARCHIVE_THRESHOLD_DAYS")
    DELETE_THRESHOLD_DAYS: int = Field(
        default=2555, alias="DELETE_THRESHOLD_DAYS"
    )  # 7 years

    # Cloud Storage Settings (Optional)
    AWS_S3_BUCKET: str | None = Field(default=None, alias="AWS_S3_BUCKET")
    AWS_CLOUDFRONT_URL: str | None = Field(default=None, alias="AWS_CLOUDFRONT_URL")
    AWS_ACCESS_KEY_ID: str | None = Field(default=None, alias="AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: str | None = Field(
        default=None, alias="AWS_SECRET_ACCESS_KEY"
    )

    # Phase J: Authentication - Must be set via environment variable
    JWT_SECRET_KEY: str | None = Field(default=None, alias="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = Field(default=30, alias="JWT_EXPIRE_MINUTES")

    # Phase J: OAuth
    GOOGLE_CLIENT_ID: str | None = Field(default=None, alias="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str | None = Field(default=None, alias="GOOGLE_CLIENT_SECRET")

    # Phase J: Email
    SMTP_HOST: str = Field(default="localhost", alias="SMTP_HOST")
    SMTP_PORT: int = Field(default=1025, alias="SMTP_PORT")
    SMTP_USERNAME: str = Field(default="", alias="SMTP_USERNAME")
    SMTP_PASSWORD: str = Field(default="", alias="SMTP_PASSWORD")
    SMTP_TLS: bool = Field(default=False, alias="SMTP_TLS")
    FROM_EMAIL: str = Field(default="noreply@lokifi.com", alias="FROM_EMAIL")

    # Phase J: AI Providers
    OPENROUTER_API_KEY: str | None = Field(default=None, alias="OPENROUTER_API_KEY")
    HUGGING_FACE_API_KEY: str | None = Field(default=None, alias="HUGGING_FACE_API_KEY")
    OLLAMA_BASE_URL: str = Field(
        default="http://localhost:11434", alias="OLLAMA_BASE_URL"
    )

    # Frontend origin and CORS settings
    frontend_origin: str = Field(
        default="http://localhost:3000", alias="FRONTEND_ORIGIN"
    )
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000"], alias="CORS_ORIGINS"
    )

    # Redis (for caching, pub/sub, etc.)
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    redis_host: str = Field(default="localhost", alias="REDIS_HOST")
    redis_port: int = Field(default=6379, alias="REDIS_PORT")
    redis_password: str | None = Field(default=None, alias="REDIS_PASSWORD")
    redis_sentinel_hosts: list[str] = Field(default=[], alias="REDIS_SENTINEL_HOSTS")
    redis_sentinel_service: str = Field(
        default="mymaster", alias="REDIS_SENTINEL_SERVICE"
    )

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
        env_file=".env", extra="ignore"  # allow harmless extra vars
    )

    def validate_required_secrets(self) -> None:
        """Validate that required secrets are set"""
        missing = []
        if not self.fynix_jwt_secret:
            missing.append("FYNIX_JWT_SECRET")
        if not self.JWT_SECRET_KEY:
            missing.append("JWT_SECRET_KEY")

        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}"
            )

    def get_jwt_secret(self) -> str:
        """Get JWT secret with fallback validation"""
        if self.fynix_jwt_secret:
            return self.fynix_jwt_secret
        if self.JWT_SECRET_KEY:
            return self.JWT_SECRET_KEY
        raise ValueError(
            "No JWT secret configured. Set FYNIX_JWT_SECRET or JWT_SECRET_KEY environment variable."
        )


settings = Settings()


def get_settings() -> Settings:
    """Get the settings instance"""
    return settings
