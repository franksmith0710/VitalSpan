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
