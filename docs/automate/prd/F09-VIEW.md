# F09-VIEW 用户视图

> 模块：FR-VIEW · 8 维评分见 [`../prd.md`](../prd.md)

### [VIEW-001] DashboardView 视图协议 FR-VIEW-1

- **状态**：部分实现
- **goal_ref**：goal.md §2.4（G4）
- **期次**：一期
- **描述**：DashboardView 视图协议 FR-VIEW-1（SRS 追溯项）。
- **验收标准**：
  - [ ] 全 BI 页面基于 DashboardView
  - [x] DashboardView schema + `POST /api/v1/views/validate`（r30 L1）
  - [x] layout 与 DASH-001~003 互操作（委托 `dashboard.service.validate_layout`）
  - [x] validate 边界：空 widgets、colSpan/order 越界、chartRef 环检测（r31，`VIEW_LAYOUT_BOUNDS`/`VIEW_CHART_REF_CYCLE`）
  - [ ] defaultViewId 持久化与角色默认视图（VIEW-002）
- **代码锚点**：`backend/app/views/schemas.py` · `backend/app/views/validate.py` · `backend/app/api/v1/views.py`
- **演化建议**：r31 闭合 bounds/cycle/空 widgets 与 DASH layout 回归（T-VIEW-R31-001~006）；后续补全 BI 页面统一协议层与 defaultViewId 存储
- **里程碑对齐**：
### [VIEW-002] 角色默认模板 FR-VIEW-3

- **状态**：未实现
- **goal_ref**：goal.md §2.4（G4）
- **期次**：二期
- **描述**：角色默认模板 FR-VIEW-3（SRS 追溯项）。
- **验收标准**：
  - [ ] 角色绑定默认 Dashboard/报表
  - [ ] 新用户继承
- **代码锚点**：`backend/app/views/role_template.py`
- **演化建议**：按 plan.md 期次优先级落地
### [VIEW-003] 用户视图覆盖 FR-VIEW-4

- **状态**：未实现
- **goal_ref**：goal.md §2.4（G4）
- **期次**：三期
- **描述**：用户视图覆盖 FR-VIEW-4（SRS 追溯项）。
- **验收标准**：
  - [ ] 用户可保存个人视图
  - [ ] 不突破 M7
- **代码锚点**：`backend/app/views/user_override.py`
- **演化建议**：按 plan.md 期次优先级落地
