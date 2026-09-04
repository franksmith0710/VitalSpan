"""Feishu (person) / DingTalk leftover work-notice helpers."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.auth.im_oauth.im_user_token import get_user_access_token, owner_has_send_token
from app.core.config import Settings, get_settings
from app.core.platform_config.im_credentials import ImCredentials
from app.core.platform_config.im_resolve import resolve_im_credentials
from app.reports.scheduler.channels.im_sdk import (
    probe_im_channels,
    send_dingtalk_text,
)
from app.reports.scheduler.channels.im_sdk.feishu import deliver_feishu_as_app
from app.reports.scheduler.channels.im_sdk.feishu_common import FeishuAttachment
from app.reports.scheduler.channels.im_sdk.feishu_user import deliver_feishu_as_user
from app.reports.scheduler.channels.im_sdk.probe import probe_im_credentials_bundle

logger = logging.getLogger(__name__)

_CHANNEL_LABELS = {"dingtalk": "钉钉", "feishu": "飞书"}


def app_configured(
    channel: str,
    *,
    session: Session | None = None,
    settings: Settings | None = None,
    creds: ImCredentials | None = None,
) -> bool:
    resolved = creds or resolve_im_credentials(session, channel=channel, settings=settings)
    return resolved.is_configured


def probe_im_apps(
    settings: Settings | None = None,
    *,
    session: Session | None = None,
    force_refresh: bool = False,
) -> dict[str, dict[str, Any]]:
    return probe_im_channels(settings, session=session, force_refresh=force_refresh)


def _feishu_notice_text(summary: str, artifact_ref: str, attachments: list[FeishuAttachment]) -> str:
    if attachments:
        return (
            f"{summary}\n\n"
            "附件为 PDF 报告，请在飞书「消息」中查看本条通知；"
            "若未收到推送，可在 VitalSpan 执行记录中下载同一份 PDF。"
        )
    return f"{summary}\n引用：{artifact_ref}"


def send_work_notices(
    channel: str,
    *,
    account_ids: list[str],
    summary: str,
    artifact_ref: str,
    attachments: list[FeishuAttachment] | None = None,
    owner_id: uuid.UUID | None = None,
    settings: Settings | None = None,
    session: Session | None = None,
    creds: ImCredentials | None = None,
) -> dict[str, Any]:
    label = _CHANNEL_LABELS.get(channel, channel)
    cfg = settings or get_settings()
    resolved = creds or resolve_im_credentials(session, channel=channel, settings=cfg)
    if not account_ids:
        return {"channel": channel, "status": "failed", "mode": "work_notice", "error": f"{label}没有可投递的个人账号"}
    if not resolved.is_configured:
        return {
            "channel": channel,
            "status": "failed",
            "mode": "work_notice",
            "error": f"{label}应用未配置，无法发给个人账号。请配置平台 {label} App 凭证。",
            "to": account_ids,
        }
    if resolved.delivery_mode == "user_delegated":
        if session is None or owner_id is None:
            return {
                "channel": channel,
                "status": "failed",
                "mode": "user_delegated",
                "error": "调度 owner 未指定，无法发信",
                "to": account_ids,
            }
        ready, owner_error = owner_has_send_token(session, owner_id, channel)
        if not ready:
            return {
                "channel": channel,
                "status": "failed",
                "mode": "user_delegated",
                "error": owner_error or f"调度 owner 未完成{label}绑定",
                "to": account_ids,
            }
        att_list = list(attachments or [])
        if channel == "feishu":
            text = _feishu_notice_text(summary, artifact_ref, att_list)
            access_token = get_user_access_token(session, owner_id, channel)
            if not access_token:
                return {
                    "channel": channel,
                    "status": "failed",
                    "mode": "user_delegated",
                    "error": "调度 owner 飞书授权已失效，请重新绑定",
                    "to": account_ids,
                }
            try:
                deliver_feishu_as_user(
                    access_token=access_token,
                    account_ids=account_ids,
                    text=text,
                    attachments=att_list,
                )
            except Exception as exc:
                logger.warning("%s user-delegated notice failed: %s", label, exc)
                return {
                    "channel": channel,
                    "status": "failed",
                    "mode": "user_delegated",
                    "error": str(exc),
                    "to": account_ids,
                }
            return {
                "channel": channel,
                "status": "delivered",
                "mode": "user_delegated",
                "to": account_ids,
            }
        probe = probe_im_credentials_bundle(resolved)
        if not probe.get("ok"):
            return {
                "channel": channel,
                "status": "failed",
                "mode": "user_delegated",
                "error": probe.get("error") or f"{label}应用探测失败",
                "to": account_ids,
            }
        try:
            if channel == "dingtalk":
                dingtalk_text = f"{summary}\n引用：{artifact_ref}"
                send_dingtalk_text(
                    app_key=resolved.app_key or "",
                    app_secret=resolved.app_secret or "",
                    agent_id=resolved.agent_id or "",
                    account_ids=account_ids,
                    text=dingtalk_text,
                )
            else:
                return {
                    "channel": channel,
                    "status": "failed",
                    "mode": "user_delegated",
                    "error": f"{label}用户委托模式暂不支持",
                    "to": account_ids,
                }
        except Exception as exc:
            logger.warning("%s user-delegated notice failed: %s", label, exc)
            return {
                "channel": channel,
                "status": "failed",
                "mode": "user_delegated",
                "error": str(exc),
                "to": account_ids,
            }
        return {
            "channel": channel,
            "status": "delivered",
            "mode": "user_delegated",
            "to": account_ids,
        }
    probe = probe_im_credentials_bundle(resolved)
    if not probe.get("ok"):
        return {
            "channel": channel,
            "status": "failed",
            "mode": "work_notice",
            "error": probe.get("error") or f"{label}应用探测失败",
            "to": account_ids,
        }
    att_list = list(attachments or [])
    text = _feishu_notice_text(summary, artifact_ref, att_list) if channel == "feishu" else f"{summary}\n引用：{artifact_ref}"
    try:
        if channel == "dingtalk":
            send_dingtalk_text(
                app_key=resolved.app_key or "",
                app_secret=resolved.app_secret or "",
                agent_id=resolved.agent_id or "",
                account_ids=account_ids,
                text=text,
            )
        elif channel == "feishu":
            deliver_feishu_as_app(
                app_id=resolved.app_id or "",
                app_secret=resolved.app_secret or "",
                account_ids=account_ids,
                text=text,
                attachments=att_list,
            )
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
