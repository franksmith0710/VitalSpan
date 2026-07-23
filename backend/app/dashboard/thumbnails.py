from __future__ import annotations

import uuid
from pathlib import Path

from app.core.config import get_settings

THUMBNAIL_MAX_BYTES = 3 * 1024 * 1024
ALLOWED_CONTENT_TYPES = frozenset({"image/webp", "image/png", "image/jpeg"})


def resolve_data_dir() -> Path:
    """Resolve data dir against repo root, not process cwd (uvicorn often runs in backend/)."""
    configured = Path(get_settings().vitalspan_data_dir)
    if configured.is_absolute():
        return configured
    repo_root = Path(__file__).resolve().parents[3]
    return (repo_root / configured).resolve()


def thumbnail_storage_dir() -> Path:
    path = resolve_data_dir() / "dashboard-thumbnails"
    path.mkdir(parents=True, exist_ok=True)
    return path


def thumbnail_ref_for(dashboard_id: uuid.UUID, ext: str = "webp") -> str:
    return f"dashboard-thumbnails/{dashboard_id}.{ext}"


def thumbnail_path_for_ref(ref: str) -> Path:
    root = resolve_data_dir()
    path = (root / ref).resolve()
    if root not in path.parents and path != root:
        raise ValueError("invalid thumbnail ref")
    return path


def write_thumbnail(dashboard_id: uuid.UUID, content: bytes, content_type: str) -> str:
    if len(content) > THUMBNAIL_MAX_BYTES:
        raise ValueError("thumbnail too large")
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError("unsupported thumbnail type")
    ext = "webp" if content_type == "image/webp" else "png" if content_type == "image/png" else "jpg"
    ref = thumbnail_ref_for(dashboard_id, ext)
    path = thumbnail_path_for_ref(ref)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return ref


def read_thumbnail_bytes(ref: str) -> tuple[bytes, str]:
    path = thumbnail_path_for_ref(ref)
    if not path.is_file():
        raise FileNotFoundError(ref)
    ext = path.suffix.lower()
    media = {
        ".webp": "image/webp",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }.get(ext, "application/octet-stream")
    return path.read_bytes(), media
