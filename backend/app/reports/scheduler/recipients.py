from __future__ import annotations

import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import AuthRole, AuthUser, AuthUserRole
from app.auth.profile.service import _email as user_email
from app.auth.users import im_bindings
from app.reports.scheduler.errors import ScheduleError
from app.reports.scheduler.schemas import ScheduleRecipientIn

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_IM_LABELS = {"dingtalk": "钉钉", "wecom": "企业微信", "feishu": "飞书"}


def _normalize_recipients(raw: list[dict] | list[ScheduleRecipientIn]) -> list[ScheduleRecipientIn]:
    out: list[ScheduleRecipientIn] = []
    for item in raw:
        if isinstance(item, ScheduleRecipientIn):
            out.append(item)
        else:
            out.append(ScheduleRecipientIn.model_validate(item))
    return out


def resolve_recipient_emails(session: Session, recipients: list[ScheduleRecipientIn]) -> list[str]:
    emails: list[str] = []
    seen: set[str] = set()
    for recipient in recipients:
        if recipient.type == "email":
            addr = recipient.value.strip()
            if not _EMAIL_RE.match(addr):
                raise ScheduleError(
                    "RPT_SCHEDULE_RECIPIENT_INVALID",
                    f"Invalid email: {recipient.value}",
                    422,
                )
            if addr.lower() not in seen:
                seen.add(addr.lower())
                emails.append(addr)
            continue
        if recipient.type == "user":
            user = None
            try:
                user_id = uuid.UUID(recipient.value)
                user = session.get(AuthUser, user_id)
            except ValueError:
                user = session.scalar(
                    select(AuthUser).where(AuthUser.username == recipient.value),
                )
            if user is None:
                raise ScheduleError(
                    "RPT_SCHEDULE_RECIPIENT_NOT_FOUND",
                    f"User not found: {recipient.value}",
                    404,
                )
            addr = user_email(user)
            if addr.lower() not in seen:
                seen.add(addr.lower())
                emails.append(addr)
            continue
        if recipient.type == "role":
            rows = session.scalars(
                select(AuthUser)
                .join(AuthUserRole, AuthUserRole.user_id == AuthUser.id)
                .join(AuthRole, AuthRole.id == AuthUserRole.role_id)
                .where(AuthRole.code == recipient.value, AuthRole.is_active.is_(True)),
            ).all()
            if not rows:
                raise ScheduleError(
                    "RPT_SCHEDULE_RECIPIENT_NOT_FOUND",
                    f"No users for role: {recipient.value}",
                    404,
                )
            for user in rows:
                addr = user_email(user)
                if addr.lower() not in seen:
                    seen.add(addr.lower())
                    emails.append(addr)
    return emails


def resolve_recipient_users(session: Session, recipients: list[ScheduleRecipientIn]) -> list[AuthUser]:
    """解析 role/user 收件人为平台用户；纯邮箱收件人无法走 IM。"""
    users: list[AuthUser] = []
    seen: set[uuid.UUID] = set()

    def _add(user: AuthUser | None, label: str) -> None:
        if user is None:
            raise ScheduleError("RPT_SCHEDULE_RECIPIENT_NOT_FOUND", f"User not found: {label}", 404)
        if user.id in seen:
            return
        seen.add(user.id)
        users.append(user)

    for recipient in recipients:
        if recipient.type == "email":
            continue
        if recipient.type == "user":
            user = None
            try:
                user_id = uuid.UUID(recipient.value)
                user = session.get(AuthUser, user_id)
            except ValueError:
                user = session.scalar(select(AuthUser).where(AuthUser.username == recipient.value))
            _add(user, recipient.value)
            continue
        if recipient.type == "role":
            rows = session.scalars(
                select(AuthUser)
                .join(AuthUserRole, AuthUserRole.user_id == AuthUser.id)
                .join(AuthRole, AuthRole.id == AuthUserRole.role_id)
                .where(AuthRole.code == recipient.value, AuthRole.is_active.is_(True)),
            ).all()
            if not rows:
                raise ScheduleError(
                    "RPT_SCHEDULE_RECIPIENT_NOT_FOUND",
                    f"No users for role: {recipient.value}",
                    404,
                )
            for user in rows:
                _add(user, recipient.value)
    return users


def resolve_im_targets(
    session: Session,
    recipients: list[ScheduleRecipientIn],
    channel: str,
) -> tuple[list[tuple[str, str]], list[str]]:
    """返回 ([(username, account_id), ...], 未绑号用户名或说明)。"""
    users = resolve_recipient_users(session, recipients)
    email_only = [r.value for r in recipients if r.type == "email"]
    missing: list[str] = []
    if not users and email_only:
        label = _IM_LABELS.get(channel, channel)
        missing.append(f"纯邮箱收件人无法走{label}")
        return [], missing
    bindings = im_bindings.list_accounts_for_users(session, [u.id for u in users], channel)
    targets: list[tuple[str, str]] = []
    for user in users:
        account_id = bindings.get(user.id)
        if account_id:
            targets.append((user.username, account_id))
        else:
            missing.append(user.username)
    if email_only:
        missing.extend(f"邮箱:{addr}" for addr in email_only)
    return targets, missing


def validate_recipients_present(recipients: list[ScheduleRecipientIn] | list[dict]) -> list[ScheduleRecipientIn]:
    normalized = _normalize_recipients(recipients)
    if not normalized:
        raise ScheduleError(
            "RPT_SCHEDULE_RECIPIENT_REQUIRED",
            "At least one recipient is required",
            422,
        )
    return normalized
