# ingestion — 数据同步与清洗

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/ingestion/` |
| PRD | [F16-DATA](../automate/prd/F16-DATA.md) · DATA-* / ETL-001 |
| SRS | FR-DATA · FR-ETL §3.6 |
| 里程碑 | **M1B** |
| 状态 | **已实现** |

## 职责

- 同步任务定义与调度（内联 `SourceConnection` → 托管分析库表）
- 轻量 ETL 规则（写库前清洗）
- 同步运行历史与失败重试

## 边界

| In | Out |
|----|-----|
| 库表级同步、规则表级清洗 | 完整可视化 ETL 设计器（远期） |
| 内联 SourceConnection（M1B L1） | L2 托管库登记 dataSourceId（M3/M4） |
| 托管分析库写入 | BI 查询执行（→ `query`） |
| M1B 手动/定时全量同步 | 连接器插件注册（→ `datasources`，M3+） |

## 依赖

- `core`（配置、日志、调度）
- 托管分析库（`ANALYTICS_DATABASE_URL`，与元库分离）
- 下游：M3/M4 `datasources`（L2 托管库登记为 `dataSourceId`）

## 主要类型 / 入口

| 符号 | 说明 | 状态 |
|------|------|------|
| `ingestion.models` | `SyncJob`、`SyncRun`、`EtlRuleSet`、`SourceConnection` | 已实现 |
| `ingestion.sync_executor` | 同步执行（mysql 源，1 次重试） | 已实现 |
| `ingestion.etl_rules` | 清洗规则引擎 | 已实现 |
| `ingestion.scheduler` | APScheduler 定时触发 | 已实现 |
| `GET/POST /api/v1/ingestion/sync-jobs` | 任务 API | 已实现 |

## 关联 API

见 [api/README.md](../api/README.md) §9 数据接入。
