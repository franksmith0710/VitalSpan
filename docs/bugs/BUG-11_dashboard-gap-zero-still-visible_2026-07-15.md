# BUG-11 看板设「无间隙」后仍可见画板色条

> 状态：**已定位 · 方案待执行** · 类型：WYSIWYG / gap 几何 · 模块：dashboard / pixel canvas  
> Plan：`docs/automate/plans/2026-07-15-dashboard-gap-zero-compaction.md`

## 现象

| 项 | 描述 |
|----|------|
| 用户操作 | 仪表板配置 → 整体配置 → **无间隙**（或期望无间隙） |
| 期望 | 相邻组件浅蓝外框贴齐，无画板底色露出 |
| 实际 | 组件之间仍有 **~8–10px** 画板色（浅绿）条带；与 `gapPreset=md` 视觉一致 |
| 截图 | 2026-07-15 用户提供的多组件看板预览 |

## 失败时序（重建）

```
1. 用户布局在「有间隙/中」或自定义 pixelGutter 下完成拖放
2. 外框 x/y/w/h 持久化（碰撞 gap=0，不扩缝）
3. 用户切「无间隙」→ gapPreset:none, pixelGutter:0, widgetGap:0
4. runtime shellPaddingPx → 0（若 style 已生效）
5. CSS --dashboard-shape-gap → 0
6. 外框坐标未压实 / 或 runtime 仍为非零 gap
7. 画板色仍从 padding 区或外框坐标缝露出
```

## 根因（摘要）

| ID | 层 | 说明 | 证据 |
|----|-----|------|------|
| RC-A | 模型 | DE curGap = shell padding，**不改坐标** | `componentGapRuntime.ts`, `index.css` |
| RC-B | 配置 | 运行时仍 `md`（未保存/双源/legacy） | `gapPolicy.ts`, BUG-10 RC-1/2 |
| RC-C | 几何 | 切 none 后 **无压实**，外框缝保留 | BUG-10 RC-6；`pixelMarkLine` 外框/中线吸附混用 |
| RC-D | 持久化 | 缩放双轨导致观感漂移 | BUG-10 RC-4 待修 |

## 与 BUG-10 关系

- BUG-10：保存/重开 **间隙量变化**（normalize 不对称）→ R1 已修
- BUG-11：**用户显式 none** 仍见缝 → 需 **压实 + 配置探针 + 续 Phase 2**

## 验收标准

1. `gapPreset=none` 保存重开 → `--dashboard-shape-gap: 0px`
2. 外框相切组件 → 无画板色条（手测 + `gapRuntimeProbe` 单测）
3. `md → none` → 自动或一键压实后满足 (2)
4. 编辑/预览/重开三态一致

## 修复记录

| 轮次 | 内容 | 状态 |
|------|------|------|
| R0 | 根因剖析 + Headless Plan | ✅ 2026-07-15 |
| R1 | gapCompaction + gapRuntimeProbe + applyStyleConfig 压实 + none roundtrip 测试 | ✅ 2026-07-15 |
