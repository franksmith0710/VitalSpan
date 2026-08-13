# VS-AI-SPEC — 外部 AI 可视化创作规范（v1）

> VitalSpan 混合方案 C：内置图表配置 + 库源码自定义组件（Base 加载）+ 大屏 layout 拼接。  
> 数据绑定由用户在平台手动完成（非 AI 自动生成 SQL）。

## 三条创作路径

| 路径 | AI 产出 | 平台能力 |
|------|---------|----------|
| **L1/L2 配置已有图** | `chartConfig` + `nativeBody.deStyle` | 49 种 `chartType`；见 `capability-manifest.json` |
| **L3 全新组件** | HTML 源码 bundle + `manifest.json` | `POST/PUT /api/v1/ai-viz/artifacts` → 一个 Base（`CustomVizWidget`）异步加载；渲染器 **可选**，见 [guides/RENDERERS.md](./guides/RENDERERS.md) |
| **拼大屏** | `layoutJson` v2（混排 widget） | `PUT /api/v1/dashboards/{id}/editor-save` |

## 推荐工作流

1. 读取 `capability-manifest.json` + `style-vocabulary.json` +（customViz 推荐）`theme-tokens.json`
2. 生成 artifact（图表 / 自定义组件 / 布局）
3. `POST /api/v1/charts/validate`（内置图）或 `POST /api/v1/ai-viz/artifacts`（新组件；更新用 `PUT`）
4. `POST /api/v1/views/validate` 或 `editor-save` 写入看板/大屏
5. 用户在编辑器绑定数据源与字段

## 目录

| 文件 | 说明 |
|------|------|
| [PROTOCOL.md](./PROTOCOL.md) | 自定义组件库协议：Base 加载、可选 `rendererHint`、PUT 覆盖 |
| [guides/RENDERERS.md](./guides/RENDERERS.md) | 渲染器选择索引（不强制） |
| [guides/D3-OPTIONAL.md](./guides/D3-OPTIONAL.md) | 可选 D3 内联开发规范 |
| [theme-tokens.json](./theme-tokens.json) | 看板/D3 主题 token（推荐对齐内置 chart） |
| [capability-manifest.json](./capability-manifest.json) | chartType + widgetType 能力清单（可 `scripts/export-vs-ai-spec.py` 刷新） |
| [style-vocabulary.json](./style-vocabulary.json) | 已接通 `deStyle` 字段词典 |
| [schemas/](./schemas/) | JSON Schema |
| [examples/](./examples/) | 黄金样例（含 vanilla 与 D3 对照 bundle） |

## 鉴权

`Authorization: Bearer <JWT>`；写操作需 `dashboard:edit`。

## 红线

- 地图仅离线中国（GEO-IRON-01）；自定义 bundle 禁止在线瓦片与境外底图
- 自定义 bundle 禁止外链 `<script src>`；样式与逻辑须内联
- `customViz` 不进 `GET /charts/types`（与内置 chartType 分离）
