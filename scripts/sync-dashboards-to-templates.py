#!/usr/bin/env python3
"""将工作区仪表板布局同步到内置可视化模板，并软删除工作副本看板。

用法（仓库根目录）：
  python scripts/sync-dashboards-to-templates.py
  python scripts/sync-dashboards-to-templates.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BACKEND = Path(os.environ.get("VITALSPAN_BACKEND", str(ROOT / "backend")))
LAYOUTS_DIR = BACKEND / "app" / "dashboard" / "templates" / "layouts"
SEED_FILE = BACKEND / "app" / "dashboard" / "templates" / "seed.py"

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

os.chdir(BACKEND)

from sqlalchemy import select

from app.auth.models import get_meta_session
from app.dashboard.models import Dashboard
from app.dashboard.templates.models import DashboardTemplate
from app.dashboard.templates.presets_exported import prepare_exported_layout
from app.dashboard.workspace_instances.seed import (
    WORKSPACE_INSTANCE_DESCRIPTION,
    WORKSPACE_INSTANCE_SPECS,
    WORKSPACE_INSTANCE_SLUGS,
)

TEMPLATE_LAYOUT_FILES: dict[str, str] = {
    "builtin-gov-industrial-park": "industrial-park-screen.json",
    "builtin-gov-smart-city": "workspace-smart-city.json",
    "builtin-gov-digital-cockpit": "workspace-digital-cockpit.json",
    "builtin-gov-emergency-command": "workspace-emergency.json",
    "builtin-gov-eco-monitor": "workspace-eco.json",
    "builtin-gov-community": "workspace-community.json",
    "builtin-gov-efficiency": "workspace-efficiency.json",
    "builtin-gov-satisfaction": "workspace-satisfaction.json",
    "builtin-gov-finance": "workspace-finance.json",
    "builtin-gov-investment": "workspace-investment.json",
    "builtin-gov-grid": "workspace-grid.json",
}

# 非 workspace 固定 ID 的额外看板（工业园区）
EXTRA_DASHBOARD_SPECS: tuple[dict[str, Any], ...] = (
    {
        "dashboard_id": uuid.UUID("f8951c72-d2f9-41b0-9f80-3446d7c85105"),
        "template_key": "builtin-gov-industrial-park",
    },
)


def _resolve_dashboard_for_spec(session, spec: dict[str, Any]) -> Dashboard | None:
    dash = session.scalar(
        select(Dashboard).where(
            Dashboard.slug == spec["slug"],
            Dashboard.deleted_at.is_(None),
        ),
    )
    if dash is None:
        dash = session.scalar(select(Dashboard).where(Dashboard.id == spec["id"]))
        if dash is not None and dash.deleted_at is not None:
            dash = None
    if dash is not None:
        return dash

    name = spec["name"]
    surface = spec["surface_kind"]
    candidates = session.scalars(
        select(Dashboard).where(
            Dashboard.deleted_at.is_(None),
            Dashboard.surface_kind == surface,
            Dashboard.name.in_((name, f"{name}（编辑）")),
        ),
    ).all()
    if not candidates:
        candidates = session.scalars(
            select(Dashboard).where(
                Dashboard.deleted_at.is_(None),
                Dashboard.surface_kind == surface,
                Dashboard.name.like(f"{name}%"),
            ),
        ).all()
    if candidates:
        return max(
            candidates,
            key=lambda row: (
                1 if row.description != WORKSPACE_INSTANCE_DESCRIPTION else 0,
                row.updated_at or row.created_at,
            ),
        )

    # Last resort: recently soft-deleted workspace row or edited copy.
    archived = session.scalars(
        select(Dashboard).where(
            Dashboard.surface_kind == surface,
            Dashboard.deleted_at.is_not(None),
            (Dashboard.id == spec["id"])
            | (Dashboard.slug == spec["slug"])
            | Dashboard.name.in_((name, f"{name}（编辑）")),
        ),
    ).all()
    if not archived:
        return None
    return max(archived, key=lambda row: row.updated_at or row.created_at)


def _export_payload(dashboard: Dashboard) -> dict[str, Any]:
    layout = dashboard.layout_json
    if hasattr(layout, "model_dump"):
        raw = layout.model_dump(by_alias=True, mode="json")
    else:
        raw = dict(layout)
    cleaned = prepare_exported_layout(raw)
    return {
        "name": dashboard.name,
        "slug": dashboard.slug,
        "surfaceKind": dashboard.surface_kind,
        "layoutJson": cleaned,
    }


def _write_layout_file(filename: str, payload: dict[str, Any], *, dry_run: bool) -> None:
    path = LAYOUTS_DIR / filename
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if dry_run:
        print(f"  [dry-run] would write {path} ({len(text)} bytes)")
        return
    path.write_text(text, encoding="utf-8")
    print(f"  wrote {path.name} widgets={len(payload['layoutJson'].get('widgets') or [])}")


def _bump_seed_revision(*, dry_run: bool) -> int:
    content = SEED_FILE.read_text(encoding="utf-8")
    marker = "BUILTIN_SEED_CONTENT_REVISION = "
    for line in content.splitlines():
        if line.startswith(marker):
            current = int(line.split("=", 1)[1].strip())
            break
    else:
        raise SystemExit("BUILTIN_SEED_CONTENT_REVISION not found in seed.py")
    new_rev = current + 1
    if dry_run:
        print(f"  [dry-run] would bump BUILTIN_SEED_CONTENT_REVISION {current} -> {new_rev}")
        return new_rev
    updated = content.replace(
        f"{marker}{current}",
        f"{marker}{new_rev}",
        1,
    )
    SEED_FILE.write_text(updated, encoding="utf-8")
    print(f"  bumped BUILTIN_SEED_CONTENT_REVISION {current} -> {new_rev}")
    return new_rev


def sync_one(
    db,
    *,
    dashboard: Dashboard,
    template_key: str,
    dry_run: bool,
) -> bool:
    filename = TEMPLATE_LAYOUT_FILES.get(template_key)
    if not filename:
        print(f"  SKIP {dashboard.slug}: no layout file for {template_key}")
        return False
    template = db.scalar(
        select(DashboardTemplate).where(DashboardTemplate.template_key == template_key),
    )
    if template is None:
        print(f"  SKIP {dashboard.slug}: template missing {template_key}")
        return False

    payload = _export_payload(dashboard)
    widgets = len(payload["layoutJson"].get("widgets") or [])
    print(f"  sync {dashboard.name} ({dashboard.slug}) -> {template_key} widgets={widgets}")

    if not dry_run:
        template.layout_json = payload["layoutJson"]
        template.content_revision = max(template.content_revision, 0) + 1
        template.status = "published"
        template.visibility = "builtin"
        if payload.get("name"):
            template.name = payload["name"]

    _write_layout_file(filename, payload, dry_run=dry_run)
    return True


def soft_delete_workspace_dashboards(db, *, dry_run: bool) -> int:
    now = datetime.now(UTC)
    rows = db.scalars(
        select(Dashboard).where(
            Dashboard.slug.in_(WORKSPACE_INSTANCE_SLUGS),
            Dashboard.deleted_at.is_(None),
        ),
    ).all()
    for row in rows:
        print(f"  delete workspace dashboard: {row.slug}")
        if not dry_run:
            row.deleted_at = now
    return len(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync workspace dashboards to viz templates")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--skip-seed-bump", action="store_true", help="Do not bump seed.py revision")
    args = parser.parse_args()

    session = get_meta_session()
    synced = 0
    try:
        print("=== sync dashboards -> templates ===")
        for spec in WORKSPACE_INSTANCE_SPECS:
            dash = _resolve_dashboard_for_spec(session, spec)
            if dash is None:
                print(f"  SKIP missing dashboard slug={spec['slug']}")
                continue
            if sync_one(
                session,
                dashboard=dash,
                template_key=spec["template_key"],
                dry_run=args.dry_run,
            ):
                synced += 1

        for extra in EXTRA_DASHBOARD_SPECS:
            dash = session.scalar(
                select(Dashboard).where(
                    Dashboard.id == extra["dashboard_id"],
                    Dashboard.deleted_at.is_(None),
                ),
            )
            if dash is None:
                print(f"  SKIP missing extra dashboard id={extra['dashboard_id']}")
                continue
            if sync_one(
                session,
                dashboard=dash,
                template_key=extra["template_key"],
                dry_run=args.dry_run,
            ):
                synced += 1

        print("=== soft-delete workspace dashboard copies ===")
        deleted = soft_delete_workspace_dashboards(session, dry_run=args.dry_run)
        print(f"  workspace dashboards marked deleted: {deleted}")

        print("=== bump seed revision ===")
        if args.skip_seed_bump:
            print("  skipped (--skip-seed-bump)")
        else:
            _bump_seed_revision(dry_run=args.dry_run)

        if not args.dry_run:
            session.commit()
        print(f"DONE synced={synced} deleted_workspaces={deleted}")
        return 0 if synced > 0 else 1
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
