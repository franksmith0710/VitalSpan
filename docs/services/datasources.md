# datasources — 数据源与连接器

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/datasources/` |
| PRD | [F03-DS](../automate/prd/F03-DS.md) · [F04-CONN](../automate/prd/F04-CONN.md) |
| 里程碑 | 连接层（贯穿 M1–M4） |
| 状态 | **骨架**（空包） |

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
| `ConnectorRegistry` | 连接器注册表 | CONN-001 | 待建 |
| `dialects/*` | 各方言实现 | CONN-002~022 | 待建 |
| `DataSourceService` | CRUD + 测试连接 | DS-001~008 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §数据源。

## 实现笔记

<!-- 随 DS-* / CONN-* 落地补充 -->
