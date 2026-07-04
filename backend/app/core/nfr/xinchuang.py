from __future__ import annotations

import importlib.util
import time
from dataclasses import dataclass

from app.core.config import Settings, get_settings
from app.core.nfr.errors import NFR_PROBE_TIMEOUT, XINCHUANG_NON_COMPLIANT
from app.core.nfr.plugin_extension import PLUGIN_EXTENSION_POINTS
from app.datasources.registry import registry

_XINCHUANG_DB_TYPES = frozenset({"gbase", "dm", "gaussdb", "kingbase"})
_FORBIDDEN_MODULES = frozenset({"superset", "dataease"})

_REMEDIATION: dict[str, str] = {
    "xc-db-connector": "Register xinchuang dialect via register_connector_plugin (e.g. gbase, dm, gaussdb)",
    "xc-platform-db": "Set DATABASE_URL to postgresql:// or sqlite+ for dev",
    "xc-forbidden-runtime": "Remove superset/dataease from runtime dependencies",
    "xc-connector-plugin": "Declare PLUGIN_EXTENSION_POINTS in plugin_extension module",
}


class XinchuangComplianceError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


@dataclass(frozen=True)
class XinchuangChecklistItem:
    id: str
    status: str  # pass|fail|warn
    message: str
    remediation: str | None = None


@dataclass(frozen=True)
class ComplianceProbeResult:
    probe_status: str  # ok|timeout
    elapsed_ms: float
    report: ComplianceReport | None
    code: str | None = None


@dataclass(frozen=True)
class ComplianceReport:
    mode: str
    overall_status: str  # compliant|non_compliant|degraded
    items: tuple[XinchuangChecklistItem, ...]
    registered_xinchuang_connectors: tuple[str, ...]


def _registered_xinchuang() -> list[str]:
    return sorted(t.type for t in registry.list_types() if t.type in _XINCHUANG_DB_TYPES)


def _check_platform_db(settings: Settings) -> XinchuangChecklistItem:
    url = settings.database_url
    if url.startswith(("postgresql://", "postgresql+psycopg://", "sqlite+")):
        return XinchuangChecklistItem("xc-platform-db", "pass", "platform meta db protocol ok")
    return XinchuangChecklistItem("xc-platform-db", "fail", f"non-compliant platform db: {url.split(':', 1)[0]}")


def _with_remediation(item: XinchuangChecklistItem) -> XinchuangChecklistItem:
    if item.status != "fail":
        return item
    return XinchuangChecklistItem(
        item.id, item.status, item.message, _REMEDIATION.get(item.id, item.message)
    )


def enumerate_non_compliant(report: ComplianceReport) -> list[XinchuangChecklistItem]:
    return [i for i in report.items if i.status == "fail"]


def probe_compliance_non_blocking(
    settings: Settings | None = None, max_ms: int = 100
) -> ComplianceProbeResult:
    settings = settings or get_settings()
    started = time.perf_counter()
    report = build_compliance_report(settings)
    elapsed_ms = (time.perf_counter() - started) * 1000
    if elapsed_ms >= max_ms:
        return ComplianceProbeResult("timeout", elapsed_ms, None, NFR_PROBE_TIMEOUT)
    return ComplianceProbeResult("ok", elapsed_ms, report, None)


def _check_forbidden_runtime() -> XinchuangChecklistItem:
    for name in _FORBIDDEN_MODULES:
        if importlib.util.find_spec(name) is not None:
            return XinchuangChecklistItem("xc-forbidden-runtime", "fail", f"forbidden module loaded: {name}")
    return XinchuangChecklistItem("xc-forbidden-runtime", "pass", "no forbidden BI runtime modules")


def build_compliance_report(settings: Settings | None = None) -> ComplianceReport:
    settings = settings or get_settings()
    xc_registered = _registered_xinchuang()
    items = [
        XinchuangChecklistItem(
            "xc-db-connector",
            "pass" if xc_registered else "fail",
            "xinchuang db connectors registered" if xc_registered else "no xinchuang connector registered",
        ),
        _check_platform_db(settings),
        _check_forbidden_runtime(),
        XinchuangChecklistItem(
            "xc-connector-plugin",
            "pass" if PLUGIN_EXTENSION_POINTS else "fail",
            "plugin extension points declared",
        ),
    ]
    fails = [i for i in items if i.status == "fail"]
    warns = [i for i in items if i.status == "warn"]
    if fails:
        overall = "non_compliant"
    elif warns:
        overall = "degraded"
    else:
        overall = "compliant"
    remediated = tuple(_with_remediation(i) for i in items)
    return ComplianceReport(
        mode=settings.xinchuang_mode,
        overall_status=overall,
        items=remediated,
        registered_xinchuang_connectors=tuple(xc_registered),
    )


def assert_xinchuang_compliant(settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    if settings.xinchuang_mode != "strict":
        return
    report = build_compliance_report(settings)
    if report.overall_status == "non_compliant":
        raise XinchuangComplianceError(XINCHUANG_NON_COMPLIANT, "xinchuang compliance check failed")
