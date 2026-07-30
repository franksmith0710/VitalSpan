#!/usr/bin/env python3
"""Partial backup when compose services are not all up."""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "data" / "backups" / datetime.now().strftime("%Y%m%d-%H%M%S")
OUT.mkdir(parents=True, exist_ok=True)

manifest: dict = {"timestamp": OUT.name, "files": [], "warnings": []}


def run(cmd: list[str], outfile: Path | None = None) -> bool:
    try:
        if outfile:
            with outfile.open("wb") as f:
                subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.PIPE)
        else:
            subprocess.run(cmd, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as exc:
        manifest["warnings"].append(f"{' '.join(cmd[:3])}: {exc.stderr.decode(errors='replace')[:200]}")
        return False


# Meta postgres on host :5432 (not necessarily compose)
meta_dump = OUT / "meta-postgres.dump"
if run(
    [
        "docker",
        "run",
        "--rm",
        "-e",
        "PGPASSWORD=vitalspan",
        "postgres:16-alpine",
        "pg_dump",
        "-h",
        "host.docker.internal",
        "-p",
        "5432",
        "-U",
        "vitalspan",
        "-Fc",
        "vitalspan",
    ],
    meta_dump,
):
    manifest["files"].append({"service": "meta-postgres-host", "path": meta_dump.name, "bytes": meta_dump.stat().st_size})
    print(f"OK {meta_dump.name} ({meta_dump.stat().st_size} bytes)")
else:
    print("WARN meta-postgres dump failed")

# TimescaleDB compose container if running
ts_dump = OUT / "sample-timescaledb.dump"
cid = subprocess.run(
    ["docker", "compose", "ps", "-q", "sample-timescaledb"],
    cwd=REPO,
    capture_output=True,
    text=True,
).stdout.strip()
if cid and run(
    ["docker", "exec", cid.splitlines()[0], "pg_dump", "-U", "vitalspan", "-Fc", "ops_tsdb"],
    ts_dump,
):
    manifest["files"].append({"service": "sample-timescaledb", "path": ts_dump.name, "bytes": ts_dump.stat().st_size})
    print(f"OK {ts_dump.name} ({ts_dump.stat().st_size} bytes)")

(OUT / "keys-checklist.txt").write_text(
    "SECRET_KEY\nCREDENTIAL_FERNET_KEY\nCREDENTIAL_SM4_KEY\nCREDENTIAL_CRYPTO_PROVIDER\nPASSWORD_HASH_ALGORITHM\n",
    encoding="utf-8",
)
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print(f"Backup dir: {OUT}")
if not manifest["files"]:
    sys.exit(1)
