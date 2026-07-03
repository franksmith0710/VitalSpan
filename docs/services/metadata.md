# metadata — 元数据与语义层

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/metadata/` |
| PRD | [F11-META](../automate/prd/F11-META.md) · META-001 ~ META-006 |
| 里程碑 | M1（四期 Dataset 语义层） |
| 状态 | **未实现** |

## 职责

- 逻辑数据集（Dataset）定义：表关联、计算字段、指标维度
- 与物理数据源映射；版本与发布状态
- 为 `query` 四期提供语义解析输入
- 资产目录元数据（与 `governance` 协同）

## 边界

| In | Out |
|----|-----|
| Dataset / 语义模型 CRUD | 物理连接与方言（→ `datasources`） |
| 一至三期 | 图表直连查询不走本域 |

## 依赖

- `core`、`datasources`、`auth`

## 被依赖

- `query`（四期）、`governance`、`designer`

## 主要类型 / 入口（规划）

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `DatasetService` | 语义层 CRUD | META-001~003 | 待建 |
| `SemanticResolver` | 逻辑 → 物理 SQL | META-004 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §元数据。

## 实现笔记

<!-- 随 META-* 落地补充 -->
