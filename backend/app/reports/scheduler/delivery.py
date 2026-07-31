from __future__ import annotations

from app.core.config import Settings
from app.reports.scheduler.delivery_adapter import deliver_artifact

_DELIVERY_LOG: list[dict] = []


def dispatch_artifact(
    artifact_ref: str,
    channels: list[str],
    mock_mode: str | None,
    settings: Settings | None = None,
    *,
    recipient_emails: list[str] | None = None,
) -> dict:
    result = deliver_artifact(
        artifact_ref, channels, mock_mode, settings, recipient_emails=recipient_emails,
    )
    _DELIVERY_LOG.append({"ref": artifact_ref, **result})
    return result
