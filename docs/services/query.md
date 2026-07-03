# query — 查询执行

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/query/` |
| PRD | [F05-QUERY](../automate/prd/F05-QUERY.md) · QUERY-001 ~ QUERY-009 |
| 里程碑 | M4（L1 kickoff r26） |
| 状态 | **L1 已实现（r26）** |

## 职责

- 接收 `ExecuteRequest`（sql/table 模式或 bindingId），解析绑定与参数
- 经 `datasources` 获取连接，生成方言 SQL 并执行
- 行级权限（RLS）注入（委托 `auth` 策略）
- 结果集整形、分页、超时与资源限额（NFR）
- 图表直连绑定（`chart_query_bindings`）CRUD 与执行复用

## 边界

| In | Out |
|----|-----|
| 查询编排、执行、结果返回 | 连接器与池（→ `datasources`） |
| M3-LITE 直连 SQL + mode=table | 四期 Dataset 语义层（→ `metadata`） |
| L1 chart_query_bindings CRUD + bindingId 执行 | QUERY-003 native 双路径 |
| 执行前 RLS WHERE 注入 | 图表/Dashboard 持久化（→ `dashboard` / `designer`） |
| | M5 VIZ 渲染 |
| | 完整 Admin 查询设计器 UI |

## 依赖

- `core`、`datasources`
- `auth`：RLS、查询审计、数据源 ACL
- `metadata`（四期）：Dataset 解析

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `QueryExecutor` | 统一执行入口（sql/table） | QUERY-001/002 | 已实现 |
| `ExecuteRequest` / `ExecuteResponse` | Pydantic 契约 | QUERY-001 | 已实现 |
| `ChartQueryBinding` / `binding_service` | 图表直连绑定 CRUD | QUERY-005 | 已实现 |
| `query/dialects` | MySQL/PostgreSQL 方言适配 | QUERY-004 | 已实现 |
| `rls/guard` | 行级过滤注入 | QUERY-006 | 已实现 |

## 关联 API

见 [api/README.md](../api/README.md) §查询。

## 实现笔记

- r26：方言适配器 + 只读守卫 + QueryExecutor + RLS 执行链 + chart_query_bindings 迁移 0011
- 执行链：`assert_visible` → `readonly` → `dialect.wrap_limit` → `apply_rls_to_sql` → `pool_manager`
