# datasources — 数据源与连接器

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/datasources/` |
| PRD | [F03-DS](../automate/prd/F03-DS.md) · [F04-CONN](../automate/prd/F04-CONN.md) |
| 里程碑 | 连接层（贯穿 M1–M4） |
| 状态 | **已实现（L1 companion r25）** |

## 职责

- 数据源 CRUD、凭证加密存储、连接池生命周期（按 `dataSourceId` 隔离）
- `ConnectorRegistry`：按 `type` 注册方言实现（`dialects/*`）
- 已注册类型发现 API（`GET /datasources/types`）
- 元数据探测（schema/table/column）、连通性测试
- 数据源级 ACL 可见性守卫（对接 `auth/resources` grant）
- 为 `query` 提供按 `dataSourceId` 隔离的执行上下文

## 边界

| In | Out |
|----|-----|
| 连接配置、方言适配、池化、元数据浏览 L1 API | SQL 语义解析与图表绑定（→ `query`） |
| 连接器插件目录 `dialects/`（mysql、postgresql） | Dataset 语义层（四期 → `metadata` + `query`） |
| 数据源列表/详情 ACL 过滤（grant 可见性） | M7 完整 RLS 执行链 |
| 类型发现、schema 浏览 REST API | Admin UI 数据源管理界面 |

## 依赖

- `core`：配置、日志、DB
- `auth/resources`（M2）：`list_visible_resource_ids` / `ensure_resource_visible` 供 ACL 守卫
- 下游 M4 `query`：消费元数据与连接池

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `ConnectorRegistry` | 连接器注册表 | DS-001 | 已实现 |
| `dialects/mysql.py` | MySQL 方言 + schema_browser | CONN-001 | 已实现 |
| `dialects/postgres.py` | PostgreSQL 方言 + schema_browser | CONN-002 | 已实现 |
| `dialects/tidb.py` | TiDB HTAP 方言（MySQL 协议委托，默认 port 4000） | CONN-021 | 已实现 |
| `dialects/starrocks.py` | StarRocks OLAP 方言（MySQL 协议，port 9030，`category=olap`） | CONN-009 | 已实现 |
| `dialects/elasticsearch.py` | Elasticsearch 搜索方言（index→schema 映射） | CONN-015 | 已实现 |
| `dialects/hive.py` | Apache Hive 湖仓方言（HiveServer2，port 10000，`category=lake`） | CONN-003 | 已实现（L1 r36 + companion r37） |
| `dialects/clickhouse.py` | ClickHouse OLAP 方言（HTTP，port 8123，`CLICKHOUSE_MAX_COLUMNS=500`） | CONN-007 | 已实现（L1 r36 + companion r37） |
| `dialects/sqlserver.py` | SQL Server 关系型（pymssql，TLS L1，`category=relational`） | CONN-005 | 已实现（L1 r36 + companion r37） |
| `dialects/doris.py` | Apache Doris OLAP（MySQL 协议委托，port 9030） | CONN-008 | 已实现（L1 r36 + companion r37） |
| `dialects/oracle.py` | Oracle 关系型（oracledb thin，service name，`category=relational`） | CONN-004 | 已实现（L1 r36 + companion r37） |
| `dialects/gaussdb.py` | GaussDB 关系型（psycopg 3 委托 PostgresConnector，`GAUSSDB_*`） | CONN-022 | 已实现 L1 + companion r39 |
| `dialects/dm.py` | 达梦 DM 关系型（dmPython，`DM_*`） | CONN-017 | 已实现 L1 + companion r39 |
| `dialects/trino.py` | Trino 联邦湖仓（trino-python-client，catalog/schema 三级，`category=lake`） | CONN-010 | 已实现 L1 + companion r39 |
| `dialects/mongodb.py` | MongoDB 文档型（pymongo，`category=document`） | CONN-014 | 已实现 L1 r40 + companion r41 |
| `dialects/influxdb.py` | InfluxDB 2.x 时序（influxdb-client，org/bucket 语义映射） | CONN-011 | 已实现 L1 r40 + companion r41 |
| `dialects/tdengine.py` | TDengine 时序（taospy REST，stable 标记） | CONN-012 | 已实现 L1 r40 + companion r41 |
| `dialects/sqlite.py` | SQLite 嵌入式文件源（`host=路径`，路径穿越守卫） | CONN-006 | 已实现 L1 r40 + companion r41 |
| `dialects/timescaledb.py` | TimescaleDB 时序（PG 委托 + hypertable 标记） | CONN-013 | 已实现 L1 r40 + companion r41 |
| `pool.py` | 按 dataSourceId 隔离连接池 | DS-006 | 已实现 |
| `metadata/service.py` | schema/table/column 浏览编排 | DS-004 | 已实现 |
| `acl.py` | 数据源可见性守卫 | DS-008 | 已实现 |
| `DataSourceService` | CRUD + 测试连接 + ACL | DS-001~008 | 已实现（L1 companion） |

## 关联 API

见 [api/README.md](../api/README.md) §数据源。

## 实现笔记

- L1：`data_sources` 表 + CRUD + 凭证 Fernet + 双连通测试端点；首期方言 `mysql`；不含连接池与 schema 浏览。
- r23：`ConnectorRegistry.unregister` + `register_usage_checker` 引用保护；MySQL `dialects/errors.py` 稳定错误码（`MYSQL_*`）；`deleted_at` 软删 L1；列表分页/PATCH；连通性测试进程内 2s 防重 L1（单 worker）；`CredentialDecryptError` 结构化解密失败；test 响应 `traceId`。

### r24 质量推分（2026-07-03）

- **CONN-001**：MySQL `connection_options` 消费 — SSL 三态、charset/collation、connect/read 分层 timeout；`TestConnectionResult.code` 结构化 `MYSQL_*`
- **DS-001**：`ConnectorRegistry` `RLock`；`export_type_catalog()` DS-007 预留形状
- **DS-002**：`connection_options` JSON 列；软删后 `code` 可复用（PostgreSQL 部分唯一索引 + service 层检测）
- **DS-003**：inflight acquire + finally release；测试日志 `datasource_test` + `traceId`
- **DS-005**：`CREDENTIAL_FERNET_KEY_PREVIOUS` 双钥解密占位

### r25 companion kickoff（2026-07-03）

- **CONN-002**：`dialects/postgres.py`（psycopg 3）+ `schema_browser` 协议对称
- **DS-007**：`GET /api/v1/datasources/types`（`displayName` + capabilities）
- **DS-006**：`pool.py` 按 `dataSourceId` 隔离；删除数据源 `evict_pool`
- **DS-004**：`metadata/` schema/table/column 只读 API；502 不泄露密码
- **DS-008**：`acl.py` admin bypass + grant 过滤列表/守卫单条与测试

### r34 connector kickoff（2026-07-04）

- **CONN-021**：`dialects/tidb.py` — MySQL 协议委托；独立 `type=tidb`；默认 port 4000；`category=relational`
- **CONN-009**：`dialects/starrocks.py` — MySQL 协议委托；独立 `type=starrocks`；默认 port 9030；`category=olap`；超时映射 `STARROCKS_*`（与 MySQL `MYSQL_*` 边界分离）
- **CONN-015**：`dialects/elasticsearch.py` — 非 SQL 映射：`list_schemas`→index、`list_tables`→`_doc` 伪表、`list_columns`→mapping 字段；`category=search`

### r35 companion 质量推分（CONN-021/009/015）

- **TiDB**：`test_connection` 返回 `TIDB_TIMEOUT`/`TIDB_CONN_REFUSED`/`TIDB_AUTH_FAILED`/`TIDB_UNKNOWN_DATABASE`；空库 `list_schemas` 与未知表 `list_columns` 返回 `[]`
- **StarRocks**：补全 `STARROCKS_CONN_REFUSED`/`STARROCKS_AUTH_FAILED` pytest；`list_tables(schema="")` 返回 `[]`；`list_columns` 宽表切片 `STARROCKS_MAX_COLUMNS=500`
- **Elasticsearch**：`ES_AUTH_FAILED`/`ES_CONNECTION_REFUSED`/`ES_TIMEOUT`；`list_schemas` 多索引过滤 `.` 前缀；`_normalize_es_type` 映射 BI 类型；`ES_MAX_MAPPING_FIELDS=500`；port 443 使用 https

### r36 connector kickoff（2026-07-04）

- **CONN-003/007/005/008/004**：五方言 L1 — Hive/ClickHouse/SQL Server/Doris/Oracle 注册至 `ConnectorRegistry`；`test_connection` + schema 自省 + `export_type_catalog()` 可见
- **可选依赖**：`pyproject.toml` `[project.optional-dependencies] connectors-ext`（pyhive、pymssql、oracledb、clickhouse-connect）
- **错误码**：`HIVE_*` / `CLICKHOUSE_*` / `SQLSERVER_*` / `DORIS_*` / `ORACLE_*` 结构化失败路径；连通性测试 HTTP 200 + `ok=false` + `code` + `traceId`
- **PRD 对账**：`F04-CONN.md` 验收条款 P5 重评（非 P3）

### r37 companion 质量推分（2026-07-04）

五方言 companion 边界闭合（CONN-003/004/005/007/008）：

| 方言 | 错误域上浮 | 列 limit | 边界闭合 |
|------|-----------|---------|---------|
| Oracle | `errors.map_oracle_error`（含 ORA-12505） | `ORACLE_MAX_COLUMNS=500` | 未知 owner → `[]`；多 owner schema 过滤 SYS/SYSTEM |
| Doris | `errors.map_doris_operational_error`（含 `DORIS_UNKNOWN_DATABASE`） | `DORIS_MAX_COLUMNS=500` | 空用户库 schemas → `[]` |
| SQL Server | `errors.map_sqlserver_operational_error` | `SQLSERVER_MAX_COLUMNS=500` | dbo/自定义 schema；`ssl_mode=disabled` → `encrypt=False` |
| Hive | `errors.map_hive_error` | `HIVE_MAX_COLUMNS=500` | 全空库 schemas → `[]`；unknown database |
| ClickHouse | `errors.map_clickhouse_error` | `CLICKHOUSE_MAX_COLUMNS=500`（r36） | 未知 table columns → `[]` |

- 测试套件：`tests/test_connectors_gov_r37.py`（≥28 条 T-CONN-R37-* / T-REG-R37-*）
- HTTP 契约：test_connection 失败 200 + `ok=false` + `{PREFIX}_*`；metadata 缺参 400 `METADATA_INVALID_REQUEST`；连接失败 502 `METADATA_CONNECTION_FAILED`
- 回归：r36 37/37 + r35 35/35 + r34 15/15 不删旧套件

### r38 connector kickoff（2026-07-04）

| type | display_name | category | driver | 状态 |
|------|--------------|----------|--------|------|
| gaussdb | GaussDB | relational | psycopg 3（PG 兼容委托） | 已实现 L1 |
| dm | 达梦 DM | relational | dmPython | 已实现 L1 |
| trino | Trino | lake | trino-python-client | 已实现 L1 |

- 错误码前缀：`GAUSSDB_*`、`DM_*`、`TRINO_*`
- 可选依赖：`connectors-ext` 增 `dmPython`、`trino`
- 测试套件：`tests/test_query_meta_conn_r38.py`（CONN-010/017/022 段）

### r39 companion 质量推分（2026-07-04）

- **CONN-010 Trino**：`TRINO_*` timeout/auth 全路径 pytest；catalog 空→[]；`TRINO_MAX_COLUMNS=500`；HTTP test + metadata tables 缺 schema 400
- **CONN-022 GaussDB**：`GAUSSDB_MAX_COLUMNS=500`；`GAUSSDB_TIMEOUT`/`GAUSSDB_AUTH_FAILED` HTTP 链；委托 PG schema 过滤
- **CONN-017 DM**：多 owner `list_schemas` 过滤 SYS/SYSDBA；`DM_TIMEOUT`；HTTP test 响应不泄露请求 password；metadata 400 链
- 回归：`test_query_meta_conn_r39.py` ≥30 条 + r38 36/36

### r40 connector kickoff（2026-07-04）

- 五方言 L1 — MongoDB/InfluxDB/TDengine/SQLite/TimescaleDB；`export_type_catalog()` 18 types
- 错误码前缀：`MONGODB_*` / `INFLUX_*` / `TDENGINE_*` / `SQLITE_*` / `TIMESCALE_*`
- 可选依赖：`connectors-ext` 增 pymongo、influxdb-client、taospy
- 测试套件：`tests/test_connectors_gov_r40.py`（≥35 条 T-CONN-R40-* / T-REG-R40-*）
- 回归修复：`test_datasources_l1.py::test_invalid_connector_type` 改用未注册 `couchdb`（CONN-014 注册后 `mongodb` 为合法 type）
- PRD 对账：`F04-CONN.md` 验收条款 P5 重评（非 P3）

### r41 companion 质量推分（2026-07-04）

五方言 companion 边界闭合（CONN-006/011/012/013/014）：

| 方言 | 错误域闭合 | 列 limit | 边界闭合 |
|------|-----------|---------|---------|
| MongoDB | `map_mongodb_error` 补 `MONGODB_UNKNOWN_DATABASE`（code 26 / ns not found） | `MONGODB_MAX_FIELDS=500` | 空库/空 collection → `[]`；BSON 六类型枚举 |
| InfluxDB | `INFLUX_TIMEOUT`/`INFLUX_UNKNOWN_BUCKET` test_connection 全路径 | `INFLUX_MAX_MEASUREMENTS=500` | 空 bucket measurements → `[]`；fieldKeys/tagKeys 类型枚举 |
| TDengine | `TDENGINE_TIMEOUT`/`TDENGINE_UNKNOWN_DATABASE` test_connection 全路径 | `TDENGINE_MAX_COLUMNS=500` | 空库 SHOW 零行 → `[]`；DESCRIBE 类型枚举 |
| SQLite | `SQLITE_READONLY` + `open_connection` 路径穿越对称 | `SQLITE_MAX_COLUMNS=500` | 只读/非法路径/空库边界 |
| TimescaleDB | `TIMESCALE_TIMEOUT`/`TIMESCALE_CONN_REFUSED` test_connection 全路径 | `TIMESCALE_MAX_COLUMNS=500` | 空 schema → `[]`；hypertable 标记保留 r40 |

- 测试套件：`tests/test_connectors_gov_r41.py`（35 条 T-CONN-R41-* / T-REG-R41-*）
- HTTP 契约：test_connection 失败 200 + `ok=false` + `{PREFIX}_*` + `traceId`；metadata tables 缺 schema 400 `METADATA_INVALID_REQUEST`；schemas 连接失败 502 `METADATA_CONNECTION_FAILED`
- 回归：r40 43/43 + r39 33/33 + r37 40/40 + r36 37/37 不删旧套件
- PRD 对账：`F04-CONN.md` CONN-006/011/012/013/014 验收 P5 重评（非 P3）
