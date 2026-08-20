"""Publish customViz bundle to VitalSpan platform (workflow 2)."""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from config import load_config, spec_pack_path
from subprocess_runner import run_tool


ARTIFACT_ID_RE = re.compile(
    r"(?:ok\s+)?artifactId=([0-9a-fA-F-]{36})",
    re.IGNORECASE,
)
TIER_RE = re.compile(r"styleComplianceTier=(\w+)", re.IGNORECASE)


@dataclass
class PublishOutcome:
    ok: bool
    artifact_id: str | None
    style_compliance_tier: str | None
    stdout: str
    stderr: str
    draft_path: Path | None = None

    def to_dict(self) -> dict:
        return {
            "ok": self.ok,
            "artifactId": self.artifact_id,
            "styleComplianceTier": self.style_compliance_tier,
            "draftPath": str(self.draft_path) if self.draft_path else None,
            "stdout": self.stdout,
            "stderr": self.stderr,
        }


def _parse_publish_stdout(text: str) -> tuple[str | None, str | None]:
    aid = None
    tier = None
    m = ARTIFACT_ID_RE.search(text)
    if m:
        aid = m.group(1)
    t = TIER_RE.search(text)
    if t:
        tier = t.group(1)
    return aid, tier


def write_draft_bundle(bundle: dict, filename: str) -> Path:
    cfg = load_config()
    forbidden = set(cfg.forbidden_delivery_dirs)
    name = Path(filename).name
    if name != filename or ".." in filename.replace("\\", "/"):
        raise SystemExit("invalid draft filename")
    if any(part in forbidden for part in Path(filename).parts):
        raise SystemExit(f"forbidden delivery dir in {filename!r}; use examples/")
    pack = spec_pack_path()
    if not filename.startswith("examples/"):
        filename = f"examples/{name}"
    path = pack / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def publish_file(
    file_arg: str,
    *,
    artifact_id: str | None = None,
    validate_only: bool = False,
    health_first: bool = False,
) -> PublishOutcome:
    cfg = load_config()
    forbidden = set(cfg.forbidden_delivery_dirs)
    normalized = file_arg.replace("\\", "/")
    if any(f"/{d}/" in f"/{normalized}/" or normalized.startswith(f"{d}/") for d in forbidden):
        raise SystemExit(f"refusing publish from forbidden dir: {file_arg}")

    args: list[str] = ["--file", file_arg]
    if artifact_id:
        args.extend(["--artifact-id", artifact_id])
    if validate_only:
        args.append("--validate-only")
    if health_first:
        args.append("--health-first")

    result = run_tool("publish-ai-viz-artifact.py", *args)
    combined = result.stdout + result.stderr
    aid, tier = _parse_publish_stdout(combined)
    ok = result.ok and (validate_only or aid is not None)
    draft = spec_pack_path() / file_arg if not file_arg.startswith("/") else Path(file_arg)
    return PublishOutcome(
        ok=ok,
        artifact_id=aid,
        style_compliance_tier=tier,
        stdout=result.stdout,
        stderr=result.stderr,
        draft_path=draft if draft.is_file() else None,
    )


def publish_bundle_dict(
    bundle: dict,
    filename: str,
    **kwargs,
) -> PublishOutcome:
    path = write_draft_bundle(bundle, filename)
    rel = path.relative_to(spec_pack_path()).as_posix()
    return publish_file(rel, **kwargs)


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="DeepTalk publish executor")
    parser.add_argument("--file", required=True, help="examples/my.json under vs-ai-spec")
    parser.add_argument("--artifact-id", default=None)
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--health-first", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    outcome = publish_file(
        args.file,
        artifact_id=args.artifact_id,
        validate_only=args.validate_only,
        health_first=args.health_first,
    )
    if args.json:
        print(json.dumps(outcome.to_dict(), ensure_ascii=False, indent=2))
    else:
        sys.stdout.write(outcome.stdout)
        if outcome.stderr:
            sys.stderr.write(outcome.stderr)
        if outcome.ok and outcome.artifact_id:
            print(f"executor ok artifactId={outcome.artifact_id}")
    return 0 if outcome.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
