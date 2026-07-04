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

## 依赖

- `core`、`auth`、`query`（图表组件 FE 经 execute 出数）
- `schemas/chart_view`（`ChartViewConfig` 共享契约）

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `Dashboard` ORM | `dashboards` 表 | DASH-001 | 已实现 |
| `DashboardService` | CRUD + `validate_layout` + `update_layout` | DASH-001~003 | 已实现 |
| `DashboardLayout` | `version`/`widgets`/`globalFilters` JSON | DASH-002 | 已实现 |
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
