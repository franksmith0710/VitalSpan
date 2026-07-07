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
  - [ ] PDF/Word 真实渲染（companion）
- **代码锚点**：`backend/app/reports/engine/execute.py` · `backend/app/reports/engine/service.py` · `backend/app/api/v1/reports/engine.py` · `tests/test_rpt_view_cat_gov_r60.py` T-RPT-R60-001-01~07 · `tests/test_cat_dash_rpt_meta_r66.py` T-RPT-R66-001-01~05 · `tests/test_m9_rpt_theme_r233.py` T-R233-RPT-001-01~06
- **演化建议**：r233 闭合 M3-LITE extension→query 执行链与 datasource 守卫；PDF/Word 渲染引擎与 fe 模板展现 UI 留 companion
- **里程碑对齐**：M9 · 已完成 · 2026-07-06
### [RPT-002] 预制分析报表体系 FR-3.1

- **状态**：已实现（M9 r233）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：预制分析报表体系 FR-3.1（SRS 追溯项）。
- **验收标准**：
  - [x] N 实体×M 分析类型可配置（r62 L1：`PUT/GET /api/v1/reports/prefab/bindings` + entityType/analysisType 幂等 upsert + list）
  - [x] 维度字典驱动（r62 L1：dimensionKey 校验 + `RPT_PREFAB_DIMENSION_UNKNOWN` 422）
  - [x] companion binding ACL + perf probe（r65：`set_user_prefab_scope` + `RPT_PREFAB_EMPTY_ROLES`/`RPT_PREFAB_ANALYSIS_MISMATCH` 422；enterprise scope 403；`probe_prefab_validate_budget_ms`/`probe_prefab_list_budget_ms` ≤50ms）
  - [x] companion GET binding + duplicate dimension guard + list scope filter（r68：`GET /api/v1/reports/prefab/bindings/{id}` 404/`RPT_PREFAB_GET_FORBIDDEN` 403；`RPT_PREFAB_DUPLICATE_DIMENSION` 422；enterprise list 空集；`probe_prefab_get_budget_ms` ≤50ms）
  - [x] prefab seed + run API + FE 浏览运行（r233：`seed_builtin_prefab_bindings` + `POST .../bindings/{key}/run`；`PrefabReportsPage` + vitest smoke 4/4）
  - [ ] Admin binding 编辑表单（companion）
- **代码锚点**：`backend/app/reports/prefab/run.py` · `backend/app/reports/prefab/seed.py` · `backend/app/api/v1/reports/prefab.py` · `fe/src/pages/admin/reports/PrefabReportsPage.tsx` · `fe/src/pages/admin/reports/usePrefabReports.ts` · `tests/test_cat_rpt_meta_r65.py` T-RPT-R65-002-01~06 · `tests/test_nfr_gov_rpt_view_r68.py` T-RPT-R68-002-01~07 · `tests/test_m9_rpt_theme_r233.py` T-R233-RPT-002-01~06 · `fe/src/pages/admin/reports/prefab-reports.smoke.test.tsx`
- **演化建议**：r233 闭合内置预制 seed、M3-LITE run 链路与 FE 浏览/运行页；binding 编辑表单与 Playwright E2E 留 companion
- **里程碑对齐**：M9 · 已完成 · 2026-07-06
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
  - [ ] PDF/Word 真实排版引擎与 WYSIWYG 设计器（companion）
- **代码锚点**：`backend/app/reports/templates/service.py` · `backend/app/reports/engine/service.py` · `fe/src/pages/admin/reports/ReportTemplatesPage.tsx` · `fe/src/pages/admin/reports/useReportTemplates.ts` · `tests/test_cat_nfr_rpt_meta_r62.py` T-RPT-R62-003-01~06 · `tests/test_dash_nfr_conn_rpt_r67.py` T-RPT-R67-003-01~07 · `tests/test_m10_report_templates_r234.py` T-RPT-R234-003-01~09
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
  - [ ] 另存为/手工执行（companion）
- **代码锚点**：`backend/app/reports/catalog/service.py` · `backend/app/reports/catalog/probe.py` · `fe/src/pages/admin/reports/components/CatalogTreeNode.tsx` · `tests/test_dash_rpt_query_nfr_r53.py` T-RPT-R53-004-01~06 · `tests/test_dash_rpt_r58.py` T-RPT-R58-004-01~08 · `tests/test_m10_report_templates_r234.py` T-RPT-R234-004-01~06
- **演化建议**：r234 闭合 catalog `templateKey` 外键唯一、list perf probe 与 FE 树形管理；另存为/手工执行留 companion
- **里程碑对齐**：M10 · 已完成 · 2026-07-07
### [RPT-005] 报表调度 FR-3.2

- **状态**：已实现（M12 r238）
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
  - [ ] 真实 SMTP/对象存储投递（companion）
  - [ ] 组合调度粒度枚举（companion）
- **代码锚点**：`backend/app/reports/scheduler/service.py` · `backend/app/reports/scheduler/jobs.py` · `backend/app/reports/scheduler/executor.py` · `backend/app/reports/scheduler/delivery.py` · `fe/src/pages/admin/reports/components/SchedulePanel.tsx` · `backend/app/api/v1/reports/__init__.py` · `tests/test_m12_batch1_r238.py` T-RPT-R238-005-* · `tests/test_dash_rpt_query_nfr_r53.py` T-RPT-R53-005-01~08 · `tests/test_dash_rpt_query_nfr_r57.py` T-RPT-R57-005-01~07 · `tests/test_dash_rpt_r58.py` T-RPT-R58-005-01~07
- **演化建议**：r238 闭合 APScheduler 注册、历史/重试链路与 Admin SchedulePanel；真实 SMTP/对象存储投递与组合调度粒度留 companion
- **里程碑对齐**：M12 · 已完成 · 2026-07-07
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
  - [ ] 真实 DB 持久化与运行时渲染展现（companion）
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
  - [x] 重复命名 422 + failures 索引（r238：`batch/service.py` duplicate name + `failures` 字段）
  - [x] 管理员批量导入 UI（r238：`BatchImportPanel` + `TemplateDetailPanel` 批量 Tab；`BatchImportPanel.smoke.test.tsx`）
  - [ ] 异步导出链（companion）
- **代码锚点**：`backend/app/reports/batch/` · `backend/app/reports/catalog/acl.py`（`assert_artifact_access`）· `fe/src/pages/admin/reports/components/BatchImportPanel.tsx` · `backend/app/api/v1/reports/__init__.py` · `tests/test_m12_batch1_r238.py` T-RPT-R238-007-* · `tests/test_rpt_gov_meta_conn_r54.py` T-R54-RPT-08~15 · `tests/test_rpt_gov_meta_conn_r55.py` T-RPT-R55-09~15 · `tests/test_dash_rpt_r58.py` T-RPT-R58-007-01~04
- **演化建议**：r238 闭合 duplicate name、failures 索引与 Admin BatchImportPanel；异步导出链留 companion
- **里程碑对齐**：M12 · 已完成 · 2026-07-07
