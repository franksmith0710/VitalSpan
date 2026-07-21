# D3 图表引擎

画布类 chartType（含 KPI、表格三件套）统一由 `engine/d3/` 渲染。

| 分路 | 组件 |
|------|------|
| 柱线饼/关系/指标等 | `D3CanvasView` → `renderDispatch.ts` |
| 地图 | `D3GeoMapView` → `geo/renderChoropleth.ts` |
| 明细/汇总/透视表 | `D3TableView` → `VitalSpanTable` / `TablePivotGrid` |

离线地图 join / 下钻：`engine/geo/OfflineGeoPort.ts` · `geoMapLevels.ts` · `geoMapChart.ts`。

Plan 构建仍经 `buildPlanForType`（`kind: "d3"`）。
