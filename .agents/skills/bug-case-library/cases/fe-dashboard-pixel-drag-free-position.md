# FE 像素看板拖动无法自由落位

- **ID**: CASE-2026-07-16-002
- **状态**: 已修复
- **影响**: fe / dashboard pixel canvas
- **首次发现**: 2026-07-16

## 症状

- 拖动组件时感觉被「磁铁」吸住，无法放到想要的位置
- 松手后坐标与拖动落点不一致
- 零间隙模式下组件间距被自动收拢

## 根因

1. **编辑态实时压实**：`PixelCanvas` 的 `activeLayout` / `finalizeLayout` / `useLayoutEffect` 在每次渲染与提交时调用 `compactPixelLayoutOuterRects`，把用户拖出的正缝强行收拢
2. **吸附阈值按缩放放大**：`markLineThreshold = 3/scale` 在缩小画布时吸附范围大于 DE 固定的 `diff=3` 画布像素
3. **辅助网格关仍吸附**：`markLinesEnabled` 与编辑态解耦后，关闭网格仍触发邻组件吸附

## 修复

1. 编辑提交路径**不再**调用 `compactPixelLayoutOuterRects`；压实仅保留在 `stylePipeline` 加载/保存与 gap 预设切换
2. `markLineThreshold` 固定为 **3 画布像素**（对标 DE `MarkLine.vue`）
3. `markLinesEnabled={showAuxGrid}`：关闭「辅助对齐网格」后可自由拖放；开启时才有 3px 邻组件吸附

## 验证

- `vitest run src/components/dashboard/pixelCanvas/PixelCanvas.test.tsx`
- 关辅助网格 → 任意落位保持；开辅助网格 → 仅近邻 3px 吸附

## 关联

- `fe/src/components/dashboard/pixelCanvas/PixelCanvas.tsx`
- `fe/src/components/dashboard/pixelCanvas/pixelMarkLine.ts`
- `fe/src/components/dashboard/pixelCanvas/gapCompaction.ts`（仅 load/save）
