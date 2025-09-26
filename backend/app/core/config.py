from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # Auth / JWT
    fynix_jwt_secret: str = Field("dev-secret", env="FYNIX_JWT_SECRET")
    fynix_jwt_ttl_min: int = Field(1440, env="FYNIX_JWT_TTL_MIN")

    # Frontend origin for CORS
    frontend_origin: str = Field("http://localhost:3000", env="FRONTEND_ORIGIN")

    # OpenAI / LLM integration
    openai_api_key: str | None = Field(default=None, env="OPENAI_API_KEY")
    openai_base: str = Field("https://api.openai.com/v1", env="OPENAI_BASE")
    openai_model: str = Field("gpt-4o-mini", env="OPENAI_MODEL")

    class Config:
        env_file = ".env"
        extra = "ignore"  # ignore harmless extra env vars

settings = Settings()
