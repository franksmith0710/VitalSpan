#!/usr/bin/env python3
"""IM platform-connect smoke: real gettoken via production SDK adapters. No mock."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.core.config import get_settings
from app.reports.scheduler.channels.im_sdk.probe import probe_channel_credentials


def _fail(msg: str, code: int = 2) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def main() -> None:
    settings = get_settings()
    ran = 0
    for channel in ("wecom", "dingtalk", "feishu"):
        result = probe_channel_credentials(settings, channel)
        if result.get("skipped"):
            print(f"SKIP {channel} (env not set)")
            continue
        if result.get("ok"):
            print(f"PASS {channel} gettoken (sdk)")
            ran += 1
            continue
        _fail(f"{channel} gettoken failed: {result.get('error')}", 1)
    if ran == 0:
        _fail(
            "missing credentials: set at least one of "
            "WECOM_CORP_ID+WECOM_SECRET+WECOM_AGENT_ID, "
            "DINGTALK_APP_KEY+DINGTALK_APP_SECRET+DINGTALK_AGENT_ID, "
            "FEISHU_APP_ID+FEISHU_APP_SECRET",
            2,
        )
    print(json.dumps({"ok": True, "channels": ran, "transport": "sdk"}))


if __name__ == "__main__":
    main()
