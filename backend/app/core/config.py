from functools import lru_cache
from typing import Any, Literal

from cryptography.fernet import Fernet
from pydantic import computed_field, field_validator
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

    @field_validator("analytics_database_url", mode="before")
    @classmethod
    def normalize_analytics_database_url(cls, value: Any) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return value
        stripped = value.strip()
        if not stripped:
            return None
        if not stripped.startswith(("postgresql://", "postgresql+psycopg://")):
            raise ValueError("托管分析库 URL 须为 postgresql 或 postgresql+psycopg 协议")
        return stripped

    @field_validator("credential_fernet_key")
    @classmethod
    def validate_credential_fernet_key(cls, value: str) -> str:
        try:
            Fernet(value.encode())
        except (TypeError, ValueError):
            raise ValueError("CREDENTIAL_FERNET_KEY 须为合法 Fernet 密钥") from None
        return value

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
