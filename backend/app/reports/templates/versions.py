"""Template version publish and history."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.datasources.models import get_meta_engine
from app.reports.contract import TemplateLifecycle
from app.reports.persistence import template_repo
from app.reports.persistence.models import ReportTemplateDefinition, ReportTemplateVersion
from app.reports.templates.errors import TemplateDefError

_MEMORY_VERSIONS: dict[str, list[dict]] = {}


def _next_version(db: Session, template_key: str) -> int:
    current = db.scalar(
        select(func.max(ReportTemplateVersion.version)).where(
            ReportTemplateVersion.template_key == template_key,
        ),
    )
    return int(current or 0) + 1


def publish(template_key: str, actor: UserContext, *, change_note: str | None = None) -> dict:
    raw = template_repo.get_template(template_key)
    if raw is None:
        raise TemplateDefError("RPT_TEMPLATE_NOT_FOUND", "Template not found", 404)
    payload = dict(raw)
    try:
        with Session(bind=get_meta_engine()) as db:
            version = _next_version(db, template_key)
            db.add(ReportTemplateVersion(
                template_key=template_key,
                version=version,
                payload=payload,
                change_note=change_note,
                created_by=actor.id,
            ))
            model = db.get(ReportTemplateDefinition, template_key)
            if model is not None:
                model.lifecycle = TemplateLifecycle.PUBLISHED.value
                model.published_version = version
            db.commit()
            return {
                "templateKey": template_key,
                "version": version,
                "lifecycle": TemplateLifecycle.PUBLISHED.value,
            }
    except Exception:
        versions = _MEMORY_VERSIONS.setdefault(template_key, [])
        version = len(versions) + 1
        versions.append({"version": version, "payload": payload, "changeNote": change_note})
        return {
            "templateKey": template_key,
            "version": version,
            "lifecycle": TemplateLifecycle.PUBLISHED.value,
        }


def list_versions(template_key: str) -> dict:
    try:
        with Session(bind=get_meta_engine()) as db:
            rows = db.scalars(
                select(ReportTemplateVersion)
                .where(ReportTemplateVersion.template_key == template_key)
                .order_by(ReportTemplateVersion.version.desc()),
            ).all()
            return {
                "items": [
                    {
                        "version": row.version,
                        "changeNote": row.change_note,
                        "createdBy": row.created_by,
                        "createdAt": row.created_at.isoformat() if row.created_at else "",
                    }
                    for row in rows
                ],
                "total": len(rows),
            }
    except Exception:
        versions = _MEMORY_VERSIONS.get(template_key, [])
        return {"items": versions, "total": len(versions)}
