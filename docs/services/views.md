# views — DashboardView 视图协议

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/views/` |
| PRD | [F09-VIEW](../automate/prd/F09-VIEW.md) · VIEW-001 ~ VIEW-003 |
| 里程碑 | FR-VIEW |
| 状态 | **部分（L1）** |

## 职责

- DashboardView 协议 schema 与校验（layout/widgets 与 DASH 互操作）
- `POST /api/v1/views/validate` 校验入口
- 为后续角色默认视图与用户覆盖（VIEW-002/003）奠基

## 边界

| In | Out |
|----|-----|
| DashboardView 序列化、layout 校验、chart 引用检查 | 壳层渲染（前端 `fe/`） |
| | Dashboard CRUD 持久化（→ `dashboard`） |
| | 角色/用户视图解析（VIEW-002/003，M10+） |

## 依赖

- `core`、`dashboard`（`DashboardLayout`）、`schemas/chart_view`

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `DashboardView` | 视图协议 Pydantic 模型 | VIEW-001 | 已实现 |
| `validate_dashboard_view` | 视图校验服务 | VIEW-001 | 已实现 |
| `validate_layout_dict` | layout 校验（dashboard 委托） | VIEW-001 | 已实现 |
| `POST /api/v1/views/validate` | HTTP 校验入口 | VIEW-001 | 已实现 |

## 关联 API

见 [api/README.md](../api/README.md) §视图。

## 实现笔记

- r30 L1：`views.validate` 在 dashboard layout 规则之上增加 `VIEW_UNKNOWN_CHART_REF`、`VIEW_DEFAULT_SELF_REF`
- r31：`VIEW_LAYOUT_BOUNDS`（colSpan/rowSpan/widgets 越界）、`VIEW_CHART_REF_CYCLE`（chartRef/chartId 循环引用）
- `dashboard.service.validate_layout` 委托 `views.validate.validate_layout_dict`

## 错误码

| 码 | 说明 |
|----|------|
| `VIEW_INVALID_LAYOUT` | 通用 layout 校验失败 |
| `VIEW_LAYOUT_BOUNDS` | colSpan/rowSpan/widgets 越界 |
| `VIEW_UNKNOWN_CHART_REF` | chartRef 或 chartId 引用未知 widget |
| `VIEW_CHART_REF_CYCLE` | chartRef/chartId 循环引用 |
| `VIEW_DEFAULT_SELF_REF` | defaultViewId 等于自身 id |
