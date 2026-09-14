from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LOKIFI_", extra="ignore")
    database_url: str
    environment: Literal["local", "test", "production"] = "local"
    web_origin: str = "http://127.0.0.1:13100"
    session_hours: int = 24

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
        if not 1 <= self.session_hours <= 168:
            raise ValueError("Session duration must be between 1 and 168 hours")
        return self


@lru_cache
def settings() -> Settings:
    return Settings()
