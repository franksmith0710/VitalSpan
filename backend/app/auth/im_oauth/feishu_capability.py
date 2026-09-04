"""Post-bind capability checks for Feishu user_delegated delivery."""

from __future__ import annotations

import re
from dataclasses import dataclass

import httpx

from app.reports.scheduler.channels.im_sdk.feishu_common import (
    FEISHU_PUSH_SCOPES,
    normalize_feishu_push_scopes,
)
from app.reports.scheduler.channels.im_sdk.feishu_files_http import (
    send_feishu_file_http,
    send_feishu_text_http,
    upload_feishu_file_http,
)

_USER_INFO_URL = "https://open.feishu.cn/open-apis/authen/v1/user_info"
_TIMEOUT = 8.0
_SCOPE_RE = re.compile(r"privileges?:\s*\[([^\]]+)\]", re.I)
_MIN_PROBE_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R"
    b"/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
    b"4 0 obj<</Length 58>>stream\n"
    b"BT /F1 12 Tf 20 80 Td (VitalSpan connectivity probe) Tj ET\n"
    b"endstream\nendobj\n"
    b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"xref\n0 6\n"
    b"0000000000 65535 f \n"
    b"0000000009 00000 n \n"
    b"0000000052 00000 n \n"
    b"0000000101 00000 n \n"
    b"0000000211 00000 n \n"
    b"0000000315 00000 n \n"
    b"trailer<</Size 6/Root 1 0 R>>\n"
    b"startxref\n376\n%%EOF"
)
_PROBE_TEXT = "VitalSpan 连通性探测（可忽略）。若收到 PDF 附件，仅用于权限自检，可放心删除。"


@dataclass(frozen=True)
class FeishuCapabilityProbe:
    ready: bool
    message: str
    missing_scopes: tuple[str, ...] = ()
    needs_admin: bool = False
    suggested_scope: str | None = None
    admin_portal_url: str | None = None


def feishu_app_admin_portal_url(app_id: str) -> str:
    return f"https://open.feishu.cn/app/{app_id.strip()}/auth"


def _full_scope_suggestion(*, extra: str | None = None) -> str:
    return normalize_feishu_push_scopes(extra)


def _extract_missing_scopes(text: str) -> tuple[str, ...]:
    match = _SCOPE_RE.search(text)
    if not match:
        return ()
    raw = match.group(1)
    return tuple(part.strip().strip("'\"") for part in raw.split(",") if part.strip())


def _admin_employee_id_missing(message: str) -> bool:
    lower = message.lower()
    return "employee_id" in lower or "contact:user.employee_id" in lower


def _reauth_probe(
    *,
    message: str,
    missing: tuple[str, ...] = (),
    extra_scope_hint: str | None = None,
) -> FeishuCapabilityProbe:
    return FeishuCapabilityProbe(
        ready=False,
        message=message,
        missing_scopes=missing,
        suggested_scope=_full_scope_suggestion(extra=extra_scope_hint),
    )


def _resolve_probe_target(account_id: str, user_id: str | None, open_id: str | None) -> str | None:
    if account_id:
        return account_id
    if user_id:
        return str(user_id)
    if open_id:
        return str(open_id)
    return None


def probe_feishu_user_delivery(
    *,
    access_token: str,
    account_id: str,
    app_id: str | None = None,
) -> FeishuCapabilityProbe:
    """Deep probe: user_info → 发自测文字 → 上传 PDF → 发文件消息。"""
    with httpx.Client(timeout=_TIMEOUT) as client:
        info_resp = client.get(
            _USER_INFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        info_body = info_resp.json()
    if info_body.get("code") != 0:
        msg = str(info_body.get("msg") or "飞书获取用户信息失败")
        missing = _extract_missing_scopes(msg)
        if _admin_employee_id_missing(msg):
            return FeishuCapabilityProbe(
                ready=False,
                message="飞书应用未开通读取用户身份权限，需管理员在开放平台审批后您再重新绑定。",
                missing_scopes=missing,
                needs_admin=True,
                admin_portal_url=feishu_app_admin_portal_url(app_id or ""),
            )
        return _reauth_probe(
            message="飞书身份读取失败，将为您打开完整授权页（消息 + 文件）。",
            missing=missing,
            extra_scope_hint=" ".join(missing) if missing else None,
        )

    data = info_body.get("data") or {}
    user_id = data.get("user_id")
    open_id = data.get("open_id")
    target_id = _resolve_probe_target(account_id, user_id, open_id)
    if not target_id:
        return _reauth_probe(message="飞书未返回可用账号标识，请重新完成授权。")

    try:
        send_feishu_text_http(access_token=access_token, account_id=target_id, text=_PROBE_TEXT)
    except Exception as exc:
        msg = str(exc)
        missing = _extract_missing_scopes(msg)
        if _admin_employee_id_missing(msg):
            return FeishuCapabilityProbe(
                ready=False,
                message="飞书应用缺少发消息或通讯录权限，需管理员在开放平台开通并发布后，您再补充授权。",
                missing_scopes=missing,
                needs_admin=True,
                admin_portal_url=feishu_app_admin_portal_url(app_id or ""),
            )
        return _reauth_probe(
            message="飞书发消息权限未就绪，将为您打开完整授权页（消息 + 文件）。",
            missing=missing,
            extra_scope_hint=" ".join(missing) if missing else None,
        )

    try:
        file_key = upload_feishu_file_http(
            access_token=access_token,
            filename="vitalspan-probe.pdf",
            mime="application/pdf",
            data=_MIN_PROBE_PDF,
        )
    except Exception as exc:
        msg = str(exc)
        missing = _extract_missing_scopes(msg)
        if _admin_employee_id_missing(msg):
            return FeishuCapabilityProbe(
                ready=False,
                message="飞书应用缺少文件或通讯录权限，需管理员在开放平台开通并发布后，您再补充授权。",
                missing_scopes=missing,
                needs_admin=True,
                admin_portal_url=feishu_app_admin_portal_url(app_id or ""),
            )
        return _reauth_probe(
            message="飞书文件上传权限未就绪，将为您打开完整授权页（消息 + 文件）。",
            missing=missing,
            extra_scope_hint=" ".join(missing) if missing else None,
        )

    try:
        send_feishu_file_http(access_token=access_token, account_id=target_id, file_key=file_key)
    except Exception as exc:
        msg = str(exc)
        missing = _extract_missing_scopes(msg)
        return _reauth_probe(
            message="飞书文件消息权限未就绪，将为您打开完整授权页（消息 + 文件）。",
            missing=missing,
            extra_scope_hint=" ".join(missing) if missing else None,
        )

    return FeishuCapabilityProbe(ready=True, message="飞书推送权限已就绪（消息与文件）")
