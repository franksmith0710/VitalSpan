# ChartViewPlugin Registry

对标 DataEase `ChartViewPlugin` + compile-time glob 注册；backend `GET /api/v1/charts/types` 为 catalog 真理源，FE `BUILTIN_PLUGIN_DEFS` 镜像元数据与渲染计划。

## 目录

| 路径 | 职责 |
|------|------|
| `types.ts` | `ChartViewPlugin` / `DePaletteCategory` |
| `metadata.ts` | ~40 内置 type 元数据（paletteCategory、properties、capabilities） |
| `registry.ts` | `registerChartPlugin` / `getChartPlugin` |
| `plans/buildPlan.ts` | `buildPlanForType` → `AntvRenderPlan` |
| `index.ts` | 启动时 `registerBuiltinChartPlugins()` |

## 渲染分路

`AntvEngineView` 按 `plugin.library` 路由：

| library | 视图 |
|---------|------|
| `g2plot` | `AntvG2PlotView` |
| `g6` | `AntvG6View` |
| `g2` | `AntvMapView`（离线中国） |
| `s2` | `AntvS2View`（`table-info` / `table-normal` / `table-pivot`） |

样式管线：`applyChartStyleChain`（palette / advanced / seriesColor / conditional）。

## 存量迁移

`fe/src/lib/migrateChartTypes.ts`：layout 加载时将 `table`→`table-info`、`bar+stacked`→`bar-stack` 等。

## 约束

- `@antv/*` 仅允许 `engine/antv/**`（见 `fe/scripts/check-chart-engine.mjs`）
- 地图仅离线 GeoJSON（GEO-IRON-01）；不注册在线 L7 地图 type
