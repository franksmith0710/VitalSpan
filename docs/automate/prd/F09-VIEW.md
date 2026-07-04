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

- **状态**：部分实现（L1 kickoff r60）
- **goal_ref**：goal.md §2.4（G4）
- **期次**：二期
- **描述**：角色默认模板 FR-VIEW-3（SRS 追溯项）。
- **验收标准**：
  - [x] 角色绑定默认 Dashboard/报表（r60 L1：`PUT/GET /api/v1/roles/{id}/default-views` + `resolve_defaults_for_roles`；admin 写/viewer 403 `VIEW_DEFAULT_*`）
  - [ ] 新用户继承（无登录/onboarding 自动应用链；内存 store）
- **代码锚点**：`backend/app/views/role_template.py` · `backend/app/views/store.py` · `backend/app/api/v1/views.py` · `tests/test_rpt_view_cat_gov_r60.py` T-VIEW-R60-002-01~06
- **演化建议**：r60 L1 闭合 role defaults CRUD、dashboard/report 存在性校验与角色优先级解析；后续补新用户继承链、DB 持久化与 fe 默认视图 UI
- **里程碑对齐**：
### [VIEW-003] 用户视图覆盖 FR-VIEW-4

- **状态**：部分实现（L1 kickoff r60）
- **goal_ref**：goal.md §2.4（G4）
- **期次**：三期
- **描述**：用户视图覆盖 FR-VIEW-4（SRS 追溯项）。
- **验收标准**：
  - [x] 用户可保存个人视图（r60 L1：`POST/GET /api/v1/users/me/views` + 409 冲突守卫）
  - [x] 不突破 M7（r60 L1：`maxWidgetCount` bounds + `classificationScope` 校验 + chartRef cycle 映射 `VIEW_OVERRIDE_*`/`VIEW_CHART_REF_CYCLE`）
  - [ ] 完整 M7 RLS/ACL 端到端（无 org 绑定与发布后 RLS 联动）
- **代码锚点**：`backend/app/views/user_override.py` · `backend/app/views/store.py` · `backend/app/api/v1/views.py` · `tests/test_rpt_view_cat_gov_r60.py` T-VIEW-R60-003-01~06
- **演化建议**：r60 L1 闭合 me/views CRUD、bounds/classification 守卫与 r31 validate 语义不变；后续补 M7 全链路 RLS、DB 持久化与 fe 个人视图 UI
- **里程碑对齐**：
