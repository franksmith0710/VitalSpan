# F04-CONN 连接器类型

> 模块：连接层 · 8 维评分见 [`../prd.md`](../prd.md)

### [CONN-001] MySQL 连接器

- **状态**：已实现（M3 compose 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：MySQL 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`mysql` 已注册且 UI 可选（`ConnectorRegistry` + `DatasourceFormPage`）
  - [x] 连通性测试 + schema 浏览通过（compose r207：`test_connectors_compose_r207.py` T-CONN-R207-M01~M05）
  - [ ] 只读查询通过（QUERY 对接留 companion）
  - [x] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/mysql.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_datasources_l1.py` T-CONN-M01~M04 · `tests/test_datasources_quality_r23.py` T-CONN-M05~M10 · `tests/test_datasources_quality_r24.py` T-CONN-M11~M16 · `tests/test_connectors_compose_r207.py` T-CONN-R207-M01~M05
- **演化建议**：M3 compose 集成已闭合连通性与元数据浏览；后续补只读查询端到端与 P1-SMOKE 出数链
- **里程碑对齐**：M3 · 已完成 · 2026-07-06
### [CONN-002] PostgreSQL 连接器

- **状态**：已实现（M3 compose 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：PostgreSQL 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`postgresql` 已注册且 UI 可选（`ConnectorRegistry` + `DatasourceFormPage`）
  - [x] 连通性测试 + schema 浏览通过（compose r207：`test_connectors_compose_r207.py` T-CONN-R207-P01~P03）
  - [ ] 只读查询通过（QUERY 对接留 companion）
  - [x] category=`relational` 查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/postgres.py` · `backend/app/datasources/dialects/base.py` · `tests/test_datasources_companion_r25.py` T-CONN-P01~P05 · `tests/test_connectors_compose_r207.py` T-CONN-R207-P01~P03
- **演化建议**：M3 compose 集成已闭合连通性与元数据浏览；后续补只读查询端到端与 P1-SMOKE 出数链
- **里程碑对齐**：M3 · 已完成 · 2026-07-06
### [CONN-003] MariaDB / Hive 连接器

- **状态**：已实现（M7 r228 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：MariaDB 关系型（MySQL 协议委托）与 Apache Hive 湖仓连接器（SRS 追溯项；hub 分片 ID 历史漂移，r228 对齐 plan §M7）。
- **验收标准**：
  - [x] type=`mariadb` 已注册（`MariadbConnector` 委托 `MysqlConnector`，r228）
  - [x] type=`hive` 已注册（types catalog + `schema_browser` capability，r36 L1）
  - [ ] UI 可选
  - [x] MariaDB 连通性 + schema 浏览（compose r228：`test_connectors_m7_r228.py` T-CONN-R228-003-02~04；无 compose 分层 skip）
  - [x] Hive 连通性测试结构化错误（`HIVE_CONN_REFUSED`/`HIVE_AUTH_FAILED`/`HIVE_TIMEOUT`/`HIVE_UNKNOWN_DATABASE`，r36+r37 mock + r228 回归）
  - [x] Hive schema 空库/未知库边界 + `information_schema` 过滤 + 列元数据 500 limit（r36+r37 mock）
  - [x] HTTP test_connection 失败链 + metadata schemas 502 链（r37 + MariaDB HTTP r228）
  - [ ] 只读查询通过
  - [x] category=`relational`（mariadb）/ `lake`（hive）查询模式正确
- **代码锚点**：`backend/app/datasources/dialects/mariadb.py` · `backend/app/datasources/dialects/hive.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_m7_r228.py` T-CONN-R228-003-01~06 · `tests/test_connectors_gov_r36.py` · `tests/test_connectors_gov_r37.py` T-CONN-R37-003-01~07
- **演化建议**：M7 r228 已闭合 MariaDB compose 与 Hive 回归；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：M7 · 已完成 · 2026-07-06
### [CONN-004] SQL Server / Oracle 连接器

- **状态**：已实现（M7 r228 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：Oracle 关系型连接器 HTTP 链与凭证脱敏（SRS 追溯项；plan §M7 #2 SQL Server/Oracle 批次 1 以 Oracle 侧闭合）。
- **验收标准**：
  - [x] type=`oracle` 已注册（types catalog，r36 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`ORACLE_CONN_REFUSED`/`ORACLE_AUTH_FAILED`/`ORACLE_TIMEOUT`/`ORACLE_UNKNOWN_SERVICE`，r36+r37 mock + r228 HTTP 链）
  - [x] schema owner/table 层级 + 系统 owner 过滤 + 列元数据 500 limit（r36+r37 mock）
  - [x] HTTP test_connection 失败链 + 响应体无明文 password（r37 + r228 T-CONN-R228-004-03~04）
  - [x] `oracledb>=2.5.0` 驱动依赖声明（r228 T-CONN-R228-004-05）
  - [ ] 只读查询通过
  - [x] category=`relational` 查询模式正确（r36）
- **代码锚点**：`backend/app/datasources/dialects/oracle.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_m7_r228.py` T-CONN-R228-004-01~05 · `tests/test_connectors_gov_r36.py` · `tests/test_connectors_gov_r37.py` T-CONN-R37-004-01~07
- **演化建议**：M7 r228 已闭合 Oracle HTTP 链与凭证脱敏；后续补只读查询集成测与 UI 选型
- **里程碑对齐**：M7 · 已完成 · 2026-07-06
### [CONN-005] Oracle / SQL Server 连接器

- **状态**：已实现（M7 r228 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：Oracle/SQL Server 方言差异（标识符引用、分页、类型映射）与连接池复用（SRS 追溯项；plan §M7 #3）。
- **验收标准**：
  - [x] type=`sqlserver` 已注册（types catalog，r36 L1；与 oracle 无 registry 冲突，r228）
  - [ ] UI 可选
  - [x] `relational_hints.py` 标识符/分页/类型归一化（r228 T-CONN-R228-005-01~05）
  - [x] SQL Server `list_columns` 返回归一化 `data_type`（r228 T-CONN-R228-005-06）
  - [x] 连通性测试结构化错误（`SQLSERVER_*`，r36+r37 mock）
  - [x] schema dbo/自定义 schema 边界 + 列元数据 500 limit（r36+r37 mock）
  - [x] TLS `encrypt=false` 选项与 HTTP test_connection 失败链（r37）
  - [x] `DataSourcePoolManager` 同 dataSourceId 连接复用（r228 T-CONN-R228-005-07）
  - [ ] 只读查询通过
  - [x] category=`relational` 查询模式正确（r36）
- **代码锚点**：`backend/app/datasources/dialects/relational_hints.py` · `backend/app/datasources/dialects/sqlserver.py` · `backend/app/datasources/dialects/oracle.py` · `tests/test_connectors_m7_r228.py` T-CONN-R228-005-01~07 · `tests/test_connectors_gov_r36.py` · `tests/test_connectors_gov_r37.py` T-CONN-R37-005-01~08
- **演化建议**：M7 r228 已闭合方言差异与连接池复用；后续补只读查询集成测与 UI 选型
- **里程碑对齐**：M7 · 已完成 · 2026-07-06
### [CONN-006] SQLite 连接器

- **状态**：已实现（M7 r228 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：SQLite 嵌入式连接器（SRS 追溯项；fixture 文件集成验收）。
- **验收标准**：
  - [x] type=`sqlite` 已注册（types catalog + `schema_browser` capability，r40 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`SQLITE_FILE_NOT_FOUND`/`SQLITE_PATH_TRAVERSAL`/`SQLITE_PERMISSION_DENIED`/`SQLITE_CORRUPT`/`SQLITE_READONLY`，r40+r41 mock + r228 fixture）
  - [x] schema 表/列自省 + 列元数据 500 limit（r40+r41 mock + r228 fixture T-CONN-R228-006-02）
  - [x] 文件路径穿越与只读库边界守卫（r40+r41 对称 + r228 T-CONN-R228-006-03）
  - [x] HTTP metadata tables 链（r41 + r228 T-CONN-R228-006-04）
  - [x] `tests/fixtures/m7/sample.db` fixture 集成（r228 T-CONN-R228-006-01）
  - [ ] 只读查询通过
  - [x] category=`embedded` 查询模式正确（r40）
- **代码锚点**：`backend/app/datasources/dialects/sqlite.py` · `tests/fixtures/m7/sample.db` · `tests/test_connectors_m7_r228.py` T-CONN-R228-006-01~05 · `tests/test_connectors_gov_r40.py` T-CONN-R40-006-01~07 · `tests/test_connectors_gov_r41.py` T-CONN-R41-006-01~06
- **演化建议**：M7 r228 已闭合 fixture 集成与 HTTP metadata 链；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：M7 · 已完成 · 2026-07-06
### [CONN-007] ClickHouse 连接器

- **状态**：已实现（M7 r228 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：ClickHouse OLAP 连接器（SRS 追溯项；compose 可选集成验收）。
- **验收标准**：
  - [x] type=`clickhouse` 已注册（types catalog，r36 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`CLICKHOUSE_CONN_REFUSED`/`CLICKHOUSE_AUTH_FAILED`/`CLICKHOUSE_TIMEOUT`/`CLICKHOUSE_UNKNOWN_DATABASE`，r36+r37 mock）
  - [x] compose 连通性 + schema 浏览（r228 T-CONN-R228-007-01~02；无 compose 分层 skip）
  - [x] schema 未知 database/table 边界 + 列元数据 500 limit + 宽表 perf 守卫（r36+r37 mock + r228 T-CONN-R228-007-03）
  - [x] HTTP test_connection 失败链 + metadata 链（r37 + r228 T-CONN-R228-007-04）
  - [ ] 只读查询通过
  - [x] category=`olap` 查询模式正确（r36）
  - [x] `get_sql_dialect(clickhouse)` QUERY-004 回归不回归（r36+r37 + r228 T-CONN-R228-007-05）
- **代码锚点**：`backend/app/datasources/dialects/clickhouse.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_m7_r228.py` T-CONN-R228-007-01~06 · `tests/test_connectors_gov_r36.py` · `tests/test_connectors_gov_r37.py` T-CONN-R37-007-01~07
- **演化建议**：M7 r228 已闭合 compose 集成与宽表 perf 守卫；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：M7 · 已完成 · 2026-07-06
### [CONN-008] Apache Doris 连接器

- **状态**：已实现（M7 r229 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：Apache Doris 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`doris` 已注册（types catalog，r36 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`DORIS_CONN_REFUSED`/`DORIS_AUTH_FAILED`/`DORIS_TIMEOUT`/`DORIS_UNKNOWN_DATABASE`，r36+r37 mock）
  - [x] compose 连通性 + schema 浏览（r229 T-CONN-R229-008-04；无 compose 分层 skip）
  - [x] schema 空 catalog/未知表边界 + 列元数据 500 limit（r36+r37 mock + r229 T-CONN-R229-008-03）
  - [x] HTTP test_connection 失败链 + metadata tables 链（r37 + r229 T-CONN-R229-008-02~03）
  - [ ] 只读查询通过
  - [x] category=`olap` 查询模式正确（r36）
- **代码锚点**：`backend/app/datasources/dialects/doris.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_m7_r229.py` T-CONN-R229-008-01~04 · `tests/test_connectors_gov_r36.py` · `tests/test_connectors_gov_r37.py` T-CONN-R37-008-01~06
- **演化建议**：M7 r229 已闭合 compose 集成与 HTTP metadata 链；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：M7 · 已完成 · 2026-07-06
### [CONN-009] StarRocks 连接器

- **状态**：已实现（M11 r235 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：StarRocks 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`starrocks` 已注册（types catalog，r34 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`STARROCKS_CONN_REFUSED`/`STARROCKS_AUTH_FAILED`/`STARROCKS_UNKNOWN_DATABASE`，r34+r35+r235）
  - [x] compose 连通性 + schema 浏览（r235 T-CONN-R235-009-05；无 compose 分层 skip）
  - [x] schema 空 catalog/未知表边界 + 列元数据 500 limit（r35 mock + r235 T-CONN-R235-009-03~04）
  - [x] HTTP test_connection 失败链 + metadata tables/columns 链（r235 T-CONN-R235-009-02~03）
  - [ ] 只读查询通过
  - [x] category=`olap` 查询模式正确（r34）
- **代码锚点**：`backend/app/datasources/dialects/starrocks.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r34.py` · `tests/test_connectors_gov_r35.py` · `tests/test_connectors_m11_r235.py` T-CONN-R235-009-01~05
- **演化建议**：M11 r235 已闭合 compose 集成与 `STARROCKS_UNKNOWN_DATABASE` 对称 Doris；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：M11 · 已完成 · 2026-07-07
### [CONN-010] Trino/Presto 连接器

- **状态**：已实现（M11 r235 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：Trino/Presto 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`trino` 与 `presto` 已注册（types catalog + `schema_browser` capability，r38 L1 + r235 presto 别名）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`TRINO_CONN_REFUSED`/`TRINO_UNKNOWN_CATALOG`/`TRINO_AUTH_FAILED`/`TRINO_TIMEOUT`，r38+r39+r235 mock）
  - [x] compose 连通性（r235 T-CONN-R235-010-05；无 compose 分层 skip）
  - [x] schema catalog 自省 + columns 500 limit（r38+r39 mock + r235 T-CONN-R235-010-03）
  - [x] HTTP test_connection/metadata 链 + PrestoConnector 委托 TrinoConnector（r39+r235 T-CONN-R235-010-02~04）
  - [ ] 只读查询通过
  - [x] category=`lake` 查询模式正确（r38）
- **代码锚点**：`backend/app/datasources/dialects/trino.py` · `backend/app/datasources/dialects/presto.py` · `tests/test_query_meta_conn_r38.py` T-CONN-R38-010-01~06 · `tests/test_query_meta_conn_r39.py` T-CONN-R39-010-01~06 · `tests/test_connectors_m11_r235.py` T-CONN-R235-010-01~05
- **演化建议**：M11 r235 已闭合 presto 别名、metadata `catalog=row.database` 与 compose 集成；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：M11 · 已完成 · 2026-07-07
### [CONN-011] InfluxDB 连接器

- **状态**：已实现（M11 r235 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：InfluxDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`influxdb` 已注册（types catalog + `schema_browser` capability，r40 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`INFLUX_CONN_REFUSED`/`INFLUX_AUTH_FAILED`/`INFLUX_TIMEOUT`/`INFLUX_UNKNOWN_BUCKET`/`INFLUX_INVALID_ORG`，r40+r41+r235 mock）
  - [x] schema bucket/measurement 自省 + measurement 500 limit（r40+r41 mock + r235 T-CONN-R235-011-03）
  - [x] HTTP test_connection/metadata 链（r41+r235 T-CONN-R235-011-02~03）
  - [x] InfluxDB 2.x 只读 Flux 探测 `limit(n:1)`（r235 T-CONN-R235-011-04 + 边界文档）
  - [ ] 只读查询通过
  - [x] category=`timeseries` 查询模式正确（r40）
- **代码锚点**：`backend/app/datasources/dialects/influxdb.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r40.py` T-CONN-R40-011-01~07 · `tests/test_connectors_gov_r41.py` T-CONN-R41-011-01~06 · `tests/test_connectors_m11_r235.py` T-CONN-R235-011-01~04
- **演化建议**：M11 r235 已闭合 v2 边界文档、HTTP 链与只读 Flux 探测；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：M11 · 已完成 · 2026-07-07
### [CONN-012] TDengine 连接器

- **状态**：已实现（M11 r235 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：TDengine 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`tdengine` 已注册（types catalog + `schema_browser` capability，r40 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`TDENGINE_CONN_REFUSED`/`TDENGINE_AUTH_FAILED`/`TDENGINE_TIMEOUT`/`TDENGINE_UNKNOWN_DATABASE`/`TDENGINE_DRIVER_MISSING`，r40+r41+r235 mock）
  - [x] compose 连通性（r235 T-CONN-R235-012-05；无 compose 分层 skip）
  - [x] schema 超级表/子表自省 + 列元数据 500 limit（r40+r41 mock + r235 T-CONN-R235-012-03）
  - [x] HTTP test_connection 失败链 + metadata 超级表链（r41+r235 T-CONN-R235-012-02~04）
  - [ ] 只读查询通过
  - [x] category=`timeseries` 查询模式正确（r40）
- **代码锚点**：`backend/app/datasources/dialects/tdengine.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r40.py` T-CONN-R40-012-01~07 · `tests/test_connectors_gov_r41.py` T-CONN-R41-012-01~07 · `tests/test_connectors_m11_r235.py` T-CONN-R235-012-01~05
- **演化建议**：M11 r235 已闭合 compose 集成与 HTTP 超级表 metadata 链；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：M11 · 已完成 · 2026-07-07
### [CONN-013] TimescaleDB 连接器

- **状态**：已实现（M11 r235 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：TimescaleDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`timescaledb` 已注册（types catalog + `schema_browser` capability，r40 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`TIMESCALE_CONN_REFUSED`/`TIMESCALE_AUTH_FAILED`/`TIMESCALE_TIMEOUT`/`TIMESCALE_UNKNOWN_DATABASE`/`TIMESCALE_EXTENSION_MISSING`，r40+r41+r235 mock）
  - [x] compose 连通性（r235 T-CONN-R235-013-05；无 compose 分层 skip）
  - [x] schema 表自省 + hypertable 标记 + 列元数据 500 limit（r40+r41 mock + r235 T-CONN-R235-013-03）
  - [x] HTTP test_connection/metadata 链 + `probe_readonly_sql`（r41+r235 T-CONN-R235-013-02~04）
  - [ ] 只读查询通过
  - [x] category=`timeseries` 查询模式正确（r40）
- **代码锚点**：`backend/app/datasources/dialects/timescaledb.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r40.py` T-CONN-R40-013-01~07 · `tests/test_connectors_gov_r41.py` T-CONN-R41-013-01~07 · `tests/test_connectors_m11_r235.py` T-CONN-R235-013-01~05
- **演化建议**：M11 r235 已闭合 compose 集成、hypertable metadata 与只读 SQL 探测；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：M11 · 已完成 · 2026-07-07
### [CONN-014] MongoDB 连接器

- **状态**：已实现（M11 r236 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：MongoDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`mongodb` 已注册（types catalog + `schema_browser` capability，r40 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`MONGODB_CONN_REFUSED`/`MONGODB_AUTH_FAILED`/`MONGODB_TIMEOUT`/`MONGODB_UNKNOWN_DATABASE`/`MONGODB_INVALID_HOST`，r40+r41 mock）
  - [x] schema database/collection 自省 + 字段 500 limit（r40+r41 mock）
  - [x] HTTP test_connection/metadata 4xx 链（r41）
  - [x] 只读查询通过（r236：`probe_readonly_find` + `execute_native_query` + QUERY-003 native execute mock；`$where` 注入 `QUERY_NATIVE_INJECTION_SUSPECT`）
  - [x] category=`document` 查询模式正确（r40）
- **代码锚点**：`backend/app/datasources/dialects/mongodb.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r40.py` T-CONN-R40-014-01~08 · `tests/test_connectors_gov_r41.py` T-CONN-R41-014-01~07 · `tests/test_m11_batch2_r236.py` T-CONN-R236-014-01~05
- **演化建议**：M11 r236 已闭合 native find 探测与 execute 链；后续补 Admin UI 选型与 compose 集成 E2E
- **里程碑对齐**：M11 · 已完成 · 2026-07-07
### [CONN-015] Elasticsearch 连接器

- **状态**：已实现（M11 r236 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：Elasticsearch 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`elasticsearch` 已注册（types catalog，r34 L1）
  - [ ] UI 可选
  - [x] 连通性测试 + index/mapping schema 浏览（r34+r35 mock）
  - [x] 只读查询通过（r236：`probe_readonly_search` + `execute_native_query` + QUERY-003 native execute；HTTP test 凭证不落响应）
  - [x] category=`search` 查询模式正确（r34）
  - [x] 空 host → `ES_INVALID_HOST` 结构化错误（r34）
  - [x] 多索引 list_schemas、mapping 类型归一、字段 500 limit、`ES_AUTH_FAILED`/`ES_CONNECTION_REFUSED`/`ES_TIMEOUT`（r35）
- **代码锚点**：`backend/app/datasources/dialects/elasticsearch.py` · `tests/test_connectors_gov_r34.py` · `tests/test_connectors_gov_r35.py` · `tests/test_m11_batch2_r236.py` T-CONN-R236-015-01~05
- **演化建议**：M11 r236 已闭合 search 只读探测与 native execute 链；后续补 Admin UI 选型与 compose 集成 E2E
- **里程碑对齐**：M11 · 已完成 · 2026-07-07
### [CONN-016] OpenSearch 连接器

- **状态**：已实现（M11 r236 集成验收）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：OpenSearch 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`opensearch` 已注册（types catalog + plugin 登记，r49 L1）
  - [ ] UI 可选
  - [x] 连通性测试 + schema 浏览（r49 mock：`test_connection` + `list_columns` 500 limit）
  - [x] 只读查询通过（r236：`probe_readonly_search` + `execute_native_query` + `QUERY_TABLE_NOT_FOUND` 映射；与 ES registry 独立）
  - [x] category=`search` 查询模式正确（r49）
  - [x] 空 host → `OPENSEARCH_INVALID_HOST`；401 → `OPENSEARCH_AUTH_FAILED`（r49）
  - [x] HTTP/空索引边界 companion（r52：`map_opensearch_error` 统一 + 空 indices/properties + HTTP 4xx/502 链 + probe <100ms）
- **代码锚点**：`backend/app/datasources/dialects/opensearch.py` · `tests/test_design_conn_gov_query_r49.py` · `tests/test_design_conn_gov_query_r52.py` T-CONN-R52-016-01~10 · `tests/test_m11_batch2_r236.py` T-CONN-R236-016-01~06
- **演化建议**：M11 r236 已闭合 search 只读探测与 native execute 链；后续补 Admin UI 选型与 compose 集成 E2E
- **里程碑对齐**：M11 · 已完成 · 2026-07-07
### [CONN-017] 达梦 DM 连接器

- **状态**：部分实现（L1 kickoff r38 + companion r39）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：达梦 DM 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`dm` 已注册（types catalog，r38 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`DM_AUTH_FAILED`/`DM_CONN_REFUSED`/`DM_UNKNOWN_DATABASE`/`DM_TIMEOUT`，r38+r39 mock）
  - [x] schema 未知 schema 边界 + owner 多 schema + 列类型 smoke（r38+r39 mock）
  - [x] HTTP test_connection 凭证失败链 + 响应无密码泄露（r39）
  - [ ] 只读查询通过
  - [x] category=`relational` 查询模式正确（r38）
- **代码锚点**：`backend/app/datasources/dialects/dm.py` · `tests/test_query_meta_conn_r38.py` T-CONN-R38-017-01~06 · `tests/test_query_meta_conn_r39.py` T-CONN-R39-017-01~06
- **演化建议**：r39 闭合 DM owner 层级、密码脱敏与 HTTP metadata 链；后续补只读查询集成测与 UI 选型
- **里程碑对齐**：
### [CONN-018] 人大金仓 连接器

- **状态**：部分实现（companion r67）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：人大金仓 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`kingbase` 已注册（types catalog + `register_connector_plugin`，r59 L1）
  - [ ] UI 可选
  - [x] 连通性测试（`KINGBASE_AUTH_FAILED`/`KINGBASE_CONN_REFUSED` mock + HTTP draft test-connection + 响应无密码泄露，r59）
  - [x] companion params/probe 边界（r67：缺 host/port=0 → 422 `KINGBASE_INVALID_PARAMS`/`KINGBASE_PORT_OUT_OF_RANGE`；`probe_test_connection_budget_ms` ≤50ms；响应无 password）
  - [x] list_columns 501→500 截断边界（r59）
  - [ ] schema 浏览 + 只读查询集成测通过
  - [x] category=`relational` 查询模式正确（r59 L1）
- **代码锚点**：`backend/app/datasources/dialects/kingbase/` · `tests/test_meta_cat_dash_conn_design_r59.py` T-CONN-R59-018-01~06 · `tests/test_dash_nfr_conn_rpt_r67.py` T-CONN-R67-018-01~06
- **演化建议**：r67 companion 闭合 Kingbase params 校验、test-connection perf probe 与 HTTP 错误链；后续补 UI 选型与只读查询集成测
- **里程碑对齐**：
### [CONN-019] 南大通用 GBase 连接器

- **状态**：部分实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：南大通用 GBase 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`gbase` 已注册（types catalog + `register_connector_plugin`，r46 L1）
  - [ ] UI 可选
  - [x] 连通性测试（`GBASE_AUTH_FAILED`/`GBASE_CONN_REFUSED`/`GBASE_TIMEOUT` mock + HTTP 4xx/502 链，r46 L1 + r51 companion）
  - [x] 空库/列 limit 边界（`list_schemas` 空库 + `list_columns` 501→500 截断，r51 companion）
  - [ ] schema 浏览 + 只读查询集成测通过
  - [x] category=`relational` 查询模式正确（r46 L1）
- **代码锚点**：`backend/app/datasources/dialects/gbase.py` · `tests/test_nfr_gov_conn_r46.py` · `tests/test_nfr_gov_conn_r51.py`
- **演化建议**：r51 companion 闭合 HTTP 错误链与元数据边界；后续补 UI 选型与只读查询集成测
### [CONN-020] OceanBase 连接器

- **状态**：部分实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：OceanBase 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`oceanbase` 已注册且 types catalog 可见（`register_connector_plugin`）
  - [x] 连通性测试 + schema 浏览 L1（MySQL 协议委托，port 2881）
  - [x] category=`relational` 查询模式正确
  - [ ] UI 可选
  - [x] HTTP 4xx/502 错误链 + 空库/列 limit 边界（`OCEANBASE_AUTH_FAILED`/`OCEANBASE_CONN_REFUSED`/`OCEANBASE_TIMEOUT` + list_columns 501→500，r55 companion）
  - [ ] 只读查询集成测通过
- **代码锚点**：`backend/app/datasources/dialects/oceanbase.py` · `tests/test_rpt_gov_meta_conn_r54.py` T-R54-CONN-01~08 · `tests/test_rpt_gov_meta_conn_r55.py` T-CONN-R55-01~09
- **演化建议**：r55 companion 闭合 HTTP test_connection/schemas/tables 4xx/502 链、空库注释、列 limit 与 probe <200ms；后续补 UI 选型与只读查询集成测
### [CONN-021] TiDB 连接器

- **状态**：部分实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：TiDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`tidb` 已注册（types catalog + `schema_browser` capability，r34 L1）
  - [ ] UI 可选
  - [x] 连通性测试（`TIDB_AUTH_FAILED`/`TIDB_CONN_REFUSED`/`TIDB_TIMEOUT`，r34+r35 mock）
  - [x] schema 空库/未知表边界（r35 mock）
  - [ ] 只读查询集成测通过
  - [x] category=`relational` 查询模式正确（r34）
- **代码锚点**：`backend/app/datasources/dialects/tidb.py` · `tests/test_connectors_gov_r34.py` · `tests/test_connectors_gov_r35.py`
- **演化建议**：r35 闭合 TIDB_* 错误域与 schema 边界；后续补只读查询集成测与 UI 选型
- **里程碑对齐**：
### [CONN-022] GaussDB 连接器

- **状态**：部分实现（L1 kickoff r38 + companion r39）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：GaussDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`gaussdb` 已注册（types catalog，r38 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`GAUSSDB_AUTH_FAILED`/`GAUSSDB_CONN_REFUSED`/`GAUSSDB_UNKNOWN_DATABASE`/`GAUSSDB_TIMEOUT`，r38+r39 mock）
  - [x] schema 空库/未知 schema 边界 + columns 500 limit + 多 schema 自省（r38+r39 mock）
  - [x] HTTP test_connection/metadata 4xx 链（r39）
  - [ ] 只读查询通过
  - [x] category=`relational` 查询模式正确（r38）
- **代码锚点**：`backend/app/datasources/dialects/gaussdb.py` · `tests/test_query_meta_conn_r38.py` T-CONN-R38-022-01~07 · `tests/test_query_meta_conn_r39.py` T-CONN-R39-022-01~06
- **演化建议**：r39 闭合 GAUSSDB_* 错误域、columns limit 与 HTTP metadata 链；后续补只读查询集成测与 UI 选型
- **里程碑对齐**：
