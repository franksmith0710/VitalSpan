"""IM group-robot webhook POST (DingTalk / WeCom / Feishu)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import time
import urllib.parse
from typing import Any

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

_LABELS = {"wecom": "企业微信", "dingtalk": "钉钉", "feishu": "飞书"}
_TIMEOUT_SECONDS = 5.0
_MAX_ATTEMPTS = 3
_BACKOFF_SECONDS = (0.2, 0.5)


def dingtalk_signed_webhook_url(url: str, secret: str | None) -> str:
    token = (secret or "").strip()
    if not token:
        return url
    timestamp = str(round(time.time() * 1000))
    string_to_sign = f"{timestamp}\n{token}"
    digest = hmac.new(token.encode("utf-8"), string_to_sign.encode("utf-8"), hashlib.sha256).digest()
    sign = urllib.parse.quote_plus(base64.b64encode(digest))
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}timestamp={timestamp}&sign={sign}"


def _payload(channel: str, summary: str, artifact_ref: str) -> dict[str, Any]:
    text = f"{summary}\n引用：{artifact_ref}"
    if channel == "feishu":
        return {"msg_type": "text", "content": {"text": text}}
    return {"msgtype": "text", "text": {"content": text}}


def _vendor_error(channel: str, body: dict[str, Any]) -> str | None:
    if channel == "feishu":
        code = body.get("code", body.get("StatusCode"))
        if code in (0, None):
            return None
        return str(body.get("msg") or code)
    errcode = body.get("errcode")
    if errcode in (0, None):
        return None
    return str(body.get("errmsg") or errcode)


def _should_retry(exc: Exception | None, status_code: int | None) -> bool:
    if isinstance(exc, httpx.TimeoutException | httpx.TransportError):
        return True
    if status_code is not None and (status_code == 429 or status_code >= 500):
        return True
    return False


def _post_once(url: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    with httpx.Client(timeout=_TIMEOUT_SECONDS) as client:
        resp = client.post(url, json=payload)
        body = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            resp.raise_for_status()
        return resp.status_code, body if isinstance(body, dict) else {}


def post_group_webhook(
    channel: str,
    settings: Settings,
    *,
    summary: str,
    artifact_ref: str,
    webhook_url: str | None = None,
    webhook_secret: str | None = None,
    max_attempts: int = _MAX_ATTEMPTS,
) -> dict[str, Any]:
    url = webhook_url or {
        "wecom": settings.push_wecom_webhook,
        "dingtalk": settings.push_dingtalk_webhook,
        "feishu": settings.push_feishu_webhook,
    }.get(channel)
    label = _LABELS.get(channel, channel)
    if not url:
        return {
            "channel": f"{channel}_group",
            "status": "failed",
            "mode": "group_webhook",
            "error": f"{label}群 webhook 未配置",
        }
    if channel == "dingtalk":
        url = dingtalk_signed_webhook_url(
            url,
            webhook_secret or getattr(settings, "push_dingtalk_robot_secret", None),
        )
    payload = _payload(channel, summary, artifact_ref)
    last_error = f"{label}群 webhook 失败"
    attempts = max(1, max_attempts)
    for index in range(attempts):
        status_code: int | None = None
        try:
            status_code, body = _post_once(url, payload)
            vendor_error = _vendor_error(channel, body)
            if vendor_error:
                return {
                    "channel": f"{channel}_group",
                    "status": "failed",
                    "mode": "group_webhook",
                    "error": vendor_error,
                }
            return {"channel": f"{channel}_group", "status": "delivered", "mode": "group_webhook"}
        except Exception as exc:
            last_error = str(exc)
            retry = _should_retry(exc, status_code) and index + 1 < attempts
            logger.warning("%s group webhook failed: %s", label, exc)
            if retry:
                time.sleep(_BACKOFF_SECONDS[min(index, len(_BACKOFF_SECONDS) - 1)])
                continue
            break
    return {
        "channel": f"{channel}_group",
        "status": "failed",
        "mode": "group_webhook",
        "error": last_error,
    }
