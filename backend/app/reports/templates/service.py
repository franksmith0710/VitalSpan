from __future__ import annotations

from app.auth.deps import UserContext
from app.reports.templates.acl import assert_template_read_access, assert_template_write_access
from app.reports.templates.errors import TemplateDefError
from app.reports.templates.schemas import (
    ExportHookOut,
    TemplateBlock,
    TemplateDefinitionIn,
    TemplateDefinitionOut,
    TemplateValidateOut,
)

_VALID_BLOCKS = frozenset({"sql", "table", "chart"})
_VALID_CHART_TYPES = frozenset({"line", "bar", "pie"})
_store: dict[str, dict] = {}


def _default_storage_ref(key: str, fmt: str) -> str:
    return f"mock://templates/{key}.{fmt}"


def build_export_hook(template_key: str, fmt: str, *, node_id: str | None = None) -> ExportHookOut:
    nid = node_id if node_id else template_key
    return ExportHookOut(
        integrationPath=f"/api/v1/reports/export?templateId={nid}&format={fmt}",
        format=fmt,  # type: ignore[arg-type]
        placeholder=False,
    )


def _with_export_hook(raw: dict) -> TemplateDefinitionOut:
    key = raw["templateKey"]
    fmt = raw["format"]
    storage = raw.get("storageRef") or _default_storage_ref(key, fmt)
    hook = build_export_hook(key, fmt)
    return TemplateDefinitionOut.model_validate(
        {**raw, "storageRef": storage, "exportHook": hook.model_dump(by_alias=True)},
    )


def _block_identity(block: TemplateBlock) -> tuple[str, str]:
    if block.block_type == "sql":
        return block.block_type, block.query_ref or ""
    if block.block_type == "table":
        return block.block_type, block.table_ref or ""
    return block.block_type, block.chart_type or ""


def _validate_block(block: TemplateBlock) -> None:
    if block.block_type not in _VALID_BLOCKS:
        raise TemplateDefError("RPT_TEMPLATE_INVALID_BLOCK", "Invalid blockType", 422)
    if block.block_type == "sql" and not (block.query_ref and block.query_ref.strip()):
        raise TemplateDefError("RPT_TEMPLATE_INVALID_BLOCK", "sql block requires queryRef", 422)
    if block.block_type == "table" and not (block.table_ref and block.table_ref.strip()):
        raise TemplateDefError("RPT_TEMPLATE_INVALID_BLOCK", "table block requires tableRef", 422)
    if block.block_type == "chart":
        if block.chart_type is None:
            raise TemplateDefError("RPT_TEMPLATE_INVALID_BLOCK", "chart block requires chartType", 422)
        if block.chart_type not in _VALID_CHART_TYPES:
            raise TemplateDefError("RPT_TEMPLATE_INVALID_BLOCK", "Invalid chartType", 422)


def _validate_definition(payload: TemplateDefinitionIn) -> TemplateDefinitionIn:
    if not payload.blocks:
        raise TemplateDefError("RPT_TEMPLATE_EMPTY_BLOCKS", "blocks must not be empty", 422)
    seen: set[tuple[str, str]] = set()
    for block in payload.blocks:
        _validate_block(block)
        identity = _block_identity(block)
        if identity in seen:
            raise TemplateDefError(
                "RPT_TEMPLATE_DUPLICATE_BLOCK",
                "Duplicate block in template",
                422,
                [{"field": "blocks", "message": "duplicate block"}],
            )
        seen.add(identity)
    return payload


def validate_template_definition(payload: TemplateDefinitionIn) -> TemplateValidateOut:
    item = _validate_definition(payload)
    return TemplateValidateOut(valid=True, template_key=item.template_key, block_count=len(item.blocks))


def upsert_template_definition(
    key: str, payload: TemplateDefinitionIn, actor: UserContext,
) -> TemplateDefinitionOut:
    assert_template_write_access(actor, key)
    if key != payload.template_key:
        raise TemplateDefError("RPT_TEMPLATE_KEY_MISMATCH", "path template_key mismatch", 422)
    item = _validate_definition(payload)
    _store[key] = item.model_dump(by_alias=True, mode="json")
    return _with_export_hook(_store[key])


def get_template_definition(key: str, actor: UserContext) -> TemplateDefinitionOut:
    assert_template_read_access(actor, key)
    if key not in _store:
        raise TemplateDefError("RPT_TEMPLATE_NOT_FOUND", f"templateKey not found: {key}", 404)
    return _with_export_hook(_store[key])


def list_template_definitions(actor: UserContext, prefix: str | None = None) -> list[TemplateDefinitionOut]:
    assert_template_read_access(actor, "*")
    items = [_with_export_hook(v) for v in _store.values()]
    if prefix:
        items = [i for i in items if i.template_key.startswith(prefix)]
    return sorted(items, key=lambda x: x.template_key)


def delete_template_definition(key: str, actor: UserContext) -> None:
    assert_template_write_access(actor, key)
    if key not in _store:
        raise TemplateDefError("RPT_TEMPLATE_NOT_FOUND", f"templateKey not found: {key}", 404)
    from app.reports.catalog import service as catalog_service

    if catalog_service.count_nodes_by_template_key(key) > 0:
        raise TemplateDefError("RPT_TEMPLATE_IN_USE", "Template is referenced by catalog", 409)
    del _store[key]
