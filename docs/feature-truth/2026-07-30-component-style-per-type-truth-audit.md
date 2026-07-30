# Feature Truth Audit: 组件专有样式（Chart Style per Type）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-30 |
| 核验范围 | 看板图表编辑「样式」Tab 类型专有 shape（P0：G1/G2/G8/G9/G10）；审计批次 P1 shape（G3/G4）；大屏素材样式（G20）；profile/metadata 门禁（G13/G14） |
| 锚点 | `ChartEditRail` → `ChartStylePanel` · `chartTypeStyleProfiles.ts` · `applyChartDeStyleBlocks` → `applyChartStyleChain` → D3 render · `ScreenVisualEditRail` |
| 总体判定 | **PARTIAL**（单元链路真通；UI 集成 smoke 断点；缺浏览器 300ms 预览 L1） |
| **总分 / 档位** | **7/10 · B** |
| 状态 | draft |

## 1. 核验标准与预期（来自 land-design / 对话）

| ID | 期望行为（可观察） | 依据 |
|----|-------------------|------|
| T1 | treemap / circle-packing 样式 Tab 出现专有折叠块；改 slider 后 `deStyle` 写入且 D3 渲染读对应 `plan.options` | land-design §10 G1/G2 |
| T2 | sankey / wordCloud 专有字段经 `applyChartStyleChain` 映射并在 render 中改变几何/字号 | land-design §10 G8/G9 |
| T3 | treemap 标签 section 改字号后 render 使用 `labelFontSize`（非硬编码 11px） | land-design §10 G10 |
| T4 | 44 活跃 chartType profile 非空；`plugin.properties` 镜像 profiles | land-design G14 + G13 |
| T5 | 大屏时钟/边框/图形/图标/标题/datetime 控件改值写入 `screenStyle` | land-design §10 G20 |
| T6 | quadrant / progress-bar / bullet / stock-line 专有 shape UI→apply→render | 审计批次 G3/G4（land-design §2 已登记） |
| T7 | 改样式后 **300ms 内** 看板预览可见变化 | land-design 成功标准 |

**非目标（Out）**：G5 双轴独立样式、G6 玫瑰专有、G7 表高级、G11 笛卡尔全矩阵、G16–G19 widget DE 扩展、在线地图样式。

---

## 2. 完整链路图

```
ChartStylePanel(sectionId)
  → ChartStyleSection / ChartTypeStyleSections / ChartCompareStyleSections
  → mutateChartConfig → patchChartDeStyleNested → chartConfig.deStyle
  → ChartInspectorProvider.onChange(chartConfig)
  → buildChartRenderPlan → applyChartStyleChain → applyChartDeStyleBlocksToPlan
  → buildRenderConfig → renderD3*Chart
  → SVG/DOM 预览
```

| 序 | 层 | 状态 | L1 证据 | 说明 |
|----|----|------|---------|------|
| 1 | 入口 | **通** | `ChartEditRail.smoke.test.tsx` Tab「样式」存在 | 挂载 Tab ✓ |
| 2 | 触发 | **断（集成）** | `ChartEditRail.smoke.test.tsx` 第 2 用例 **FAIL** | `chartStyleSectionRegistry.ts:53` `require("@/lib/chartTypeStyleProfiles")` Vitest 无法解析 |
| 3 | 协议 | N/A | 纯 FE 本地 `chartConfig` | 无独立 HTTP |
| 4 | 域逻辑 | **通** | `applyChartDeStyleBlocks.test.ts` · `applyChartStyleChain.test.ts` | deStyle 块 → options 映射正确 |
| 5 | 数据 | **部分** | `ChartInspectorProvider` `emitChange` 写 `chartConfig` | 看板保存/刷新持久化 **未在本轮 L1 验证** |
| 6 | 渲染 | **通（P0 型）** | `renderTreemap/Sankey/WordCloud/CirclePacking.test.ts` | DOM 断言几何/字号变化 |
| 7 | 异常态 | **未验** | — | 非法 slider 值、空数据图 **无专项测试** |

---

## 3. 子能力判定表

| ID | 子能力 | 判定 | 总分/档 | 证据摘要 |
|----|--------|------|---------|----------|
| T1 | P0 专有 shape UI + 渲染 | **PARTIAL** | 6/C | render/apply 单测 ✓；ChartStylePanel smoke **BROKEN**；无 slider 点击集成测 |
| T2 | sankey / wordCloud 链 | **REAL** | 8/B | applyChain + render 单测；节点宽/字号对比断言 |
| T3 | treemap 标签字号 G10 | **REAL** | 8/B | `renderTreemap.test.ts` `labelFontSize: 16` → `font-size: 16px` |
| T4 | profile + metadata G13/G14 | **REAL** | 9/A | 44 型 profile + `catalogParity` properties 镜像 |
| T5 | 大屏素材 G20 | **REAL** | 8/B | `ScreenVisualEditRail.test.tsx` 8 项 userEvent 全绿 |
| T6 | P1 compare/quadrant shape | **PARTIAL** | 5/C | apply 映射单测 ✓；**无 render 单测**；无 UI 点击测 |
| T7 | 300ms 预览反馈 | **UNVERIFIED** | — | 无 `.dev` / 无 Playwright 走查 |

---

## 3b. 前端控件下钻表（代表性 P0/P1 控件）

| ID | 文案/位置 | handler | 期望 | 实际 | L | C | D | E | F | 总分 | 判定 | 证据 |
|----|-----------|---------|------|------|---|---|---|---|---|------|------|------|
| B1 | treemap「内间距」slider | `ChartTypeStyleSections:294` `patch({ paddingInner })` | 写入 `deStyle.treemap.paddingInner` 并影响 cell 布局 | apply+render 单测证明 options→SVG；**无 UI 点击 L1** | 1 | 2 | 1 | 1 | 1 | **6** | PARTIAL | `applyChartDeStyleBlocks.test.ts` · `renderTreemap.test.ts` |
| B2 | circle-packing「布局间距」 | `ChartTypeStyleSections:311` | 写入 `circlePacking.layoutPadding` | render 测 `labelMinRadius` 阈值；padding **无 render 对比断言** | 1 | 1 | 1 | 1 | 1 | **5** | PARTIAL | `renderCirclePacking.test.ts` |
| B3 | sankey「节点宽度」 | `ChartTypeStyleSections:171` | 节点 rect 宽度随 slider 变 | render 8 vs 24 断言 ✓ | 1 | 2 | 1 | 1 | 1 | **6** | PARTIAL | `renderSankey.test.ts` · `applyChartStyleChain.test.ts:140` |
| B4 | wordCloud「最小字号」 | `ChartTypeStyleSections:277` | 词云字号区间生效 | render fontMin/Max 断言 ✓ | 1 | 2 | 1 | 1 | 1 | **6** | PARTIAL | `renderWordCloud.test.ts` |
| B5 | 通用「显示标题」switch | `ChartTitleStyleSection` | 切换 title 壳层 | smoke 用例 **在 B6 处连带失败** | 1 | 1 | 1 | 1 | 1 | **5** | PARTIAL | 静态接线存在 |
| B6 | 样式 Tab → `ChartStylePanel` 挂载 | `ChartStylePanel.tsx:9` | 切换「样式」后出现 `chart-style-panel` | **运行时 throw**：`Cannot find module '@/lib/chartTypeStyleProfiles'` | 0 | 0 | 0 | 0 | 0 | **0** | **BROKEN** | `ChartEditRail.smoke.test.tsx` FAIL |
| B7 | quadrant「分割线颜色」 | `ChartCompareStyleSections:27` | 象限线颜色写入并渲染 | apply 映射 ✓；render 静态读 options **无单测** | 1 | 1 | 1 | 1 | 1 | **5** | PARTIAL | `applyChartDeStyleBlocks.test.ts:65` |
| B8 | progress「轨道透明度」 | `ChartCompareStyleSections:51` | 轨道 opacity 变化 | render 代码读 `trackOpacity`；**无单测** | 1 | 1 | 1 | 1 | 1 | **5** | PARTIAL | `renderProgressBar.ts:32` |
| B9 | 大屏时钟「字体大小」 | `ScreenVisualEditRail` combobox | `screenStyle.clock.fontSize=24` | userEvent 断言 lastCall ✓ | 2 | 2 | 1 | 2 | 2 | **9** | **REAL** | `ScreenVisualEditRail.test.tsx:33` |
| B10 | 大屏 datetime「显示星期」 | switch | `screenStyle.datetime.showWeekday=true` | userEvent 断言 ✓ | 2 | 2 | 1 | 2 | 2 | **9** | **REAL** | `ScreenVisualEditRail.test.tsx:134` |

**Out（不逐按钮验）**：palette 全字段、geo 离线地图项、tableBasic 列宽、折叠块纯展开/收起。

**T 与 B 映射**：T1→B1–B6 · T2→B3–B4 · T5→B9–B10 · T6→B7–B8

---

## 3c. 五维评分汇总

| ID | L | C | D | E | F | 总分 | 档位 | 真假 | 备注 |
|----|---|---|---|---|---|------|------|------|------|
| T1 P0 UI+渲染 | 1 | 2 | 1 | 1 | 1 | **6** | C | PARTIAL | B6 BROKEN 拉低；render 层正确 |
| T2 sankey/wordCloud | 2 | 2 | 1 | 1 | 2 | **8** | B | REAL | 单测闭环 |
| T3 treemap 标签 | 2 | 2 | 1 | 1 | 1 | **7** | B | REAL | |
| T4 profile/metadata | 2 | 2 | 2 | 2 | 1 | **9** | A | REAL | |
| T5 大屏 G20 | 2 | 2 | 1 | 2 | 2 | **8** | B | REAL | |
| T6 P1 compare | 1 | 1 | 1 | 1 | 1 | **5** | C | PARTIAL | 打通 apply，render/UI 未验 |
| T7 300ms 预览 | 0 | 0 | 0 | 0 | 0 | **—** | — | UNVERIFIED | |
| **汇总（P0 加权）** | — | — | — | — | — | **7** | **B** | **PARTIAL** | P0 最低：T1/T6 |

**打通但不对**（L≥2 且 C≤1）：无（主要问题是 **L 不足** 或 **BROKEN**）  
**假功能 / 断点**：B6 **BROKEN**（样式 Panel 集成加载）

评分细则：`.cursor/skills/feature-truth-verify/scoring-rubric.md`

---

## 4. 动态验证记录（期望 vs 实际）

| 步骤 | 操作 | **期望** | **实际** | 一致？ | 证据 |
|------|------|----------|----------|--------|------|
| 1 | vitest 样式链 bundle | 全绿 | **39 pass / 1 fail** | ❌ | `ChartEditRail.smoke.test.tsx` 第 2 用例 |
| 2 | treemap render 单测 | `__treemapCellRadius=5` → `rx=5` | 一致 | ✅ | `renderTreemap.test.ts` |
| 3 | sankey render 单测 | nodeWidth 8 vs 24 | 一致 | ✅ | `renderSankey.test.ts` |
| 4 | circlePacking render 单测 | labelMinRadius 高→标签更少 | 一致 | ✅ | `renderCirclePacking.test.ts` |
| 5 | apply compare 块 | quadrant/progress/bullet/stock options | 一致 | ✅ | `applyChartDeStyleBlocks.test.ts:65` |
| 6 | catalog G13 | `plugin.properties === profile` | 49 型全等 | ✅ | `catalogParity.test.ts` |
| 7 | 大屏 screenStyle | 时钟/边框/datetime 写入 | 8/8 通过 | ✅ | `ScreenVisualEditRail.test.tsx` |
| 8 | 浏览器改 treemap slider → 300ms 预览 | 可见间距变化 | **未执行** | — | 无 `.dev` / 无 E2E |

**2026-07-30 验证命令**

```powershell
cd fe; npx vitest run `
  src/lib/chartTypeStyleProfiles.test.ts `
  src/lib/applyChartDeStyleBlocks.test.ts `
  src/components/charts/engine/plugins/catalogParity.test.ts `
  src/components/charts/engine/applyChartStyleChain.test.ts `
  src/components/charts/engine/d3/hierarchy/renderTreemap.test.ts `
  src/components/charts/engine/d3/hierarchy/renderCirclePacking.test.ts `
  src/components/charts/engine/d3/hierarchy/renderWordCloud.test.ts `
  src/components/charts/engine/d3/flow/renderSankey.test.ts `
  src/components/dashboard/screen/ScreenVisualEditRail.test.tsx `
  src/components/dashboard/ChartEditRail.smoke.test.tsx
```

---

## 5. 修复文档（非 REAL / C≤1 / 总分<7 的 P0）

### B6 — 样式 Tab 挂载 ChartStylePanel（T1 P0）

**判定 / 得分**：BROKEN 0/10  
**期望 vs 实际**：点击「样式」Tab 应渲染 `chart-style-panel`；**实际** `chartStyleSectionsForType` 内 `require("@/lib/chartTypeStyleProfiles")` 在 Vitest/ESM 下抛错，生产 bundler 下亦属脆弱写法。  
**下钻链**：`ChartStylePanel` → `chartStyleSectionsForType` → `require` 失败 → Panel 白屏/崩溃  
**根因**：`fe/src/lib/chartStyleSectionRegistry.ts:51-54` 为破环使用 `require`，G13 后 `chartTableInspector` 已不再依赖 registry，**可改回 static import**。  
**修复方向**：`import { chartStyleSectionsFromProfile } from "@/lib/chartTypeStyleProfiles"` 替换 lazy `require`；跑通 `ChartEditRail.smoke.test.tsx`。  
**修后验收**：B6 L≥2 C≥2，T1 总分≥8，非 BROKEN。

### T1 — P0 专有 shape UI 集成（B1–B5）

**判定**：PARTIAL 6/10（C=2 但 L=1）  
**期望 vs 实际**：land-design 要求「改 slider 预览变化」；单测只覆盖 **apply/render 层**，未覆盖 **slider onChange → mutateChartConfig → 预览**。  
**修复方向**（P1）：仿 `ScreenVisualEditRail.test.tsx`，为 treemap/circle-packing/sankey 增 `ChartStyleSection` 集成测（mock `ChartInspectorProvider`）。  
**修后验收**：B1–B4 L≥2，T1 总分≥8。

### T6 — P1 compare/quadrant render 断言（B7–B8）

**判定**：PARTIAL 5/10  
**期望 vs 实际**：apply 已映射 `__quadrantLineColor` 等；**无** `renderQuadrant` / `renderProgressBar` / `renderBullet` / `renderStock` 单测。  
**根因**：审计批次只补 UI+apply+render 代码，未补 render test。  
**修复方向**：各增 1 个 smoke render test（对比 options 前后 DOM）。  
**修后验收**：T6 C≥2，总分≥7。

### T7 — 300ms 预览（land-design 成功标准）

**判定**：UNVERIFIED  
**修复方向**（P2）：`.dev` + Playwright 或 `scenario-playbook` 走查：看板编辑 treemap → 拖内间距 → 截图/ DOM 断言。  
**修后验收**：T7 L≥2 C≥2。

### D 维 — 看板保存后 deStyle 持久化

**判定**：未验（D=1）  
**修复方向**（P2）：layout 保存集成测或 API 往返测 `chartConfig.deStyle.treemap` 仍在。  

---

## 6. 修复优先级汇总

| 优先级 | ID | 一句话 |
|--------|-----|--------|
| **P0** | B6 / T1 | 修复 `chartStyleSectionRegistry` 的 `require`，恢复 ChartStylePanel 可挂载 |
| **P1** | T1 B1–B5 | 专有 shape slider 集成测（UI onChange 链） |
| **P1** | T6 | quadrant/progress/bullet/stock render 单测 |
| **P2** | T7 | 浏览器 300ms 预览走查 |
| **P2** | D | 看板保存/刷新 deStyle 持久化 |

---

## 7. 交接

- **结论**：**代码层（deStyle→options→render）对 P0 确认项已基本 REAL**；**产品层（样式 Tab 一点即预览）因 B6 集成断点 + 缺 E2E 只能标 PARTIAL（7/10 · B）**。
- 建议：先批准修 **P0 B6**（一行 static import），再按需 P1 集成测。
- 用户批准修复：**否**（本轮仅审计+文档，未改业务代码）。

---

## 附录：已通过单测清单（L1 证据）

| 文件 | 用例数 | 状态 |
|------|--------|------|
| `applyChartDeStyleBlocks.test.ts` | 9 | ✅ |
| `applyChartStyleChain.test.ts` | 6 | ✅ |
| `catalogParity.test.ts` | 4 | ✅ |
| `chartTypeStyleProfiles.test.ts` | 7 | ✅ |
| `renderTreemap.test.ts` | 1 | ✅ |
| `renderCirclePacking.test.ts` | 1 | ✅ |
| `renderWordCloud.test.ts` | 1 | ✅ |
| `renderSankey.test.ts` | 1 | ✅ |
| `ScreenVisualEditRail.test.tsx` | 8 | ✅ |
| `ChartEditRail.smoke.test.tsx` | 2 | ❌ 1 fail |
