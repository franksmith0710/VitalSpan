"""Resolve IM OAuth redirect/callback URLs (user_delegated uses platform API origin)."""

from __future__ import annotations

from app.auth.im_oauth.oauth import ImOAuthError
from app.core.config import Settings, get_settings
from app.core.platform_config.im_credentials import ImCredentials, normalize_im_channel


def resolve_api_public_base(settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    base = (cfg.api_public_base_url or "http://127.0.0.1:8000").strip().rstrip("/")
    if not base:
        raise ImOAuthError(
            "IM_PUBLIC_API_URL_MISSING",
            "未配置 API 公网地址，无法完成 IM 扫码绑定",
            422,
        )
    return base


def resolve_im_oauth_callback_url(
    channel: str,
    creds: ImCredentials,
    *,
    settings: Settings | None = None,
) -> str:
    normalized = normalize_im_channel(channel)
    if creds.delivery_mode == "user_delegated":
        base = resolve_api_public_base(settings)
        return f"{base}/api/v1/auth/im/{normalized}/callback"
    domain = (creds.callback_domain or "").strip().rstrip("/")
    if not domain:
        raise ImOAuthError("IM_CALLBACK_DOMAIN_MISSING", "平台对接未配置回调域名", 422)
    if domain.startswith("http://") or domain.startswith("https://"):
        api_base = domain.rstrip("/")
    else:
        api_base = f"https://{domain}"
    return f"{api_base}/api/v1/auth/im/{normalized}/callback"
