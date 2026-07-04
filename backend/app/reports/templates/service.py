from __future__ import annotations

from app.reports.templates.errors import TemplateDefError
from app.reports.templates.schemas import (
    TemplateBlock,
    TemplateDefinitionIn,
    TemplateDefinitionOut,
    TemplateValidateOut,
)

_VALID_BLOCKS = frozenset({"sql", "table", "chart"})
_store: dict[str, dict] = {}


def _validate_block(block: TemplateBlock) -> None:
    if block.block_type not in _VALID_BLOCKS:
        raise TemplateDefError("RPT_TEMPLATE_INVALID_BLOCK", "Invalid blockType", 422)
    if block.block_type == "sql" and not (block.query_ref and block.query_ref.strip()):
        raise TemplateDefError("RPT_TEMPLATE_INVALID_BLOCK", "sql block requires queryRef", 422)
    if block.block_type == "table" and not (block.table_ref and block.table_ref.strip()):
        raise TemplateDefError("RPT_TEMPLATE_INVALID_BLOCK", "table block requires tableRef", 422)
    if block.block_type == "chart" and block.chart_type is None:
        raise TemplateDefError("RPT_TEMPLATE_INVALID_BLOCK", "chart block requires chartType", 422)


def _validate_definition(payload: TemplateDefinitionIn) -> TemplateDefinitionIn:
    if not payload.blocks:
        raise TemplateDefError("RPT_TEMPLATE_EMPTY_BLOCKS", "blocks must not be empty", 422)
    for block in payload.blocks:
        _validate_block(block)
    return payload


def validate_template_definition(payload: TemplateDefinitionIn) -> TemplateValidateOut:
    item = _validate_definition(payload)
    return TemplateValidateOut(valid=True, template_key=item.template_key, block_count=len(item.blocks))


def upsert_template_definition(key: str, payload: TemplateDefinitionIn) -> TemplateDefinitionOut:
    if key != payload.template_key:
        raise TemplateDefError("RPT_TEMPLATE_KEY_MISMATCH", "path template_key mismatch", 422)
    item = _validate_definition(payload)
    _store[key] = item.model_dump(by_alias=True, mode="json")
    return TemplateDefinitionOut.model_validate(_store[key])


def get_template_definition(key: str) -> TemplateDefinitionOut:
    if key not in _store:
        raise TemplateDefError("RPT_TEMPLATE_NOT_FOUND", f"templateKey not found: {key}", 404)
    return TemplateDefinitionOut.model_validate(_store[key])
