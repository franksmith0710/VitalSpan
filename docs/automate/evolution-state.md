# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A4_PLAN** |
| status | **RUNNING** |
| request | 大屏 resize 后图表不跟尺寸 + 样式面板不可用：深度根因 + 完善方案 |
| type | bug |
| plan | [`plans/2026-07-20-data-screen-edit-viz-inspector-pipeline.md`](./plans/2026-07-20-data-screen-edit-viz-inspector-pipeline.md) |
| plan_prev | [`plans/2026-07-20-data-screen-resize-geometry-pipeline.md`](./plans/2026-07-20-data-screen-resize-geometry-pipeline.md)（T2/T3 部分落地） |
| bug | [`../bugs/BUG-12_data-screen-resize-content-vanish_2026-07-20.md`](../bugs/BUG-12_data-screen-resize-content-vanish_2026-07-20.md) |
| goal | viz remeasure 双保险 + Inspector 可用性 + Playwright 门控 |
| scope_include | `ChartRenderer`, 各引擎 remeasure, `DashboardEditPage` 右栏, `useElementSize`, e2e |
| scope_exclude | 素材组件全量 DE 样式；Phase 3 多屏 |
| acceptance | outer≈canvas 尺寸；样式改色可见；Playwright + Vitest 通过 |
| risk_level | medium |
| autonomy_policy | strict_plan_match |
| repair_rounds | 1（R3 白屏 partial） |
| last_verified | R3 import/geom remount fix；用户 18:42 仍报尺寸+样式 |

## 当前需求契约

- request: 图表不跟随组件大小；样式设置完全不可用；要求 dev-autopilot 深度剖析并完善方案
- type: bug
- goal: 根治大屏编辑 viz 尺寸同步与样式不可用感知
- scope_include: 见上表
- scope_exclude: 见上表
- acceptance: viz-inspector plan T1/T4/T7 验证命令 + 手测清单
- risk_level: medium
- autonomy_policy: strict_plan_match
- assumptions: 生产渲染 **仅 AntV**（S2/G2Plot/G6/G2）；用户选中 S2 表格 chart

## 根因摘要（2026-07-20 深度剖析）

| 优先级 | 根因 | 说明 |
|--------|------|------|
| P0 | RC3 commit 后 remeasure 链断裂 | RO silent；G2Plot update 无 changeSize；S2 remeasure 漏跑 |
| P1 | RC9 样式无效感知 | patchDeStyle 正常，viz 不重绘导致无反馈 |
| P1 | RC6 右栏不展开 | 图层选 text/chart 未 setChartRailOpen |
| P2 | RC8 素材无样式 Tab | 设计缺口，需文档预期 |
| P2 | RC4 useElementSize bbox 混用 | transform 下 getBoundingClientRect 偏差 |

## 并行排队（未切换）

| 字段 | 值 |
|------|----|
| plan | [`plans/2026-07-20-data-screen-edit-viewport-de.md`](./plans/2026-07-20-data-screen-edit-viewport-de.md) |
| note | 视口对标；与 viz-inspector plan 共享 DataScreenEditViewport |

## 最近完成（摘要）

| 日期 | 项 | 摘要 |
|------|-----|------|
| 2026-07-20 | R3 partial | 删 geom remount；修 pixelLayoutGeometry import；commit 总线 |
| 2026-07-20 | 深度剖析 | viz-inspector Headless Plan PASS |
| 2026-07-20 | 文档卫生 | plans/superpowers 归档 |

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-20 | viz-inspector 计划；BUG-12 增 RC6/R3 现象 |
| 2026-07-20 | BUG-12 根因评估 + geometry plan PASS |
| 2026-07-20 | 压缩账本 |
