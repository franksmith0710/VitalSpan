# ingestion — 数据同步与清洗

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/ingestion/` |
| PRD | [F16-DATA](../automate/prd/F16-DATA.md) · DATA-* / ETL-001 |
| SRS | FR-DATA · FR-ETL §3.6 |
| 里程碑 | **M1B**（M1 完成后） |
| 状态 | **未实现** |

## 职责

- 同步任务定义与调度（源 `dataSourceId` → 托管分析库表）
- 轻量 ETL 规则（写库前清洗）
- 同步运行历史与失败重试

## 边界

| In | Out |
|----|-----|
| 库表级同步、规则表级清洗 | 完整可视化 ETL 设计器（远期） |
| 托管分析库写入 | BI 查询执行（→ `query`） |
| 同步产物注册为 `dataSourceId` | 连接器插件注册（→ `datasources`） |

## 依赖

- `core`（配置、日志、调度）
- `datasources`（源库连接与凭证）
- 下游：`datasources`（托管库作为新数据源）

## 主要类型 / 入口（规划）

| 符号 | 说明 | 状态 |
|------|------|------|
| `ingestion.sync_executor` | 同步执行 | 待建 |
| `ingestion.etl_rules` | 清洗规则 | 待建 |
| `GET/POST /api/v1/ingestion/sync-jobs` | 任务 API | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §9 数据接入。
