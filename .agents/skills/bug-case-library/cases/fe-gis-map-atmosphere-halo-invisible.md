# GIS 球面大气光晕不可见

## 症状

- 样式栏「大气效果」已启用，光晕强度/范围已调高，地图上仍看不到球缘蓝色光晕
- 深空背景、昼夜分界（太阳引擎）可能正常，用户易误以为「大气已生效」
- 偶见球缘极细蓝线，整体仍像「没效果」

## 根因（主层：代码/实现 + 架构缝）

1. **光晕 canvas 挂错 DOM 层**：挂在 `map.getContainer()` 外 sibling 且 z=5 叠在 WebGL 之上，与 GeoLibre 的 canvas-container 内 z=3（地图 z=4 遮挡中心）不一致，坐标与混合易失效。
2. **球缘解析门控过严**：`isGlobeTransformProbeReady`（依赖 `isPointOnMapSurface`）未就绪时直接 `display:none`，而 GeoLibre 用 `map.project` 地平线采样（`resolveGlobeLimbBoundsFromProject`）即可绘制。
3. **与 effects 引擎职责混淆**：光晕曾绑在 `GisGeolibreEffectsEngine` 上，又受 `tileServiceId` / `gisPaintState=ready` 门控，引擎未挂载则完全无光晕。

## 修复

- **光晕唯一路径**：`mountGisGlobeHaloOverlay`（`GisMapView` 常驻挂载，仅要求 `projection=globe`）
- **层栈**：`getCanvasContainer()` 内 halo z=3，map canvas z=4（与 GeoLibre 一致）
- **球缘**：`resolveGlobeLimbBoundsForHaloPaint` — project 采样优先，不硬依赖 surface probe
- **绘制**：`drawGlobeAtmosphereHalo` 全圆 + screen 混合，地图遮挡中心洗白
- **effects 引擎**：仅深空/星场/流星，不再画 halo

## 验证

- DevTools：`data-testid="gis-globe-halo"` 存在且 `display:block`
- 全球 zoom 1–3，球缘应有可见蓝色光晕
- `pnpm vitest run src/components/charts/engine/maplibre/gisGlobeHalo*.test.ts src/components/charts/engine/maplibre/gisGlobeLayout.test.ts`

## 防复发

- 回归测：`GisMapView.effects.regression.test.ts` 要求 `mountGisGlobeHaloOverlay` 且不经 `gisPaintState` 门控
- 勿再把光晕收回 effects 引擎或加 `isGlobeTransformProbeReady` 硬门控

## 锚点

- `fe/src/components/charts/engine/maplibre/gisGlobeHalo.ts`
- `fe/src/components/charts/engine/maplibre/gisGlobeLayout.ts` → `resolveGlobeLimbBoundsForHaloPaint`
- `fe/src/components/charts/engine/maplibre/GisMapView.tsx`
