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
  - [x] **M-DEPTH F-0**：看板列表快速创建向导（`DashboardQuickCreateDialog`：数据源 + Dataset + 首图；字段预填 `suggestChartFields`；2026-07-10）
- **代码锚点**：`backend/app/dashboard/models.py` · `backend/app/dashboard/service.py` · `backend/migrations/versions/0013_dashboards.py` · `fe/src/components/dashboard/DashboardQuickCreateDialog.tsx` · `fe/src/pages/admin/dashboard/DashboardListPage.tsx`
- **演化建议**：r29 layout 业务校验 DASH_DUPLICATE_WIDGET/DASH_MISSING_CHART_CONFIG 等独立 code（T-DASH-R29-001）；后续可补版本历史与并发乐观锁
- **里程碑对齐**：M-DEPTH F-0 · 快速创建 · 2026-07-10
### [DASH-002] Dashboard 容器与布局引擎

- **状态**：已实现（**M-DEPTH F-B 深度 companion 进行中**）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **里程碑对齐**：M-FE-2 · 已完成 · 2026-07-06；M-PRODUCT F-A · 分享页 · 2026-07-08；**M-DEPTH F-B · 当前节 · 2026-07-10**
- **描述**：Dashboard 容器与布局引擎（SRS 追溯项）。当前 widget 以 chart 为主；M-DEPTH 扩展 filter 组件类型。
- **验收标准**：
  - [x] 空 Dashboard 可创建展示
  - [x] 网格布局可拖拽（react-grid-layout + edit/view 切换）
  - [x] 编辑态多选与 12 列吸附（Shift+点击多选、批量删除、`gridSnapUtils` 拖拽吸附；`dashboard.smoke.test.tsx` T-DASH-002-02/04/05）
  - [x] `/admin/dashboards/:id/share` 分享页 + 编辑页分享入口（`DashboardSharePage` · `DashboardEditPage`）
  - [x] **M-DASH-UX F-C**：编辑态稳定性 + 布局级撤销/重做（2026-07-09）
  - [ ] **M-DEPTH F-B**：layout widget 类型扩展 `filter`（兼容旧 layout round-trip；后端 schema + FE `layoutUtils`）
- **代码锚点**：`fe/src/pages/admin/dashboard/` · `fe/src/pages/admin/dashboard/DashboardSharePage.tsx` · `fe/src/components/dashboard/` · `fe/src/components/dashboard/layoutUtils.ts` · `fe/src/components/dashboard/gridLayoutAdapter.ts` · `fe/src/components/dashboard/gridSnapUtils.ts` · `fe/src/components/dashboard/DashboardGrid.tsx` · `backend/app/dashboard/schemas.py` · `fe/src/hooks/useWidgetSelection.ts`
- **演化建议**：M-DEPTH F-B 闭合 filter widget 类型；Playwright E2E 编辑拖拽持久化验收
### [DASH-003] Dashboard 组件库

- **状态**：已实现（M5 DASH-003）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：Dashboard 组件库（SRS 追溯项）。
- **验收标准**：
  - [x] 地图/热力/KPI/时间轴可插拔（M5：`builtin.py` heatmap/kpi/timeline registry + `KpiCard`/heatmap/timeline FE 渲染 + `WidgetPalette` 分组插槽；`test_dash_m5_widgets.py` + `charts.dash003.smoke.test.tsx`）
  - [x] 出厂无预装页
- **代码锚点**：`backend/app/viz/builtin.py` · `fe/src/components/charts/ChartRenderer.tsx` · `fe/src/components/charts/adapters/KpiCard.tsx` · `fe/src/components/dashboard/WidgetPalette.tsx` · `tests/test_dash_m5_widgets.py` · `fe/src/components/charts/charts.dash003.smoke.test.tsx`
- **演化建议**：Playwright E2E 拖拽插拔四类 widget 与真实数据源出数留 companion
- **里程碑对齐**：M5 · 已完成 · 2026-07-06
### [DASH-004] 全局筛选器联动

- **状态**：已实现（M-FE-3 FE + M8 r231 BE execute；**M-DEPTH F-B 深度 companion 进行中**）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：全局筛选器联动（SRS 追溯项）。当前 `GlobalFilterBar` 为纯文本 Input；M-DEPTH 升级控件并支持画布内 filter widget。
- **验收标准**：
  - [x] 联动规则可配置（r61 L1：`POST validate` + `PUT/GET /api/v1/dashboards/{id}/global-filters` + config_store `global_filter_linkage` + `DASH_FILTER_*` + widget 存在性校验 + viewer ACL）
  - [x] companion validate/get perf probe + ACL 边界（r67：非法 dimensionRef/重复 parameterKey 422；enterprise 越权 GET 403、viewer save 403；`probe_validate_linkage_budget_ms`/`probe_get_linkage_budget_ms` ≤50ms）
  - [x] 筛选器驱动组件刷新（M-FE-3：`GlobalFilterBar` + `dashboardFilterUtils` + `useChartExecute` 参数注入；`dashboard-view.smoke.test.tsx` T-DASH-004-01）
  - [x] 编辑页联动规则配置 UI（`LinkageRulesPanel` + PUT global-filters；`dashboard.smoke.test.tsx` T-DASH-004-02/03）
  - [x] BE widget execute 合并 linkage（r231：`sql_parameters.py` + `execute.py` + `_load_linkage_payload`；GET linkage 严格 owner/admin ACL；viewer execute 200；`test_meta_dash_m8_r231.py` T-DASH-R231-004-03~07 + `test_cat_dash_viz_nfr_r61.py` T-DASH-R61-004-04）
  - [x] **M-DASH-UX F-D**：编辑页挂载全局筛选条并可驱动 widget 刷新（2026-07-09）
  - [ ] **M-DEPTH F-B**：筛选器 widget UI（下拉/日期/文本）+ Palette 可拖入（**工具栏查询组件类型选择** DASH-007-02 · 2026-07-13）
  - [ ] **M-DEPTH F-B**：GlobalFilterBar 控件升级（下拉/日期/多选；替纯 Input）
  - [ ] **M-DEPTH F-B**：筛选值驱动关联 chart execute 刷新（与 filter widget / 全局条统一参数注入）
- **代码锚点**：`backend/app/dashboard/global_filters/` · `backend/app/query/sql_parameters.py` · `backend/app/api/v1/dashboards.py` · `fe/src/components/dashboard/GlobalFilterBar.tsx` · `fe/src/components/dashboard/LinkageRulesPanel.tsx` · `fe/src/components/dashboard/dashboardFilterUtils.ts` · `tests/test_meta_dash_m8_r231.py` T-DASH-R231-004-03~07 · `tests/test_cat_dash_viz_nfr_r61.py` T-DASH-R61-004-01~07 · `fe/src/pages/admin/dashboard/dashboard-view.smoke.test.tsx` · `fe/src/pages/admin/dashboard/dashboard.smoke.test.tsx`
- **演化建议**：M-DEPTH F-B 闭合控件与 filter widget；跨 widget 口径联动与 Playwright E2E 留远期
- **里程碑对齐**：M8 · 已完成 · 2026-07-06；**M-DEPTH F-B · 当前节 · 2026-07-10**
### [DASH-005] 实体总览页 FR-6.2

- **状态**：已实现（M8 r232 收官）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：实体总览页 FR-6.2（SRS 追溯项）。
- **验收标准**：
  - [x] 实体总览 config_store validate/save/get（r59 L1：`PUT/GET /api/v1/dashboards/{id}/entity-overview` + `POST validate` + `DASH_OVERVIEW_*` + viewer ACL）
  - [x] 重复 metric 拦截 + theme-analysis 路由不变（r59 回归）
  - [x] companion entityTypeRef/drill widget 校验 + perf probe（r66：非法 entityTypeRef/drill widget 422；viewer save 403；`probe_validate_overview_budget_ms`/`probe_get_overview_budget_ms` ≤50ms）
  - [x] 统计卡片+详情筛选+下钻（r231：`EntityOverviewPage` + `/admin/entities` 导航 + entity-types/physical-tables/entity-overview 数据链；`entities-overview.smoke.test.tsx`）
  - [x] 详情 Sheet + 空态引导 + 权限/下钻/Tab vitest（r232：`useEntityOverview` + `EntityDetailSheet` + 7 用例 smoke；页内 stat count 对齐 physical total）
  - [x] 跨组件口径一致（F-F companion：`metricSource.widgetId` 与 widget `metricKey` 对齐 · `useEntityStatMetrics.ts` · `test_ff_track_d_dash005.py` · `entities-overview.smoke.test.tsx` T-DASH-005-08）
- **代码锚点**：`backend/app/dashboard/entity_overview/` · `backend/app/api/v1/metadata.py` · `fe/src/pages/admin/entities/EntityOverviewPage.tsx` · `fe/src/pages/admin/entities/useEntityOverview.ts` · `fe/src/pages/admin/entities/useEntityStatMetrics.ts` · `fe/src/pages/admin/entities/EntityDetailSheet.tsx` · `fe/src/routes.tsx` · `fe/src/config/nav-manifest.tsx` · `tests/test_meta_cat_dash_conn_design_r59.py` T-DASH-R59-005-01~06 · `tests/test_cat_dash_rpt_meta_r66.py` T-DASH-R66-005-01~06 · `tests/test_ff_track_d_dash005.py` · `fe/src/pages/admin/entities/entities-overview.smoke.test.tsx`
- **演化建议**：r232 收官闭合 M8 实体总览交互与 META-005/006 消费链；跨组件 metricSource 口径联动已闭合；Playwright E2E 留 companion
- **里程碑对齐**：M8 · 已完成 · 2026-07-06
### [DASH-006] 实体主题分析 FR-4.1

- **状态**：已实现（M9 r233）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：实体主题分析 FR-4.1（SRS 追溯项）。
- **验收标准**：
  - [x] 时间域日/周/月（r53 L1：`POST validate` + `PUT/GET /api/v1/dashboards/theme-analysis` timeGranularity day/week/month + geoBinding 校验）
  - [x] chartViewBindings 联动（r57 companion：`PUT/GET /api/v1/dashboards/{id}/chart-bindings` widget/dimension/chartConfig 校验 + `_link_chart_views` ≤50ms）
  - [x] 同比环比计算链（r58 companion：`POST /api/v1/dashboards/theme-analysis/execute-plan` 四步链 + yoy/mom `compareWindow`；`probe_theme_execute_plan_budget_ms` ≤35ms）
  - [x] 维度钻取查询 + FE 配置/分析双 Tab（r233：`POST .../theme-analysis/query` + M8 physical table 解析；`ThemeAnalysisPage` + vitest smoke 4/4）
  - [x] GIS 分布与行政区划下钻（F-F companion：`ThemeGeoMapPanel` + province click drill · `theme-analysis.smoke.test.tsx` geo map）
- **代码锚点**：`backend/app/dashboard/theme/query.py` · `backend/app/dashboard/theme/execute.py` · `backend/app/api/v1/dashboards.py` · `fe/src/pages/admin/themes/ThemeAnalysisPage.tsx` · `fe/src/pages/admin/themes/ThemeGeoMapPanel.tsx` · `fe/src/pages/admin/themes/useThemeAnalysis.ts` · `tests/test_dash_rpt_r58.py` T-DASH-R58-006-01~12 · `tests/test_m9_rpt_theme_r233.py` T-R233-DASH-006-01~06 · `fe/src/pages/admin/themes/theme-analysis.smoke.test.tsx`
- **演化建议**：r233 闭合主题维度钻取 query 链路与 FE 配置/分析页；GIS 地图渲染与行政区划下钻已闭合
- **里程碑对齐**：M9 · 已完成 · 2026-07-06

### [DASH-007] DE 编辑工具栏与扩展 Widget

- **状态**：已实现（Wave 1–6 · 2026-07-13）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：M-DEPTH companion
- **里程碑对齐**：plan `2026-07-13-dashboard-de-toolbar-full.md`
- **描述**：看板编辑页 `CanvasEditToolbar` 对标 DataEase `middle-area`；消除 disabled 占位，扩展 layout widget 类型（text/media/tabs）与复用流程。
- **验收标准**：
  - [x] DASH-007-01：图表 DE 分区选择器（`ChartPickerPopover` + `chartPaletteTaxonomy` · 410px 网格）
  - [x] DASH-007-02：查询组件类型选择（text/select/date/multiselect）插入 filter widget
  - [x] DASH-007-03：富文本 widget（`type: text` + `textConfig`）
  - [x] DASH-007-04：媒体 widget（`type: media` + `mediaConfig`）
  - [x] DASH-007-05：Tab 容器 widget
  - [x] DASH-007-06：跨看板复用组件
  - [x] DASH-007-07：「更多」菜单 ≥2 项可用（样式/外部参数等）
- **代码锚点**：`fe/src/components/dashboard/CanvasEditToolbar.tsx` · `ChartPickerPopover.tsx` · `createLayoutWidget.ts` · `backend/app/dashboard/schemas.py` · `docs/automate/plans/2026-07-13-dashboard-de-toolbar-full.md`
- **演化建议**：Wave 1–6 已交付；Tab 子组件嵌套与媒体上传后端留 companion
