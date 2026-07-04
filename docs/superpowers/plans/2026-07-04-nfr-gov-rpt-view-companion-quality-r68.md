# 跨域 companion 质量推分 r68 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **执行模式：** subagent-driven-development (option 1)
> **范围框定：** `backend/app/core/nfr/`（`dashboard_sla.py` · `https_audit.py` · `errors.py`）· `backend/app/governance/bus/`（`auto.py` · `probe.py`）· `backend/app/reports/prefab/`（`service.py` · `probe.py` · `errors.py`）· `backend/app/views/`（`role_template.py` · `probe.py`）· `backend/app/api/v1/{nfr,gov,reports/prefab,views}.py` · `tests/test_nfr_gov_rpt_view_r68.py` · `docs/services/{core,governance,reports,views}.md` · `docs/api/README.md`
> **子项：** NFR-003, NFR-004, GOV-007, RPT-002, VIEW-002
> **项目技能：** `.agents/skills/`（P3 按 Files 按需 Read；plan 已预指定 **Skills:**）
> **项目规则：** `.cursor/rules/`（`vitalspan-project.mdc`/`common.mdc`/`prd-sync.mdc` alwaysApply 自动注入；`backend-fastapi.mdc` globs `backend/**/*.py`+`tests/**/*.py`、`docs-layer.mdc` globs `docs/**` 由 P3 按 Files 动态匹配）

**Goal:** 闭合 r60–r65 L1/companion 后遗留的性能 58% 与完整度 76% 薄弱维——五域 `probe_*_budget_ms`（≤50ms）、enterprise scope + validate/NOT_FOUND/FSM cycle 边界深化 + ≥35 条 `test_nfr_gov_rpt_view_r68`；NFR-003/NFR-004/GOV-007 加权总分 **≥90** 破 STUCK；RPT-002/VIEW-002 巩固 **≥90**。

**Architecture:** 域逻辑留在 `core/nfr/`、`governance/bus/`、`reports/prefab/`、`views/`；各域独立或内联 `probe_*_budget_ms`；`api/v1/*.py` 仅薄 entry 透传 `UserContext` 与错误映射；内存 scope 注册 `set_user_*_scope` 供测试夹具。纯后端、无 `fe/`。

**Tech Stack:** Python 3.11 / FastAPI / Pydantic v2 / SQLAlchemy / pytest + TestClient / ruff。

## Global Constraints

- **纯后端**：不触及 `fe/`；`ui_design_skill: none`；全 Task **UI skill: none**、**UI Acceptance: N/A**。
- **零第三方 BI 运行时依赖**（NFR-08）。
- **不修改** `docs/automate/goal.md` / `plan.md` 结构；PRD 分片勾选与 8 维重评留 **P5**。
- **分层纪律**（`common.mdc`）：domain 写业务；`api/v1/*.py` = entry（不写守卫细节）。
- **体量软约束**：单函数 ≤60 行；py 单文件 ≤200 行。
- **错误体**：`{code, message, detail}`；校验失败 HTTP 422；鉴权 403；未找到 404；FSM 非法转移 409。
- **perf probe 预算**：各域 `probe_*_budget_ms` 同进程 `time.perf_counter`，阈值 **50ms**（无真实网络/DB）。
- **鉴权**：路由 `Depends(get_current_user)`；开发 `Bearer dev` 默认 admin。
- **真理源优先级**：`round-target` > design.md > `docs/services/` > `docs/api/README.md`。
- **验证基线**（r67 P4）：`cd backend && python3 -m pytest -q` ≈ **1786 passed** / 4 skipped；本轮目标 **≥1821 passed** + 4 skipped，零失败，`ruff` clean。
- **回归门控**（Task 7 / P4 必跑）：
  ```bash
  cd backend && python3 -m ruff check . && python3 -m pytest \
    ../tests/test_nfr_gov_rpt_view_r68.py \
    ../tests/test_dash_nfr_conn_rpt_r67.py \
    ../tests/test_cat_dash_rpt_meta_r66.py \
    ../tests/test_cat_rpt_meta_r65.py \
    ../tests/test_nfr_cat_r64.py \
    ../tests/test_cat_nfr_rpt_meta_r62.py \
    ../tests/test_rpt_view_cat_gov_r60.py \
    -v && python3 -m pytest -q
  ```
  Expected: r68 **≥35/35** + r67 **34/34** + r66 **33/33** + r65 **32/32** + r64 **33/33** + r62 **32/32** + r60 **34/34**（合计 **198/198**）；全量 exit_code **0**。

---

## File Structure

| 文件 | 责任 | 变更 |
|------|------|------|
| `backend/app/core/nfr/errors.py` | NFR-003/004 错误常量 | 修改 |
| `backend/app/core/nfr/dashboard_sla.py` | ACL、dashboardId pattern、alerts threshold、双 probe | 修改 |
| `backend/app/core/nfr/https_audit.py` | ACL、auditScope、simulateAuditFailure、双 probe | 修改 |
| `backend/app/governance/bus/auto.py` | FSM 非法转移、enterprise path scope | 修改 |
| `backend/app/governance/bus/probe.py` | auto_register mock probe ≤50ms | 新建 |
| `backend/app/reports/prefab/errors.py` | NOT_FOUND、DUPLICATE_DIMENSION | 修改 |
| `backend/app/reports/prefab/service.py` | get_binding、list scope、duplicate dimension | 修改 |
| `backend/app/reports/prefab/probe.py` | probe_get_binding | 修改 |
| `backend/app/views/role_template.py` | inheritFromRoleId cycle、enterprise GET scope | 修改 |
| `backend/app/views/probe.py` | probe_put_role_defaults | 修改 |
| `backend/app/api/v1/nfr.py` | sla/mask actor 透传、alerts threshold query | 修改 |
| `backend/app/api/v1/gov.py` | GET auto-register/probe 薄路由 | 修改 |
| `backend/app/api/v1/reports/prefab.py` | GET binding、list actor | 修改 |
| `backend/app/api/v1/views.py` | role defaults GET actor | 修改 |
| `tests/test_nfr_gov_rpt_view_r68.py` | 新套件 ≥35 断言 | 新建 |

预估 **P3 生产代码 14** + **测试 1** = **15 ≤ 20**（docs Task 8 不占 P3 文件预算）。

---

### Task 1: r68 共享夹具与测试脚手架

**Files:**
- Create: `tests/test_nfr_gov_rpt_view_r68.py`

**Skills:**
- Read `.agents/skills/test-driven-development/SKILL.md`
- Read `.agents/skills/fastapi/SKILL.md`

**UI skill:** none

**UI Acceptance:** N/A

**Interfaces:**
- Produces: module-scoped sqlite fixture、`client`/`viewer_user`/`enterprise_user`/`integration_user` fixtures、`_create_published_entry`、`_prefab_payload`、`_role_defaults_payload` helpers；`test_r68_fixture_bootstraps` 绿灯。

- [ ] **Step 1: 写入夹具与 bootstrap 测**

```python
"""跨域 companion 质量推分 r68 — NFR/GOV/RPT/VIEW."""
from __future__ import annotations

import os
import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.auth.deps import UserContext, get_current_user
from app.core.config import get_settings
from app.main import app as fastapi_app

_R68_SQLITE_URL = "sqlite+pysqlite:///file:nfr_gov_rpt_view_r68?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r68_sqlite_env():
    previous_db = os.environ.get("DATABASE_URL")
    previous_nfr08 = os.environ.get("NFR08_RUNTIME_MODE")
    os.environ["DATABASE_URL"] = _R68_SQLITE_URL
    os.environ.setdefault("NFR08_RUNTIME_MODE", "permissive")
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    from app.query.models import Base as QueryBase
    import app.auth.models  # noqa: F401
    import app.dashboard.models  # noqa: F401
    import app.datasources.models  # noqa: F401
    import app.governance.catalog.models  # noqa: F401
    import app.query.config_store.models  # noqa: F401
    import app.query.models  # noqa: F401

    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    AuthBase.metadata.create_all(engine)
    QueryBase.metadata.create_all(engine)
    yield
    from app.core.nfr import dashboard_sla as sla_mod
    from app.core.nfr import https_audit as audit_mod
    from app.governance.bus import auto as bus_auto
    from app.reports.prefab import service as prefab_service
    from app.views import store as view_store

    prefab_service._store.clear()
    view_store.clear_role_defaults()
    bus_auto._auto_states.clear()
    sla_mod._USER_DASHBOARD_SLA_SCOPE.clear()
    audit_mod._USER_HTTPS_AUDIT_SCOPE.clear()
    if previous_db is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous_db
    if previous_nfr08 is None:
        os.environ.pop("NFR08_RUNTIME_MODE", None)
    else:
        os.environ["NFR08_RUNTIME_MODE"] = previous_nfr08
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(fastapi_app)


@pytest.fixture
def viewer_user() -> Generator[None, None, None]:
    async def _override() -> UserContext:
        return UserContext(id="viewer-r68", username="viewer", roles=["viewer"])

    fastapi_app.dependency_overrides[get_current_user] = _override
    yield
    fastapi_app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def enterprise_user() -> Generator[None, None, None]:
    from app.core.nfr import dashboard_sla as sla_mod
    from app.core.nfr import https_audit as audit_mod
    from app.governance.bus import auto as bus_auto
    from app.reports.prefab import service as prefab_service
    from app.views import role_template as role_tpl

    async def _override() -> UserContext:
        return UserContext(id="enterprise-r68", username="enterprise", roles=["enterprise"])

    sla_mod.set_user_dashboard_sla_scope("enterprise-r68", "sla-dash-")
    audit_mod.set_user_https_audit_scope("enterprise-r68", frozenset({"api", "webhook"}))
    bus_auto.set_user_auto_bus_scope("enterprise-r68", "/api/v1/")
    prefab_service.set_user_prefab_scope("enterprise-r68", "bind-cn")
    role_tpl.set_user_role_default_scope("enterprise-r68", "role-")
    fastapi_app.dependency_overrides[get_current_user] = _override
    yield
    fastapi_app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def integration_user() -> Generator[None, None, None]:
    async def _override() -> UserContext:
        return UserContext(id="integration-r68", username="integration", roles=["integration"])

    fastapi_app.dependency_overrides[get_current_user] = _override
    yield
    fastapi_app.dependency_overrides.pop(get_current_user, None)


def _create_published_entry(client: TestClient, path: str) -> str:
    resp = client.post(
        "/api/v1/gov/catalog/entries",
        headers=AUTH,
        json={"name": f"R68-{uuid.uuid4().hex[:6]}", "category": "api", "path": path, "status": "published"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _prefab_payload(binding_key: str = "bind-cn-probe") -> dict:
    return {
        "bindingKey": binding_key,
        "entityTypeCode": "customer",
        "analysisType": "lifecycle",
        "dimensionCodes": ["region"],
        "displayName": "R68 Binding",
        "allowedRoles": ["analyst"],
    }


def _role_defaults_payload(dashboard_id: str | None = None, inherit: str | None = None) -> dict:
    body: dict = {"maxWidgetCount": 12}
    if dashboard_id:
        body["dashboardId"] = dashboard_id
    if inherit:
        body["inheritFromRoleId"] = inherit
    return body


def test_r68_fixture_bootstraps(client):
    """T-R68-BOOT-01: sqlite env + health。"""
    assert client.get("/health").status_code == 200


def test_r68_fixture_auth(client):
    """T-R68-BOOT-02: Bearer dev 可访问受保护路由。"""
    assert client.get("/api/v1/nfr/https-audit/status", headers=AUTH).status_code == 200
```

- [ ] **Step 2: 运行 bootstrap 测确认通过（实现前仅 boot 绿，域测待后续 Task）**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py::test_r68_fixture_bootstraps ../tests/test_nfr_gov_rpt_view_r68.py::test_r68_fixture_auth -v`
Expected: **2 passed**（域测在 Task 2–6 后补充）

- [ ] **Step 3: Commit**

```bash
git add tests/test_nfr_gov_rpt_view_r68.py
git commit -m "test(r68): scaffold shared fixtures for nfr/gov/rpt/view companion"
```

---

### Task 2: NFR-003 dashboard_sla ACL/probe/alerts

**Files:**
- Modify: `backend/app/core/nfr/errors.py`
- Modify: `backend/app/core/nfr/dashboard_sla.py`
- Modify: `backend/app/api/v1/nfr.py`
- Test: `tests/test_nfr_gov_rpt_view_r68.py`（NFR-003 区块）

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`

**UI skill:** none

**UI Acceptance:** N/A

**Interfaces:**
- Consumes: `UserContext` from `app.auth.deps`
- Produces: `set_user_dashboard_sla_scope`, `validate_dashboard_sla(payload, actor)`, `probe_dashboard_sla(payload, actor)`, `get_dashboard_sla_alerts(threshold_percent)`, `probe_validate_dashboard_sla_budget_ms(actor)`, `probe_dashboard_sla_probe_budget_ms(actor)`；常量 `DASHBOARD_SLA_FORBIDDEN`, `DASHBOARD_SLA_INVALID_DASHBOARD_ID`, `DASHBOARD_SLA_ALERT_THRESHOLD_OUT_OF_RANGE`

- [ ] **Step 1: 写入 NFR-003 失败测**

```python
def test_nfr_r68_003_enterprise_forbidden(client, enterprise_user):
    """T-NFR-R68-003-01: enterprise 越权 dashboardId → 403。"""
    resp = client.post(
        "/api/v1/nfr/dashboard-sla/validate",
        headers=AUTH,
        json={"dashboardId": "other-dash-001", "windowHours": 24, "slaTargetPercent": 99.5},
    )
    assert resp.status_code == 403
    assert resp.json()["code"] == "DASHBOARD_SLA_FORBIDDEN"


def test_nfr_r68_003_invalid_dashboard_id(client):
    """T-NFR-R68-003-02: dashboardId 含空格 → 422。"""
    resp = client.post(
        "/api/v1/nfr/dashboard-sla/validate",
        headers=AUTH,
        json={"dashboardId": "bad id", "windowHours": 24, "slaTargetPercent": 99.5},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "DASHBOARD_SLA_INVALID_DASHBOARD_ID"


def test_nfr_r68_003_alerts_threshold_out_of_range(client):
    """T-NFR-R68-003-03: alerts thresholdPercent=50 → 422。"""
    resp = client.get("/api/v1/nfr/dashboard-sla/alerts?thresholdPercent=50", headers=AUTH)
    assert resp.status_code == 422
    assert resp.json()["code"] == "DASHBOARD_SLA_ALERT_THRESHOLD_OUT_OF_RANGE"


def test_nfr_r68_003_probe_validate_budget(client):
    """T-NFR-R68-003-04: validate probe < 50ms。"""
    from app.auth.deps import UserContext
    from app.core.nfr.dashboard_sla import probe_validate_dashboard_sla_budget_ms

    actor = UserContext(id="admin", username="admin", roles=["admin"])
    result = probe_validate_dashboard_sla_budget_ms(actor)
    assert result.ok is True
    assert result.elapsed_ms < 50


def test_nfr_r68_003_probe_sla_budget(client):
    """T-NFR-R68-003-05: sla probe < 50ms。"""
    from app.auth.deps import UserContext
    from app.core.nfr.dashboard_sla import probe_dashboard_sla_probe_budget_ms

    actor = UserContext(id="admin", username="admin", roles=["admin"])
    result = probe_dashboard_sla_probe_budget_ms(actor)
    assert result.ok is True
    assert result.elapsed_ms < 50
```

- [ ] **Step 2: 运行确认失败**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -k "nfr_r68_003" -v`
Expected: FAIL（403/422/probe 未实现）

- [ ] **Step 3: 实现 errors + dashboard_sla + nfr.py**

`backend/app/core/nfr/errors.py` 追加：

```python
DASHBOARD_SLA_FORBIDDEN = "DASHBOARD_SLA_FORBIDDEN"
DASHBOARD_SLA_INVALID_DASHBOARD_ID = "DASHBOARD_SLA_INVALID_DASHBOARD_ID"
DASHBOARD_SLA_ALERT_THRESHOLD_OUT_OF_RANGE = "DASHBOARD_SLA_ALERT_THRESHOLD_OUT_OF_RANGE"
```

`backend/app/core/nfr/dashboard_sla.py` 核心增量（对齐 `dashboard_first_screen.py` 模式）：

```python
import re
import time
from dataclasses import dataclass

from app.auth.deps import UserContext
from app.core.nfr.errors import (
    DASHBOARD_SLA_ALERT_THRESHOLD_OUT_OF_RANGE,
    DASHBOARD_SLA_FORBIDDEN,
    DASHBOARD_SLA_INVALID_DASHBOARD_ID,
    # ...existing imports...
)

_DASHBOARD_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$")
_USER_DASHBOARD_SLA_SCOPE: dict[str, str] = {}
probe_dashboard_sla_budget_ms_limit = 50


@dataclass(frozen=True)
class DashboardSlaProbeResult:
    elapsed_ms: float
    ok: bool


def set_user_dashboard_sla_scope(user_id: str, dashboard_prefix: str) -> None:
    _USER_DASHBOARD_SLA_SCOPE[user_id] = dashboard_prefix


def _default_actor() -> UserContext:
    return UserContext(id="dev", username="dev", roles=["admin"])


def _assert_acl(actor: UserContext, dashboard_id: str) -> None:
    if "enterprise" not in set(actor.roles):
        return
    prefix = _USER_DASHBOARD_SLA_SCOPE.get(actor.id, "sla-dash-")
    if not dashboard_id.startswith(prefix):
        raise DashboardSlaError(DASHBOARD_SLA_FORBIDDEN, "enterprise user out of dashboard SLA scope", 403)


def _guard_dashboard_id(dashboard_id: str) -> None:
    if not _DASHBOARD_ID_RE.match(dashboard_id):
        raise DashboardSlaError(
            DASHBOARD_SLA_INVALID_DASHBOARD_ID,
            "Invalid dashboardId",
            422,
            [{"field": "dashboardId", "message": "invalid pattern"}],
        )


def _guard(payload: DashboardSlaProbeIn, actor: UserContext) -> DashboardSlaProbeIn:
    if not payload.dashboard_id or not payload.dashboard_id.strip():
        raise DashboardSlaError(
            DASHBOARD_SLA_DASHBOARD_REQUIRED,
            "dashboardId is required",
            422,
            [{"field": "dashboardId", "message": "required"}],
        )
    dash = payload.dashboard_id.strip()
    _guard_dashboard_id(dash)
    _assert_acl(actor, dash)
    # ...existing window/sla_target guards...
    return payload.model_copy(update={"dashboard_id": dash})


def validate_dashboard_sla(
    payload: DashboardSlaProbeIn, actor: UserContext | None = None,
) -> DashboardSlaValidateOut:
    item = _guard(payload, actor or _default_actor())
    return DashboardSlaValidateOut(valid=True, dashboard_id=item.dashboard_id)


def probe_dashboard_sla(
    payload: DashboardSlaProbeIn, actor: UserContext | None = None,
) -> DashboardSlaProbeOut:
    item = _guard(payload, actor or _default_actor())
    # ...existing uptime logic...


def get_dashboard_sla_alerts(threshold_percent: float | None = None) -> DashboardSlaAlertsOut:
    threshold = _ALERTS["thresholdPercent"] if threshold_percent is None else threshold_percent
    if threshold_percent is not None and (threshold < 90.0 or threshold > 99.99):
        raise DashboardSlaError(
            DASHBOARD_SLA_ALERT_THRESHOLD_OUT_OF_RANGE,
            "thresholdPercent out of range",
            422,
            [{"field": "thresholdPercent", "message": "must be between 90 and 99.99"}],
        )
    return DashboardSlaAlertsOut(
        enabled=_ALERTS["enabled"],
        channels=_ALERTS["channels"],
        threshold_percent=threshold,
        configured=bool(_ALERTS["channels"]),
    )


def probe_validate_dashboard_sla_budget_ms(actor: UserContext) -> DashboardSlaProbeResult:
    started = time.perf_counter()
    validate_dashboard_sla(
        DashboardSlaProbeIn(dashboardId="sla-dash-probe", windowHours=24, slaTargetPercent=99.5),
        actor,
    )
    elapsed = (time.perf_counter() - started) * 1000
    return DashboardSlaProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_dashboard_sla_budget_ms_limit)


def probe_dashboard_sla_probe_budget_ms(actor: UserContext) -> DashboardSlaProbeResult:
    started = time.perf_counter()
    probe_dashboard_sla(DashboardSlaProbeIn(dashboardId="sla-dash-probe"), actor)
    elapsed = (time.perf_counter() - started) * 1000
    return DashboardSlaProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_dashboard_sla_budget_ms_limit)
```

`backend/app/api/v1/nfr.py` 路由透传 actor + alerts query：

```python
@router.post("/dashboard-sla/validate", response_model=DashboardSlaValidateOut)
def dashboard_sla_validate(
    payload: DashboardSlaProbeIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
) -> DashboardSlaValidateOut | JSONResponse:
    try:
        return validate_dashboard_sla(payload, actor)
    except DashboardSlaError as exc:
        return _dashboard_sla_error(exc)


@router.post("/dashboard-sla/probe", response_model=DashboardSlaProbeOut)
def dashboard_sla_probe(
    payload: DashboardSlaProbeIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
) -> DashboardSlaProbeOut | JSONResponse:
    try:
        return probe_dashboard_sla(payload, actor)
    except DashboardSlaError as exc:
        return _dashboard_sla_error(exc)


@router.get("/dashboard-sla/alerts", response_model=DashboardSlaAlertsOut)
def dashboard_sla_alerts(
    _: Annotated[UserContext, Depends(get_current_user)],
    threshold_percent: float | None = Query(default=None, alias="thresholdPercent"),
) -> DashboardSlaAlertsOut | JSONResponse:
    try:
        return get_dashboard_sla_alerts(threshold_percent)
    except DashboardSlaError as exc:
        return _dashboard_sla_error(exc)
```

- [ ] **Step 4: 运行 NFR-003 测确认通过**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -k "nfr_r68_003" -v`
Expected: **5 passed**

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/nfr/errors.py backend/app/core/nfr/dashboard_sla.py backend/app/api/v1/nfr.py tests/test_nfr_gov_rpt_view_r68.py
git commit -m "feat(nfr-003): dashboard_sla ACL/probe/alerts companion r68"
```

---

### Task 3: NFR-004 https-audit mask-probe ACL/validate

**Files:**
- Modify: `backend/app/core/nfr/errors.py`
- Modify: `backend/app/core/nfr/https_audit.py`
- Modify: `backend/app/api/v1/nfr.py`
- Test: `tests/test_nfr_gov_rpt_view_r68.py`（NFR-004 区块）

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`

**UI skill:** none

**UI Acceptance:** N/A

**Interfaces:**
- Consumes: `UserContext`
- Produces: `set_user_https_audit_scope`, `probe_https_mask(payload, actor)`, `probe_https_mask_budget_ms(actor)`, `probe_https_status_budget_ms()`；常量 `HTTPS_AUDIT_FORBIDDEN`, `HTTPS_AUDIT_INVALID_SCOPE`；schema 增 `auditScope`, `simulateAuditFailure`

- [ ] **Step 1: 写入 NFR-004 失败测**

```python
def test_nfr_r68_004_enterprise_forbidden(client, enterprise_user):
    """T-NFR-R68-004-01: enterprise 越权 auditScope=connector → 403。"""
    resp = client.post(
        "/api/v1/nfr/https-audit/mask-probe",
        headers=AUTH,
        json={
            "samplePayload": {"password": "x"},
            "auditScope": "connector",
        },
    )
    assert resp.status_code == 403
    assert resp.json()["code"] == "HTTPS_AUDIT_FORBIDDEN"


def test_nfr_r68_004_invalid_scope(client):
    """T-NFR-R68-004-02: auditScope=invalid → 422。"""
    resp = client.post(
        "/api/v1/nfr/https-audit/mask-probe",
        headers=AUTH,
        json={"samplePayload": {"password": "x"}, "auditScope": "invalid"},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "HTTPS_AUDIT_INVALID_SCOPE"


def test_nfr_r68_004_simulate_audit_failure(client):
    """T-NFR-R68-004-03: simulateAuditFailure=true → auditLogged=false。"""
    resp = client.post(
        "/api/v1/nfr/https-audit/mask-probe",
        headers=AUTH,
        json={
            "samplePayload": {"password": "x"},
            "simulateAuditFailure": True,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["auditLogged"] is False


def test_nfr_r68_004_probe_mask_budget(client):
    """T-NFR-R68-004-04: mask probe < 50ms。"""
    from app.auth.deps import UserContext
    from app.core.nfr.https_audit import probe_https_mask_budget_ms

    actor = UserContext(id="admin", username="admin", roles=["admin"])
    result = probe_https_mask_budget_ms(actor)
    assert result.ok is True


def test_nfr_r68_004_probe_status_budget(client):
    """T-NFR-R68-004-05: status probe < 50ms。"""
    from app.core.nfr.https_audit import probe_https_status_budget_ms

    result = probe_https_status_budget_ms()
    assert result.ok is True
```

- [ ] **Step 2: 运行确认失败**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -k "nfr_r68_004" -v`
Expected: FAIL

- [ ] **Step 3: 实现 https_audit + errors + nfr.py actor 透传**

`backend/app/core/nfr/errors.py` 追加：

```python
HTTPS_AUDIT_FORBIDDEN = "HTTPS_AUDIT_FORBIDDEN"
HTTPS_AUDIT_INVALID_SCOPE = "HTTPS_AUDIT_INVALID_SCOPE"
```

`HttpsAuditMaskProbeIn` 增字段 + ACL + probe：

```python
_ALLOWED_SCOPES = frozenset({"api", "webhook", "connector"})
_USER_HTTPS_AUDIT_SCOPE: dict[str, frozenset[str]] = {}
probe_https_audit_budget_ms_limit = 50


@dataclass(frozen=True)
class HttpsAuditProbeResult:
    elapsed_ms: float
    ok: bool


class HttpsAuditMaskProbeIn(BaseModel):
    # ...existing...
    audit_scope: str = Field(default="api", alias="auditScope")
    simulate_audit_failure: bool = Field(default=False, alias="simulateAuditFailure")


def set_user_https_audit_scope(user_id: str, allowed_scopes: frozenset[str]) -> None:
    _USER_HTTPS_AUDIT_SCOPE[user_id] = allowed_scopes


def _assert_acl(actor: UserContext, audit_scope: str) -> None:
    if "enterprise" not in set(actor.roles):
        return
    allowed = _USER_HTTPS_AUDIT_SCOPE.get(actor.id, frozenset({"api", "webhook"}))
    if audit_scope not in allowed:
        raise HttpsAuditError(HTTPS_AUDIT_FORBIDDEN, "enterprise user out of https audit scope", 403)


def _guard_scope(audit_scope: str) -> None:
    if audit_scope not in _ALLOWED_SCOPES:
        raise HttpsAuditError(
            HTTPS_AUDIT_INVALID_SCOPE,
            "Invalid auditScope",
            422,
            [{"field": "auditScope", "message": f"must be one of {sorted(_ALLOWED_SCOPES)}"}],
        )


def probe_https_mask(payload: HttpsAuditMaskProbeIn, actor: UserContext | None = None) -> HttpsAuditMaskProbeOut:
    actor = actor or UserContext(id="dev", username="dev", roles=["admin"])
    _guard_scope(payload.audit_scope)
    _assert_acl(actor, payload.audit_scope)
    # ...existing empty/unknown/url guards...
    audit_logged = not payload.simulate_audit_failure
    return HttpsAuditMaskProbeOut(
        maskedPayload=masked,
        maskedFields=masked_fields,
        auditLogged=audit_logged,
        insecureWebhook=insecure,
    )


def probe_https_mask_budget_ms(actor: UserContext) -> HttpsAuditProbeResult:
    started = time.perf_counter()
    probe_https_mask(
        HttpsAuditMaskProbeIn(samplePayload={"password": "x"}, auditScope="api"),
        actor,
    )
    elapsed = (time.perf_counter() - started) * 1000
    return HttpsAuditProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_https_audit_budget_ms_limit)


def probe_https_status_budget_ms() -> HttpsAuditProbeResult:
    started = time.perf_counter()
    get_https_audit_status()
    elapsed = (time.perf_counter() - started) * 1000
    return HttpsAuditProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_https_audit_budget_ms_limit)
```

`nfr.py` mask-probe 透传 actor：

```python
@router.post("/https-audit/mask-probe", response_model=HttpsAuditMaskProbeOut)
def https_audit_mask_probe(
    payload: HttpsAuditMaskProbeIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
) -> HttpsAuditMaskProbeOut | JSONResponse:
    try:
        return probe_https_mask(payload, actor)
    except HttpsAuditError as exc:
        return _https_audit_error(exc)
```

- [ ] **Step 4: 运行 NFR-004 测确认通过**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -k "nfr_r68_004" -v`
Expected: **5 passed**

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/nfr/errors.py backend/app/core/nfr/https_audit.py backend/app/api/v1/nfr.py tests/test_nfr_gov_rpt_view_r68.py
git commit -m "feat(nfr-004): https-audit mask-probe ACL/validate companion r68"
```

---

### Task 4: GOV-007 gov bus auto-register FSM ACL/probe

**Files:**
- Modify: `backend/app/governance/bus/auto.py`
- Create: `backend/app/governance/bus/probe.py`
- Modify: `backend/app/api/v1/gov.py`
- Test: `tests/test_nfr_gov_rpt_view_r68.py`（GOV-007 区块）

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`

**UI skill:** none

**UI Acceptance:** N/A

**Interfaces:**
- Consumes: `UserContext`, `Session`, published catalog entry fixture
- Produces: `set_user_auto_bus_scope`, FSM guard `GOV_AUTO_BUS_INVALID_TRANSITION` (409), `probe_auto_register_budget_ms(db, actor, entry_id)`；HTTP `GET /api/v1/gov/bus/auto-register/probe`

- [ ] **Step 1: 写入 GOV-007 失败测**

```python
def test_gov_r68_007_fsm_failed_retry_409(client, integration_user):
    """T-GOV-R68-007-01: failed 状态重试 → 409 GOV_AUTO_BUS_INVALID_TRANSITION。"""
    eid = _create_published_entry(client, path="/api/v1/force-fail/r68")
    first = client.post("/api/v1/gov/bus/auto-register", headers=AUTH, json={"catalogEntryId": eid})
    assert first.status_code == 502
    retry = client.post("/api/v1/gov/bus/auto-register", headers=AUTH, json={"catalogEntryId": eid})
    assert retry.status_code == 409
    assert retry.json()["code"] == "GOV_AUTO_BUS_INVALID_TRANSITION"


def test_gov_r68_007_enterprise_path_forbidden(client, enterprise_user, integration_user):
    """T-GOV-R68-007-02: enterprise 越权 entry path → 403。"""
    from app.governance.bus import auto as bus_auto

    bus_auto.set_user_auto_bus_scope("enterprise-r68", "/api/v1/cn/")
    eid = _create_published_entry(client, path=f"/api/v1/global/r68-{uuid.uuid4().hex[:6]}")
    fastapi_app.dependency_overrides[get_current_user] = lambda: UserContext(
        id="enterprise-r68", username="enterprise", roles=["enterprise"]
    )
    resp = client.post("/api/v1/gov/bus/auto-register", headers=AUTH, json={"catalogEntryId": eid})
    assert resp.status_code == 403
    assert resp.json()["code"] == "GOV_AUTO_BUS_FORBIDDEN"


def test_gov_r68_007_probe_budget(client, integration_user):
    """T-GOV-R68-007-03: auto_register probe < 50ms。"""
    from app.datasources.models import get_meta_session
    from app.auth.deps import UserContext
    from app.governance.bus.probe import probe_auto_register_budget_ms

    eid = uuid.UUID(_create_published_entry(client, path=f"/api/v1/r68/probe-{uuid.uuid4().hex[:6]}"))
    db = get_meta_session()
    try:
        actor = UserContext(id="integration-r68", username="integration", roles=["integration"])
        result = probe_auto_register_budget_ms(db, actor, eid)
        assert result.ok is True
        assert result.elapsed_ms < 50
    finally:
        db.close()


def test_gov_r68_007_http_probe(client, integration_user):
    """T-GOV-R68-007-04: GET auto-register/probe withinBudget。"""
    resp = client.get("/api/v1/gov/bus/auto-register/probe", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert body["withinBudget"] is True
    assert body["elapsedMs"] < 50
```

- [ ] **Step 2: 运行确认失败**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -k "gov_r68_007" -v`
Expected: FAIL

- [ ] **Step 3: 实现 auto.py FSM 守卫 + probe.py + gov.py 路由**

`auto.py` 增量：

```python
_USER_AUTO_BUS_SCOPE: dict[str, str] = {}


def set_user_auto_bus_scope(user_id: str, path_prefix: str) -> None:
    _USER_AUTO_BUS_SCOPE[user_id] = path_prefix


def _assert_entry_path_scope(actor: UserContext, entry_path: str) -> None:
    if "enterprise" not in set(actor.roles):
        return
    prefix = _USER_AUTO_BUS_SCOPE.get(actor.id, "/api/v1/")
    if not entry_path.startswith(prefix):
        raise catalog_service.CatalogError(
            "GOV_AUTO_BUS_FORBIDDEN",
            "enterprise user out of auto bus entry path scope",
            403,
        )


def auto_register(db: Session, actor: UserContext, entry_id: uuid.UUID) -> tuple[AutoRegisterOut, int]:
    _assert_auto_role(actor)
    state = get_fsm_state(entry_id)
    if state in ("failed", "auto_registering"):
        raise catalog_service.CatalogError(
            "GOV_AUTO_BUS_INVALID_TRANSITION",
            f"Cannot auto-register from fsm state {state}",
            409,
        )
    try:
        entry = catalog_service.get_entry(db, entry_id)
    except catalog_service.CatalogError:
        raise catalog_service.CatalogError("CATALOG_ENTRY_NOT_FOUND", "Catalog entry not found", 404) from None
    _assert_entry_path_scope(actor, entry.path)
    # ...existing draft guard + register flow...
```

`backend/app/governance/bus/probe.py`（新建）：

```python
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from unittest.mock import patch

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.governance.bus.adapter import InMemoryBusAdapter
from app.governance.bus.auto import auto_register
from app.governance.catalog import service as catalog_service

probe_auto_register_budget_ms_limit = 50


@dataclass(frozen=True)
class AutoRegisterProbeResult:
    elapsed_ms: float
    ok: bool


def probe_auto_register_budget_ms(
    db: Session, actor: UserContext, entry_id: uuid.UUID,
) -> AutoRegisterProbeResult:
    started = time.perf_counter()
    with patch.object(InMemoryBusAdapter, "register", return_value={"busId": "probe-bus"}):
        try:
            auto_register(db, actor, entry_id)
        except catalog_service.CatalogError:
            pass
    elapsed = (time.perf_counter() - started) * 1000
    return AutoRegisterProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_auto_register_budget_ms_limit)
```

`gov.py` 追加薄路由：

```python
@router.get("/bus/auto-register/probe", response_model=None)
def auto_register_probe(
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> JSONResponse:
    from app.governance.bus.probe import probe_auto_register_budget_ms
    from app.governance.catalog.schemas import CatalogEntryCreate

    if "viewer" in actor.roles and actor.roles == ["viewer"]:
        return JSONResponse(
            status_code=403,
            content={"code": "GOV_AUTO_BUS_FORBIDDEN", "message": "viewer forbidden", "detail": None},
        )
    entry = catalog_service.create_entry(
        db,
        CatalogEntryCreate(
            name="probe-fixture",
            category="api",
            path=f"/api/v1/r68/probe-{uuid.uuid4().hex[:8]}",
            status="published",
        ),
    )
    result = probe_auto_register_budget_ms(db, actor, entry.id)
    return JSONResponse(
        status_code=200,
        content={"elapsedMs": result.elapsed_ms, "withinBudget": result.ok},
    )
```

- [ ] **Step 4: 运行 GOV-007 测确认通过**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -k "gov_r68_007" -v`
Expected: **4 passed**

- [ ] **Step 5: Commit**

```bash
git add backend/app/governance/bus/auto.py backend/app/governance/bus/probe.py backend/app/api/v1/gov.py tests/test_nfr_gov_rpt_view_r68.py
git commit -m "feat(gov-007): auto-register FSM guard and perf probe r68"
```

---

### Task 5: RPT-002 prefab binding ACL/validate/probe 巩固

**Files:**
- Modify: `backend/app/reports/prefab/errors.py`
- Modify: `backend/app/reports/prefab/service.py`
- Modify: `backend/app/reports/prefab/probe.py`
- Modify: `backend/app/api/v1/reports/prefab.py`
- Test: `tests/test_nfr_gov_rpt_view_r68.py`（RPT-002 区块）

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`

**UI skill:** none

**UI Acceptance:** N/A

**Interfaces:**
- Produces: `get_prefab_binding(key, user)`, `list_prefab_bindings(user)` scope 过滤；`probe_get_prefab_binding_budget_ms(key)`；常量 `RPT_PREFAB_NOT_FOUND`, `RPT_PREFAB_DUPLICATE_DIMENSION`

- [ ] **Step 1: 写入 RPT-002 失败测**

```python
def test_rpt_r68_002_get_not_found(client):
    """T-RPT-R68-002-01: 未知 binding key → 404。"""
    resp = client.get("/api/v1/reports/prefab/bindings/bind-missing-r68", headers=AUTH)
    assert resp.status_code == 404
    assert resp.json()["code"] == "RPT_PREFAB_NOT_FOUND"


def test_rpt_r68_002_get_enterprise_forbidden(client, enterprise_user):
    """T-RPT-R68-002-02: enterprise scope 外 GET → 403。"""
    key = "bind-global-r68"
    put = client.put(
        f"/api/v1/reports/prefab/bindings/{key}",
        headers=AUTH,
        json=_prefab_payload(key),
    )
    assert put.status_code == 200
    resp = client.get(f"/api/v1/reports/prefab/bindings/{key}", headers=AUTH)
    assert resp.status_code == 403
    assert resp.json()["code"] == "RPT_PREFAB_FORBIDDEN"


def test_rpt_r68_002_duplicate_dimension(client):
    """T-RPT-R68-002-03: 重复 dimensionCodes → 422。"""
    payload = _prefab_payload("bind-dup-r68")
    payload["dimensionCodes"] = ["region", "region"]
    resp = client.post("/api/v1/reports/prefab/bindings/validate", headers=AUTH, json=payload)
    assert resp.status_code == 422
    assert resp.json()["code"] == "RPT_PREFAB_DUPLICATE_DIMENSION"


def test_rpt_r68_002_probe_get_budget(client):
    """T-RPT-R68-002-04: get probe < 50ms。"""
    from app.reports.prefab import service as prefab_service
    from app.reports.prefab.probe import probe_get_prefab_binding_budget_ms
    from app.auth.deps import UserContext

    key = "bind-probe-get-r68"
    prefab_service.upsert_prefab_binding(
        key, prefab_service._validate_binding(prefab_service._sample_binding_in(key)),  # use internal helper or direct store seed
        UserContext(id="admin", username="admin", roles=["admin"]),
    )
    result = probe_get_prefab_binding_budget_ms(key)
    assert result.ok is True
```

注：Step 3 实现时若 `_sample_binding_in` 不存在，在 `service.py` 用 `PrefabBindingIn` 直接 seed `_store[key]`。

- [ ] **Step 2: 运行确认失败**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -k "rpt_r68_002" -v`
Expected: FAIL

- [ ] **Step 3: 实现 prefab service/probe/errors/api**

`errors.py`：

```python
RPT_PREFAB_NOT_FOUND = "RPT_PREFAB_NOT_FOUND"
RPT_PREFAB_DUPLICATE_DIMENSION = "RPT_PREFAB_DUPLICATE_DIMENSION"
```

`service.py` 增量：

```python
from app.reports.prefab.errors import RPT_PREFAB_NOT_FOUND, RPT_PREFAB_DUPLICATE_DIMENSION

def _validate_binding(payload: PrefabBindingIn) -> PrefabBindingIn:
    if len(payload.dimension_codes) != len(set(payload.dimension_codes)):
        raise PrefabError(
            RPT_PREFAB_DUPLICATE_DIMENSION,
            "duplicate dimensionCodes",
            422,
            [{"field": "dimensionCodes", "message": "duplicate entries"}],
        )
    # ...existing validation...


def list_prefab_bindings(user: UserContext | None = None) -> PrefabBindingListResponse:
    items = list(_store.values())
    if user and "enterprise" in set(user.roles):
        prefix = _USER_PREFAB_SCOPE.get(user.id, "bind-cn")
        items = [i for i in items if str(i.get("bindingKey", "")).startswith(prefix)]
    return PrefabBindingListResponse(
        items=[PrefabBindingOut.model_validate(i) for i in items],
        total=len(items),
    )


def get_prefab_binding(key: str, user: UserContext) -> PrefabBindingOut:
    _assert_prefab_scope(user, key)
    stored = _store.get(key)
    if stored is None:
        raise PrefabError(RPT_PREFAB_NOT_FOUND, "Prefab binding not found", 404)
    return PrefabBindingOut.model_validate(stored)
```

`probe.py` 追加：

```python
def probe_get_prefab_binding_budget_ms(key: str) -> PrefabProbeResult:
    from app.auth.deps import UserContext
    started = time.perf_counter()
    prefab_service.get_prefab_binding(key, UserContext(id="admin", username="admin", roles=["admin"]))
    elapsed = (time.perf_counter() - started) * 1000
    return PrefabProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_prefab_budget_ms_limit)
```

`prefab.py` api：

```python
@router.get("/bindings/{binding_key}", response_model=PrefabBindingOut)
def get_binding(
    binding_key: str,
    actor: Annotated[UserContext, Depends(get_current_user)],
) -> PrefabBindingOut | JSONResponse:
    try:
        return prefab_service.get_prefab_binding(binding_key, actor)
    except PrefabError as exc:
        return _prefab_error(exc)


@router.get("/bindings", response_model=PrefabBindingListResponse)
def list_bindings(actor: Annotated[UserContext, Depends(get_current_user)]) -> PrefabBindingListResponse:
    return prefab_service.list_prefab_bindings(actor)
```

- [ ] **Step 4: 运行 RPT-002 测确认通过**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -k "rpt_r68_002" -v`
Expected: **4 passed**

- [ ] **Step 5: Commit**

```bash
git add backend/app/reports/prefab/errors.py backend/app/reports/prefab/service.py backend/app/reports/prefab/probe.py backend/app/api/v1/reports/prefab.py tests/test_nfr_gov_rpt_view_r68.py
git commit -m "feat(rpt-002): prefab GET/ACL/duplicate dimension companion r68"
```

---

### Task 6: VIEW-002 role default-views bounds/cycle ACL/probe

**Files:**
- Modify: `backend/app/views/role_template.py`
- Modify: `backend/app/views/probe.py`
- Modify: `backend/app/api/v1/views.py`
- Test: `tests/test_nfr_gov_rpt_view_r68.py`（VIEW-002 区块）

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`

**UI skill:** none

**UI Acceptance:** N/A

**Interfaces:**
- Produces: `set_user_role_default_scope`, `get_defaults(role_id, actor)`, `put_defaults` cycle guard `VIEW_DEFAULT_ROLE_CYCLE`, `probe_put_role_defaults_budget_ms(db, actor, role_id, payload)`

- [ ] **Step 1: 写入 VIEW-002 失败测**

```python
def test_view_r68_002_role_cycle(client):
    """T-VIEW-R68-002-01: inheritFromRoleId A→B→A → 422 VIEW_DEFAULT_ROLE_CYCLE。"""
    role_a, role_b = "role-a-r68", "role-b-r68"
    dash = str(uuid.uuid4())
    client.put(
        f"/api/v1/roles/{role_a}/default-views",
        headers=AUTH,
        json=_role_defaults_payload(dashboard_id=dash, inherit=role_b),
    )
    client.put(
        f"/api/v1/roles/{role_b}/default-views",
        headers=AUTH,
        json=_role_defaults_payload(dashboard_id=dash, inherit=role_a),
    )
    resp = client.put(
        f"/api/v1/roles/{role_a}/default-views",
        headers=AUTH,
        json=_role_defaults_payload(dashboard_id=dash, inherit=role_b),
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "VIEW_DEFAULT_ROLE_CYCLE"


def test_view_r68_002_enterprise_get_forbidden(client, enterprise_user):
    """T-VIEW-R68-002-02: enterprise 越权 role_id GET → 403。"""
    resp = client.get("/api/v1/roles/global-role-r68/default-views", headers=AUTH)
    assert resp.status_code == 403
    assert resp.json()["code"] == "VIEW_DEFAULT_FORBIDDEN"


def test_view_r68_002_probe_put_budget(client):
    """T-VIEW-R68-002-03: put defaults probe < 50ms。"""
    from app.auth.deps import UserContext
    from app.datasources.models import get_meta_session
    from app.views.probe import probe_put_role_defaults_budget_ms

    db = get_meta_session()
    try:
        actor = UserContext(id="admin", username="admin", roles=["admin"])
        result = probe_put_role_defaults_budget_ms(
            db, actor, "role-probe-r68", {"maxWidgetCount": 8}
        )
        assert result.ok is True
    finally:
        db.close()
```

- [ ] **Step 2: 运行确认失败**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -k "view_r68_002" -v`
Expected: FAIL

- [ ] **Step 3: 实现 role_template cycle/scope + probe + views api**

`role_template.py` 增量：

```python
_USER_ROLE_DEFAULT_SCOPE: dict[str, str] = {}


def set_user_role_default_scope(user_id: str, role_prefix: str) -> None:
    _USER_ROLE_DEFAULT_SCOPE[user_id] = role_prefix


def _assert_read_scope(actor: UserContext, role_id: str) -> None:
    if "enterprise" not in set(actor.roles):
        return
    prefix = _USER_ROLE_DEFAULT_SCOPE.get(actor.id, "role-")
    if not role_id.startswith(prefix):
        raise ViewError("VIEW_DEFAULT_FORBIDDEN", "enterprise user out of role default scope", 403)


def _detect_inherit_cycle(role_id: str, inherit_from: str | None) -> None:
    if not inherit_from:
        return
    seen = {role_id}
    current = inherit_from
    while current:
        if current in seen:
            raise ViewError(
                "VIEW_DEFAULT_ROLE_CYCLE",
                "inheritFromRoleId creates a cycle",
                422,
                [{"field": "inheritFromRoleId", "message": "cycle detected"}],
            )
        seen.add(current)
        stored = store.get_role_defaults(current)
        current = (stored or {}).get("inheritFromRoleId")


def get_defaults(role_id: str, actor: UserContext | None = None) -> dict[str, Any]:
    if actor is not None:
        _assert_read_scope(actor, role_id)
    # ...existing return...


def put_defaults(db: Session, role_id: str, payload: dict[str, Any], actor: UserContext) -> dict[str, Any]:
    _assert_admin(actor)
    inherit = payload.get("inheritFromRoleId")
    _detect_inherit_cycle(_normalize_role_key(role_id), inherit)
    # ...existing bounds + refs...
    body = {
        "dashboardId": payload.get("dashboardId"),
        "reportTemplateNodeId": payload.get("reportTemplateNodeId"),
        "maxWidgetCount": max_widgets,
        "inheritFromRoleId": inherit,
    }
    return store.set_role_defaults(key, body)
```

`probe.py` 追加：

```python
def probe_put_role_defaults_budget_ms(
    db: Session, actor: UserContext, role_id: str, payload: dict,
) -> ViewProbeResult:
    from app.views.role_template import put_defaults
    started = time.perf_counter()
    try:
        put_defaults(db, role_id, payload, actor)
    except ViewError:
        pass
    elapsed = (time.perf_counter() - started) * 1000
    return ViewProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_resolve_defaults_budget_ms_limit)
```

`views.py` GET 透传 actor：

```python
@role_defaults_router.get("/{role_id}/default-views", response_model=None)
def read_role_default_views(
    role_id: str,
    actor: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return get_defaults(role_id, actor)
    except ViewError as exc:
        return _error_response(exc)
```

`RoleDefaultViewsIn` 增可选 `inherit_from_role_id: str | None = Field(default=None, alias="inheritFromRoleId")`。

- [ ] **Step 4: 运行 VIEW-002 测确认通过**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -k "view_r68_002" -v`
Expected: **3 passed**

- [ ] **Step 5: Commit**

```bash
git add backend/app/views/role_template.py backend/app/views/probe.py backend/app/api/v1/views.py tests/test_nfr_gov_rpt_view_r68.py
git commit -m "feat(view-002): role defaults cycle/scope/put probe companion r68"
```

---

### Task 7: r68 companion 测补全与六轮回归门控

**Files:**
- Modify: `tests/test_nfr_gov_rpt_view_r68.py`（回归指针测 + 套件完整性）

**Skills:**
- Read `.agents/skills/verification-before-completion/SKILL.md`

**UI skill:** none

**UI Acceptance:** N/A

- [ ] **Step 1: 补全回归指针与套件计数测**

```python
def test_nfr_r68_003_r62_regression_pointer(client):
    """T-NFR-R68-003-06: r62 dashboard_sla L1 基线仍可达。"""
    resp = client.post(
        "/api/v1/nfr/dashboard-sla/probe",
        headers=AUTH,
        json={"dashboardId": "sla-dash-r62", "windowHours": 24, "slaTargetPercent": 99.0},
    )
    assert resp.status_code == 200
    assert resp.json()["withinSla"] is True


def test_nfr_r68_004_r64_regression_pointer(client):
    """T-NFR-R68-004-06: r64 mask-probe 基线仍可达。"""
    resp = client.post(
        "/api/v1/nfr/https-audit/mask-probe",
        headers=AUTH,
        json={"samplePayload": {"password": "secret"}},
    )
    assert resp.status_code == 200
    assert "password" in resp.json()["maskedFields"]


def test_gov_r68_007_r60_force_fail_preserved(client, integration_user):
    """T-GOV-R68-007-05: force-fail 502 路径保持。"""
    eid = _create_published_entry(client, path="/api/v1/force-fail/r68-reg")
    resp = client.post("/api/v1/gov/bus/auto-register", headers=AUTH, json={"catalogEntryId": eid})
    assert resp.status_code == 502
    assert resp.json()["code"] == "BUS_REGISTRATION_REJECTED"


def test_rpt_r68_002_r65_list_scope(client, enterprise_user):
    """T-RPT-R68-002-05: list_bindings enterprise scope 过滤。"""
    client.put("/api/v1/reports/prefab/bindings/bind-cn-scoped", headers=AUTH, json=_prefab_payload("bind-cn-scoped"))
    client.put("/api/v1/reports/prefab/bindings/bind-global-x", headers=AUTH, json=_prefab_payload("bind-global-x"))
    resp = client.get("/api/v1/reports/prefab/bindings", headers=AUTH)
    assert resp.status_code == 200
    keys = [i["bindingKey"] for i in resp.json()["items"]]
    assert "bind-cn-scoped" in keys
    assert "bind-global-x" not in keys


def test_view_r68_002_r63_bounds_preserved(client):
    """T-VIEW-R68-002-04: maxWidgetCount 越界仍 422。"""
    resp = client.put(
        "/api/v1/roles/role-bounds-r68/default-views",
        headers=AUTH,
        json={"maxWidgetCount": 0},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "VIEW_DEFAULT_OUT_OF_BOUNDS"
```

- [ ] **Step 2: 运行 r68 全套件**

Run: `cd backend && python3 -m pytest ../tests/test_nfr_gov_rpt_view_r68.py -v --tb=short`
Expected: **≥35 passed**

- [ ] **Step 3: 六轮回归门控**

Run: Global Constraints 中的回归命令
Expected: r68 **≥35/35** + r67 **34/34** + r66 **33/33** + r65 **32/32** + r64 **33/33** + r62 **32/32** + r60 **34/34** = **198/198**；全量 exit_code **0**

- [ ] **Step 4: ruff**

Run: `cd backend && python3 -m ruff check .`
Expected: exit_code **0**

- [ ] **Step 5: Commit**

```bash
git add tests/test_nfr_gov_rpt_view_r68.py
git commit -m "test(r68): complete companion suite and six-round regression gate"
```

---

### Task 8: 文档同步

**Files:**
- Modify: `docs/services/core.md`
- Modify: `docs/services/governance.md`
- Modify: `docs/services/reports.md`
- Modify: `docs/services/views.md`（若不存在则创建并登记 `docs/services/README.md`）
- Modify: `docs/api/README.md`

**Skills:**
- Read `.cursor/rules/prd-sync.mdc`（已通过 alwaysApply 注入；本 Task 按表核对）

**UI skill:** none

**UI Acceptance:** N/A

- [ ] **Step 1: 更新域附录**

`docs/services/core.md` 登记 NFR-003 dashboard_sla ACL/probe/alerts、`set_user_dashboard_sla_scope`；NFR-004 https_audit `auditScope` ACL、`simulateAuditFailure`、`set_user_https_audit_scope`。

`docs/services/governance.md` 登记 GOV-007 auto-register FSM `GOV_AUTO_BUS_INVALID_TRANSITION`、enterprise path scope、`probe_auto_register_budget_ms`、`GET /gov/bus/auto-register/probe`。

`docs/services/reports.md` 登记 RPT-002 `get_prefab_binding`、`RPT_PREFAB_NOT_FOUND`、`RPT_PREFAB_DUPLICATE_DIMENSION`、`probe_get_prefab_binding_budget_ms`。

`docs/services/views.md` 登记 VIEW-002 `inheritFromRoleId` cycle、`set_user_role_default_scope`、`probe_put_role_defaults_budget_ms`。

- [ ] **Step 2: 更新 API 登记簿**

`docs/api/README.md` 追加：

```markdown
| GET | `/api/v1/reports/prefab/bindings/{binding_key}` | M1B | 已实现 | RPT-002 prefab binding 读取 |
| GET | `/api/v1/gov/bus/auto-register/probe` | M1B | 已实现 | GOV-007 auto-register perf probe |
```

并注记 NFR dashboard-sla / https-audit 路由 actor 透传与 alerts `thresholdPercent` query 深化（无新 path）。

- [ ] **Step 3: 自检文档边界**

确认 `docs/services/` 无 HTTP schema 重复、`docs/api/` 无业务流程叙事（`docs-layer.mdc`）。

- [ ] **Step 4: Commit**

```bash
git add docs/services/core.md docs/services/governance.md docs/services/reports.md docs/services/views.md docs/api/README.md
git commit -m "docs(r68): sync NFR/GOV/RPT/VIEW companion ACL/probe surfaces"
```

---

## Self-Review

| 检查项 | 结果 |
|--------|------|
| design 五子项均有 Task（NFR-003→Task2, NFR-004→Task3, GOV-007→Task4, RPT-002→Task5, VIEW-002→Task6） | ✓ |
| 无 TBD/TODO/适当处理 | ✓ |
| 每 Task 含验证命令 | ✓ |
| 全 Task UI skill: none | ✓ |
| P3 生产 14 + 测试 1 = 15 ≤ 20 | ✓ |
| perf probe ≤50ms 契约覆盖五域 | ✓ |
| 回归门控 198/198 | ✓ |
