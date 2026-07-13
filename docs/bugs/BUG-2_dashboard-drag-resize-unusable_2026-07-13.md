# BUG-2：看板编辑页拖拽/缩放不可用（或无效）

> 最近更新 2026-07-13

| 字段 | 值 |
|------|-----|
| 状态 | 🔧 fixing |
| 优先级 | P0 |
| 发现日期 | 2026-07-13 |
| 影响范围 | Dashboard 编辑画布（DASH-002） |
| 数据来源 | 用户反馈（L2）；源码取证（L1） |
| 关联 | `docs/superpowers/specs/2026-07-13-dashboard-de-canvas-design.md` · BUG-1 |

## 问题总览

| # | 根因 | 状态 | 说明 |
|---|------|------|------|
| 1 | 交互中每帧 `compactLayoutVertical` 与 RGL 受控 layout 打架 | ✅ 已修代码 | `applyLiveLayout` 仅 `setLayout`；待人工验证 |
| 2 | 后端 `LayoutWidget` **无** `gridX`/`gridY`，保存 `model_dump` 剥离坐标 | ✅ 已修代码 | schema + 往返测；待人工验证 |
| 3 | 仅 `.dashboard-drag-handle` 可拖 + 手柄默认不可点 | ✅ 已修代码 | 选中常显手柄 + 标题栏 aria/title；待人工验证 |
| 4 | 无真实指针 E2E，回归靠人工 | 🔲 门控中 | 契约 Q2=A |

---

## 现象描述

[用户反馈] 画布「只能看」：拖拉拽与大小调整完全不能使用。

- 期望：编辑模式下可稳定拖移 widget、八向调整大小，松手后位置/尺寸可保存并重载保持。
- 实际：拖放/缩放不可用或无效（含「拖了保存后仍回去」类感知）。
- 触发：编辑页交互；人工硬刷复现门控（契约 Q2=A）。

---

## 根因 1：交互中压缩布局 ✅ 已修代码

**代码证据**（修复后 `DashboardGrid.tsx`）：

```typescript
const applyLiveLayout = useCallback((next: Layout) => {
  setLayout(stripDropPlaceholder(next));
}, []);
// onLayoutChange 仅 interacting 时 applyLiveLayout；stop 时 normalizeGridLayout
```

**[推断]** 若此前每帧 compact，会与 RGL 拖拽中间态冲突，表现为弹回/拖不动。

### 修复详情（2026-07-13）

| 文件 | 改动 |
|------|------|
| `fe/src/components/dashboard/DashboardGrid.tsx` | 交互中不 compact |
| `fe/src/index.css` | 手柄放大至 12px |

**验证**：待用户硬刷后按契约 Q2=A 手测。

---

## 根因 2：保存剥离 grid 坐标 🔲 待修复

**代码证据（L1）**：

- FE 持久化 `gridX`/`gridY`：`gridLayoutAdapter.ts` → `gridLayoutToWidgets` 写回；`layoutUtils.ts` 类型含可选字段。
- BE `LayoutWidget`（`backend/app/dashboard/schemas.py` L30–39）仅有 `colSpan`/`rowSpan`/`order`，**无** `gridX`/`gridY`。
- `update_layout`（`service.py` L216–240）：`view.layout.model_dump(by_alias=True)` 写回 DB → 未建模字段被丢弃。
- 重载后 `widgetsToGridLayout`：缺坐标则走 `packFlowLayout` 重排。

**数据流**：

```text
用户拖到 (x,y) → FE layoutJson 含 gridX/gridY
  → PUT layout → DashboardLayout.model_validate → model_dump
  → DB 无坐标 → GET 回来只有 colSpan/rowSpan/order
  → packFlowLayout → 位置「没了」
```

**影响量化**：只要走保存/重载路径，**100%** 丢失显式坐标（除非仅靠 order 流式排列碰巧一致）。

---

## 根因 3：拖放/缩放入口过窄 🔲 待修复

**代码证据（L1）**：

- `dashboardGridRgl.tsx` L88：`draggableHandle=".dashboard-drag-handle"`
- `index.css` L222–226：手柄默认 `opacity:0; pointer-events:none`，仅 hover/选中才可点

---

## 改进优先级汇总

| 优先级 | 动作 | 对应根因 |
|--------|------|----------|
| P0 | 后端 schema 贯通 `gridX`/`gridY`（及 FE 断言保存往返） | #2 |
| P0 | 人工验证根因 #1 修复是否足够「能拖」 | #1 |
| P1 | 选中常显手柄；标题栏拖拽提示；必要时边框可拖 | #3 |
| P2 | Playwright 指针拖放 | #4 |
| 门控失败 | 按契约切 **像素画布**（见 headless plan Phase B） | 产品路径 |

---

## 修复记录

| 轮次 | 日期 | 内容 | 结果 |
|------|------|------|------|
| R0 | 2026-07-13 | 交互中停 compact + 手柄样式 | 待人工验证 |
| R1 | 2026-07-13 | A1 gridX/Y + rowSpan≤24；A2 往返测；A3 UX | 自动化绿；待 PhaseA 人工门控 |
