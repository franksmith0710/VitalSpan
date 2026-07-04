# reports — 报表

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/reports/` |
| PRD | [F08-RPT](../automate/prd/F08-RPT.md) · RPT-001 ~ RPT-007 |
| 里程碑 | M6 / M10 / M12 |
| 状态 | **L1 kickoff (r60)**：catalog + scheduler + extension + batch + engine run |

## 职责

- 报表模板树 catalog（folder/template 节点 CRUD/move）
- 报表调度 FSM（draft→scheduled→paused/cancelled）
- 导出引擎（PDF/Excel 等）与异步任务（远期）
- 报表实例查询（委托 `query`）

## 边界

| In | Out |
|----|-----|
| `reports/catalog/` 模板树内存 registry + 循环/深度守卫 + M7 ACL | 通用查询引擎（→ `query`） |
| `reports/scheduler/` 调度实例 FSM + cron 五段校验 + mock 执行器 | APScheduler 生产执行器（远期） |
| `reports/extension/` 模板节点扩展配置（metrics/filters CRUD） | 真实 PDF/Word 渲染、fe 展现 |
| `reports/batch/` 批量创建模板节点 + 幂等守卫 | 打印排版 UI（前端 `/admin/reports/*`） |
| `reports/engine/` render run L1（`POST /reports/templates/{id}/run`） | 导出引擎异步任务（远期） |
| | |

## 依赖

- `core`、`auth`、`query`
- `reports/catalog` → `reports/scheduler`（`catalogNodeId` 引用）

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `catalog/service.py` | 树 CRUD/move；`MAX_CATALOG_DEPTH=8`；mutating 接入 ACL | RPT-004 | companion 已实现（r57） |
| `catalog/acl.py` | M7 目录 ACL + `_NODE_OWNERS` 内存 owner 登记 | RPT-004 | companion 已实现（r57） |
| `scheduler/service.py` | 调度 FSM + cron 字段范围校验 | RPT-005 | companion 已实现（r57） |
| `scheduler/executor.py` | `mock_execute_schedule` + Idempotency-Key 幂等 log | RPT-005 | companion 已实现（r57） |
| `extension/service.py` | 模板节点扩展配置 CRUD（metrics/filters/revision） | RPT-006 | L1 已实现 r54 |
| `batch/service.py` | 批量创建模板 + Idempotency-Key 守卫 | RPT-007 | L1 已实现 r54 |
| `engine/service.py` | validate + `build_engine_render_spec` + run mock | RPT-001 | L1 已实现 r60 |
| `engine/acl.py` | run 访问控制 + `set_user_engine_scope` enterprise 白名单 | RPT-001 | companion 已实现 r66 |
| `engine/probe.py` | `probe_run_template_budget_ms` ≤50ms | RPT-001 | companion 已实现 r66 |
| `prefab/service.py` | 预制报表绑定 validate/upsert/list（内存 store） | RPT-002 | L1 已实现 r62 |
| `templates/acl.py` | viewer 禁写 + enterprise scope（`set_user_template_scope`） | RPT-003 | companion 已实现 r67 |
| `templates/probe.py` | validate/get perf probe ≤50ms | RPT-003 | companion 已实现 r67 |
| `templates/service.py` | 模板块 validate/upsert/get + duplicate block 守卫 | RPT-003 | companion 已实现 r67 |
| `ReportService` | 模板 CRUD | RPT-001~003 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §报表。

## 实现笔记

- r54：`reports/extension/` + `reports/batch/` 内存 store；extension 仅 template 节点；batch 幂等 + 原子回滚；错误码 `RPT_EXT_*`、`RPT_BATCH_*`

### r58 companion 质量推分（DASH-006 / RPT-004~007）

- **DASH-006**：`dashboard/theme/execute.py` — `build_theme_execute_plan` 四步（config_load → bindings_resolve → granularity_window → geo_check）；yoy/mom `compareWindow`；`dashboard/theme/acl.py` — `assert_theme_action`（viewer 禁写 `DASH_THEME_FORBIDDEN`）
- **RPT-004**：`extension/compare.py` — `build_compare_slots`；`POST .../extension/compare-preview`；render-spec `compareMetrics` + `compareVersion=1.0`；`extension/acl.py` — `RPT_EXT_FORBIDDEN`
- **RPT-005**：`scheduler/delivery.py` — `dispatch_artifact` mock 投递（fail/retry）；`semi_real_execute_schedule`（`X-Rpt-Semi-Real: 1`；`semi_real_succeeded`/`semi_real_delivery_degraded`）；`revisionSnapshot`；`probe_semi_real_execute_budget_ms` ≤35ms；保留 `mock_execute_schedule` 供 r57 兼容
- **RPT-007**：`catalog/acl.assert_artifact_access` + `register_artifact_owner`；`GET .../executions/{id}/artifact`（`RPT_ARTIFACT_FORBIDDEN`）
- **RPT-006/007**：batch 带 `compareMode` extension → render-spec 联动；`timed_batch_create_budget_ms` <200ms 回归

### r57 companion 质量推分（RPT-004/005）

- **RPT-004**：`catalog/acl.py` — `assert_catalog_action`（admin bypass；viewer read-only；editor create；owner/editor write/delete）；`RPT_CATALOG_FORBIDDEN` + `detail.fields`；`probe_acl_budget_ms` ≤10ms
- **RPT-005**：`scheduler/executor.py` — `mock_execute_schedule`（scheduled 状态 + Idempotency-Key）；`_EXECUTION_LOG` 幂等重放；cron 字段范围守卫（日 1–31、月 1–12）；`RPT_SCHEDULE_EXECUTE_NOT_READY` / `RPT_SCHEDULE_EXECUTE_INVALID`；`probe_mock_execute_budget_ms` ≤20ms
- API：`POST /reports/schedules/{id}/execute`

### r55 companion 质量推分（RPT-006/007）

- **RPT-006**：`extension/render.py` — `build_extension_render_spec`（`renderVersion=1.0`、过滤 `visible=false` metrics）；`GET .../extension/render-spec`、`GET .../extension/revisions`；`export_persistence_snapshot`（`store=memory` 非生产持久化边界）；`probe_extension_load_budget_ms=50`
- **RPT-007**：`RPT_BATCH_PARTIAL_FAILURE` 结构化 `detail.failedIndex` / `failedItemName` / `rolledBackCount`；`ReportBatchError.fields` 透传 HTTP `detail`；`probe_batch_create_budget_ms=200`
- r53：`reports/catalog/` + `reports/scheduler/` 内存 registry；API 入口 `backend/app/api/v1/reports/__init__.py`（与 `reports/export.py` IF-03 导出共存，路径 `/reports/catalog` · `/reports/schedules` · `/reports/export` 分离）
- 错误码：`RPT_CATALOG_*`、`RPT_SCHEDULE_*`、`RPT_EXT_*`、`RPT_BATCH_*`

### r66 companion 质量推分（RPT-001）

- **RPT-001**：`engine/acl.py` — `assert_engine_run_access` + `set_user_engine_scope`；viewer 非自有模板 / enterprise scope 外 → `RPT_ENGINE_FORBIDDEN`；`parameters` 保留键 `__proto__` → `RPT_ENGINE_INVALID_PARAMETER`；`engine/probe.py` — `probe_run_template_budget_ms` ≤50ms

### r67 companion 质量推分（RPT-003）

- **RPT-003**：`templates/acl.py` — `assert_template_write_access` + `set_user_template_scope`；viewer PUT / enterprise 越权 GET → `RPT_TEMPLATE_FORBIDDEN`；duplicate sql block → `RPT_TEMPLATE_DUPLICATE_BLOCK`；`templates/probe.py` — `probe_validate_template_budget_ms` / `probe_get_template_budget_ms` ≤50ms

### r65 companion 质量推分（RPT-002）

- **RPT-002**：`prefab/probe.py` — validate/list perf probe ≤50ms；`allowedRoles` 非空（`RPT_PREFAB_EMPTY_ROLES`）；`analysisType=distribution` 需 `region` 维度（`RPT_PREFAB_ANALYSIS_MISMATCH`）；`set_user_prefab_scope` + enterprise `bindingKey` 前缀 scope；`GET /api/v1/reports/prefab/probe`

### r68 companion 质量推分（RPT-002）

- **RPT-002**：`get_prefab_binding` + `RPT_PREFAB_NOT_FOUND`；`RPT_PREFAB_DUPLICATE_DIMENSION`；`list_prefab_bindings(user)` enterprise scope 过滤；`probe_get_prefab_binding_budget_ms` ≤50ms；`GET /api/v1/reports/prefab/bindings/{binding_key}`
