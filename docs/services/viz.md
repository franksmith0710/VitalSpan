# viz — 图表类型注册与渲染配置契约

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/viz/` |
| PRD | [F06-VIZ](../automate/prd/F06-VIZ.md) · VIZ-003/004/005/006/008 |
| 里程碑 | M9 |
| 状态 | **L1 kickoff (r61)** |

## 职责

- chart-type 注册表：`ChartTypeRegistry` + 9 内置类型（table/line/bar/pie/gauge/map/sankey/funnel/graph）与 catalog 导出
- 样式变体（`style_variant`）与字段规则（`field_rule`）校验的规则真理源
- 引擎无关 render-spec 归一（`build_render_spec`）
- 图表嵌入配置契约（`ChartEmbedConfig` + origin 白名单校验）

## 边界

| In | Out |
|----|-----|
| 类型注册与 catalog、`style_variant`/`field_rule` 校验规则源 | 真实 ECharts 渲染（`fe/`）；**不含**在线地图 |
| 引擎无关 render-spec 归一 | 在线瓦片底图、境外地图、运行时外链 GeoJSON CDN |
| embed origin 白名单/目标唯一性校验 | 图表出数（复用 `query` 链）、嵌入 token 签发与 CSP 响应头 |
| `sdk_portal/` SDK init validate + lifecycle manifest（只读引用 `_ORIGIN_RE`） | npm JS SDK 发布、修改 `embed.py` 校验语义 |

## 依赖

- 上游被 `schemas/chart_view`（函数内惰性 import，避免 shared→domain import-time 反向依赖）与 `api/v1/charts`（entry）消费
- 无下游域依赖

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `ChartTypeSpec` / `FieldRule` | frozen dataclass 类型/字段规则 | VIZ-003 | 已实现（骨架） |
| `ChartTypeRegistry` / `registry` | 类型注册表与单例 | VIZ-003 | 已实现（骨架） |
| `get_spec` / `export_chart_type_catalog` | 查规格 / 导出 catalog | VIZ-003 | 已实现（骨架） |
| `build_render_spec` | render-spec 归一映射 | VIZ-008 | 已实现（骨架） |
| `validate_chart_embed_config` / `ChartEmbedConfig` | 嵌入配置校验与契约 | VIZ-006 | 已实现（骨架） |
| `viz/sdk_portal/` | SDK portal init validate + lifecycle manifest + capabilities | VIZ-007 | L1 已实现 r61 |

## 关联 API

见 [api/README.md](../api/README.md) §图表。

## 错误码

| 码 | 说明 |
|----|------|
| `CHART_INVALID_TYPE` | chartType 未注册 |
| `CHART_INVALID_STYLE_VARIANT` | styleVariant 不属于该类型 |
| `CHART_FIELD_REQUIREMENT` | 维度/度量数量不满足类型字段规则 |
| `EMBED_MISSING_TARGET` | chartId/dashboardId 均缺失 |
| `EMBED_TARGET_CONFLICT` | chartId 与 dashboardId 同存 |
| `EMBED_INVALID_ORIGIN` | allowedOrigins 含非法 origin |
| `EMBED_INVALID` | 嵌入配置结构非法（如 theme 越界） |

## 实现笔记

- r42 L1 kickoff：注册表驱动 `chart_view` 校验；注册 `pie` 后 r28/r30「非法 type」样例改用未注册 `radar`
- **GEO-IRON-01**（ADR-12）：地图仅离线中国 GeoJSON；见 `.cursor/rules/geo-map-offline-china.mdc`
- `schemas/chart_view` 校验查 registry 用函数内惰性 import，`app.viz` 包内为 submodule-only import，无循环依赖

### Companion r63（VIZ-007）

- `viz/sdk_portal/probe.py`：`probe_validate_sdk_budget_ms` / `probe_lifecycle_budget_ms`（50ms 同进程 perf_counter）
- ACL：`VIZ_SDK_TOKEN_REQUIRED`（token 模式缺 embedToken）、`VIZ_SDK_DUPLICATE_ORIGIN`、`VIZ_SDK_FORBIDDEN`（destroy 需 admin/editor）
