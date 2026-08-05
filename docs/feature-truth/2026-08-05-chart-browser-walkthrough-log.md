# 图表目录浏览器走查日志（44 活跃型 · AUTO 代理）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-05 |
| 范围 | **44** 个非 deprecated `chartType`（不含 5 项 MIG deprecated） |
| 入口 | 看板编辑 `DashboardEditWorkspace` → `CanvasEditToolbar` → `WidgetPalette`；Inspector 数据 Tab → `ChartDataSlots` |
| 状态说明 | **AUTO-VERIFIED** = UI 集成测（`ChartDataSlots.deParity`）+ L1 smoke 代理浏览器验收；待补手工截图走查 |
| 关联 | [`2026-08-05-chart-catalog-full-de-truth-audit.md`](./2026-08-05-chart-catalog-full-de-truth-audit.md) · [`2026-07-21-chart-per-type-verification.md`](../automate/plans/2026-07-21-chart-per-type-verification.md) |

> **走查方法（代理）**：Vitest jsdom 挂载 `ChartDataSlots` 断言 DE 槽位文案（T-INSP-UI）；L1 由 `charts.smoke.test.tsx` 挂载 `ChartRenderer` 断言 `data-testid`；L2 由 `chartCatalogData.test.ts` 断言 plan 编码。真机 `/admin/charts/explore` 截图走查列为 P2 待补。

---

## 走查矩阵（44 行）

| # | chartType | palette 路径 | fixture 引用 | L3 槽位证据 | L1 渲染证据 | L2 编码证据 | 状态 |
|---|-----------|--------------|--------------|-------------|-------------|-------------|------|
| 1 | `gauge` | CanvasEditToolbar → WidgetPalette → **quota** | `chartCatalogSmokeFixtures.ts` · F7 · `value=86.5` | `ChartDataSlots.deParity.test.tsx` · T-INSP-UI gauge | `charts.smoke.test.tsx` · T-VIZ-R30-001 · `d3-gauge-chart` | `chartCatalogData.test.ts` · T-VIZ-R31-001 gauge | AUTO-VERIFIED |
| 2 | `liquid` | CanvasEditToolbar → WidgetPalette → **quota** | F7 · `value=0.72` | T-INSP-UI liquid | T-VIZ-R30-001 · `d3-liquid-chart` | T-VIZ-R31-001 liquid | AUTO-VERIFIED |
| 3 | `kpi` | CanvasEditToolbar → WidgetPalette → **quota** | F7 · `revenue`+`rate` | T-INSP-UI kpi | T-VIZ-R30-001 · `d3-kpi-chart` | T-VIZ-R31-001 kpi | AUTO-VERIFIED |
| 4 | `table-info` | CanvasEditToolbar → WidgetPalette → **table** | F5 · `id`+`name` 明细 | T-INSP-UI table-info | T-VIZ-R30-001 · `d3-table-chart` | T-VIZ-R31-001 table-info | AUTO-VERIFIED |
| 5 | `table-normal` | CanvasEditToolbar → WidgetPalette → **table** | F5 · `region`+`amount` | T-INSP-UI table-normal | T-VIZ-R30-001 · `d3-table-chart` | T-VIZ-R31-001 table-normal | AUTO-VERIFIED |
| 6 | `table-pivot` | CanvasEditToolbar → WidgetPalette → **table** | F5 · `row_dim`+`col_dim`+`amount` | T-INSP-UI table-pivot | T-VIZ-R30-001 · `d3-table-chart` | T-VIZ-R31-001 table-pivot | AUTO-VERIFIED |
| 7 | `t-heatmap` | CanvasEditToolbar → WidgetPalette → **table** | F6 · `x_dim`+`y_dim`+`value` | T-INSP-UI t-heatmap | T-VIZ-R30-001 · `d3-heatmap-chart` | T-VIZ-R31-001 t-heatmap | AUTO-VERIFIED |
| 8 | `line` | CanvasEditToolbar → WidgetPalette → **trend** | F1 · `sale_date`+`amount` | T-INSP-UI line | T-VIZ-R30-001 · `d3-line-chart` | T-VIZ-R31-001 line | AUTO-VERIFIED |
| 9 | `area` | CanvasEditToolbar → WidgetPalette → **trend** | F1 · `sale_date`+`amount` | T-INSP-UI area | T-VIZ-R30-001 · `d3-area-chart` | T-VIZ-R31-001 area | AUTO-VERIFIED |
| 10 | `area-stack` | CanvasEditToolbar → WidgetPalette → **trend** | F1 · `sale_date`+`region`+`amount` | T-INSP-UI area-stack | T-VIZ-R30-001 · `d3-area-chart` | T-VIZ-R31-001 area-stack | AUTO-VERIFIED |
| 11 | `bar` | CanvasEditToolbar → WidgetPalette → **compare** | F1 · `sale_date`+`amount` | T-INSP-UI bar | T-VIZ-R30-001 · `d3-bar-chart` | T-VIZ-R31-001 bar | AUTO-VERIFIED |
| 12 | `bar-stack` | CanvasEditToolbar → WidgetPalette → **compare** | F1 · `sale_date`+`region`+`amount` | T-INSP-UI bar-stack | T-VIZ-R30-001 · `d3-bar-chart` | T-VIZ-R31-001 bar-stack | AUTO-VERIFIED |
| 13 | `percentage-bar-stack` | CanvasEditToolbar → WidgetPalette → **compare** | F1 · 子类别堆叠 | T-INSP-UI percentage-bar-stack | T-VIZ-R30-001 · `d3-bar-chart` | T-VIZ-R31-001 percentage-bar-stack | AUTO-VERIFIED |
| 14 | `bar-group` | CanvasEditToolbar → WidgetPalette → **compare** | F1 · `region` 分组 | T-INSP-UI bar-group | T-VIZ-R30-001 · `d3-bar-chart` | T-VIZ-R31-001 bar-group | AUTO-VERIFIED |
| 15 | `bar-group-stack` | CanvasEditToolbar → WidgetPalette → **compare** | F1 · 分组堆叠 | T-INSP-UI bar-group-stack | T-VIZ-R30-001 · `d3-bar-chart` | T-VIZ-R31-001 bar-group-stack | AUTO-VERIFIED |
| 16 | `waterfall` | CanvasEditToolbar → WidgetPalette → **compare** | `stage`+`value` | T-INSP-UI waterfall | T-VIZ-R30-001 · `d3-waterfall-chart` | T-VIZ-R31-001 waterfall | AUTO-VERIFIED |
| 17 | `bar-horizontal` | CanvasEditToolbar → WidgetPalette → **compare** | F1 · 横向柱 | T-INSP-UI bar-horizontal | T-VIZ-R30-001 · `d3-bar-chart` | T-VIZ-R31-001 bar-horizontal | AUTO-VERIFIED |
| 18 | `bar-stack-horizontal` | CanvasEditToolbar → WidgetPalette → **compare** | F1 · 横向堆叠 | T-INSP-UI bar-stack-horizontal | T-VIZ-R30-001 · `d3-bar-chart` | T-VIZ-R31-001 bar-stack-horizontal | AUTO-VERIFIED |
| 19 | `percentage-bar-stack-horizontal` | CanvasEditToolbar → WidgetPalette → **compare** | F1 · 横向百分比 | T-INSP-UI percentage-bar-stack-horizontal | T-VIZ-R30-001 · `d3-bar-chart` | T-VIZ-R31-001 percentage-bar-stack-horizontal | AUTO-VERIFIED |
| 20 | `bar-range` | CanvasEditToolbar → WidgetPalette → **compare** | `cat`+`low`+`high` | T-INSP-UI bar-range | T-VIZ-R30-001 · `d3-bar-range-chart` | T-VIZ-R31-001 bar-range | AUTO-VERIFIED |
| 21 | `bidirectional-bar` | CanvasEditToolbar → WidgetPalette → **compare** | `cat`+`left`+`right` | T-INSP-UI bidirectional-bar | T-VIZ-R30-001 · `d3-bidirectional-bar-chart` | T-VIZ-R31-001 bidirectional-bar | AUTO-VERIFIED |
| 22 | `progress-bar` | CanvasEditToolbar → WidgetPalette → **compare** | `cat`+`target`+`current` | T-INSP-UI progress-bar | T-VIZ-R30-001 · `d3-progress-bar-chart` | T-VIZ-R31-001 progress-bar | AUTO-VERIFIED |
| 23 | `stock-line` | CanvasEditToolbar → WidgetPalette → **compare** | F8 · OHLC 四价 | T-INSP-UI stock-line | T-VIZ-R30-001 · `d3-stock-chart` | T-VIZ-R31-001 stock-line | AUTO-VERIFIED |
| 24 | `bullet-graph` | CanvasEditToolbar → WidgetPalette → **compare** | F9 · `actual`+`target` | T-INSP-UI bullet-graph | T-VIZ-R30-001 · `d3-bullet-chart` | T-VIZ-R31-001 bullet-graph | AUTO-VERIFIED |
| 25 | `pie` | CanvasEditToolbar → WidgetPalette → **distribute** | F2 · `region`+`amount` | T-INSP-UI pie | T-VIZ-R30-001 · `d3-pie-chart` | T-VIZ-R31-001 pie | AUTO-VERIFIED |
| 26 | `pie-donut` | CanvasEditToolbar → WidgetPalette → **distribute** | F2 | T-INSP-UI pie-donut | T-VIZ-R30-001 · `d3-pie-chart` | T-VIZ-R31-001 pie-donut | AUTO-VERIFIED |
| 27 | `pie-rose` | CanvasEditToolbar → WidgetPalette → **distribute** | F2 | T-INSP-UI pie-rose | T-VIZ-R30-001 · `d3-pie-chart` | T-VIZ-R31-001 pie-rose | AUTO-VERIFIED |
| 28 | `pie-donut-rose` | CanvasEditToolbar → WidgetPalette → **distribute** | F2 | T-INSP-UI pie-donut-rose | T-VIZ-R30-001 · `d3-pie-chart` | T-VIZ-R31-001 pie-donut-rose | AUTO-VERIFIED |
| 29 | `radar` | CanvasEditToolbar → WidgetPalette → **distribute** | F2 | T-INSP-UI radar | T-VIZ-R30-001 · `d3-radar-chart` | T-VIZ-R31-001 radar | AUTO-VERIFIED |
| 30 | `treemap` | CanvasEditToolbar → WidgetPalette → **distribute** | F2 | T-INSP-UI treemap | T-VIZ-R30-001 · `d3-treemap-chart` | T-VIZ-R31-001 treemap | AUTO-VERIFIED |
| 31 | `word-cloud` | CanvasEditToolbar → WidgetPalette → **distribute** | F2 · 词+权重 | T-INSP-UI word-cloud | T-VIZ-R30-001 · `d3-word-cloud-chart` | T-VIZ-R31-001 word-cloud | AUTO-VERIFIED |
| 32 | `map` | CanvasEditToolbar → WidgetPalette → **map** | F3 · 省名+`value` | T-INSP-UI map | T-VIZ-R30-001 · `d3-map-chart` | T-VIZ-R31-001 map | AUTO-VERIFIED |
| 33 | `map-3d` | CanvasEditToolbar → WidgetPalette → **map** | F3 · WebGL/降级 | T-INSP-UI map-3d | T-VIZ-R30-001 · `three-map-chart` | T-VIZ-R31-001 map-3d | AUTO-VERIFIED |
| 34 | `scatter` | CanvasEditToolbar → WidgetPalette → **relation** | F1 简化 · `category`+`value` | T-INSP-UI scatter | T-VIZ-R30-001 · `d3-scatter-chart` | T-VIZ-R31-001 scatter | AUTO-VERIFIED |
| 35 | `quadrant` | CanvasEditToolbar → WidgetPalette → **relation** | `series`+`x`+`y` | T-INSP-UI quadrant | T-VIZ-R30-001 · `d3-quadrant-chart` | T-VIZ-R31-001 quadrant | AUTO-VERIFIED |
| 36 | `funnel` | CanvasEditToolbar → WidgetPalette → **relation** | `stage`+`cnt` | T-INSP-UI funnel | T-VIZ-R30-001 · `d3-funnel-chart` | T-VIZ-R31-001 funnel | AUTO-VERIFIED |
| 37 | `sankey` | CanvasEditToolbar → WidgetPalette → **relation** | F4 · `source`+`target`+`weight` | T-INSP-UI sankey | T-VIZ-R30-001 · `d3-sankey-chart` | T-VIZ-R31-001 sankey | AUTO-VERIFIED |
| 38 | `circle-packing` | CanvasEditToolbar → WidgetPalette → **relation** | F2 | T-INSP-UI circle-packing | T-VIZ-R30-001 · `d3-circle-packing-chart` | T-VIZ-R31-001 circle-packing | AUTO-VERIFIED |
| 39 | `multi-scatter` | CanvasEditToolbar → WidgetPalette → **relation** | `color`+`x`+`y` | T-INSP-UI multi-scatter | T-VIZ-R30-001 · `d3-scatter-chart` | T-VIZ-R31-001 multi-scatter | AUTO-VERIFIED |
| 40 | `graph` | CanvasEditToolbar → WidgetPalette → **relation** | F4 · `source`+`target` | T-INSP-UI graph | T-VIZ-R30-001 · `d3-graph-chart` | T-VIZ-R31-001 graph | AUTO-VERIFIED |
| 41 | `chart-mix` | CanvasEditToolbar → WidgetPalette → **dual_axes** | F1 · 双指标 `amount`+`amount2` | T-INSP-UI chart-mix | T-VIZ-R30-001 · `d3-dual-axes-chart` | T-VIZ-R31-001 chart-mix | AUTO-VERIFIED |
| 42 | `chart-mix-group` | CanvasEditToolbar → WidgetPalette → **dual_axes** | F1 · 子类别+双指 | T-INSP-UI chart-mix-group | T-VIZ-R30-001 · `d3-dual-axes-chart` | T-VIZ-R31-001 chart-mix-group | AUTO-VERIFIED |
| 43 | `chart-mix-stack` | CanvasEditToolbar → WidgetPalette → **dual_axes** | F1 · 堆叠+双指 | T-INSP-UI chart-mix-stack | T-VIZ-R30-001 · `d3-dual-axes-chart` | T-VIZ-R31-001 chart-mix-stack | AUTO-VERIFIED |
| 44 | `chart-mix-dual-line` | CanvasEditToolbar → WidgetPalette → **dual_axes** | F1 · 双线 | T-INSP-UI chart-mix-dual-line | T-VIZ-R30-001 · `d3-dual-axes-chart` | T-VIZ-R31-001 chart-mix-dual-line | AUTO-VERIFIED |

---

## 汇总

| 指标 | 值 |
|------|-----|
| 活跃型走查行 | **44/44** |
| AUTO-VERIFIED | **44** |
| 手工 BROWSER 截图 | **0**（P2 待补） |
| 空数据 R-03 | **44/44** · `T-VIZ-R30-002` |
| DE 槽位 golden | **44/44** · `chartFieldSlots.catalogGolden.test.ts` · T-INSP-DE-GOLDEN |

**P2 待补**：`/admin/charts/explore` 或看板编辑逐型截图；样式 Tab T7（300ms 预览变化）见 GAP-STYLE。
