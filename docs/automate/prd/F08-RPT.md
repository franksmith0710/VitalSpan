# F08-RPT 报表子系统

> 模块：M6 · 8 维评分见 [`../prd.md`](../prd.md)

### [RPT-001] 报表引擎渲染

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：报表引擎渲染（SRS 追溯项）。
- **验收标准**：
  - [ ] 模板+数据→Web 展现
  - [ ] 绑定 M3-LITE
- **代码锚点**：`backend/app/reports/engine/`
- **演化建议**：按 plan.md 期次优先级落地
### [RPT-002] 预制分析报表体系 FR-3.1

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：预制分析报表体系 FR-3.1（SRS 追溯项）。
- **验收标准**：
  - [ ] N 实体×M 分析类型可配置
  - [ ] 维度字典驱动
- **代码锚点**：`backend/app/reports/prefab/`
- **演化建议**：按 plan.md 期次优先级落地
### [RPT-003] Word/Excel/PDF 模板定义

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：Word/Excel/PDF 模板定义（SRS 追溯项）。
- **验收标准**：
  - [ ] 模板可嵌 SQL/表格/图形
  - [ ] 模板校验
- **代码锚点**：`backend/app/reports/templates/`
- **演化建议**：按 plan.md 期次优先级落地
### [RPT-004] 模板树形目录管理

- **状态**：部分实现（L1 kickoff r53）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：模板树形目录管理（SRS 追溯项）。
- **验收标准**：
  - [x] 增删改查/移动（r53 L1：`POST/GET/DELETE /api/v1/reports/catalog/nodes` + move；无另存/手工执行）
  - [x] 树形边界守卫（cycle/max depth/has children/`RPT_CATALOG_*` 错误域）
  - [ ] 目录权限受 M7 控制
  - [ ] 另存为/手工执行
- **代码锚点**：`backend/app/reports/catalog/service.py` · `backend/app/api/v1/reports/__init__.py` · `tests/test_dash_rpt_query_nfr_r53.py` T-RPT-R53-004-01~06
- **演化建议**：r53 L1 闭合 catalog tree CRUD/move 与深度/环检测；后续补 M7 目录 ACL、另存为/手工执行与 fe 模板管理 UI
- **里程碑对齐**：
### [RPT-005] 报表调度 FR-3.2

- **状态**：部分实现（L1 kickoff r53）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：报表调度 FR-3.2（SRS 追溯项）。
- **验收标准**：
  - [x] 日/周/月/组合调度（r53 L1：cron 校验 + draft→scheduled→paused→cancelled FSM；无日/周/月组合粒度枚举）
  - [x] IF-03 文档 API 可提取（`GET/POST /api/v1/reports/schedules` + transition + allowedActions）
  - [ ] 调度执行器与产物投递
- **代码锚点**：`backend/app/reports/scheduler/service.py` · `backend/app/api/v1/reports/__init__.py` · `tests/test_dash_rpt_query_nfr_r53.py` T-RPT-R53-005-01~08
- **演化建议**：r53 L1 闭合 schedule FSM、cron 校验与 catalogNodeId 绑定；后续补执行器、组合调度粒度与 IF-03 产物链
- **里程碑对齐**：
### [RPT-006] 报表扩展配置 FR-6.3

- **状态**：L1 已实现（r54）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：报表扩展配置 FR-6.3（SRS 追溯项）。
- **验收标准**：
  - [x] 可调整既有报表指标/筛选器（template 节点 extension CRUD；metrics/filters 校验）
  - [x] 变更可追溯（revision + changeNote 审计）
- **代码锚点**：`backend/app/reports/extension/` · `backend/app/api/v1/reports/__init__.py` · `tests/test_rpt_gov_meta_conn_r54.py` T-R54-RPT-01~07
- **演化建议**：r54 L1 闭合 extension 内存 store 与 REST；后续补真实渲染联动与持久化
### [RPT-007] 批量新增报表 FR-6.4

- **状态**：L1 已实现（r54）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：批量新增报表 FR-6.4（SRS 追溯项）。
- **验收标准**：
  - [x] 基于模板批量复制（batch create template 节点 + 可选 extension）
  - [x] 幂等守卫（Idempotency-Key + 原子回滚）
- **代码锚点**：`backend/app/reports/batch/` · `backend/app/api/v1/reports/__init__.py` · `tests/test_rpt_gov_meta_conn_r54.py` T-R54-RPT-08~15
- **演化建议**：r54 L1 闭合 batch 内存 store；后续补管理员 UI 与异步导出链
