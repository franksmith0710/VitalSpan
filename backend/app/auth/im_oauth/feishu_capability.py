"""Post-bind capability checks for Feishu user_delegated delivery."""

from __future__ import annotations

import re
from dataclasses import dataclass

import httpx

from app.reports.scheduler.channels.im_sdk.feishu_common import FEISHU_PUSH_SCOPES

_USER_INFO_URL = "https://open.feishu.cn/open-apis/authen/v1/user_info"
_FILES_URL = "https://open.feishu.cn/open-apis/im/v1/files"
_TIMEOUT = 8.0
_SCOPE_RE = re.compile(r"privileges?:\s*\[([^\]]+)\]", re.I)
_MIN_PROBE_PDF = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


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


def _extract_missing_scopes(text: str) -> tuple[str, ...]:
    match = _SCOPE_RE.search(text)
    if not match:
        return ()
    raw = match.group(1)
    return tuple(part.strip().strip("'\"") for part in raw.split(",") if part.strip())


def _admin_employee_id_missing(message: str) -> bool:
    lower = message.lower()
    return "employee_id" in lower or "contact:user" in lower


def probe_feishu_user_delivery(
    *,
    access_token: str,
    account_id: str,
    app_id: str | None = None,
) -> FeishuCapabilityProbe:
    """Best-effort probe after bind; drives auto re-auth UX."""
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
        return FeishuCapabilityProbe(
            ready=False,
            message=msg,
            missing_scopes=missing,
            suggested_scope=" ".join(missing) if missing else FEISHU_PUSH_SCOPES,
        )

    data = info_body.get("data") or {}
    user_id = data.get("user_id")
    open_id = data.get("open_id")
    if not user_id and str(account_id).startswith("ou_"):
        return FeishuCapabilityProbe(
            ready=False,
            message="当前仅获取到 open_id，飞书应用需管理员开通「读取 user_id」权限后再重新绑定。",
            needs_admin=True,
            admin_portal_url=feishu_app_admin_portal_url(app_id or ""),
        )
    if not user_id and not open_id:
        return FeishuCapabilityProbe(
            ready=False,
            message="飞书未返回可用账号标识，请重新绑定。",
            suggested_scope=FEISHU_PUSH_SCOPES,
        )

    with httpx.Client(timeout=_TIMEOUT) as client:
        upload_resp = client.post(
            _FILES_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            data={"file_type": "pdf", "file_name": "vitalspan-probe.pdf"},
            files={"file": ("vitalspan-probe.pdf", _MIN_PROBE_PDF, "application/pdf")},
        )
        upload_body = upload_resp.json()
    if upload_resp.status_code < 400 and upload_body.get("code") in (0, None):
        return FeishuCapabilityProbe(ready=True, message="飞书推送权限已就绪")

    msg = str(upload_body.get("msg") or "飞书文件上传权限未开通")
    missing = _extract_missing_scopes(msg)
    if _admin_employee_id_missing(msg):
        return FeishuCapabilityProbe(
            ready=False,
            message="飞书应用缺少文件或通讯录权限，需管理员在开放平台开通并发布后，您再补充授权。",
            missing_scopes=missing,
            needs_admin=True,
            admin_portal_url=feishu_app_admin_portal_url(app_id or ""),
        )
    scope_text = " ".join(missing) if missing else FEISHU_PUSH_SCOPES
    return FeishuCapabilityProbe(
        ready=False,
        message="飞书还需补充消息/文件权限，将为您打开授权页，请在浏览器中确认。",
        missing_scopes=missing,
        suggested_scope=scope_text,
    )
