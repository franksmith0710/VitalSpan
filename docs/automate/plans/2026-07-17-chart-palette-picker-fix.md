# 图表样式栏配色选择器不可用 · 根因与修复

Plan type: Headless Automation Plan  
Cursor Build: disabled  
Execution trigger: dev-autopilot A5 plan-execute  
日期：2026-07-17

## 问题陈述

看板编辑页 **216px 图表样式栏**（样式 → 图表配色）中 `ChartPalettePicker` 内联列表可见，但点击预设无反应或选中不生效；432px 仪表板配置同组件在 `dense=false` 时正常。单测通过、实机失败。

## 根因分层（证据链）

### R1 · 状态回写竞态（数据集图表，高置信）

`useChartInspectorState` 绑定同步 effect 在 async `resolveDatasetChartBinding` 完成时用**闭包内旧 `cfg`** 调用 `onChange({ ...cfg })`，可在用户刚写入 `deStyle.paletteId` 后被覆盖。

- 证据：`fe/src/components/dashboard/useChartInspectorState.ts` L98–138，async 完成分支 spread 的是 effect 启动时的 `cfg`
- 单测 widget 为 `mode: "sql"`，不触发该 effect → 假绿

### R2 · 窄栏滚动容器 `touch-pan-y`（实机交互，中置信）

`ChartInspectorTabs` 样式面板使用 `touch-pan-y`（`touch-action: pan-y`）。嵌套 `overflow-y-auto` 内联列表在触控/部分触控板上，轻点可能被解释为滚动手势，`click` 不触发。

- 证据：DOM 路径含 `touch-pan-y` + 双层 `overscroll-y-contain`；单测 `userEvent.click` 不模拟该路径

### R3 · 图表 handler 与仪表板不对齐（中置信，影响画布而非列表勾选）

`ChartCommonStyleSections.onPaletteChange` 只接收 `paletteId`，忽略 `colors`；仪表板 `dashboardConfigPanels` 写 `paletteId + paletteColors`。组件级 `ChartDeStyle` 无 `paletteColors` 字段，但继承/自定义色逻辑依赖 `seriesColor` 清理完整性。

### R4 · 已排除

- `mergeLayoutWidgetIntoPixel` 正确合并 `chartConfig`
- `reconcileChartFields` 仅改 dimensions/metrics，columnsKey 不变时不重跑
- Collapsible / `pointer-events-none` 仅作用于 CurrentDisplay 展示条，不挡列表按钮

## 修复方案

| Task | 内容 | 文件 |
|------|------|------|
| T1 | binding/columns effect 用 `cfgRef.current` 写回 | `useChartInspectorState.ts` |
| T2 | 内联选项 `onMouseDown` + `stopPropagation`，面板 `touch-manipulation` | `ChartPaletteOptionList.tsx`, `ChartPalettePicker.tsx` |
| T3 | 样式 Tab 去掉 `touch-pan-y` | `ChartInspectorTabs.tsx` |
| T4 | `onPaletteChange` 对齐仪表板语义（inherit 清 opacity） | `ChartCommonStyleSections.tsx` |
| T5 | 集成测：onChange 后 re-render 断言 UI + 数据集 binding 不覆盖 palette | 新测 + 更新 smoke |
| T6 | 登记 bug case | `.agents/skills/bug-case-library/cases/` |

## 验收

```bash
cd fe && pnpm vitest run src/components/dashboard/ChartPalettePicker.test.tsx src/components/dashboard/ChartStylePanel.test.tsx src/components/dashboard/ChartInspectorProvider.palette.test.tsx src/components/dashboard/ChartInspectorTabs.test.tsx
```

- 216px 样式栏：点「清透」等，CurrentDisplay 文案与 check 更新，画布系列色变化
- 数据集模式图表：选配色后不被 binding sync 冲掉

## 风险

- 去掉 `touch-pan-y` 可能略影响触控长列表惯性滚动 → 可接受，右栏以点击为主
