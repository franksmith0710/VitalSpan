# reports — 报表

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/reports/` |
| PRD | [F08-RPT](../automate/prd/F08-RPT.md) · RPT-001 ~ RPT-007 |
| 里程碑 | M6 / M10 / M12 |
| 状态 | **P3-SMOKE 可签收（ORM 持久化 · RenderSpec 真导出 · Dataset 桥接 · 2026-08-04）** |

## 职责

- 报表模板树 catalog（folder/template 节点 CRUD/move）
- 报表调度 FSM（draft→scheduled→paused/cancelled）
- 导出引擎（PDF/Excel 等）与异步任务（远期）
- 报表实例查询（委托 `query`）

## 边界

| In | Out |
|----|-----|
| `reports/catalog/` 模板树 registry（memory \| db `RPT_METADATA_STORE`）+ 循环/深度守卫 + M7 ACL | 通用查询引擎（→ `query`） |
| `reports/persistence/` catalog/extension/prefab/templates/integration_exports ORM + repo 抽象 | Jasper WYSIWYG 设计器 |
| `reports/render/` RenderSpec → PDF/Excel/Word 真字节（reportlab/openpyxl/OOXML） | 在线地图/瓦片 |
| `reports/scheduler/` 调度 FSM + semi-real 执行 + 模板/看板附件投递 | Celery 队列、飞书 webhook |
| `reports/extension/` metrics/filters；metric 级 `queryMode=sql\|dataset` + `boundConfigId` | Dataset 建模 UI（→ `metadata/dataset`） |
| `reports/batch/` 批量创建模板节点 + 幂等守卫 | 打印排版 UI（前端 `/admin/reports/*`） |
| `reports/engine/` render run + `export_template_bytes` | 组合调度粒度枚举 |

## 依赖

- `core`、`auth`、`query`
- `reports/catalog` → `reports/scheduler`（`catalogNodeId` 引用）

## 前端消费 IA（报表中心 · 2026-08 收敛）

**产品主线（当前默认）**：看板/数据大屏 → 分享页「创建定时报告」→ Playwright 可视化 PDF（`dashboard/export_render.py`）→ SMTP/消息投递 → 执行记录与重试。

**后续能力（非默认路径）**：文档模板树（Word/Excel 套版填数）+ RenderSpec 引擎；保留管理与历史数据，不承担默认定时投递承诺。

侧栏 **「报表中心」** 为「报表」分组一级父项；Hub 页 `/admin/reports/center`（`ReportCenterPage.tsx`）职责：**定时报告运维聚合**（我的看板调度、近期失败、重试入口）+ 折叠的文档模板区 + 预制分析。

| 子入口（nav-manifest） | 路由 | 权限 | 说明 |
|------------------------|------|------|------|
| 报表中心 | `/admin/reports/center` | `report:read` | Hub：定时报告概览、失败重试、文档模板（折叠） |
| 定时报告 | `/admin/reports/schedules` | `report:manage` | 全量调度列表、执行历史、重试（admin） |
| 预制报表 | `/admin/reports` | `report:read` | 内置 entity×analysis 绑定（FR-3.1） |
| 文档模板 | `/admin/reports/templates` | `report:manage` | 固定版式模板树（后续能力） |

- **创建主路径**：看板/大屏编辑 → 分享 → `DashboardSchedulePanel`（前置检查：组件非空、Playwright、SMTP）
- **analyst**：Hub + 预制报表；可通过 `dashboard:schedule` 在看板分享页创建定时报告
- **admin**：另含定时报告全量管理、文档模板管理

### DataEase 对标（IA，非菜单名 1:1）

| VitalSpan 入口 | 近似 DataEase 能力 |
|----------------|-------------------|
| 报表中心 + 看板分享定时报告 | X-Pack 定时报告 / 可视化快照投递 |
| 预制报表 | 内置分析类固定报表（政企扩展） |
| 文档模板 | 报表模板管理（后续 Office 套版） |
| 定时报告（schedules） | 定时报告运维 / 执行历史 |

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
| `engine/execute.py` | extension metrics → SQL `execute_query` **或** Dataset `execute_dataset_from_config` | RPT-001/006 | P3 已实现 |
| `reports/persistence/` | `RPT_METADATA_STORE=memory\|db`（**默认 db**）；catalog/extension/prefab/templates 持久化 | RPT-006 | P3 已实现 |
| `reports/render/` | `render_from_spec` → PDF/Excel/Word bytes | RPT-001/003 | P3 已实现 |
| `engine/acl.py` | run 访问控制 + `set_user_engine_scope` enterprise 白名单 | RPT-001 | companion 已实现 r66 |
| `engine/probe.py` | `probe_run_template_budget_ms` ≤50ms | RPT-001 | companion 已实现 r66 |
| `prefab/service.py` | 预制报表绑定 validate/upsert/list（内存 store） | RPT-002 | L1 已实现 r62 |
| `prefab/run.py` | binding → analysisType SQL → `engine/execute`；`RPT_PREFAB_RUN_FORBIDDEN` | RPT-002 | M3-LITE 已实现 r233 |
| `prefab/seed.py` | 内置 lifecycle/distribution binding 幂等 upsert | RPT-002 | M3-LITE 已实现 r233 |
| **FE** | `fe/src/pages/admin/reports/PrefabReportsPage.tsx` + `usePrefabReports.ts`（列表/运行/空态 vitest） | RPT-002 | M3-LITE 已实现 r233 |
| **FE** | `fe/src/pages/admin/reports/ReportCenterPage.tsx` + `ReportCenterScheduleHub.tsx`（定时报告 Hub · 2026-08 收敛） | RPT-005 | 已实现 |
| **FE** | `fe/src/pages/admin/reports/components/DashboardSchedulePanel.tsx` + `SchedulePrecheckPanel.tsx`（看板分享页创建 + 前置检查） | RPT-005 | 已实现 |
| **FE** | `fe/src/pages/export/DashboardExportSnapshotPage.tsx` + `export_render.py`（Playwright PDF 快照） | RPT-005 | G5 · 2026-08-03 |
| **FE** | `fe/src/pages/admin/reports/ReportViewPage.tsx`（模板运行 + 导出） | RPT-001 | 已实现（2026-07-17 IA） |
| **FE** | `fe/src/pages/admin/reports/ReportSchedulesPage.tsx` + `SchedulePanel.tsx` + `SchedulePanel.smoke.test.tsx`（调度列表/历史/重试） | RPT-005 | M-DEPTH F-C · 2026-07-29 |
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
- **RPT-005**：`scheduler/delivery_adapter.py` — SMTP `add_attachment` 发送 visual_snapshot PDF；固定 SMTP；测试 mock 仅 `X-Rpt-Delivery-Mock` header
- **RPT-007**：`batch/export_jobs.py` — `POST /batch/export` + `GET /jobs/{id}` 轮询

- **RPT-003**：`GET/DELETE /reports/templates`；`storageRef` 默认 `mock://templates/{key}.{format}`；`exportHook`（IF-03 placeholder）；`engine/service.run_template` word/excel/pdf 返回 `exportHook`
- **RPT-004**：catalog `templateKey` 外键唯一；`RPT_CATALOG_DUPLICATE_TEMPLATE_KEY` / `RPT_CATALOG_TEMPLATE_KIND_MISMATCH`；`catalog/probe.py` list ≤50ms
- **RPT-006**：`ReportTemplatesPage` 扩展配置 Tab（metrics 行 + changeNote PUT）；预览 Tab `render-spec` JSON

### r65 companion 质量推分（RPT-002）

- **RPT-002**：`prefab/probe.py` — validate/list perf probe ≤50ms；`allowedRoles` 非空（`RPT_PREFAB_EMPTY_ROLES`）；`analysisType=distribution` 需 `region` 维度（`RPT_PREFAB_ANALYSIS_MISMATCH`）；`set_user_prefab_scope` + enterprise `bindingKey` 前缀 scope；`GET /api/v1/reports/prefab/probe`

### r68 companion 质量推分（RPT-002）

- **RPT-002**：`get_prefab_binding` + `RPT_PREFAB_NOT_FOUND`；`RPT_PREFAB_DUPLICATE_DIMENSION`；`list_prefab_bindings(user)` enterprise scope 过滤；`probe_get_prefab_binding_budget_ms` ≤50ms；`GET /api/v1/reports/prefab/bindings/{binding_key}`
