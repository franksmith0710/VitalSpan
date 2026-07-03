# F16-DATA 数据接入与清洗

> 模块：M1B · SRS FR-DATA / FR-ETL · 8 维评分见 [`../prd.md`](../prd.md)

### [DATA-004] 托管分析库与配置项

- **状态**：已实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：M1B
- **里程碑对齐**：M1B · 已完成 · 2026-07-03
- **描述**：平台托管分析库（与元库分离）及 `ANALYTICS_DATABASE_URL` 配置。
- **验收标准**：
  - [x] docker-compose 可启动托管 PostgreSQL（或独立 schema 方案已文档化）
  - [x] `Settings` 可加载 `ANALYTICS_DATABASE_URL`
- **代码锚点**：`docker-compose.yml` · `backend/app/core/config.py`
- **演化建议**：`tests/test_ingestion_config.py` T-D04-11~13（pool_pre_ping、analytics_sqlite fixture、sqlite URL 拒绝）；`tests/test_ingestion_models_crypto.py` T-D04-13 Fernet env roundtrip；CI compose 集成 job 跑 L1 e2e（当前 integration marker skip）

### [DATA-001] 同步任务模型与 API

- **状态**：已实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：M1B
- **里程碑对齐**：M1B · 已完成 · 2026-07-03
- **描述**：同步任务 CRUD（内联 `SourceConnection`、源表、目标表、调度）。

**SourceConnection 字段（请求/响应 `source` 对象）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| type | `mysql` \| `postgres` | ✓ | M1B executor 仅 mysql |
| host | string | ✓ | 源库主机 |
| port | int 1–65535 | ✓ | 源库端口 |
| database | string | ✓ | 库名 |
| username | string | ✓ | 用户名 |
| password | string | ✓ | 请求明文；响应 `***` |
| table | string | ✓ | 源表名 |

- **验收标准**：
  - [x] `GET/POST /api/v1/ingestion/sync-jobs` 可用
  - [x] OpenAPI 可访问
- **代码锚点**：`backend/app/ingestion/` · `backend/app/api/v1/ingestion/`
- **演化建议**：`tests/test_ingestion_api.py` T-D01-19~22（OpenAPI snapshot、422 缺 host/table、rules 幂等 PUT、run P95 <0.5s）；补 postgres 源类型 executor 覆盖；OpenAPI 示例与 api/README 持续对齐

### [DATA-002] 同步执行器

- **状态**：已实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：M1B
- **里程碑对齐**：M1B · 已完成 · 2026-07-03
- **描述**：全量/增量同步执行（M1B 可先全量）与定时调度。
- **验收标准**：
  - [x] 手动 `POST .../run` 可将源表写入托管库
  - [x] 运行历史含状态与 `traceId` 日志
- **代码锚点**：`backend/app/ingestion/sync_executor.py` · `scheduler.py`
- **演化建议**：`tests/test_sync_executor.py` T-D02-19~21（全量刷新契约、源超时 failed+traceId、双 job 失败隔离）；`tests/test_scheduler.py` T-D02-22（cron 三次变更重注册）；`tests/test_ingestion_l1_smoke.py` T-L1-07~08 L1 编排 smoke

### [ETL-001] 清洗规则引擎（轻量）

- **状态**：已实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：M1B
- **里程碑对齐**：M1B · 已完成 · 2026-07-03
- **描述**：JSON 规则：列重命名、类型转换、空值填充、简单过滤。
- **验收标准**：
  - [x] 规则在写托管库前生效
  - [x] 脏数据样例经规则后字段符合配置
- **代码锚点**：`backend/app/ingestion/etl_rules.py`
- **演化建议**：`tests/test_etl_rules.py` T-ETL-13~16（6 规则深链 <0.3s、500 noop 不挂起）；`test_ingestion_api` T-ETL-14 rules 非 list 422；`test_sync_executor` T-ETL-15 L1 全规则链写字段；补 executor+rules 组合失败降级场景

### [DATA-003] Admin 配置台页面

- **状态**：已实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：M1B
- **里程碑对齐**：M1B · 已完成 · 2026-07-03
- **描述**：`/admin/ingestion/*` 同步任务与清洗规则配置 UI。
- **验收标准**：
  - [x] 浏览器可创建任务并手动运行
  - [x] 可查看运行历史
- **代码锚点**：`fe/src/pages/admin/ingestion/`
- **演化建议**：`EtlRulesPage` 客户端校验 + handler 防重 guard；`ingestion.smoke.test.tsx` 23 项（T-ING-20~23 空列拦截、history 20 行 <600ms、port 校验、error 语义 token）；二期 Playwright 真浏览器 L1

### [DATA-005] 端到端验收与文档回写

- **状态**：已实现
- **goal_ref**：goal.md §5（DATA-SMOKE）
- **期次**：M1B
- **里程碑对齐**：M1B · 已完成 · 2026-07-03
- **描述**：DATA-SMOKE **L1**：内联 SourceConnection → 同步+清洗 → 托管库目标表；运行历史含 traceId/行数/errorMessage。**L2**（dataSourceId + SQL 出数）见 M3/M4。
- **验收标准**：
  - [x] DATA-SMOKE L1 用例通过（`tests/test_ingestion_e2e.py`）
  - [x] SRS §3.6、api/README §9、services/ingestion 状态已回写
- **代码锚点**：`tests/test_ingestion_e2e.py` · `tests/test_ingestion_l1_smoke.py` · `tests/test_doc_anchors_data.py` · `docs/automate/plan.md` M1B
- **演化建议**：`tests/test_ingestion_l1_smoke.py` T-L1-07~08（`test_l1_data_smoke_orchestrator` L1 编排 + <2.5s）；`tests/test_doc_anchors_data.py` T-D05-10~12 锚点对账
