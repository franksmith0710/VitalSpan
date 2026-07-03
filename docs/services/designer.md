# designer — 可视化设计器

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/designer/` |
| PRD | [F12-DESIGN](../automate/prd/F12-DESIGN.md) · DESIGN-001 ~ DESIGN-005 |
| 里程碑 | M2（四期） |
| 状态 | **未实现** |

## 职责

- 图表/Dashboard 设计器服务端契约（保存草稿、校验）
- 与 `metadata` Dataset 的设计态绑定
- 设计资源版本与协作锁（按需）

## 边界

| In | Out |
|----|-----|
| 设计器 API、配置校验 | 画布 UI（前端 Admin） |
| | 运行时查询（→ `query`） |

## 依赖

- `core`、`auth`、`metadata`、`dashboard`（发布衔接）

## 主要类型 / 入口（规划）

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `DesignerService` | 草稿与校验 | DESIGN-001~003 | 待建 |
| `ChartViewConfig` | 图表配置契约（与 `schemas` 共享） | DESIGN-004~005 · F06-VIZ | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §设计器（规划）。

## 实现笔记

<!-- 随 DESIGN-* 落地补充 -->
