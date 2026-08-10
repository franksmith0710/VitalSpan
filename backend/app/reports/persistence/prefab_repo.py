"""Prefab binding persistence."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.datasources.models import get_meta_engine
from app.reports.persistence import memory_stores
from app.reports.persistence.models import ReportPrefabBinding


def _use_db(settings: Settings | None = None) -> bool:
    return (settings or get_settings()).rpt_metadata_store == "db"


def all_bindings() -> dict[str, dict]:
    if not _use_db():
        return memory_stores.prefab_bindings
    with Session(bind=get_meta_engine()) as db:
        models = db.scalars(select(ReportPrefabBinding)).all()
        return {m.binding_key: dict(m.payload) for m in models}


def get_binding(key: str) -> dict | None:
    if not _use_db():
        return memory_stores.prefab_bindings.get(key)
    with Session(bind=get_meta_engine()) as db:
        model = db.get(ReportPrefabBinding, key)
        return dict(model.payload) if model else None


def save_binding(key: str, payload: dict) -> None:
    if not _use_db():
        memory_stores.prefab_bindings[key] = dict(payload)
        return
    with Session(bind=get_meta_engine()) as db:
        model = db.get(ReportPrefabBinding, key)
        if model is None:
            db.add(ReportPrefabBinding(binding_key=key, payload=payload))
        else:
            model.payload = payload
        db.commit()


def delete_binding(key: str) -> bool:
    if not _use_db():
        if key not in memory_stores.prefab_bindings:
            return False
        del memory_stores.prefab_bindings[key]
        return True
    with Session(bind=get_meta_engine()) as db:
        model = db.get(ReportPrefabBinding, key)
        if model is None:
            return False
        db.delete(model)
        db.commit()
        return True
