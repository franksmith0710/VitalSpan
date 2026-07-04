# reports — 报表

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/reports/` |
| PRD | [F08-RPT](../automate/prd/F08-RPT.md) · RPT-001 ~ RPT-007 |
| 里程碑 | M6 / M10 / M12 |
| 状态 | **L1 kickoff 已实现（r53）**：catalog + scheduler REST 骨架 |

## 职责

- 报表模板树 catalog（folder/template 节点 CRUD/move）
- 报表调度 FSM（draft→scheduled→paused/cancelled）
- 导出引擎（PDF/Excel 等）与异步任务（远期）
- 报表实例查询（委托 `query`）

## 边界

| In | Out |
|----|-----|
| `reports/catalog/` 模板树内存 registry + 循环/深度守卫 | 通用查询引擎（→ `query`） |
| `reports/scheduler/` 调度实例 FSM + cron 五段校验 | APScheduler 生产执行器（远期） |
| | 报表引擎真实渲染（RPT-001~003） |
| | 打印排版 UI（前端 `/admin/reports/*`） |

## 依赖

- `core`、`auth`、`query`
- `reports/catalog` → `reports/scheduler`（`catalogNodeId` 引用）

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `catalog/service.py` | 树 CRUD/move；`MAX_CATALOG_DEPTH=8` | RPT-004 | L1 已实现 |
| `scheduler/service.py` | 调度 FSM + cron 校验 | RPT-005 | L1 已实现 |
| `ReportService` | 模板 CRUD | RPT-001~003 | 待建 |
| `ExportEngine` | 导出流水线 | RPT-006~007 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §报表。

## 实现笔记

- r53：`reports/catalog/` + `reports/scheduler/` 内存 registry；API 入口 `backend/app/api/v1/reports/__init__.py`（与 `reports/export.py` IF-03 导出共存，路径 `/reports/catalog` · `/reports/schedules` · `/reports/export` 分离）
- 错误码：`RPT_CATALOG_*`、`RPT_SCHEDULE_*`
