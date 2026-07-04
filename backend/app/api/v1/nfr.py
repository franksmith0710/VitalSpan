from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.auth.deps import UserContext, get_current_user
from app.core.config import get_settings
from app.core.nfr.browser_matrix import probe_browser_support
from app.core.nfr.errors import NFR_RUNTIME_VIOLATION, XINCHUANG_NON_COMPLIANT
from app.core.nfr.runtime_guard import RuntimeComplianceError, RuntimeComplianceReport, assert_runtime_compliant, build_runtime_report
from app.core.nfr.plugin_extension import describe_registration_path, list_extension_points
from app.core.nfr.push_channels import dispatch_push_mock
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
    remediation: str | None = None


class ComplianceResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    mode: str
    overall_status: str = Field(alias="overallStatus")
    items: list[ComplianceItemOut]
    registered_xinchuang_connectors: list[str] = Field(alias="registeredXinchuangConnectors")


class BrowserMatrixItemOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str
    min_version: int = Field(alias="minVersion")
    status: str
    notes: str | None = None


class BrowserMatrixResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    items: list[BrowserMatrixItemOut]
    detected_browser: dict | None = Field(default=None, alias="detectedBrowser")
    overall_status: str = Field(alias="overallStatus")


class PushProbeIn(BaseModel):
    message: str = "probe"


class PushProbeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    status: str
    channel: str | None = None
    attempted_channels: list[str] = Field(alias="attemptedChannels")
    code: str | None = None


class RegistrationPathResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    connector_type: str = Field(alias="connectorType")
    steps: list[str]
    touches_core_registry: bool = Field(alias="touchesCoreRegistry")


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
        items=[
            ComplianceItemOut(id=i.id, status=i.status, message=i.message, remediation=i.remediation)
            for i in report.items
        ],
        registeredXinchuangConnectors=list(report.registered_xinchuang_connectors),
    )


@router.get("/browser-matrix", response_model=BrowserMatrixResponse)
def get_browser_matrix(
    _: Annotated[UserContext, Depends(get_current_user)],
    user_agent: str | None = Query(default=None, alias="userAgent"),
) -> BrowserMatrixResponse:
    report = probe_browser_support(user_agent)
    detected = None
    if report.detected_browser:
        detected = {
            "name": report.detected_browser.name,
            "majorVersion": report.detected_browser.major_version,
            "supported": report.detected_browser.supported,
            "status": report.detected_browser.status,
        }
    return BrowserMatrixResponse(
        items=[
            BrowserMatrixItemOut(name=i.name, minVersion=i.min_version, status=i.status, notes=i.notes)
            for i in report.items
        ],
        detectedBrowser=detected,
        overallStatus=report.overall_status,
    )


@router.post("/push-probe", response_model=PushProbeResponse)
def post_push_probe(
    payload: PushProbeIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> PushProbeResponse:
    result = dispatch_push_mock({"text": payload.message})
    return PushProbeResponse(
        status=result.status,
        channel=result.channel,
        attemptedChannels=list(result.attempted_channels),
        code=result.code,
    )


@router.get("/registration-path/{connector_type}", response_model=RegistrationPathResponse)
def get_registration_path(
    connector_type: str,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> RegistrationPathResponse:
    doc = describe_registration_path(connector_type)
    return RegistrationPathResponse(
        connectorType=doc.connector_type,
        steps=list(doc.steps),
        touchesCoreRegistry=doc.touches_core_registry,
    )


class RuntimeCheckItemOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    status: str
    message: str
    remediation: str | None = None


class RuntimeComplianceResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    policy_version: str = Field(alias="policyVersion")
    overall_status: str = Field(alias="overallStatus")
    zero_third_party_bi_runtime: bool = Field(alias="zeroThirdPartyBiRuntime")
    scanned_at: str = Field(alias="scannedAt")
    items: list[RuntimeCheckItemOut]


def _runtime_response(report: RuntimeComplianceReport) -> RuntimeComplianceResponse:
    return RuntimeComplianceResponse(
        policyVersion=report.policy_version,
        overallStatus=report.overall_status,
        zeroThirdPartyBiRuntime=report.zero_third_party_bi_runtime,
        scannedAt=report.scanned_at,
        items=[RuntimeCheckItemOut(id=i.id, status=i.status, message=i.message, remediation=i.remediation) for i in report.items],
    )


@router.get("/runtime-compliance", response_model=RuntimeComplianceResponse)
def get_runtime_compliance(
    _: Annotated[UserContext, Depends(get_current_user)],
) -> RuntimeComplianceResponse:
    return _runtime_response(build_runtime_report())


@router.post("/runtime-compliance/assert", response_model=None)
def post_runtime_compliance_assert(
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return _runtime_response(assert_runtime_compliant())
    except RuntimeComplianceError as exc:
        return JSONResponse(status_code=503, content={"code": NFR_RUNTIME_VIOLATION, "message": exc.message, "detail": None})
