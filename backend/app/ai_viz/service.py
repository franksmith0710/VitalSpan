from __future__ import annotations

import hashlib
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai_viz.errors import AiVizError
from app.ai_viz.models import AiVizArtifact, validate_bundle_files, validate_manifest
from app.ai_viz.schemas import (
    AiVizArtifactBundleOut,
    AiVizArtifactCreateIn,
    AiVizArtifactOut,
    AiVizArtifactReferenceOut,
    AiVizArtifactReferencesOut,
    AiVizComplianceWarningOut,
)
from app.dashboard.models import Dashboard
from app.ai_viz.style_compliance import (
    collect_bundle_style_compliance_warnings,
    resolve_style_compliance_tier,
)
from app.auth.deps import UserContext


def _content_hash(files: dict[str, str]) -> str:
    digest = hashlib.sha256()
    for key in sorted(files):
        digest.update(key.encode())
        digest.update(files[key].encode("utf-8"))
    return digest.hexdigest()


def create_artifact(db: Session, payload: AiVizArtifactCreateIn, actor: UserContext) -> AiVizArtifactOut:
    entry = payload.manifest.entry or "index.html"
    manifest_dict = payload.manifest.model_dump(by_alias=True)
    validate_manifest(manifest_dict)
    validate_bundle_files(payload.files, entry, manifest_dict)
    files = dict(payload.files)
    content_hash = _content_hash(files)
    row = AiVizArtifact(
        manifest_json=manifest_dict,
        files_json=files,
        content_hash=content_hash,
        owner_user_id=uuid.UUID(actor.id),
        status="draft",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


def _compliance_warnings(row: AiVizArtifact) -> list[AiVizComplianceWarningOut]:
    entry = row.manifest_json.get("entry") or "index.html"
    raw = collect_bundle_style_compliance_warnings(row.files_json, entry, row.manifest_json)
    return [AiVizComplianceWarningOut(code=item.code, message=item.message) for item in raw]


def _compliance_tier(row: AiVizArtifact) -> str:
    entry = row.manifest_json.get("entry") or "index.html"
    raw = collect_bundle_style_compliance_warnings(row.files_json, entry, row.manifest_json)
    return resolve_style_compliance_tier(raw, row.manifest_json)


def _to_out(row: AiVizArtifact) -> AiVizArtifactOut:
    return AiVizArtifactOut(
        artifactId=row.id,
        manifest=row.manifest_json,
        status=row.status,
        contentHash=row.content_hash,
        warnings=_compliance_warnings(row),
        styleComplianceTier=_compliance_tier(row),
    )


def update_artifact(
    db: Session,
    artifact_id: uuid.UUID,
    payload: AiVizArtifactCreateIn,
    actor: UserContext,
) -> AiVizArtifactOut:
    row = get_artifact(db, artifact_id, actor, write=True)
    entry = payload.manifest.entry or "index.html"
    manifest_dict = payload.manifest.model_dump(by_alias=True)
    validate_manifest(manifest_dict)
    validate_bundle_files(payload.files, entry, manifest_dict)
    row.manifest_json = manifest_dict
    row.files_json = dict(payload.files)
    row.content_hash = _content_hash(row.files_json)
    db.commit()
    db.refresh(row)
    return _to_out(row)


def to_artifact_out(row: AiVizArtifact) -> AiVizArtifactOut:
    return _to_out(row)


def get_artifact(
    db: Session,
    artifact_id: uuid.UUID,
    actor: UserContext,
    *,
    write: bool = False,
) -> AiVizArtifact:
    row = db.get(AiVizArtifact, artifact_id)
    if row is None:
        raise AiVizError("AIVIZ_NOT_FOUND", "artifact not found", 404)
    if write and row.owner_user_id and str(row.owner_user_id) != actor.id:
        raise AiVizError("AIVIZ_FORBIDDEN", "artifact access denied", 403)
    return row


def get_entry_html(db: Session, artifact_id: uuid.UUID, actor: UserContext) -> str:
    row = get_artifact(db, artifact_id, actor)
    entry = row.manifest_json.get("entry") or "index.html"
    html = row.files_json.get(entry)
    if not isinstance(html, str):
        raise AiVizError("AIVIZ_MISSING_ENTRY", "entry file missing", 422)
    return html


def _artifact_id_in_widget(widget: dict, artifact_id: uuid.UUID) -> str | None:
    cv = widget.get("customVizConfig") or widget.get("custom_viz_config")
    if not isinstance(cv, dict):
        return None
    ref = cv.get("artifactId") or cv.get("artifact_id")
    if ref is None:
        return None
    if str(ref) != str(artifact_id):
        return None
    wid = widget.get("id")
    return str(wid) if wid is not None else ""


def find_artifact_references(db: Session, artifact_id: uuid.UUID) -> list[AiVizArtifactReferenceOut]:
    refs: list[AiVizArtifactReferenceOut] = []
    rows = db.scalars(select(Dashboard)).all()
    for row in rows:
        layout = row.layout_json if isinstance(row.layout_json, dict) else {}
        widgets = layout.get("widgets") or []
        if not isinstance(widgets, list):
            continue
        for widget in widgets:
            if not isinstance(widget, dict):
                continue
            widget_id = _artifact_id_in_widget(widget, artifact_id)
            if widget_id is None:
                continue
            refs.append(
                AiVizArtifactReferenceOut(
                    dashboardId=row.id,
                    dashboardName=row.name,
                    widgetId=widget_id,
                )
            )
    return refs


def get_artifact_references(
    db: Session,
    artifact_id: uuid.UUID,
    actor: UserContext,
) -> AiVizArtifactReferencesOut:
    get_artifact(db, artifact_id, actor)
    return AiVizArtifactReferencesOut(
        artifactId=artifact_id,
        references=find_artifact_references(db, artifact_id),
    )


def get_artifact_bundle(
    db: Session,
    artifact_id: uuid.UUID,
    actor: UserContext,
) -> AiVizArtifactBundleOut:
    row = get_artifact(db, artifact_id, actor, write=True)
    return AiVizArtifactBundleOut(
        artifactId=row.id,
        manifest=dict(row.manifest_json),
        files=dict(row.files_json),
    )


def list_artifacts(
    db: Session,
    actor: UserContext,
    *,
    limit: int = 100,
    offset: int = 0,
) -> list[AiVizArtifactOut]:
    user_id = uuid.UUID(actor.id)
    capped = min(max(limit, 1), 200)
    stmt = (
        select(AiVizArtifact)
        .where(AiVizArtifact.owner_user_id == user_id)
        .order_by(AiVizArtifact.updated_at.desc())
        .offset(max(offset, 0))
        .limit(capped)
    )
    rows = db.scalars(stmt).all()
    return [_to_out(row) for row in rows]


def delete_artifact(db: Session, artifact_id: uuid.UUID, actor: UserContext) -> None:
    row = get_artifact(db, artifact_id, actor, write=True)
    refs = find_artifact_references(db, artifact_id)
    if refs:
        detail = [
            {
                "dashboardId": str(item.dashboard_id),
                "dashboardName": item.dashboard_name,
                "widgetId": item.widget_id,
            }
            for item in refs
        ]
        raise AiVizError(
            "AIVIZ_IN_USE",
            "组件仍被看板/大屏引用，请先移除 widget 或更换 artifactId",
            409,
            fields=detail,
        )
    db.delete(row)
    db.commit()
