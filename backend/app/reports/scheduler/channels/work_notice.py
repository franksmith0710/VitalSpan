"""DingTalk / WeCom / Feishu work-notice (person) delivery."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

_TIMEOUT = 8.0
_CHANNEL_LABELS = {"dingtalk": "钉钉", "wecom": "企业微信", "feishu": "飞书"}


def app_configured(settings: Settings, channel: str) -> bool:
    if channel == "dingtalk":
        return bool(settings.dingtalk_app_key and settings.dingtalk_app_secret and settings.dingtalk_agent_id)
    if channel == "wecom":
        return bool(settings.wecom_corp_id and settings.wecom_secret and settings.wecom_agent_id)
    if channel == "feishu":
        return bool(settings.feishu_app_id and settings.feishu_app_secret)
    return False


def probe_im_apps(settings: Settings) -> dict[str, dict[str, bool]]:
    return {
        "dingtalk": {
            "configured": app_configured(settings, "dingtalk"),
            "groupWebhook": bool(settings.push_dingtalk_webhook),
        },
        "wecom": {
            "configured": app_configured(settings, "wecom"),
            "groupWebhook": bool(settings.push_wecom_webhook),
        },
        "feishu": {
            "configured": app_configured(settings, "feishu"),
            "groupWebhook": bool(settings.push_feishu_webhook),
        },
    }


def send_work_notices(
    channel: str,
    *,
    account_ids: list[str],
    summary: str,
    artifact_ref: str,
    settings: Settings,
) -> dict[str, Any]:
    label = _CHANNEL_LABELS.get(channel, channel)
    if not account_ids:
        return {"channel": channel, "status": "failed", "mode": "work_notice", "error": f"{label}没有可投递的个人账号"}
    if not app_configured(settings, channel):
        return {
            "channel": channel,
            "status": "failed",
            "mode": "work_notice",
            "error": f"{label}应用未配置，无法发给个人账号。请配置平台 {label} App 凭证。",
            "to": account_ids,
        }
    text = f"{summary}\n引用：{artifact_ref}"
    try:
        if channel == "dingtalk":
            _send_dingtalk(settings, account_ids, text)
        elif channel == "wecom":
            _send_wecom(settings, account_ids, text)
        elif channel == "feishu":
            _send_feishu(settings, account_ids, text)
        else:
            return {"channel": channel, "status": "skipped", "error": "未知通道"}
    except Exception as exc:
        logger.warning("%s work notice failed: %s", label, exc)
        return {
            "channel": channel,
            "status": "failed",
            "mode": "work_notice",
            "error": str(exc),
            "to": account_ids,
        }
    return {"channel": channel, "status": "delivered", "mode": "work_notice", "to": account_ids}


def _client() -> httpx.Client:
    return httpx.Client(timeout=_TIMEOUT)


def _require_ok(payload: dict[str, Any], *, err_keys: tuple[str, ...] = ("errcode", "code")) -> None:
    for key in err_keys:
        if key in payload and payload[key] not in (0, "0", None):
            raise RuntimeError(payload.get("errmsg") or payload.get("msg") or str(payload))


def _send_dingtalk(settings: Settings, account_ids: list[str], text: str) -> None:
    with _client() as client:
        token_resp = client.get(
            "https://oapi.dingtalk.com/gettoken",
            params={"appkey": settings.dingtalk_app_key, "appsecret": settings.dingtalk_app_secret},
        )
        token_resp.raise_for_status()
        token_body = token_resp.json()
        _require_ok(token_body)
        token = token_body["access_token"]
        resp = client.post(
            "https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2",
            params={"access_token": token},
            json={
                "agent_id": int(settings.dingtalk_agent_id or "0"),
                "userid_list": ",".join(account_ids),
                "msg": {"msgtype": "text", "text": {"content": text}},
            },
        )
        resp.raise_for_status()
        _require_ok(resp.json())


def _send_wecom(settings: Settings, account_ids: list[str], text: str) -> None:
    with _client() as client:
        token_resp = client.get(
            "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
            params={"corpid": settings.wecom_corp_id, "corpsecret": settings.wecom_secret},
        )
        token_resp.raise_for_status()
        token_body = token_resp.json()
        _require_ok(token_body)
        token = token_body["access_token"]
        resp = client.post(
            "https://qyapi.weixin.qq.com/cgi-bin/message/send",
            params={"access_token": token},
            json={
                "touser": "|".join(account_ids),
                "msgtype": "text",
                "agentid": int(settings.wecom_agent_id or "0"),
                "text": {"content": text},
            },
        )
        resp.raise_for_status()
        _require_ok(resp.json())


def _send_feishu(settings: Settings, account_ids: list[str], text: str) -> None:
    with _client() as client:
        token_resp = client.post(
            "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
            json={"app_id": settings.feishu_app_id, "app_secret": settings.feishu_app_secret},
        )
        token_resp.raise_for_status()
        token_body = token_resp.json()
        _require_ok(token_body)
        token = token_body["tenant_access_token"]
        for account_id in account_ids:
            resp = client.post(
                "https://open.feishu.cn/open-apis/im/v1/messages",
                params={"receive_id_type": "user_id"},
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "receive_id": account_id,
                    "msg_type": "text",
                    "content": json.dumps({"text": text}, ensure_ascii=False),
                },
            )
            resp.raise_for_status()
            _require_ok(resp.json())
