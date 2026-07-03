# datasources — 数据源与连接器

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/datasources/` |
| PRD | [F03-DS](../automate/prd/F03-DS.md) · [F04-CONN](../automate/prd/F04-CONN.md) |
| 里程碑 | 连接层（贯穿 M1–M4） |
| 状态 | **已实现（L1）** |

## 职责

- 数据源 CRUD、凭证加密存储、连接池生命周期
- `ConnectorRegistry`：按 `type` 注册方言实现（`dialects/*`）
- 元数据探测（库/表/列）、连通性测试
- 为 `query` 提供按 `dataSourceId` 隔离的执行上下文

## 边界

| In | Out |
|----|-----|
| 连接配置、方言适配、池化 | SQL 语义解析与图表绑定（→ `query`） |
| 连接器插件目录 `dialects/` | Dataset 语义层（四期 → `metadata` + `query`） |

## 依赖

- `core`：配置、日志、DB
- `auth`（二期起）：数据源级权限、凭证访问审计

## 主要类型 / 入口（规划）

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `ConnectorRegistry` | 连接器注册表 | CONN-001 | 已实现 |
| `dialects/mysql.py` | MySQL 方言 | CONN-001 | 已实现 |
| `DataSourceService` | CRUD + 测试连接 | DS-001~008 | 已实现（DS-002/003/005） |

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
