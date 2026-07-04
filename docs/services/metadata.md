# metadata — 元数据与语义层

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/metadata/` |
| PRD | [F11-META](../automate/prd/F11-META.md) · META-001 ~ META-006 |
| 里程碑 | M1（四期 Dataset 语义层） |
| 状态 | **部分（L1）** |

## 职责

- **术语字典**（`glossary/`）：业务术语 code/名称/定义维护（META-001）
- **业务主题树**（`themes/`）：多级主题节点、移动与环检测（META-002）
- **维度字典**（`dimensions/`）：维度 code 与枚举值注册/维护（META-003）
- 逻辑数据集（Dataset）定义：表关联、计算字段、指标维度（四期）
- 与物理数据源映射；版本与发布状态
- 为 `query` 四期提供语义解析输入
- 资产目录元数据（与 `governance` 协同）

## 边界

| In | Out |
|----|-----|
| 术语字典 CRUD、业务主题树 CRUD/move | 物理连接与方言（→ `datasources`） |
| 维度字典 CRUD、枚举值注册/列表/删除 | 物理字段映射（META-001 后续） |
| Dataset / 语义模型 CRUD（四期） | 查询执行（→ `query`） |
| 一至三期 | 图表直连查询不走本域 |
| | M4/M5/M6 统一引用（本轮仅 API 就绪） |
| | Dataset 语义层（META-004） |

## 依赖

- `core`、`datasources`、`auth`

## 被依赖

- `query`（四期）、`governance`、`designer`

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `GlossaryTerm` / `glossary/service` | 术语字典 CRUD | META-001 | L1 已实现 |
| `ThemeNode` / `themes/service` | 主题树 CRUD/move、环检测 | META-002 | L1 已实现 |
| `DimensionDict` / `dimensions/service` | 维度字典 CRUD + 枚举值注册 | META-003 | L1 已实现 |
| `DatasetService` | 语义层 CRUD | META-001~003 | 待建 |
| `SemanticResolver` | 逻辑 → 物理 SQL | META-004 | 待建 |

## 错误码（L1）

| code | 场景 |
|------|------|
| `META_TERM_CODE_CONFLICT` | 术语 code 重复 |
| `META_TERM_NOT_FOUND` | 术语不存在 |
| `META_TERM_IN_USE` | 术语被主题节点引用 |
| `META_THEME_NOT_FOUND` | 主题节点不存在 |
| `META_THEME_PARENT_NOT_FOUND` | 父节点不存在 |
| `META_THEME_CYCLE` | 移动形成环 |
| `META_THEME_HAS_CHILDREN` | 删除含子节点 |
| `META_TERM_INVALID_NAME` | name 仅空白 |
| `META_TERM_INVALID_STATUS` | status 非 active/inactive |
| `META_THEME_MAX_DEPTH` | 主题树深度超过 8 |
| `META_DIM_CODE_CONFLICT` | 维度 code 重复 |
| `META_DIM_NOT_FOUND` | 维度不存在 |
| `META_DIM_INVALID_CODE` | code 空白或非法 |
| `META_DIM_INVALID_NAME` | name 空白 |
| `META_DIM_INVALID_STATUS` | status 非法 |
| `META_DIM_VALUE_CODE_CONFLICT` | 同维度下 value code 重复 |
| `META_DIM_VALUE_NOT_FOUND` | 枚举值不存在 |

常量：`MAX_THEME_DEPTH=8`、`TERM_MAX_TEXT_LENGTH=4000`；migration `0016_dimension_dict.py`（`dimension_dicts` + `dimension_values`）。

## 关联 API

见 [api/README.md](../api/README.md) §7 元数据。

## 实现笔记

- r32：migration 0015（`glossary_terms`、`theme_nodes`）；`backend/app/api/v1/metadata.py` 统一 entry
- r38：migration 0016（`dimension_dicts`、`dimension_values`）；`dimensions/` 域模块 + 8 REST 路由（META-003 L1）
