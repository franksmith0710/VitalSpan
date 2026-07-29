# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A8_DONE** |
| status | **DONE** |
| request | 数据大屏 Phase 2.6 编辑视口 T2–T3（DE 对齐） |
| type | feature |
| plan | `docs/automate/plans/2026-07-20-data-screen-edit-viewport-de.md` |
| goal | 抽离 `useDataScreenViewportState`；Ctrl+滚轮指针锚点缩放；标尺十字线 |
| last_verified | 2026-07-29：`vitest` useDataScreenViewportState/dataScreenViewportZoomAtPointer/DataScreenEditViewport/CanvasRulerCrosshair 绿 |
| repair_rounds | 0 |

## 上一轮（归档）

| 字段 | 值 |
|------|----|
| request | `/dev-autopilot 修复上面问题`（3D 贴地热力 code-review P1 批次） |
| type | bug |
| plan | `docs/automate/plans/2026-07-29-geo3d-heat-review-fixes.md` |
| last_verified | 2026-07-29：geoHeatRegionAnchors/geo3dHeatSamples 12 passed |

## 当前需求契约

- **request**: 按 code-reviewer 批次 A–D 修复 3D 贴地热力锚点与聚合问题
- **type**: bug
- **goal**: region_id 区县级上卷到省/市锚点；去除 startsWith 全表模糊；同地区多行求和；DEV 未匹配告警
- **scope_include**: `geoHeatRegionAnchors.ts`、`geo3dHeatSamples.ts`、`demoMysqlRegions.ts`、相关测试、`ChartGeoStylePanel` 说明
- **scope_exclude**: 光柱/标签数据源统一（P2，记录为已知分裂）；shader/相机/半径等非评审项
- **acceptance**: 相关 vitest 通过；`tsc --noEmit` 通过
- **risk_level**: low
- **autonomy_policy**: auto_accept_low_risk（会话续接，未重跑 grill-me）

## 本轮修复摘要

| 项 | 修复 |
|----|------|
| P1-1 region_id 上卷 | `listDemoMysqlRegionAncestorNames` + 祖先链逐级 `lookupAnchorName` |
| P1-2 模糊匹配 | 移除 `lookupAnchorName` startsWith 全表扫描，改精确/别名表 |
| P1-3 同位置聚合 | `aggregateHeatBlobSamplesByPosition` 对 lng/lat 与地区路径均求和 |
| P1-4 静默丢行 | DEV `console.warn` 未匹配行计数 |
| P2/D | 样式面板补热力 vs 光柱来源说明；去除重复 import |

## artifacts

- `fe/src/lib/demoMysqlRegions.ts`
- `fe/src/components/charts/engine/geo/geoHeatRegionAnchors.ts`
- `fe/src/components/charts/engine/geo/geoHeatRegionAnchors.test.ts`
- `fe/src/components/charts/engine/three/geo3dHeatSamples.ts`
- `fe/src/components/charts/engine/three/geo3dHeatSamples.test.ts`
- `fe/src/components/charts/engine/three/geo3dHeatBlobLayer.ts`
- `fe/src/lib/demoMysqlRegions.test.ts`
- `fe/src/components/dashboard/ChartGeoStylePanel.tsx`

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-29 | 3D 贴地热力 code-review P1 修复与测试 |
| 2026-07-27 | 组件库 Hub P0：预览/插入/引用明细 |
| 2026-07-23 | 性能门控 code-review 修复落地 |
