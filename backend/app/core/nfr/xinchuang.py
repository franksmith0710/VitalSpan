from __future__ import annotations

import importlib.util
from dataclasses import dataclass

from app.core.config import Settings, get_settings
from app.core.nfr.errors import XINCHUANG_NON_COMPLIANT
from app.core.nfr.plugin_extension import PLUGIN_EXTENSION_POINTS
from app.datasources.registry import registry

_XINCHUANG_DB_TYPES = frozenset({"gbase", "dm", "gaussdb", "kingbase"})
_FORBIDDEN_MODULES = frozenset({"superset", "dataease"})


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
    return ComplianceReport(
        mode=settings.xinchuang_mode,
        overall_status=overall,
        items=tuple(items),
        registered_xinchuang_connectors=tuple(xc_registered),
    )


def assert_xinchuang_compliant(settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    if settings.xinchuang_mode != "strict":
        return
    report = build_compliance_report(settings)
    if report.overall_status == "non_compliant":
        raise XinchuangComplianceError(XINCHUANG_NON_COMPLIANT, "xinchuang compliance check failed")
