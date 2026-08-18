#!/usr/bin/env python3
"""POST examples/*.json to a running VitalSpan. Unpack this spec zip and run from pack root:

  python tools/upload-ai-viz-artifact.py
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


def pack_dir() -> Path:
    here = Path(__file__).resolve().parent
    for candidate in (here.parent, here.parent / "docs" / "api" / "vs-ai-spec"):
        if (candidate / "examples" / "custom-viz-d3-bundle.json").is_file():
            return candidate
    raise SystemExit("cannot find examples/custom-viz-d3-bundle.json")


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


def main() -> None:
    pack = pack_dir()
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--file",
        type=Path,
        default=pack / "examples" / "custom-viz-d3-bundle.json",
    )
    parser.add_argument("--api", default=os.environ.get("VITALSPAN_API", "http://127.0.0.1:8000/api/v1"))
    parser.add_argument("--username", default=os.environ.get("VITALSPAN_USERNAME", "admin"))
    parser.add_argument("--password", default=os.environ.get("VITALSPAN_DEV_ADMIN_PASSWORD", "changeme"))
    args = parser.parse_args()
    path = args.file if args.file.is_absolute() else pack / args.file
    if not path.is_file():
        path = Path.cwd() / args.file
    bundle = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(bundle, dict) or "manifest" not in bundle or "files" not in bundle:
        raise SystemExit("bundle must be {manifest, files}; vanilla/iife packages are rejected")
    api = args.api.rstrip("/")
    login = request_json("POST", f"{api}/auth/login", {"username": args.username, "password": args.password})
    token = login.get("accessToken") or login.get("access_token")
    if not token:
        raise SystemExit("login missing accessToken; is the API up?")
    created = request_json("POST", f"{api}/ai-viz/artifacts", bundle, token)
    artifact_id = created.get("artifactId") or created.get("artifact_id")
    print(f"ok artifactId={artifact_id}")
    print(f"entry GET {api}/ai-viz/artifacts/{artifact_id}/entry")
    print("set customVizConfig.artifactId to this uuid on a dashboard")


if __name__ == "__main__":
    main()
