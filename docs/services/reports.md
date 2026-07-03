# reports — 报表

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/reports/` |
| PRD | [F08-RPT](../automate/prd/F08-RPT.md) · RPT-001 ~ RPT-007 |
| 里程碑 | M6 |
| 状态 | **未实现** |

## 职责

- 报表模板、参数、调度与订阅
- 导出引擎（PDF/Excel 等）与异步任务
- 报表实例查询（委托 `query`）

## 边界

| In | Out |
|----|-----|
| 报表领域、调度、导出 | 通用查询引擎（→ `query`） |
| | 打印排版 UI（前端 `/admin/reports/*`） |

## 依赖

- `core`、`auth`、`query`

## 主要类型 / 入口（规划）

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `ReportService` | 模板 CRUD | RPT-001~003 | 待建 |
| `ReportScheduler` | 定时与订阅 | RPT-004~005 | 待建 |
| `ExportEngine` | 导出流水线 | RPT-006~007 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §报表。

## 实现笔记

<!-- 随 RPT-* 落地补充 -->
