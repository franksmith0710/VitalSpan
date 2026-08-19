# Feature Truth Audit：customViz 平台 SLA（AIVIZ-017）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-19 |
| 核验范围 | AIVIZ-017 / `docs/specs/customviz-platform-sla.md` 验收 V1–V8 |
| 锚点 | `customVizRuntime.ts` · `CustomVizWidget.tsx` · `backend/app/ai_viz/models.py` · `docs/api/vs-ai-spec/` |
| 总体判定 | **PARTIAL** |
| **总分 / 档位** | **6.5/10 · C** |
| 状态 | draft |
| **sampling** | `full`（8 条 spec 验收项全列 §3d） |

## 1. 核验标准与预期（spec V1–V8）

| ID | 期望行为（可观察） | 依据 |
|----|-------------------|------|
| V1 | 官方 d3 样例：40+ 类目可读；拖大组件 SVG 随 layout 铺满；artifact 无手写 onLayout | spec §可观察验收 V1 |
| V2 | >500 行时壳层 truncated 横幅（非 bundle 自写） | spec V2 |
| V3 | `vsCv.mount` 在 payload/layout 变化时自动调用 renderFn | spec V3 |
| V4 | payload 含 `axisPlan`；d3 官方示例消费 tick 索引 | spec V4 |
| V5 | customViz 右键「查看数据」→ `WidgetViewDataDialog` | spec V5 |
| V6 | d3 无 mount → POST 422；禁 root/app id | spec V6 |
| V7 | PLATFORM-SLA / HANDOFF / PROTOCOL 双轨一致 | spec V7 |
| V8 | mount 下 unbound/empty/error 态正确 | spec V8 |

非目标：Phase 2 `vsCv.draw.*`、Phase 3 `renderAs`、大屏 DataScreen 全页 parity（未在 spec V5 单列）。

## 2. 完整链路图

```text
POST artifact → validate_bundle → ai_viz_artifacts
  → ChartPicker 列表 → 拖入 customViz widget
  → CustomVizWidget GET entry → mountCustomVizHtml → attachCustomVizRuntime
  → useChartExecute → buildPayload(axisPlan/layout/truncated) → inject → mount(render)
  → 右键查看数据 → WidgetViewDataDialog
```

| 序 | 层 | 状态 | L1 证据 |
|----|----|------|---------|
| 1 | 入库 lint | 通 | `pytest test_ai_viz_bundle.py` 8 passed |
| 2 | mount 生命周期 | 通（单测） | `customVizHost.test.ts` mount 用例 |
| 3 | axisPlan 注入 | 通（单测） | `customVizPayload.test.ts` |
| 4 | truncated 壳层 | **未动态验 UI** | 代码有 `data-testid=custom-viz-truncated-banner`，无单测 |
| 5 | 查看数据 | **部分** | 菜单条件已扩；无 customViz 单测/浏览器 |
| 6 | d3 端到端 resize/抽稀 | **未验** | 无 40 行 + resize 集成/浏览器 |

## 3. 子能力判定表

| ID | 子能力 | 判定 | 总分/档 | 证据摘要 |
|----|--------|------|---------|----------|
| V3 | vsCv.mount | **REAL**（CHAIN） | 8/B | vitest mount 320→640 |
| V4 | axisPlan | **PARTIAL** | 7/B | payload 单测 ✅；bundle 消费仅静态 grep |
| V6 | 入库 lint | **REAL**（CHAIN） | 9/A | pytest mount/root 规则 |
| V7 | 规范文档 | **REAL**（GATE+静态） | 8/B | PLATFORM-SLA/HANDOFF/zip 已更新 |
| V1 | d3 resize+抽稀 E2E | **UNVERIFIED** | 3/D | 无 BROWSER/集成 |
| V2 | truncated 横幅 | **STUB** | 4/D | 有 DOM 钩子，无 L1 对比 |
| V5 | 查看数据 | **PARTIAL** | 6/C | 代码接线；仅 chart 菜单单测 |
| V8 | binding 状态机 | **PARTIAL** | 6/C | 官方 html 示例有引导；mount 单测未覆盖 unbound |

## 3b. 前端控件下钻（V5 相关）

| ID | 文案/位置 | handler | 期望 | 实际 | L | C | D | E | F | 总分 | 判定 | 证据 |
|----|-----------|---------|------|------|---|---|---|---|---|------|------|------|
| B1 | 右键「查看数据」（chart） | `WidgetContextMenu` | 打开对话框 | 单测触发 onViewData | 2 | 2 | 2 | 2 | 2 | 10 | REAL | `WidgetContextMenu.test.tsx` |
| B2 | 右键「查看数据」（customViz） | 同上 | 同 B1 | **未单测/未浏览器** | 1 | 1 | 1 | 1 | 1 | 5 | PARTIAL | `WidgetContextMenu.tsx:168` 条件已扩 |
| B3 | 图表盘 customViz 磁贴 | `ChartPickerPopover` | 拖入创建 widget | 列表来自 GET artifacts | 1 | 2 | 2 | 2 | 2 | 9 | PARTIAL | DB 2 条合规样例 |

T 映射：V5 → B1,B2；V1 → 画布 resize（未列 B，§4 动态缺）

## 3d. 覆盖矩阵（必验 8 = spec V1–V8）

| 实体 ID | 类型 | GATE | CHAIN | UI | BROWSER | 深度 | L | C | 判定 | 证据 |
|---------|------|------|-------|-----|---------|------|---|---|------|------|
| V1 | d3 E2E | ✅ 示例含 mount+axisPlan | ❌ | ❌ | ❌ | GATE | 1 | 1 | **UNVERIFIED** | `node` grep 示例 JSON |
| V2 | truncated UI | ✅ 组件有 testid | ❌ | ❌ | ❌ | GATE | 1 | 1 | **STUB** | `CustomVizWidget.tsx:226` |
| V3 | mount | ✅ API 存在 | ✅ vitest | ❌ | ❌ | CHAIN | 2 | 2 | **REAL** | `customVizHost.test.ts` |
| V4 | axisPlan | ✅ payload 字段 | ✅ build 单测 | ❌ | ❌ | CHAIN | 2 | 2 | **PARTIAL** | bundle 消费未跑 |
| V5 | 查看数据 | ✅ 菜单条件 | ❌ | ❌ customViz | ❌ | GATE | 1 | 1 | **PARTIAL** | `DashboardEditPage.tsx` |
| V6 | 入库 lint | ✅ | ✅ pytest | ❌ | ❌ | CHAIN | 2 | 2 | **REAL** | `test_ai_viz_bundle.py` |
| V7 | 规范 | ✅ 文件在仓 | ❌ | — | — | GATE | 2 | 2 | **REAL** | HANDOFF/PLATFORM-SLA |
| V8 | 状态机 | ✅ 示例脚本 | ✅ 部分 host | ❌ | ❌ | CHAIN | 2 | 1 | **PARTIAL** | 无 mount+unbound 单测 |

### 覆盖摘要

| 指标 | 值 |
|------|-----|
| 必验实体 | 8 |
| GATE only | 3（V1/V2/V5 平台侧） |
| CHAIN REAL/PARTIAL | 4（V3/V4/V6/V8） |
| UI / BROWSER | **0** |
| NONE（完全未验） | 1（V1 端到端） |
| REAL 达标 | **3/8**（V3/V6/V7） |
| **逐一校验** | **否** — V1/V2/V5 缺 UI/BROWSER L1 |
| **总体可否 REAL** | **否** |

## 3c. 五维评分汇总（功能块加权）

| ID | L | C | D | E | F | 总分 | 档位 | 真假 |
|----|---|---|---|---|---|------|------|------|
| V3 mount | 2 | 2 | 2 | 2 | 2 | 10 | A | REAL |
| V6 lint | 2 | 2 | 2 | 2 | 2 | 10 | A | REAL |
| V1 E2E | 0 | 0 | 1 | 1 | 1 | 3 | F | UNVERIFIED |
| V2 banner | 1 | 1 | 2 | 1 | 1 | 6 | C | STUB |
| V5 view data | 1 | 1 | 2 | 2 | 2 | 8 | B | PARTIAL |

**打通但不对**：0  
**假功能/壳**：V2（有 UI 代码无 L1 证明）

## 4. 动态验证记录（期望 vs 实际）

| 步骤 | 操作 | 期望 | 实际 | 一致？ | 证据 |
|------|------|------|------|--------|------|
| 1 | `vitest customVizHost + payload + layoutHelpers` | 全绿 | 21 passed | ✅ | 2026-08-19 |
| 1b | `vitest CustomVizWidget.payload.test.tsx` | 与 axisPlan/layout 断言一致 | **1 failed**（期望缺 layout/axisPlan） | ❌ | 测试漂移，非运行时断 |
| 2 | `pytest test_ai_viz_bundle.py` | d3 无 mount 422 | 通过 | ✅ | 8 passed |
| 3 | DB 2 条官方样例 | entry 含 `vsCv.mount` | 均为 true | ✅ | python 查库 |
| 4 | CustomVizWidget >500 行 | 见 truncated 横幅 | **未执行 UI 渲染** | ❌ | 无单测 |
| 5 | 看板拖 D3 样例 + 绑 40 行 + 拖大 | 轴可读、SVG 铺满 | **未执行浏览器** | ❌ | — |
| 6 | customViz 右键查看数据 | 对话框出表 | **未执行 userEvent** | ❌ | — |

## 5. 修复文档（P0）

### V0 — CustomVizWidget.payload 单测漂移（BROKEN test）

**判定**：测试红  
**期望 vs 实际**：注入 payload 现含 `layout` + `axisPlan`；`CustomVizWidget.payload.test.tsx` 仍断言旧 shape。  
**修复方向**：更新期望 JSON 或 assert subset。  
**修后验收**：`pnpm vitest CustomVizWidget.payload.test.tsx` 绿。

### V1 — d3 端到端 resize/抽稀（UNVERIFIED）

**判定**：3/10 · F  
**期望 vs 实际**：spec 要求 40+ 类目可读且拖大铺满；仅有 CHAIN 单测与静态合规示例，**无 L1 画布证据**。  
**根因**：缺集成测（mock 501 rows + layout 变化 + mount render 断言 tick 数）或 BROWSER 走查。  
**修复方向**：`CustomVizWidget.loop.test.tsx` 扩 40 行 + resize；或 MCP 浏览器 snapshot 绑官方 d3 artifact。  
**修后验收**：BROWSER 或 UI 集成 L≥2 C≥2 → REAL。

### V2 — truncated 壳层横幅（STUB）

**判定**：4/10 · D  
**期望 vs 实际**：代码有横幅与 testid；`useChartExecute` mock 默认 0 行，**无测试 mock 501 行验证文案出现**。  
**根因**：`CustomVizWidget.test.tsx` 未覆盖 truncated 分支。  
**修复方向**：mock `rows.length=501` + `capRows` → expect `custom-viz-truncated-banner` 文案。  
**修后验收**：UI 单测 C≥2。

### V5 — customViz 查看数据（PARTIAL）

**判定**：6/10 · C  
**期望 vs 实际**：`WidgetContextMenu` 已支持 customViz；`WidgetContextMenu.test.tsx` 仍只验 chart。  
**根因**：缺 customViz widget type 的菜单单测 + `DashboardEditPage` smoke。  
**修复方向**：复制 chart 用例改 `type: customViz`。  
**修后验收**：B2 REAL。

### V8 — mount + unbound（PARTIAL）

**判定**：6/10 · C  
**期望 vs 实际**：官方 html 示例有引导；mount 单测只验 bound+layout。  
**修复方向**：mount 单测增 `bindingStatus: unbound` 断言 render 被调用且 payload 正确。

## 6. 结论（是否真实可用）

| 维度 | 结论 |
|------|------|
| **平台机制（mount/axisPlan/lint）** | **真实可用** — CHAIN 单测 + pytest 绿 + 合规样例已入库 |
| **用户可感知体验（V1/V2/V5）** | **未充分证明** — 无浏览器/集成 L1，不能标总体 REAL |
| **运维** | 无 DELETE API；清库需 DBA（已在 engine-separation-truth 注明） |

**总体**：**PARTIAL · 6.5/10 · C** — 底座 SLA **工程上已接通**，但 spec 要求的 **端到端可观察验收（resize/横幅/查看数据）尚未 L1 验证**，不宜对外宣称「全面 REAL」。

## 7. 交接

- 批准修 P0 → 补 3 个单测 + 可选 browser 走查 V1  
- 或交接 `root-first-solve` 仅修 V2/V5 单测（最快提升到 7.5/10 B）
