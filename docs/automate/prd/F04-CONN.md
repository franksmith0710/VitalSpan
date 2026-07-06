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
### [CONN-003] Hive 连接器

- **状态**：部分实现（L1 kickoff r36 + companion 质量推分 r37；hub ID 原标 MariaDB，本轮按设计交付 Hive）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：Apache Hive 湖仓连接器（SRS 追溯项；hub 分片 ID 与方言名历史漂移，r36 设计已对齐）。
- **验收标准**：
  - [x] type=`hive` 已注册（types catalog + `schema_browser` capability，r36 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`HIVE_CONN_REFUSED`/`HIVE_AUTH_FAILED`/`HIVE_TIMEOUT`/`HIVE_UNKNOWN_DATABASE`，r36+r37 mock）
  - [x] schema 空库/未知库边界 + `information_schema` 过滤 + 列元数据 500 limit（r36+r37 mock）
  - [x] HTTP test_connection 失败链 + metadata schemas 502 链（r37）
  - [ ] 只读查询通过
  - [x] category=`lake` 查询模式正确（r36）
- **代码锚点**：`backend/app/datasources/dialects/hive.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r36.py` · `tests/test_connectors_gov_r37.py` T-CONN-R37-003-01~07
- **演化建议**：r37 已闭合 columns limit 与 HTTP API 4xx/502 链；后续补只读查询集成测与 Admin UI 选型；MariaDB 独立连接器待 SRS 回流后新 ID
- **里程碑对齐**：
### [CONN-004] Oracle 连接器

- **状态**：部分实现（L1 kickoff r36 + companion 质量推分 r37；hub ID 原标 SQL Server，本轮按设计交付 Oracle）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：Oracle 关系型连接器（SRS 追溯项；hub 分片 ID 与方言名历史漂移，r36 设计已对齐）。
- **验收标准**：
  - [x] type=`oracle` 已注册（types catalog，r36 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`ORACLE_CONN_REFUSED`/`ORACLE_AUTH_FAILED`/`ORACLE_TIMEOUT`/`ORACLE_UNKNOWN_SERVICE`，r36+r37 mock）
  - [x] schema owner/table 层级 + 系统 owner 过滤 + 列元数据 500 limit（r36+r37 mock）
  - [x] HTTP test_connection 失败链（r37）
  - [ ] 只读查询通过
  - [x] category=`relational` 查询模式正确（r36）
- **代码锚点**：`backend/app/datasources/dialects/oracle.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r36.py` · `tests/test_connectors_gov_r37.py` T-CONN-R37-004-01~07
- **演化建议**：r37 已闭合 SID/service name 边界与 columns limit；后续补只读查询集成测与 UI 选型
- **里程碑对齐**：
### [CONN-005] SQL Server 连接器

- **状态**：部分实现（L1 kickoff r36 + companion 质量推分 r37；hub ID 原标 Oracle，本轮按设计交付 SQL Server）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：SQL Server 关系型连接器（SRS 追溯项；hub 分片 ID 与方言名历史漂移，r36 设计已对齐）。
- **验收标准**：
  - [x] type=`sqlserver` 已注册（types catalog，r36 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`SQLSERVER_CONN_REFUSED`/`SQLSERVER_AUTH_FAILED`/`SQLSERVER_TIMEOUT`/`SQLSERVER_UNKNOWN_DATABASE`/`SQLSERVER_SSL_ERROR`，r36+r37 mock）
  - [x] schema dbo/自定义 schema 边界 + 列元数据 500 limit（r36+r37 mock）
  - [x] TLS `encrypt=false` 选项与 HTTP test_connection 失败链（r37）
  - [ ] 只读查询通过
  - [x] category=`relational` 查询模式正确（r36）
- **代码锚点**：`backend/app/datasources/dialects/sqlserver.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r36.py` · `tests/test_connectors_gov_r37.py` T-CONN-R37-005-01~08
- **演化建议**：r37 已闭合 TLS 选项与 columns limit；后续补只读查询集成测与 UI 选型
- **里程碑对齐**：
### [CONN-006] SQLite 连接器

- **状态**：部分实现（L1 kickoff r40 + companion 质量推分 r41）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：SQLite 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`sqlite` 已注册（types catalog + `schema_browser` capability，r40 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`SQLITE_FILE_NOT_FOUND`/`SQLITE_PATH_TRAVERSAL`/`SQLITE_PERMISSION_DENIED`/`SQLITE_CORRUPT`/`SQLITE_READONLY`，r40+r41 mock）
  - [x] schema 表/列自省 + 列元数据 500 limit（r40+r41 mock）
  - [x] 文件路径穿越与只读库边界守卫（r40+r41 对称）
  - [x] HTTP test_connection 失败链 + metadata tables 400 链（r41）
  - [ ] 只读查询通过
  - [x] category=`embedded` 查询模式正确（r40）
- **代码锚点**：`backend/app/datasources/dialects/sqlite.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r40.py` T-CONN-R40-006-01~07 · `tests/test_connectors_gov_r41.py` T-CONN-R41-006-01~06
- **演化建议**：r41 已闭合 HTTP 链与只读/路径穿越对称守卫；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：
### [CONN-007] ClickHouse 连接器

- **状态**：部分实现（L1 kickoff r36 + companion 质量推分 r37）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：二期
- **描述**：ClickHouse OLAP 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`clickhouse` 已注册（types catalog，r36 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`CLICKHOUSE_CONN_REFUSED`/`CLICKHOUSE_AUTH_FAILED`/`CLICKHOUSE_TIMEOUT`/`CLICKHOUSE_UNKNOWN_DATABASE`，r36+r37 mock）
  - [x] schema 未知 database/table 边界 + 列元数据 500 limit + 宽表 perf 守卫（r36+r37 mock）
  - [x] HTTP test_connection 失败链 + metadata tables 400 链（r37）
  - [ ] 只读查询通过
  - [x] category=`olap` 查询模式正确（r36）
  - [x] `get_sql_dialect(clickhouse)` QUERY-004 回归不回归（r36+r37）
- **代码锚点**：`backend/app/datasources/dialects/clickhouse.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r36.py` · `tests/test_connectors_gov_r37.py` T-CONN-R37-007-01~07
- **演化建议**：r37 已闭合 HTTP/TCP 不可达与宽表 perf；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：
### [CONN-008] Apache Doris 连接器

- **状态**：部分实现（L1 kickoff r36 + companion 质量推分 r37）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：Apache Doris 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`doris` 已注册（types catalog，r36 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`DORIS_CONN_REFUSED`/`DORIS_AUTH_FAILED`/`DORIS_TIMEOUT`/`DORIS_UNKNOWN_DATABASE`，r36+r37 mock）
  - [x] schema 空 catalog/未知表边界 + 列元数据 500 limit（r36+r37 mock）
  - [x] HTTP test_connection 失败链 + metadata tables 400 链（r37）
  - [ ] 只读查询通过
  - [x] category=`olap` 查询模式正确（r36）
- **代码锚点**：`backend/app/datasources/dialects/doris.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r36.py` · `tests/test_connectors_gov_r37.py` T-CONN-R37-008-01~06
- **演化建议**：r37 已对齐 StarRocks columns limit 与 FE/BE 不可达降级；后续补只读查询集成测与 UI 选型
- **里程碑对齐**：
### [CONN-009] StarRocks 连接器

- **状态**：部分实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：StarRocks 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`starrocks` 已注册（types catalog，r34 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`STARROCKS_CONN_REFUSED`/`STARROCKS_AUTH_FAILED`，r34+r35）
  - [x] schema 空 catalog/未知表边界 + 列元数据 500 limit（r35 mock）
  - [ ] 只读查询通过
  - [x] category=`olap` 查询模式正确（r34）
- **代码锚点**：`backend/app/datasources/dialects/starrocks.py` · `tests/test_connectors_gov_r34.py` · `tests/test_connectors_gov_r35.py`
- **演化建议**：r35 闭合 auth/refused 与 columns limit；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：
### [CONN-010] Trino/Presto 连接器

- **状态**：部分实现（L1 kickoff r38 + companion r39）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：Trino/Presto 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`trino` 已注册（types catalog + `schema_browser` capability，r38 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`TRINO_CONN_REFUSED`/`TRINO_UNKNOWN_CATALOG`/`TRINO_AUTH_FAILED`/`TRINO_TIMEOUT`，r38+r39 mock）
  - [x] schema 空 catalog/未知 schema 边界 + columns 500 limit + 多 schema 自省（r38+r39 mock）
  - [x] HTTP test_connection/metadata 4xx 链（r39）
  - [ ] 只读查询通过
  - [x] category=`lake` 查询模式正确（r38）
- **代码锚点**：`backend/app/datasources/dialects/trino.py` · `tests/test_query_meta_conn_r38.py` T-CONN-R38-010-01~06 · `tests/test_query_meta_conn_r39.py` T-CONN-R39-010-01~06
- **演化建议**：r39 闭合 TRINO_* 错误域、columns limit 与 HTTP metadata 链；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：
### [CONN-011] InfluxDB 连接器

- **状态**：部分实现（L1 kickoff r40 + companion 质量推分 r41）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：InfluxDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`influxdb` 已注册（types catalog + `schema_browser` capability，r40 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`INFLUX_CONN_REFUSED`/`INFLUX_AUTH_FAILED`/`INFLUX_TIMEOUT`/`INFLUX_UNKNOWN_BUCKET`/`INFLUX_INVALID_ORG`，r40+r41 mock）
  - [x] schema bucket/measurement 自省 + measurement 500 limit（r40+r41 mock）
  - [x] HTTP test_connection/metadata 4xx 链（r41）
  - [ ] 只读查询通过
  - [x] category=`timeseries` 查询模式正确（r40）
- **代码锚点**：`backend/app/datasources/dialects/influxdb.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r40.py` T-CONN-R40-011-01~07 · `tests/test_connectors_gov_r41.py` T-CONN-R41-011-01~06
- **演化建议**：r41 已闭合 HTTP 链与 fieldKeys/tagKeys 类型枚举；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：
### [CONN-012] TDengine 连接器

- **状态**：部分实现（L1 kickoff r40 + companion 质量推分 r41）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：TDengine 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`tdengine` 已注册（types catalog + `schema_browser` capability，r40 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`TDENGINE_CONN_REFUSED`/`TDENGINE_AUTH_FAILED`/`TDENGINE_TIMEOUT`/`TDENGINE_UNKNOWN_DATABASE`，r40+r41 mock）
  - [x] schema 超级表/子表自省 + 列元数据 500 limit（r40+r41 mock）
  - [x] HTTP test_connection 失败链 + metadata schemas 502 链（r41）
  - [ ] 只读查询通过
  - [x] category=`timeseries` 查询模式正确（r40）
- **代码锚点**：`backend/app/datasources/dialects/tdengine.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r40.py` T-CONN-R40-012-01~07 · `tests/test_connectors_gov_r41.py` T-CONN-R41-012-01~07
- **演化建议**：r41 已闭合 HTTP 502 链与 600 列 limit 回归；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：
### [CONN-013] TimescaleDB 连接器

- **状态**：部分实现（L1 kickoff r40 + companion 质量推分 r41）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：TimescaleDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`timescaledb` 已注册（types catalog + `schema_browser` capability，r40 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`TIMESCALE_CONN_REFUSED`/`TIMESCALE_AUTH_FAILED`/`TIMESCALE_TIMEOUT`/`TIMESCALE_UNKNOWN_DATABASE`/`TIMESCALE_EXTENSION_MISSING`，r40+r41 mock）
  - [x] schema 表自省 + hypertable 标记 + 列元数据 500 limit（r40+r41 mock）
  - [x] HTTP test_connection/metadata 4xx 链（r41）
  - [ ] 只读查询通过
  - [x] category=`timeseries` 查询模式正确（r40）
- **代码锚点**：`backend/app/datasources/dialects/timescaledb.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r40.py` T-CONN-R40-013-01~07 · `tests/test_connectors_gov_r41.py` T-CONN-R41-013-01~07
- **演化建议**：r41 已闭合 HTTP 链与 PG 类型枚举/宽表 limit；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：
### [CONN-014] MongoDB 连接器

- **状态**：部分实现（L1 kickoff r40 + companion 质量推分 r41）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：MongoDB 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`mongodb` 已注册（types catalog + `schema_browser` capability，r40 L1）
  - [ ] UI 可选
  - [x] 连通性测试结构化错误（`MONGODB_CONN_REFUSED`/`MONGODB_AUTH_FAILED`/`MONGODB_TIMEOUT`/`MONGODB_UNKNOWN_DATABASE`/`MONGODB_INVALID_HOST`，r40+r41 mock）
  - [x] schema database/collection 自省 + 字段 500 limit（r40+r41 mock）
  - [x] HTTP test_connection/metadata 4xx 链（r41）
  - [ ] 只读查询通过
  - [x] category=`document` 查询模式正确（r40）
- **代码锚点**：`backend/app/datasources/dialects/mongodb.py` · `backend/app/datasources/dialects/errors.py` · `tests/test_connectors_gov_r40.py` T-CONN-R40-014-01~08 · `tests/test_connectors_gov_r41.py` T-CONN-R41-014-01~07
- **演化建议**：r41 已闭合 HTTP 链、BSON 六类型枚举与 `map_mongodb_error` UNKNOWN_DATABASE；后续补只读查询集成测与 Admin UI 选型
- **里程碑对齐**：
### [CONN-015] Elasticsearch 连接器

- **状态**：部分实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：Elasticsearch 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`elasticsearch` 已注册（types catalog，r34 L1）
  - [ ] UI 可选
  - [x] 连通性测试 + index/mapping schema 浏览（r34+r35 mock）
  - [ ] 只读查询通过
  - [x] category=`search` 查询模式正确（r34）
  - [x] 空 host → `ES_INVALID_HOST` 结构化错误（r34）
  - [x] 多索引 list_schemas、mapping 类型归一、字段 500 limit、`ES_AUTH_FAILED`/`ES_CONNECTION_REFUSED`/`ES_TIMEOUT`（r35）
- **代码锚点**：`backend/app/datasources/dialects/elasticsearch.py` · `tests/test_connectors_gov_r34.py` · `tests/test_connectors_gov_r35.py`
- **演化建议**：r35 闭合 ES 错误域、多索引/mapping 归一与字段 limit；后续补 search 只读查询与 UI
- **里程碑对齐**：
### [CONN-016] OpenSearch 连接器

- **状态**：部分实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：三期
- **描述**：OpenSearch 连接器（SRS 追溯项）。
- **验收标准**：
  - [x] type=`opensearch` 已注册（types catalog + plugin 登记，r49 L1）
  - [ ] UI 可选
  - [x] 连通性测试 + schema 浏览（r49 mock：`test_connection` + `list_columns` 500 limit）
  - [ ] 只读查询通过
  - [x] category=`search` 查询模式正确（r49）
  - [x] 空 host → `OPENSEARCH_INVALID_HOST`；401 → `OPENSEARCH_AUTH_FAILED`（r49）
  - [x] HTTP/空索引边界 companion（r52：`map_opensearch_error` 统一 + 空 indices/properties + HTTP 4xx/502 链 + probe <100ms）
- **代码锚点**：`backend/app/datasources/dialects/opensearch.py` · `tests/test_design_conn_gov_query_r49.py` · `tests/test_design_conn_gov_query_r52.py` T-CONN-R52-016-01~10
- **演化建议**：r52 companion 闭合 HTTP test_connection/metadata 链、空索引边界与字段 truncate；后续补只读查询集成测与 UI 选型
- **里程碑对齐**：
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
