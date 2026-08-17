# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A8_DONE** |
| status | **DONE** |
| request | gis-map chartType Phase 0+1（同页 MapLibre 离线省界） |
| type | feature |
| plan | `docs/automate/plans/2026-08-17-gis-map-chart-type-p0-p1.md` |
| goal | 注册 gis-map；空白/离线省界 MapLibre 可出图 |
| last_verified | 2026-08-17：vitest gisMapStyle+catalogParity 9 passed；pytest catalog_parity 4 passed |
| repair_rounds | 0 |

## 当前需求契约

- **request**: dev-autopilot 执行 gis-map Phase 0+1
- **type**: feature
- **goal**: 看板可拖入 GIS 地图；同页 MapLibre 离线省界/空白
- **scope_include**: ADR-12/mdc/viz/vs-ai；BE+FE 注册；maplibre 引擎；manifest
- **scope_exclude**: goal.md；WMS 登记；Dataset join；楼块 3D；iframe；PDF 改造
- **acceptance**: plan-verify / 测试命令 exit 0
- **risk_level**: medium
- **autonomy_policy**: strict_plan_match

## 上一轮（归档）

| 字段 | 值 |
|------|----|
| request | 数据大屏 Phase 2.6 编辑视口 T2–T3 |
| phase | A8_DONE |
| plan | `docs/automate/plans/2026-07-20-data-screen-edit-viewport-de.md` |

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-08-17 | gis-map Phase 0+1 启动 |
| 2026-07-29 | 3D 贴地热力 code-review P1 |
