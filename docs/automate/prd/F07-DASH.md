# F07-DASH 驾驶舱与主题

> 模块：M5 · 8 维评分见 [`../prd.md`](../prd.md)

### [DASH-001] DashboardView 数据模型

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：DashboardView 数据模型（SRS 追溯项）。
- **验收标准**：
  - [x] 布局+组件列表+全局筛选器
  - [x] 可序列化保存
- **代码锚点**：`backend/app/dashboard/models.py` · `backend/app/dashboard/service.py` · `backend/migrations/versions/0013_dashboards.py`
- **演化建议**：r29 layout 业务校验 DASH_DUPLICATE_WIDGET/DASH_MISSING_CHART_CONFIG 等独立 code（T-DASH-R29-001）；后续可补版本历史与并发乐观锁
- **里程碑对齐**：
### [DASH-002] Dashboard 容器与布局引擎

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：Dashboard 容器与布局引擎（SRS 追溯项）。
- **验收标准**：
  - [x] 空 Dashboard 可创建展示
  - [ ] 网格布局可拖拽
- **代码锚点**：`fe/src/pages/admin/dashboard/` · `fe/src/components/dashboard/`
- **演化建议**：r29 resizeWidget/标题编辑 + 增强空态引导（T-DASH-R29-002）；仍缺 react-grid-layout 拖拽，待后续轮次
- **里程碑对齐**：
### [DASH-003] Dashboard 组件库

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：Dashboard 组件库（SRS 追溯项）。
- **验收标准**：
  - [ ] 地图/热力/KPI/时间轴可插拔
  - [x] 出厂无预装页
- **代码锚点**：`fe/src/components/dashboard/` · `fe/src/components/charts/ChartRenderer.tsx`
- **演化建议**：r29 WidgetPalette 标题/栅格编排 + chart 组件插槽（T-DASH-R29-003）；地图/热力/KPI/时间轴待后续轮次；保持无预装业务页
- **里程碑对齐**：
### [DASH-004] 全局筛选器联动

- **状态**：部分实现（L1 kickoff r61）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：全局筛选器联动（SRS 追溯项）。
- **验收标准**：
  - [x] 联动规则可配置（r61 L1：`POST validate` + `PUT/GET /api/v1/dashboards/{id}/global-filters` + config_store `global_filter_linkage` + `DASH_FILTER_*` + widget 存在性校验 + viewer ACL）
  - [ ] 筛选器驱动组件刷新（缺 fe 全局筛选器 UI 与 widget 刷新链）
- **代码锚点**：`backend/app/dashboard/global_filters/` · `backend/app/api/v1/dashboards.py` · `tests/test_cat_dash_viz_nfr_r61.py` T-DASH-R61-004-01~07
- **演化建议**：r61 L1 闭合 global_filter_linkage validate/save/get、widget 校验与 viewer 403；后续补 fe 筛选器驱动组件刷新与跨 widget 口径联动
- **里程碑对齐**：
### [DASH-005] 实体总览页 FR-6.2

- **状态**：部分实现（companion r66）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：实体总览页 FR-6.2（SRS 追溯项）。
- **验收标准**：
  - [x] 实体总览 config_store validate/save/get（r59 L1：`PUT/GET /api/v1/dashboards/{id}/entity-overview` + `POST validate` + `DASH_OVERVIEW_*` + viewer ACL）
  - [x] 重复 metric 拦截 + theme-analysis 路由不变（r59 回归）
  - [x] companion entityTypeRef/drill widget 校验 + perf probe（r66：非法 entityTypeRef/drill widget 422；viewer save 403；`probe_validate_overview_budget_ms`/`probe_get_overview_budget_ms` ≤50ms）
  - [ ] 统计卡片+详情筛选+下钻（缺 fe 页面）
  - [ ] 跨组件口径一致
- **代码锚点**：`backend/app/dashboard/entity_overview/` · `backend/app/api/v1/dashboards.py` · `tests/test_meta_cat_dash_conn_design_r59.py` T-DASH-R59-005-01~06 · `tests/test_cat_dash_rpt_meta_r66.py` T-DASH-R66-005-01~06
- **演化建议**：r66 companion 闭合 entityTypeRef/drill widget 校验、viewer 403 与 validate/get perf probe；后续补 fe 实体总览页与跨组件口径联动
- **里程碑对齐**：
### [DASH-006] 实体主题分析 FR-4.1

- **状态**：部分实现（companion r58）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：实体主题分析 FR-4.1（SRS 追溯项）。
- **验收标准**：
  - [x] 时间域日/周/月（r53 L1：`POST validate` + `PUT/GET /api/v1/dashboards/theme-analysis` timeGranularity day/week/month + geoBinding 校验）
  - [x] chartViewBindings 联动（r57 companion：`PUT/GET /api/v1/dashboards/{id}/chart-bindings` widget/dimension/chartConfig 校验 + `_link_chart_views` ≤50ms）
  - [x] 同比环比计算链（r58 companion：`POST /api/v1/dashboards/theme-analysis/execute-plan` 四步链 + yoy/mom `compareWindow`；`probe_theme_execute_plan_budget_ms` ≤35ms）
  - [ ] GIS 分布与行政区划下钻（无 fe 页面；geoBinding 仅 schema 校验 + execute-plan geo_check）
- **代码锚点**：`backend/app/dashboard/theme/execute.py` · `backend/app/dashboard/theme/acl.py` · `backend/app/dashboard/theme/service.py` · `backend/app/dashboard/theme/schemas.py` · `backend/app/api/v1/dashboards.py` · `tests/test_dash_rpt_query_nfr_r53.py` T-DASH-R53-006-01~06 · `tests/test_dash_rpt_query_nfr_r57.py` T-DASH-R57-006-01~07 · `tests/test_dash_rpt_r58.py` T-DASH-R58-006-01~12
- **演化建议**：r58 companion 闭合 execute-plan 四步链、yoy/mom compareWindow、theme ACL（`DASH_THEME_FORBIDDEN`）与 semi-real 调度联动；后续补 fe theme-analysis 页面与 GIS 行政区划下钻
- **里程碑对齐**：
