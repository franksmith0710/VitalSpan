# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A8_DONE** |
| status | **DONE** |
| request | Code Review 假功能修复（P0/P1 批次） |
| type | bug / small-change |
| plan | [`plans/2026-07-22-code-review-fake-features-fix.md`](./plans/2026-07-22-code-review-fake-features-fix.md) |
| goal | 消除配置面板「能保存不生效」假功能 |
| last_verified | 2026-07-22：`test:chart-catalog` 210 passed |

## 当前需求契约

- **request**: 修复 code-reviewer 报告 P0/P1
- **type**: bug-fix batch
- **goal**: Inspector 控件与渲染/runtime 一致
- **scope_include**: terrainRelief、富文本假数据 Tab、栅格 widgetStyle、tooltip、shell 图例色、liquid%、筛选器标签色、媒体链接提示、3D 空态
- **scope_exclude**: 富文本 Dataset 动态渲染、LinkageRulesPanel 挂载、region_id demo 映射
- **acceptance**: `pnpm run test:chart-catalog` 全绿
- **risk_level**: low
- **autonomy_policy**: auto_accept_low_risk

## 本轮修复摘要

| ID | 修复 |
|----|------|
| P0-1 | `TextEditRail` 移除假数据 Tab，仅样式 + 双击编辑提示 |
| P0-2 | `terrainRelief` 与 `terrainTexture` 联合门控 hillshade 加载 |
| P0-3 | `resolveGridWidgetShell` 接入 Text/Media/Tabs/Filter 栅格外壳 |
| P1-1 | 13 个 D3 renderer 补齐 `tooltipPresentation` |
| P1-2 | Shell 图例发布 `legend.color` → `EmbeddedChartLegendShell` |
| P1-3 | 水波图 UI 改为「目标线（%）」0–100 |
| P1-6 | 3D 地图 `features.length===0` 显示占位文案 |
| P1-9/10 | 筛选器 `labelStyle` + 媒体链接提示条件修正 |
| 附带 | `TablePivotGrid` 补 `TableResizeGuide` import |

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-22 | A8_DONE：code-review P1 续（partial 提示、GlobalFilterBar、Dataset 绑定错误） |
| 2026-07-22 | A8_DONE：code-review-fake-features-fix |
| 2026-07-22 | A8_DONE：chart-dense-viewport-scroll P0 |
