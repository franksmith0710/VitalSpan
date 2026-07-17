# 图表样式栏配色选择器点击无效

- **ID**: CASE-2026-07-17-001
- **状态**: 已修复
- **影响**: fe · 看板编辑 · 216px 图表样式栏 · ChartPalettePicker
- **首次发现**: 2026-07-17

## 症状

- 看板编辑 → 选中图表 → 样式 → 图表配色：内联列表（`chart-palette-inline-menu-panel`）可见
- 点击「品牌 / 清透 / …」无反应，或短暂选中后回弹为「默认」
- 432px 仪表板配置同色选择器正常
- 单测 `ChartPalettePicker.test.tsx` / `ChartStylePanel.test.tsx` 通过，实机失败

## 根因

1. **数据集 binding 竞态**：`useChartInspectorState` 在 `resolveDatasetChartBinding` 异步完成后用 effect 闭包内旧 `cfg` 调 `onChange`，覆盖刚写入的 `nativeBody.deStyle.paletteId`（SQL 模式单测不触发 → 假绿）
2. **窄栏触控手势**：样式 Tab 面板 `touch-pan-y` + 嵌套 `overflow-y-auto`，实机轻点被当作滚动手势，`click` 不触发
3. **单测缺口**：仅断言 `onChange` 被调用，未 re-render 断言 CurrentDisplay 与 binding 延迟后状态

## 错误做法（避免）

- 在 async effect 完成时 spread 闭包 `cfg` 而非 `cfgRef.current`
- 216px 交互区继续使用 `touch-pan-y` 而不对选项区设 `touch-manipulation` / `mousedown` 选型
- 仅用孤立 Picker 单测验收整条 inspector → widget 状态链

## 修复方式

- `useChartInspectorState.ts`：引入 `cfgRef`，binding sync / columns reconcile 写回时用最新配置
- `ChartPaletteOptionList.tsx`：`onMouseDown` + `stopPropagation` 选型（先于滚动/失焦）
- `ChartPalettePicker.tsx`：内联面板 `touch-manipulation`
- `ChartInspectorTabs.tsx`：去掉样式面板 `touch-pan-y`
- `ChartInspectorProvider.palette.test.tsx`：集成测 re-render + 数据集 binding 延迟

## 验证

```bash
cd fe && pnpm vitest run src/components/dashboard/ChartPalettePicker.test.tsx src/components/dashboard/ChartStylePanel.test.tsx src/components/dashboard/ChartInspectorProvider.palette.test.tsx src/components/dashboard/ChartInspectorTabs.test.tsx
```

## 关联

- `fe/src/components/dashboard/ChartPalettePicker.tsx`
- `fe/src/components/dashboard/useChartInspectorState.ts`
- `fe/src/components/dashboard/chartStyleSections/ChartCommonStyleSections.tsx`
- `.agents/skills/bug-case-library/cases/fe-color-field-picker-jump.md`（同类 Popover/重绘问题）
