# BUG-12：数据大屏编辑 resize 后组件内容消失

> 最近更新 2026-07-20

| 字段 | 值 |
|------|-----|
| 状态 | 🔧 部分缓解（R3 白屏/import 已修；resize 尺寸同步 + 样式感知仍失败） |
| 优先级 | P0 |
| 影响面 | `surfaceKind=data-screen` 编辑态；拖手柄微调组件尺寸 |
| 关联计划 | [`2026-07-20-data-screen-resize-geometry-pipeline.md`](../automate/plans/2026-07-20-data-screen-resize-geometry-pipeline.md) · [`2026-07-20-data-screen-edit-viz-inspector-pipeline.md`](../automate/plans/2026-07-20-data-screen-edit-viz-inspector-pipeline.md) |
| 关联 case | `.agents/skills/bug-case-library/cases/fe-dashboard-tab-nested-display.md`（0 尺寸测量链） |

## 现象（用户视角）

| 项 | 描述 |
|----|------|
| 操作 | `/admin/data-screens/:id/edit`，选中组件，拖八向手柄**略微**放大/缩小，松手 |
| 期望 | 组件外框与图表/边框/时钟/筛选等内容保持可见，尺寸与手柄一致 |
| 实际 | **R3 前**：整页白屏或内容全灭；**R3 后**：外框/DOM 仍在，但 **图表 canvas 不跟随 widget 尺寸**（S2 等）；**样式 Tab 可点但改完画布无反馈/面板似不可用** |
| 复现 | 用户 2026-07-20 三次反馈；R1/R2 无效；R3 修 import + 去 geom remount 后白屏缓解，尺寸/样式仍失败 |
| 范围 | 大屏编辑视口 + `designViewportLocked`；非右侧改画布 W/H（待单独手测） |

## 失败时序（L1 代码路径 + L2 用户 DOM）

| Seq | 阶段 | 事件 | 证据 |
|-----|------|------|------|
| 1 | 交互开始 | `PixelShape.startInteraction` → `isPlayer=true`，外框跟指针 `applyDisplay` + `syncOuterStyle` | `PixelShape.tsx` L499–517 |
| 2 | 预览 | 大屏 `allowsPixelWidgetOverlap` → `previewRegistry.applyAll` 只改 DOM，不推挤 | `PixelCanvas.tsx` L551–558 · `collisionLayout.ts` L32–36 |
| 3 | 松手 | `finish` → `applyDisplay(settledRect)` → `onCommit` | `PixelShape.tsx` L474–496 |
| 4 | 提交 | `handleCommit` → `onLayoutChange` + `clearPreviewChrome(nextLayout)` + `setShapeDragWidget(null)` | `PixelCanvas.tsx` L652–682 |
| 5 | 二次同步 | ~~`layoutGeometryKey` 全局 reset~~（R3 已删）；`clearPreviewChrome` 单点 reset | `PixelCanvas.tsx` L478–488 |
| 6 | React 同步 | `PixelShape` `useLayoutEffect` 用 `widget` props 写 DOM（若 `activeRef` 已空） | `PixelShape.tsx` L378–383 |
| 7 | 图表测量 | `ChartRenderer` `useElementSize(paused)` + `embeddedBodyHeight` + AntV 引擎 `fill` remeasure | `ChartRenderer.tsx` · `useEmbeddedChartLiveResize.ts` · `AntvS2View.tsx` |

**分水岭（推断，待 Playwright L1 证实）**：Seq 4–7 之间，**外框几何**与**嵌入式图表测量链**短暂或持久失配，导致 `bodySize.height≈0` 且 `pixelSize` 未及时参与回退 → 视觉「全灭」。

## 根因分析

### RC1 · 双轨几何写入（React style vs imperative DOM） — 🟡 部分缓解

| 项 | 内容 |
|----|------|
| 证据 | R2 前：`liveRect = isPlayer ? displayRef : display`，松手后 React `style.width/height` 用**旧 state** 覆盖 `syncOuterStyle`（`PixelShape.tsx` 历史实现，见 transcript 5344） |
| R2 改动 | 外框 `left/top/width/height` 仅 `syncOuterStyle`；React `style` 只保留 `zIndex`/`--dashboard-shape-gap` |
| 为何仍失败 | 未解决 **全画布 commit 后其它 widget 不重测**、**祖先 transform 下 scale 漂移**、**首帧无几何** 等并联问题 |
| 状态 | 🟡 部分缓解 |

### RC2 · previewRegistry 全局 reset 与 commit 竞态 — 🟡 部分缓解

| 项 | 内容 |
|----|------|
| 证据 | `clearPreviewChrome` 与 `useEffect([layoutGeometryKey])` 均调用 `previewRegistry.reset(全部)`（`PixelCanvas.tsx` L483–491、L256–261） |
| R1 改动 | preview sync 不再 `setDisplay`；`handleCommit` 顺序调整；`shapeDragWidgetRef` 跳过拖拽中 reset |
| 为何仍失败 | reset 仍可在 **layout 批处理边界** 用旧闭包或 **非几何字段变化** 触发；缺乏「仅活动 widget 写 DOM」契约 |
| 状态 | 🟡 部分缓解 |

### RC3 · 嵌入式图表测量链在 commit 后断裂 — 🔲 待修复（主因候选）

| 项 | 内容 |
|----|------|
| 证据 | `ChartRenderer`：`embedded` 时 `chartSize` 为 `undefined`，依赖 `absolute inset-0` + `useElementSize`（`ChartRenderer.tsx` L232–236） |
| 证据 | `embeddedBodyHeight`：仅当 `bodySize.height<=0` 时用 `pixelSize` 回退（`chartRendererEmbedded.tsx` L33–37） |
| 证据 | `DashboardCanvasWidgetRenderer` 被 `memo` 包裹，`rendererPropsEqual` **不含** `suspendLiveResize`/context（`DashboardCanvasWidgetRenderer.tsx` L90–107） |
| 机制 | resize 结束瞬间：外框 imperative 已变 → flex 子树重排 → RO 可能读到 0 → S2/G2Plot 以旧尺寸渲染；若无 **全局 remeasure**，嵌入图表视觉不跟随 |
| 与 tab-nested case 同族 | `fe-dashboard-tab-nested-display.md`：0×0 + embedded 路径高度塌陷 |
| 状态 | 🔲 待修复 |

### RC4 · 大屏「双 transform」下 scale 真理源分裂 — 🔲 待修复

| 项 | 内容 |
|----|------|
| 证据 | `DataScreenEditViewport` 在 stage 上 `transform: scale(fit*userZoom)`（`DataScreenEditViewport.tsx` L287–291） |
| 证据 | `PixelCanvas` `designViewportLocked` 时 stage **无** 内层 scale，靠 `resolveStageVisualScale(stageRef, …)` 反推（`PixelCanvas.tsx` L400–408、L875） |
| 风险 | RO/布局抖动时 `scale` 与真实指针换算不一致 → commit 写入的 canvas 尺寸与视觉跟手尺寸偏离；单测 `scale=1` **假绿**（`PixelCanvas.test.tsx` L215–283 无 `DataScreenEditViewport` 包裹） |
| 状态 | 🔲 待修复 |

### RC6 · Inspector 样式「不可用」感知 — 🔲 待修复（与 RC3 叠加）

| 项 | 内容 |
|----|------|
| 证据 | 样式链路无 `isDataScreen` 禁用：`ChartInspectorProvider.patchDeStyle` → `DashboardEditPage.setWidgets`（`ChartInspectorProvider.tsx` L50–55） |
| 证据 | `selectWidgetOnCanvas` 不含 `text`，图层选组件不展开右栏（`DashboardEditPage.tsx` L410–426） |
| 证据 | 大屏素材走 `ScreenVisualEditRail`，**无样式 Tab**（`ScreenVisualEditRail.tsx`） |
| 机制 | 用户改 `deStyle` 已写入 state，但 viz 尺寸链断裂（RC3）→ 画布无视觉反馈 → 误判「样式坏了」 |
| 状态 | 🔲 待修复（见 viz-inspector plan T7） |

### RC5 · 自动化缺口（Vitest 无 transform / 无 ChartRenderer） — 🔲 待修复

| 项 | 内容 |
|----|------|
| 证据 | 回归测例 `keeps resized widget geometry…` 仅断言 `span` 文案与外框 style，未挂载 `ChartRenderer`/AntV 引擎 |
| 后果 | R1/R2 连续「通过」但用户真机仍失败 |
| 状态 | 🔲 待修复 |

## 已尝试修复（无效/不足）

| 轮次 | 日期 | 假设 | 结果 |
|------|------|------|------|
| R1 | 2026-07-20 | previewRegistry `setDisplay` 竞态 | 用户仍复现 |
| R2 | 2026-07-20 | 去掉 React 外框几何 + `pixelSize` 拖拽期常开 | 用户仍复现 |
| R3 | 2026-07-20 | visualScale 注入 + commit 总线 + 删 geom remount + 修 deleted import | 白屏缓解；尺寸/样式仍失败 |

## 改进方向（见 Headless Plan）

1. **几何单一真理源**：layout commit 为权威；交互期 overlay；禁止多处 reset
2. **visualScale 注入**：`DataScreenEditViewport` → `PixelCanvas`，消除反推误差
3. **commit 后全局 remeasure 总线**：所有嵌入 viz 强制 `resize()`/`useElementSize` 补测
4. **Playwright 真机门控**：`transform: scale` + 图表 canvas 非零断言

## 验收标准

- [ ] 大屏编辑：任意顶层 chart/边框/时钟/筛选 widget 拖手柄微调后内容仍可见
- [ ] 邻块几何不变（overlap 模式）
- [ ] `pnpm exec playwright test e2e/data-screen-resize-content.spec.ts` 通过
- [ ] `pnpm exec vitest run src/components/dashboard/pixelCanvas/PixelCanvas.test.tsx` 通过

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-20 | 初版：R1/R2 后用户仍复现；五维根因 + 管线级方案 |
