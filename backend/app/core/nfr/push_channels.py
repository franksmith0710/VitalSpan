from __future__ import annotations

import os
from dataclasses import dataclass

from app.core.config import Settings, get_settings
from app.core.nfr.errors import PUSH_CHANNEL_ALL_FAILED, PUSH_CHANNEL_DEGRADED
from app.core.nfr.push_config import resolve_push_mode

probe_push_dispatch_budget_ms: int = 100
PUSH_CHANNEL_ORDER: tuple[str, ...] = ("browser", "wecom", "dingtalk")

_PUSH_MOCK_LOG: list[dict] = []


@dataclass(frozen=True)
class PushDispatchResult:
    status: str  # delivered|degraded|failed
    channel: str | None
    attempted_channels: tuple[str, ...]
    degraded_reason: str | None
    code: str | None


def clear_push_mock_log() -> None:
    _PUSH_MOCK_LOG.clear()


def _mock_send(channel: str, payload: dict, settings: Settings) -> bool:
    force_fail = os.environ.get("PUSH_MOCK_FORCE_FAIL")
    if channel == "browser":
        if not settings.push_browser_enabled:
            return False
        if force_fail in ("browser", "wecom"):
            return False
        _PUSH_MOCK_LOG.append({"channel": channel, "payload": payload})
        return True
    if channel == "wecom":
        if not settings.push_wecom_webhook:
            return False
        if force_fail == "wecom":
            return False
        _PUSH_MOCK_LOG.append({"channel": channel, "payload": payload})
        return True
    if channel == "dingtalk":
        if not settings.push_dingtalk_webhook:
            return False
        if force_fail == "dingtalk":
            return False
        _PUSH_MOCK_LOG.append({"channel": channel, "payload": payload})
        return True
    return False


def dispatch_push_mock(payload: dict, settings: Settings | None = None) -> PushDispatchResult:
    settings = settings or get_settings()
    mode = resolve_push_mode(settings)
    if mode.delivery_mode == "disabled":
        return PushDispatchResult("failed", None, (), "push channels not configured", PUSH_CHANNEL_ALL_FAILED)
    attempted: list[str] = []
    for channel in PUSH_CHANNEL_ORDER:
        attempted.append(channel)
        if _mock_send(channel, payload, settings):
            return PushDispatchResult("delivered", channel, tuple(attempted), None, None)
    if mode.delivery_mode in ("degraded", "active"):
        return PushDispatchResult(
            "degraded",
            None,
            tuple(attempted),
            f"all channels failed: {','.join(attempted)}",
            PUSH_CHANNEL_DEGRADED,
        )
    return PushDispatchResult("failed", None, tuple(attempted), "all channels failed", PUSH_CHANNEL_ALL_FAILED)
