# F16-DATA 数据接入与清洗

> 模块：M1B · SRS FR-DATA / FR-ETL · 8 维评分见 [`../prd.md`](../prd.md)

### [DATA-004] 托管分析库与配置项

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：M1B
- **描述**：平台托管分析库（与元库分离）及 `ANALYTICS_DATABASE_URL` 配置。
- **验收标准**：
  - [ ] docker-compose 可启动托管 PostgreSQL（或独立 schema 方案已文档化）
  - [ ] `Settings` 可加载 `ANALYTICS_DATABASE_URL`
- **代码锚点**：`docker-compose.yml` · `backend/app/core/config.py`
- **演化建议**：按 plan.md M1B 执行

### [DATA-001] 同步任务模型与 API

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：M1B
- **描述**：同步任务 CRUD（源 `dataSourceId`、源表、目标表、调度）。
- **验收标准**：
  - [ ] `GET/POST /api/v1/ingestion/sync-jobs` 可用
  - [ ] OpenAPI 可访问
- **代码锚点**：`backend/app/ingestion/` · `backend/app/api/v1/ingestion/`
- **演化建议**：按 plan.md M1B 执行

### [DATA-002] 同步执行器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：M1B
- **描述**：全量/增量同步执行（M1B 可先全量）与定时调度。
- **验收标准**：
  - [ ] 手动 `POST .../run` 可将源表写入托管库
  - [ ] 运行历史含状态与 `traceId` 日志
- **代码锚点**：`backend/app/ingestion/sync_executor.py` · `scheduler.py`
- **演化建议**：按 plan.md M1B 执行

### [ETL-001] 清洗规则引擎（轻量）

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：M1B
- **描述**：JSON 规则：列重命名、类型转换、空值填充、简单过滤。
- **验收标准**：
  - [ ] 规则在写托管库前生效
  - [ ] 脏数据样例经规则后字段符合配置
- **代码锚点**：`backend/app/ingestion/etl_rules.py`
- **演化建议**：按 plan.md M1B 执行

### [DATA-003] Admin 配置台页面

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：M1B
- **描述**：`/admin/ingestion/*` 同步任务与清洗规则配置 UI。
- **验收标准**：
  - [ ] 浏览器可创建任务并手动运行
  - [ ] 可查看运行历史
- **代码锚点**：`fe/src/pages/admin/ingestion/`
- **演化建议**：按 plan.md M1B 执行

### [DATA-005] 端到端验收与文档回写

- **状态**：未实现
- **goal_ref**：goal.md §5（DATA-SMOKE）
- **期次**：M1B
- **描述**：DATA-SMOKE：源库 → 同步+清洗 → 托管库 → `dataSourceId` → SQL 出数。
- **验收标准**：
  - [ ] DATA-SMOKE 用例通过
  - [ ] SRS §3.6、api/README、services/ingestion 状态已回写
- **代码锚点**：`docs/automate/plan.md` M1B
- **演化建议**：M1B 收尾项
