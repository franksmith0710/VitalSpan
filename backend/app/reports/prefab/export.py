from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.reports.prefab.errors import PrefabError
from app.reports.prefab.run import run_prefab_binding
from app.reports.prefab.schemas import PrefabRunIn
from app.reports.prefab import service as prefab_service
from app.reports.render.render_from_spec import content_type_for, render_document

_VALID_FORMATS = frozenset({"pdf", "word", "excel"})


def export_prefab_binding_bytes(
    db: Session,
    binding_key: str,
    fmt: str,
    payload: PrefabRunIn,
    user: UserContext,
) -> tuple[bytes, str, str]:
    if fmt not in _VALID_FORMATS:
        raise PrefabError(
            "RPT_PREFAB_EXPORT_INVALID_FORMAT",
            "Invalid export format; use pdf, word, or excel",
            422,
            [{"field": "format", "message": "must be pdf|word|excel"}],
        )
    binding = prefab_service.get_prefab_binding(binding_key, user)
    run_out = run_prefab_binding(db, binding_key, payload, user)
    data = render_document(run_out.render_spec, fmt, title=binding.display_name)
    ext = "docx" if fmt == "word" else "xlsx" if fmt == "excel" else fmt
    safe_key = binding_key.replace("/", "-")
    return data, content_type_for(fmt), f"prefab-{safe_key}.{ext}"
