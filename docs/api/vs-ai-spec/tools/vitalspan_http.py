"""Shared HTTP helpers for vs-ai-spec CLI tools."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path


def pack_dir() -> Path:
    here = Path(__file__).resolve().parent
    for candidate in (here.parent, here.parent / "docs" / "api" / "vs-ai-spec"):
        if (candidate / "examples" / "custom-viz-d3-bundle.json").is_file():
            return candidate
    raise SystemExit("cannot find examples/custom-viz-d3-bundle.json")


def resolve_spec_path(pack: Path, file_arg: Path) -> Path:
    path = file_arg if file_arg.is_absolute() else pack / file_arg
    if not path.is_file():
        path = Path.cwd() / file_arg
    if not path.is_file():
        raise SystemExit(f"file not found: {file_arg}")
    return path


def default_api() -> str:
    return os.environ.get("VITALSPAN_API", "http://127.0.0.1:8000/api/v1").rstrip("/")


def default_credentials() -> tuple[str, str]:
    return (
        os.environ.get("VITALSPAN_USERNAME", "admin"),
        os.environ.get("VITALSPAN_DEV_ADMIN_PASSWORD", "changeme"),
    )


def request_json(method: str, url: str, body: dict | None, token: str | None = None) -> dict:
    raw_body = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=raw_body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        err = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"{method} {url} -> {exc.code}\n{err}") from exc


def login(api: str, username: str | None = None, password: str | None = None) -> str:
    user, pwd = default_credentials()
    login_body = request_json(
        "POST",
        f"{api}/auth/login",
        {"username": username or user, "password": password or pwd},
    )
    token = login_body.get("accessToken") or login_body.get("access_token")
    if not token:
        raise SystemExit("login missing accessToken; is the API up?")
    return token
