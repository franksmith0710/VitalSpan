# Feature Truth Audit: 图表目录全量 DataEase 对齐（44 活跃 + 5 MIG）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-05 |
| 核验范围 | **44** 活跃 `chartType` + **5** deprecated MIG 型；对标 DataEase：L3 字段槽 / L2 编码 / L1 渲染 / Inspector UI |
| 锚点 | `fe/src/components/charts/engine/plugins/metadata.ts` · `chartCatalogSmokeFixtures.ts` · `chartFieldSlots.ts` · `chartCatalogFieldRuleWaivers.ts` |
| 总体判定 | **PARTIAL** |
| **总分 / 档位** | **7/10 · B** |
| 状态 | draft |
| **sampling** | `full`（49 型逐行 §3d；自动化全量参数化） |

> 用户问「44 型是否全部实现可用」→ **数据链路基本可用**（L1/L2/L3 AUTO 全绿）；**DE 全量维度能力、样式 Tab 真机、过滤→query 链** 仍未 REAL，总体 **PARTIAL**。  
> 单型深审样例：[`2026-08-05-line-de-parity-truth-audit.md`](./2026-08-05-line-de-parity-truth-audit.md)

## 1. 基线与门禁

| 命令 | 结果 | 日期 |
|------|------|------|
| `cd fe && pnpm run test:chart-catalog` | **350 passed** | 2026-08-05 |
| `pytest tests/test_viz_chart_catalog_parity.py -q` | **4 passed** | 2026-08-05 |

**门禁覆盖包**（`fe/package.json` · `test:chart-catalog`）：

- L1：`charts.smoke.test.tsx` · `T-VIZ-R30-001/002`
- L2：`chartCatalogData.test.ts` · `T-VIZ-R31-001`
- L3：`chartCatalogFieldRules.test.ts` · `T-VIZ-R32-001`–`014`
- UI：`ChartDataSlots.deParity.test.tsx` · `T-INSP-UI`
- Golden：`chartFieldSlots.catalogGolden.test.ts` · `T-INSP-DE-GOLDEN` / `T-INSP-DE-MIG`
- MIG：`chartCatalogMigration.test.ts` · `T-VIZ-R33-001/002`
- BE↔FE：`catalogParity.test.ts` + `test_viz_chart_catalog_parity.py`

## 2. 系统性差距（跨型）

| Gap ID | 描述 | 影响 | 锚点 | Phase |
|--------|------|------|------|-------|
| **GAP-MAX-DIM** | DE 笛卡尔类别轴 1–8 维泛化；FE `deriveFieldRuleFromDeCatalog` 槽位语义 max=3（类+子类+钻取） | 24 型 max 维 PARTIAL+waiver，非 REAL | `chartCatalogFieldRuleWaivers.ts` · `T-VIZ-R32-014` | **Phase 5**（产品确认 MULTI_DIM 后解除） |
| **GAP-MAX-TEST** | max 维不对齐经 **signed waiver** 门禁，min 仍严格相等 | 同上；测试显式记录差距而非假绿 | `FIELD_RULE_MAX_WAIVERS` · `T-VIZ-R32-011` min · `T-VIZ-R32-014` max | 当前 |
| **GAP-STYLE** | 样式 Tab 控件→预览 T7 未 44 型 BROWSER 逐控件验 | 数据 REAL ≠ 产品 REAL | `chartStyleAuditMatrix.ts` · [07-30 样式审计](./2026-07-30-component-style-per-type-truth-audit.md) | P1 |
| **GAP-FILTER-CHAIN** | Inspector「过滤」槽 UI 存在；过滤条件→query 执行链未在本 scope 动态验 | L3 FIELD 子项 PARTIAL | `ChartEditorColumn.tsx` · `ChartDataSlots` filters section | P1 |

**Phase 5 特别说明**：凡 `FIELD_RULE_MAX_WAIVERS` 含 `GAP-MAX-DIM`（及关联 `GAP-TABLE-DRILL-COUNT` / `GAP-MAP-DRILL`）的 chartType，§3d **判定列不得标 REAL**，须标 **PARTIAL+waiver**。

## 3. §3d 覆盖矩阵（49 行 · 一型一行）

图例：

- **深度**：`L3·CHAIN` / `L2·CHAIN` / `L1·CHAIN` = vitest 参数化链路断言
- **UI**：`ChartDataSlots.deParity` · T-INSP-UI
- **BROWSER**：[`2026-08-05-chart-browser-walkthrough-log.md`](./2026-08-05-chart-browser-walkthrough-log.md) 对应行 · AUTO-VERIFIED（smoke 代理，待手工截图）

### 3.1 指标（quota）

| chartType | family | L3 / L2 / L1 深度 | UI | BROWSER | 判定 | 证据路径 |
|-----------|--------|-------------------|-----|---------|------|----------|
| `gauge` | quota | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #1 | **REAL** | `chartCatalogFieldRules.test.ts` · `chartCatalogData.test.ts` · `charts.smoke.test.tsx` · `chartCatalogSmokeFixtures.ts` |
| `liquid` | quota | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #2 | **REAL** | 同上 |
| `kpi` | quota | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #3 | **PARTIAL+waiver** | 同上 + `chartCatalogFieldRuleWaivers.ts` · GAP-MAX-DIM |

### 3.2 表格（table）

| chartType | family | L3 / L2 / L1 深度 | UI | BROWSER | 判定 | 证据路径 |
|-----------|--------|-------------------|-----|---------|------|----------|
| `table-info` | table | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #4 | **PARTIAL+waiver** | waivers · GAP-TABLE-DRILL-COUNT |
| `table-normal` | table | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #5 | **PARTIAL+waiver** | 同上 |
| `table-pivot` | table | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #6 | **PARTIAL+waiver** | waivers · GAP-MAX-DIM |
| `t-heatmap` | table | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #7 | **REAL** | 标准 L3/L2/L1 套件 |

### 3.3 趋势（trend）

| chartType | family | L3 / L2 / L1 深度 | UI | BROWSER | 判定 | 证据路径 |
|-----------|--------|-------------------|-----|---------|------|----------|
| `line` | trend | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #8 | **PARTIAL+waiver** | waivers · GAP-MAX-DIM · [line 深审](./2026-08-05-line-de-parity-truth-audit.md) |
| `area` | trend | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #9 | **PARTIAL+waiver** | waivers · GAP-MAX-DIM |
| `area-stack` | trend | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #10 | **PARTIAL+waiver** | waivers · GAP-MAX-DIM |

### 3.4 对比（compare）

| chartType | family | L3 / L2 / L1 深度 | UI | BROWSER | 判定 | 证据路径 |
|-----------|--------|-------------------|-----|---------|------|----------|
| `bar` | compare | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #11 | **PARTIAL+waiver** | waivers · GAP-MAX-DIM |
| `bar-stack` | compare | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #12 | **PARTIAL+waiver** | 同上 |
| `percentage-bar-stack` | compare | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #13 | **PARTIAL+waiver** | 同上 |
| `bar-group` | compare | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #14 | **PARTIAL+waiver** | 同上 |
| `bar-group-stack` | compare | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #15 | **PARTIAL+waiver** | 同上 |
| `waterfall` | compare | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #16 | **REAL** | 标准 L3/L2/L1 套件 |
| `bar-horizontal` | compare | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #17 | **PARTIAL+waiver** | waivers · GAP-MAX-DIM |
| `bar-stack-horizontal` | compare | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #18 | **PARTIAL+waiver** | 同上 |
| `percentage-bar-stack-horizontal` | compare | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #19 | **PARTIAL+waiver** | 同上 |
| `bar-range` | compare | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #20 | **REAL** | `chartCatalogPlanAssertions.ts` · 双指标区间 |
| `bidirectional-bar` | compare | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #21 | **REAL** | 标准 L3/L2/L1 套件 |
| `progress-bar` | compare | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #22 | **REAL** | 标准 L3/L2/L1 套件 |
| `stock-line` | compare | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #23 | **REAL** | F8 OHLC · `chartCatalogPlanAssertions.ts` |
| `bullet-graph` | compare | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #24 | **REAL** | F9 · `chartCatalogPlanAssertions.ts` |

### 3.5 分布（distribute）

| chartType | family | L3 / L2 / L1 深度 | UI | BROWSER | 判定 | 证据路径 |
|-----------|--------|-------------------|-----|---------|------|----------|
| `pie` | distribute | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #25 | **REAL** | F2 · `encodeNonCartesian.test.ts` |
| `pie-donut` | distribute | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #26 | **REAL** | 同上 |
| `pie-rose` | distribute | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #27 | **REAL** | 同上 |
| `pie-donut-rose` | distribute | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #28 | **REAL** | 同上 |
| `radar` | distribute | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #29 | **REAL** | 标准 L3/L2/L1 套件 |
| `treemap` | distribute | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #30 | **REAL** | 标准 L3/L2/L1 套件 |
| `word-cloud` | distribute | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #31 | **REAL** | 标准 L3/L2/L1 套件 |

### 3.6 地图（map）

| chartType | family | L3 / L2 / L1 深度 | UI | BROWSER | 判定 | 证据路径 |
|-----------|--------|-------------------|-----|---------|------|----------|
| `map` | map | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #32 | **PARTIAL+waiver** | waivers · GAP-MAP-DRILL · GEO-IRON-01 |
| `map-3d` | map | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #33 | **PARTIAL+waiver** | 同上 + `geoMap3d.audit.test.ts` |

### 3.7 关系/流程（relation）

| chartType | family | L3 / L2 / L1 深度 | UI | BROWSER | 判定 | 证据路径 |
|-----------|--------|-------------------|-----|---------|------|----------|
| `scatter` | relation | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #34 | **PARTIAL+waiver** | waivers · GAP-MAX-DIM |
| `quadrant` | relation | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #35 | **PARTIAL+waiver** | 同上 |
| `funnel` | relation | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #36 | **REAL** | 标准 L3/L2/L1 套件 |
| `sankey` | relation | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #37 | **REAL** | `T-VIZ-R32-007` · 双维必填 |
| `circle-packing` | relation | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #38 | **REAL** | 标准 L3/L2/L1 套件 |
| `multi-scatter` | relation | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #39 | **PARTIAL+waiver** | waivers · GAP-MAX-DIM |
| `graph` | relation | CHAIN / CHAIN / CHAIN | ✅ | walkthrough #40 | **REAL** | `T-VIZ-R32-008` · 零指标可选 |

### 3.8 双轴（dual_axes）

| chartType | family | L3 / L2 / L1 深度 | UI | BROWSER | 判定 | 证据路径 |
|-----------|--------|-------------------|-----|---------|------|----------|
| `chart-mix` | dual_axes | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #41 | **PARTIAL+waiver** | waivers · GAP-MAX-DIM · `T-VIZ-R32-009` |
| `chart-mix-group` | dual_axes | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #42 | **PARTIAL+waiver** | 同上 |
| `chart-mix-stack` | dual_axes | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #43 | **PARTIAL+waiver** | 同上 |
| `chart-mix-dual-line` | dual_axes | CHAIN+waiver / CHAIN / CHAIN | ✅ | walkthrough #44 | **PARTIAL+waiver** | waivers · maxD=4 · maxM=2 |

### 3.9 Deprecated MIG（5 型 · 仅迁移门禁）

| chartType | family | L3 / L2 / L1 深度 | UI | BROWSER | 判定 | 证据路径 |
|-----------|--------|-------------------|-----|---------|------|----------|
| `table` | table | GATE / — / — | — | — | **PARTIAL** | `chartCatalogMigration.test.ts` · T-VIZ-R33-002 → `table-info` |
| `timeline` | trend | GATE / — / — | — | — | **PARTIAL** | T-VIZ-R33-002 → `line` |
| `wordCloud` | distribute | GATE / — / — | — | — | **PARTIAL** | T-VIZ-R33-002 → `word-cloud` |
| `heatmap` | map | GATE / — / — | — | — | **PARTIAL** | T-VIZ-R33-002 → `t-heatmap` |
| `combo` | dual_axes | GATE / — / — | — | — | **PARTIAL** | T-VIZ-R33-002 → `chart-mix` |

> MIG 型 L3 **GATE** = `chartFieldSlots.catalogGolden.test.ts` · T-INSP-DE-MIG 槽位 label 与 DE catalog 一致。

---

## 4. 覆盖摘要

| 指标 | 值 |
|------|-----|
| §3d 总行数 | **49**（44 活跃 + 5 MIG） |
| L1 CHAIN（活跃） | **44/44** · T-VIZ-R30-001/002 |
| L2 CHAIN（活跃） | **44/44** · T-VIZ-R31-001 |
| L3 CHAIN（活跃） | **44/44** · T-VIZ-R32-*（含 waiver 显式断言） |
| UI 集成（活跃） | **44/44** · T-INSP-UI |
| BROWSER AUTO-VERIFIED | **44/44** · 走查日志（smoke 代理） |
| REAL 判定（活跃） | **20/44**（无 max waiver） |
| PARTIAL+waiver（活跃） | **24/44**（GAP-MAX-DIM / TABLE-DRILL / MAP-DRILL） |
| MIG PARTIAL | **5/5** |
| **逐一校验** | **是** — 49/49 经 `test:chart-catalog` + pytest 参数化覆盖 |
| 总体 scope 可否 REAL | **否** — GAP-STYLE · GAP-FILTER-CHAIN · Phase 5 GAP-MAX-DIM |

### 判定汇总

| 档位 | 数量 | 说明 |
|------|------|------|
| REAL | 20 | 活跃型；L3 max 无 signed waiver |
| PARTIAL+waiver | 24 | Phase 5 前不得升 REAL |
| PARTIAL（MIG） | 5 | 仅 migratesTo 门禁 |
| **总体** | — | **PARTIAL**（7/10 · B） |

## 5. 动态验证记录

| 步骤 | 操作 | 期望 | 实际 | 一致？ |
|------|------|------|------|--------|
| 1 | `pnpm run test:chart-catalog` | 全绿 | **350 passed** | ✅ |
| 2 | `pytest test_viz_chart_catalog_parity.py -q` | 4 passed | **4 passed** | ✅ |
| 3 | `chartCatalogSmokeFixtures.test.ts` | 44 型夹具一一对应 | **44/44** | ✅ |
| 4 | `T-VIZ-R32-014` max waiver | 24 型 signed waiver | 断言过 | ✅ |
| 5 | 44 型样式 Tab BROWSER T7 | 逐控件预览变化 | **未执行** | ❌ GAP-STYLE |
| 6 | 过滤槽→query 执行 | 过滤生效 | **未执行** | ❌ GAP-FILTER-CHAIN |

## 6. 修复优先级

| 优先级 | Gap | 一句话 |
|--------|-----|--------|
| P0 | AUTO 门禁 | ✅ 350 + 4 pytest 已绿 |
| P1 | GAP-STYLE | 44 型样式 section BROWSER T7 或 UI 集成测 |
| P1 | GAP-FILTER-CHAIN | 过滤条件写入 query 并断言结果集 |
| P2 | BROWSER 截图 | 走查日志从 AUTO-VERIFIED 升手工 REAL |
| Phase 5 | GAP-MAX-DIM | 产品确认 MULTI_DIM → 解除 `FIELD_RULE_MAX_WAIVERS` |

## 7. 交接

- **数据链路（拖字段→出图→编码）**：44 型 AUTO 闭环，可信任为 **REAL/PARTIAL+waiver**（见 §3d）
- **产品级 DE 对齐**：总体 **PARTIAL**；样式/过滤/8 维待 Phase 5 与 P1 修复
- 单型深审参考：[`2026-08-05-line-de-parity-truth-audit.md`](./2026-08-05-line-de-parity-truth-audit.md)
- 浏览器代理明细：[`2026-08-05-chart-browser-walkthrough-log.md`](./2026-08-05-chart-browser-walkthrough-log.md)
- 计划真理源：[`2026-07-21-chart-per-type-verification.md`](../automate/plans/2026-07-21-chart-per-type-verification.md)
