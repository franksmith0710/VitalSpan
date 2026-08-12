# Custom Viz 可选 D3 开发规范

> **不强制** customViz 使用 D3。本文档供 **选择** 内联 D3 的外部 AI / 开发者参考，与平台内置 D3 引擎 **逻辑分离、视觉可对齐**。

## 何时选用 D3

| 适合 D3（bundle 内联） | 更适合 vanilla / 原生插件 |
|------------------------|---------------------------|
| 多系列比例尺、坐标轴、brush/zoom | 简单排名条、静态 KPI（见 vanilla 示例） |
| 动态数据驱动 SVG 更新 | 必须 100% 接 `query/execute`、deStyle 面板 |
| 运行时免发版的新形态 | 政企导出像素级一致、进组件库 |

平台 FE 使用 **d3@7.9.0**（[`fe/package.json`](../../../../fe/package.json)）。bundle 内须 **内联** d3 全量 min 或按需子模块，**禁止** `<script src="https://cdn...">`。

## 与平台 D3 引擎的区别

```text
内置 chart：chartConfig → buildChartRenderPlan → applyChartStyleChain → fe/engine/d3/*
customViz+D3：artifact bundle 内自备 D3 代码 → iframe 沙箱展示
```

customViz 选 D3 **不会**调用 `applyChartStyleChain` 或 `renderD3Chart`。要对齐内置图风格，请使用 [theme-tokens.json](../theme-tokens.json)。

## 沙箱约束

与 [PROTOCOL.md](../PROTOCOL.md) 相同：

- 单入口 `index.html`，脚本与样式 **内联**
- 整包 ≤ **512KB**（含 HTML）。全量 `d3.min.js`（约 250–280KB）仍可能占用大部分配额，复杂组件建议 **d3 子集**（如 `selection` + `scale` + `axis`）
- `sandbox="allow-scripts"`，无 `allow-same-origin` — 不能访问父页面 CSS，须在 bundle 内定义 `:root` 变量

## 主题对齐（推荐）

1. 读取 [theme-tokens.json](../theme-tokens.json)（由 `scripts/export-vs-ai-spec.py` 导出，锚点 [`dashboardThemeTokens.ts`](../../../../fe/src/components/dashboard/dashboardThemeTokens.ts)）
2. 在 `index.html` 的 `<style>` 中声明 CSS 变量，例如暗色大屏：

```css
:root {
  --dashboard-artboard-bg: #0f172a;
  --dashboard-text-primary: #e2e8f0;
  --dashboard-chart-axis: #cbd5e1;
  --dashboard-chart-grid: #344054;
  --vs-d3-accent: #465fff;
}
html, body {
  margin: 0;
  height: 100%;
  background: var(--dashboard-artboard-bg);
  color: var(--dashboard-text-primary);
  font-family: system-ui, sans-serif;
}
```

3. D3 绘图时使用 token 色值：`axisLine` 对应 `--dashboard-chart-axis`，系列色可用 `--vs-d3-accent` 或 layout 中 `paletteColors`

`d3Theme` 块（`plotSurface`、`accent` 等）锚点：[`themeEngine.ts`](../../../../fe/src/components/charts/engine/d3/core/themeEngine.ts)。

## D3 编码约定（参考平台引擎，非强制 API）

| 约定 | 说明 |
|------|------|
| 布局 | 预留 margin（建议 top 16 / right 16 / bottom 32 / left 48），`innerWidth = width - margin.left - margin.right` |
| 比例尺 | 分类 `scaleBand` + `padding(0.2)`；数值 `scaleLinear` + `.nice()` |
| 坐标轴 | 轴线色用 `theme.axisLine` / `--dashboard-chart-axis`；网格 `--dashboard-chart-grid` |
| 系列色 | `scaleOrdinal` + 2–8 色，与内置 palette 接近 |
| 交互 | `pointer-events` + tooltip div；禁用 `onclick=` 等 inline 事件（用 `addEventListener`） |
|  resize | M1 可用静态尺寸；监听 `ResizeObserver` 可选 |
| 地图 | 仅离线中国 GeoJSON，禁止在线瓦片（GEO-IRON-01） |

参考实现（平台内部，**不可 import**）：[`fe/src/components/charts/engine/d3/`](../../../../fe/src/components/charts/engine/d3/)。

## manifest 元数据

```json
{
  "manifest": {
    "id": "my-d3-widget",
    "rendererHint": "d3",
    "entry": "index.html"
  }
}
```

`rendererHint` 仅便于检索与文档对照，后端 **不校验**。

## 数据（M1）

- bundle 内使用静态演示数据
- `customVizConfig.dataBinding.status: "manual"` — 用户稍后在平台绑字段
- M2：`postMessage` 查询桥（`vs:query` / `vs:result`）另行文档化

## 反模式

- 外链 D3 / React / 地图 CDN
- `onclick=`、`onload=` 等 inline 事件处理器
- 假设能访问 `window.parent` 或平台内部模块
- 把 customViz 当作「动态注册第 50 种 chartType」

## 示例

- D3 风格 SVG 柱图：[custom-viz-d3-bundle.json](../examples/custom-viz-d3-bundle.json)
- vanilla 对照：[custom-viz-bundle.json](../examples/custom-viz-bundle.json)
