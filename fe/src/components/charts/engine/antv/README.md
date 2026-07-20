# AntV 图表引擎

> 生产路径：`CanvasChartHost` → `AntvEngineView`（G2Plot / G6 / G2 离线地图）

## 状态（2026-07）

| 包 | 用途 |
|----|------|
| `@antv/g2plot` | line/bar/pie/gauge/scatter/combo/funnel/sankey/heatmap/wordCloud 等 |
| `@antv/g6` | graph（force/dagre） |
| `@antv/g2` | map 离线 choropleth（`OfflineGeoAntVPort`） |

| 类型 | 引擎 |
|------|------|
| table / kpi | React 自研 |
| 其余 canvas | `registry` → `antv` |

## 目录

- `buildAntvSpec.ts` — VM → render plan
- `applyAntvStyle.ts` — deStyle → G2Plot options
- `applyAdvancedFeatures.ts` — markLine / conditional（部分映射）
- `g2plot/` · `g6/` · `geo/` — 视图与端口
- `exportPng.ts` — canvas PNG 导出

## 门禁

`pnpm check:chart-engine`：`@antv/*` 仅允许 `engine/antv/**`。`engine/echarts/**` 为**遗留目录**（生产不挂载；`geoMapChart` 地名工具仍被 AntV 地图引用），待归档删除；`package.json` 已无 `echarts` 依赖。

## timeline 迁移

存量 `chartType: timeline` 在 `layoutUtils` 加载时自动转为 `line`（见 `lib/migrateTimelineChartType.ts`）。
