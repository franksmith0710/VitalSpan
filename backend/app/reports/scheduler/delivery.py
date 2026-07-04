from __future__ import annotations

_DELIVERY_LOG: list[dict] = []


def dispatch_artifact(artifact_ref: str, channels: list[str], mock_mode: str | None) -> dict:
    steps: list[dict] = []
    overall = "delivered"
    attempts = 1
    channel_list = channels or ["email"]
    for channel in channel_list:
        first_channel = channel_list[0]
        if mock_mode == "fail" and channel == first_channel:
            steps.append({"channel": channel, "status": "failed", "attempt": 1})
            overall = "degraded"
            continue
        if mock_mode == "retry" and channel == first_channel:
            steps.append({"channel": channel, "status": "failed", "attempt": 1})
            steps.append({"channel": channel, "status": "delivered", "attempt": 2})
            attempts = 2
            continue
        steps.append({"channel": channel, "status": "delivered", "attempt": 1})
    result = {"status": overall, "attempts": attempts, "deliverySteps": steps}
    _DELIVERY_LOG.append({"ref": artifact_ref, **result})
    return result
