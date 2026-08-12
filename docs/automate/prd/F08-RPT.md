# F08-RPT 报表子系统

> 模块：M6 · 8 维评分见 [`../prd.md`](../prd.md)

### [RPT-001] 报表引擎渲染

- **状态**：已实现（M9 r233）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：报表引擎渲染（SRS 追溯项）。
- **验收标准**：
  - [x] 模板+数据→Web 展现（r60 L1：`POST /api/v1/reports/templates/{id}/run` → renderSpec engineVersion=1.0；format web/html；`RPT_ENGINE_*` 错误域）
  - [x] companion engine run ACL + parameter guard + perf probe（r66：`set_user_engine_scope` + `RPT_ENGINE_FORBIDDEN` 403；`__proto__` parameter 422；`probe_run_template_budget_ms` ≤50ms）
  - [x] M3-LITE 绑定执行链（r233：`engine/execute.py` + `build_sections_from_extension` → `execute_query`；`dataSourceId` 必填 `RPT_ENGINE_DATASOURCE_REQUIRED`；无 dataSourceId placeholder 回归 r60）
  - [x] PDF/Word 真实渲染（companion r-e95d：`reports_export` catalog 模板链 + mock bytes 下载；`exportHook.placeholder=false`；`ReportExportCard` FE 下载）
- **代码锚点**：`backend/app/reports/engine/execute.py` · `backend/app/reports/engine/service.py` · `backend/app/integration/reports_export.py` · `backend/app/api/v1/reports/engine.py` · `fe/src/pages/admin/reports/components/ReportExportCard.tsx` · `tests/test_ff_rpt_companion_e95d.py` · `tests/test_m9_rpt_theme_r233.py` T-R233-RPT-001-01~06
- **演化建议**：r233 闭合 M3-LITE extension→query 执行链与 datasource 守卫；PDF/Word 渲染引擎与 fe 模板展现 UI 留 companion
- **里程碑对齐**：M9 · 已完成 · 2026-07-06
### [RPT-002] 标准分析报表体系 FR-3.1

- **状态**：已实现（2026-08-11 重建）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：面向业务对象的标准分析：显式物理表绑定、主题运行、周期快照与本期 vs 上期对比。
- **验收标准**：
  - [x] 分析包 CRUD（`PUT/GET/DELETE /api/v1/reports/standard/packs`）
  - [x] 字段能力探测（`GET .../capabilities`）
  - [x] 实时运行与对比（`POST .../run` · `GET .../compare`）
  - [x] 周期快照（`POST .../snapshots/capture` · `GET .../snapshots`）
  - [x] APScheduler 快照 job（`standard/jobs.py`）
  - [x] FE 工作台 + 配置页 + Hub（`StandardAnalysisPage` · `StandardAnalysisConfigPage`）
- **代码锚点**：`backend/app/reports/standard/` · `backend/app/api/v1/reports/standard.py` · `fe/src/pages/admin/reports/StandardAnalysisPage.tsx` · `tests/test_standard_analysis.py`
- **演化建议**：关键节点快照、另存为自由报表留 companion
- **里程碑对齐**：M9 · 已完成 · 2026-08-11
### [RPT-003] Word/Excel/PDF 模板定义

- **状态**：已实现（M10 r234）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：Word/Excel/PDF 模板定义（SRS 追溯项）。
- **验收标准**：
  - [x] 模板可嵌 SQL/表格/图形（r62 L1：`PUT/GET /api/v1/reports/templates/{id}` word/excel/pdf blocks：sql/table/chart）
  - [x] 模板校验（r62 L1：`POST validate` + empty blocks/invalid block type 422 + `RPT_TEMPLATE_*` 错误域）
  - [x] companion ACL/probe 边界（r67：viewer PUT/enterprise 越权 GET 403；duplicate sql block/非法 chartType 422；`probe_validate_template_budget_ms`/`probe_get_template_budget_ms` ≤50ms）
  - [x] M10 storageRef/DELETE/list/exportHook（r234：`GET/DELETE /reports/templates` + `storageRef` mock URI；`RPT_TEMPLATE_IN_USE` 409；`engine/service.run_template` word/excel/pdf 占位 `exportHook`；`probe_list_templates_budget_ms` ≤50ms）
  - [x] M10 FE 模板元数据页（r234：`ReportTemplatesPage` + `useReportTemplates.ts`；vitest smoke 含树加载/空态）
  - [x] PDF/Word 真实排版引擎与 WYSIWYG 设计器（companion r-e95d：`TemplateBlockEditor` 块列表/SQL/重排；非全量 WYSIWYG）
- **代码锚点**：`backend/app/reports/templates/service.py` · `backend/app/reports/engine/service.py` · `fe/src/pages/admin/reports/ReportTemplatesPage.tsx` · `fe/src/pages/admin/reports/components/TemplateBlockEditor.tsx` · `fe/src/pages/admin/reports/useReportTemplates.ts` · `tests/test_ff_rpt_companion_e95d.py` · `tests/test_m10_report_templates_r234.py` T-RPT-R234-003-01~09
- **演化建议**：r234 闭合 storageRef/delete-in-use/exportHook 与 Admin 模板元数据页；真实 PDF/Word 排版引擎与 WYSIWYG 设计器留 companion
- **里程碑对齐**：M10 · 已完成 · 2026-07-07
### [RPT-004] 模板树形目录管理

- **状态**：已实现（M10 r234）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：模板树形目录管理（SRS 追溯项）。
- **验收标准**：
  - [x] 增删改查/移动（r53 L1：`POST/GET/DELETE /api/v1/reports/catalog/nodes` + move；无另存/手工执行）
  - [x] 树形边界守卫（cycle/max depth/has children/`RPT_CATALOG_*` 错误域）
  - [x] 目录权限受 M7 控制（r57 companion：`reports/catalog/acl.py` viewer 禁写/owner 删叶/admin 绕过 move；ACL 判定 ≤10ms）
  - [x] extension 同比环比（r58 companion：`compareMode` yoy/mom + `POST .../compare-preview` + render-spec `compareMetrics`；`extension/acl.py` viewer 禁写）
  - [x] M10 templateKey 唯一关联 + list probe（r234：`RPT_CATALOG_DUPLICATE_TEMPLATE_KEY`/`RPT_CATALOG_TEMPLATE_KIND_MISMATCH`/`RPT_CATALOG_TEMPLATE_NOT_FOUND`；`catalog/probe.py` list ≤50ms；`ReportTemplatesPage` 树浏览）
  - [ ] 另存为/手工执行（companion · **演化建议 / 非阻塞**）
- **代码锚点**：`backend/app/reports/catalog/service.py` · `backend/app/reports/catalog/probe.py` · `fe/src/pages/admin/reports/components/CatalogTreeNode.tsx` · `tests/test_dash_rpt_query_nfr_r53.py` T-RPT-R53-004-01~06 · `tests/test_dash_rpt_r58.py` T-RPT-R58-004-01~08 · `tests/test_m10_report_templates_r234.py` T-RPT-R234-004-01~06
- **演化建议**：r234 闭合 catalog `templateKey` 外键唯一、list perf probe 与 FE 树形管理；另存为/手工执行留 companion
- **里程碑对齐**：M10 · 已完成 · 2026-07-07
### [RPT-005] 报表调度 FR-3.2

- **状态**：已实现（M12 r238；**M-DEPTH F-C 深度 companion 已闭合** · 2026-07-29）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：报表调度 FR-3.2（SRS 追溯项）。
- **验收标准**：
  - [x] 日/周/月/组合调度（r53 L1：cron 校验 + draft→scheduled→paused→cancelled FSM；无日/周/月组合粒度枚举）
  - [x] IF-03 文档 API 可提取（`GET/POST /api/v1/reports/schedules` + transition + allowedActions）
  - [x] 调度 mock 执行器（r57 companion：`POST .../schedules/{id}/execute` Idempotency-Key + mock_succeeded；非真实产物投递）
  - [x] semi-real 执行器 + mock 投递链（r58 companion：`X-Rpt-Semi-Real: 1` + `delivery.py` success/fail/retry + `revisionSnapshot`；`probe_semi_real_execute_budget_ms` ≤35ms）
  - [x] APScheduler 调度注册 + lifespan（r238：`scheduler/jobs.py` + `main.py` lifespan hook）
  - [x] 列表/历史/重试 API（r238：`GET /api/v1/reports/schedules` + `GET .../executions` + `POST .../retry` + failed 错误信息）
  - [x] M12 Admin 调度 UI（r238：`SchedulePanel` + `TemplateDetailPanel` 调度 Tab；`SchedulePanel.smoke.test.tsx`）
  - [x] 真实 SMTP 投递（companion r-e95d：固定 SMTP + MailHog 兼容适配器；测试 mock 仅 header）
  - [x] **M-DEPTH F-C**：调度执行历史 / 重试 UI 增强（接 `GET .../executions` + `POST .../retry`；失败可读、可重试）（完成于 2026-07-29 · `SchedulePanel.tsx` · `SchedulePanel.smoke.test.tsx`）
  - [x] **G5 看板/大屏可视化 PDF**（2026-08-03：`export_render.py` Playwright + FE `/export/*?token=`；`artifactKind=visual_snapshot`；`tests/test_dashboard_visual_export.py`）
  - [x] **IA 收敛 · 报表中心统一工作台**（2026-08-09：侧栏单入口 Hub；看板定时主路径 + 文档套版并列叙事；`reportCenterNav.ts`）
  - [ ] 组合调度粒度枚举（companion · **演化建议 / 非阻塞**）
- **代码锚点**：`backend/app/reports/scheduler/service.py` · `backend/app/reports/scheduler/jobs.py` · `backend/app/reports/scheduler/executor.py` · `backend/app/reports/scheduler/delivery_adapter.py` · `backend/app/dashboard/export_render.py` · `fe/src/pages/export/DashboardExportSnapshotPage.tsx` · `fe/src/pages/admin/reports/ReportCenterPage.tsx` · `fe/src/pages/admin/reports/components/DashboardSchedulePanel.tsx` · `fe/src/pages/admin/reports/components/SchedulePrecheckPanel.tsx` · `backend/app/api/v1/reports/__init__.py` · `tests/test_ff_rpt_companion_e95d.py` · `tests/test_dashboard_visual_export.py` · `tests/test_report_dashboard_schedule.py` · `tests/test_m12_batch1_r238.py` T-RPT-R238-005-* · `tests/test_dash_rpt_query_nfr_r53.py` T-RPT-R53-005-01~08 · `tests/test_dash_rpt_query_nfr_r57.py` T-RPT-R57-005-01~07 · `tests/test_dash_rpt_r58.py` T-RPT-R58-005-01~07
- **演化建议**：主线为看板/大屏可视化 PDF 定时报告；文档模板 Office 套版为并列已可用能力；组合调度粒度留远期
- **里程碑对齐**：M12 · 已完成 · 2026-07-07；**M-DEPTH F-C · 已闭合 · 2026-07-29**
### [RPT-006] 报表扩展配置 FR-6.3

- **状态**：已实现（M10 r234）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：报表扩展配置 FR-6.3（SRS 追溯项）。
- **验收标准**：
  - [x] 可调整既有报表指标/筛选器（template 节点 extension CRUD；metrics/filters 校验）
  - [x] 变更可追溯（revision + changeNote 审计）
  - [x] render-spec 可见指标/修订历史/内存持久化快照（r55 companion：`build_extension_render_spec` + revisions + snapshot）
  - [x] batch compare 联动（r58 companion：batch yoy render-spec compareMetrics + `probe_render_spec_budget_ms` ≤50ms）
  - [x] M10 Admin 扩展配置 UI（r234：`TemplateDetailPanel` 扩展 Tab metrics/changeNote PUT + 预览 Tab render-spec JSON；folder 节点 extension 422 回归）
  - [x] P3 DB 持久化（`RPT_METADATA_STORE=db` + migration 0034 + `persistence/store` repo 抽象；`test_report_metadata_db_store.py`）
  - [x] P3 Dataset 桥接（metric `queryMode` + `datasetId`/`boundConfigId` → `execute_dataset_from_config`；FE SQL/Dataset 切换）
  - [x] P3 RenderSpec 真导出（`reports/render/` PDF/Excel/Word；调度模板附件 + IF-03）
- **代码锚点**：`backend/app/reports/extension/` · `fe/src/pages/admin/reports/components/TemplateDetailPanel.tsx` · `fe/src/pages/admin/reports/useReportTemplates.ts` · `tests/test_rpt_gov_meta_conn_r55.py` T-RPT-R55-01~08 · `tests/test_m10_report_templates_r234.py` T-RPT-R234-006-01~03
- **演化建议**：r234 闭合 Admin 扩展配置与 render-spec 预览 UI；真实 DB 持久化与运行时渲染展现留 companion
- **里程碑对齐**：M10 · 已完成 · 2026-07-07
### [RPT-007] 批量新增报表 FR-6.4

- **状态**：已实现（M12 r238）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：批量新增报表 FR-6.4（SRS 追溯项）。
- **验收标准**：
  - [x] 基于模板批量复制（batch create template 节点 + 可选 extension）
  - [x] 幂等守卫（Idempotency-Key + 原子回滚）
  - [x] 部分失败结构化 detail + rolledBackCount（r55 companion）
  - [x] 产物访问守卫（r58 companion：`GET .../executions/{id}/artifact` owner 可读/viewer 他人 403；batch 10 项 `probe_batch_budget_ms` ≤200ms）
  - [x] artifact owner DB 持久化（`report_artifact_owners` · Alembic `0040` · `tests/test_persistence_roundtrip.py`）
  - [x] 重复命名 422 + failures 索引（r238：`batch/service.py` duplicate name + `failures` 字段）
  - [x] 管理员批量导入 UI（r238：`BatchImportPanel` + `TemplateDetailPanel` 批量 Tab；`BatchImportPanel.smoke.test.tsx`）
  - [x] 批量导入 dry-run 预检（2026-08-09：`POST /api/v1/reports/batch/dry-run` + 冲突行高亮；`batch/dry_run.py`）
  - [x] 异步导出链（companion r-e95d：`POST /batch/export` + `GET /jobs/{id}` 轮询 + download）
- **代码锚点**：`backend/app/reports/batch/` · `backend/app/reports/batch/export_jobs.py` · `backend/app/reports/catalog/acl.py`（`assert_artifact_access`）· `fe/src/pages/admin/reports/components/BatchImportPanel.tsx` · `backend/app/api/v1/reports/__init__.py` · `tests/test_ff_rpt_companion_e95d.py` · `tests/test_m12_batch1_r238.py` T-RPT-R238-007-* · `tests/test_rpt_gov_meta_conn_r54.py` T-R54-RPT-08~15 · `tests/test_rpt_gov_meta_conn_r55.py` T-RPT-R55-09~15 · `tests/test_dash_rpt_r58.py` T-RPT-R58-007-01~04
- **演化建议**：r238 闭合 duplicate name、failures 索引与 Admin BatchImportPanel；dry-run 预检已闭合（2026-08-09）；异步导出链留 companion
- **里程碑对齐**：M12 · 已完成 · 2026-07-07
