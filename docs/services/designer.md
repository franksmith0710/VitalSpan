# designer — 可视化设计器

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/designer/` |
| PRD | [F12-DESIGN](../automate/prd/F12-DESIGN.md) · DESIGN-001 ~ DESIGN-005 |
| 里程碑 | M2（四期） |
| 状态 | **部分（L1）** |

## 职责

- **查询条件配置**（DESIGN-001）：字段/操作符/值类型校验与持久化
- **运算规则维护**（DESIGN-002）：表达式白名单、依赖环检测与持久化
- 图表/Dashboard 设计器服务端契约（保存草稿、校验）
- 与 `metadata` Dataset 的设计态绑定（四期）
- 设计资源版本与协作锁（按需）

## 边界

| In | Out |
|----|-----|
| 查询条件/运算规则 schema 校验与 API | 画布 UI（前端 Admin） |
| 配置持久化委托 `query/config_store` | 运行时查询（→ `query`） |

## 依赖

- `core`、`auth`
- `query/config_store`（QUERY-007）：`query_conditions` / `compute_rules` 类型存储
- `metadata`、`dashboard`（发布衔接，四期）

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `QueryConditionsConfig` | 查询条件 schema v1.0 | DESIGN-001 | L1 已实现 |
| `ComputeRulesConfig` | 运算规则 schema v1.0 | DESIGN-002 | L1 已实现 |
| `designer/service` | 校验 + 委托 config_store | DESIGN-001/002 | L1 已实现 |
| `DesignerService` | 草稿与校验（全量） | DESIGN-001~003 | 待建 |
| `ChartViewConfig` | 图表配置契约（与 `schemas` 共享） | DESIGN-004~005 · F06-VIZ | 待建 |

## 错误码（L1）

| code | 场景 |
|------|------|
| `DESIGN_EMPTY_CONDITIONS` | 条件列表为空 |
| `DESIGN_INVALID_OPERATOR` | 未知操作符 |
| `DESIGN_VALUE_TYPE_MISMATCH` | 值与 valueType 不匹配 |
| `DESIGN_INVALID_EXPRESSION` | 表达式不在白名单 |
| `DESIGN_RULE_CYCLE` | 规则 dependsOn 成环 |
| `DESIGN_UNKNOWN_FIELD` | 未知 fieldId（不在注册表） |
| `DESIGN_INVALID_CROSS_FIELD` | 跨字段/自引用 value |
| `DESIGN_RULE_TYPE_MISMATCH` | ruleType 与 expression 不一致 |
| `DESIGN_RULE_BROKEN_CHAIN` | dependsOn 引用未知规则 id |
| `DESIGN_INVALID_AGGREGATE` | 非法聚合函数（如 median） |
| `DESIGN_UNKNOWN_TARGET_FIELD` | targetField 不在注册表 |

## 字段注册表（L1 stub）

`DESIGNER_FIELD_REGISTRY`：`order_amount`、`order_date`、`customer_id`、`status`、`region_code`（及 r32 兼容 `amount`、`x`、`y`）。

## 关联 API

见 [api/README.md](../api/README.md) §4 查询配置与 §设计器。

## 实现笔记

- r32：`backend/app/api/v1/designer.py`；持久化 type=`query_conditions`|`compute_rules` 经 QUERY-007
