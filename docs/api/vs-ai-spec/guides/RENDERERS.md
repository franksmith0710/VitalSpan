# Custom Viz 渲染器选择（可选）

> customViz bundle **不强制**任何渲染技术。`manifest.rendererHint` 仅为元数据，平台不校验、不拒绝。

## 可选 rendererHint

| 值 | 适用场景 | 示例 |
|----|----------|------|
| `vanilla` | 简单 DOM/CSS 排名条、KPI 卡片 | [custom-viz-bundle.json](../examples/custom-viz-bundle.json) |
| `svg` | 手写 SVG 路径/图形 | 轻量图标、简单矢量 |
| `canvas` | 像素级绘制、大量点 | 散点热力（仍须离线、无外链） |
| `d3` | 比例尺、坐标轴、复杂交互 | [custom-viz-d3-bundle.json](../examples/custom-viz-d3-bundle.json) · [D3-OPTIONAL.md](./D3-OPTIONAL.md) |

未声明 `rendererHint` 时，平台按普通 HTML bundle 处理。

## 与内置 chart 的关系

| 需求 | 推荐路径 |
|------|----------|
| 49 种已有 chartType 能表达 | L1/L2：`chartConfig` + `deStyle`（平台 D3 引擎） |
| 全新形态、运行时免发版 | L3：`customViz` + 自选渲染器（**非**平台 D3 引擎） |
| 必须接 query / deStyle / 导出像素一致 | 原生 chartType 插件（合入仓库发版） |

## 风格对齐（推荐，非强制）

无论选用何种渲染器，**推荐**在 bundle 内使用 [theme-tokens.json](../theme-tokens.json) 的 `--dashboard-*`。平台 Base 会把看板主题变量写到宿主上，与内置 chart 共用。

## 约束（所有渲染器共用）

见 [PROTOCOL.md](../PROTOCOL.md)：禁外链 script、禁 inline 事件、整包 ≤512KB。源码由 Base 挂进主页面宿主。
