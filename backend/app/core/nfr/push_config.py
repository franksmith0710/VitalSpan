from __future__ import annotations

from dataclasses import dataclass

from app.core.config import Settings, get_settings
from app.core.nfr.errors import PUSH_CONFIG_INVALID


class PushConfigValidationError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


@dataclass(frozen=True)
class PushConfigOut:
    browser_enabled: bool
    wecom_configured: bool
    dingtalk_configured: bool
    delivery_mode: str  # disabled|degraded|active
    degraded_reason: str | None


def _is_valid_webhook(url: str | None) -> bool:
    return bool(url and url.startswith("https://"))


def validate_push_settings(settings: Settings) -> None:
    for label, url in (
        ("wecom", settings.push_wecom_webhook),
        ("dingtalk", settings.push_dingtalk_webhook),
    ):
        if url and not url.startswith("https://"):
            raise PushConfigValidationError(
                PUSH_CONFIG_INVALID,
                f"{label} webhook must use https",
            )


def resolve_push_mode(settings: Settings | None = None) -> PushConfigOut:
    settings = settings or get_settings()
    validate_push_settings(settings)
    wecom_ok = _is_valid_webhook(settings.push_wecom_webhook)
    ding_ok = _is_valid_webhook(settings.push_dingtalk_webhook)
    browser = settings.push_browser_enabled
    if not browser and not wecom_ok and not ding_ok:
        return PushConfigOut(False, False, False, "disabled", "push channels not configured")
    if browser and (wecom_ok or ding_ok):
        return PushConfigOut(browser, wecom_ok, ding_ok, "active", None)
    return PushConfigOut(browser, wecom_ok, ding_ok, "degraded", "partial push channel configuration")


def summarize_channel_probe(payload: dict | None = None) -> str:
    from app.core.nfr.push_channels import dispatch_push_mock

    result = dispatch_push_mock(payload or {"text": "probe"})
    return f"{result.status}:{result.channel or 'none'}"
