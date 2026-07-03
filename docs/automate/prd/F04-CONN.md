# F04-CONN 连接器类型

> 模块：连接层 · 8 维评分见 [`../prd.md`](../prd.md)

### [CONN-001] MySQL 连接器

- **状态**：部分实现（L1 kickoff r22）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：MySQL 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`mysql` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [x] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/mysql.py` · `tests/test_datasources_l1.py` T-CONN-M01~M04
- **演化建议**：DS-004 schema 元数据浏览；QUERY 只读查询对接；Admin UI 类型选择
- **里程碑对齐**：
### [CONN-002] PostgreSQL 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：PostgreSQL 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`postgresql` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/postgresql/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-003] MariaDB 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：MariaDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`mariadb` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/mariadb/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-004] SQL Server 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：SQL Server 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`sqlserver` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/sqlserver/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-005] Oracle 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：Oracle 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`oracle` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/oracle/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-006] SQLite 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：SQLite 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`sqlite` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/sqlite/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-007] ClickHouse 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：ClickHouse 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`clickhouse` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`olap` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/clickhouse/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-008] Apache Doris 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：Apache Doris 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`doris` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`olap` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/doris/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-009] StarRocks 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：StarRocks 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`starrocks` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`olap` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/starrocks/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-010] Trino/Presto 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：Trino/Presto 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`trino` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`lake` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/trino/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-011] InfluxDB 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：InfluxDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`influxdb` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`timeseries` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/influxdb/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-012] TDengine 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：TDengine 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`tdengine` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`timeseries` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/tdengine/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-013] TimescaleDB 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：TimescaleDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`timescaledb` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`timeseries` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/timescaledb/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-014] MongoDB 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：MongoDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`mongodb` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`document` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/mongodb/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-015] Elasticsearch 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：Elasticsearch 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`elasticsearch` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`search` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/elasticsearch/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-016] OpenSearch 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：OpenSearch 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`opensearch` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`search` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/opensearch/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-017] 达梦 DM 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：达梦 DM 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`dm` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/dm/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-018] 人大金仓 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：人大金仓 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`kingbase` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/kingbase/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-019] 南大通用 GBase 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：南大通用 GBase 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`gbase` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/gbase/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-020] OceanBase 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：OceanBase 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`oceanbase` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/oceanbase/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-021] TiDB 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：TiDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`tidb` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/tidb/`
- **演化建议**：按 plan.md 期次优先级落地
### [CONN-022] GaussDB 连接器

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：GaussDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [ ] type=`gaussdb` 已注册且 UI 可选
  - [ ] 连通性测试 + schema 浏览 + 只读查询通过
  - [ ] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/gaussdb/`
- **演化建议**：按 plan.md 期次优先级落地
