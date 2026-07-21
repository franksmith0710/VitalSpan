# 图表逐型验收手册（对标 DataEase）

> **状态**：**AUTO 已闭环**（2026-07-21）· catalog **48** 项（含 **5** 项 deprecated 已 MIG 门禁）  
> **真理源**：`backend/app/viz/builtin/*.py`（field_rule）· `fe/src/components/dashboard/chartFieldSlots.ts`（槽位文案）· `fe/src/components/charts/engine/plugins/metadata.ts`（FE 注册）  
> **前置**：D3 全量迁移已完成（见 [`2026-07-21-d3-full-chart-migration.md`](./2026-07-21-d3-full-chart-migration.md)）  
> **取代**：[`2026-07-20-chart-component-acceptance.md`](./2026-07-20-chart-component-acceptance.md) 中已过时的 G2Plot/S2 分路描述，以本文 **§4 逐型矩阵** 为准  
> **一键门禁**：`cd fe && pnpm run test:chart-catalog` · 后端 `pytest tests/test_viz_chart_catalog_parity.py -q`

## 1. 验收目标（三层）

对标 DataEase 图表编辑器的「能拖字段 → 能出图 → 数值/维度语义正确」：

| 层级 | 代号 | 回答的问题 | 通过标准 |
|------|------|------------|----------|
| **L1 可渲染** | `RENDER` | 配好字段后是否出图？ | 无白屏/无未捕获异常；出现预期 `data-testid` 或表格 DOM；空数据走「暂无数据」 |
| **L2 数据正确** | `DATA` | 图形上的值是否与查询结果一致？ | 类目/系列/单元格与 mock 或 SQL 结果逐条对照；聚合/占比/堆叠总和可手算复核 |
| **L3 维度正确** | `FIELD` | 槽位与 DE 是否一致？ | `fieldRule`、Inspector 槽位文案、必填槽、`maxDimensions/maxMetrics` 与 backend catalog 一致；错配字段时有可读校验 |

每项验收标注证据类型：

- `[AUTO]` — vitest / pytest 可自动断言  
- `[MANUAL]` — 浏览器走查（`/admin/charts/explore` 或看板编辑）  
- `[MIG]` — 仅测 deprecated → `migratesTo` 迁移

---

## 2. 标准夹具（Fixture）

所有逐型验收**优先使用下列固定数据集**，便于 DE 对照与回归复现。SQL 模式可用内置 SQLite 演示源或 mock `apiFetch`。

### F1 · 日销售（笛卡尔通用）

| 字段 | 类型 | 示例值 |
|------|------|--------|
| `sale_date` | 维度 | 2025-07-01 … 2025-07-05 |
| `region` | 维度 | 华东 / 华北 / 华南 |
| `product` | 维度（子类别） | A / B |
| `amount` | 指标 | 100, 200, 150 … |

```sql
-- F1 最小 5 行
SELECT '2025-07-01' AS sale_date, '华东' AS region, 'A' AS product, 100 AS amount
UNION ALL SELECT '2025-07-01', '华北', 'A', 80
UNION ALL SELECT '2025-07-02', '华东', 'B', 120
UNION ALL SELECT '2025-07-02', '华南', 'A', 90
UNION ALL SELECT '2025-07-03', '华北', 'B', 200;
```

**DATA 断言**：柱/线 X 轴含 5 个日期或 3 个地区（视维度选择）；Y 轴最大值 ≥ 200；tooltip 悬停显示与行内 `amount` 一致。

### F2 · 地区占比（饼/雷达/树图）

| region | amount |
|--------|--------|
| 华东 | 40 |
| 华北 | 35 |
| 华南 | 25 |

**DATA 断言**：扇区/节点 3 个；占比约 40% / 35% / 25%（容差 ±1%）。

### F3 · 省级地图（GEO-IRON-01）

| province | value |
|----------|-------|
| 广东省 | 320 |
| 浙江省 | 280 |
| 四川省 | 150 |

**FIELD 断言**：维度为**省名**或 **adcode**，禁止 `region_id` 直绑。  
**DATA 断言**：三省有填色；未匹配省份走占位/提示。

### F4 · 桑基/关系

| source | target | weight |
|--------|--------|--------|
| 访问 | 注册 | 100 |
| 注册 | 付费 | 40 |
| 访问 | 跳出 | 60 |

**FIELD 断言**：维度槽「起始」「终点」顺序与数据列一致。

### F5 · 明细表

| id | name | amount |
|----|------|--------|
| 1 | Alpha | 10 |
| 2 | Beta | 20 |

### F6 · 矩阵热力（t-heatmap）

| x_dim | y_dim | value |
|-------|-------|-------|
| Mon | AM | 10 |
| Mon | PM | 20 |
| Tue | AM | 15 |

### F7 · 指标/仪表

| revenue |
|---------|
| 86.5 |

单指标；gauge/liquid 支持 0–1 或 0–100 百分比语义。

### F8 · K 线（stock-line）

| date | open | close | low | high |
|------|------|-------|-----|------|
| 2025-01-02 | 10 | 12 | 8 | 14 |

### F9 · 子弹图（bullet-graph）

| category | actual | target |
|----------|--------|--------|
| KPI-1 | 80 | 100 |

---

## 3. 通用检查项（所有非 deprecated 类型）

### 3.1 L1 RENDER

| ID | 检查项 | 期望 |
|----|--------|------|
| R-01 | 执行查询 | `useChartExecute` 成功返回 `columns` + `rows` |
| R-02 | 容器挂载 | D3：`data-testid` 见 §4；表格：`d3-table-chart`；KPI：`d3-kpi-chart` |
| R-03 | 空数据 | `rows: []` → 「暂无数据」，不抛错 |
| R-04 | 查询失败 | 显示 `mapApiError` 中文 + 「重试」 |
| R-05 | 画布缩放 | 看板/大屏 resize 后 `layoutFootprint` 触发重绘，图形仍可见 |

### 3.2 L2 DATA

| ID | 检查项 | 期望 |
|----|--------|------|
| D-01 | 字段映射 | `buildPlanForType` 使用的列名与 `dimensions[]` / `metrics[]` 一致 |
| D-02 | 聚合 | 多行同维度时，柱/线/饼按 DE 规则 sum（`encodeCartesianRows` / `encodePieRows`） |
| D-03 | 子类别 | 第 2 维度填入时，出现多系列/分组（bar-group、area-stack 等） |
| D-04 | 图例 | 系列名 = 指标名或子类别值；与 DE 一致 |
| D-05 | 条件格式 | 配置 `conditionalRules` 后，满足条件的柱/点变色（bar 已 `[AUTO]`） |

### 3.3 L3 FIELD

| ID | 检查项 | 期望 | 代码锚点 |
|----|--------|------|----------|
| F-01 | Catalog 规则 | `GET /api/v1/charts/types` 的 `fieldRule` 与下表一致 | `backend/app/viz/builtin/` |
| F-02 | Inspector 槽位 | 文案与 `chartDataSlotBlueprint` 一致 | `chartFieldSlots.ts` |
| F-03 | 必填校验 | 缺必填槽时「更新图表数据」失败，中文提示 | `chartConfigState.ts` |
| F-04 | 切换类型 | `migrateChartViewConfig` + `ensureChartSlotCapacity` | `migrateChartTypes.ts` |
| F-05 | 槽位上限 | 超出 `maxDimensions/maxMetrics` 的字段被裁剪 | `sanitizeChartFieldsForValidate` |

---

## 4. 逐型验收矩阵

图例：**维** = `minDimensions–maxDimensions` · **指** = `minMetrics–maxMetrics` · **夹具** = §2 · **testId** = 渲染容器

> **AUTO 汇总（2026-07-21）**  
> - **43** 个非 deprecated 类型：`T-VIZ-R30`（L1）· `T-VIZ-R31`（L2 plan 编码）· `T-VIZ-R32`（L3 fieldRule/槽位）已全部参数化门禁。  
> - **5** 个 deprecated 类型：`T-VIZ-R33`（`migratesTo` 迁移）已门禁。  
> - 下表 **L1/L2/L3** 列 `☐` 为**浏览器手查**待勾选；**AUTO** 列 `✅` = 已纳入 `pnpm run test:chart-catalog`。

### 4.1 指标（quota）— 对标 DE「指标」区

| chartType | DE 名称 | 维 | 指 | 槽位（DE） | 夹具 | testId | L1 | L2 | L3 | AUTO |
|-----------|---------|:--:|:--:|------------|------|--------|:--:|:--:|:--:|:----:|
| `gauge` | 仪表盘 | 0–0 | 1–1 | 指标 | F7（值 86.5 或 0.865） | `d3-gauge-chart` | ☐ | 指针/数值=86.5 | 仅 1 指标槽必填 | 待补 |
| `liquid` | 水波图 | 0–0 | 1–1 | 指标 | F7 | `d3-liquid-chart` | ☐ | 水位比例正确 | 同 gauge | 待补 |
| `kpi` | 指标卡 | 0–1 | 1–4 | 可选分组 + 指标 | F7（可多指标列） | `d3-kpi-chart` | ☐ | 显示首行指标值 | 0–4 指标 | 待补 |

### 4.2 表格（table）— 对标 DE「表格」区

| chartType | DE 名称 | 维 | 指 | 槽位（DE） | 夹具 | testId | L1 | L2 | L3 | AUTO |
|-----------|---------|:--:|:--:|------------|------|--------|:--:|:--:|:--:|:----:|
| `table-info` | 明细表 | 0–8 | 0–8 | 列（均可选） | F5 | `d3-table-chart` | ☐ | 表头=列名；单元格=行值 | 可不绑维指，SQL 出几列显几列 | ✅ smoke |
| `table-normal` | 汇总表 | 0–8 | 0–8 | 分组维 + 汇总指标 | F5 + 维=region 指=amount | `d3-table-chart` | ☐ | 分组行与聚合值正确 | 槽位「分组」「汇总」 | ✅ smoke |
| `table-pivot` | 透视表 | 0–8 | 0–8 | 行维 + 列维 + 指标 | F5 增 col_dim | `d3-table-chart` | ☐ | 行列交叉格正确 | 行/列/数值三槽 | ✅ smoke |
| `t-heatmap` | 矩阵热力 | 2–2 | 1–1 | 横轴维 + 纵轴维 + 数值 | F6 | `d3-heatmap-chart` | ☐ | 色块 (x,y)→value | **必须 2 维 1 指** | ✅ smoke |

### 4.3 趋势（trend）

| chartType | DE 名称 | 维 | 指 | 子类别/钻取 | 夹具 | testId | L1 | L2 | L3 | AUTO |
|-----------|---------|:--:|:--:|-------------|------|--------|:--:|:--:|:--:|:----:|
| `line` | 基础折线图 | 1–8 | 1–8 | 可选第 2 维、钻取维 | F1 维=date 指=amount | `d3-line-chart` | ☐ | 折线点数=日期数 | 类别轴+值轴 | ✅ smoke |
| `area` | 面积图 | 1–8 | 1–8 | 同上 | F1 | `d3-area-chart` | ☐ | 面积与折线同数据 | 同 line | 待补 |
| `area-stack` | 堆叠面积 | 1–8 | 1–8 | 第 2 维作系列 | F1 维=date+region | `d3-area-chart` | ☐ | 堆叠总和=各点 amount 之和 | 子类别槽 | ✅ smoke |

### 4.4 对比（compare）

| chartType | DE 名称 | 维 | 指 | 特殊 FIELD | 夹具 | testId | AUTO |
|-----------|---------|:--:|:--:|------------|------|--------|:----:|
| `bar` | 基础柱状图 | 1–8 | 1–8 | — | F1 | `d3-bar-chart` | ✅ |
| `bar-stack` | 堆叠柱状图 | 1–8 | 1–8 | 子类别 | F1 + region | `d3-bar-chart` | 待补 |
| `percentage-bar-stack` | 百分比柱状图 | 1–8 | 1–8 | 子类别 | F1 | `d3-bar-chart` | 待补 |
| `bar-group` | 分组柱状图 | 1–8 | 1–8 | 子类别 | F1 + region | `d3-bar-chart` | 待补 |
| `bar-group-stack` | 分组堆叠柱 | 1–8 | 1–8 | 子类别 | F1 | `d3-bar-chart` | 待补 |
| `bar-horizontal` | 基础条形图 | 1–8 | 1–8 | — | F1 | `d3-bar-chart` | ✅ |
| `bar-stack-horizontal` | 堆叠条形图 | 1–8 | 1–8 | 子类别 | F1 | `d3-bar-chart` | 待补 |
| `percentage-bar-stack-horizontal` | 百分比条形 | 1–8 | 1–8 | 子类别 | F1 | `d3-bar-chart` | 待补 |
| `waterfall` | 瀑布图 | 1–1 | 1–1 | 单维单指 | stage+value | `d3-waterfall-chart` | ✅ |
| `bar-range` | 区间条形图 | 1–8 | 1–8 | **2 指标：低/高** | low+high 列 | `d3-bar-range-chart` | ✅ |
| `bidirectional-bar` | 对称条形图 | 1–2 | 1–2 | 双维或双指 | F1 | `d3-bidirectional-bar-chart` | 待补 |
| `progress-bar` | 进度条 | 1–1 | 1–1 | 单维单指 | cat+value(50) | `d3-progress-bar-chart` | ✅ |
| `stock-line` | K 线图 | 1–8 | 1–8 | **4 指：开收低高** | F8 | `d3-stock-chart` | ✅ |
| `bullet-graph` | 子弹图 | 0–2 | 1–3 | 实际/目标/上限 | F9 | `d3-bullet-chart` | ✅ |

**L2 补充（compare）**

- `bar-range`：每类目显示 [low, high] 区间，与两指标列一致。  
- `stock-line`：OHLC 四价与 F8 首行一致。  
- `bullet-graph`：实际值柱 + 目标线位置与 F9 一致。  
- `percentage-*`：同组堆叠合计 ≈ 100%。

### 4.5 分布（distribute）

| chartType | DE 名称 | 维 | 指 | 夹具 | testId | AUTO |
|-----------|---------|:--:|:--:|------|--------|:----:|
| `pie` | 饼图 | 1–1 | 1–1 | F2 | `d3-pie-chart` | 待补 |
| `pie-donut` | 环形图 | 1–1 | 1–1 | F2 | `d3-pie-chart` | ✅ |
| `pie-rose` | 玫瑰图 | 1–1 | 1–1 | F2 | `d3-pie-chart` | 待补 |
| `pie-donut-rose` | 玫瑰环形 | 1–1 | 1–1 | F2 | `d3-pie-chart` | 待补 |
| `radar` | 雷达图 | 1–1 | 1–1 | F2（维=指标名） | `d3-radar-chart` | 待补 |
| `treemap` | 矩形树图 | 1–1 | 1–1 | F2 | `d3-treemap-chart` | 待补 |
| `word-cloud` | 词云 | 1–1 | 1–1 | F2（维=词 指=权重） | `d3-word-cloud-chart` | 待补 |

**L2**：扇区/矩形面积与 `amount` 成正比；词云字号与权重正相关。

### 4.6 双轴（dual_axes）— 对标 DE「双轴图」

| chartType | DE 名称 | 维 | 指 | FIELD 要点 | 夹具 | testId |
|-----------|---------|:--:|:--:|------------|------|--------|
| `chart-mix` | 柱线组合 | 1–8 | **2–8** | **至少 2 个指标**（柱+线） | F1 指=amount, amount2 | `d3-dual-axes-chart` |
| `chart-mix-group` | 分组柱线 | 1–8 | 2–8 | 子类别 + 双指 | F1 + region | 同上 |
| `chart-mix-stack` | 堆叠柱线 | 1–8 | 2–8 | 同上 | F1 | 同上 |
| `chart-mix-dual-line` | 双线组合 | 1–8 | 2–8 | 两指标折线 | F1 两指标列 | 同上 |

**L2**：左 Y 轴对应第一指标、右 Y 轴对应第二指标（或 DE 同等语义）；图例 2 个系列。

### 4.7 关系/流程（relation）

| chartType | DE 名称 | 维 | 指 | FIELD 要点 | 夹具 | testId | AUTO |
|-----------|---------|:--:|:--:|------------|------|--------|:----:|
| `scatter` | 散点图 | 1–2 | 1–2 | X 维 + Y 指；可选大小指 | F1 | `d3-scatter-chart` | 待补 |
| `quadrant` | 象限图 | 1–2 | 1–2 | 同 scatter + 象限线 | F1 | `d3-scatter-chart` | 待补 |
| `multi-scatter` | 多维散点 | 1–2 | 1–2 | 多指标 | F1 | `d3-scatter-chart` | 待补 |
| `funnel` | 漏斗图 | 1–1 | 1–1 | 阶段维 + 数值 | stage+cnt | `d3-funnel-chart` | 待补 |
| `sankey` | 桑基图 | **2–2** | 1–1 | **起始维 + 终点维** | F4 | `d3-sankey-chart` | 待补 |
| `circle-packing` | 圆形填充 | 1–1 | 1–1 | 同 pie | F2 | `d3-circle-packing-chart` | 待补 |
| `graph` | 关系图 | **2–2** | 0–1 | **起点维 + 终点维**；指标可选 | F4 改 source/target | `d3-graph-chart` | 待补 |

### 4.8 地图（map）

| chartType | DE 名称 | 维 | 指 | FIELD 要点 | 夹具 | testId |
|-----------|---------|:--:|:--:|------------|------|--------|
| `map` | 区域地图 | 1–3 | 1–1 | 地区维 + 数据指；可选钻取维 | F3 | `d3-map-chart` |

**L1/L2/L3 必查（GEO-IRON-01）**

- 仅离线中国省级 GeoJSON；无在线瓦片。  
- 省名 join：广东/浙江/四川 有值；错别字走未匹配提示。  
- 省→市下钻：换 adcode 资产后 choropleth 更新。

### 4.9 Deprecated（仅 MIG）

| chartType | 迁移至 | 检查 |
|-----------|--------|------|
| `table` | `table-info` | 打开旧看板自动 migrate；渲染不劣化 |
| `timeline` | `line` | 配置保留时间维 |
| `wordCloud` | `word-cloud` | type ID 更新 |
| `heatmap` | `t-heatmap` | 2 维字段保留 |
| `combo` | `chart-mix` | 双指标保留 |

---

## 5. 执行路径

### 5.1 管理端图表探索（推荐 MANUAL 入口）

1. 打开 **`/admin/charts/explore`**（`ChartExplorePage`）  
2. 左侧选 chartType → 查看 **fieldRule** 与 capabilities  
3. 在看板编辑中为该类型建组件，绑定 §2 夹具 SQL  
4. 按 §4 矩阵勾选 L1/L2/L3  

### 5.2 自动化（AUTO）

```bash
# 前端一键门禁（L1 + L2 + L3 + MIG + 注册表 + 槽位 + 样式链 + 引擎依赖）
cd fe && pnpm run test:chart-catalog

# 或分项：
cd fe && pnpm exec vitest run \
  src/components/charts/charts.smoke.test.tsx \
  src/components/charts/chartCatalogSmokeFixtures.test.ts \
  src/components/charts/chartCatalogData.test.ts \
  src/components/charts/chartCatalogFieldRules.test.ts \
  src/components/charts/chartCatalogMigration.test.ts \
  src/lib/buildChartRenderModel.test.ts

# Backend catalog ↔ FE
cd fe && pnpm exec vitest run src/components/charts/engine/plugins/catalogParity.test.ts
python -m pytest tests/test_viz_chart_catalog_parity.py -q
```

### 5.3 AUTO 覆盖状态（2026-07-21）

| 项 | 状态 | 锚点 |
|----|------|------|
| 43 型 L1 可渲染 | ✅ | `T-VIZ-R30-001` · `chartCatalogSmokeFixtures.ts` |
| 43 型 L1 空数据 R-03 | ✅ | `T-VIZ-R30-002` |
| 43 型 L2 数据编码 | ✅ | `T-VIZ-R31-001` · `chartCatalogData.test.ts` |
| 43 型 L3 字段规则 | ✅ | `T-VIZ-R32-*` · `chartCatalogFieldRules.test.ts` |
| BE↔FE fieldRule 快照 | ✅ | `test_field_rules_match_fe_snapshot` · `chartCatalogBackendFieldRules.ts` |
| catalog 数量门禁 | ✅ | `chartCatalogSmokeFixtures.test.ts` |
| gauge/liquid 无维度 | ✅ | `buildChartRenderModel.ts` |
| graph 指标可选 | ✅ | `buildChartRenderModel.ts` |
| 双轴槽位 2 指标 | ✅ | `chartFieldSlots.ts` · `dual_axes` blueprint |
| deprecated MIG | ✅ | `T-VIZ-R33-*` · `chartCatalogMigration.test.ts` |

### 5.4 闭环清单（2026-07-21）

| # | 项 | 状态 | 证据 |
|---|-----|------|------|
| 1 | 43 型 L1 可渲染 + 空数据 | ✅ | `T-VIZ-R30-001/002` |
| 2 | 43 型 L2 plan 数据编码 | ✅ | `T-VIZ-R31-001` |
| 3 | 43 型 L3 fieldRule + 槽位 | ✅ | `T-VIZ-R32-*` |
| 4 | 5 型 deprecated 迁移 | ✅ | `T-VIZ-R33-*` |
| 5 | FE↔BE catalog 数量/fieldRule | ✅ | `catalogParity` + pytest |
| 6 | 双轴 Inspector 2 指标槽 | ✅ | `T-INSP-DE-09` |
| 7 | 引擎依赖零 AntV 画布 | ✅ | `check:chart-engine` |
| 8 | §4 矩阵浏览器手查 | ☐ | `/admin/charts/explore` 走查后勾选 L1/L2/L3 列 |

### 5.5 待补（P2 · 非阻断 AUTO 闭环）

| 优先级 | 范围 | 做法 |
|--------|------|------|
| P2 | L2 DOM 数值 | 渲染后 text/attribute 与 mock 对照（tooltip、KPI 数值） |
| P2 | 地图/桑基/关系图 | 节点/边数量 DOM 断言、tooltip 数值 |
| MANUAL | §4 矩阵勾选 | 浏览器走查后 L1/L2/L3 列改 ✅ |

---

## 6. 单型走查记录模板

```markdown
### VIZ-CHK-{chartType}

- **日期**:
- **执行人**:
- **夹具**: F1 / F2 / …
- **配置快照**: dimensions / metrics / sql

| 层级 | 结果 | 证据 |
|------|------|------|
| L1 RENDER | ✅/❌ | testId / 截图 |
| L2 DATA | ✅/❌ | 期望值 vs 实际（列具体数值） |
| L3 FIELD | ✅/❌ | 槽位文案 / 校验提示 |

- **与 DE 差异**:
- **缺陷 ID**:
```

---

## 7. 缺陷登记

```markdown
### BUG-VIZ-xxx
- **chartType**:
- **层级**: L1 | L2 | L3
- **夹具**:
- **复现**:
- **期望（DE）**:
- **实际**:
- **根因文件**:
```

---

## 8. 与 DataEase 的对齐说明

| DE 能力 | VitalSpan 对应 | 验收注意 |
|---------|----------------|----------|
| 图表类型分区（指标/表格/趋势/对比/分布/地图/关系/双轴） | `paletteCategory` + Picker 八区 | `ChartExplorePage` 分类筛选 |
| 数据项拖拽槽位 | `chartDataSlotBlueprint` | §3.3 F-02 |
| 维度/指标数量限制 | `FieldRule` in catalog | §3.3 F-01 |
| 图表内点击下钻 | `chartDrill` + `drillClickField` | 表格列 / 柱线点 |
| 跳转 | `chartJump` | 优先于下钻 |
| 条件样式 | `conditionalRules` → D3 fill | bar 已 AUTO |
| 辅助线 | `markLines` → D3 | 笛卡尔图 MANUAL |
| 地图下钻 | 离线 GeoJSON adcode | §4.8 |

---

## 9. 文档同步

| 变更 | 同步 |
|------|------|
| 新增 chartType / 改 field_rule | `backend/app/viz/builtin/` + `metadata.ts` + 本文 §4 |
| 改槽位文案 | `chartFieldSlots.ts` + 本文 §4 |
| 验收完成度 | 更新 §4 矩阵 ☐→✅ 与 `docs/automate/evolution-state.md` |

---

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-21 | **AUTO 闭环**：`pnpm test:chart-catalog` + §5.4 清单 + MIG 门禁 |
| 2026-07-21 | L2/L3 AUTO：plan 数据断言 + fieldRule 契约 + 双轴槽位修复 |
| 2026-07-21 | P0：43 型 L1 AUTO smoke + buildChartRenderModel 字段校验修复 |
| 2026-07-21 | 初版：D3 全量后逐型 L1/L2/L3 矩阵 + 标准夹具 + AUTO 路径 |
