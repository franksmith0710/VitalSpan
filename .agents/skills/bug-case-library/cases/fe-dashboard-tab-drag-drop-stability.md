# Tab 拖放虚线过大 / 拖动时页签框乱动 / 子组件被遮罩

## 症状

- 从工具栏拖组件进页签时，画布虚线投放框远大于 Tab 外框（原 160px 外扩）
- 拖动其他组件经过 Tab 时，Tab 容器随碰撞推挤上下移动
- 页签内已有子组件时，拖放层全屏遮罩 + `opacity-50` 导致子组件「像没显示」
- 图表子组件 ECharts 报 `clientWidth/clientHeight` 为 0

## 根因

1. `TAB_PALETTE_DROP_BUFFER_PX = 160` 同时用于命中与绘制
2. `resolvePixelCollisions` 对 Tab 宿主执行 `emptyTargetFootprint` 下推
3. `TabsWidget` 在有子组件时仍铺 `TabsPaletteDropOverlay` 并禁用子组件指针事件
4. 像素壳层 Tab 内子组件 `min-h-[72px]` 不足，flex 未撑满 panel

## 修复

- 命中区 `48px`，视觉虚线 `4px`（`TabPaletteDropZones` 分离 hit/visual）
- `collisionLayout`：`type === "tabs"` 不参与被推挤
- 有子组件时仅底部紧凑提示条，不再全屏遮罩
- shape 壳层子组件 `min-h-[5rem]` + `flex-1` 撑满 panel

## 锚点

- `fe/src/components/dashboard/pixelCanvas/tabInsertResolver.ts`
- `fe/src/components/dashboard/pixelCanvas/TabPaletteDropZones.tsx`
- `fe/src/components/dashboard/pixelCanvas/collisionLayout.ts`
- `fe/src/components/dashboard/TabsWidget.tsx`

## 回归

- 切换页签时画布 `scrollTop` 保持不变（手测）

---

# Tab 点击页签画布滚到顶部

## 症状

- 点击 Tab 容器页签栏（页签 1/2/3…）时，像素画布 `pixel-canvas-host` 总是滚回顶部

## 根因

1. 页签 `button` 点击后获得焦点，浏览器对可滚动祖先执行 `scrollIntoView`
2. `pixel-shape-inner` 的 `pointerdown` 在页签栏冒泡，触发多余选中/布局抖动
3. 切换 `activePaneId` 写入 `contentRevision` 导致整组件重挂载

## 修复

- 页签按钮 `pointerdown` + `preventDefault` 阻止聚焦滚动
- 页签栏 `pointerdown` 阻止冒泡到 `PixelShape`
- shape 壳层 tabpanel 用 `overflow-hidden`，滚动交给画布
- `contentRevision` 不再包含 `activePaneId`

## 锚点

- `fe/src/components/dashboard/TabsWidget.tsx`
- `fe/src/components/dashboard/pixelCanvas/PixelShape.tsx`
- `fe/src/components/dashboard/dashboard-edit/DashboardEditCanvas.tsx`
