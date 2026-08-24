# Feature Truth Audit: gis-map 全球 OD 飞线叠加

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-24 |
| 核验范围 | `docs/automate/plans/2026-08-24-gis-map-flow-overlay.md` 全清单 + 同会话「初始视角两位小数」 |
| 锚点 | `gisMapFlow*.ts` · `gisProject.flow` · `ChartGisMapFlowPanel` · `GisMapView.tsx` |
| 总体判定 | **PARTIAL** |
| **总分 / 档位** | **7/10 · B** |
| 状态 | approved-fix（P0/P1 走查 2026-08-24 18:58） |
| **sampling** | `full`（plan 10 改动区 + 9 面板控件 + 1 数据按钮） |

## 1. 核验标准与预期

| ID | 期望行为（可观察） | 依据 |
|----|-------------------|------|
| T1 | 样式 Tab「OD 飞线」可开；控件写入 `gisProject.flow` | plan 成功标准 |
| T2 | 绑定 from/to 四维 + 可选流量 → 底图出现大圆弧线 | plan 成功标准 |
| T3 | `flow.enabled=true` 时散点 GeoJSON 不构建（互斥） | plan 关键决策 |
| T4 | 数据 Tab 一键接入全球枢纽 OD SQL + 槽位 | plan §8 |
| T5 | vitest：GeoJSON · layer · 面板 enable · lib apply | plan 验证方案 |
| T6 | catalog/BE `maxDimensions: 5`；drill×3 | plan #7 |
| T7 | flow 模式 data hint 文案与 warn | plan #9 |
| T8 | `docs/services/viz.md` 登记 OD 飞线 | plan #10 |
| T9 | `flow.enabled` 未开时散点行为不变 | plan 成功标准 |
| T10 | 初始视角两位小数 + 上下限（同会话） | 用户 prior 需求 |
| T11 | 浏览器：PMTiles 预览可见弧线 | plan 隐含验收 |

- 非目标：map-3d 飞线 · 线动画 · 散点同屏 · F06-VIZ 勾选（plan 未列）

## 2. 完整链路图

```
ChartGisMapFlowSetup / 手绑槽位
  → chartConfig.dimensions[0..3] + metrics[0]
  → buildGisFlowGeoJson (flow.enabled)
  → GisMapView flowGeoJson
  → syncGisFlowData → vs-gis-flow source
  → vs-gis-flow-lines (LineString paint)

ChartGisMapFlowPanel
  → patchFlow → writeGisProject({ flow })
  → syncGisFlowStyle (setPaintProperty)
```

| 序 | 层 | 状态 | L1 证据 | 说明 |
|----|----|------|---------|------|
| 1 | schema `GisProjectFlow` | 通 | `gisProject.ts` · read/write | normalize + resolve |
| 2 | GeoJSON 大圆 | 通 | `gisMapFlow.test.ts` 3/3 | LineString + weightNorm |
| 3 | MapLibre layer 定义 | 通 | `gisMapFlowStyle.test.ts` 2/2 | source/layer id |
| 4 | 运行时 setData | **部分** | `GisMapView.tsx:509-534` | 接线有；**无 Map mock 单测** |
| 5 | 样式 setPaint | **部分** | `gisMapFlowStyle.ts:89` | 无 mock 单测 |
| 6 | 面板 → 持久化 | **部分** | `ChartGisMapFlowPanel.test.tsx` 1/1 | 仅测 enable |
| 7 | 注册 profile | 通 | `chartTypeStyleProfiles.ts:57-64` | gisFlow section |
| 8 | catalog/BE | 通 | `catalog.test.ts` · pytest parity 4/4 | maxDim 5 |
| 9 | 数据 hint flow | **部分** | `gisMapDataHint.ts` 有分支 | **无 flow 专用单测** |
| 10 | 文档 | 通 | `docs/services/viz.md:71` | 一行登记 |
| 11 | 地图可见弧线 | **未验** | 无 BROWSER | 同 scatter 编辑态 mount 限制 |

## 3. 子能力判定表

| ID | 子能力 | 判定 | 总分/档 | 证据摘要 |
|----|--------|------|---------|----------|
| T1 | 样式面板 + flow 持久化 | PARTIAL | 6/C | 1 UI 测；7 控件未 UI 验 |
| T2 | 弧线渲染 | PARTIAL | 6/C | CHAIN 绿；无 BROWSER |
| T3 | 与散点互斥 | REAL | 8/B | `gisMapOverlay.ts` early return + test |
| T4 | 一键 OD 示例 | PARTIAL | 7/B | lib test；无 Setup 按钮 test |
| T5 | 单测门禁 | PARTIAL | 7/B | 29 vitest 绿；缺 sync/hint-flow |
| T6 | 槽位扩展 | REAL | 8/B | catalog + BE parity |
| T7 | flow data hint | STUB | 5/D | 代码有；0 flow 单测 |
| T8 | 文档 | REAL | 8/B | viz.md |
| T9 | 散点回归 | REAL | 8/B | overlay.test 3/3 |
| T10 | 初始视角格式 | REAL | 8/B | project panel test 4/4 + gisProject clamp test |
| T11 | 浏览器见线 | UNVERIFIED | 3/D | 未跑 |

## 3b. 前端控件下钻表（OD 飞线面板 + 数据按钮）

| ID | 文案/位置 | handler | 期望 | 实际 | L | C | D | E | F | 总分 | 判定 | 证据 |
|----|-----------|---------|------|------|---|---|---|---|---|------|------|------|
| B1 | 启用 OD 飞线 | `patchFlow enabled` | nativeBody.flow.enabled | userEvent 验 | 2 | 2 | 2 | 1 | 1 | 8 | **REAL** | `ChartGisMapFlowPanel.test.tsx` |
| B2 | 飞线颜色 | swatch | flow.color | 静态 wiring | 1 | 0 | 2 | 1 | 1 | 5 | STUB | `:64-67` |
| B3 | 不透明度 | slider | flow.opacity | 未验 | 1 | 0 | 2 | 1 | 1 | 5 | STUB | `:78-86` |
| B4 | 最小线宽 | slider | flow.widthMin | 未验 | 1 | 0 | 2 | 1 | 1 | 5 | STUB | `:88-97` |
| B5 | 最大线宽 | slider | flow.widthMax | 未验 | 1 | 0 | 2 | 1 | 1 | 5 | STUB | `:99-108` |
| B6 | 按流量缩放 | switch | scaleByMetric | CHAIN 表达式 | 2 | 1 | 2 | 1 | 1 | 7 | PARTIAL | builder in style |
| B7 | 自动定位 | switch | autoFit | GisMapView 接线 | 2 | 0 | 2 | 1 | 1 | 6 | PARTIAL | 无 fit 行为 L1 |
| B8 | 恢复默认 | button | flow=undefined | 未验 | 1 | 0 | 2 | 1 | 1 | 5 | STUB | `:46-48` |
| B9 | 一键 OD 示例 | `applyGisMapFlowConfig` | SQL+槽位+enabled | lib test only | 2 | 2 | 1 | 1 | 1 | 7 | PARTIAL | `gisMapFlow.test.ts` |

功能块映射：T1→B1–B8；T4→B9

## 3d. 覆盖矩阵

| 实体 ID | 类型 | GATE | CHAIN | UI | 深度 | L | C | 判定 | 证据 |
|---------|------|------|-------|-----|------|---|---|------|------|
| E01 gisProject.flow schema | 域 | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | PARTIAL | gisProject.test |
| E02 buildGisFlowGeoJson | 域 | ❌ | ✅ | ❌ | CHAIN | 2 | 2 | PARTIAL | gisMapFlow.test |
| E03 gisMapFlowStyle layers | 渲染 | ❌ | ✅ | ❌ | CHAIN | 2 | 2 | PARTIAL | gisMapFlowStyle.test |
| E04 syncGisFlowData/Style | 运行时 | ✅ | ❌ | ❌ | GATE | 1 | 0 | STUB | GisMapView Read |
| E05 GisMapView append flow | 运行时 | ✅ | ❌ | ❌ | GATE | 1 | 0 | STUB | style useMemo |
| E06 chartTypeStyle gisFlow | 注册 | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | profiles |
| E07 catalog 5 dims | 契约 | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | PARTIAL | catalog.test |
| E08 BE GIS_MAP_RULE 5 | 契约 | ✅ | ✅ | ❌ | CHAIN | 2 | 2 | PARTIAL | pytest parity |
| E09 gisMapDataHint flow | 提示 | ✅ | ❌ | ❌ | GATE | 1 | 0 | STUB | 无 flow test |
| E10 viz.md | 文档 | ✅ | ❌ | ❌ | GATE | 1 | 1 | STUB | Read |
| E11 scatter 互斥回归 | 回归 | ❌ | ✅ | ❌ | CHAIN | 2 | 2 | PARTIAL | overlay.test |
| E12 初始视角 clamp | 同会话 | ❌ | ✅ | ⚠️ | CHAIN | 2 | 2 | PARTIAL | ProjectPanel test |
| E13 浏览器见弧线 | 验收 | ❌ | ❌ | ❌ | NONE | 0 | 0 | UNVERIFIED | — |

### 覆盖摘要

| 指标 | 值 |
|------|-----|
| 必验实体 | 13 |
| GATE only | 5（E04–E06,E09–E10） |
| CHAIN | 7 |
| UI / BROWSER | 1（B1 REAL）；E13 NONE |
| NONE（未验） | 1（E13） |
| REAL 达标（Bx） | 1 / 9 |
| **逐一校验** | **否** — 缺 BROWSER、7 面板控件 UI 测、flow hint 单测、sync 单测 |
| 总体可否 REAL | **否** |

## 3c. 五维评分汇总

| ID | L | C | D | E | F | 总分 | 档位 | 真假 |
|----|---|---|---|---|---|------|------|------|
| T2 弧线可见 | 1 | 0 | 2 | 1 | 1 | 5 | D | UNVERIFIED |
| T1 面板 | 2 | 1 | 2 | 1 | 1 | 7 | B | PARTIAL |
| T5 单测 | 2 | 2 | 1 | 2 | 1 | 8 | B | PARTIAL |
| **总体** | — | — | — | — | — | **7** | **B** | **PARTIAL** |

**走查中修复（2026-08-24）**

1. `applyGisMapFlowConfig` / `applyGisMapScatterConfig`：切换预设前 `axes: undefined`，避免 migrate 优先旧 axes 导致槽位 UI 不刷新。
2. `sanitizeChartFieldsForValidate`：用 `resolveEffectiveChartFieldRule`（catalog 与 DE 蓝图取 max），保存时不再裁掉 OD drill 维。
3. `resolveGisMapFlowDimensions`：hint/GeoJSON 从 DE 轴投影读 from/to，避免 axes/dimensions 漂移。

**打通但不对**：无（C=0 项为「未验可见性」而非验错）  
**假功能**：E04–E06 仅 GATE，不能标 REAL

## 4. 动态验证记录

| 步骤 | 操作 | 期望 | 实际 | 一致？ | 证据 |
|------|------|------|------|--------|------|
| 1 | vitest plan 命令集 + FlowPanel/hint/sanitize | 全绿 | **39+ passed**（含新增 sanitize/flow 回归） | ✅ | 2026-08-24 18:58 |
| 2 | pytest catalog parity | 绿 | **4 passed** | ✅ | 同会话 |
| 3 | Read plan 改动 10 项 | 文件均存在 | grep 命中全部 | ✅ | 见 §2 |
| 4 | BROWSER 编辑页 OD 一键 + 样式面板 | 槽位 from/to + flow 开关 | **UI 通**；散点→OD 曾槽位不刷新（已修 `axes: undefined`）；保存曾裁切 drill 维（已修 effective rule） | ⚠️ | `localhost:5173` edit 2026-08-24 |
| 5 | BROWSER 更新图表数据 + 见弧线 | 6 条枢纽 OD 弧线 | **validate 失败**：`CHART_DATASET_REQUIRED`（OD 示例为 SQL 模式，后端仅 Dataset 出数）→ 无底图弧线证据 | ❌ | 同页「更新图表数据」 |
| 6 | gisMapDataHint flow 分支 | 有单测 | **3 flow case** | ✅ | gisMapDataHint.test.ts |

## 5. 修复文档

### T2 / E13 — 地图可见弧线（P0）

**判定**：UNVERIFIED · C=0  
**期望 vs 实际**：预览应见 6 条枢纽 OD 弧线；未浏览器验真  
**根因**：同 scatter 审计 — 编辑态 GIS mount gate；且本轮未跑走查  
**修复方向**：seed/PMTiles 环境下 BROWSER 走查；预览模式截图入 §4  
**修后验收**：E13 CHAIN+UI，T2 C≥2，总分≥7

### T1 — 面板控件（P1）

**判定**：PARTIAL · 仅 B1 REAL  
**根因**：缺 `ChartGisMapFlowPanel` 扩测（color/opacity/width/reset）  
**修复方向**：参照 `ChartGisMapOverlayPanel.test.tsx` 补 4–5 case  
**修后验收**：B2–B8 至少 CHAIN（onChange 断言 flow 字段）

### T7 / E09 — flow data hint（P1）

**判定**：STUB  
**根因**：`resolveGisMapFlowDataHint` 无单测  
**修复方向**：`gisMapDataHint.test.ts` 增 enabled+缺 to_lng warn + ok case  
**修后验收**：E09 CHAIN C≥2

### E04 — syncGisFlowData（P2）

**根因**：无 Map mock（scatter 同债）  
**修复方向**：`gisMapFlowStyle.test.ts` 增 sync 用例（仿 overlay style test）

## 6. 修复优先级汇总

| 优先级 | ID | 一句话 |
|--------|-----|--------|
| P0 | T2/E13 | 浏览器预览确认弧线可见 |
| P1 | T1/B2–B8 | 扩 FlowPanel UI/集成测 |
| P1 | T7/E09 | flow data hint 单测 |
| P2 | E04 | syncGisFlowData mock 单测 |

## 7. plan 对照：都实现了吗？

| plan # | 内容 | 代码 | 测试 | 浏览器 | 结论 |
|--------|------|------|------|--------|------|
| 1 | gisProject.flow | ✅ | ⚠️ 间接 | — | **已实现** |
| 2 | gisMapFlow.ts | ✅ | ✅ | — | **已实现** |
| 3 | flow style/layers | ✅ | ✅ | — | **已实现** |
| 4 | GisMapView + fit | ✅ | ❌ sync | ❌ | **接线完成，未验真** |
| 5 | FlowPanel | ✅ | ⚠️ 1/8 | — | **部分验收** |
| 6 | 注册 | ✅ | ✅ profile | — | **已实现** |
| 7 | catalog/BE | ✅ | ✅ | — | **已实现** |
| 8 | Setup + lib | ✅ | ⚠️ lib only | — | **已实现** |
| 9 | data hint | ✅ | ❌ flow | — | **代码有、测不足** |
| 10 | viz.md | ✅ | — | — | **已实现** |

**结论**：**代码层面 plan 10/10 已落地**；**真实性验收 PARTIAL 7/10**（UI/单测闭环；**地图见弧线仍 blocked**：OD 示例 SQL 与 `CHART_DATASET_REQUIRED` 冲突，需 Dataset 化 demo 或 manual 数据绑定后再 BROWSER 复验）。

同会话 **初始视角两位小数**（T10）：✅ 已实现且有单测/面板测。

**未做（非 plan 范围）**：飞线动画 · map-3d 飞线 · F06-VIZ 验收条 · `demo-map-flow` Dataset（用的是 SQL 常量，符合 plan 决策）。

## 8. 交接

- 建议：批准 **P0 浏览器走查** 或交接 `root-first-solve` 补 FlowPanel/hint 单测  
- 复验命令：plan §验证方案 + BROWSER 预览 gis-map + OD 一键示例
