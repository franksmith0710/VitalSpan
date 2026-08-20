#!/usr/bin/env python3
"""POST examples/*.json to a running VitalSpan. Unpack this spec zip and run from pack root:

  python tools/validate-ai-viz-bundle.py --file examples/my-widget.json
  python tools/upload-ai-viz-artifact.py --file examples/my-widget.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

_TOOLS = Path(__file__).resolve().parent
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from bundle_preflight import format_preflight_lines, load_bundle, pack_dir, preflight_bundle


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


def _resolve_bundle_path(pack: Path, file_arg: Path) -> Path:
    path = file_arg if file_arg.is_absolute() else pack / file_arg
    if not path.is_file():
        path = Path.cwd() / file_arg
    if not path.is_file():
        raise SystemExit(f"bundle not found: {file_arg}")
    return path


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
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="run local preflight only; do not POST (use before claiming upload success)",
    )
    parser.add_argument(
        "--skip-preflight",
        action="store_true",
        help="POST without local preflight (not recommended)",
    )
    args = parser.parse_args()
    path = _resolve_bundle_path(pack, args.file)
    bundle = load_bundle(path)

    if not args.skip_preflight:
        preflight = preflight_bundle(bundle)
        for line in format_preflight_lines(preflight):
            print(line)
        if not preflight.ok:
            raise SystemExit(1)

    if args.validate_only:
        return

    api = args.api.rstrip("/")
    print(f"upload target: POST {api}/ai-viz/artifacts (platform DB, not this folder)")
    login = request_json("POST", f"{api}/auth/login", {"username": args.username, "password": args.password})
    token = login.get("accessToken") or login.get("access_token")
    if not token:
        raise SystemExit("login missing accessToken; is the API up?")
    created = request_json("POST", f"{api}/ai-viz/artifacts", bundle, token)
    artifact_id = created.get("artifactId") or created.get("artifact_id")
    tier = created.get("styleComplianceTier") or created.get("style_compliance_tier")
    warnings = created.get("warnings") or []
    print(f"ok artifactId={artifact_id}")
    if tier:
        print(f"styleComplianceTier={tier}")
    if warnings:
        print(f"warnings ({len(warnings)}):")
        for warn in warnings:
            code = warn.get("code", "?")
            message = warn.get("message", "")
            print(f"  - {code}: {message}")
    else:
        print("warnings: none")
    print(f"entry GET {api}/ai-viz/artifacts/{artifact_id}/entry")
    print("set customVizConfig.artifactId to this uuid on a dashboard")


if __name__ == "__main__":
    main()
