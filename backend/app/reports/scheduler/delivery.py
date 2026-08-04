from __future__ import annotations

from app.core.config import Settings
from app.reports.scheduler.channels.dispatch import deliver_to_channels
from app.reports.scheduler.delivery_adapter import deliver_artifact as _legacy_deliver

_DELIVERY_LOG: list[dict] = []


def dispatch_artifact(
    artifact_ref: str,
    channels: list[str],
    mock_mode: str | None,
    settings: Settings | None = None,
    *,
    recipient_emails: list[str] | None = None,
    artifact_kind: str | None = None,
    attachment_bytes: bytes | None = None,
    attachment_filename: str | None = None,
    attachment_mime: str | None = None,
    attachments: list[tuple[bytes, str, str]] | None = None,
) -> dict:
    att_list = attachments or []
    if not att_list and attachment_bytes and attachment_filename:
        att_list = [(attachment_bytes, attachment_mime or "application/pdf", attachment_filename)]
    if len(channels) > 1 or any(c != "email" for c in channels):
        result = deliver_to_channels(
            channels,
            artifact_ref=artifact_ref,
            artifact_kind=artifact_kind,
            recipient_emails=recipient_emails,
            attachments=att_list,
            mock_mode=mock_mode,
            settings=settings,
        )
    else:
        result = _legacy_deliver(
            artifact_ref,
            channels,
            mock_mode,
            settings,
            recipient_emails=recipient_emails,
            artifact_kind=artifact_kind,
            attachment_bytes=attachment_bytes,
            attachment_filename=attachment_filename,
            attachment_mime=attachment_mime,
        )
    _DELIVERY_LOG.append({"ref": artifact_ref, **result})
    return result
