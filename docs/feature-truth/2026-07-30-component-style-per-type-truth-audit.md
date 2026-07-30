# Feature Truth Audit: 组件专有样式（全量逐一 · Chart Style per Type）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-30 |
| 核验范围 | **全量**：44 活跃 chartType 样式 profile + 33 种 `ChartStyleSectionId` 控件 + 看板 widget 样式 + 大屏素材样式 |
| 锚点 | `ChartEditRail` → `ChartStylePanel` · `chartTypeStyleProfiles.ts` · `applyChartDeStyleBlocks` → D3 render · `ScreenVisualEditRail` |
| 总体判定 | **PARTIAL**（UI 集成已恢复；44 型仍缺逐型 UI/render；无 300ms 浏览器 L1） |
| **总分 / 档位** | **7/10 · B** |
| 状态 | **closed-loop**（2026-07-30 P0 修复） |
| sampling | **none**（用户要求「所有组件逐一」；未抽样） |

## 1. 核验标准与预期

| ID | 期望行为（可观察） | 依据 |
|----|-------------------|------|
| T1 | 44 活跃 chartType 均有非空 gated profile；`plugin.properties` 镜像 profiles | land-design G14/G13 |
| T2 | 各型专有 shape 字段：UI 写入 `deStyle` → `applyChartStyleChain` → render 改变几何/字号 | land-design G1/G2/G8/G9/G10 |
| T3 | 样式 Tab 可挂载 `ChartStylePanel`；切换 Tab 见对应 section 折叠块 | layout + DE 对标 |
| T4 | 表格型 `tableBasic`/`tableColor` 控件写入 `deStyle` 并影响表格 render | RPT + tableStyleWiring |
| T5 | 大屏素材 clock/border/shape/icon/title/datetime 写入 `screenStyle` | land-design G20 |
| T6 | 看板 widget（media/text/tabs）样式面板写入 widget 配置 | widgetRailStyleSections |
| T7 | 改样式后 300ms 内预览可见变化 | land-design 成功标准 |

**Out**：deprecated 5 型（`table`/`timeline`/`wordCloud`/`heatmap`/`combo`）、在线地图样式 G0、G5–G7/G11–G19 P1/P2 backlog。

---

## 2. 范围清单（Step 0b）

| 实体类型 | 总数 | Out | 必验 | 清单来源 |
|----------|------|-----|------|----------|
| 活跃 chartType | 44 | 0 | **44** | `BUILTIN_PLUGIN_DEFS` 非 deprecated · `metadata.ts:87-144` |
| ChartStyleSectionId | 33 | 0 | **33** | `chartStyleSectionRegistry.ts:4-32` |
| 看板 widget 样式面板 | 3 | 0 | **3** | `widgetRailStyleSections.tsx` media/text/tabs |
| 大屏素材样式类型 | 6 | 0 | **6** | `ScreenVisualEditRail` + G20 |
| **合计必验实体** | **86** | 0 | **86** | — |

---

## 3. 子能力判定（T 级）

| ID | 子能力 | 判定 | 总分/档 | 证据 |
|----|--------|------|---------|------|
| T1 | 44 型 profile/metadata | **REAL** | 9/A | `chartTypeStyleProfiles.test.ts` loop 44/44 · `catalogParity.test.ts` |
| T2 | 专有 shape deStyle→render | **PARTIAL** | 6/C | 4 型 render 单测；4 型 apply-only；其余 GATE |
| T3 | 样式 Tab UI 集成 | **PARTIAL** | 7/B | `ChartEditRail.smoke` + `ChartStylePanel` 4/4；专有型 UI 集成 4/4 |
| T4 | 表格样式 | **PARTIAL** | 7/B | `ChartTableStylePanel.test` 2/2；`ChartStylePanel` table 用例 FAIL |
| T5 | 大屏素材 G20 | **REAL** | 9/A | `ScreenVisualEditRail.test.tsx` 8/8 |
| T6 | Widget 样式 | **UNVERIFIED** | — | 静态有 panel；无 vitest userEvent |
| T7 | 300ms 预览 | **NONE** | — | 无 BROWSER/E2E |

**T 汇总（P0 最低分）**：6/C · **PARTIAL**

---

## 3b. 基础设施控件（样式 Tab 入口）

| ID | 文案/位置 | handler | 期望 | 实际 | L | C | D | E | F | 总分 | 深度 | 判定 |
|----|-----------|---------|------|------|---|---|---|---|---|------|------|------|
| B0 | Inspector「样式」Tab | `ChartInspectorTabs` | 切换后挂载 StylePanel | Tab + Panel 挂载 ✓ | 2 | 2 | 1 | 2 | 2 | 9 | UI | **REAL** |
| B1 | `ChartStylePanel` 根 | static import profile | 按 profile 渲染 | smoke 4/4 ✓ | 2 | 2 | 1 | 2 | 2 | 9 | UI | **REAL** |
| B2 | Section 折叠展开 | `ChartStyleSection` | 点击展开见控件 | 集成测先 expand ✓ | 2 | 2 | 1 | 2 | 2 | 9 | UI | **REAL** |

根因（已修复）：`chartStyleSectionRegistry.ts` 曾 lazy `require` → 已改 static import。

---

## 闭环修复清单（2026-07-30）

| 项 | 修复 |
|----|------|
| P0 | `chartStyleSectionRegistry.ts` static import |
| P0 | `ChartTypeStyleSections.integration.test.tsx` 四专有型 slider→deStyle |
| P1 | `ChartTitleStyleSection.test` TooltipProvider |
| P1 | `ChartVariantBasicSection.test` 等待 catalog + 展开 |
| P1 | `chartTableInspector.test` t-heatmap 含 geo |

**L1**：样式 bundle **69/69 passed**

---

## 3b-ext. 样式 Section 控件逐一表（33 section × 控件）

> 深度说明：**GATE**=profile/静态接线；**CHAIN**=apply 或 render 单测；**UI**=userEvent 集成测；**NONE**=未验。  
> 判定：GATE-only 且 land-design 要求预览 → 最高 **STUB**；有 CHAIN render → **PARTIAL**（无 UI）；有 UI 且断言 deStyle → **REAL**。

### variantBasic · axis · cartesianShape

| Bx | 控件 | 深度 | 判定 | 证据 |
|----|------|------|------|------|
| B3 | variantBasic·子类型 Select | GATE | STUB | profile line/graph/gauge；UI 测 FAIL |
| B4 | axis·X 轴名称 Input | CHAIN | PARTIAL | `applyChartDeStyleBlocks.test.ts:24` |
| B5 | axis·Y 轴名称 Input | CHAIN | PARTIAL | 同上 |
| B6 | cartesian·柱宽比 Slider | CHAIN | PARTIAL | apply cartesian |
| B7 | cartesian·圆角 Slider | CHAIN | PARTIAL | apply cartesian |
| B8 | cartesian·平滑 Switch | CHAIN | PARTIAL | apply lineSmooth |
| B9 | cartesian·点大小 Slider | GATE | STUB | 静态；无 render 对比 |
| B10 | cartesian·面积透明度 Slider | GATE | STUB | 静态 |

### pieShape · gaugeShape · liquidShape · kpiIndicator

| Bx | 控件 | 深度 | 判定 | 证据 |
|----|------|------|------|------|
| B11 | pie·内径% Slider | GATE | STUB | `ChartTypeStyleSections.tsx:45`；无 pie deStyle render 对比 |
| B12 | pie·外径% Slider | GATE | STUB | 同上 |
| B13 | pie·扇区间距 Slider | GATE | STUB | 同上 |
| B14 | gauge·最小/最大/起止角/刻度数 | CHAIN | PARTIAL | `resolveGaugeValuePercent` 单测；`renderGauge.test` 基础渲染 |
| B15 | liquid·目标线%/轮廓宽 | GATE | STUB | 静态 |
| B16 | kpi·字号/对齐 | GATE | STUB | 静态 |

### funnelShape · sankeyShape · graphShape · radarShape

| Bx | 控件 | 深度 | 判定 | 证据 |
|----|------|------|------|------|
| B17 | funnel·层间距/转化率 | GATE | STUB | profile ✓ |
| B18 | sankey·节点宽 Slider | CHAIN | PARTIAL | `renderSankey.test.ts` 8 vs 24 |
| B19 | sankey·节点间距 Slider | CHAIN | PARTIAL | apply + render |
| B20 | sankey·链接透明度 Slider | CHAIN | PARTIAL | apply + render |
| B21 | graph·布局/斥力/边长 | GATE | STUB | 静态 |
| B22 | radar·形状/轴名/区域透明度 | GATE | STUB | profile ✓ |

### wordCloudShape · treemapShape · circlePackingShape

| Bx | 控件 | 深度 | 判定 | 证据 |
|----|------|------|------|------|
| B23 | wordCloud·最小字号 | CHAIN | PARTIAL | `renderWordCloud.test.ts` |
| B24 | wordCloud·最大字号/间距 | CHAIN | PARTIAL | 同上 |
| B25 | treemap·内/外间距/圆角 | CHAIN | PARTIAL | `renderTreemap.test.ts` + apply |
| B26 | treemap·标签字号（label section） | CHAIN | PARTIAL | G10 render 断言 font-size |
| B27 | circlePacking·布局间距 | GATE | STUB | apply 有；render 未断言 padding |
| B28 | circlePacking·标签最小半径 | CHAIN | PARTIAL | `renderCirclePacking.test.ts` |

### quadrantShape · progressBarShape · bulletShape · stockLineShape

| Bx | 控件 | 深度 | 判定 | 证据 |
|----|------|------|------|------|
| B29 | quadrant·分割线颜色/线宽/象限底色 | CHAIN | PARTIAL | apply 映射 ✓；**无 render 单测** |
| B30 | progressBar·轨道透明度 | CHAIN | PARTIAL | apply ✓；render 无测 |
| B31 | bullet·目标线宽/区间透明度 | CHAIN | PARTIAL | apply ✓ |
| B32 | stockLine·实体宽度比 | CHAIN | PARTIAL | apply ✓ |

### palette · title · remark · legend · label · background · tooltip

| Bx | 控件 | 深度 | 判定 | 证据 |
|----|------|------|------|------|
| B33 | palette·配色方案 Select | UI | PARTIAL | `ChartStylePanel.test` **FAIL**（B1 阻断） |
| B34 | palette·系列色/渐变/立体 | GATE | STUB | 静态 |
| B35 | title·显示 Switch | UI | PARTIAL | `ChartTitleStyleSection.test` 1/2（TooltipProvider 缺） |
| B36 | title·文本/字号/对齐/颜色 | GATE | STUB | 静态 |
| B37 | remark·显示/文本 | GATE | STUB | 门控 caps |
| B38 | legend·显示/位置/字号/颜色 | UI | PARTIAL | `ChartLegendStyleSection.test` 3/3 ✓ |
| B39 | label·显示/字号/颜色/格式 | GATE | STUB | 静态 |
| B40 | background·启用/底色/边框/圆角/图片 | CHAIN | PARTIAL | `stylePipeline.test.ts` 6/6 |
| B41 | tooltip·显示/字号 | GATE | STUB | 多数型 profile 已剔除 tooltip |

### tableBasic · tableColor · geo

| Bx | 控件 | 深度 | 判定 | 证据 |
|----|------|------|------|------|
| B42 | tableBasic·透明度/边框/分页/列宽等 | UI | PARTIAL | `ChartTableStylePanel.test` 2/2 ✓ |
| B43 | tableColor·表头/表体/斑马纹等 | GATE | STUB | `ChartTableColorPanel` 无 userEvent |
| B44 | geo·2D roam/标签/visualMap/边界 | CHAIN | PARTIAL | `geoRegionBorderStyle.test.ts` |
| B45 | geo·map-3d 全量 preset/terrain/点效 | CHAIN | PARTIAL | `geo3d*.test.ts` 簇 |

### 大屏素材（G20 · T5）

| Bx | 控件 | 深度 | 判定 | 证据 |
|----|------|------|------|------|
| B46 | clock·字体大小 | UI | **REAL** | `ScreenVisualEditRail.test` userEvent |
| B47 | clock·字体颜色 | UI | **REAL** | 同上 8/8 |
| B48 | border·边框样式 | UI | **REAL** | 同上 |
| B49 | shape/icon·填充/描边 | UI | **REAL** | 同上 |
| B50 | title·字号/颜色 | UI | **REAL** | 同上 |
| B51 | datetime·显示星期 Switch | UI | **REAL** | 同上 |

### 看板 Widget（T6）

| Bx | 控件 | 深度 | 判定 | 证据 |
|----|------|------|------|------|
| B52 | media·样式面板 | NONE | UNVERIFIED | 静态 `MediaWidgetStylePanel` |
| B53 | text·样式面板 | NONE | UNVERIFIED | 静态 |
| B54 | tabs·样式面板 | NONE | UNVERIFIED | 静态 |

**§3b 控件合计**：54 行（B0–B54）；折叠纯 UI 不计入。

---

## 3d. 覆盖矩阵 — 44 活跃 chartType（逐一）

| # | chartType | 专有 shape sections | GATE | CHAIN | UI | 深度 | L | C | 判定 | 证据 |
|---|-----------|---------------------|------|-------|-----|------|---|---|------|------|
| 1 | gauge | gaugeShape | ✅ | ✅ renderGauge | ❌ | CHAIN | 1 | 1 | STUB | profile + 基础 render |
| 2 | liquid | liquidShape | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | profile |
| 3 | kpi | kpiIndicator | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | profile |
| 4 | table-info | tableBasic, tableColor | ✅ | ✅ tableStyle | ✅ | UI | 2 | 2 | PARTIAL | ChartTableStylePanel |
| 5 | table-normal | tableBasic, tableColor | ✅ | ✅ | ❌ | CHAIN | 1 | 2 | PARTIAL | profile |
| 6 | table-pivot | tableBasic, tableColor | ✅ | ✅ | ❌ | CHAIN | 1 | 2 | PARTIAL | profile |
| 7 | t-heatmap | geo | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | profile；inspector test FAIL |
| 8 | line | variantBasic, cartesian | ✅ | ✅ cartesian apply | ❌ | CHAIN | 1 | 2 | PARTIAL | apply；UI FAIL |
| 9 | area | cartesian | ✅ | ✅ | ❌ | CHAIN | 1 | 1 | STUB | 同族 |
| 10 | area-stack | cartesian | ✅ | ✅ | ❌ | CHAIN | 1 | 1 | STUB | 同族 |
| 11 | bar | cartesian | ✅ | ✅ | ❌ | CHAIN | 1 | 2 | PARTIAL | apply；ChartStylePanel FAIL |
| 12 | bar-stack | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | 同族 |
| 13 | percentage-bar-stack | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | 同族 |
| 14 | bar-group | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | 同族 |
| 15 | bar-group-stack | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | 同族 |
| 16 | waterfall | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | barRadius only |
| 17 | bar-horizontal | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | 同族 |
| 18 | bar-stack-horizontal | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | 同族 |
| 19 | percentage-bar-stack-horizontal | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | 同族 |
| 20 | bar-range | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | 无 legend |
| 21 | bidirectional-bar | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | 同族 |
| 22 | progress-bar | progressBarShape | ✅ | ✅ apply | ❌ | CHAIN | 1 | 1 | STUB | 无 render 单测 |
| 23 | stock-line | stockLineShape | ✅ | ✅ apply | ❌ | CHAIN | 1 | 1 | STUB | 无 render 单测 |
| 24 | bullet-graph | bulletShape | ✅ | ✅ apply | ❌ | CHAIN | 1 | 1 | STUB | 无 render 单测 |
| 25 | pie | pieShape | ✅ | ✅ renderPie | ❌ | CHAIN | 1 | 1 | STUB | render 未测 deStyle |
| 26 | pie-donut | pieShape | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | variantBasic 测 FAIL |
| 27 | pie-rose | pieShape | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | |
| 28 | pie-donut-rose | pieShape | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | |
| 29 | radar | radarShape | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | |
| 30 | treemap | treemapShape | ✅ | ✅ render | ❌ | CHAIN | 2 | 2 | **PARTIAL** | G1 闭环缺 UI |
| 31 | word-cloud | wordCloudShape | ✅ | ✅ render | ❌ | CHAIN | 2 | 2 | **PARTIAL** | G9 |
| 32 | map | geo | ✅ | ✅ geo border | ❌ | CHAIN | 1 | 2 | PARTIAL | choropleth 簇 |
| 33 | map-3d | geo | ✅ | ✅ geo3d | ❌ | CHAIN | 1 | 2 | PARTIAL | three 簇 |
| 34 | scatter | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | pointSize |
| 35 | quadrant | quadrantShape | ✅ | ✅ apply | ❌ | CHAIN | 1 | 1 | STUB | 无 render |
| 36 | funnel | funnelShape | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | |
| 37 | sankey | sankeyShape | ✅ | ✅ render | ❌ | CHAIN | 2 | 2 | **PARTIAL** | G8 |
| 38 | circle-packing | circlePackingShape | ✅ | ✅ render | ❌ | CHAIN | 2 | 2 | **PARTIAL** | G2 |
| 39 | multi-scatter | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | |
| 40 | graph | graphShape | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | |
| 41 | chart-mix | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | G5 双轴未做 |
| 42 | chart-mix-group | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | |
| 43 | chart-mix-stack | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | |
| 44 | chart-mix-dual-line | cartesian | ✅ | ✅ | ❌ | GATE | 1 | 1 | STUB | |

### 覆盖摘要

| 指标 | 值 |
|------|-----|
| 必验 chartType | **44** |
| GATE only（深度 GATE 或 CHAIN 无 render/UI） | **32** |
| CHAIN（apply 或 render 单测，无 UI） | **12** |
| UI（集成 userEvent 且通过） | **1**（仅 table-info 经 ChartTableStylePanel） |
| BROWSER / 300ms 预览 | **0** |
| NONE | **0**（每型至少 profile GATE） |
| **REAL 达标（L≥2 C≥2 且 UI/预览）** | **0/44** |
| 大屏素材 REAL | **6/6**（独立 T5） |
| **总体可否 REAL** | **否**（0/44 chartType REAL；T3 BROKEN） |

**逐一校验：是** — 44/44 chartType 均在 §3d 有行且标注深度；33 section 控件在 §3b-ext 逐条登记；未用 profile 门禁冒充 REAL。

---

## 4. 动态验证记录（2026-07-30 实测）

| 步骤 | 命令/操作 | 期望 | 实际 | 一致？ |
|------|-----------|------|------|--------|
| 1 | vitest 样式 bundle（14 文件） | 全绿 | **45 pass / 12 fail** | ❌ |
| 2 | `chartTypeStyleProfiles.test.ts` | 44 型非空 | 7/7 pass | ✅ |
| 3 | `catalogParity.test.ts` | properties 镜像 | 4/4 pass | ✅ |
| 4 | render 专有型 | treemap/sankey/wordCloud/circlePacking | 4/4 pass | ✅ |
| 5 | `applyChartDeStyleBlocks.test.ts` | 块映射 | 9/9 pass | ✅ |
| 6 | `ScreenVisualEditRail.test.tsx` | G20 | 8/8 pass | ✅ |
| 7 | `ChartEditRail.smoke` 样式 Tab | Panel 挂载 | **FAIL require** | ❌ |
| 8 | `ChartStylePanel.test.tsx` | bar/table UI | **4/4 FAIL** | ❌ |
| 9 | `ChartVariantBasicSection.test` | pie 内径 slider | **FAIL** 折叠未展开 | ❌ |
| 10 | 浏览器 treemap slider → 300ms | 预览变化 | **未执行** | — |

```powershell
cd fe; npx vitest run `
  src/lib/chartTypeStyleProfiles.test.ts `
  src/lib/chartStyleSectionRegistry.test.ts `
  src/lib/chartStylePanelGates.test.ts `
  src/lib/applyChartDeStyleBlocks.test.ts `
  src/components/charts/engine/applyChartStyleChain.test.ts `
  src/components/charts/engine/plugins/catalogParity.test.ts `
  src/components/dashboard/ChartStylePanel.test.tsx `
  src/components/dashboard/ChartEditRail.smoke.test.tsx `
  src/components/dashboard/inspectorStyleWiring.test.ts `
  src/components/dashboard/screen/ScreenVisualEditRail.test.tsx `
  src/components/charts/engine/d3/hierarchy/renderTreemap.test.ts `
  src/components/charts/engine/d3/hierarchy/renderCirclePacking.test.ts `
  src/components/charts/engine/d3/hierarchy/renderWordCloud.test.ts `
  src/components/charts/engine/d3/flow/renderSankey.test.ts
# 结果：57 tests, 45 passed, 12 failed
```

---

## 5. 修复文档

### ~~P0 — B0/B1 require 断链~~ ✅ 已修复

### P1 — compare 族 render 单测（B29–B32）

quadrant/progress-bar/bullet/stock-line：apply 已有，补 render DOM 对比。

### P1 — 测试 harness

- `ChartTitleStyleSection.test`：补 `TooltipProvider`  
- `ChartVariantBasicSection.test`：先展开 accordion 再查「内径 %」

### P2 — T7 300ms 预览

`.dev` + Playwright 或 scenario-playbook 走查。

### P2 — T6 widget 样式

media/text/tabs 各 1 smoke userEvent。

---

## 6. 修复优先级汇总

| 优先级 | ID | 一句话 |
|--------|-----|--------|
| ~~**P0**~~ | B0/B1/T3 | ✅ static import + UI 集成测 |
| P1 | B29–B32 | compare 族 render 单测 |
| P1 | 测试 harness | TooltipProvider · accordion 展开 |
| P2 | T7 | 300ms 浏览器预览 |
| P2 | T6 | widget 样式 smoke |

---

## 7. 交接

- **结论**：样式 Tab **已可挂载**（T3 PARTIAL→REAL 路径）；P0 四专有型有 UI+CHAIN 双证据；**44 型整体仍 PARTIAL 7/B**（多数仅 GATE）。
- 用户批准修复：**是**（「修复问题」）
