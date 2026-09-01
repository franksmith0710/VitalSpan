from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import quote

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.im_models import IM_CHANNELS, ImOAuthState
from app.core.platform_config.im_credentials import ImCredentials, normalize_im_channel
from app.core.platform_config.im_resolve import resolve_im_credentials

_STATE_TTL = timedelta(minutes=10)
_TIMEOUT = 8.0


class ImOAuthError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def _callback_url(creds: ImCredentials, channel: str) -> str:
    from app.auth.im_oauth.callback_uri import resolve_im_oauth_callback_url

    return resolve_im_oauth_callback_url(channel, creds)


def create_state(
    session: Session,
    *,
    user_id: uuid.UUID,
    channel: str,
    redirect_after: str | None = None,
) -> str:
    normalized = normalize_im_channel(channel)
    token = secrets.token_urlsafe(32)
    session.add(
        ImOAuthState(
            state=token,
            user_id=user_id,
            channel=normalized,
            redirect_after=redirect_after,
            expires_at=datetime.now(UTC) + _STATE_TTL,
        )
    )
    session.flush()
    return token


def _as_utc_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def consume_state(session: Session, state: str, channel: str) -> ImOAuthState:
    normalized = normalize_im_channel(channel)
    row = session.get(ImOAuthState, state)
    if row is None or row.channel != normalized:
        raise ImOAuthError("IM_OAUTH_STATE_INVALID", "授权状态无效或已过期", 400)
    if _as_utc_aware(row.expires_at) < datetime.now(UTC):
        session.delete(row)
        session.flush()
        raise ImOAuthError("IM_OAUTH_STATE_EXPIRED", "授权已过期，请重新绑定", 400)
    session.delete(row)
    session.flush()
    return row


def purge_expired_states(session: Session) -> None:
    session.execute(delete(ImOAuthState).where(ImOAuthState.expires_at < datetime.now(UTC)))


def build_authorize_url(creds: ImCredentials, *, state: str) -> str:
    channel = creds.channel
    redirect_uri = quote(_callback_url(creds, channel), safe="")
    state_q = quote(state, safe="")
    if channel == "dingtalk":
        app_key = creds.app_key or ""
        return (
            "https://login.dingtalk.com/oauth2/auth?"
            f"redirect_uri={redirect_uri}&response_type=code&client_id={app_key}"
            f"&scope=openid&state={state_q}&prompt=consent"
        )
    app_id = creds.app_id or ""
    return (
        "https://accounts.feishu.cn/open-apis/authen/v1/authorize?"
        f"app_id={app_id}&redirect_uri={redirect_uri}&state={state_q}"
    )


def _dingtalk_oauth_tokens(creds: ImCredentials, code: str) -> tuple[str, str, str | None, int]:
    with httpx.Client(timeout=_TIMEOUT) as client:
        token_resp = client.post(
            "https://api.dingtalk.com/v1.0/oauth2/userAccessToken",
            json={
                "clientId": creds.app_key,
                "clientSecret": creds.app_secret,
                "code": code,
                "grantType": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        token_body = token_resp.json()
        access_token = token_body.get("accessToken")
        if not access_token:
            raise ImOAuthError(
                "IM_OAUTH_TOKEN_FAILED",
                token_body.get("message") or "钉钉换取用户令牌失败",
                422,
            )
        refresh_token = token_body.get("refreshToken")
        expires_in = int(token_body.get("expireIn") or token_body.get("expiresIn") or 7200)
        user_resp = client.get(
            "https://api.dingtalk.com/v1.0/contact/users/me",
            headers={"x-acs-dingtalk-access-token": access_token},
        )
        user_resp.raise_for_status()
        user_body = user_resp.json()
        userid = user_body.get("unionId") or user_body.get("userid") or user_body.get("openId")
        if not userid:
            raise ImOAuthError("IM_OAUTH_USER_MISSING", "钉钉未返回成员账号", 422)
        return str(userid), str(access_token), (str(refresh_token) if refresh_token else None), expires_in


def _dingtalk_userid(creds: ImCredentials, code: str) -> str:
    userid, _, _, _ = _dingtalk_oauth_tokens(creds, code)
    return userid


def _feishu_userid(creds: ImCredentials, code: str) -> str:
    redirect_uri = _callback_url(creds, "feishu")
    with httpx.Client(timeout=_TIMEOUT) as client:
        token_resp = client.post(
            "https://open.feishu.cn/open-apis/authen/v1/oidc/access_token",
            json={
                "grant_type": "authorization_code",
                "code": code,
                "app_id": creds.app_id,
                "app_secret": creds.app_secret,
                "redirect_uri": redirect_uri,
            },
        )
        token_resp.raise_for_status()
        token_body = token_resp.json()
        if token_body.get("code") != 0:
            raise ImOAuthError(
                "IM_OAUTH_TOKEN_FAILED",
                token_body.get("msg") or "飞书换取用户令牌失败",
                422,
            )
        access_token = (token_body.get("data") or {}).get("access_token")
        if not access_token:
            raise ImOAuthError("IM_OAUTH_TOKEN_FAILED", "飞书 access_token 为空", 422)
        user_resp = client.get(
            "https://open.feishu.cn/open-apis/authen/v1/user_info",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_resp.raise_for_status()
        user_body = user_resp.json()
        if user_body.get("code") != 0:
            raise ImOAuthError(
                "IM_OAUTH_USER_FAILED",
                user_body.get("msg") or "飞书获取用户失败",
                422,
            )
        data = user_body.get("data") or {}
        userid = data.get("user_id") or data.get("open_id")
        if not userid:
            raise ImOAuthError("IM_OAUTH_USER_MISSING", "飞书未返回 user_id", 422)
        return str(userid)


def exchange_dingtalk_auth_code(creds: ImCredentials, code: str) -> tuple[str, str, str | None, int]:
    return _dingtalk_oauth_tokens(creds, code)


def exchange_code_for_account(session: Session, channel: str, code: str) -> str:
    normalized = normalize_im_channel(channel)
    creds = resolve_im_credentials(session, channel=normalized)
    if not creds.is_configured:
        raise ImOAuthError("IM_APP_NOT_CONFIGURED", "应用未配置，请联系管理员完成平台对接", 422)
    if normalized == "dingtalk":
        return _dingtalk_userid(creds, code)
    if normalized == "feishu":
        return _feishu_userid(creds, code)
    raise ImOAuthError("IM_CHANNEL_UNKNOWN", "未知 IM 通道", 400)
