from pydantic_settings import BaseSettings
from pydantic import Field
from pydantic_settings import SettingsConfigDict

class Settings(BaseSettings):
    # Auth / JWT
    fynix_jwt_secret: str = Field("dev-secret", alias="FYNIX_JWT_SECRET")
    fynix_jwt_ttl_min: int = Field(1440, alias="FYNIX_JWT_TTL_MIN")

    # Frontend origin for CORS
    frontend_origin: str = Field("http://localhost:3000", alias="FRONTEND_ORIGIN")

    # Redis (for caching, pub/sub, etc.)
    redis_url: str = Field("redis://localhost:6379/0", alias="REDIS_URL")

    # OpenAI / LLM integration
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_base: str = Field("https://api.openai.com/v1", alias="OPENAI_BASE")
    openai_model: str = Field("gpt-4o-mini", alias="OPENAI_MODEL")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"  # allow harmless extra vars
    )

settings = Settings()
