# 项目锚定方案评审 — GIS / map-3d 飞线能力路线选择

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-24 |
| Skill | `~/.cursor/skills/project-grounded-review/` |
| 问题 | 用户在看 **gis-map** 全球底图时问「有没有飞线」；需在多条技术路线间选型 |
| 选项 | S0 维持现状 · A gis-map MapLibre OD 飞线 · B map-3d Three T7 飞线 · C 双轨并行 · D map-3d 装饰飞线（无数据） |
| 裁决 | **RECOMMEND_SYNTHESIZED**（分场景分期，禁止 C） |
| 方向纠正强度 | **改道** |
| 置信度 | **HIGH** |
| **交付** | 判 + 纠 + 给（§6–§9 完整） |

---

## 1. 项目约束摘录

| ID | 来源 | 约束/现状 | 对方案的影响 |
|----|------|-----------|--------------|
| C-01 | `docs/arch.md` ADR-12 A | `map`/`map-3d` **仅离线中国** GeoJSON；禁止瓦片底图 | 省际大屏飞线应落在 **map-3d**，不能借 gis-map 省界 |
| C-02 | `docs/arch.md` ADR-12 B | `gis-map` **仅**管理员登记 **全球 PMTiles** + MapLibre 薄封装 | 全球 OD/航线飞线应落在 **gis-map** overlay，不能回退离线省界 |
| C-03 | `docs/services/viz.md` | `gis-map` 已实现 **散点叠加**（经/纬/指标/标签）；区域着色用 `map`/`map-3d` | 飞线是 **新 overlay 子类型**，不是散点配置延伸 |
| C-04 | `docs/feature-truth/2026-08-24-gis-scatter-overlay-truth-audit.md` | 散点 P1 **PARTIAL 7/10**；面板/UI/浏览器仍有余债 | **S0**：飞线不应抢 P1 收尾优先级 |
| C-05 | `docs/automate/plans/2026-07-22-geo-map-3d-national-datav.md` T7 | 飞线 **P3/M3**；`threeGeoFlyLine.ts` **[新]**；建议 **装饰 demo → 正式流向槽** | B/D 有规划锚点，但 **未纳入当前里程碑** |
| C-06 | 代码 Grep | `threeGeoFlyLine.ts` **0 命中**；`threeGeoProject.ts` 仅有 `flowProjection` **预备** | B 不是「差一点就有」，是 **0→1** |
| C-07 | `fe/src/lib/chartDeAxis/catalog.ts` | `gis-map` 槽位：经度·纬度·指标·标签；**无 from/to 流向槽** | A/B 均需 **PRD + catalog 扩槽** |
| C-08 | `.cursor/rules/geo-map-offline-china.mdc` | 禁止在线瓦片/SDK | A/B 均须 **离线/登记底图** 内渲染，禁止 ECharts 在线 map |

---

## 2. 问题重述

**用户问题**：在 GIS 地图样式里看不到飞线，该怎么选、要不要做、做在哪条 chartType？

**纠正后问题**：在 **全球 gis-map** 与 **中国 map-3d 大屏** 两条 GEO 路径中，按 **业务场景** 选择飞线落点；在散点 P1 未闭合前 **不并行开飞线**；若做则走 **独立 overlay + 独立 fieldRule**，避免与散点共用「经/纬两维」语义。

---

## 3. 选项归一

| 选项 | 一句话 | 引擎 | 数据模型 | 现状 |
|------|--------|------|----------|------|
| **S0** | 暂不做飞线；收尾 gis 散点 P1 | — | 现有 lng/lat 散点 | 散点已有，飞线无 |
| **A** | **gis-map** MapLibre 弧线/大圆 OD 层 | MapLibre `line` + 可选动画 | `from_lng/lat` + `to_lng/lat`（4 维或 2 点对 + 指标） | **未实现** |
| **B** | **map-3d** Three 省际流向飞线（T7 正式轨） | Three.js 贝塞尔 + UV 动画 | 省/市 **区域名** from/to 或 flow 槽 | **未实现**（仅有 projection 预备） |
| **C** | gis-map + map-3d **同时做** | 双引擎 | 共用或镜像 fieldRule | **禁止**（语义与 ADR 双路径冲突） |
| **D** | **map-3d 装饰飞线**（固定/demo 路径，不绑查询） | Three | 无 Dataset | 最快出「好看」但 **换 chartType** |

---

## 4. 证据与假设

| 证据 | 类型 | 结论 |
|------|------|------|
| `gisMapOverlay.ts` 只输出 Point GeoJSON | T1 代码 | gis-map **无** LineString 层 |
| `gisMapStyle.ts` 层 id：`vs-gis-overlay-circles` 等 | T1 | 无 flyline layer |
| `threeGeoProject.ts:27-32` `flowProjection` | T1 | map-3d **有意预留** flow 坐标系，**无渲染器** |
| 用户截图经度 `-92.50`、纬度 `52.37` | 上下文 | 当前诉求锚在 **全球 gis-map**，非中国 choropleth |
| F06-VIZ 演化建议 | T0 文档 | 强调 map-3d **点位特效**（光柱/热力 blob）；**飞线未写入 PRD 验收** |
| `2026-08-17-gis-map-chart-type-p0-p1.md` Out | T0 | Phase0+1 **不含** Dataset→GeoJSON 以外的叠加（后续散点为 companion） |

**假设（待产品确认）**：

- H1：若目标是 **全球物流/航线/跨境 OD** → 必须 **A**，B 不适用。
- H2：若目标是 **全国大屏省→省流向（sc-datav）** → 必须 **B/D**，且 chartType 换 **map-3d**。
- H3：若只是「地图上要有动态线」demo → **D** 工期最短，但 **不能**留在 gis-map 上期待同样效果。

---

## 5. 多维打分（10 分制，越高越好）

| 维度 | S0 | A | B | C | D |
|------|----|----|----|----|---|
| ADR-12 合规 | 10 | 9 | 9 | 3 | 9 |
| 与当前 gis-map 会话匹配 | 8 | **10** | 2 | 5 | 2 |
| 现码复用 | 7 | **8** | 6 | 4 | 7 |
| 工期（越短越高） | 10 | 5 | 4 | 2 | 6 |
| 可验收性 | 9 | 7 | 6 | 3 | 5 |
| 与里程碑/资源 | **9** | 6 | 5 | 1 | 5 |
| **加权倾向** | 收尾 | **全球飞线正解** | 中国大屏正解 | **否决** | 演示捷径 |

---

## 6. 裁决

**RECOMMEND_SYNTHESIZED** — 按场景 **二选一**，禁止 C；时间上 **先 S0 再 A 或 B**。

| 你的场景 | 选 | 理由 |
|----------|-----|------|
| 继续用 **gis-map + PMTiles**，要 OD/航线/跨境弧 | **A**（Phase 2） | 唯一合规的全球路径；可复用 `gisMapOverlay*` 管线模式 |
| 全国 **3D 省界大屏**，要 sc-datav 式省际飞线 | **B**（或先 **D** 再 B） | T7 已规划；`flowProjection` 可接；与 gis-map 无关 |
| 短期只要「看见飞线」、可换图表类型 | **D → B** | 装饰 demo 1–2d；正式绑数走 B |
| 散点还没稳、资源有限 | **S0** | 审计 7/10；先闭合 T4–T6 再开新 overlay |
| 两个场景都要 | **A 然后 B**（序列） | **绝不 C 并行**；fieldRule 不可共用 |

**否决**：**C 双轨并行** — field 语义、Inspector、测试、文档各翻倍，且违反「一图一引擎路径」产品心智。

---

## 7. 规划方向纠正

**原方向错在哪？**

- 在 **gis-map 全球会话**里找飞线，却可能潜意识对标 **map-3d/sc-datav 大屏** — 两条 ADR 路径被混谈。
- 把飞线当成散点样式「加一个开关」— 现有 `gisProject.overlay` 是 **圆点** 语义，无 LineString。
- 以为仓库「已有 flowProjection = 飞线快完成了」— **仅坐标预备，0 渲染代码**。

**纠正后目标（一句话）**：先闭合 **gis-map 散点 P1**；再按场景在 **gis-map（全球 OD）** 或 **map-3d（中国流向）** 之一新增 **独立飞线 overlay + PRD 槽位**，分期交付。

**应停止**：

- 在 gis-map 上硬塞 map-3d Three 飞线（引擎/坐标系不兼容）。
- 未扩 fieldRule 前在 Inspector 加「飞线开关」（会与经/纬散点槽冲突）。
- 与散点 P1 并行开飞线（同一 `GisMapView` 栈，回归面叠加）。

**应优先**：

1. gis 散点审计 P0 余项（`ChartGisMapOverlayPanel` 测、style 重载、浏览器见点）— 见 `2026-08-24-gis-scatter-overlay-truth-audit.md` §9。
2. 产品确认 **H1 vs H2**（一张表即可）。
3. 确认后再 `/plan-create` 对应 Phase（A 或 B）。

**与里程碑对齐**：

| 对齐项 | 方案 | 项目现状 | 纠正建议 |
|--------|------|----------|----------|
| gis-map P0+P1 | 散点 + 底图 | 2026-08-17 plan **已交付**；散点 companion **进行中** | 飞线 = **P2 overlay**，不写进已勾选 P1 |
| map-3d 飞线 | T7 | plan **M3 可选**，PRD **未勾选** | 走 plan-create 单独立项，回写 F06-VIZ 演化 |

---

## 8. 推荐解决方案（合成）

### 8.1 方案摘要

**名称**：**分场景双轨、序列交付 · 飞线 overlay**  
**类型**：SYNTHESIZED（S0 → A 或 B，否决 C）  
**一句话**：全球 OD 走 **gis-map MapLibre 线层**；中国大屏走 **map-3d T7**；当前 **只收尾散点**，飞线下一 plan。

### 8.2 目标与非目标

| 目标（Phase 1 = 现在） | 非目标（本期不做） |
|------------------------|-------------------|
| 闭合 gis-map 散点 P1（测 + 浏览器 + style 不重载） | gis-map + map-3d **同时**飞线 |
| 产品确认飞线场景（全球 OD vs 中国省际） | 用 ECharts 在线地图或第三方飞线 SDK |
| 输出 **单一** 飞线 plan（A **或** B） | 把飞线塞进 `overlay.cluster` 等散点开关 |
| | 无 PRD 槽位先上 UI |

| 目标（Phase 2A — 若选全球） | 目标（Phase 2B — 若选中国大屏） |
|-----------------------------|--------------------------------|
| `buildGisFlowGeoJson` + MapLibre line layer | `threeGeoFlyLine.ts` + `renderThreeChoropleth` 挂载 |
| catalog：`fromLng/fromLat/toLng/toLat` 或 flow 轴 | catalog：区域 from/to 或 `flow` 维 |
| `ChartGisMapFlowPanel` 或 overlay 子 Tab | `ChartGeo3dStylePanel` 飞线块 |
| demo Dataset `demo-map-flow` | 装饰 demo：固定省会→首都 |

### 8.3 架构与触及面

**Phase 2A（gis-map，全球 OD）**

| 层 | 动作 | 路径/模块 | 复用 |
|----|------|-----------|------|
| domain | GeoJSON LineString + 大圆插值 | `fe/.../maplibre/gisMapFlow.ts` **[新]** | `gisMapOverlay.ts` 行迭代模式 |
| domain | MapLibre line paint/layout | `gisMapOverlayStyle.ts` 或 `gisMapFlowStyle.ts` | `appendGisOverlayLayers` 模式 |
| entry | 样式面板 | `ChartGisMapFlowPanel.tsx` **[新]** | `ChartGisMapOverlayPanel` |
| config | `gisProject.flow` 或 `overlay.mode` | `gisProject.ts` | `GisProjectOverlay` schema |
| catalog | DE 轴扩槽 | `chartDeAxis/catalog.ts` | gis-map entry |
| docs | PRD + services | F06-VIZ · `viz.md` | prd-sync |

**Phase 2B（map-3d，中国流向）**

| 层 | 动作 | 路径/模块 | 复用 |
|----|------|-----------|------|
| domain | 贝塞尔飞线 mesh | `three/layers/threeGeoFlyLine.ts` **[新]** | plan T7 |
| domain | 坐标 | `three/geo/threeGeoProject.ts` | **`flowProjection` / `projectForFlowPath`** |
| entry | 样式 | `ChartGeoStylePanel` / geo3d 块 | `geo3dPointEffects` 模式 |
| catalog | from/to 区域 | `catalog.ts` `map-3d` | 区域 centroid：`geo3dRegionCentroid.ts` |

### 8.4 实施步骤（有序）

| 步 | 内容 | 依赖 | 验收 |
|----|------|------|------|
| **0** | 产品选场景（H1/H2 二选一） | — | 书面记录于 plan 背景 |
| **1** | 闭合散点 P1：OverlayPanel 测 + GisMapView style 固定 empty overlay | — | vitest 绿 + 浏览器见散点 |
| **2a** | （若 A）PRD 草案：`gis-map` flow 槽 + `gisProject.flow` schema | 1 | F06-VIZ 演化条 + catalog 评审 |
| **3a** | `buildGisFlowGeoJson` + line layers + 静态弧（无动画） | 2a | `gisMapFlow.test.ts` 2 点 1 线 |
| **4a** | 面板 + demo SQL + seed dataset | 3a | 预览见弧；feature-truth 审计 |
| **5a** | （可选）line-gradient / dash 动画 | 4a | 手测 60fps |
| **2b** | （若 B）T7 装饰 demo：固定 3 条省会飞线 | 1 | map-3d 预览可见，无 Dataset |
| **3b** | 区域 from/to 绑数 + Inspector | 2b | 粤→京 demo 数据单测 |
| **4b** | PRD 回写 + T9 文档 | 3b | prd-sync |

### 8.5 风险与回退

| 风险 | 缓解 | 回退 |
|------|------|------|
| 飞线与散点 field 冲突 | 独立 catalog 轴或 `chartType` 子 mode | 仅保留散点，删 flow 槽 |
| MapLibre 线动画性能 | 先静态线；动画 Phase 5a | 关动画，保留线 |
| map-3d WebGL 槽位满 | T3 质量档位降级 | 自动 2D map |
| 无 PMTiles 环境 gis 不可验 | 走查清单写依赖 seed | 仅单测不宣称 REAL |

### 8.6 对 Cursor/直觉方案的具体纠正

| 原建议 | 问题 | 纠正后做法 |
|--------|------|------------|
| 「在 gis-map 上加飞线开关」 | overlay 是散点 schema | 新 `flow` 子配置 + 新 GeoJSON 层 |
| 「复用 map-3d 飞线到 GIS」 | ADR 双路径、引擎不同 | 全球只 MapLibre；中国只 Three |
| 「flowProjection 已有=快」 | 无 renderer | 仍计 **2–3d**（B）或 **3–5d**（A 含 PRD） |
| 「和散点一起做」 | P1 未闭合 | **S0 优先**，飞线下一 plan |

---

## 9. 规划提纲（交 plan-create）

**背景与目标**：用户在 **gis-map** 全球视角需要飞线能力；仓库 **当前无**；需按场景在 A/B 择一，序列于散点 P1 之后。

**硬约束**：C-01 · C-02 · C-07 · C-08 · GEO-IRON-01

**改动清单草案**（Phase 2A 示例；若选 B 换 T7 文件表）：

1. `docs/automate/prd/F06-VIZ.md` — 新增 gis-map flow overlay 验收条
2. `fe/src/lib/chartDeAxis/catalog.ts` — gis-map from/to 四维或 flow 轴
3. `fe/src/components/charts/engine/maplibre/gisMapFlow.ts` — LineString 构建
4. `fe/src/components/charts/engine/maplibre/gisMapFlowStyle.ts` — line layer
5. `fe/src/components/charts/engine/maplibre/gisProject.ts` — `flow?: GisProjectFlow`
6. `fe/src/components/dashboard/chartStyleSections/ChartGisMapFlowPanel.tsx`
7. `fe/src/components/charts/engine/maplibre/GisMapView.tsx` — sync flow layer
8. `scripts/seed-demo-package.py` — `demo-map-flow` 示例
9. `docs/services/viz.md` — In/Out 更新
10. `docs/feature-truth/2026-08-24-gis-flow-overlay-truth-audit.md` — 实施后审计

**验证方案**：

```bash
cd fe && pnpm vitest run src/components/charts/engine/maplibre/gisMapFlow.test.ts
cd fe && pnpm vitest run src/components/dashboard/chartStyleSections/ChartGisMapFlowPanel.test.tsx
# 浏览器：seed 后 gis-map 预览见 OD 弧线；错绑 province 仍黄条
```

**非目标**：C 双轨 · 在线地图 SDK · iframe MapLibre · 飞线与散点共用一个「经度/纬度」槽表达 OD

**待验证 spike**（选 B 时）：`threeGeoFlyLine.ts` 单弧 mesh + UV 滚动 4h PoC

---

## 10. 验证命令（Phase 1 散点收尾，立即可跑）

```bash
cd fe && pnpm vitest run src/components/dashboard/chartStyleSections/ChartGisMapOverlayPanel.test.tsx
cd fe && pnpm vitest run src/components/charts/engine/maplibre/gisMapOverlay.test.ts
```

---

## 11. 交接与下一步

1. **请你确认场景**（回复其一即可）：
   - **H1**：全球 gis-map OD / 航线 → 走 **Phase 2A**
   - **H2**：中国 map-3d 省际大屏 → 走 **Phase 2B**（可先 D 装饰）
2. 确认后：`/plan-create` 引用本报告 §9（标题建议 `2026-08-24-gis-flow-overlay` 或 `map-3d-flyline-t7`）
3. 散点 P1 未闭合前：**不启动飞线编码**

---

## Review Progress

```
Review Progress: [✅]0问询 [✅]1真理源 [✅]2选项 [✅]3证据 [✅]4打分 [✅]5裁决 [✅]6方向纠正 [✅]7方案合成 [✅]8规划提纲 [✅]9落盘
本回合落盘：docs/reviews/grounded/2026-08-24-gis-flyline-route-adjudication.md
下一步：用户确认 H1/H2 → plan-create
```
