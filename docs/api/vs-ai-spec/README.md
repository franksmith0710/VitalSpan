# VS-AI-SPEC — 外部 AI 可视化创作规范（v1）

> VitalSpan 混合方案 C：内置图表配置 + 库源码自定义组件（Base 加载）+ 大屏 layout 拼接。  
> 数据绑定由用户在平台手动完成（非 AI 自动生成 SQL）。

**外部 AI 必读**：[00-REQUIREMENTS.md §0](./00-REQUIREMENTS.md#0-对外暴露什么--上传到哪里) · [EXTERNAL-AUTHOR.md](./EXTERNAL-AUTHOR.md)  
**完成标准**：`POST /api/v1/ai-viz/artifacts` 返回 **`artifactId`**。写本地 JSON（含 `output/`）**不算完成**。

## 三条创作路径

| 路径 | AI 产出 | 平台能力 |
|------|---------|----------|
| **L1/L2 配置已有图** | `chartConfig` + `nativeBody.deStyle` / `gisProject` | 50 种 `chartType`（含 `gis-map`）；见 `capability-manifest.json` |
| **L3 全新组件** | HTML 源码 bundle + `manifest.json`（`runtime`: `html` 或 `d3`） | `POST/PUT /api/v1/ai-viz/artifacts` → Base 挂载并注入 `host.vsCv`（含平台 d3）；见 [PROTOCOL.md](./PROTOCOL.md) · [guides/RENDERERS.md](./guides/RENDERERS.md) |
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
| [00-REQUIREMENTS.md](./00-REQUIREMENTS.md) | **规范硬要求**：必须 HTTP POST、合法 bundle、本机上传 |
| [EXTERNAL-AUTHOR.md](./EXTERNAL-AUTHOR.md) | **外部 AI 三步**：validate → upload → artifactId |
| [HANDOFF.md](./HANDOFF.md) | 联调环境占位、curl、误读对照 |
| [CHANGELOG.md](./CHANGELOG.md) | 规范包修订 |
| [PROTOCOL.md](./PROTOCOL.md) | 自定义组件库协议：Base、`vsCv`、html/d3 runtime、PUT 覆盖 |
| [guides/PLATFORM-SLA.md](./guides/PLATFORM-SLA.md) | **平台底座 SLA**：mount、axisPlan、壳层 truncated、入库 lint |
| [guides/CUSTOM-VIZ-STYLE-COMPLIANCE.md](./guides/CUSTOM-VIZ-STYLE-COMPLIANCE.md) | **样式合规**：六块分界、warn 入库、金样与反例 |
| [guides/HTML-RUNTIME.md](./guides/HTML-RUNTIME.md) | html runtime 配置严格清单 |
| [guides/RENDERERS.md](./guides/RENDERERS.md) | 仅 html / d3；ECharts/AntV 不支持 |
| [guides/STYLE-SCHEMA.md](./guides/STYLE-SCHEMA.md) | customViz 可自由声明的样式 schema（颜色/滑块/开关/下拉/分组） |
| [theme-tokens.json](./theme-tokens.json) | 看板/D3 主题 token（推荐对齐内置 chart） |
| [capability-manifest.json](./capability-manifest.json) | chartType + widgetType 能力清单（可 `scripts/export-vs-ai-spec.py` 刷新） |
| [style-vocabulary.json](./style-vocabulary.json) | 已接通 `deStyle` 字段词典 |
| [schemas/](./schemas/) | JSON Schema（见 `schemas/README.md`） |
| [examples/](./examples/) | 黄金样例（`runtime: html` 与 `d3`） |

## 鉴权

`Authorization: Bearer <JWT>`；写操作需 `dashboard:edit`。

## 红线

- 地图仅离线 GeoJSON（GEO-IRON-01 choropleth）；`gis-map` 使用 `nativeBody.gisProject`（`blank` / `china-provinces`），默认禁公网底图与 L3 内嵌
- 自定义 bundle 禁止外链 `<script src>`；样式与逻辑须内联
- `customViz` 不进 `GET /charts/types`（与内置 chartType 分离）
