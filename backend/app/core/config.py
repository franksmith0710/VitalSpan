from functools import lru_cache
from typing import Any, ClassVar, Literal

from cryptography.fernet import Fernet
from pydantic import computed_field, field_validator, model_validator
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
    credential_sm4_key: str
    cors_origins_raw: str = "http://localhost:5173"
    log_level: str = "INFO"
    query_default_limit: int = 1000
    query_timeout_seconds: int = 30
    analytics_database_url: str | None = None
    api_openapi_version: str = "0.1.0"
    push_wecom_webhook: str | None = None
    push_dingtalk_webhook: str | None = None
    vitalspan_dev_admin_password: str = "changeme"
    vitalspan_bootstrap_admin_username: str = "admin"
    vitalspan_bootstrap_admin_password: str | None = None
    vitalspan_bootstrap_allow_existing: bool = False
    auth_max_failed_logins: int = 5
    auth_lock_minutes: int = 15
    auth_temporary_password_length: int = 20
    rpt_smtp_host: str = "localhost"
    rpt_smtp_port: int = 1025
    rpt_smtp_user: str | None = None
    rpt_smtp_password: str | None = None
    rpt_smtp_from: str = "reports@vitalspan.local"
    vitalspan_data_dir: str = "./data"

    _DEV_SECRET_KEY: ClassVar[str] = "change-me-in-production"
    _DEV_FERNET_EXAMPLE: ClassVar[str] = "SN0VrKv3d9y1xCzRerwAlw0VdGvrNqWacCMhrYbq2YI="
    _DEV_SM4_EXAMPLE: ClassVar[str] = "0123456789abcdef0123456789abcdef"

    @field_validator("push_wecom_webhook", "push_dingtalk_webhook", mode="before")
    @classmethod
    def normalize_optional_webhook(cls, value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("vitalspan_bootstrap_admin_password", mode="before")
    @classmethod
    def normalize_bootstrap_password(cls, value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("auth_max_failed_logins")
    @classmethod
    def validate_auth_max_failed_logins(cls, value: int) -> int:
        if not 3 <= value <= 20:
            raise ValueError("AUTH_MAX_FAILED_LOGINS 须在 3..20 之间")
        return value

    @field_validator("auth_lock_minutes")
    @classmethod
    def validate_auth_lock_minutes(cls, value: int) -> int:
        if not 1 <= value <= 1440:
            raise ValueError("AUTH_LOCK_MINUTES 须在 1..1440 之间")
        return value

    @field_validator("auth_temporary_password_length")
    @classmethod
    def validate_auth_temporary_password_length(cls, value: int) -> int:
        if not 16 <= value <= 64:
            raise ValueError("AUTH_TEMPORARY_PASSWORD_LENGTH 须在 16..64 之间")
        return value

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

    @field_validator("database_url", mode="before")
    @classmethod
    def validate_database_url(cls, value: Any) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("DATABASE_URL 不能为空")
        stripped = value.strip()
        if not stripped.startswith(
            (
                "postgresql://",
                "postgresql+psycopg://",
                "mysql://",
                "mysql+pymysql://",
                "sqlite+",
            )
        ):
            raise ValueError(
                "平台元库 URL 须为 postgresql、mysql 或 sqlite 协议"
            )
        if stripped.startswith("mysql://"):
            return "mysql+pymysql://" + stripped[len("mysql://") :]
        return stripped

    @field_validator("credential_fernet_key")
    @classmethod
    def validate_credential_fernet_key(cls, value: str) -> str:
        try:
            Fernet(value.encode())
        except (TypeError, ValueError):
            raise ValueError("CREDENTIAL_FERNET_KEY 须为合法 Fernet 密钥") from None
        return value

    @field_validator("credential_sm4_key")
    @classmethod
    def validate_credential_sm4_key(cls, value: str) -> str:
        if not value:
            raise ValueError("CREDENTIAL_SM4_KEY 不能为空")
        try:
            key = bytes.fromhex(value)
        except ValueError as exc:
            raise ValueError("CREDENTIAL_SM4_KEY 须为 32 位十六进制（16 字节）") from exc
        if len(key) != 16:
            raise ValueError("CREDENTIAL_SM4_KEY 须为 32 位十六进制（16 字节）")
        return value.lower()

    @model_validator(mode="after")
    def enforce_production_safety(self) -> "Settings":
        if self.vitalspan_env != "production":
            return self
        if self.secret_key == self._DEV_SECRET_KEY:
            raise ValueError("生产环境 SECRET_KEY 不能使用示例占位值")
        if self.credential_fernet_key == self._DEV_FERNET_EXAMPLE:
            raise ValueError("生产环境 CREDENTIAL_FERNET_KEY 必须重新生成")
        if self.credential_sm4_key == self._DEV_SM4_EXAMPLE:
            raise ValueError("生产环境 CREDENTIAL_SM4_KEY 必须重新生成")
        if not self.rpt_smtp_host.strip():
            raise ValueError("生产环境 RPT_SMTP_HOST 不能为空")
        if not self.rpt_smtp_from.strip():
            raise ValueError("生产环境 RPT_SMTP_FROM 不能为空")
        return self

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
