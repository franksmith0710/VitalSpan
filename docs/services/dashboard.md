# dashboard — 仪表板

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/dashboard/` |
| PRD | [F07-DASH](../automate/prd/F07-DASH.md) · DASH-001 ~ DASH-006 |
| 里程碑 | M5 |
| 状态 | **未实现** |

## 职责

- Dashboard 定义持久化（布局、图表引用、全局筛选）
- 发布/草稿版本、权限与分享范围
- 聚合多图表查询（委托 `query`）

## 边界

| In | Out |
|----|-----|
| Dashboard 领域模型与 API | 单图表查询执行（→ `query`） |
| | 图表类型注册与渲染（前端 + F06-VIZ 契约） |

## 依赖

- `core`、`auth`、`query`

## 主要类型 / 入口（规划）

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `DashboardService` | CRUD + 发布 | DASH-001~003 | 待建 |
| `DashboardViewConfig` | 布局契约 | DASH-004 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §Dashboard。

## 实现笔记

<!-- 随 DASH-* 落地补充 -->
