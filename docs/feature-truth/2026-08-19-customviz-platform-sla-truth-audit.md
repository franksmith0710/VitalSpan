# Feature Truth Audit：customViz 平台 SLA（AIVIZ-017）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-19 |
| 核验范围 | AIVIZ-017 / `docs/specs/customviz-platform-sla.md` 验收 V1–V8 |
| 锚点 | `customVizRuntime.ts` · `CustomVizWidget.tsx` · `backend/app/ai_viz/models.py` · `docs/api/vs-ai-spec/` |
| 总体判定 | **PARTIAL**（复验 #2 · 2026-08-19 13:55） |
| **总分 / 档位** | **7.5/10 · B** |
| 状态 | verified |
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
| 4 | truncated 壳层 | 通（UI 单测） | `CustomVizWidget.test.tsx` 501 行 |
| 5 | 查看数据 | 通（UI 单测） | `WidgetContextMenu.test.tsx` customViz |
| 6 | d3 resize/抽稀 | **部分** | `axisPlan.test.tsx` resize + `customVizHost.examples.test.ts` 官方 d3 40 类目抽稀；**缺**官方 d3 layout 变宽后 SVG 尺寸 L1 |

## 3. 子能力判定表

| ID | 子能力 | 判定 | 总分/档 | 证据摘要 |
|----|--------|------|---------|----------|
| V3 | vsCv.mount | **REAL**（CHAIN） | 8/B | vitest mount 320→640 |
| V4 | axisPlan | **REAL**（CHAIN+UI） | 8/B | payload 单测 + widget 集成 + 官方 d3 抽稀 |
| V6 | 入库 lint | **REAL**（CHAIN） | 9/A | pytest mount/root 规则 |
| V7 | 规范文档 | **REAL**（GATE+静态） | 8/B | PLATFORM-SLA/HANDOFF/zip 已更新 |
| V1 | d3 resize+抽稀 E2E | **PARTIAL** | 7/B | 官方 d3 40 类目抽稀 ✅；layout 变宽 SVG 铺满 ❌ |
| V2 | truncated 横幅 | **REAL**（UI） | 8/B | `CustomVizWidget.test.tsx` 501 行横幅 |
| V5 | 查看数据 | **REAL**（UI+静态链） | 8/B | 菜单单测 + `DashboardEditPage` 接 WidgetViewDataDialog |
| V8 | binding 状态机 | **PARTIAL** | 7/B | mount+unbound ✅；empty/error mount 未单测 |

## 3b. 前端控件下钻（V5 相关）

| ID | 文案/位置 | handler | 期望 | 实际 | L | C | D | E | F | 总分 | 判定 | 证据 |
|----|-----------|---------|------|------|---|---|---|---|---|------|------|------|
| B1 | 右键「查看数据」（chart） | `WidgetContextMenu` | 打开对话框 | 单测触发 onViewData | 2 | 2 | 2 | 2 | 2 | 10 | REAL | `WidgetContextMenu.test.tsx` |
| B2 | 右键「查看数据」（customViz） | 同上 | 同 B1 | userEvent 触发 onViewData | 2 | 2 | 2 | 2 | 2 | 10 | REAL | `WidgetContextMenu.test.tsx` |
| B3 | 图表盘 customViz 磁贴 | `ChartPickerPopover` | 拖入创建 widget | 列表来自 GET artifacts | 1 | 2 | 2 | 2 | 2 | 9 | PARTIAL | DB 2 条合规样例 |

T 映射：V5 → B1,B2；V1 → 画布 resize（未列 B，§4 动态缺）

## 3d. 覆盖矩阵（必验 8 = spec V1–V8）

| 实体 ID | 类型 | GATE | CHAIN | UI | BROWSER | 深度 | L | C | 判定 | 证据 |
|---------|------|------|-------|-----|---------|------|---|---|------|------|
| V1 | d3 E2E | ✅ mount+axisPlan | ✅ widget+官方 d3 抽稀 | ✅ mock resize | ❌ | CHAIN+UI | 2 | 2 | **PARTIAL** | `axisPlan.test.tsx` · `customVizHost.examples.test.ts` |
| V2 | truncated UI | ✅ 组件有 testid | ❌ | ✅ 501 行单测 | ❌ | UI | 2 | 2 | **REAL** | `CustomVizWidget.test.tsx` |
| V3 | mount | ✅ API 存在 | ✅ vitest | ❌ | ❌ | CHAIN | 2 | 2 | **REAL** | `customVizHost.test.ts` |
| V4 | axisPlan | ✅ payload 字段 | ✅ build 单测 | ✅ widget+官方 d3 | ❌ | CHAIN+UI | 2 | 2 | **REAL** | `customVizHost.examples.test.ts` dense labels |
| V5 | 查看数据 | ✅ 菜单+Page 接线 | ❌ | ✅ customViz 菜单单测 | ❌ | UI | 2 | 2 | **REAL** | `WidgetContextMenu.test.tsx` · `DashboardEditPage.tsx:665` |
| V6 | 入库 lint | ✅ | ✅ pytest | ❌ | ❌ | CHAIN | 2 | 2 | **REAL** | `test_ai_viz_bundle.py` |
| V7 | 规范 | ✅ 文件在仓 | ❌ | — | — | GATE | 2 | 2 | **REAL** | HANDOFF/PLATFORM-SLA |
| V8 | 状态机 | ✅ 示例脚本 | ✅ mount+unbound | ✅ html 引导 | ❌ | CHAIN | 2 | 1 | **PARTIAL** | empty/error mount 缺 |

### 覆盖摘要

| 指标 | 值 |
|------|-----|
| 必验实体 | 8 |
| GATE only | 0 |
| CHAIN REAL/PARTIAL | 6（V1/V8 PARTIAL · V3/V4/V6 REAL） |
| UI / BROWSER | **3 UI**（V1/V2/V5）；BROWSER 0 |
| NONE（完全未验） | 0 |
| REAL 达标 | **6/8**（V2/V3/V4/V5/V6/V7） |
| **逐一校验** | **否** — V1 缺官方 d3 layout→SVG 尺寸 L1；V8 缺 empty/error mount |
| **总体可否 REAL** | **否**（V1 + V8 仍 PARTIAL） |

## 3c. 五维评分汇总（功能块加权）

| ID | L | C | D | E | F | 总分 | 档位 | 真假 |
|----|---|---|---|---|---|------|------|------|
| V3 mount | 2 | 2 | 2 | 2 | 2 | 10 | A | REAL |
| V6 lint | 2 | 2 | 2 | 2 | 2 | 10 | A | REAL |
| V1 E2E | 2 | 2 | 2 | 2 | 1 | 9 | A | PARTIAL |
| V2 banner | 2 | 2 | 2 | 2 | 2 | 10 | A | REAL |
| V5 view data | 2 | 2 | 2 | 2 | 1 | 9 | A | REAL |
| V8 states | 2 | 1 | 2 | 2 | 2 | 9 | A | PARTIAL |

**打通但不对**：0  
**假功能/壳**：无（V2 已 UI 证明）

## 4. 动态验证记录（期望 vs 实际）

| 步骤 | 操作 | 期望 | 实际 | 一致？ | 证据 |
|------|------|------|------|--------|------|
| 1 | `vitest` customViz 主套件（8 文件） | 全绿 | **40 passed** | ✅ | 2026-08-19 13:55 |
| 1c | `vitest customVizHost.examples.test.ts` | 官方 d3 40 类目抽稀 | 9 passed（含 dense labels） | ✅ | 同上 |
| 2 | `pytest test_ai_viz_bundle.py` | d3 无 mount 422 | 8 passed | ✅ | 同上 |
| 3 | 官方 d3 示例静态 | mount+axisPlan；无裸 320 主路径 | mount/axisPlan true；含 onLayout **兼容兜底** | ✅ | node grep |
| 4 | CustomVizWidget >500 行 | truncated 横幅 | 文案正确 | ✅ | `CustomVizWidget.test.tsx` |
| 5 | 40 行 layout 320→640 | axisPlan tick 增密 | 5→11（mock mount） | ✅ | `CustomVizWidget.axisPlan.test.tsx` |
| 5b | 官方 d3 + 40 行 @320 | 轴标签少于 40 | labels.length < 40 | ✅ | `customVizHost.examples.test.ts` |
| 6 | customViz 右键查看数据 | onViewData | userEvent 通过 | ✅ | `WidgetContextMenu.test.tsx` |
| 7 | **合计** | 全绿 | **49 vitest + 8 pytest** | ✅ | 复验 #2 |

## 5. 修复文档（P0）

### V0 — CustomVizWidget.payload 单测漂移 ✅ 已修

**状态**：`CustomVizWidget.payload.test.tsx` 已 mock `useElementSize` 并断言 `layout`/`axisPlan`。

### V1 — d3 端到端 resize/抽稀（PARTIAL，待 BROWSER 可选）

**状态**：`CustomVizWidget.axisPlan.test.tsx` — 40 类目、layout 320→640、mount 消费 axisPlan。  
**剩余**：官方 d3 artifact 浏览器走查（SVG 铺满）未做；不影响 SLA 机制 REAL。

### V2 — truncated 壳层横幅 ✅ 已修

**状态**：`CustomVizWidget.test.tsx` mock 501 行 → 横幅文案 L1 通过。

### V5 — customViz 查看数据 ✅ 已修

**状态**：`WidgetContextMenu.test.tsx` customViz `onViewData` 单测 REAL。

### V8 — mount + unbound ✅ / empty·error ⚠️

**状态**：unbound mount 单测 + 5 个官方 html/d3 引导态单测。  
**缺口**：`bindingStatus: empty|error` 未在 mount render 路径单测（仅 `customVizPayload.test.ts` 状态解析）。

## 6. 结论（是否真实可用）

| 维度 | 结论 |
|------|------|
| **平台机制（mount/axisPlan/lint）** | **真实可用** — CHAIN 单测 + pytest 绿 + 合规样例已入库 |
| **用户可感知体验（V1/V2/V5）** | **V2/V5 REAL**；V1 官方 d3 抽稀已验，**layout 变宽→SVG 铺满**仍缺 L1 |
| **运维** | 无 DELETE API；清库需 DBA（已在 engine-separation-truth 注明） |

**总体**：**PARTIAL · 7.5/10 · B** — **6/8 REAL**；底座 SLA **可交付**；剩 V1 SVG resize、V8 empty/error mount 为可选补强。

## 7. 交接

- ✅ P0 已实施；复验 #2：**49 vitest + 8 pytest 全绿**
- 可选补强：官方 d3 `layout` 变宽单测 / BROWSER；V8 empty·error mount 单测 → 总体 REAL
