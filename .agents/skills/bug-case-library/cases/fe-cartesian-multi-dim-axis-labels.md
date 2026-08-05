# 笛卡尔图多维度 X 轴标签叠加乱码

- **ID**: CASE-2026-08-05-001
- **状态**: 已修复
- **影响**: fe / 折线·面积·柱图
- **首次发现**: 2026-08-05

## 症状

- 类别轴拖入多个维度后，X 轴刻度文字重叠、不可读
- 复合类目标签含不可见分隔符，呈现乱码或挤在一起

## 根因

1. MULTI_DIM 复合类目标签用 `\u0001` 作内部 join key，轴/tip 直接渲染原始 key
2. `planCategoryAxisLayout` 已计算 `rotateDeg` 并预留 bottom 边距，但 `drawCartesianAxes` 等未调用 `applyRotatedCategoryLabels`，标签始终水平绘制导致叠加

## 修复方式

- `formatCompositeCategoryDisplay`：内部 key → 单行 `A / B / C`（tooltip）
- **分层轴**：`hierarchicalAxis.ts` 多维度分行 + 同级合并（对标 DataEase）
- `formatCategoryCellValue`：`null` 不再渲染为字面量
- `sceneGraph.ts` 多维度时走 `drawHierarchicalCategoryAxis`

## 验证

- `axes.test.ts` 复合标签旋转与可读性
- `buildDatasetEncoding.test.ts` composite display

## 关联

- `fe/src/components/charts/engine/buildDatasetEncoding.ts`
- `fe/src/components/charts/engine/d3/core/axes.ts`
- `fe/src/components/charts/engine/d3/core/sceneGraph.ts`
