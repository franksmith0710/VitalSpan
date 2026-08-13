#!/usr/bin/env python3
"""IM platform-connect smoke: real gettoken against vendor HTTPS. No mock."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import httpx

TIMEOUT = 8.0


def _fail(msg: str, code: int = 2) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def _ok_wecom(body: dict[str, Any]) -> bool:
    return body.get("errcode") in (0, "0") and bool(body.get("access_token"))


def _ok_dingtalk(body: dict[str, Any]) -> bool:
    return body.get("errcode") in (0, "0") and bool(body.get("access_token"))


def _ok_feishu(body: dict[str, Any]) -> bool:
    return body.get("code") in (0, "0") and bool(body.get("tenant_access_token"))


def probe_wecom(client: httpx.Client) -> None:
    corp = os.environ.get("WECOM_CORP_ID", "").strip()
    secret = os.environ.get("WECOM_SECRET", "").strip()
    if not corp or not secret:
        raise RuntimeError("skip")
    resp = client.get(
        "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
        params={"corpid": corp, "corpsecret": secret},
    )
    resp.raise_for_status()
    body = resp.json()
    if not _ok_wecom(body):
        _fail(f"wecom gettoken failed: {body.get('errmsg') or body}", 1)
    print("PASS wecom gettoken")


def probe_dingtalk(client: httpx.Client) -> None:
    key = os.environ.get("DINGTALK_APP_KEY", "").strip()
    secret = os.environ.get("DINGTALK_APP_SECRET", "").strip()
    if not key or not secret:
        raise RuntimeError("skip")
    resp = client.get(
        "https://oapi.dingtalk.com/gettoken",
        params={"appkey": key, "appsecret": secret},
    )
    resp.raise_for_status()
    body = resp.json()
    if not _ok_dingtalk(body):
        _fail(f"dingtalk gettoken failed: {body.get('errmsg') or body}", 1)
    print("PASS dingtalk gettoken")


def probe_feishu(client: httpx.Client) -> None:
    app_id = os.environ.get("FEISHU_APP_ID", "").strip()
    secret = os.environ.get("FEISHU_APP_SECRET", "").strip()
    if not app_id or not secret:
        raise RuntimeError("skip")
    resp = client.post(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        json={"app_id": app_id, "app_secret": secret},
    )
    resp.raise_for_status()
    body = resp.json()
    if not _ok_feishu(body):
        _fail(f"feishu tenant_access_token failed: {body.get('msg') or body}", 1)
    print("PASS feishu tenant_access_token")


def main() -> None:
    probes = (
        ("wecom", probe_wecom),
        ("dingtalk", probe_dingtalk),
        ("feishu", probe_feishu),
    )
    ran = 0
    with httpx.Client(timeout=TIMEOUT) as client:
        for name, fn in probes:
            try:
                fn(client)
                ran += 1
            except RuntimeError as exc:
                if str(exc) == "skip":
                    print(f"SKIP {name} (env not set)")
                    continue
                raise
            except httpx.HTTPError as exc:
                _fail(f"{name} HTTP error: {exc}", 1)
    if ran == 0:
        _fail(
            "missing credentials: set at least one of "
            "WECOM_CORP_ID+WECOM_SECRET, DINGTALK_APP_KEY+DINGTALK_APP_SECRET, "
            "FEISHU_APP_ID+FEISHU_APP_SECRET",
            2,
        )
    print(json.dumps({"ok": True, "channels": ran}))


if __name__ == "__main__":
    main()
