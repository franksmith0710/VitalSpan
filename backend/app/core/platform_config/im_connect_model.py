from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import Base

IM_CHANNELS = ("dingtalk", "wecom", "feishu")
IM_DELIVERY_MODES = ("corporate_app", "user_delegated")
IM_LABELS = {
    "dingtalk": "钉钉",
    "wecom": "企业微信",
    "feishu": "飞书",
}

AUDIT_TARGET_IM_DINGTALK = uuid.UUID("00000000-0000-4000-8000-0000000000f1")
AUDIT_TARGET_IM_WECOM = uuid.UUID("00000000-0000-4000-8000-0000000000f2")
AUDIT_TARGET_IM_FEISHU = uuid.UUID("00000000-0000-4000-8000-0000000000f3")
AUDIT_TARGET_BY_IM_CHANNEL = {
    "dingtalk": AUDIT_TARGET_IM_DINGTALK,
    "wecom": AUDIT_TARGET_IM_WECOM,
    "feishu": AUDIT_TARGET_IM_FEISHU,
}


class PlatformImConnectConfig(Base):
    __tablename__ = "platform_im_connect_configs"
    __table_args__ = (
        CheckConstraint(
            "state IN ('active', 'cleared')",
            name="ck_platform_im_connect_configs_state",
        ),
        CheckConstraint(
            "channel IN ('dingtalk', 'wecom', 'feishu')",
            name="ck_platform_im_connect_configs_channel",
        ),
        CheckConstraint(
            "delivery_mode IN ('corporate_app', 'user_delegated')",
            name="ck_platform_im_connect_configs_delivery_mode",
        ),
    )

    channel: Mapped[str] = mapped_column(String(16), primary_key=True)
    state: Mapped[str] = mapped_column(String(16), nullable=False)
    delivery_mode: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="corporate_app"
    )
    callback_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    credentials_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("auth_users.id", ondelete="SET NULL"),
        nullable=True,
    )
