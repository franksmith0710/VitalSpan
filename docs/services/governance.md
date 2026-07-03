# governance — 治理与数据目录

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/governance/` |
| PRD | [F10-GOV](../automate/prd/F10-GOV.md) · [F14-CAT](../automate/prd/F14-CAT.md) |
| 里程碑 | M8 |
| 状态 | **未实现** |

## 职责

- 数据资产目录、血缘与标签（GOV + CAT）
- 查询服务工单 BPM、审批与发布流水线
- 数据交换总线注册与对外服务生命周期（API-00x 协同）
- 与 `metadata` 资产元数据同步

## 边界

| In | Out |
|----|-----|
| 治理流程、目录、总线对接 | 查询执行（→ `query`） |
| | 认证授权（→ `auth`） |

## 依赖

- `core`、`auth`、`metadata`、`query`

## 主要类型 / 入口（规划）

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `CatalogService` | 资产目录 | CAT-001~004 | 待建 |
| `WorkflowService` | 工单 BPM | GOV-001~004 | 待建 |
| `PublishPipeline` | 发布流水线 | GOV-005~006 | 待建 |
| `DataBusAdapter` | 总线注册 | GOV-007~008 · CAT-005~007 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §治理 · §CAT 对外 API。

## 实现笔记

<!-- 随 GOV-* / CAT-* 落地补充 -->
