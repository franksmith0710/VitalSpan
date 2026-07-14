# dashboard — 仪表板

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/dashboard/` |
| PRD | [F07-DASH](../automate/prd/F07-DASH.md) · DASH-001 ~ DASH-006 |
| 里程碑 | M5 |
| 状态 | **已实现**（v1 栅格 + v2 像素布局；真实浏览器 Pointer QA 待执行） |

## 职责

- Dashboard 定义持久化（名称、slug、布局 JSON、图表组件引用）
- 布局保存时校验内嵌 `chartConfig`（`ChartViewConfig`）
- Dashboard 列表、生命周期与布局持久化用例
- v1 栅格 / v2 像素布局的版本校验、边界校验与确定性迁移

## 边界

| In | Out |
|----|-----|
| Dashboard 领域模型、`DashboardService`、layout JSON 领域契约 | 单图表查询执行（→ `query`） |
| layout 内 `chartConfig` 校验（→ `schemas/chart_view`） | 图表类型插件、全局筛选 SQL 注入（远期） |
| v1→v2 纯迁移与双版本持久化完整性 | 浏览器 Pointer 事件编排（→ `fe/components/dashboard/pixelCanvas`） |
| | 发布/草稿版本、分享范围（远期 companion） |
| | GIS 地图生产集成（DASH-006 companion） |

### theme/ 子域（DASH-006 · r53 + r57 + r58 companion）

- **In**：`EntityThemeConfig` schema、validate/save/get、config_store `entity_theme` 持久化；`chartViewBindings` 与 layout chart widget 联动（`_link_chart_views`）；`GET .../chart-bindings`；**r58** `POST .../theme-analysis/execute-plan` 四步链（`theme-plan-v1` + yoy/mom `compareWindow`）；**r233** `POST .../theme-analysis/query` 维度钻取（`theme/query.py` → `metadata.physical` + `engine/execute`）；`dashboard/theme/acl.py` 写守卫（`DASH_THEME_FORBIDDEN`）
- **Out**：GIS SDK、计算引擎（同比/环比仅配置声明）
- **FE**：`fe/src/pages/admin/themes/ThemeAnalysisPage.tsx`（配置/分析 Tabs；DASH-006 r233）
- **依赖**：`dashboard/service`（ref 校验 + layout widgets）、`query/config_store`、`schemas/chart_view`
- **错误码**：`DASH_THEME_*`（含 `DASH_THEME_CHART_VIEW_MISMATCH` + `detail.fields`、`DASH_THEME_FORBIDDEN`）、`DASH_NOT_FOUND`、`CONFIG_NOT_FOUND`
- **性能**：`probe_link_chart_views_budget_ms` ≤50ms；`probe_theme_execute_plan_budget_ms` ≤40ms

### global_filters/ 子域（DASH-004 · r61 L1 + r67 companion）

- **In**：`GlobalFilterLinkageItem` 契约（filters/linkageRules/refreshMode）；validate/save/get；`config_store` `ref_type=global_filter_linkage` 持久化；layout widget 绑定探测（`affectedWidgetCount`）
- **Out**：fe 全局筛选器 UI、SQL 注入执行、与 `entity_overview/` / `theme/` 路由交叉
- **依赖**：`dashboard/service`（dashboard 存在性 + layout widgets + `created_by` ACL）、`query/config_store`
- **错误码**：`DASH_FILTER_*`（含 `DASH_FILTER_FORBIDDEN` 非 owner 非 admin；**r67** `DASH_FILTER_INVALID_DIMENSION_REF` / `DASH_FILTER_DUPLICATE_PARAMETER_KEY`）
- **r67 companion**：`set_user_filter_dashboard_scope` + viewer 禁写 + enterprise dashboard scope；`probe_validate_linkage_budget_ms` / `probe_get_linkage_budget_ms` ≤50ms

### M8 r231 kickoff（DASH-004 · 2026-07-06）

- **`global_filters/execute.py`**：`execute_widget_with_filters` — `_load_linkage_payload`（无 actor ACL）+ linkage merge + `query/sql_parameters.inject_sql_parameters`（与 FE `dashboardFilterUtils` 对称）
- **`query/sql_parameters.py`**：`inject_sql_parameters` / `build_widget_filter_params`；`POST /dashboards/{id}/widgets/{widgetId}/execute`
- **ACL 拆分**：管理 API `get_linkage` 严格 owner/admin（非 owner viewer → 403 `DASH_FILTER_FORBIDDEN`）；execute 消费链经 `_load_linkage_payload` 允许 viewer 执行已配置 linkage
- 测试锚点：`tests/test_meta_dash_m8_r231.py` T-DASH-R231-004-*

### entity_overview/ 子域（DASH-005 · r59 L1）

- **In**：`EntityOverviewItem` 契约（statCards/filters/drillTargets）；validate/save/get；`config_store` `entity_overview` 持久化；可选 `catalogEntryId` → `publishStatus` 只读探测
- **Out**：统计卡片真实 query 执行、fe 实体总览页、与 `theme-analysis` 路由交叉
- **依赖**：`dashboard/service`（dashboard 存在性 + `created_by` ACL）、`governance/publish`（publish 探测）、`query/config_store`
- **错误码**：`DASH_OVERVIEW_*`（含 `DASH_OVERVIEW_FORBIDDEN` 非 owner 非 admin；**r66** `DASH_OVERVIEW_INVALID_ENTITY_TYPE` / `DASH_OVERVIEW_INVALID_DRILL_WIDGET`）
- **r66 companion**：`entityTypeRef` pattern `^[a-z][a-z0-9_]{1,63}$`；layout 含 widget 时 drill `widgetId` 须存在于 layout；`probe_validate_overview_budget_ms` / `probe_get_overview_budget_ms` ≤50ms
- **FE 消费**：`fe/src/pages/admin/entities/EntityOverviewPage.tsx` + `useEntityOverview.ts` + `EntityDetailSheet.tsx`（DASH-005 M8 r232 收官：详情 Sheet、空态引导、权限/下钻 vitest）

## 依赖

- `core`、`auth`、`query`（图表组件 FE 经 execute 出数）
- `schemas/chart_view`（`ChartViewConfig` 共享契约）

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `Dashboard` ORM | `dashboards` 表 | DASH-001 | 已实现 |
| `DashboardService` | CRUD + `validate_layout` + `update_layout` | DASH-001~003 | 已实现 |
| `DashboardLayout` | v1 栅格 / v2 像素判别契约；保留 `widgets`/`globalFilters` 公共语义 | DASH-002 | 已实现 |
| `migrate_v1_to_v2` | 12 列栅格到 1440px 规范画布的纯迁移 | DASH-002 | 已实现 |
| `dashboard/theme/` | 实体主题分析 config（`entity_theme` via config_store）+ chart_view 联动 + execute-plan + drill query + ACL | DASH-006 | M3-LITE 已实现（r233） |
| `dashboard/global_filters/` | 全局筛选联动 validate/save/get + widget 绑定 + ACL/probe | DASH-004 | companion 已实现 r67 |
| `dashboard/entity_overview/` | 实体总览 item validate/save/get + publish 探测 | DASH-005 | L1 已实现 r59 |
| `DashboardViewConfig` | 视图协议 | DASH-004 | 待建 |

## Layout 领域契约

- **v1 栅格**：组件几何由 `colSpan/rowSpan/gridX/gridY` 表达；保留用于历史数据与紧急回退。
- **v2 像素**：规范画布宽 1440px，组件几何由 `x/y/width/height` 表达；矩形必须完整位于画布内。
- 两个版本共享组件标识、类型、内容配置、顺序、全局筛选和样式语义；禁止在同一版本中混用另一版几何字段。
- DashboardView 外层协议可承载任一布局版本，不改变或降级布局几何。

## 关联 API

见 [api/README.md](../api/README.md) §Dashboard 与 §图表配置。

## 实现笔记

- Alembic `0013_dashboards`：`dashboards` 表
- API：`backend/app/api/v1/dashboards.py`
- FE：`fe/src/pages/admin/dashboard/`、`fe/src/components/dashboard/`
- **组件标题（DASH-008-06）**：`LayoutWidget.title` 布局持久化；图表样式扩展 `chartConfig.nativeBody.deStyle.title|remark`（FE `chartDeStyle.ts` · 顶栏 `WidgetShapeChrome`）；设计见 `docs/superpowers/specs/2026-07-14-dashboard-widget-title-chrome-de.md`
