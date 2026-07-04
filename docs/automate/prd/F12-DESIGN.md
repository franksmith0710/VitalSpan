# F12-DESIGN 可视化设计器

> 模块：M2 · 8 维评分见 [`../prd.md`](../prd.md)

### [DESIGN-001] 拖拽查询条件配置

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：拖拽查询条件配置（SRS 追溯项）。
- **验收标准**：
  - [ ] 条件/过滤可拖拽（r32 仅后端 JSON schema + validate/save API）
  - [ ] 实时预览
  - [x] 条件配置校验与持久化（r32 L1：`POST validate` + `PUT/GET /api/v1/designer/conditions` 挂载 QUERY-007）
- **代码锚点**：`backend/app/designer/` · `backend/app/api/v1/designer.py`
- **演化建议**：r33 闭合 unknown field/cross-field/validate fields/revision conflict（T-DESIGN-R33-001-01~04）；后续 `fe/` 拖拽 UI 与实时预览
- **里程碑对齐**：
### [DESIGN-002] 运算规则维护

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：运算规则维护（SRS 追溯项）。
- **验收标准**：
  - [x] 加减乘除/求和/平均（r32 L1：`rule_type` + 白名单 `expression` 校验）
  - [x] 计算字段保存（`PUT/GET /api/v1/designer/compute-rules` 挂载 QUERY-007）
- **代码锚点**：`backend/app/designer/` · `backend/app/api/v1/designer.py`
- **演化建议**：r33 闭合 rule type mismatch/broken chain/invalid aggregate/无存储污染（T-DESIGN-R33-002-01~04）；后续 Admin 指标编辑器 UI
- **里程碑对齐**：
### [DESIGN-003] 输出字段与聚合配置

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：输出字段与聚合配置（SRS 追溯项）。
- **验收标准**：
  - [x] 聚合规则可配置（r49 L1：`aggregates` 白名单 sum/count/avg/min/max + validate/save/get）
  - [x] 数量/重复边界（r52 companion：`MAX_OUTPUT_FIELDS`/`MAX_AGGREGATES` + probe <50ms）
  - [ ] 与 META-004 联动
- **代码锚点**：`backend/app/designer/output_fields.py` · `backend/app/api/v1/designer.py` · `tests/test_design_conn_gov_query_r49.py` · `tests/test_design_conn_gov_query_r52.py` T-DESIGN-R52-003-01~09
- **演化建议**：r52 companion 闭合空/过多 fields、重复 fieldId、非法 aggregate 与 sql_mode 并存回归；后续补 META-004 维度联动与 Admin 字段配置 UI
- **里程碑对齐**：
### [DESIGN-004] 设计器与工单关联

- **状态**：部分实现（companion r63）
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：设计器与工单关联（SRS 追溯项）。
- **验收标准**：
  - [x] workflow-link validate/save/get（r59 L1：`POST validate` + `PUT/GET /api/v1/designer/workflow-link` + `publishReady` 探测 GOV workflow/publish）
  - [x] 未知 instance/非法 item/sql_mode 路由不变（r59）
  - [x] companion catalog/designType 守卫 + perf probe（r63：`DESIGN_WORKFLOW_CATALOG_MISMATCH`；`probe_validate_workflow_link_budget_ms` ≤50ms；published workflow publishReady=true）
  - [ ] 设计完成进入 GOV-005 发布全链路
  - [ ] 状态同步（缺 fe 与 BPM 双向钩子）
- **代码锚点**：`backend/app/designer/workflow.py` · `backend/app/api/v1/designer.py` · `tests/test_viz_view_design_cat_r63.py` T-DESIGN-R63-004-01~05 · `tests/test_meta_cat_dash_conn_design_r59.py` T-DESIGN-R59-004-01~06
- **演化建议**：r63 companion 闭合 workflow-link catalog mismatch、validate probe 与 publishReady 回归；后续补 GOV-005 发布全链路与状态同步 UI
- **里程碑对齐**：
### [DESIGN-005] 传统 SQL 模式

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：传统 SQL 模式（SRS 追溯项）。
- **验收标准**：
  - [ ] SQL Lab 式编辑
  - [ ] 语法高亮与执行
  - [x] SQL 只读校验与持久化（r49 L1：`POST validate` + `PUT/GET /api/v1/designer/sql-mode` + `DESIGN_SQL_*` 错误域）
  - [x] 只读链 companion（r52：DML/注释隐藏/FOR UPDATE/长度上限 + `detail.remediation` + chart_view `CHART_SQL_NOT_READONLY` 联动）
- **代码锚点**：`backend/app/designer/sql_mode.py` · `backend/app/schemas/chart_view.py` · `backend/app/api/v1/designer.py` · `tests/test_design_conn_gov_query_r49.py` · `tests/test_design_conn_gov_query_r52.py` T-DESIGN-R52-005-01~10
- **演化建议**：r52 companion 闭合只读 SQL 多语句/注释 DML/FOR UPDATE/超长与 render-spec 联动；后续补 SQL Lab UI、语法高亮与执行链
- **里程碑对齐**：
