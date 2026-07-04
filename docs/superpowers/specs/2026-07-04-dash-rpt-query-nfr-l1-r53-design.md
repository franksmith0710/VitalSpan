# M9 主题分析 + M10/M12 报表模板调度 + M13 Dataset/NFR L1 kickoff r53 设计

```yaml
date: 2026-07-04
milestone: M9/M10/M12/M13
round_target: docs/superpowers/evolution/2026-07-04-round-target-r53.md
prd_ids: [QUERY-009, RPT-004, DASH-006, RPT-005, NFR-008]
ui_design_skill: none
status: design
```

## 1. 批量主题与子项映射

| # | 子项 | PRD ID | 模块 | 执行顺序 | 主攻薄弱维 | 用户感知 |
|---|------|--------|------|:--------:|------------|----------|
| 1 | 报表模板树形目录 REST 骨架 | RPT-004 | `reports/catalog/` | 1（hub #2 并列最低 11.7） | 完整度 **5%→≥76%**；架构 **8%→≥66%** | 管理员可维护模板树节点（增删移），非法树操作结构化拦截 |
| 2 | Dataset 查询路径路由 + ACL/readonly 守卫 | QUERY-009 | `query/dataset/` | 2（hub #1 并列最低 11.7） | 完整度 **5%→≥76%**；可靠性 **0%→≥92%** | 查询 API 可声明 `datasetId` 路径；非法/越权 Dataset 被结构化拦截 |
| 3 | 可配置实体主题分析 config schema + 校验 | DASH-006 | `dashboard/theme/` | 3（hub #3，11.8） | 完整度 **5%→≥76%**；可靠性 **0%→≥92%** | 平台具备实体主题分析配置契约（实体+维度+时间域骨架） |
| 4 | 报表调度 FSM REST 骨架 | RPT-005 | `reports/scheduler/` | 4（hub #4，11.8；依赖 RPT-004 catalogNodeId） | 完整度 **5%→≥76%**；可靠性 **0%→≥92%** | 模板可绑定调度计划（draft→scheduled 骨架），非法 cron/迁移拦截 |
| 5 | 零 Superset/DataEase 运行时守卫 + 依赖扫描 | NFR-008 | `core/nfr/runtime_guard.py` | 5（hub #5，11.8；G1） | 完整度 **5%→≥76%**；安全性 **11%→≥88%** | 部署验收可验证无 DE/SS 运行时绑定，违规依赖有明确告警 |

**依赖链**：RPT-004 树 catalog（内存 registry + config_store 可选持久化）→ RPT-005 调度实例引用 `catalogNodeId` → QUERY-009 dataset 路径守卫（与 QUERY-003 native 三路径并列）→ DASH-006 主题分析 config（独立，对齐 `dashboard/` 域边界）→ NFR-008 runtime 扫描（pyproject + importlib，独立于 NFR-007 信创清单）→ `test_dash_rpt_query_nfr_r53.py` smoke → r52 `test_design_conn_gov_query_r52` 52/52 + r49 35/35 + r46 36/36 回归门控 → P5 五 ID 加权总分 L1 目标 **≥85**（r54 companion **≥90**）。

**上轮已交付（本轮不重复）**：r52 QUERY-003 native guard + DESIGN/GOV/CONN companion 破 90；r49/r46 NFR 横切（xinchuang 已含 `xc-forbidden-runtime` 探测）；`integration/reports_export` IF-03 导出快路径；**不含** Admin 全量 UI、报表引擎真实渲染、GIS 地图生产集成、Dataset CRUD 全链路（META-004 ~12 分留 companion）、调度 cron 生产执行器、信创连接器 CONN-018/020。

**PRD 分片锚点漂移注记**（真理源：`round-target` > `prd.md` hub > 分片）：

| 项 | hub / round-target | 分片（陈旧） |
|----|-------------------|-------------|
| DASH-006 代码锚点 | `backend/app/dashboard/theme/`（后端契约先行） | `fe/src/pages/theme-analysis/` |
| RPT-004 代码锚点 | `backend/app/reports/catalog/` + `api/v1/reports.py` | `backend/app/reports/catalog/`（一致，但模块尚未存在） |
| RPT-005 代码锚点 | `backend/app/reports/scheduler/` | `backend/app/reports/scheduler/`（一致，模块尚未存在） |
| QUERY-009 代码锚点 | `backend/app/query/dataset/` + query 路由扩展 | `backend/app/query/dataset/`（一致，子包尚未存在） |
| NFR-008 代码锚点 | `backend/app/core/nfr/runtime_guard.py` + `api/v1/nfr.py` | `ops/compliance/nfr08/` |

本轮实现以 **hub + round-target + 现有 `dashboard/` / `query/native/` / `metadata/themes/` 树模式 / `governance/publish` FSM 惯例** 为准；P5 回写分片锚点与验收勾选。

**plan.md 状态**：M1+M1B 全 `[x]`；立项来源 `plan.archive.md` §M9/M10/M12/M13；**禁止**修改 `plan.md` / `goal.md` 结构。

## 2. 现状与约束

| 项 | 现状（范围框定内已读） |
|----|------------------------|
| `backend/app/reports/` | **不存在**；仅 `api/v1/reports/export.py`（integration IF-03 导出） |
| `backend/app/dashboard/` | DASH-001~003 已交付（CRUD + layout）；**无** `theme/` 子包 |
| `metadata/themes/` | META 主题树 CRUD + 循环/深度守卫（**只读参考**，DASH-006 不复用 ORM，避免 META 域耦合） |
| `query/native/` | QUERY-003 路由守卫完整（r49/r52）；`resolve_query_mode` → `sql` \| `native` |
| `query/service.py` | 执行链仅 `sql` / `table` 模式；**无** dataset 路径 |
| `query/readonly.py` | 只读 SQL 守卫完整；dataset 路径 L1 复用语义（禁止 DML 类 operation） |
| `auth/resources/service.py` | `VALID_RESOURCE_TYPES = {datasource, dashboard, report}`；**无** `dataset`（L1 ACL 在 `query/dataset/guard.py` 内置 registry + role 白名单，不修改 auth 模块） |
| `core/nfr/xinchuang.py` | `_FORBIDDEN_MODULES = {superset, dataease}` + `importlib.util.find_spec`；**无** pyproject 依赖扫描独立 endpoint |
| `core/nfr/errors.py` | 含 NFR/PUSH/XINCHUANG/GOV_PUBLISH 常量；**无** `NFR_RUNTIME_*` |
| `api/v1/router.py` | 含 `reports_export_router`；**无** reports catalog/scheduler router |
| `api/v1/nfr.py` | push/xinchuang/plugin 路由完整；**无** runtime-compliance |
| `pyproject.toml` | 核心依赖无 superset/dataease；connectors-ext 无 DE/SS |

**范围框定模块**（3）：`backend/app/reports/` + `backend/app/dashboard/theme/` + `backend/app/query/dataset/` + `backend/app/core/nfr/`（NFR 横切计为第 3 模块扩展）。

**范围框定文件列表**（18 ≤ 20）：

| 文件 | 子项 | 变更类型 |
|------|------|----------|
| `backend/app/reports/catalog/schemas.py` | RPT-004 | 新建：树节点 DTO + 列表响应 |
| `backend/app/reports/catalog/service.py` | RPT-004 | 新建：CRUD/move + 循环/孤儿校验 |
| `backend/app/reports/catalog/errors.py` | RPT-004 | 新建：`ReportCatalogError` + `RPT_CATALOG_*` |
| `backend/app/reports/scheduler/schemas.py` | RPT-005 | 新建：ScheduleSpec/StatusOut/TransitionIn |
| `backend/app/reports/scheduler/service.py` | RPT-005 | 新建：FSM + cron 校验 |
| `backend/app/reports/scheduler/errors.py` | RPT-005 | 新建：`RPT_SCHEDULE_*` |
| `backend/app/dashboard/theme/schemas.py` | DASH-006 | 新建：`EntityThemeConfig` + 维度/时间域 DTO |
| `backend/app/dashboard/theme/service.py` | DASH-006 | 新建：validate/save/get（config_store） |
| `backend/app/dashboard/theme/errors.py` | DASH-006 | 新建：`DASH_THEME_*` |
| `backend/app/query/dataset/schemas.py` | QUERY-009 | 新建：`DatasetQuerySpec`、`DatasetRoutingOut` |
| `backend/app/query/dataset/guard.py` | QUERY-009 | 新建：路径解析 + ACL + readonly 守卫 |
| `backend/app/core/nfr/runtime_guard.py` | NFR-008 | 新建：pyproject 扫描 + 模块探测 + 报告 |
| `backend/app/api/v1/reports.py` | RPT-004/005 | 新建：catalog + scheduler 路由簇 |
| `backend/app/api/v1/dashboards.py` | DASH-006 | 修改：追加 theme-analysis 路由 |
| `backend/app/api/v1/query.py` | QUERY-009 | 修改：`GET /dataset/routing` + `POST /dataset/validate` |
| `backend/app/api/v1/nfr.py` | NFR-008 | 修改：`GET /runtime-compliance` |
| `backend/app/api/v1/router.py` | 全部 | 修改：`include_router(reports_router)` |
| `tests/test_dash_rpt_query_nfr_r53.py` | 全部 | 新建（≥38 条断言函数） |

**跨模块只读依赖**（不修改，测试中引用）：`metadata/themes/service.py`（树算法参考）、`query/native/guard.py`（三路径边界）、`governance/publish/service.py`（FSM 模式）、`test_design_conn_gov_query_r52` 52/52 回归。

**真理源优先级**：`round-target` > `prd.md` hub + 分片 > `docs/services/` > `docs/api/README.md`。

**本轮性质**：跨域 **L1 kickoff**（契约 + 守卫 smoke + pytest mock）；**纯后端**；`ui_design_skill: none`；不含 `fe/`、Admin UI、报表渲染引擎、GIS 生产地图、Dataset ORM/META-004 CRUD、APScheduler 生产执行、Alembic migration（catalog/schedule L1 用内存 dict + `config_store` 持久化）。

## 3. 架构设计

### 3.1 目标增量结构

```
backend/app/reports/
├── catalog/
│   ├── schemas.py          # RPT-004：CatalogNodeCreate/Move/Out
│   ├── service.py          # create/list/get/update/delete/move
│   └── errors.py           # RPT_CATALOG_*
└── scheduler/
    ├── schemas.py          # RPT-005：ScheduleCreate/StatusOut
    ├── service.py          # create/transition/get
    └── errors.py           # RPT_SCHEDULE_*

backend/app/dashboard/theme/
├── schemas.py              # DASH-006：EntityThemeConfig
├── service.py              # validate/save/get
└── errors.py               # DASH_THEME_*

backend/app/query/dataset/
├── schemas.py              # QUERY-009：DatasetQuerySpec
└── guard.py                # resolve_query_path, validate_dataset_spec

backend/app/core/nfr/
└── runtime_guard.py        # NFR-008：scan + build_runtime_report

backend/app/api/v1/
├── reports.py              # /reports/catalog/* + /reports/schedules/*
├── dashboards.py           # +/dashboards/theme-analysis/*
├── query.py                # +/query/dataset/*
└── nfr.py                  # +/nfr/runtime-compliance

tests/
└── test_dash_rpt_query_nfr_r53.py
```

### 3.2 方案比选（Automation 代替用户对话）

#### RPT-004 模板树目录

| 方案 | 说明 | 取舍 |
|------|------|------|
| A（推荐） | 模块内 `_nodes: dict[UUID, CatalogNode]` + 镜像 `metadata/themes` 循环/深度算法 | 无 migration；L1 可测；与现有树模式一致 |
| B | 新 ORM `report_catalog_nodes` 表 | 超 L1 文件预算 |
| C | 复用 `metadata/themes` ORM | 混淆 META 主题与报表模板语义；域边界违规 |

**选用 A**；`MAX_CATALOG_DEPTH = 8`；节点类型 `folder` \| `template`（template 节点可挂 `templateKind: word|excel|pdf` L1 占位）。

#### RPT-005 报表调度

| 方案 | 说明 | 取舍 |
|------|------|------|
| A（推荐） | 内存 schedule registry + FSM；cron 用简化五段校验（分/时/日/月/周） | 对齐 GOV-005 publish FSM；无 APScheduler |
| B | 直接集成 APScheduler 执行 | 超 L1；生产执行器远期 |
| C | 仅 OpenAPI schema | 完整度不足 |

**选用 A**。

**状态集合**：`draft` → `scheduled` → `paused` \| `cancelled`（终态 `cancelled`；`paused` 可 `resume` → `scheduled`）。

**允许迁移**：

| 当前状态 | 动作 | 目标状态 |
|----------|------|----------|
| `draft` | `schedule` | `scheduled` |
| `scheduled` | `pause` | `paused` |
| `scheduled` | `cancel` | `cancelled` |
| `paused` | `resume` | `scheduled` |
| `paused` | `cancel` | `cancelled` |

非法迁移 → 400 `RPT_SCHEDULE_INVALID_TRANSITION`；`catalogNodeId` 不存在 → 404 `RPT_CATALOG_NODE_NOT_FOUND`；非法 cron → 422 `RPT_SCHEDULE_INVALID_CRON`。

#### DASH-006 实体主题分析

| 方案 | 说明 | 取舍 |
|------|------|------|
| A（推荐） | `EntityThemeConfig` 后端 schema + validate endpoint；持久化 `config_store` `config_type=entity_theme` | 与 DASH-001~003 同域；GIS/时间域为字段引用骨架 |
| B | 直接建 `fe/src/pages/theme-analysis/` | 超 round-target 范围；UI 留 companion |
| C | 合并进 dashboard layout_json | 混淆布局与主题分析语义 |

**选用 A**。

**时间域 L1 枚举**：`day` \| `week` \| `month` \| `yoy` \| `mom`（同比/环比为配置声明，不计算）。

**GIS L1 骨架**：可选 `geoBinding: {latField, lngField, adminCodeField?}`；不集成地图 SDK。

#### QUERY-009 Dataset 查询路径

| 方案 | 说明 | 取舍 |
|------|------|------|
| A（推荐） | 第三路径 `dataset`；内置 `_BUILTIN_DATASETS` registry；ACL 按 `allowedRoles` + admin  bypass | 不依赖 META-004 ORM；与 QUERY-003 边界清晰 |
| B | 扩展 `auth` 增 `dataset` resource_type | 触及 auth 模块，超框定 |
| C | dataset 路径直接执行 SQL | 越界 L1；无契约层 |

**选用 A**。

**三路径边界**（与 QUERY-003 对齐）：

| 路径 | 入参特征 | 禁止 |
|------|----------|------|
| `sql` | `dataSourceId` + `sql` 或 `table` | 同时携带 `datasetId` |
| `native` | `connectorType` + `body`（无 `sql`） | 同时携带 `datasetId` |
| `dataset` | `datasetId` + 可选 `parameters` | 携带 `dataSourceId`/`connectorType`/`sql` |

`resolve_query_path(spec)` → `"sql"` \| `"native"` \| `"dataset"`；冲突字段 → 422 `QUERY_PATH_AMBIGUOUS`。

**L1 builtin datasets**（测试夹具注册 2 条）：

- `demo-orders`：allowedRoles=`["analyst"]`；readonly=true
- `restricted-ledger`：allowedRoles=`["finance"]`；readonly=true

守卫错误码：`QUERY_DATASET_NOT_FOUND`、`QUERY_DATASET_FORBIDDEN`、`QUERY_DATASET_NOT_READONLY`、`QUERY_PATH_AMBIGUOUS`。

#### NFR-008 零 DE/SS 运行时

| 方案 | 说明 | 取舍 |
|------|------|------|
| A（推荐） | `runtime_guard.py`：pyproject 文本扫描 + `importlib` 模块探测 + 结构化报告；独立 endpoint | 超越 xinchuang 单条 checklist；可 mock 违规 |
| B | 仅复用 xinchuang `xc-forbidden-runtime` | NFR-008 独立 PRD 项无法闭合完整度 |
| C | 全量 SBOM/进程扫描 | 超 L1；round-target 明确 mock 即可 |

**选用 A**。

**扫描项**：

1. `pyproject-dependencies`：解析 `[project].dependencies` + `[project.optional-dependencies].*`，匹配 `superset`/`apache-superset`/`dataease`（大小写不敏感子串）
2. `loaded-modules`：复用 `_FORBIDDEN_MODULES` + `find_spec`
3. `runtime-declaration`：返回 `{zeroThirdPartyBiRuntime: true, scannedAt, policyVersion: "nfr08-l1"}`

违规 → item status=`fail` + remediation；strict 模式（新 env `NFR08_RUNTIME_MODE=strict|permissive`，默认 permissive）下 fail → 503 `NFR_RUNTIME_VIOLATION`（GET 仍 200 返回报告，POST assert 用于 smoke）。

## 4. 子项详细设计

### 4.1 RPT-004 — 模板树形目录

#### Schema（`reports/catalog/schemas.py`）

```python
class CatalogNodeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_id: uuid.UUID | None = Field(default=None, alias="parentId")
    node_type: Literal["folder", "template"] = Field(default="folder", alias="nodeType")
    template_kind: Literal["word", "excel", "pdf"] | None = Field(default=None, alias="templateKind")
    sort_order: int = Field(default=0, alias="sortOrder")

class CatalogNodeMove(BaseModel):
    parent_id: uuid.UUID | None = Field(default=None, alias="parentId")

class CatalogNodeOut(BaseModel):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None = Field(alias="parentId")
    node_type: str = Field(alias="nodeType")
    template_kind: str | None = Field(default=None, alias="templateKind")
    sort_order: int = Field(alias="sortOrder")
```

#### API（`api/v1/reports.py` — catalog 簇）

| Method | Path | 行为 |
|--------|------|------|
| GET | `/reports/catalog/nodes` | 列表；可选 `parentId` 过滤根/子节点 |
| POST | `/reports/catalog/nodes` | 创建节点 |
| GET | `/reports/catalog/nodes/{id}` | 单节点 |
| PATCH | `/reports/catalog/nodes/{id}` | 更新 name/sortOrder |
| DELETE | `/reports/catalog/nodes/{id}` | 删除（有子节点 → 409） |
| POST | `/reports/catalog/nodes/{id}/move` | 移动；循环/超深拦截 |

#### 验收标准（可测试）

| ID | 断言 |
|----|------|
| T-RPT-R53-004-01 | POST 根 folder → 201 + id |
| T-RPT-R53-004-02 | POST 子节点 parentId 有效 → 201 |
| T-RPT-R53-004-03 | move 至子孙 → 422 `RPT_CATALOG_CYCLE` |
| T-RPT-R53-004-04 | delete 有子节点 → 409 `RPT_CATALOG_HAS_CHILDREN` |
| T-RPT-R53-004-05 | parentId 不存在 → 404 `RPT_CATALOG_PARENT_NOT_FOUND` |
| T-RPT-R53-004-06 | 深度 > MAX_CATALOG_DEPTH → 422 `RPT_CATALOG_MAX_DEPTH` |

### 4.2 QUERY-009 — Dataset 查询路径

#### Schema（`query/dataset/schemas.py`）

```python
class DatasetQuerySpec(BaseModel):
    dataset_id: str = Field(alias="datasetId", min_length=1, max_length=64)
    parameters: dict[str, object] = Field(default_factory=dict)
    operation: Literal["select"] = "select"  # L1 仅 select

class DatasetValidateOut(BaseModel):
    dataset_id: str = Field(alias="datasetId")
    resolved_path: Literal["dataset"] = Field(alias="resolvedPath")
    readonly: bool = True
```

#### API（`api/v1/query.py` 追加）

| Method | Path | 行为 |
|--------|------|------|
| GET | `/query/dataset/routing` | 返回 `{paths:["sql","native","dataset"], boundaryNotes:{...}}` |
| POST | `/query/dataset/validate` | 校验 spec + 当前用户 ACL + readonly |

#### 验收标准（可测试）

| ID | 断言 |
|----|------|
| T-QUERY-R53-009-01 | analyst + demo-orders → 200 readonly=true |
| T-QUERY-R53-009-02 | analyst + restricted-ledger → 403 `QUERY_DATASET_FORBIDDEN` |
| T-QUERY-R53-009-03 | 未知 datasetId → 404 `QUERY_DATASET_NOT_FOUND` |
| T-QUERY-R53-009-04 | operation != select → 422 `QUERY_DATASET_NOT_READONLY` |
| T-QUERY-R53-009-05 | routing 文档含 sql/native/dataset 三路径说明 |
| T-QUERY-R53-009-06 | spec 同时含 datasetId + dataSourceId（构造冲突 body）→ 422 `QUERY_PATH_AMBIGUOUS` |
| T-QUERY-R53-009-07 | mysql native validate 仍走 r52 QUERY-003 路由（回归引用 native/validate） |

### 4.3 DASH-006 — 可配置实体主题分析

#### Schema（`dashboard/theme/schemas.py`）

```python
class ThemeDimensionBinding(BaseModel):
    dimension_id: str = Field(alias="dimensionId")
    label: str | None = None
    sort_order: int = Field(default=0, alias="sortOrder")

class GeoBinding(BaseModel):
    lat_field: str = Field(alias="latField")
    lng_field: str = Field(alias="lngField")
    admin_code_field: str | None = Field(default=None, alias="adminCodeField")

class EntityThemeConfig(BaseModel):
    schema_version: str = Field(default="1.0", alias="schemaVersion")
    entity_type: str = Field(alias="entityType", min_length=1, max_length=64)
    time_granularity: Literal["day", "week", "month", "yoy", "mom"] = Field(alias="timeGranularity")
    dimensions: list[ThemeDimensionBinding] = Field(min_length=1)
    geo_binding: GeoBinding | None = Field(default=None, alias="geoBinding")
    ref_type: str = Field(default="dashboard", alias="refType")
    ref_id: uuid.UUID = Field(alias="refId")
```

#### API（`api/v1/dashboards.py` 追加）

| Method | Path | 行为 |
|--------|------|------|
| POST | `/dashboards/theme-analysis/validate` | 校验 dimensions 非空、entityType 合法、timeGranularity 枚举 |
| PUT | `/dashboards/theme-analysis` | validate 通过后 config_store 持久化 |
| GET | `/dashboards/theme-analysis` | 按 refType/refId 读取 |

#### 验收标准（可测试）

| ID | 断言 |
|----|------|
| T-DASH-R53-006-01 | 合法 config validate → 200 |
| T-DASH-R53-006-02 | 空 dimensions → 422 `DASH_THEME_EMPTY_DIMENSIONS` |
| T-DASH-R53-006-03 | 非法 timeGranularity → 422 `DASH_THEME_INVALID_GRANULARITY` |
| T-DASH-R53-006-04 | geoBinding 缺 latField → 422 `DASH_THEME_INVALID_GEO` |
| T-DASH-R53-006-05 | PUT → GET 往返一致 |
| T-DASH-R53-006-06 | ref 指向不存在 dashboard → 404 `DASH_NOT_FOUND`（使用已有 dashboard fixture） |

### 4.4 RPT-005 — 报表调度

#### Schema（`reports/scheduler/schemas.py`）

```python
class ScheduleCreate(BaseModel):
    catalog_node_id: uuid.UUID = Field(alias="catalogNodeId")
    cron: str = Field(min_length=9, max_length=64)
    timezone: str = Field(default="Asia/Shanghai", max_length=64)

class ScheduleTransitionIn(BaseModel):
    action: Literal["schedule", "pause", "resume", "cancel"]
```

#### API（`api/v1/reports.py` — scheduler 簇）

| Method | Path | 行为 |
|--------|------|------|
| POST | `/reports/schedules` | 创建 schedule（初始 draft） |
| GET | `/reports/schedules/{id}` | 状态 + allowedActions |
| POST | `/reports/schedules/{id}/transition` | FSM 迁移 |

#### Cron L1 规则

五段式 `min hour dom month dow`；每段允许 `*`、数字、`,`、`-`；拒绝 `*/n` 以外复杂表达式 → 422 `RPT_SCHEDULE_INVALID_CRON`。

#### 验收标准（可测试）

| ID | 断言 |
|----|------|
| T-RPT-R53-005-01 | POST schedule catalogNodeId 有效 + cron `0 8 * * *` → draft |
| T-RPT-R53-005-02 | draft + schedule → scheduled |
| T-RPT-R53-005-03 | scheduled + pause → paused；paused + resume → scheduled |
| T-RPT-R53-005-04 | scheduled + cancel → cancelled（终态） |
| T-RPT-R53-005-05 | draft + pause → 400 `RPT_SCHEDULE_INVALID_TRANSITION` |
| T-RPT-R53-005-06 | catalogNodeId 不存在 → 404 |
| T-RPT-R53-005-07 | cron `invalid` → 422 `RPT_SCHEDULE_INVALID_CRON` |
| T-RPT-R53-005-08 | GET 含 allowedActions 与 RPT-004 节点 id 关联字段 |

### 4.5 NFR-008 — 自主可控零 DE/SS

#### API（`api/v1/nfr.py` 追加）

| Method | Path | 行为 |
|--------|------|------|
| GET | `/nfr/runtime-compliance` | 返回扫描报告（200，含 items[]） |
| POST | `/nfr/runtime-compliance/assert` | strict 模式下 fail → 503；permissive → 200 |

#### 报告形状

```python
@dataclass
class RuntimeComplianceReport:
    policy_version: str          # "nfr08-l1"
    overall_status: str        # compliant|non_compliant
    zero_third_party_bi_runtime: bool
    items: tuple[RuntimeCheckItem, ...]
```

#### 验收标准（可测试）

| ID | 断言 |
|----|------|
| T-NFR-R53-008-01 | GET runtime-compliance overallStatus=compliant（默认环境） |
| T-NFR-R53-008-02 | mock pyproject 含 `apache-superset` → item fail + remediation |
| T-NFR-R53-008-03 | mock find_spec("superset") → loaded-modules fail |
| T-NFR-R53-008-04 | strict + 违规 → POST assert 503 `NFR_RUNTIME_VIOLATION` |
| T-NFR-R53-008-05 | permissive + 违规 → POST assert 200（报告仍 non_compliant） |
| T-NFR-R53-008-06 | 报告含 zeroThirdPartyBiRuntime 字段 |

## 5. 测试策略

### 5.1 新套件 `test_dash_rpt_query_nfr_r53.py`

- **夹具**：module-scoped sqlite memory；`AUTH = Bearer dev`；预置 dashboard 行 + analyst/finance 角色 mock（通过 dev token 默认 admin 覆盖 ACL 403 用例需切换 fixture 用户或 mock roles）
- **目标**：≥38 条断言函数（上表 33 条 + 5 条联动）
- **联动**：
  - T-R53-LINK-01：创建 catalog template 节点 → 绑定 schedule → GET schedule 含 catalogNodeId
  - T-R53-LINK-02：DASH theme config ref 已有 dashboard
  - T-R53-LINK-03：三路径 routing 与 native/validate 不冲突
  - T-R53-LINK-04：`/health` 200
  - T-R53-LINK-05：NFR runtime + xinchuang compliance 并存（不同 endpoint）
- **mock**：NFR pyproject 扫描使用 `@patch` 注入临时 pyproject 片段；schedule 不触网

### 5.2 回归门控（P3/P4 必跑）

| 套件 | 门槛 |
|------|------|
| `test_dash_rpt_query_nfr_r53.py` | 38/38 |
| `test_design_conn_gov_query_r52.py` | 52/52 |
| `test_design_conn_gov_query_r49.py` | 35/35 |
| `test_nfr_gov_conn_r46.py` | 36/36 |
| `ruff check .`（从 `backend/`） | exit 0 |

## 6. 文档同步（P3 评估，design 仅列清单）

| 变更 | 同步目标 |
|------|----------|
| 新 reports catalog/scheduler 路由 | `docs/api/README.md` |
| 新 dashboard theme-analysis 路由 | `docs/api/README.md` |
| 新 query dataset 路由 | `docs/api/README.md` |
| 新 nfr runtime-compliance | `docs/api/README.md` |
| reports 域落地 | 新建或更新 `docs/services/reports.md` + `README.md` 索引 |
| dashboard theme 扩展 | `docs/services/dashboard.md`（若存在） |
| query dataset 路径 | `docs/services/query.md` |
| NFR-008 runtime | `docs/services/core.md` 或 NFR 附录 |
| P5 勾选 | `prd/F08-RPT.md`、`F07-DASH.md`、`F05-QUERY.md`、`F15-NFR.md` |

## 7. 非目标（明确不做）

- Admin 全量 UI（模板树管理界面、主题分析 GIS 地图、调度日历）
- 报表引擎真实渲染（RPT-001~003）、Word/Excel/PDF 生成
- GIS 地图生产集成（底图、行政区划 GeoJSON、下钻交互）
- Dataset CRUD 全链路（META-004 ~12 分留 companion）
- APScheduler/cron 生产执行器与 IF-03 导出联动执行
- 扩展 `auth` 模块 `dataset` resource_type（L1 内置 registry ACL）
- 信创连接器 CONN-018/020
- `fe/` 任何文件触及
- Alembic migration（catalog/schedule 内存 + config_store）
- r52 已破 90 的 GOV/DESIGN/QUERY/CONN companion 簇重复推分

## 8. PRD 8 维薄弱项对齐

| PRD ID | 薄弱维（选题时） | L1 设计闭合方式 | L1 目标 |
|--------|------------------|-----------------|--------|
| QUERY-009 | 完整度 5%、可靠性 0%、测试 0% | dataset 路径契约 + ACL/readonly 守卫 7 pytest | ≥85 |
| RPT-004 | 完整度 5%、架构 8%、测试 0% | 树 catalog CRUD + 循环/孤儿守卫 6 pytest | ≥85 |
| DASH-006 | 完整度 5%、可靠性 0%、安全性 8% | entity theme schema + validate 6 pytest | ≥85 |
| RPT-005 | 完整度 5%、可靠性 0%、架构 9% | 调度 FSM + cron 校验 8 pytest + catalog 关联 | ≥85 |
| NFR-008 | 完整度 5%、安全性 11%、测试 0% | pyproject+模块扫描 endpoint 6 pytest | ≥85 |

## 9. UI 设计交付

**ui_design_skill**: `none`（本轮纯后端，不触及 `fe/`）

通用 UI 质量基线不适用；远期 companion 实现 DASH-006 页面时再启用 `b-design-system-tailadmin-radix`。

## 10. 风险与缓解

| 风险 | 缓解 |
|------|------|
| reports 新域与 integration export 路由前缀 `/reports` 冲突 | catalog/scheduler 用 `/reports/catalog` 与 `/reports/schedules`；export 保持 `/reports/export` |
| dataset ACL 无 auth 域 `dataset` 类型 | L1 内置 registry + role 白名单；META-004 companion 再统一 auth |
| 内存 catalog 进程重启丢失 | L1 可接受；companion 可迁 config_store/ORM |
| NFR-008 与 xinchuang `xc-forbidden-runtime` 重复 | 职责分离：xinchuang=信创清单子项；NFR-008=G1 专用 endpoint + pyproject 扫描 |
| `dashboard/theme` 与 `metadata/themes` 命名混淆 | 包路径 `dashboard/theme/`；错误码前缀 `DASH_THEME_*` |

## 11. Spec Self-Review 清单

- [x] 覆盖 round-target 全部 5 子项
- [x] 文件列表 18 ≤ 20，模块 3 域
- [x] 无 TBD/TODO 占位
- [x] 验收标准可测试（含测试 ID）
- [x] PRD 锚点漂移已注记
- [x] 非目标明确
- [x] ui_design_skill 已记录
