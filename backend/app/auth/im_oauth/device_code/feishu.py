"""Feishu OAuth 2.0 device authorization (RFC 8628)."""

from __future__ import annotations

import base64
from dataclasses import dataclass

import httpx

from app.reports.scheduler.channels.im_sdk.feishu_common import normalize_feishu_push_scopes

_DEVICE_AUTH_URL = "https://accounts.feishu.cn/oauth/v1/device_authorization"
_TOKEN_URL = "https://open.feishu.cn/open-apis/authen/v2/oauth/token"
_USER_INFO_URL = "https://open.feishu.cn/open-apis/authen/v1/user_info"
_DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code"
_TIMEOUT = 8.0
_PENDING_ERRORS = frozenset({"authorization_pending", "slow_down"})
_PENDING_FEISHU_CODES = frozenset({20094})


def _is_device_auth_pending(data: dict) -> bool:
    error = str(data.get("error") or "").lower()
    if error in _PENDING_ERRORS:
        return True
    code = data.get("code")
    if code in _PENDING_FEISHU_CODES:
        return True
    msg = str(data.get("msg") or data.get("error_description") or "").lower()
    return "authorization_pending" in msg or "slow_down" in msg


@dataclass(frozen=True)
class DeviceAuthStart:
    device_code: str
    user_code: str
    verification_uri: str
    verification_uri_complete: str
    expires_in: int
    interval: int


@dataclass(frozen=True)
class DeviceAuthPending:
    interval: int


@dataclass(frozen=True)
class DeviceAuthTokens:
    access_token: str
    refresh_token: str | None
    expires_in: int
    user_id: str


class FeishuDeviceAuthError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def _basic_auth(app_id: str, app_secret: str) -> str:
    raw = f"{app_id}:{app_secret}".encode()
    return "Basic " + base64.b64encode(raw).decode()


def start_feishu_device_auth(*, app_id: str, app_secret: str, scope: str | None = None) -> DeviceAuthStart:
    scope_value = normalize_feishu_push_scopes(scope)
    body = {"client_id": app_id, "scope": scope_value}
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            _DEVICE_AUTH_URL,
            data=body,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": _basic_auth(app_id, app_secret),
            },
        )
        data = resp.json()
    if resp.status_code >= 400 or data.get("error"):
        raise FeishuDeviceAuthError(
            "IM_DEVICE_AUTH_START_FAILED",
            str(data.get("error_description") or data.get("error") or "飞书 device 授权启动失败"),
            422,
        )
    verification_uri = str(data.get("verification_uri") or "")
    verification_complete = str(data.get("verification_uri_complete") or verification_uri)
    return DeviceAuthStart(
        device_code=str(data.get("device_code") or ""),
        user_code=str(data.get("user_code") or ""),
        verification_uri=verification_uri,
        verification_uri_complete=verification_complete,
        expires_in=int(data.get("expires_in") or 240),
        interval=int(data.get("interval") or 5),
    )


def poll_feishu_device_token(
    *,
    app_id: str,
    app_secret: str,
    device_code: str,
) -> DeviceAuthTokens | DeviceAuthPending:
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            _TOKEN_URL,
            data={
                "grant_type": _DEVICE_GRANT,
                "client_id": app_id,
                "client_secret": app_secret,
                "device_code": device_code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        try:
            data = resp.json()
        except ValueError as exc:
            raise FeishuDeviceAuthError(
                "IM_DEVICE_AUTH_POLL_FAILED",
                "飞书 device 授权响应无法解析",
                422,
            ) from exc
    if not isinstance(data, dict):
        raise FeishuDeviceAuthError(
            "IM_DEVICE_AUTH_POLL_FAILED",
            "飞书 device 授权响应格式无效",
            422,
        )
    access_token = data.get("access_token")
    if data.get("code") == 0 or access_token:
        token = str(access_token or "")
        if not token:
            raise FeishuDeviceAuthError("IM_DEVICE_AUTH_TOKEN_EMPTY", "飞书未返回 access_token", 422)
        user_id = _fetch_user_id(client_token=token)
        return DeviceAuthTokens(
            access_token=token,
            refresh_token=(str(data["refresh_token"]) if data.get("refresh_token") else None),
            expires_in=int(data.get("expires_in") or 7200),
            user_id=user_id,
        )
    error = str(data.get("error") or "")
    if _is_device_auth_pending(data):
        interval = int(data.get("interval") or 5)
        return DeviceAuthPending(interval=interval)
    if error in {"access_denied", "expired_token"}:
        raise FeishuDeviceAuthError(
            "IM_DEVICE_AUTH_DENIED",
            str(data.get("error_description") or "用户拒绝授权或授权已过期"),
            400,
        )
    raise FeishuDeviceAuthError(
        "IM_DEVICE_AUTH_POLL_FAILED",
        str(data.get("error_description") or data.get("msg") or error or "飞书 device 授权轮询失败"),
        422,
    )


def _fetch_user_id(*, client_token: str) -> str:
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.get(
            _USER_INFO_URL,
            headers={"Authorization": f"Bearer {client_token}"},
        )
        body = resp.json()
    if body.get("code") != 0:
        raise FeishuDeviceAuthError(
            "IM_DEVICE_AUTH_USER_FAILED",
            body.get("msg") or "飞书获取用户信息失败",
            422,
        )
    data = body.get("data") or {}
    user_id = data.get("user_id") or data.get("open_id")
    if not user_id:
        raise FeishuDeviceAuthError("IM_DEVICE_AUTH_USER_MISSING", "飞书未返回 user_id", 422)
    return str(user_id)
