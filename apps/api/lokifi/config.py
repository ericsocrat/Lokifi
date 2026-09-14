from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LOKIFI_", extra="ignore")
    database_url: str
    environment: Literal["local", "test", "production"] = "local"
    web_origin: str = "http://127.0.0.1:13100"
    session_hours: int = 24
    signup_enabled: bool = True
    public_signup_ready: bool = False
    proxy_secret: SecretStr | None = None
    turnstile_site_key: str | None = None
    turnstile_secret: SecretStr | None = None
    resend_api_key: SecretStr | None = None
    email_from: str | None = None
    support_email: str | None = None
    groq_api_key: SecretStr | None = None
    groq_free_confirmed: bool = False
    research_enabled: bool = False
    chat_daily_turns: int = 5
    chat_daily_tokens: int = 160_000
    chat_minute_tokens: int = 7_500
    database_pool_size: int = 2

    @field_validator("database_url")
    @classmethod
    def postgres_only(cls, value: str) -> str:
        if make_url(value).drivername != "postgresql+psycopg":
            raise ValueError("Use PostgreSQL with the psycopg driver")
        return value

    @model_validator(mode="after")
    def production(self):
        if self.environment == "production" and not self.web_origin.startswith("https://"):
            raise ValueError("Production requires HTTPS")
        if self.environment == "production" and self.signup_enabled:
            if not all(
                (
                    self.public_signup_ready,
                    self.proxy_secret,
                    self.turnstile_site_key,
                    self.turnstile_secret,
                    self.resend_api_key,
                    self.email_from,
                    self.support_email,
                )
            ):
                raise ValueError(
                    "Public signup requires verified email, bot protection, proxy and support configuration"
                )
        if not 1 <= self.session_hours <= 168:
            raise ValueError("Session duration must be between 1 and 168 hours")
        return self


@lru_cache
def settings() -> Settings:
    return Settings()
