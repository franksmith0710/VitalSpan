from functools import lru_cache
from typing import Literal

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    vitalspan_env: Literal["development", "staging", "production"] = "development"
    database_url: str
    secret_key: str
    credential_fernet_key: str
    cors_origins_raw: str = "http://localhost:5173"
    log_level: str = "INFO"
    query_default_limit: int = 1000
    query_timeout_seconds: int = 30
    analytics_database_url: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
