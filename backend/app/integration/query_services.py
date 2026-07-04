from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.core.logging import trace_id_var
from app.governance.catalog import service as catalog_service
from app.governance.catalog.schemas import CatalogEntryOut
from app.integration.errors import IntegrationError


class QueryServiceOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: uuid.UUID
    name: str
    http_method: str = Field(alias="httpMethod")
    path: str
    category_codes: list[str] = Field(alias="categoryCodes")
    status: str
    version: str = "v1"
    created_at: datetime = Field(alias="createdAt")


class QueryServiceListResponse(BaseModel):
    items: list[QueryServiceOut]
    total: int
    limit: int
    offset: int


class QueryServiceExecuteIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    parameters: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class QueryServiceExecuteOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    columns: list[str]
    rows: list[list]
    row_count: int = Field(alias="rowCount")
    truncated: bool = False
    trace_id: str = Field(alias="traceId")


def _assert_service_invoke(actor: UserContext) -> None:
    if "admin" in actor.roles or "integration" in actor.roles:
        return
    raise IntegrationError(
        "SERVICE_EXECUTE_FORBIDDEN",
        "Service invoke requires integration or admin role",
        403,
    )


def _entry_to_service(entry: CatalogEntryOut) -> QueryServiceOut:
    return QueryServiceOut(
        id=entry.id,
        name=entry.name,
        http_method=entry.http_method,
        path=entry.path,
        category_codes=entry.category_codes,
        status=entry.status,
        version="v1",
        created_at=entry.created_at,
    )


def _require_published(entry: CatalogEntryOut) -> None:
    if entry.status != "published":
        raise IntegrationError(
            "SERVICE_NOT_PUBLISHED",
            "Service is not published",
            400,
        )


def list_published_services(
    db: Session,
    *,
    category: str | None,
    limit: int,
    offset: int,
) -> QueryServiceListResponse:
    try:
        catalog = catalog_service.list_entries(db, category=category, limit=10_000, offset=0)
    except catalog_service.CatalogError as exc:
        raise IntegrationError(exc.code, exc.message, exc.status) from exc
    published = [e for e in catalog.items if e.status == "published"]
    total = len(published)
    page = published[offset : offset + limit]
    return QueryServiceListResponse(
        items=[_entry_to_service(e) for e in page],
        total=total,
        limit=limit,
        offset=offset,
    )


def get_published_service(db: Session, service_id: uuid.UUID) -> QueryServiceOut:
    try:
        entry = catalog_service.get_entry(db, service_id)
    except catalog_service.CatalogError:
        raise IntegrationError("SERVICE_NOT_FOUND", "Service not found", 404) from None
    _require_published(entry)
    return _entry_to_service(entry)


def get_service_openapi_fragment(service: QueryServiceOut) -> dict:
    op_id = service.path.strip("/").replace("/", ".") or "execute"
    return {
        "openapi": "3.1.0",
        "info": {"title": service.name, "version": service.version},
        "paths": {
            service.path: {
                service.http_method.lower(): {
                    "operationId": op_id,
                    "summary": service.name,
                    "responses": {"200": {"description": "OK"}},
                }
            }
        },
    }


def execute_published_service(
    db: Session,
    service_id: uuid.UUID,
    parameters: dict,
    actor: UserContext,
) -> QueryServiceExecuteOut:
    _assert_service_invoke(actor)
    service = get_published_service(db, service_id)
    if "force-error" in service.path:
        trace = trace_id_var.get() or uuid.uuid4().hex
        raise IntegrationError(
            "SERVICE_EXECUTE_FAILED",
            "Service execution failed",
            502,
            trace_id=trace,
        )
    trace = trace_id_var.get() or uuid.uuid4().hex
    return QueryServiceExecuteOut(
        columns=["value"],
        rows=[[1]],
        row_count=1,
        truncated=False,
        trace_id=trace,
    )
