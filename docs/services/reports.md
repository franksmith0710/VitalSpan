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
| `reports/scheduler/` 调度实例 FSM + cron 五段校验 + semi-real 执行（未配 SMTP 诚实失败） | APScheduler 生产执行器（远期） |
| `reports/extension/` 模板节点扩展配置（metrics/filters CRUD） | 真实 PDF/Word 渲染、fe 展现 |
| `reports/batch/` 批量创建模板节点 + 幂等守卫 | 打印排版 UI（前端 `/admin/reports/*`） |
| `reports/engine/` render run L1（`POST /reports/templates/{id}/run`） | 导出引擎异步任务（远期） |
| | |

## 依赖

- `core`、`auth`、`query`
- `reports/catalog` → `reports/scheduler`（`catalogNodeId` 引用）

## 前端消费 IA（报表中心）

侧栏 **「报表中心」** 为「报表」分组的一级父项（可展开）；落地 Hub 页为子菜单 **「全部报表」** → `/admin/reports/center`（`fe/src/pages/admin/reports/ReportCenterPage.tsx`）。职责：**报表消费聚合** —— 展示当前用户可访问的 catalog 模板节点，并提供到预制分析、模板管理、调度的快捷入口；与仪表板/数据大屏（交互画布）不同，本域输出为 **模板树 + 报表引擎** 的文档型/固定版式报表（RPT-001~007）。

| 子入口（nav-manifest） | 路由 | 权限 | PRD | 说明 |
|------------------------|------|------|-----|------|
| 全部报表 | `/admin/reports/center` | `report:read` | RPT-004/001 | Hub：快捷卡片 + 授权模板网格 → `view/:nodeId` 运行/导出 |
| 预制报表 | `/admin/reports` | `report:read` | RPT-002 | 内置 entity×analysis 绑定浏览与运行（FR-3.1） |
| 报表模板 | `/admin/reports/templates` | `report:manage` | RPT-003/004/006 | 模板树 master-detail、扩展配置 |
| 报表调度 | `/admin/reports/schedules` | `report:manage` | RPT-005 | cron FSM、执行历史与重试（FR-3.2） |

- **analyst / viewer**：Hub + 预制报表（消费侧）
- **admin**：另含模板管理、调度管理（生产侧）

壳层路由与布局模式见 [ui/layout.md](../ui/layout.md) §3、§5。

### DataEase 对标（IA，非菜单名 1:1）

对标 DataEase **「报表」产品线** 的整体分组与 **浏览 → 运行 → 导出/投递** 消费路径（归档计划 `docs/automate/plans/archive/2026-07-17-reports-de-ia-complete.md`）。

| VitalSpan 入口 | 近似 DataEase 能力 |
|----------------|-------------------|
| 报表中心 / 全部报表 | 报表列表 / 我的报表 / 报表查看（授权后打开、运行） |
| 预制报表 | 内置/主题分析类固定报表（VitalSpan 政企扩展 FR-3.1，DE 无完全同名项） |
| 报表模板 | 报表模板管理（Word/Excel/PDF、目录树、扩展指标） |
| 报表调度 | 定时报告 / 报表调度（cron、执行历史、重试） |

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `catalog/service.py` | 树 CRUD/move；`MAX_CATALOG_DEPTH=8`；mutating 接入 ACL | RPT-004 | companion 已实现（r57） |
| `catalog/acl.py` | M7 目录 ACL + `_NODE_OWNERS` 内存 owner 登记 | RPT-004 | companion 已实现（r57） |
| `scheduler/service.py` | 调度 FSM + cron 字段范围校验 | RPT-005 | companion 已实现（r57） |
| `scheduler/executor.py` | 默认 `semi_real_execute_schedule`；`X-Rpt-Execute-Mock:1` 才走 `mock_execute_schedule`（probe） | RPT-005 | companion 已实现（r57+诚实化） |
| `extension/service.py` | 模板节点扩展配置 CRUD（metrics/filters/revision） | RPT-006 | L1 已实现 r54 |
| `batch/service.py` | 批量创建模板 + Idempotency-Key 守卫 | RPT-007 | L1 已实现 r54 |
| `engine/service.py` | validate + `run_template`（M3-LITE：`dataSourceId` 驱动 `engine/execute`；无 ds placeholder 回归 r60） | RPT-001 | M3-LITE 已实现 r233 |
| `engine/execute.py` | extension metrics → `query.execute_query`；`build_sections_from_extension` | RPT-001 | M3-LITE 已实现 r233 |
| `engine/acl.py` | run 访问控制 + `set_user_engine_scope` enterprise 白名单 | RPT-001 | companion 已实现 r66 |
| `engine/probe.py` | `probe_run_template_budget_ms` ≤50ms | RPT-001 | companion 已实现 r66 |
| `prefab/service.py` | 预制报表绑定 validate/upsert/list（内存 store） | RPT-002 | L1 已实现 r62 |
| `prefab/run.py` | binding → analysisType SQL → `engine/execute`；`RPT_PREFAB_RUN_FORBIDDEN` | RPT-002 | M3-LITE 已实现 r233 |
| `prefab/seed.py` | 内置 lifecycle/distribution binding 幂等 upsert | RPT-002 | M3-LITE 已实现 r233 |
| **FE** | `fe/src/pages/admin/reports/PrefabReportsPage.tsx` + `usePrefabReports.ts`（列表/运行/空态 vitest） | RPT-002 | M3-LITE 已实现 r233 |
| **FE** | `fe/src/pages/admin/reports/ReportCenterPage.tsx` + `reportCatalogUtils.ts`（Hub 授权模板网格） | RPT-004/001 | 已实现（2026-07-17 IA） |
| **FE** | `fe/src/pages/admin/reports/ReportViewPage.tsx`（模板运行 + 导出） | RPT-001 | 已实现（2026-07-17 IA） |
| **FE** | `fe/src/pages/admin/reports/ReportSchedulesPage.tsx` + `useReportSchedules.ts`（调度列表/历史/重试） | RPT-005 | 已实现（2026-07-17 IA） |
| `templates/acl.py` | viewer 禁写 + enterprise scope（`set_user_template_scope`） | RPT-003 | companion 已实现 r67 |
| `templates/probe.py` | validate/get/list perf probe ≤50ms | RPT-003 | M10 已实现 r234 |
| `templates/service.py` | 模板块 validate/upsert/get/list/delete + `storageRef`/`exportHook` + duplicate block 守卫 | RPT-003 | M10 已实现 r234 |
| `catalog/probe.py` | `probe_list_catalog_budget_ms` ≤50ms | RPT-004 | M10 已实现 r234 |
| `catalog/service.py` | `templateKey` 存在性/唯一性/kind 校验；`count_nodes_by_template_key` | RPT-004 | M10 已实现 r234 |
| **FE** | `fe/src/pages/admin/reports/ReportTemplatesPage.tsx` + `useReportTemplates.ts`（master-detail 树/扩展/预览） | RPT-004/006 | M10 已实现 r234 |
| `ReportService` | 模板 CRUD | RPT-001~003 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §报表。

## 实现笔记

- r54：`reports/extension/` + `reports/batch/` 内存 store；extension 仅 template 节点；batch 幂等 + 原子回滚；错误码 `RPT_EXT_*`、`RPT_BATCH_*`

### r58 companion 质量推分（DASH-006 / RPT-004~007）

- **DASH-006**：`dashboard/theme/execute.py` — `build_theme_execute_plan` 四步（config_load → bindings_resolve → granularity_window → geo_check）；yoy/mom `compareWindow`；`dashboard/theme/acl.py` — `assert_theme_action`（viewer 禁写 `DASH_THEME_FORBIDDEN`）
- **RPT-004**：`extension/compare.py` — `build_compare_slots`；`POST .../extension/compare-preview`；render-spec `compareMetrics` + `compareVersion=1.0`；`extension/acl.py` — `RPT_EXT_FORBIDDEN`
- **RPT-005**：`scheduler/delivery.py` — `dispatch_artifact`；未配 SMTP / `rpt_delivery_mode=mock` 且无 `X-Rpt-Delivery-Mock` → `unconfigured`（禁止静默 delivered）；显式 header 才 mock；`semi_real_execute_schedule` 默认客户路径；`X-Rpt-Execute-Mock: 1` 保留 probe `mock_execute_schedule`（`test://` 产物，非 `mock://`）
- **RPT-001/003**：模板 `storageRef` 使用 `storage://templates/...`（禁止 `mock://`）；导出生成最小合法 PDF/OOXML
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

### F-F companion r-e95d

- **RPT-001**：`integration/reports_export.py` catalog 模板 UUID 导出链 + mock bytes；`exportHook.placeholder=false`
- **RPT-002**：FE `PrefabBindingForm` + PUT prefab bindings
- **RPT-003**：FE `TemplateBlockEditor` 块列表/SQL/重排
- **RPT-005**：`scheduler/delivery_adapter.py` — `RPT_DELIVERY_MODE=mock|smtp`
- **RPT-007**：`batch/export_jobs.py` — `POST /batch/export` + `GET /jobs/{id}` 轮询

- **RPT-003**：`GET/DELETE /reports/templates`；`storageRef` 默认 `mock://templates/{key}.{format}`；`exportHook`（IF-03 placeholder）；`engine/service.run_template` word/excel/pdf 返回 `exportHook`
- **RPT-004**：catalog `templateKey` 外键唯一；`RPT_CATALOG_DUPLICATE_TEMPLATE_KEY` / `RPT_CATALOG_TEMPLATE_KIND_MISMATCH`；`catalog/probe.py` list ≤50ms
- **RPT-006**：`ReportTemplatesPage` 扩展配置 Tab（metrics 行 + changeNote PUT）；预览 Tab `render-spec` JSON

### r65 companion 质量推分（RPT-002）

- **RPT-002**：`prefab/probe.py` — validate/list perf probe ≤50ms；`allowedRoles` 非空（`RPT_PREFAB_EMPTY_ROLES`）；`analysisType=distribution` 需 `region` 维度（`RPT_PREFAB_ANALYSIS_MISMATCH`）；`set_user_prefab_scope` + enterprise `bindingKey` 前缀 scope；`GET /api/v1/reports/prefab/probe`

### r68 companion 质量推分（RPT-002）

- **RPT-002**：`get_prefab_binding` + `RPT_PREFAB_NOT_FOUND`；`RPT_PREFAB_DUPLICATE_DIMENSION`；`list_prefab_bindings(user)` enterprise scope 过滤；`probe_get_prefab_binding_budget_ms` ≤50ms；`GET /api/v1/reports/prefab/bindings/{binding_key}`
