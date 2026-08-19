# Feature Truth：customViz 与内置图表引擎能力边界

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-19 |
| 核验范围 | L3 customViz 为何不自动抽稀/自适应；平台补齐项（layout/helpers） |
| 锚点 | `CustomVizWidget.tsx` · `customVizPayload.ts` · `customVizRuntime.ts` · `D3CanvasView.tsx` |
| 总体判定 | **BY DESIGN + PARTIAL MITIGATION** |
| 依据 | F17-AIVIZ Out · `D3-OPTIONAL.md` · Payload v1 |

## 1. 结论

**customViz 是外挂 HTML 沙箱，不是第 50 种 chartType。** 内置 chart 走 `buildChartRenderPlan → applyChartStyleChain → renderD3Chart`；customViz 仅共享 **query/execute** 与 **Payload v1 + vsCv**，**不调用** `renderD3Chart`。

典型症状（外部 AI bundle）：

| 现象 | 根因 |
|------|------|
| X 轴标签重叠、不抽稀 | payload 传全量 rows；bundle 对每个 row 画 tick；无 `planHierarchicalCategoryAxis` |
| 拖大组件图表仍占一小块 | Base 原仅在数据/样式变化时 inject；bundle 用 `clientWidth\|\|320` 且未监听 resize |

**2026-08-19 平台侧缓解（仍非完整引擎）**：Payload 增 `layout` / `truncated`；`vsCv.onLayout` + `helpers.thinCategoryTickIndices`；官方 d3 示例示范 resize + 抽稀。

## 2. 能力对照

| 能力 | 内置 chart | customViz（设计） | customViz（2026-08-19 后） |
|------|-----------|-------------------|---------------------------|
| 查数 | chartType 插件 | 合成 `table` execute | 同左 |
| 行数 cap | `capRows` 500 + UI 提示 | 仅 SQL resultLimit | Base `capRows` → `truncated` |
| 轴抽稀 | 引擎 cartesian | bundle 自实现 | `vsCv.helpers.thinCategoryTickIndices` |
| 尺寸跟随 | `useElementSize` + live resize | 无 | payload `layout` + `onLayout` |
| 样式链 | `applyChartStyleChain` | CSS token + displayStyle | 同左 |

## 3. 代码锚点

- 内置管线：`fe/src/components/charts/engine/d3/views/D3CanvasView.tsx`
- L3 Base：`fe/src/components/dashboard/CustomVizWidget.tsx`
- 契约：`docs/api/vs-ai-spec/PROTOCOL.md` §Payload v1 · §渲染能力边界
- 规范：`docs/api/vs-ai-spec/guides/D3-OPTIONAL.md`

## 4. 仍 Out（F17）

- 强制走 `renderD3Chart`
- chartType 代理 / 动态注册进 catalog
- iframe 沙箱

外部 bundle **必须**在 HTML 内消费 `layout`、监听 `onLayout`（或 ResizeObserver），并调用 `helpers.thinCategoryTickIndices`（或自写等价逻辑），方可接近内置图体验。
