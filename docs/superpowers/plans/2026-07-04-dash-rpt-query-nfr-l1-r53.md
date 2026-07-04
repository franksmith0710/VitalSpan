# M9 主题分析 + M10/M12 报表模板调度 + M13 Dataset/NFR L1 kickoff 实现计划 — r53

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **执行模式：** subagent-driven-development (option 1)
> **范围框定：** `backend/app/reports/catalog/` · `backend/app/reports/scheduler/` · `backend/app/dashboard/theme/` · `backend/app/query/dataset/` · `backend/app/core/nfr/runtime_guard.py` · `backend/app/api/v1/reports.py` · `backend/app/api/v1/dashboards.py` · `backend/app/api/v1/query.py` · `backend/app/api/v1/nfr.py` · `backend/app/api/v1/router.py` · `backend/app/query/config_store/schemas.py` · `backend/app/core/nfr/errors.py` · `tests/test_dash_rpt_query_nfr_r53.py` · `docs/services/{reports,dashboard,query,core}.md` · `docs/services/README.md` · `docs/api/README.md`
> **子项：** QUERY-009, RPT-004, DASH-006, RPT-005, NFR-008
> **项目技能：** `.agents/skills/`（P3 按 Files 按需 Read；plan 已预指定 **Skills:**）
> **项目规则：** `.cursor/rules/`（`vitalspan-project.mdc`/`common.mdc`/`prd-sync.mdc` alwaysApply 自动注入；`backend-fastapi.mdc` globs `backend/**/*.py`+`tests/**/*.py`、`docs-layer.mdc` globs `docs/**` 由 P3 按 Files 动态匹配）

**Goal:** 交付报表模板树 catalog CRUD、调度 FSM、c实体主题分析 config 契约、Dataset 查询第三路径守卫、NFR-008 零 DE/SS 运行时扫描 endpoint；≥38 条 pytest smoke；五 PRD ID L1 目标 ≥85。

**Architecture:** `reports/catalog/service.py` 内存 registry 镜像 `metadata/themes` 循环/深度算法；`reports/scheduler/service.py` 对齐 `governance/publish` FSM + 五段 cron 校验；`dashboard/theme/service.py` 经 `config_store` 持久化 `entity_theme`；`query/dataset/guard.py` 内置 `_BUILTIN_DATASETS` ACL registry 与 QUERY-003 native 三路径并列；`core/nfr/runtime_guard.py` pyproject 文本扫描 + `importlib.util.find_spec` 模块探测。纯后端、无 Alembic migration、不触及 `fe/` 与 `auth` 模块。

**Tech Stack:** Python 3.11 / FastAPI / Pydantic v2 / SQLAlchemy 2.x / pytest + TestClient / ruff。

## Global Constraints

- **纯后端**：不触及 `fe/`；`ui_design_skill: none`；全 Task **UI skill: none**。
- **零第三方 BI 运行时依赖**（NFR-08 / goal G1）。
- **不修改** `docs/automate/goal.md` / `plan.md` 结构。
- **不修改** `backend/app/auth/` 模块（Dataset ACL 内置 registry）。
- **分层纪律**（`common.mdc`）：`reports/`、`dashboard/theme/`、`query/dataset/` = domain；`api/v1/*.py` = entry。
- **体量软约束**：单函数 ≤60 行；py 单文件 ≤200 行。
- **错误体**：`{code, message, detail}`；校验失败 HTTP 422；未鉴权 401。
- **鉴权**：新路由 `Depends(get_current_user)`；开发 `Bearer dev` 默认 admin。
- **真理源优先级**：`round-target` > design.md > `docs/api/README.md`。
- **验证基线**（r52 P5）：`cd backend && python3 -m pytest -q` ≈ **1300 passed** / 4 skipped；本轮目标 **≥1338 passed** + 4 skipped，零失败，`ruff` clean。
- **验证命令**：
  ```bash
  cd backend && python3 -m ruff check . && python3 -m pytest \
    ../tests/test_dash_rpt_query_nfr_r53.py \
    ../tests/test_design_conn_gov_query_r52.py \
    ../tests/test_design_conn_gov_query_r49.py \
    ../tests/test_nfr_gov_conn_r46.py \
    -v
  ```

---

## File Structure

| 文件 | 责任 | 变更 |
|------|------|------|
| `backend/app/reports/catalog/schemas.py` | RPT-004 DTO | 新建 |
| `backend/app/reports/catalog/errors.py` | `ReportCatalogError` + `RPT_CATALOG_*` | 新建 |
| `backend/app/reports/catalog/service.py` | 树 CRUD/move + 循环/深度守卫 | 新建 |
| `backend/app/reports/scheduler/schemas.py` | RPT-005 DTO | 新建 |
| `backend/app/reports/scheduler/errors.py` | `ScheduleError` + `RPT_SCHEDULE_*` | 新建 |
| `backend/app/reports/scheduler/service.py` | FSM + cron 校验 | 新建 |
| `backend/app/dashboard/theme/schemas.py` | DASH-006 `EntityThemeConfig` | 新建 |
| `backend/app/dashboard/theme/errors.py` | `ThemeAnalysisError` + `DASH_THEME_*` | 新建 |
| `backend/app/dashboard/theme/service.py` | validate/save/get via config_store | 新建 |
| `backend/app/query/dataset/schemas.py` | QUERY-009 `DatasetQuerySpec` | 新建 |
| `backend/app/query/dataset/guard.py` | 路径解析 + ACL + readonly | 新建 |
| `backend/app/core/nfr/runtime_guard.py` | NFR-008 扫描 + 报告 | 新建 |
| `backend/app/core/nfr/errors.py` | +`NFR_RUNTIME_VIOLATION` | 修改 |
| `backend/app/api/v1/reports.py` | catalog + scheduler 路由簇 | 新建 |
| `backend/app/api/v1/dashboards.py` | +theme-analysis 路由 | 修改 |
| `backend/app/api/v1/query.py` | +dataset routing/validate | 修改 |
| `backend/app/api/v1/nfr.py` | +runtime-compliance | 修改 |
| `backend/app/api/v1/router.py` | `include_router(reports_router)` | 修改 |
| `backend/app/query/config_store/schemas.py` | +`entity_theme` config type | 修改 |
| `tests/test_dash_rpt_query_nfr_r53.py` | 新套件 ≥38 断言函数 | 新建 |

预估 **P3 生产代码文件 18**（含 `config_store/schemas.py` 扩展）；docs Task 8 另计。

---

## Shared Test Fixtures（全 Task 复用）

在 `tests/test_dash_rpt_query_nfr_r53.py` 顶部建立（Task 1 Step 1 写入，后续 Task 追加用例）：

```python
"""M9 主题分析 + M10/M12 报表 + M13 Dataset/NFR L1 kickoff r53."""
from __future__ import annotations

import os
import uuid
from collections.abc import Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.auth.deps import UserContext, get_current_user
from app.core.config import get_settings
from app.main import app

_R53_SQLITE_URL = "sqlite+pysqlite:///file:dash_rpt_query_nfr_r53?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r53_sqlite_env():
    previous_db = os.environ.get("DATABASE_URL")
    previous_nfr08 = os.environ.get("NFR08_RUNTIME_MODE")
    os.environ["DATABASE_URL"] = _R53_SQLITE_URL
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
    app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def analyst_user() -> Generator[None, None, None]:
    async def _override() -> UserContext:
        return UserContext(id="analyst-1", username="analyst", roles=["analyst"])

    app.dependency_overrides[get_current_user] = _override
    yield
    app.dependency_overrides.pop(get_current_user, None)


def _create_dashboard(client: TestClient, name: str = "R53 Dash") -> str:
    resp = client.post(
        "/api/v1/dashboards",
        headers=AUTH,
        json={"name": f"{name}-{uuid.uuid4().hex[:6]}", "description": "r53 fixture"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _theme_config_payload(ref_id: str) -> dict:
    return {
        "entityType": "store",
        "timeGranularity": "month",
        "dimensions": [{"dimensionId": "region", "label": "Region", "sortOrder": 0}],
        "refType": "dashboard",
        "refId": ref_id,
    }
```

---

### Task 1: 测试夹具 + config_store 类型扩展

**Files:**
- Modify: `backend/app/query/config_store/schemas.py`
- Create: `tests/test_dash_rpt_query_nfr_r53.py`（夹具 + 2 条启动测）

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`

**UI skill:** none

**Interfaces:**
- Produces: `ALLOWED_CONFIG_TYPES` 含 `entity_theme`

- [ ] **Step 1: Write the failing test**

在 `tests/test_dash_rpt_query_nfr_r53.py` 写入上文 **Shared Test Fixtures** 全文，并追加：

```python
from app.query.config_store.schemas import ALLOWED_CONFIG_TYPES


def test_r53_fixture_bootstraps(client):
    """T-R53-000-01: r53 sqlite 环境 health 可达。"""
    resp = client.get("/health")
    assert resp.status_code == 200


def test_r53_config_types_include_entity_theme():
    """T-R53-000-02: config_store 允许 entity_theme。"""
    assert "entity_theme" in ALLOWED_CONFIG_TYPES
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py::test_r53_config_types_include_entity_theme -v`
Expected: FAIL — `"entity_theme" not in ALLOWED_CONFIG_TYPES`

- [ ] **Step 3: Write minimal implementation**

`backend/app/query/config_store/schemas.py` 第 9–16 行改为：

```python
ALLOWED_CONFIG_TYPES = frozenset({
    "query_conditions",
    "compute_rules",
    "visual_query_design",
    "sql_mode",
    "output_fields",
    "workflow_instance",
    "entity_theme",
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/query/config_store/schemas.py tests/test_dash_rpt_query_nfr_r53.py
git commit -m "test(r53): scaffold fixture and extend config_store entity_theme type"
```

---

### Task 2: RPT-004 报表模板树 catalog

**Files:**
- Create: `backend/app/reports/catalog/errors.py`
- Create: `backend/app/reports/catalog/schemas.py`
- Create: `backend/app/reports/catalog/service.py`
- Create: `backend/app/api/v1/reports.py`（catalog 路由簇）
- Modify: `backend/app/api/v1/router.py`

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`
- Read `.agents/skills/bug-case-library/SKILL.md`

**UI skill:** none

**Interfaces:**
- Produces: `create_node(payload) -> CatalogNodeOut`、`move_node(node_id, parent_id) -> CatalogNodeOut`、`delete_node(node_id) -> None`
- Error codes: `RPT_CATALOG_CYCLE`, `RPT_CATALOG_HAS_CHILDREN`, `RPT_CATALOG_PARENT_NOT_FOUND`, `RPT_CATALOG_MAX_DEPTH`, `RPT_CATALOG_NODE_NOT_FOUND`

- [ ] **Step 1: Write the failing test**

在 `tests/test_dash_rpt_query_nfr_r53.py` 追加：

```python
def test_rpt004_create_root_folder(client):
    """T-RPT-R53-004-01: POST 根 folder → 201 + id。"""
    resp = client.post(
        "/api/v1/reports/catalog/nodes",
        headers=AUTH,
        json={"name": "Templates", "nodeType": "folder"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["nodeType"] == "folder"
    assert resp.json()["parentId"] is None


def test_rpt004_create_child_node(client):
    """T-RPT-R53-004-02: POST 子节点 parentId 有效 → 201。"""
    parent = client.post(
        "/api/v1/reports/catalog/nodes",
        headers=AUTH,
        json={"name": "Parent", "nodeType": "folder"},
    ).json()
    resp = client.post(
        "/api/v1/reports/catalog/nodes",
        headers=AUTH,
        json={"name": "Child", "nodeType": "template", "parentId": parent["id"], "templateKind": "pdf"},
    )
    assert resp.status_code == 201
    assert resp.json()["parentId"] == parent["id"]


def test_rpt004_move_cycle_rejected(client):
    """T-RPT-R53-004-03: move 至子孙 → 422 RPT_CATALOG_CYCLE。"""
    root = client.post("/api/v1/reports/catalog/nodes", headers=AUTH, json={"name": "R", "nodeType": "folder"}).json()
    child = client.post(
        "/api/v1/reports/catalog/nodes",
        headers=AUTH,
        json={"name": "C", "nodeType": "folder", "parentId": root["id"]},
    ).json()
    resp = client.post(
        f"/api/v1/reports/catalog/nodes/{root['id']}/move",
        headers=AUTH,
        json={"parentId": child["id"]},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "RPT_CATALOG_CYCLE"


def test_rpt004_delete_with_children_rejected(client):
    """T-RPT-R53-004-04: delete 有子节点 → 409 RPT_CATALOG_HAS_CHILDREN。"""
    parent = client.post("/api/v1/reports/catalog/nodes", headers=AUTH, json={"name": "P", "nodeType": "folder"}).json()
    client.post(
        "/api/v1/reports/catalog/nodes",
        headers=AUTH,
        json={"name": "C", "nodeType": "folder", "parentId": parent["id"]},
    )
    resp = client.delete(f"/api/v1/reports/catalog/nodes/{parent['id']}", headers=AUTH)
    assert resp.status_code == 409
    assert resp.json()["code"] == "RPT_CATALOG_HAS_CHILDREN"


def test_rpt004_parent_not_found(client):
    """T-RPT-R53-004-05: parentId 不存在 → 404 RPT_CATALOG_PARENT_NOT_FOUND。"""
    resp = client.post(
        "/api/v1/reports/catalog/nodes",
        headers=AUTH,
        json={"name": "Orphan", "nodeType": "folder", "parentId": str(uuid.uuid4())},
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "RPT_CATALOG_PARENT_NOT_FOUND"


def test_rpt004_max_depth_rejected(client):
    """T-RPT-R53-004-06: 深度 > MAX_CATALOG_DEPTH → 422 RPT_CATALOG_MAX_DEPTH。"""
    from app.reports.catalog.service import MAX_CATALOG_DEPTH

    parent_id = None
    for i in range(MAX_CATALOG_DEPTH + 1):
        payload = {"name": f"L{i}", "nodeType": "folder"}
        if parent_id:
            payload["parentId"] = parent_id
        resp = client.post("/api/v1/reports/catalog/nodes", headers=AUTH, json=payload)
        if i == MAX_CATALOG_DEPTH:
            assert resp.status_code == 422
            assert resp.json()["code"] == "RPT_CATALOG_MAX_DEPTH"
            break
        assert resp.status_code == 201, resp.text
        parent_id = resp.json()["id"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -k rpt004 -v`
Expected: FAIL — `404` on `/api/v1/reports/catalog/nodes`（路由不存在）

- [ ] **Step 3: Write minimal implementation**

`backend/app/reports/catalog/errors.py`：

```python
from __future__ import annotations


class ReportCatalogError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)
```

`backend/app/reports/catalog/schemas.py`：

```python
from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CatalogNodeCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str = Field(min_length=1, max_length=120)
    parent_id: uuid.UUID | None = Field(default=None, alias="parentId")
    node_type: Literal["folder", "template"] = Field(default="folder", alias="nodeType")
    template_kind: Literal["word", "excel", "pdf"] | None = Field(default=None, alias="templateKind")
    sort_order: int = Field(default=0, alias="sortOrder")


class CatalogNodeMove(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    parent_id: uuid.UUID | None = Field(default=None, alias="parentId")


class CatalogNodeUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    sort_order: int | None = Field(default=None, alias="sortOrder")


class CatalogNodeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None = Field(alias="parentId")
    node_type: str = Field(alias="nodeType")
    template_kind: str | None = Field(default=None, alias="templateKind")
    sort_order: int = Field(alias="sortOrder")
```

`backend/app/reports/catalog/service.py`：

```python
from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.reports.catalog.errors import ReportCatalogError
from app.reports.catalog.schemas import CatalogNodeCreate, CatalogNodeMove, CatalogNodeOut, CatalogNodeUpdate

MAX_CATALOG_DEPTH = 8
_nodes: dict[uuid.UUID, dict] = {}


@dataclass
class _Node:
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None
    node_type: str
    template_kind: str | None
    sort_order: int


def _to_out(node: _Node) -> CatalogNodeOut:
    return CatalogNodeOut(
        id=node.id,
        name=node.name,
        parentId=node.parent_id,
        nodeType=node.node_type,
        templateKind=node.template_kind,
        sortOrder=node.sort_order,
    )


def _get(node_id: uuid.UUID) -> _Node:
    raw = _nodes.get(node_id)
    if raw is None:
        raise ReportCatalogError("RPT_CATALOG_NODE_NOT_FOUND", "Catalog node not found", 404)
    return _Node(**raw)


def _depth(node_id: uuid.UUID | None) -> int:
    depth = 0
    current = node_id
    seen: set[uuid.UUID] = set()
    while current is not None:
        if current in seen:
            break
        seen.add(current)
        depth += 1
        if depth > MAX_CATALOG_DEPTH:
            break
        raw = _nodes.get(current)
        if raw is None:
            break
        current = raw["parent_id"]
    return depth


def _subtree_height(node_id: uuid.UUID) -> int:
    height = 0
    frontier = [node_id]
    while frontier:
        height += 1
        if height > MAX_CATALOG_DEPTH:
            break
        next_level: list[uuid.UUID] = []
        for nid in frontier:
            next_level.extend(child_id for child_id, raw in _nodes.items() if raw["parent_id"] == nid)
        frontier = next_level
    return height


def _collect_descendants(node_id: uuid.UUID) -> set[uuid.UUID]:
    out: set[uuid.UUID] = set()
    frontier = [node_id]
    while frontier:
        current = frontier.pop()
        for child_id, raw in _nodes.items():
            if raw["parent_id"] == current and child_id not in out:
                out.add(child_id)
                frontier.append(child_id)
    return out


def _assert_depth(parent_id: uuid.UUID | None, subtree_root: uuid.UUID | None = None) -> None:
    extra = _subtree_height(subtree_root) if subtree_root else 1
    if _depth(parent_id) + extra > MAX_CATALOG_DEPTH:
        raise ReportCatalogError(
            "RPT_CATALOG_MAX_DEPTH",
            f"Catalog tree depth cannot exceed {MAX_CATALOG_DEPTH}",
            422,
        )


def list_nodes(parent_id: uuid.UUID | None = None) -> list[CatalogNodeOut]:
    items = [_get(nid) for nid in _nodes]
    if parent_id is not None:
        items = [n for n in items if n.parent_id == parent_id]
    else:
        items = [n for n in items if n.parent_id is None]
    return [_to_out(n) for n in sorted(items, key=lambda x: (x.sort_order, x.name))]


def create_node(payload: CatalogNodeCreate) -> CatalogNodeOut:
    if payload.parent_id is not None and payload.parent_id not in _nodes:
        raise ReportCatalogError("RPT_CATALOG_PARENT_NOT_FOUND", "Parent node not found", 404)
    _assert_depth(payload.parent_id)
    node_id = uuid.uuid4()
    _nodes[node_id] = {
        "id": node_id,
        "name": payload.name,
        "parent_id": payload.parent_id,
        "node_type": payload.node_type,
        "template_kind": payload.template_kind,
        "sort_order": payload.sort_order,
    }
    return _to_out(_get(node_id))


def get_node(node_id: uuid.UUID) -> CatalogNodeOut:
    return _to_out(_get(node_id))


def update_node(node_id: uuid.UUID, payload: CatalogNodeUpdate) -> CatalogNodeOut:
    node = _get(node_id)
    if payload.name is not None:
        _nodes[node_id]["name"] = payload.name
    if payload.sort_order is not None:
        _nodes[node_id]["sort_order"] = payload.sort_order
    return _to_out(_get(node_id))


def delete_node(node_id: uuid.UUID) -> None:
    _get(node_id)
    if any(raw["parent_id"] == node_id for raw in _nodes.values()):
        raise ReportCatalogError("RPT_CATALOG_HAS_CHILDREN", "Cannot delete node with children", 409)
    del _nodes[node_id]


def move_node(node_id: uuid.UUID, payload: CatalogNodeMove) -> CatalogNodeOut:
    node = _get(node_id)
    parent_id = payload.parent_id
    if parent_id == node_id:
        raise ReportCatalogError("RPT_CATALOG_CYCLE", "Cannot move node under itself", 422)
    if parent_id is not None:
        if parent_id in _collect_descendants(node_id):
            raise ReportCatalogError("RPT_CATALOG_CYCLE", "Cannot move node under its descendant", 422)
        if parent_id not in _nodes:
            raise ReportCatalogError("RPT_CATALOG_PARENT_NOT_FOUND", "Parent node not found", 404)
    _assert_depth(parent_id, node_id)
    _nodes[node_id]["parent_id"] = parent_id
    return _to_out(_get(node_id))


def node_exists(node_id: uuid.UUID) -> bool:
    return node_id in _nodes
```

`backend/app/api/v1/reports.py`（catalog 段）：

```python
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from app.auth.deps import UserContext, get_current_user
from app.reports.catalog.errors import ReportCatalogError
from app.reports.catalog.schemas import CatalogNodeCreate, CatalogNodeMove, CatalogNodeOut, CatalogNodeUpdate
from app.reports.catalog import service as catalog_service

router = APIRouter(prefix="/reports", tags=["reports"])


def _catalog_error(exc: ReportCatalogError) -> JSONResponse:
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": None})


@router.get("/catalog/nodes")
def list_catalog_nodes(
    _: Annotated[UserContext, Depends(get_current_user)],
    parent_id: uuid.UUID | None = Query(default=None, alias="parentId"),
) -> list[CatalogNodeOut]:
    return catalog_service.list_nodes(parent_id)


@router.post("/catalog/nodes", status_code=status.HTTP_201_CREATED)
def create_catalog_node(
    payload: CatalogNodeCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> CatalogNodeOut | JSONResponse:
    try:
        return catalog_service.create_node(payload)
    except ReportCatalogError as exc:
        return _catalog_error(exc)


@router.get("/catalog/nodes/{node_id}")
def get_catalog_node(
    node_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> CatalogNodeOut | JSONResponse:
    try:
        return catalog_service.get_node(node_id)
    except ReportCatalogError as exc:
        return _catalog_error(exc)


@router.patch("/catalog/nodes/{node_id}")
def update_catalog_node(
    node_id: uuid.UUID,
    payload: CatalogNodeUpdate,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> CatalogNodeOut | JSONResponse:
    try:
        return catalog_service.update_node(node_id, payload)
    except ReportCatalogError as exc:
        return _catalog_error(exc)


@router.delete("/catalog/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_catalog_node(
    node_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> JSONResponse | None:
    try:
        catalog_service.delete_node(node_id)
        return None
    except ReportCatalogError as exc:
        return _catalog_error(exc)


@router.post("/catalog/nodes/{node_id}/move")
def move_catalog_node(
    node_id: uuid.UUID,
    payload: CatalogNodeMove,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> CatalogNodeOut | JSONResponse:
    try:
        return catalog_service.move_node(node_id, payload)
    except ReportCatalogError as exc:
        return _catalog_error(exc)
```

`backend/app/api/v1/router.py` 追加：

```python
from app.api.v1.reports import router as reports_router
# ...
api_v1_router.include_router(reports_router)
```

（放在 `reports_export_router` 之后。）

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -k rpt004 -v`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/reports/catalog/ backend/app/api/v1/reports.py backend/app/api/v1/router.py tests/test_dash_rpt_query_nfr_r53.py
git commit -m "feat(r53): RPT-004 report catalog tree REST skeleton"
```

---

### Task 3: RPT-005 报表调度 FSM

**Files:**
- Create: `backend/app/reports/scheduler/errors.py`
- Create: `backend/app/reports/scheduler/schemas.py`
- Create: `backend/app/reports/scheduler/service.py`
- Modify: `backend/app/api/v1/reports.py`（追加 scheduler 路由簇）

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`

**UI skill:** none

**Interfaces:**
- Consumes: `catalog_service.node_exists(catalog_node_id) -> bool`
- Produces: `create_schedule(payload) -> ScheduleStatusOut`、`transition_schedule(id, action) -> ScheduleStatusOut`
- Error codes: `RPT_SCHEDULE_INVALID_TRANSITION`, `RPT_SCHEDULE_INVALID_CRON`, `RPT_SCHEDULE_NOT_FOUND`

- [ ] **Step 1: Write the failing test**

在 `tests/test_dash_rpt_query_nfr_r53.py` 追加：

```python
def _create_template_node(client: TestClient) -> str:
    resp = client.post(
        "/api/v1/reports/catalog/nodes",
        headers=AUTH,
        json={"name": "Tpl", "nodeType": "template", "templateKind": "excel"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def test_rpt005_create_schedule_draft(client):
    """T-RPT-R53-005-01: POST schedule catalogNodeId 有效 + cron → draft。"""
    node_id = _create_template_node(client)
    resp = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={"catalogNodeId": node_id, "cron": "0 8 * * *"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "draft"
    assert resp.json()["catalogNodeId"] == node_id


def test_rpt005_schedule_transition_flow(client):
    """T-RPT-R53-005-02~04: draft→scheduled→paused→scheduled→cancelled。"""
    node_id = _create_template_node(client)
    created = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={"catalogNodeId": node_id, "cron": "0 8 * * *"},
    ).json()
    sid = created["id"]
    for action, expected in (
        ("schedule", "scheduled"),
        ("pause", "paused"),
        ("resume", "scheduled"),
        ("cancel", "cancelled"),
    ):
        resp = client.post(
            f"/api/v1/reports/schedules/{sid}/transition",
            headers=AUTH,
            json={"action": action},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["status"] == expected


def test_rpt005_invalid_transition_from_draft(client):
    """T-RPT-R53-005-05: draft + pause → 400 RPT_SCHEDULE_INVALID_TRANSITION。"""
    node_id = _create_template_node(client)
    sid = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={"catalogNodeId": node_id, "cron": "0 8 * * *"},
    ).json()["id"]
    resp = client.post(
        f"/api/v1/reports/schedules/{sid}/transition",
        headers=AUTH,
        json={"action": "pause"},
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == "RPT_SCHEDULE_INVALID_TRANSITION"


def test_rpt005_catalog_node_not_found(client):
    """T-RPT-R53-005-06: catalogNodeId 不存在 → 404。"""
    resp = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={"catalogNodeId": str(uuid.uuid4()), "cron": "0 8 * * *"},
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "RPT_CATALOG_NODE_NOT_FOUND"


def test_rpt005_invalid_cron(client):
    """T-RPT-R53-005-07: cron invalid → 422 RPT_SCHEDULE_INVALID_CRON。"""
    node_id = _create_template_node(client)
    resp = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={"catalogNodeId": node_id, "cron": "invalid"},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "RPT_SCHEDULE_INVALID_CRON"


def test_rpt005_get_allowed_actions(client):
    """T-RPT-R53-005-08: GET 含 allowedActions 与 catalogNodeId。"""
    node_id = _create_template_node(client)
    sid = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={"catalogNodeId": node_id, "cron": "0 8 * * *"},
    ).json()["id"]
    resp = client.get(f"/api/v1/reports/schedules/{sid}", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert body["catalogNodeId"] == node_id
    assert "schedule" in body["allowedActions"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -k rpt005 -v`
Expected: FAIL — `404` on `/api/v1/reports/schedules`

- [ ] **Step 3: Write minimal implementation**

`backend/app/reports/scheduler/errors.py`：

```python
from __future__ import annotations


class ScheduleError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)
```

`backend/app/reports/scheduler/schemas.py`：

```python
from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ScheduleCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    catalog_node_id: uuid.UUID = Field(alias="catalogNodeId")
    cron: str = Field(min_length=9, max_length=64)
    timezone: str = Field(default="Asia/Shanghai", max_length=64)


class ScheduleTransitionIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    action: Literal["schedule", "pause", "resume", "cancel"]


class ScheduleStatusOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: uuid.UUID
    catalog_node_id: uuid.UUID = Field(alias="catalogNodeId")
    cron: str
    timezone: str
    status: str
    allowed_actions: list[str] = Field(alias="allowedActions")
```

`backend/app/reports/scheduler/service.py`：

```python
from __future__ import annotations

import re
import uuid

from app.reports.catalog import service as catalog_service
from app.reports.catalog.errors import ReportCatalogError
from app.reports.scheduler.errors import ScheduleError
from app.reports.scheduler.schemas import ScheduleCreate, ScheduleStatusOut

_ALLOWED: dict[str, frozenset[str]] = {
    "draft": frozenset({"schedule"}),
    "scheduled": frozenset({"pause", "cancel"}),
    "paused": frozenset({"resume", "cancel"}),
    "cancelled": frozenset(),
}
_TRANSITIONS: dict[str, dict[str, str]] = {
    "draft": {"schedule": "scheduled"},
    "scheduled": {"pause": "paused", "cancel": "cancelled"},
    "paused": {"resume": "scheduled", "cancel": "cancelled"},
}
_CRON_PART = re.compile(r"^[\d*,\-]+$")
_schedules: dict[uuid.UUID, dict] = {}


def _validate_cron(cron: str) -> None:
    parts = cron.split()
    if len(parts) != 5 or not all(_CRON_PART.match(p) for p in parts):
        raise ScheduleError("RPT_SCHEDULE_INVALID_CRON", "Invalid cron expression", 422)


def _out(row: dict) -> ScheduleStatusOut:
    return ScheduleStatusOut(
        id=row["id"],
        catalogNodeId=row["catalog_node_id"],
        cron=row["cron"],
        timezone=row["timezone"],
        status=row["status"],
        allowedActions=sorted(_ALLOWED.get(row["status"], frozenset())),
    )


def create_schedule(payload: ScheduleCreate) -> ScheduleStatusOut:
    if not catalog_service.node_exists(payload.catalog_node_id):
        raise ReportCatalogError("RPT_CATALOG_NODE_NOT_FOUND", "Catalog node not found", 404)
    _validate_cron(payload.cron)
    schedule_id = uuid.uuid4()
    row = {
        "id": schedule_id,
        "catalog_node_id": payload.catalog_node_id,
        "cron": payload.cron,
        "timezone": payload.timezone,
        "status": "draft",
    }
    _schedules[schedule_id] = row
    return _out(row)


def get_schedule(schedule_id: uuid.UUID) -> ScheduleStatusOut:
    row = _schedules.get(schedule_id)
    if row is None:
        raise ScheduleError("RPT_SCHEDULE_NOT_FOUND", "Schedule not found", 404)
    return _out(row)


def transition_schedule(schedule_id: uuid.UUID, action: str) -> ScheduleStatusOut:
    row = _schedules.get(schedule_id)
    if row is None:
        raise ScheduleError("RPT_SCHEDULE_NOT_FOUND", "Schedule not found", 404)
    status = row["status"]
    mapping = _TRANSITIONS.get(status, {})
    if action not in mapping:
        raise ScheduleError("RPT_SCHEDULE_INVALID_TRANSITION", f"Cannot {action} from {status}", 400)
    row["status"] = mapping[action]
    return _out(row)
```

在 `backend/app/api/v1/reports.py` 追加：

```python
from app.reports.scheduler.errors import ScheduleError
from app.reports.scheduler.schemas import ScheduleCreate, ScheduleStatusOut, ScheduleTransitionIn
from app.reports.scheduler import service as scheduler_service


def _schedule_error(exc: ScheduleError) -> JSONResponse:
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": None})


@router.post("/schedules", status_code=status.HTTP_201_CREATED)
def create_schedule(
    payload: ScheduleCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ScheduleStatusOut | JSONResponse:
    try:
        return scheduler_service.create_schedule(payload)
    except ReportCatalogError as exc:
        return _catalog_error(exc)
    except ScheduleError as exc:
        return _schedule_error(exc)


@router.get("/schedules/{schedule_id}")
def get_schedule(
    schedule_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ScheduleStatusOut | JSONResponse:
    try:
        return scheduler_service.get_schedule(schedule_id)
    except ScheduleError as exc:
        return _schedule_error(exc)


@router.post("/schedules/{schedule_id}/transition")
def transition_schedule(
    schedule_id: uuid.UUID,
    payload: ScheduleTransitionIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ScheduleStatusOut | JSONResponse:
    try:
        return scheduler_service.transition_schedule(schedule_id, payload.action)
    except ScheduleError as exc:
        return _schedule_error(exc)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -k "rpt004 or rpt005" -v`
Expected: 14 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/reports/scheduler/ backend/app/api/v1/reports.py tests/test_dash_rpt_query_nfr_r53.py
git commit -m "feat(r53): RPT-005 report schedule FSM REST skeleton"
```

---

### Task 4: DASH-006 实体主题分析 config

**Files:**
- Create: `backend/app/dashboard/theme/errors.py`
- Create: `backend/app/dashboard/theme/schemas.py`
- Create: `backend/app/dashboard/theme/service.py`
- Modify: `backend/app/api/v1/dashboards.py`

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`

**UI skill:** none

**Interfaces:**
- Consumes: `dash_service.get_dashboard(db, ref_id)` for ref validation
- Produces: `validate_theme_config(config) -> EntityThemeConfig`、`save_theme_config(session, config, owner_id) -> EntityThemeConfig`
- Error codes: `DASH_THEME_EMPTY_DIMENSIONS`, `DASH_THEME_INVALID_GRANULARITY`, `DASH_THEME_INVALID_GEO`, `DASH_NOT_FOUND`

- [ ] **Step 1: Write the failing test**

在 `tests/test_dash_rpt_query_nfr_r53.py` 追加：

```python
def test_dash006_validate_ok(client):
    """T-DASH-R53-006-01: 合法 config validate → 200。"""
    dash_id = _create_dashboard(client)
    resp = client.post(
        "/api/v1/dashboards/theme-analysis/validate",
        headers=AUTH,
        json=_theme_config_payload(dash_id),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["entityType"] == "store"


def test_dash006_empty_dimensions(client):
    """T-DASH-R53-006-02: 空 dimensions → 422 DASH_THEME_EMPTY_DIMENSIONS。"""
    dash_id = _create_dashboard(client)
    payload = _theme_config_payload(dash_id)
    payload["dimensions"] = []
    resp = client.post("/api/v1/dashboards/theme-analysis/validate", headers=AUTH, json=payload)
    assert resp.status_code == 422
    assert resp.json()["code"] == "DASH_THEME_EMPTY_DIMENSIONS"


def test_dash006_invalid_granularity(client):
    """T-DASH-R53-006-03: 非法 timeGranularity → 422 DASH_THEME_INVALID_GRANULARITY。"""
    dash_id = _create_dashboard(client)
    payload = _theme_config_payload(dash_id)
    payload["timeGranularity"] = "quarter"
    resp = client.post("/api/v1/dashboards/theme-analysis/validate", headers=AUTH, json=payload)
    assert resp.status_code == 422
    assert resp.json()["code"] == "DASH_THEME_INVALID_GRANULARITY"


def test_dash006_invalid_geo(client):
    """T-DASH-R53-006-04: geoBinding 缺 latField → 422 DASH_THEME_INVALID_GEO。"""
    dash_id = _create_dashboard(client)
    payload = _theme_config_payload(dash_id)
    payload["geoBinding"] = {"lngField": "lng"}
    resp = client.post("/api/v1/dashboards/theme-analysis/validate", headers=AUTH, json=payload)
    assert resp.status_code == 422
    assert resp.json()["code"] == "DASH_THEME_INVALID_GEO"


def test_dash006_put_get_roundtrip(client):
    """T-DASH-R53-006-05: PUT → GET 往返一致。"""
    dash_id = _create_dashboard(client)
    payload = _theme_config_payload(dash_id)
    put = client.put("/api/v1/dashboards/theme-analysis", headers=AUTH, json=payload)
    assert put.status_code == 200, put.text
    got = client.get(
        "/api/v1/dashboards/theme-analysis",
        headers=AUTH,
        params={"refType": "dashboard", "refId": dash_id},
    )
    assert got.status_code == 200
    assert got.json()["entityType"] == payload["entityType"]
    assert got.json()["refId"] == dash_id


def test_dash006_ref_not_found(client):
    """T-DASH-R53-006-06: ref 指向不存在 dashboard → 404 DASH_NOT_FOUND。"""
    payload = _theme_config_payload(str(uuid.uuid4()))
    resp = client.put("/api/v1/dashboards/theme-analysis", headers=AUTH, json=payload)
    assert resp.status_code == 404
    assert resp.json()["code"] == "DASH_NOT_FOUND"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -k dash006 -v`
Expected: FAIL — `404` on `/api/v1/dashboards/theme-analysis/validate`

- [ ] **Step 3: Write minimal implementation**

`backend/app/dashboard/theme/errors.py`：

```python
from __future__ import annotations


class ThemeAnalysisError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, fields: list | None = None) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields or []
        super().__init__(message)
```

`backend/app/dashboard/theme/schemas.py`：

```python
from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

_VALID_GRANULARITY = frozenset({"day", "week", "month", "yoy", "mom"})


class ThemeDimensionBinding(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dimension_id: str = Field(alias="dimensionId", min_length=1, max_length=64)
    label: str | None = None
    sort_order: int = Field(default=0, alias="sortOrder")


class GeoBinding(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    lat_field: str = Field(alias="latField", min_length=1)
    lng_field: str = Field(alias="lngField", min_length=1)
    admin_code_field: str | None = Field(default=None, alias="adminCodeField")


class EntityThemeConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    schema_version: str = Field(default="1.0", alias="schemaVersion")
    entity_type: str = Field(alias="entityType", min_length=1, max_length=64)
    time_granularity: str = Field(alias="timeGranularity")
    dimensions: list[ThemeDimensionBinding] = Field(min_length=1)
    geo_binding: GeoBinding | None = Field(default=None, alias="geoBinding")
    ref_type: str = Field(default="dashboard", alias="refType")
    ref_id: uuid.UUID = Field(alias="refId")

    @field_validator("time_granularity")
    @classmethod
    def _granularity(cls, value: str) -> str:
        if value not in _VALID_GRANULARITY:
            raise ValueError("invalid granularity")
        return value
```

`backend/app/dashboard/theme/service.py`：

```python
from __future__ import annotations

import uuid

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.dashboard import service as dash_service
from app.dashboard.theme.errors import ThemeAnalysisError
from app.dashboard.theme.schemas import EntityThemeConfig
from app.query.config_store import service as config_store
from app.query.config_store.schemas import ConfigUpsert


def _map_validation(exc: ValidationError) -> ThemeAnalysisError:
    for err in exc.errors():
        loc = ".".join(str(x) for x in err["loc"])
        if "time_granularity" in loc or "timeGranularity" in loc:
            return ThemeAnalysisError("DASH_THEME_INVALID_GRANULARITY", "Invalid time granularity", 422)
        if "dimensions" in loc:
            return ThemeAnalysisError("DASH_THEME_EMPTY_DIMENSIONS", "At least one dimension required", 422)
    return ThemeAnalysisError("DASH_THEME_INVALID", "Invalid theme config", 422)


def validate_theme_config(payload: dict) -> EntityThemeConfig:
    try:
        config = EntityThemeConfig.model_validate(payload)
    except ValidationError as exc:
        raise _map_validation(exc) from exc
    if not config.dimensions:
        raise ThemeAnalysisError("DASH_THEME_EMPTY_DIMENSIONS", "At least one dimension required", 422)
    if config.geo_binding is not None:
        if not config.geo_binding.lat_field or not config.geo_binding.lng_field:
            raise ThemeAnalysisError("DASH_THEME_INVALID_GEO", "geoBinding requires latField and lngField", 422)
    return config


def _assert_ref_exists(db: Session, config: EntityThemeConfig) -> None:
    if config.ref_type == "dashboard":
        try:
            dash_service.get_dashboard(db, config.ref_id)
        except dash_service.DashboardError as exc:
            if exc.code == "DASH_NOT_FOUND":
                raise ThemeAnalysisError("DASH_NOT_FOUND", exc.message, 404) from exc
            raise


def save_theme_config(db: Session, payload: dict, owner_id: uuid.UUID | None) -> EntityThemeConfig:
    config = validate_theme_config(payload)
    _assert_ref_exists(db, config)
    config_store.upsert_config(
        db,
        ConfigUpsert(
            config_type="entity_theme",
            schema_version=config.schema_version,
            ref_type=config.ref_type,
            ref_id=config.ref_id,
            payload=config.model_dump(by_alias=True),
        ),
        owner_id=owner_id,
    )
    return config


def get_theme_config(db: Session, ref_type: str, ref_id: uuid.UUID) -> EntityThemeConfig:
    record = config_store.get_config_by_ref(db, "entity_theme", ref_type, ref_id)
    return validate_theme_config(record.payload)
```

在 `backend/app/api/v1/dashboards.py` 追加：

```python
from app.dashboard.theme.errors import ThemeAnalysisError
from app.dashboard.theme.schemas import EntityThemeConfig
from app.dashboard.theme import service as theme_service


def _theme_error(exc: ThemeAnalysisError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": detail})


@router.post("/theme-analysis/validate")
def validate_theme_analysis(
    payload: dict,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> EntityThemeConfig | JSONResponse:
    try:
        return theme_service.validate_theme_config(payload)
    except ThemeAnalysisError as exc:
        return _theme_error(exc)


@router.put("/theme-analysis")
def save_theme_analysis(
    payload: dict,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> EntityThemeConfig | JSONResponse:
    try:
        return theme_service.save_theme_config(db, payload, _parse_user_id(user))
    except ThemeAnalysisError as exc:
        return _theme_error(exc)


@router.get("/theme-analysis")
def get_theme_analysis(
    ref_type: str = Query(default="dashboard", alias="refType"),
    ref_id: uuid.UUID = Query(alias="refId"),
    _: Annotated[UserContext, Depends(get_current_user)] = None,
    db: Annotated[Session, Depends(_db)] = None,
) -> EntityThemeConfig | JSONResponse:
    try:
        return theme_service.get_theme_config(db, ref_type, ref_id)
    except ThemeAnalysisError as exc:
        return _theme_error(exc)
    except Exception as exc:
        from app.query.config_store.schemas import ConfigError
        if isinstance(exc, ConfigError) and exc.code == "CONFIG_NOT_FOUND":
            return JSONResponse(status_code=404, content={"code": "CONFIG_NOT_FOUND", "message": exc.message, "detail": None})
        raise
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -k dash006 -v`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/dashboard/theme/ backend/app/api/v1/dashboards.py tests/test_dash_rpt_query_nfr_r53.py
git commit -m "feat(r53): DASH-006 entity theme analysis config schema and validation"
```

---

### Task 5: QUERY-009 Dataset 查询路径守卫

**Files:**
- Create: `backend/app/query/dataset/schemas.py`
- Create: `backend/app/query/dataset/guard.py`
- Modify: `backend/app/api/v1/query.py`

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`
- Read `.agents/skills/bug-case-library/SKILL.md`

**UI skill:** none

**Interfaces:**
- Produces: `resolve_query_path(spec: dict) -> Literal["sql","native","dataset"]`、`validate_dataset_spec(spec, roles) -> DatasetValidateOut`、`dataset_routing_doc() -> dict`
- Error codes: `QUERY_DATASET_NOT_FOUND`, `QUERY_DATASET_FORBIDDEN`, `QUERY_DATASET_NOT_READONLY`, `QUERY_PATH_AMBIGUOUS`

- [ ] **Step 1: Write the failing test**

在 `tests/test_dash_rpt_query_nfr_r53.py` 追加：

```python
def test_query009_analyst_demo_orders_ok(client, analyst_user):
    """T-QUERY-R53-009-01: analyst + demo-orders → 200 readonly=true。"""
    resp = client.post(
        "/api/v1/query/dataset/validate",
        headers=AUTH,
        json={"datasetId": "demo-orders", "operation": "select"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["readonly"] is True
    assert resp.json()["resolvedPath"] == "dataset"


def test_query009_analyst_restricted_forbidden(client, analyst_user):
    """T-QUERY-R53-009-02: analyst + restricted-ledger → 403 QUERY_DATASET_FORBIDDEN。"""
    resp = client.post(
        "/api/v1/query/dataset/validate",
        headers=AUTH,
        json={"datasetId": "restricted-ledger", "operation": "select"},
    )
    assert resp.status_code == 403
    assert resp.json()["code"] == "QUERY_DATASET_FORBIDDEN"


def test_query009_unknown_dataset(client):
    """T-QUERY-R53-009-03: 未知 datasetId → 404 QUERY_DATASET_NOT_FOUND。"""
    resp = client.post(
        "/api/v1/query/dataset/validate",
        headers=AUTH,
        json={"datasetId": "missing-ds", "operation": "select"},
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "QUERY_DATASET_NOT_FOUND"


def test_query009_non_readonly_operation(client):
    """T-QUERY-R53-009-04: operation != select → 422 QUERY_DATASET_NOT_READONLY。"""
    resp = client.post(
        "/api/v1/query/dataset/validate",
        headers=AUTH,
        json={"datasetId": "demo-orders", "operation": "insert"},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "QUERY_DATASET_NOT_READONLY"


def test_query009_routing_doc(client):
    """T-QUERY-R53-009-05: routing 文档含 sql/native/dataset 三路径说明。"""
    resp = client.get("/api/v1/query/dataset/routing", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body["paths"]) == {"sql", "native", "dataset"}
    assert "sql" in body["boundaryNotes"]
    assert "native" in body["boundaryNotes"]
    assert "dataset" in body["boundaryNotes"]


def test_query009_path_ambiguous(client):
    """T-QUERY-R53-009-06: datasetId + dataSourceId 冲突 → 422 QUERY_PATH_AMBIGUOUS。"""
    resp = client.post(
        "/api/v1/query/dataset/validate",
        headers=AUTH,
        json={"datasetId": "demo-orders", "dataSourceId": str(uuid.uuid4()), "operation": "select"},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "QUERY_PATH_AMBIGUOUS"


def test_query009_native_validate_regression(client):
    """T-QUERY-R53-009-07: mysql native validate 仍走 r52 QUERY-003 路由。"""
    resp = client.post(
        "/api/v1/query/native/validate",
        headers=AUTH,
        json={"connectorType": "mysql", "body": {"sql": "SELECT 1"}},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "QUERY_NATIVE_SQL_DISGUISE"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -k query009 -v`
Expected: FAIL — `404` on `/api/v1/query/dataset/validate`

- [ ] **Step 3: Write minimal implementation**

`backend/app/query/dataset/schemas.py`：

```python
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DatasetQuerySpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    dataset_id: str = Field(alias="datasetId", min_length=1, max_length=64)
    parameters: dict[str, object] = Field(default_factory=dict)
    operation: str = "select"


class DatasetValidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str = Field(alias="datasetId")
    resolved_path: Literal["dataset"] = Field(default="dataset", alias="resolvedPath")
    readonly: bool = True


class DatasetRoutingOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    paths: list[str]
    boundary_notes: dict[str, str] = Field(alias="boundaryNotes")
```

`backend/app/query/dataset/guard.py`：

```python
from __future__ import annotations

from dataclasses import dataclass

from app.query.dataset.schemas import DatasetQuerySpec, DatasetRoutingOut, DatasetValidateOut
from app.query.schemas import QueryError

_BUILTIN_DATASETS: dict[str, dict] = {
    "demo-orders": {"allowedRoles": ["analyst"], "readonly": True},
    "restricted-ledger": {"allowedRoles": ["finance"], "readonly": True},
}


@dataclass(frozen=True)
class PathSignals:
    has_dataset: bool
    has_datasource: bool
    has_connector: bool
    has_sql: bool


def _signals(raw: dict) -> PathSignals:
    return PathSignals(
        has_dataset=bool(raw.get("datasetId")),
        has_datasource=bool(raw.get("dataSourceId")),
        has_connector=bool(raw.get("connectorType")),
        has_sql=bool(raw.get("sql")),
    )


def resolve_query_path(raw: dict) -> str:
    sig = _signals(raw)
    active = sum([sig.has_dataset, sig.has_datasource or sig.has_sql, sig.has_connector])
    if active > 1:
        raise QueryError("QUERY_PATH_AMBIGUOUS", "Conflicting query path fields", 422)
    if sig.has_dataset:
        return "dataset"
    if sig.has_connector:
        return "native"
    return "sql"


def dataset_routing_doc() -> DatasetRoutingOut:
    return DatasetRoutingOut(
        paths=["sql", "native", "dataset"],
        boundaryNotes={
            "sql": "dataSourceId + sql/table; must not include datasetId",
            "native": "connectorType + body; must not include datasetId or sql",
            "dataset": "datasetId + optional parameters; must not include dataSourceId/connectorType/sql",
        },
    )


def validate_dataset_spec(raw: dict, roles: list[str]) -> DatasetValidateOut:
    path = resolve_query_path(raw)
    if path != "dataset":
        raise QueryError("QUERY_PATH_AMBIGUOUS", "Expected dataset path", 422)
    spec = DatasetQuerySpec.model_validate(raw)
    if spec.operation != "select":
        raise QueryError("QUERY_DATASET_NOT_READONLY", "Dataset path allows select only", 422)
    meta = _BUILTIN_DATASETS.get(spec.dataset_id)
    if meta is None:
        raise QueryError("QUERY_DATASET_NOT_FOUND", "Dataset not found", 404)
    if "admin" not in roles and not any(r in meta["allowedRoles"] for r in roles):
        raise QueryError("QUERY_DATASET_FORBIDDEN", "Dataset access denied", 403)
    return DatasetValidateOut(datasetId=spec.dataset_id, resolvedPath="dataset", readonly=True)
```

在 `backend/app/api/v1/query.py` 追加：

```python
from app.query.dataset.guard import dataset_routing_doc, validate_dataset_spec
from app.query.dataset.schemas import DatasetRoutingOut, DatasetValidateOut


@router.get("/dataset/routing", response_model=DatasetRoutingOut)
def get_dataset_routing(
    _: Annotated[UserContext, Depends(get_current_user)],
) -> DatasetRoutingOut:
    return dataset_routing_doc()


@router.post("/dataset/validate", response_model=DatasetValidateOut)
def validate_dataset_query(
    payload: dict,
    user: Annotated[UserContext, Depends(get_current_user)],
) -> DatasetValidateOut | JSONResponse:
    try:
        return validate_dataset_spec(payload, user.roles)
    except QueryError as exc:
        return _error_response(exc)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -k query009 -v`
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/query/dataset/ backend/app/api/v1/query.py tests/test_dash_rpt_query_nfr_r53.py
git commit -m "feat(r53): QUERY-009 dataset query path routing and ACL guard"
```

---

### Task 6: NFR-008 零 DE/SS 运行时守卫

**Files:**
- Create: `backend/app/core/nfr/runtime_guard.py`
- Modify: `backend/app/core/nfr/errors.py`
- Modify: `backend/app/api/v1/nfr.py`

**Skills:**
- Read `.agents/skills/fastapi/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`

**UI skill:** none

**Interfaces:**
- Produces: `build_runtime_report(pyproject_text: str | None = None) -> RuntimeComplianceReport`、`assert_runtime_compliant(mode: str) -> None`
- Error code: `NFR_RUNTIME_VIOLATION`

- [ ] **Step 1: Write the failing test**

在 `tests/test_dash_rpt_query_nfr_r53.py` 追加：

```python
def test_nfr008_get_compliant(client):
    """T-NFR-R53-008-01: GET runtime-compliance overallStatus=compliant（默认环境）。"""
    resp = client.get("/api/v1/nfr/runtime-compliance", headers=AUTH)
    assert resp.status_code == 200, resp.text
    assert resp.json()["overallStatus"] == "compliant"
    assert resp.json()["zeroThirdPartyBiRuntime"] is True


def test_nfr008_pyproject_violation_detected(client):
    """T-NFR-R53-008-02: mock pyproject 含 apache-superset → item fail + remediation。"""
    fake = '[project]\ndependencies = ["apache-superset>=3.0"]\n'
    with patch("app.core.nfr.runtime_guard._read_pyproject_text", return_value=fake):
        resp = client.get("/api/v1/nfr/runtime-compliance", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json()["overallStatus"] == "non_compliant"
    deps = next(i for i in resp.json()["items"] if i["id"] == "pyproject-dependencies")
    assert deps["status"] == "fail"
    assert deps["remediation"]


def test_nfr008_loaded_modules_violation(client):
    """T-NFR-R53-008-03: mock find_spec(superset) → loaded-modules fail。"""
    with patch("importlib.util.find_spec", return_value=object()):
        resp = client.get("/api/v1/nfr/runtime-compliance", headers=AUTH)
    assert resp.status_code == 200
    mod = next(i for i in resp.json()["items"] if i["id"] == "loaded-modules")
    assert mod["status"] == "fail"


def test_nfr008_strict_assert_503(client):
    """T-NFR-R53-008-04: strict + 违规 → POST assert 503 NFR_RUNTIME_VIOLATION。"""
    fake = '[project]\ndependencies = ["dataease-client"]\n'
    with patch.dict(os.environ, {"NFR08_RUNTIME_MODE": "strict"}):
        get_settings.cache_clear()
        with patch("app.core.nfr.runtime_guard._read_pyproject_text", return_value=fake):
            resp = client.post("/api/v1/nfr/runtime-compliance/assert", headers=AUTH)
        get_settings.cache_clear()
    assert resp.status_code == 503
    assert resp.json()["code"] == "NFR_RUNTIME_VIOLATION"


def test_nfr008_permissive_assert_200(client):
    """T-NFR-R53-008-05: permissive + 违规 → POST assert 200。"""
    fake = '[project]\ndependencies = ["dataease-client"]\n'
    with patch.dict(os.environ, {"NFR08_RUNTIME_MODE": "permissive"}):
        get_settings.cache_clear()
        with patch("app.core.nfr.runtime_guard._read_pyproject_text", return_value=fake):
            resp = client.post("/api/v1/nfr/runtime-compliance/assert", headers=AUTH)
        get_settings.cache_clear()
    assert resp.status_code == 200
    assert resp.json()["overallStatus"] == "non_compliant"


def test_nfr008_zero_runtime_field(client):
    """T-NFR-R53-008-06: 报告含 zeroThirdPartyBiRuntime 字段。"""
    resp = client.get("/api/v1/nfr/runtime-compliance", headers=AUTH)
    assert "zeroThirdPartyBiRuntime" in resp.json()
    assert resp.json()["policyVersion"] == "nfr08-l1"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -k nfr008 -v`
Expected: FAIL — `404` on `/api/v1/nfr/runtime-compliance`

- [ ] **Step 3: Write minimal implementation**

`backend/app/core/nfr/errors.py` 追加：

```python
NFR_RUNTIME_VIOLATION = "NFR_RUNTIME_VIOLATION"
```

`backend/app/core/nfr/runtime_guard.py`：

```python
from __future__ import annotations

import importlib.util
import os
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from app.core.nfr.errors import NFR_RUNTIME_VIOLATION

_FORBIDDEN = frozenset({"superset", "dataease", "apache-superset"})
_FORBIDDEN_MODULES = frozenset({"superset", "dataease"})


@dataclass(frozen=True)
class RuntimeCheckItem:
    id: str
    status: str
    message: str
    remediation: str | None = None


@dataclass(frozen=True)
class RuntimeComplianceReport:
    policy_version: str
    overall_status: str
    zero_third_party_bi_runtime: bool
    scanned_at: str
    items: tuple[RuntimeCheckItem, ...]


class RuntimeComplianceError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


def _read_pyproject_text() -> str:
    path = Path(__file__).resolve().parents[3] / "pyproject.toml"
    return path.read_text(encoding="utf-8")


def _scan_pyproject(text: str) -> RuntimeCheckItem:
    lowered = text.lower()
    hit = next((name for name in _FORBIDDEN if name in lowered), None)
    if hit:
        return RuntimeCheckItem(
            "pyproject-dependencies",
            "fail",
            f"Forbidden BI dependency detected: {hit}",
            "Remove superset/dataease from pyproject dependencies",
        )
    return RuntimeCheckItem("pyproject-dependencies", "pass", "No forbidden BI dependencies in pyproject")


def _scan_modules() -> RuntimeCheckItem:
    for mod in _FORBIDDEN_MODULES:
        if importlib.util.find_spec(mod) is not None:
            return RuntimeCheckItem(
                "loaded-modules",
                "fail",
                f"Forbidden module loaded: {mod}",
                "Remove superset/dataease from runtime environment",
            )
    return RuntimeCheckItem("loaded-modules", "pass", "No forbidden BI modules loaded")


def build_runtime_report(pyproject_text: str | None = None) -> RuntimeComplianceReport:
    text = pyproject_text if pyproject_text is not None else _read_pyproject_text()
    items = (_scan_pyproject(text), _scan_modules(), RuntimeCheckItem("runtime-declaration", "pass", "zeroThirdPartyBiRuntime declared"))
    fails = [i for i in items if i.status == "fail"]
    overall = "non_compliant" if fails else "compliant"
    return RuntimeComplianceReport(
        policy_version="nfr08-l1",
        overall_status=overall,
        zero_third_party_bi_runtime=not fails,
        scanned_at=datetime.now(UTC).isoformat(),
        items=items,
    )


def assert_runtime_compliant(mode: str | None = None) -> RuntimeComplianceReport:
    mode = mode or os.environ.get("NFR08_RUNTIME_MODE", "permissive")
    report = build_runtime_report()
    if mode == "strict" and report.overall_status != "compliant":
        raise RuntimeComplianceError(NFR_RUNTIME_VIOLATION, "Runtime compliance violation detected")
    return report
```

在 `backend/app/api/v1/nfr.py` 追加：

```python
from app.core.nfr.errors import NFR_RUNTIME_VIOLATION
from app.core.nfr.runtime_guard import RuntimeComplianceError, RuntimeComplianceReport, assert_runtime_compliant, build_runtime_report


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


@router.post("/runtime-compliance/assert", response_model=RuntimeComplianceResponse)
def post_runtime_compliance_assert(
    _: Annotated[UserContext, Depends(get_current_user)],
) -> RuntimeComplianceResponse | JSONResponse:
    try:
        return _runtime_response(assert_runtime_compliant())
    except RuntimeComplianceError as exc:
        return JSONResponse(status_code=503, content={"code": NFR_RUNTIME_VIOLATION, "message": exc.message, "detail": None})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -k nfr008 -v`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/nfr/runtime_guard.py backend/app/core/nfr/errors.py backend/app/api/v1/nfr.py tests/test_dash_rpt_query_nfr_r53.py
git commit -m "feat(r53): NFR-008 zero DE/SS runtime compliance guard"
```

---

### Task 7: 联动测试 + 回归门控

**Files:**
- Modify: `tests/test_dash_rpt_query_nfr_r53.py`（追加 5 条联动测）

**Skills:**
- Read `.agents/skills/verification-before-completion/SKILL.md`
- Read `.agents/skills/test-driven-development/SKILL.md`

**UI skill:** none

**Interfaces:**
- Consumes: 全部 Task 2–6 路由

- [ ] **Step 1: Write the failing test**

在 `tests/test_dash_rpt_query_nfr_r53.py` 追加：

```python
def test_r53_link_catalog_schedule(client):
    """T-R53-LINK-01: catalog template → schedule 绑定 catalogNodeId。"""
    node_id = _create_template_node(client)
    sid = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={"catalogNodeId": node_id, "cron": "0 9 * * *"},
    ).json()["id"]
    got = client.get(f"/api/v1/reports/schedules/{sid}", headers=AUTH)
    assert got.json()["catalogNodeId"] == node_id


def test_r53_link_theme_ref_dashboard(client):
    """T-R53-LINK-02: DASH theme config ref 已有 dashboard。"""
    dash_id = _create_dashboard(client)
    put = client.put("/api/v1/dashboards/theme-analysis", headers=AUTH, json=_theme_config_payload(dash_id))
    assert put.status_code == 200
    assert put.json()["refId"] == dash_id


def test_r53_link_three_path_routing(client):
    """T-R53-LINK-03: 三路径 routing 与 native/validate 不冲突。"""
    routing = client.get("/api/v1/query/dataset/routing", headers=AUTH).json()
    assert "dataset" in routing["paths"]
    native = client.post(
        "/api/v1/query/native/validate",
        headers=AUTH,
        json={"connectorType": "elasticsearch", "body": {"query": {"match_all": {}}}},
    )
    assert native.status_code == 200


def test_r53_link_health(client):
    """T-R53-LINK-04: /health 200。"""
    assert client.get("/health").status_code == 200


def test_r53_link_nfr_endpoints_coexist(client):
    """T-R53-LINK-05: NFR runtime + xinchuang compliance 并存（不同 endpoint）。"""
    runtime = client.get("/api/v1/nfr/runtime-compliance", headers=AUTH)
    xinchuang = client.get("/api/v1/nfr/xinchuang/compliance", headers=AUTH)
    assert runtime.status_code == 200
    assert xinchuang.status_code == 200
    assert "/runtime-compliance" != "/xinchuang/compliance"
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd backend && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -v --tb=short`
Expected: **38 passed**（2 bootstrap + 6 RPT-004 + 8 RPT-005 + 6 DASH-006 + 7 QUERY-009 + 6 NFR-008 + 5 LINK - 2 overlap = 38；实际以文件内 def test_ 计数为准，须 ≥38）

- [ ] **Step 3: Run regression gate**

Run:
```bash
cd backend && python3 -m ruff check . && python3 -m pytest \
  ../tests/test_dash_rpt_query_nfr_r53.py \
  ../tests/test_design_conn_gov_query_r52.py \
  ../tests/test_design_conn_gov_query_r49.py \
  ../tests/test_nfr_gov_conn_r46.py \
  -q
```
Expected: ruff exit 0；r53 **38/38** + r52 **52/52** + r49 **35/35** + r46 **36/36** = **161/161**

- [ ] **Step 4: Commit**

```bash
git add tests/test_dash_rpt_query_nfr_r53.py
git commit -m "test(r53): linkage tests and regression gate 161/161"
```

---

### Task 8: 文档同步

**Files:**
- Modify: `docs/api/README.md`
- Create or Modify: `docs/services/reports.md`
- Modify: `docs/services/dashboard.md`（若存在）或新建
- Modify: `docs/services/query.md`
- Modify: `docs/services/core.md`（NFR-008 runtime 段落）
- Modify: `docs/services/README.md`

**Skills:**
- Read `.agents/skills/verification-before-completion/SKILL.md`

**UI skill:** none

**Interfaces:**
- 登记路由（每行一条）：
  - `GET/POST/PATCH/DELETE /api/v1/reports/catalog/nodes*` — RPT-004 — 已实现
  - `POST/GET /api/v1/reports/schedules*` — RPT-005 — 已实现
  - `POST/PUT/GET /api/v1/dashboards/theme-analysis*` — DASH-006 — 已实现
  - `GET/POST /api/v1/query/dataset/*` — QUERY-009 — 已实现
  - `GET/POST /api/v1/nfr/runtime-compliance*` — NFR-008 — 已实现

- [ ] **Step 1: Update docs/api/README.md**

在 reports / dashboards / query / nfr 节各追加一行路由登记（path · method · PRD ID · 状态=已实现 · 代码锚点）。

- [ ] **Step 2: Update docs/services/**

- `docs/services/reports.md`：新建域附录（catalog + scheduler In/Out/依赖）
- `docs/services/dashboard.md`：追加 `theme/` 子域边界
- `docs/services/query.md`：追加 dataset 第三路径
- `docs/services/core.md`：追加 NFR-008 runtime_guard 职责
- `docs/services/README.md`：更新 reports 域状态索引

- [ ] **Step 3: Verify docs only**

Run: `cd backend && python3 -m ruff check . && python3 -m pytest ../tests/test_dash_rpt_query_nfr_r53.py -q`
Expected: exit 0（docs 变更不影响测试）

- [ ] **Step 4: Commit**

```bash
git add docs/api/README.md docs/services/
git commit -m "docs(r53): register RPT/DASH/QUERY/NFR L1 routes and service appendices"
```

---

## Spec Self-Review（P2 自检）

| 检查项 | 结果 |
|--------|------|
| round-target 5 子项均有 Task | Task 2–6 各对应 1 PRD ID；Task 1/7/8 横切 |
| 无 TBD/TODO/适当处理 | 通过 |
| 每 Task 有验证命令 | 通过 |
| 前端 UI Task Skills/UI Acceptance | 全 Task `UI skill: none`（纯后端） |
| 预估文件数 ≤20 | 18 生产 + 1 测试 + docs Task 8 另计 |
| 类型/签名跨 Task 一致 | `CatalogNodeOut`、`ScheduleStatusOut`、`EntityThemeConfig`、`DatasetValidateOut`、`RuntimeComplianceReport` 各 Task Interfaces 对齐 |

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-04-dash-rpt-query-nfr-l1-r53.md`.**

**执行模式固定：subagent-driven-development (option 1)** — P3 按 Task 1→8 顺序委派 fresh subagent，每 Task 完成后 Spec review + Quality review。
