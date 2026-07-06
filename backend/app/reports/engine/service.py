from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.datasources.models import get_meta_engine
from app.reports.catalog import service as catalog_service
from app.reports.catalog.schemas import CatalogNodeOut
from app.reports.engine import acl as engine_acl
from app.reports.engine import execute as engine_execute
from app.reports.engine.errors import RPT_ENGINE_DATASOURCE_REQUIRED, RPT_ENGINE_INVALID_PARAMETER, ReportEngineError
from app.reports.engine.schemas import EngineRenderSpec, ExportHookOut, QueryMeta, RenderRunIn, RenderRunOut
from app.reports.errors import ReportExtensionError
from app.reports.extension import service as extension_service

_SUPPORTED_FORMATS = frozenset({"web", "html"})
_EXPORT_KINDS = frozenset({"word", "excel", "pdf"})


def build_engine_render_spec(node: CatalogNodeOut, parameters: dict[str, Any], fmt: str) -> EngineRenderSpec:
    return EngineRenderSpec(
        templateNodeId=node.id,
        engineVersion="1.0",
        format=fmt,
        sections=[{"kind": "table", "placeholder": True}],
        parameters=parameters,
        renderedAt=datetime.now(UTC),
    )


def _build_export_hook(node: CatalogNodeOut) -> ExportHookOut:
    kind = node.template_kind or "pdf"
    return ExportHookOut(
        integrationPath=f"/api/v1/reports/export?templateId={node.id}&format={kind}",
        format=kind,
        placeholder=True,
    )


def _assert_extension_when_kind(node: CatalogNodeOut) -> None:
    if not node.template_kind:
        return
    try:
        extension_service.get_extension(node.id)
    except ReportExtensionError:
        raise ReportEngineError(
            "RPT_ENGINE_INCOMPLETE_TEMPLATE",
            "Template requires extension configuration",
            422,
        ) from None


def _validate_parameters(parameters: dict) -> dict:
    for key in parameters:
        if not isinstance(key, str):
            raise ReportEngineError(RPT_ENGINE_INVALID_PARAMETER, "parameter keys must be strings", 422)
        if key == "__proto__":
            raise ReportEngineError(RPT_ENGINE_INVALID_PARAMETER, "reserved parameter key", 422)
    return parameters


def run_template(template_id: uuid.UUID, payload: RenderRunIn, actor: UserContext) -> RenderRunOut:
    engine_acl.assert_engine_run_access(actor, template_id)
    parameters = _validate_parameters(payload.parameters or {})

    try:
        node = catalog_service.get_node(template_id)
    except Exception as exc:
        from app.reports.catalog.errors import ReportCatalogError

        if isinstance(exc, ReportCatalogError) and exc.code == "RPT_CATALOG_NODE_NOT_FOUND":
            raise ReportEngineError(
                "RPT_ENGINE_TEMPLATE_NOT_FOUND",
                "Report template not found",
                404,
            ) from exc
        raise

    if node.node_type != "template":
        raise ReportEngineError("RPT_ENGINE_NOT_TEMPLATE", "Node is not a template", 422)

    _assert_extension_when_kind(node)

    if node.template_kind in _EXPORT_KINDS and payload.format == node.template_kind:
        spec = build_engine_render_spec(node, parameters, payload.format)
        export_hook = _build_export_hook(node)
        return RenderRunOut(status="ready", renderSpec=spec, queryMeta=None, exportHook=export_hook)

    if payload.format == "pdf" and node.template_kind not in _EXPORT_KINDS:
        raise ReportEngineError(
            "RPT_ENGINE_FORMAT_NOT_SUPPORTED",
            "PDF render is not supported in L1",
            422,
        )
    if payload.format not in _SUPPORTED_FORMATS:
        raise ReportEngineError("RPT_ENGINE_FORMAT_NOT_SUPPORTED", "Unsupported format", 422)

    ds_id = payload.data_source_id
    has_extension = False
    try:
        ext = extension_service.get_extension(template_id)
        has_extension = True
    except ReportExtensionError:
        ext = None

    if has_extension and ds_id is None:
        raise ReportEngineError(
            RPT_ENGINE_DATASOURCE_REQUIRED,
            "dataSourceId required when template has extension metrics",
            422,
        )

    export_hook: ExportHookOut | None = None
    if node.template_kind in _EXPORT_KINDS:
        export_hook = _build_export_hook(node)

    query_meta: QueryMeta | None = None
    if ds_id is not None and ext is not None:
        with Session(bind=get_meta_engine()) as db:
            sections, elapsed = engine_execute.build_sections_from_extension(
                db, actor, ext, ds_id, parameters,
            )
        spec = EngineRenderSpec(
            templateNodeId=node.id,
            engineVersion="1.0",
            format=payload.format,
            sections=sections,
            parameters=parameters,
            renderedAt=datetime.now(UTC),
        )
        query_meta = QueryMeta(sectionCount=len(sections), elapsedMs=round(elapsed, 2))
    else:
        spec = build_engine_render_spec(node, parameters, payload.format)

    return RenderRunOut(status="ready", renderSpec=spec, queryMeta=query_meta, exportHook=export_hook)
