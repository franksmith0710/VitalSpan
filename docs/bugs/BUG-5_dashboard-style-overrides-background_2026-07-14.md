# BUG-5 · 仪表板主题覆盖背景风格

> 状态：**v2 已修复（待手工验收）** · 发现：2026-07-14 · plan：`docs/automate/plans/2026-07-14-dashboard-theme-background-de-v2.md`

## v1 修复失误

将 `colorScheme` 与 `canvasBackground` 都写入 `DashboardStyleSurface.style`，并把 artboard/widget 透明化 → 视觉「全改乱」。

## v2 正确模型（对标 DE §5.1 / §5.3）

| 层 | 职责 | 实现 |
|----|------|------|
| 主题 scope | 浅/深语义色、组件卡片 | `DashboardStyleSurface` 仅 `dark` + `data-dashboard-color-scheme` |
| 画板背景 | 用户背景色/图 | `resolveArtboardStyle` 画在 artboard/backdrop |
| 编辑 chrome | 点阵 | `.dashboard-canvas-surface`，有用户背景时透明 |

优先级：用户 §5.3 背景 > 主题默认画板色 > 点阵 chrome

## 验收

- [x] vitest 31 项通过
- [ ] 设黄色背景 + 切深色主题 → 画板仍黄，组件变深色卡片
- [ ] 清除背景 + 深色主题 → 画板深蓝灰，非点阵盖色
- [ ] 栅格/像素编辑与 Share 预览一致
