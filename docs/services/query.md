# query — 查询执行

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/query/` |
| PRD | [F05-QUERY](../automate/prd/F05-QUERY.md) · QUERY-001 ~ QUERY-009 |
| 里程碑 | M3（M3-LITE 起） |
| 状态 | **骨架**（空包） |

## 职责

- 接收 `QueryRequest`（图表/即席），解析绑定与参数
- 经 `datasources` 获取连接，生成方言 SQL 并执行
- 行级权限（RLS）注入（委托 `auth` 策略）
- 结果集整形、分页、超时与资源限额（NFR）

## 边界

| In | Out |
|----|-----|
| 查询编排、执行、结果返回 | 连接器与池（→ `datasources`） |
| M3-LITE 直连 SQL | 四期 Dataset 语义层（→ `metadata`） |
| | 图表/Dashboard 持久化（→ `dashboard` / `designer`） |

## 依赖

- `core`、`datasources`
- `auth`：RLS、查询审计
- `metadata`（四期）：Dataset 解析

## 主要类型 / 入口（规划）

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `QueryExecutor` | 统一执行入口 | QUERY-001 | 待建 |
| `QueryRequest` / `QueryResult` | Pydantic 契约 | QUERY-002 | 待建 |
| `binding` | 图表字段 → SQL 绑定 | QUERY-003~005 | 待建 |
| `rls` | 行级过滤注入 | QUERY-006 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §查询。

## 实现笔记

<!-- 随 QUERY-* 落地补充 -->
