from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.auth.deps import UserContext, get_current_user
from app.core.config import get_settings
from app.core.nfr.errors import XINCHUANG_NON_COMPLIANT
from app.core.nfr.plugin_extension import list_extension_points
from app.core.nfr.push_config import PushConfigValidationError, resolve_push_mode
from app.core.nfr.xinchuang import XinchuangComplianceError, assert_xinchuang_compliant, build_compliance_report

router = APIRouter(prefix="/nfr", tags=["nfr"])


class ExtensionPointOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    description: str


class ExtensionPointListResponse(BaseModel):
    items: list[ExtensionPointOut]


class PushConfigResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    browser_enabled: bool = Field(alias="browserEnabled")
    wecom_configured: bool = Field(alias="wecomConfigured")
    dingtalk_configured: bool = Field(alias="dingtalkConfigured")
    delivery_mode: str = Field(alias="deliveryMode")
    degraded_reason: str | None = Field(default=None, alias="degradedReason")


class ComplianceItemOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    status: str
    message: str


class ComplianceResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    mode: str
    overall_status: str = Field(alias="overallStatus")
    items: list[ComplianceItemOut]
    registered_xinchuang_connectors: list[str] = Field(alias="registeredXinchuangConnectors")


@router.get("/plugin-extension-points", response_model=ExtensionPointListResponse)
def get_plugin_extension_points(
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ExtensionPointListResponse:
    return ExtensionPointListResponse(
        items=[ExtensionPointOut(id=p.id, description=p.description) for p in list_extension_points()]
    )


@router.get("/push-config", response_model=PushConfigResponse)
def get_push_config(
    _: Annotated[UserContext, Depends(get_current_user)],
) -> PushConfigResponse | JSONResponse:
    try:
        out = resolve_push_mode()
    except PushConfigValidationError as exc:
        return JSONResponse(status_code=422, content={"code": exc.code, "message": exc.message, "detail": None})
    return PushConfigResponse(
        browserEnabled=out.browser_enabled,
        wecomConfigured=out.wecom_configured,
        dingtalkConfigured=out.dingtalk_configured,
        deliveryMode=out.delivery_mode,
        degradedReason=out.degraded_reason,
    )


@router.get("/xinchuang/compliance", response_model=ComplianceResponse)
def get_xinchuang_compliance(
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ComplianceResponse | JSONResponse:
    settings = get_settings()
    try:
        assert_xinchuang_compliant(settings)
    except XinchuangComplianceError as exc:
        return JSONResponse(
            status_code=422,
            content={"code": XINCHUANG_NON_COMPLIANT, "message": exc.message, "detail": None},
        )
    report = build_compliance_report(settings)
    return ComplianceResponse(
        mode=report.mode,
        overallStatus=report.overall_status,
        items=[ComplianceItemOut(id=i.id, status=i.status, message=i.message) for i in report.items],
        registeredXinchuangConnectors=list(report.registered_xinchuang_connectors),
    )
