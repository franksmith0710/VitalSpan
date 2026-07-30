#!/usr/bin/env python3
"""Logical JSON backup of meta DB credential tables (fallback when pg_dump unavailable)."""
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from sqlalchemy import create_engine, text

from app.core.config import get_settings

get_settings.cache_clear()
engine = create_engine(get_settings().database_url)
out_dir = Path(__file__).resolve().parents[1] / "data" / "backups" / datetime.now().strftime("%Y%m%d-%H%M%S-meta-json")
out_dir.mkdir(parents=True, exist_ok=True)

tables = ["data_sources", "ingestion_sync_jobs", "auth_users"]
payload = {}
with engine.connect() as conn:
    for table in tables:
        try:
            rows = conn.execute(text(f"SELECT * FROM {table}")).mappings().all()
            payload[table] = [dict(r) for r in rows]
        except Exception as exc:
            payload[table] = {"error": str(exc)}

def _default(o):
    return str(o)

(out_dir / "meta-logical-backup.json").write_text(
    json.dumps(payload, default=_default, indent=2, ensure_ascii=False),
    encoding="utf-8",
)
print(f"OK meta logical backup -> {out_dir / 'meta-logical-backup.json'}")
