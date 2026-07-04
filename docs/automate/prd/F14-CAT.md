# F14-CAT 查询接口分类

> 模块：附录E · 8 维评分见 [`../prd.md`](../prd.md)

### [CAT-001] CAT-01 实体生命周期查询类

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：一期
- **描述**：CAT-01 实体生命周期查询类（SRS 追溯项）。
- **验收标准**：
  - [ ] 模板规格落地
  - [ ] OpenAPI 只读
- **代码锚点**：`backend/app/governance/catalog/cat01.py`
- **演化建议**：按 plan.md 期次优先级落地
### [CAT-002] CAT-02 统计分析聚合类

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：一期
- **描述**：CAT-02 统计分析聚合类（SRS 追溯项）。
- **验收标准**：
  - [ ] aggregate API 模板
  - [ ] PoC API 可归属
- **代码锚点**：`backend/app/governance/catalog/cat02.py`
- **演化建议**：按 plan.md 期次优先级落地
### [CAT-003] CAT-03 地域维度查询类

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：一期
- **描述**：CAT-03 地域维度查询类（SRS 追溯项）。
- **验收标准**：
  - [ ] geo distribution 模板
  - [ ] M7 地域权限
- **代码锚点**：`backend/app/governance/catalog/cat03.py`
- **演化建议**：按 plan.md 期次优先级落地
### [CAT-004] CAT-04 时间序列分析类

- **状态**：部分实现（L1 kickoff r59 · 分类树骨架）
- **goal_ref**：goal.md §2.5（G5）
- **期次**：二期
- **描述**：CAT-04 时间序列分析类（SRS 追溯项）。**r59 按 round-target 交付分类树 L1**（`governance/catalog/classification/`），timeseries 模板留远期。
- **验收标准**：
  - [x] 分类树 CRUD + move + 环检测（r59 L1：`POST/GET/DELETE /api/v1/gov/classification` + move + `CAT_CLASS_*` + MAX_DEPTH=8）
  - [ ] timeseries API 模板
  - [ ] 粒度/同比环比参数
- **代码锚点**：`backend/app/governance/catalog/classification/` · `backend/app/api/v1/gov.py` · `tests/test_meta_cat_dash_conn_design_r59.py` T-CAT-R59-004-01~08
- **演化建议**：r59 L1 闭合分类树 CRUD/move/深度/code 冲突边界；后续补 timeseries API 模板与粒度/同比环比参数（PRD 字面 CAT-04）
- **里程碑对齐**：
### [CAT-005] CAT-05 工单与业务受理类

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：二期
- **描述**：CAT-05 工单与业务受理类（SRS 追溯项）。
- **验收标准**：
  - [ ] tickets stats 模板
  - [ ] 权限绑定工单表
- **代码锚点**：`backend/app/governance/catalog/cat05.py`
- **演化建议**：按 plan.md 期次优先级落地
### [CAT-006] CAT-06 生产与销售统计类

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：二期
- **描述**：CAT-06 生产与销售统计类（SRS 追溯项）。
- **验收标准**：
  - [ ] production stats 模板
  - [ ] 企业域隔离
- **代码锚点**：`backend/app/governance/catalog/cat06.py`
- **演化建议**：按 plan.md 期次优先级落地
### [CAT-007] CAT-07 组织行为审计类

- **状态**：部分实现（L1 kickoff r60）
- **goal_ref**：goal.md §2.5（G5）
- **期次**：三期
- **描述**：CAT-07 组织行为审计类（SRS 追溯项）。
- **验收标准**：
  - [x] workno behavior 模板（r60 L1：`GET /api/v1/workno/behavior` + mock behaviors + `CAT07_*` 错误域 + limit/offset 分页）
  - [ ] 审计日志联动（无真实 audit store 写入与跨系统 trace 链）
- **代码锚点**：`backend/app/governance/catalog/cat07.py` · `backend/app/api/v1/workno.py` · `tests/test_rpt_view_cat_gov_r60.py` T-CAT-R60-007-01~07
- **演化建议**：r60 L1 闭合 workno 查询模板、日期范围/limit 边界与 auditLinked smoke；后续补真实审计日志联动与 fe 行为审计 UI
- **里程碑对齐**：
