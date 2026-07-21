# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A8_DONE** |
| status | **IDLE** |
| request | map-3d Code Review 修复：消除 WebGL 静默降级假绿，Inspector/测试/catalog 对齐 |
| type | bug |
| plan | [`plans/2026-07-21-map-3d-code-review-fixes.md`](./plans/2026-07-21-map-3d-code-review-fixes.md) |
| plan_prev | [`plans/2026-07-21-chart-per-type-verification.md`](./plans/2026-07-21-chart-per-type-verification.md) |
| goal | map-3d 诚实降级 + Inspector 真接线 + 测试/catalog/文档闭环 |
| last_verified | 2026-07-21：`test:chart-catalog` 167 passed · `test_viz_chart_catalog_parity` 4 passed |

## 当前需求契约

- **request**: 按 Code Review 2026-07-21 修复 map-3d P0/P1 问题
- **type**: bug
- **goal**: 用户选 3D 地图时，渲染引擎状态对用户与测试可见；Inspector 无假开关；catalog 一致
- **scope_include**: `renderThreeChoropleth`、 `D3GeoMapView`、Inspector 矩阵/门控、smoke 测试、BE `map.py`、验收文档 §4.8
- **scope_exclude**: 在线地图、3D 区域文字标签、Playwright 像素基线（GPU）、撤掉 map-3d 入口
- **acceptance**: `pnpm run test:chart-catalog` 全绿；`data-render-engine` + 降级横幅；visualMap 3D 可用；pytest catalog parity
- **risk_level**: low
- **autonomy_policy**: auto_accept_low_risk（T8/T9 可 follow-up）
- **assumptions**: 诚实降级（2D+说明）优于禁用选型；GEO-IRON-01 不变

## 最近完成（摘要）

| 日期 | 项 | 摘要 |
|------|-----|------|
| 2026-07-21 | map-3d CR 修复闭环 | 诚实 WebGL 降级、`@types/three`、Inspector/测试/catalog/文档对齐 |
| 2026-07-21 | map-3d 初版 | Picker 登记 + Three 挤出渲染 |
| 2026-07-21 | chart-catalog 闭环 | T-VIZ-R30~33、`test:chart-catalog` 门禁 |
| 2026-07-20 | viz-inspector 闭环 | T4 remeasure 链、T7 Inspector |

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-21 | A8_DONE：map-3d code review 修复计划执行闭环 |
| 2026-07-21 | A4_PLAN：map-3d code review 修复 Headless Plan |
| 2026-07-21 | A8_DONE：图表逐型验收 AUTO 闭环 |
| 2026-07-20 | A8_DONE：viz-inspector plan 执行闭环 |
