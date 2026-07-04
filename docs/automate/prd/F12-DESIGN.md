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
  - [ ] 与 META-004 联动
- **代码锚点**：`backend/app/designer/output_fields.py` · `backend/app/api/v1/designer.py` · `tests/test_design_conn_gov_query_r49.py` T-DESIGN-R49-003-01~06
- **演化建议**：r49 L1 闭合空 fields/未知 field/非法 aggregate/metaFieldRef glossary 校验；后续 companion 补 META-004 维度联动与 Admin 字段配置 UI
- **里程碑对齐**：
### [DESIGN-004] 设计器与工单关联

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：设计器与工单关联（SRS 追溯项）。
- **验收标准**：
  - [ ] 设计完成进入 GOV-005 发布
  - [ ] 状态同步
- **代码锚点**：`backend/app/designer/workflow.py`
- **演化建议**：按 plan.md 期次优先级落地
### [DESIGN-005] 传统 SQL 模式

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：四期
- **描述**：传统 SQL 模式（SRS 追溯项）。
- **验收标准**：
  - [ ] SQL Lab 式编辑
  - [ ] 语法高亮与执行
  - [x] SQL 只读校验与持久化（r49 L1：`POST validate` + `PUT/GET /api/v1/designer/sql-mode` + `DESIGN_SQL_*` 错误域）
- **代码锚点**：`backend/app/designer/sql_mode.py` · `backend/app/api/v1/designer.py` · `tests/test_design_conn_gov_query_r49.py` T-DESIGN-R49-005-01~05
- **演化建议**：r49 L1 闭合 SELECT 只读守卫/空 SQL/往返持久化/capabilities；后续 companion 补 SQL Lab UI、语法高亮与执行链
- **里程碑对齐**：
