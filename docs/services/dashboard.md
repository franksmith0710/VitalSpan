# dashboard — 仪表板

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/dashboard/` |
| PRD | [F07-DASH](../automate/prd/F07-DASH.md) · DASH-001 ~ DASH-006 |
| 里程碑 | M5 |
| 状态 | **L1 已实现**（r28：ORM/迁移/CRUD/layout API + Admin FE 栅格） |

## 职责

- Dashboard 定义持久化（名称、slug、布局 JSON、图表组件引用）
- 布局保存时校验内嵌 `chartConfig`（`ChartViewConfig`）
- 列表/CRUD/layout API（L1）

## 边界

| In | Out |
|----|-----|
| Dashboard 领域模型、`DashboardService`、layout JSON 契约 | 单图表查询执行（→ `query`） |
| layout 内 `chartConfig` 校验（→ `schemas/chart_view`） | 图表类型插件、全局筛选 SQL 注入（远期） |
| | 发布/草稿版本、分享范围（远期 DASH-004+） |
| | GIS 地图生产集成（DASH-006 companion） |

### theme/ 子域（DASH-006 · r53 + r57 + r58 companion）

- **In**：`EntityThemeConfig` schema、validate/save/get、config_store `entity_theme` 持久化；`chartViewBindings` 与 layout chart widget 联动（`_link_chart_views`）；`GET .../chart-bindings`；**r58** `POST .../theme-analysis/execute-plan` 四步链（`theme-plan-v1` + yoy/mom `compareWindow`）；`dashboard/theme/acl.py` 写守卫（`DASH_THEME_FORBIDDEN`）
- **Out**：GIS SDK、主题分析 Admin UI、计算引擎（同比/环比仅配置声明）
- **依赖**：`dashboard/service`（ref 校验 + layout widgets）、`query/config_store`、`schemas/chart_view`
- **错误码**：`DASH_THEME_*`（含 `DASH_THEME_CHART_VIEW_MISMATCH` + `detail.fields`、`DASH_THEME_FORBIDDEN`）、`DASH_NOT_FOUND`、`CONFIG_NOT_FOUND`
- **性能**：`probe_link_chart_views_budget_ms` ≤50ms；`probe_theme_execute_plan_budget_ms` ≤40ms

### entity_overview/ 子域（DASH-005 · r59 L1）

- **In**：`EntityOverviewItem` 契约（statCards/filters/drillTargets）；validate/save/get；`config_store` `entity_overview` 持久化；可选 `catalogEntryId` → `publishStatus` 只读探测
- **Out**：统计卡片真实 query 执行、fe 实体总览页、与 `theme-analysis` 路由交叉
- **依赖**：`dashboard/service`（dashboard 存在性 + `created_by` ACL）、`governance/publish`（publish 探测）、`query/config_store`
- **错误码**：`DASH_OVERVIEW_*`（含 `DASH_OVERVIEW_FORBIDDEN` 非 owner 非 admin）

## 依赖

- `core`、`auth`、`query`（图表组件 FE 经 execute 出数）
- `schemas/chart_view`（`ChartViewConfig` 共享契约）

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `Dashboard` ORM | `dashboards` 表 | DASH-001 | 已实现 |
| `DashboardService` | CRUD + `validate_layout` + `update_layout` | DASH-001~003 | 已实现 |
| `DashboardLayout` | `version`/`widgets`/`globalFilters` JSON | DASH-002 | 已实现 |
| `dashboard/theme/` | 实体主题分析 config（`entity_theme` via config_store）+ chart_view 联动 + execute-plan + ACL | DASH-006 | companion 已实现（r58） |
| `dashboard/entity_overview/` | 实体总览 item validate/save/get + publish 探测 | DASH-005 | L1 已实现 r59 |
| `DashboardViewConfig` | 视图协议 | DASH-004 | 待建 |

## Layout JSON（L1）

```json
{
  "version": 1,
  "widgets": [{
    "id": "<uuid>",
    "type": "chart",
    "title": "…",
    "colSpan": 6,
    "rowSpan": 1,
    "order": 0,
    "chartConfig": { "chartType": "table", "dataSourceId": "…", "mode": "sql", "sql": "…" }
  }],
  "globalFilters": []
}
```

## 关联 API

见 [api/README.md](../api/README.md) §Dashboard 与 §图表配置。

## 实现笔记

- Alembic `0013_dashboards`：`dashboards` 表
- API：`backend/app/api/v1/dashboards.py`
- FE：`fe/src/pages/admin/dashboard/`、`fe/src/components/dashboard/`
