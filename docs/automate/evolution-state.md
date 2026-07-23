# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A8_DONE** |
| status | **DONE**（待用户目视验收 BUG-13） |
| request | 3D 地图卫星纹理与省界对齐（/dev-autopilot 持续修复） |
| type | bug |
| plan | 内联 R5：projBounds 烘焙方案 |
| goal | map-3d 地形贴图地物与省界对齐，无「局部放大」感 |
| last_verified | 2026-07-23：`test:chart-catalog` 235 passed |

## 当前需求契约

- **request**: BUG-13 3D 卫星纹理错位，一直改到对为止
- **type**: bug
- **goal**: 全国 map-3d 开启地形贴图后省界与真实地物对齐
- **scope_include**: terrain 构建脚本、运行时 UV、national + 试点省资产
- **scope_exclude**: 在线瓦片、境外地图
- **acceptance**: 目视验收 + `pnpm run test:chart-catalog` 全绿
- **risk_level**: low
- **autonomy_policy**: auto_accept_low_risk

## 本轮修复摘要（BUG-13 R5）

| 项 | 改动 |
|----|------|
| 根因 | Mercator 纹理 ≠ mesh projBounds 平面；需 sc-datav 同构烘焙 |
| 构建 | `terrainProjBake.mjs` + `terrainThreeProject.mjs` |
| 运行时 | `applyGeoCapBboxUv(projBounds)`，移除 `geoUvContext` |
| 资产 | `fetch:terrain-sat --force` + `build:geo-terrain` |
| 文档 | `docs/ui/map-texture.md`、`docs/bugs/BUG-13_*` |

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-23 | A8_DONE：BUG-13 R5 projBounds 烘焙 + bbox UV |
| 2026-07-22 | A8_DONE：code-review P1 续 |
| 2026-07-22 | A8_DONE：code-review-fake-features-fix |
