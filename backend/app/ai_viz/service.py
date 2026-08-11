from __future__ import annotations

import hashlib
import uuid

from sqlalchemy.orm import Session

from app.ai_viz.errors import AiVizError
from app.ai_viz.models import AiVizArtifact, validate_bundle_files
from app.ai_viz.schemas import AiVizArtifactCreateIn, AiVizArtifactOut
from app.auth.deps import UserContext


def _content_hash(files: dict[str, str]) -> str:
    digest = hashlib.sha256()
    for key in sorted(files):
        digest.update(key.encode())
        digest.update(files[key].encode("utf-8"))
    return digest.hexdigest()


def create_artifact(db: Session, payload: AiVizArtifactCreateIn, actor: UserContext) -> AiVizArtifactOut:
    entry = payload.manifest.entry or "index.html"
    validate_bundle_files(payload.files, entry)
    manifest_dict = payload.manifest.model_dump(by_alias=True)
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
    return AiVizArtifactOut(
        artifactId=row.id,
        manifest=row.manifest_json,
        status=row.status,
        contentHash=row.content_hash,
    )


def get_artifact(db: Session, artifact_id: uuid.UUID, actor: UserContext) -> AiVizArtifact:
    row = db.get(AiVizArtifact, artifact_id)
    if row is None:
        raise AiVizError("AIVIZ_NOT_FOUND", "artifact not found", 404)
    if row.owner_user_id and str(row.owner_user_id) != actor.id:
        raise AiVizError("AIVIZ_FORBIDDEN", "artifact access denied", 403)
    return row


def get_entry_html(db: Session, artifact_id: uuid.UUID, actor: UserContext) -> str:
    row = get_artifact(db, artifact_id, actor)
    entry = row.manifest_json.get("entry") or "index.html"
    html = row.files_json.get(entry)
    if not isinstance(html, str):
        raise AiVizError("AIVIZ_MISSING_ENTRY", "entry file missing", 422)
    return html
