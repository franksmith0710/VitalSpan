# Dashboard 画布对标 DataEase 设计方案

日期：2026-07-13  
状态：**待评审**（2026-07-13 交互审查：暂不换库，先修 P0）  
关联：DASH-002 · `docs/bugs/BUG-1_dashboard-chart-clipped_2026-07-13.md` · `fe/src/components/dashboard/`

---

## 0. 交互审查结论（2026-07-13）

**用户反馈**：「只能看，拖拉拽和调大小完全不能用。」

**审查结论：暂不建议换库**；当前问题以 **实现缺陷 + UX 缺口** 为主，不是 react-grid-layout 选型错误。

| 问题 | 证据（L1） | 严重度 | 处置 |
|------|-----------|--------|------|
| 拖拽/缩放过程中调用 `compactLayoutVertical` | `DashboardGrid.tsx` `applyLiveLayout` 在 `onDrag/onResize/onLayoutChange` 每帧压缩 | **P0** | **已回滚**：交互中仅 `setLayout`，松手再 `normalizeGridLayout` |
| 缩放手柄 8px + 默认 `pointer-events:none` | `index.css` L217-238 | P1 | 已放大至 12px、贴边放置 |
| 只能拖标题栏 `.dashboard-drag-handle` | `dashboardGridRgl.tsx` `draggableHandle` | P1 UX | 待加提示或允许边框拖 |
| 测试绿但无真实指针 E2E | vitest 仅单测/ smoke mock | P2 | 补 Playwright 拖放用例 |

**换库决策**：在 P0 修复并人工验证通过前，**否决**迁移 gridstack / 像素画布；若验证后仍失败，再评估 snapgrid 或 gridstack（见 §4）。

---

## 1. 调研结论：无「DE 级看板画布」开箱成品

### 1.1 不存在的产品形态

市场上**没有**可直接 npm install 即获得 DataEase `editor-canvas-main` + `canvas-mark-line` + `shape-point` 完整体验的「BI 看板画布」成品库。DataEase 为自研 Vue 画布，不开源该编辑器模块；VitalSpan 约束 NFR-08 **零 DE 运行时依赖**，不能嵌入 DE 组件。

### 1.2 第三方库评估（2026-07）

| 库 | Stars/成熟度 | 对标 DE 能力 | 结论 |
|----|-------------|-------------|------|
| **[react-grid-layout](https://github.com/react-grid-layout/react-grid-layout)**（已用 v2.2） | 高 · 业界标准 | 栅格拖放/缩放/紧凑；**无** mark-line；v2 有 `GridBackground` 可自绘参考栅格 | **保留为布局引擎** |
| **[gridstack.js](https://github.com/gridstack/gridstack.js)** | 高 · 7k+ | 仪表板专用、八向 resize、移动端；**无**对齐参考线 | 换库收益低，迁移成本中 |
| **[snapgrid](https://snapgrid.dev/)** | 新 · RGL v2 替代 | dnd-kit 驱动、snapToGrid；**无**元素间对齐线 | 不解决 mark-line 诉求 |
| **[react-moveable](https://github.com/daybrush/moveable)** | 高 · moveable 生态 | **Snappable** + `elementGuidelines` ≈ DE mark-line；八向 resize ≈ shape-point；需自管布局状态 | **推荐叠加层** |
| **[react-gridy-canvas](https://github.com/fuvl/react-gridy-canvas)** | **0 stars** · 无社区 | 文档宣称 Figma 式 snap lines | **否决**（未生产可用） |
| **[Puck](https://puckeditor.com/)** / Craft.js | 中 | 页面搭建器，非 BI widget 栅格 | **域不匹配** |
| **Konva / tldraw** | 高 | 自由画布/设计工具 | 过重，需重写 widget 渲染与 layout 契约 |

### 1.3 行业参照

| 产品 | 画布技术 |
|------|----------|
| Apache Superset | react-grid-layout |
| Grafana | 自研 grid |
| DataEase | 自研像素画布 + mark-line 层 |
| VitalSpan（现） | react-grid-layout + 自研 adapter |

**结论**：对标 DE **对齐参考线 + 精细缩放**，最可行路径是 **保留 RGL + 叠加 react-moveable Snappable**（或自绘 SVG 参考线），而非更换整体布局库。

---

## 2. 目标与非目标

### 2.1 目标（分阶段）

| 阶段 | 用户可感知能力 | 对标 DE |
|------|---------------|---------|
| **P1** | 拖拽/缩放时出现**对齐参考线**（组件边/中心/画布中线） | `canvas-mark-line` |
| **P1** | 多选后**对齐/分布**工具栏 | DE 编辑栏 |
| **P1** | 图表在 widget 内**完整自适应**（BUG-1 收口） | 图表区 |
| **P2** | 细栅格（24/48 列）或亚像素吸附，缩放更「无极」 | shape-point 手感 |
| **P3**（可选） | 像素坐标 `x/y/width/height` 布局 + 迁移 | 完全同等 |

### 2.2 非目标

- 不引入 DataEase / Superset 运行时（NFR-08）
- 不在 P1 改动 `layoutJson` 后端契约（仍 `colSpan/rowSpan/gridX/gridY`）
- 不做旋转、倾斜、组合变形（DE 看板亦少见）

---

## 3. 推荐方案：RGL + MarkLine 叠加层（P1）

### 3.1 架构

```text
DashboardEditWorkspace
└── DashboardGrid
    ├── DashboardRglCanvas          ← 布局真理源（现有）
    │     └── widgets (grid items)
    └── DashboardMarkLineOverlay    ← 新增，pointer-events: none
          └── 拖拽/缩放时绘制 SVG 参考线
```

**交互分工**：

| 层 | 职责 |
|----|------|
| `react-grid-layout` | 落点、碰撞、紧凑、`layoutJson` 序列化 |
| `DashboardMarkLineOverlay` | 仅视觉 + 吸附计算，不写库 |
| `gridSnapUtils` | 扩展：吸附到邻 widget 边缘/中心（栅格单位） |

### 3.2 Mark-line 实现（二选一，推荐 A）

**方案 A — 自绘 SVG（推荐 P1）**

- 在 `onDrag` / `onResize` 时根据当前 item 与其它 item 的栅格边界计算对齐线
- 用 `gridSpanToPixelHeight` + RGL `rowHeight/margin` 换算为像素坐标画线
- 吸附：松手前将 `x/y/w/h` 对齐到最近参考（阈值 1 列 / 半行）
- **依赖**：无新 npm 包
- **工作量**：约 2–3 人日

**方案 B — react-moveable Snappable**

- 编辑态选中 widget 时挂载 `Moveable`（`snappable` + `elementGuidelines={其它 widget DOM}`）
- 拖拽结束将像素 bbox 反算为栅格 `x/y/w/h` 写回 RGL
- **风险**：RGL 与 Moveable 双控制器冲突，需「交互模式」互斥
- **工作量**：约 4–5 人日

**推荐 P1 用方案 A**；若 A 吸附手感不足再引入 B。

### 3.3 多选对齐工具栏（P1）

- 复用现有 `selectedIds` + Shift 多选（`DashboardEditPage` 已有）
- 画布顶栏增加：左对齐 / 右对齐 / 顶对齐 / 底对齐 / 水平居中 / 垂直等距
- 实现：纯栅格坐标运算后 `setWidgets` + `onLayoutChange`
- **工作量**：约 1–2 人日

### 3.4 文件改动范围（P1）

| 文件 | 改动 |
|------|------|
| `fe/src/components/dashboard/DashboardMarkLineOverlay.tsx` | **新增** SVG 参考线 |
| `fe/src/components/dashboard/gridSnapUtils.ts` | 吸附算法、邻组件边界 |
| `fe/src/components/dashboard/DashboardGrid.tsx` | 挂载 overlay、drag/resize 回调 |
| `fe/src/components/dashboard/DashboardAlignToolbar.tsx` | **新增** 多选对齐 |
| `fe/src/pages/admin/dashboard/DashboardEditPage.tsx` | 工具栏入口 |
| `fe/src/components/dashboard/DashboardGrid.interaction.test.tsx` | mark-line / 对齐用例 |
| `docs/bugs/BUG-1_*.md` | 图表裁切验证后改 fixed |

**不改**：`backend/app/dashboard/schemas.py`（P1）

---

## 4. 备选方案对比

| 方案 | 描述 | 工期 | DE 相似度 | 风险 |
|------|------|------|-----------|------|
| **推荐 P1** | RGL + 自绘 mark-line + 对齐栏 | 4–6 人日 | ~75% | 低 |
| P1-B | RGL + react-moveable Snappable | 5–7 人日 | ~80% | 双引擎冲突 |
| P2 | 换 gridstack.js | 5–8 人日 | ~60% | 回归大、仍无 mark-line |
| P3 | 像素画布 + layout v2 schema | 15–25 人日 | ~95% | 迁移、嵌入、分享全链路 |

---

## 5. P2：更「无极」的缩放（可选）

在保留 12 列 API 前提下：

1. **细栅格**：RGL `cols=48`，入库时 `colSpan = round(w * 12 / 48)`（前端换算，后端仍 1–12）
2. 或 **行高** 降至 16px、`maxH` 提高（已部分做 32px）

无需第三方库。

---

## 6. P3：像素布局契约（远期）

仅当 P1/P2 仍无法满足时启动。

### 6.1 layoutJson v2 草案

```json
{
  "version": 2,
  "canvas": { "width": "100%", "unit": "px" },
  "widgets": [{
    "id": "…",
    "x": 120, "y": 80, "width": 480, "height": 320,
    "zIndex": 1
  }]
}
```

- 后端 `LayoutWidget` 扩展可选字段；`version=1` 只读兼容
- 迁移脚本：`gridX/colSpan/rowSpan` → 像素（按画布宽度比例）
- 编辑器：**react-moveable** 为主交互引擎

---

## 7. 验收标准（P1）

| ID | 标准 |
|----|------|
| DE-CANVAS-01 | 拖拽 widget 时显示对齐参考线（≥ 邻组件边或画布中线） |
| DE-CANVAS-02 | 松手后 widget 吸附到参考线（阈值可配置，默认 1 栅格） |
| DE-CANVAS-03 | 多选 ≥2 组件可使用对齐/分布工具栏 |
| DE-CANVAS-04 | 八向缩放手柄可见（已实现，回归） |
| DE-CANVAS-05 | 保存布局后刷新位置/尺寸不变（GRID-05 回归） |
| DE-CANVAS-06 | 图表在 widget 内无裁切（BUG-1 关闭） |
| DE-CANVAS-07 | vitest + pytest 布局相关用例全绿 |

---

## 8. 决策建议

1. **不更换** react-grid-layout（与 Superset 同路线，团队已集成）
2. **不采用** 零 star 的「成品画布」库
3. **P1 立即做**：自绘 `DashboardMarkLineOverlay` + 多选对齐栏 + BUG-1 验证
4. **P3 暂缓**：除非产品明确要求像素级自由画布

---

## 9. 待用户确认

- [ ] 批准 **P1（RGL + 自绘 mark-line）** 进入 `plan.md` / 实施
- [ ] 或指定直接立项 **P3 像素画布**（周期与迁移需单独排期）
