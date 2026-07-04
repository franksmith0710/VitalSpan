# F08-RPT 报表子系统

> 模块：M6 · 8 维评分见 [`../prd.md`](../prd.md)

### [RPT-001] 报表引擎渲染

- **状态**：部分实现（companion r66）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：报表引擎渲染（SRS 追溯项）。
- **验收标准**：
  - [x] 模板+数据→Web 展现（r60 L1：`POST /api/v1/reports/templates/{id}/run` → renderSpec engineVersion=1.0；format web/html；`RPT_ENGINE_*` 错误域）
  - [x] companion engine run ACL + parameter guard + perf probe（r66：`set_user_engine_scope` + `RPT_ENGINE_FORBIDDEN` 403；`__proto__` parameter 422；`probe_run_template_budget_ms` ≤50ms）
  - [ ] 绑定 M3-LITE（无真实数据源执行链；无 PDF/Word 渲染）
- **代码锚点**：`backend/app/reports/engine/` · `backend/app/api/v1/reports/engine.py` · `tests/test_rpt_view_cat_gov_r60.py` T-RPT-R60-001-01~07 · `tests/test_cat_dash_rpt_meta_r66.py` T-RPT-R66-001-01~05
- **演化建议**：r66 companion 闭合 engine run ACL、parameter injection guard 与 run perf probe；后续补 M3-LITE 绑定、PDF/Word 渲染与 fe 展现 UI
- **里程碑对齐**：
### [RPT-002] 预制分析报表体系 FR-3.1

- **状态**：部分实现（companion r65）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：预制分析报表体系 FR-3.1（SRS 追溯项）。
- **验收标准**：
  - [x] N 实体×M 分析类型可配置（r62 L1：`PUT/GET /api/v1/reports/prefab/bindings` + entityType/analysisType 幂等 upsert + list）
  - [x] 维度字典驱动（r62 L1：dimensionKey 校验 + `RPT_PREFAB_DIMENSION_UNKNOWN` 422）
  - [x] companion binding ACL + perf probe（r65：`set_user_prefab_scope` + `RPT_PREFAB_EMPTY_ROLES`/`RPT_PREFAB_ANALYSIS_MISMATCH` 422；enterprise scope 403；`probe_prefab_validate_budget_ms`/`probe_prefab_list_budget_ms` ≤50ms）
  - [ ] fe 预制报表选择与渲染（无 Admin 预制报表 UI）
- **代码锚点**：`backend/app/reports/prefab/` · `backend/app/api/v1/reports/__init__.py` · `tests/test_cat_rpt_meta_r65.py` T-RPT-R65-002-01~06 · `tests/test_cat_nfr_rpt_meta_r62.py` T-RPT-R62-002-01~06
- **演化建议**：r65 companion 闭合 prefab binding ACL、allowedRoles/analysisType 联动与 validate/list perf probe；后续补 fe 预制报表选择与 M3-LITE 执行链
- **里程碑对齐**：
### [RPT-003] Word/Excel/PDF 模板定义

- **状态**：部分实现（companion r67）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：Word/Excel/PDF 模板定义（SRS 追溯项）。
- **验收标准**：
  - [x] 模板可嵌 SQL/表格/图形（r62 L1：`PUT/GET /api/v1/reports/templates/{id}` word/excel/pdf blocks：sql/table/chart）
  - [x] 模板校验（r62 L1：`POST validate` + empty blocks/invalid block type 422 + `RPT_TEMPLATE_*` 错误域）
  - [x] companion ACL/probe 边界（r67：viewer PUT/enterprise 越权 GET 403；duplicate sql block/非法 chartType 422；`probe_validate_template_budget_ms`/`probe_get_template_budget_ms` ≤50ms）
  - [ ] PDF/Word 真实渲染与 fe 模板设计器（无渲染引擎与 Admin UI）
- **代码锚点**：`backend/app/reports/templates/` · `backend/app/api/v1/reports/__init__.py` · `tests/test_cat_nfr_rpt_meta_r62.py` T-RPT-R62-003-01~06 · `tests/test_dash_nfr_conn_rpt_r67.py` T-RPT-R67-003-01~07
- **演化建议**：r67 companion 闭合 template blocks ACL、duplicate block/chartType 校验与 validate/get perf probe；后续补 PDF/Word 渲染引擎与 fe 模板设计器
- **里程碑对齐**：
### [RPT-004] 模板树形目录管理

- **状态**：部分实现（companion r58）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：模板树形目录管理（SRS 追溯项）。
- **验收标准**：
  - [x] 增删改查/移动（r53 L1：`POST/GET/DELETE /api/v1/reports/catalog/nodes` + move；无另存/手工执行）
  - [x] 树形边界守卫（cycle/max depth/has children/`RPT_CATALOG_*` 错误域）
  - [x] 目录权限受 M7 控制（r57 companion：`reports/catalog/acl.py` viewer 禁写/owner 删叶/admin 绕过 move；ACL 判定 ≤10ms）
  - [x] extension 同比环比（r58 companion：`compareMode` yoy/mom + `POST .../compare-preview` + render-spec `compareMetrics`；`extension/acl.py` viewer 禁写）
  - [ ] 另存为/手工执行
- **代码锚点**：`backend/app/reports/catalog/service.py` · `backend/app/reports/catalog/acl.py` · `backend/app/reports/extension/compare.py` · `backend/app/reports/extension/acl.py` · `backend/app/api/v1/reports/__init__.py` · `tests/test_dash_rpt_query_nfr_r53.py` T-RPT-R53-004-01~06 · `tests/test_dash_rpt_query_nfr_r57.py` T-RPT-R57-004-01~06 · `tests/test_dash_rpt_r58.py` T-RPT-R58-004-01~08
- **演化建议**：r58 companion 闭合 compare-preview/render-spec compareMetrics 与 extension ACL；后续补另存为/手工执行与 fe 模板管理 UI
- **里程碑对齐**：
### [RPT-005] 报表调度 FR-3.2

- **状态**：部分实现（companion r58）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：报表调度 FR-3.2（SRS 追溯项）。
- **验收标准**：
  - [x] 日/周/月/组合调度（r53 L1：cron 校验 + draft→scheduled→paused→cancelled FSM；无日/周/月组合粒度枚举）
  - [x] IF-03 文档 API 可提取（`GET/POST /api/v1/reports/schedules` + transition + allowedActions）
  - [x] 调度 mock 执行器（r57 companion：`POST .../schedules/{id}/execute` Idempotency-Key + mock_succeeded；非真实产物投递）
  - [x] semi-real 执行器 + mock 投递链（r58 companion：`X-Rpt-Semi-Real: 1` + `delivery.py` success/fail/retry + `revisionSnapshot`；`probe_semi_real_execute_budget_ms` ≤35ms）
- **代码锚点**：`backend/app/reports/scheduler/service.py` · `backend/app/reports/scheduler/executor.py` · `backend/app/reports/scheduler/delivery.py` · `backend/app/api/v1/reports/__init__.py` · `tests/test_dash_rpt_query_nfr_r53.py` T-RPT-R53-005-01~08 · `tests/test_dash_rpt_query_nfr_r57.py` T-RPT-R57-005-01~07 · `tests/test_dash_rpt_r58.py` T-RPT-R58-005-01~07
- **演化建议**：r58 companion 闭合 semi-real 执行器、mock 投递链、revisionSnapshot 与幂等重放；后续补真实 SMTP/对象存储投递、组合调度粒度与 fe 调度 UI
- **里程碑对齐**：
### [RPT-006] 报表扩展配置 FR-6.3

- **状态**：部分实现（companion r58）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：报表扩展配置 FR-6.3（SRS 追溯项）。
- **验收标准**：
  - [x] 可调整既有报表指标/筛选器（template 节点 extension CRUD；metrics/filters 校验）
  - [x] 变更可追溯（revision + changeNote 审计）
  - [x] render-spec 可见指标/修订历史/内存持久化快照（r55 companion：`build_extension_render_spec` + revisions + snapshot）
  - [x] batch compare 联动（r58 companion：batch yoy render-spec compareMetrics + `probe_render_spec_budget_ms` ≤50ms）
  - [ ] 真实 DB 持久化与前端渲染 UI
- **代码锚点**：`backend/app/reports/extension/` · `backend/app/reports/batch/service.py` · `backend/app/api/v1/reports/__init__.py` · `tests/test_rpt_gov_meta_conn_r54.py` T-R54-RPT-01~07 · `tests/test_rpt_gov_meta_conn_r55.py` T-RPT-R55-01~08 · `tests/test_dash_rpt_r58.py` T-RPT-R58-006-01~03
- **演化建议**：r58 companion 巩固 batch compare render 联动与性能探测；后续补真实持久化与管理员 UI
- **里程碑对齐**：
### [RPT-007] 批量新增报表 FR-6.4

- **状态**：部分实现（companion r58）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：批量新增报表 FR-6.4（SRS 追溯项）。
- **验收标准**：
  - [x] 基于模板批量复制（batch create template 节点 + 可选 extension）
  - [x] 幂等守卫（Idempotency-Key + 原子回滚）
  - [x] 部分失败结构化 detail + rolledBackCount（r55 companion）
  - [x] 产物访问守卫（r58 companion：`GET .../executions/{id}/artifact` owner 可读/viewer 他人 403；batch 10 项 `probe_batch_budget_ms` ≤200ms）
  - [ ] 管理员 UI 与异步导出链
- **代码锚点**：`backend/app/reports/batch/` · `backend/app/reports/catalog/acl.py`（`assert_artifact_access`）· `backend/app/api/v1/reports/__init__.py` · `tests/test_rpt_gov_meta_conn_r54.py` T-R54-RPT-08~15 · `tests/test_rpt_gov_meta_conn_r55.py` T-RPT-R55-09~15 · `tests/test_dash_rpt_r58.py` T-RPT-R58-007-01~04
- **演化建议**：r58 companion 闭合 artifact 访问守卫与 batch 性能探测；后续补管理员 UI 与异步导出链
