# gis-map 全球 OD 飞线叠加 — Headless Automation Plan

Plan type: Headless Automation Plan  
Execution trigger: plan-execute  
Date: 2026-08-24  
前置评审: `docs/reviews/grounded/2026-08-24-gis-flyline-route-adjudication.md` §9（用户确认 H1 / 方案 A）

## 背景与目标

**问题**：`gis-map` 仅有经纬度散点，无全球 OD（起点→终点）弧线能力。

**成功标准**：

- 样式 Tab 可开启「OD 飞线」；绑定起点/终点经纬度 + 可选流量后，MapLibre 显示大圆弧线
- 飞线与散点 **独立配置**（`gisProject.flow`），开启飞线时槽位语义为 from/to 四维
- 一键接入官方示例 SQL（全球枢纽 OD）；单测覆盖 GeoJSON 构建与面板写回
- 散点既有行为不变（`flow.enabled !== true` 时）

**非目标**：

- map-3d Three 飞线（T7）· 线动画/粒子 · 与散点同槽混用 · 在线地图 SDK

## 整体方案

新增 `buildGisFlowGeoJson`（大圆插值 LineString）+ 独立 source/layer `vs-gis-flow`；`gisProject.flow` 存线色/线宽/透明度/autoFit；数据槽扩展 drill×3（终点经/纬/标签）；`GisMapView` 用 `setData`/`setPaintProperty` 同步，style 内嵌空 GeoJSON（与散点同模式）。

## 前置评审追溯（project-grounded-review）

| # | 类型 | 结论 | 计划体现 |
|---|------|------|----------|
| 1 | 纠正后目标 | gis-map 全球 OD，非 map-3d | 全文 scope |
| 2 | 硬约束 C-02/C-08 | MapLibre + PMTiles | `gisMapFlowStyle.ts` |
| 3 | 停止项 | 不与散点共槽表达 OD | `flow.enabled` 切换语义 |
| 4 | 验收 | vitest + 示例 SQL | 验证方案 |

## 关键决策

| 决策点 | 选择 | 备选项 | 理由 |
|--------|------|--------|------|
| 引擎 | MapLibre line | Three/custom layer | ADR-12 gis-map 路径 |
| 数据槽 | dim0–1 起点 + drill0–1 终点 + drill2 标签 | 新 chartType | 复用 gis-map，扩 catalog |
| 弧线算法 | 大圆插值 48 段 | 平面贝塞尔 | 全球 OD 视觉正确 |
| 与散点 | 互斥（flow.enabled） | 同时显示 | 避免槽位语义冲突 |
| Demo | SQL 常量枢纽对 | 新 MySQL 表 | 与 scatter 示例一致，低交付成本 |

## 改动清单

| # | 区域 | 文件 |
|---|------|------|
| 1 | 域 schema | `gisProject.ts` — `GisProjectFlow` · normalize · resolve |
| 2 | GeoJSON | `gisMapFlow.ts` + test |
| 3 | MapLibre 层 | `gisMapFlowStyle.ts` + test · `gisMapStyle.ts` |
| 4 | 运行时 | `GisMapView.tsx` · `gisMapOverlayFit.ts`（LineString bounds） |
| 5 | 样式面板 | `ChartGisMapFlowPanel.tsx` + test |
| 6 | 注册 | `chartTypeStyleProfiles.ts` · `chartStyleSectionRegistry.ts` · `ChartStyleSection.tsx` |
| 7 | 数据槽 | `catalog.ts` · `chartCatalogBackendFieldRules.ts` · `backend/.../_helpers.py` |
| 8 | 数据接入 | `gisMapFlow.ts`（lib）· `ChartGisMapFlowSetup.tsx` · `ChartGisMapDataPanel.tsx` |
| 9 | 提示 | `gisMapDataHint.ts` + test |
| 10 | 文档 | `docs/services/viz.md` 一行 |

## 验证方案

```bash
cd fe && pnpm vitest run src/components/charts/engine/maplibre/gisMapFlow.test.ts src/components/charts/engine/maplibre/gisMapFlowStyle.test.ts src/components/dashboard/chartStyleSections/ChartGisMapFlowPanel.test.tsx src/lib/gisMapDataHint.test.ts
cd .. && python -m pytest tests/test_viz_chart_catalog_parity.py -q
```

## 自审结果

| 维度 | 自评 |
|------|------|
| 目标-实现一致性 | 🟢 |
| 必要性 | 🟢 |
| 正确性 | 🟢 |
| 完整性 | 🟢 |
| 一致性 | 🟢 |
| 副作用 | 🟢（flow 默认 off） |
| 可验证性 | 🟢 |
