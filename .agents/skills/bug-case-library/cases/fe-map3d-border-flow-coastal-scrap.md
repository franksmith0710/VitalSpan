# map-3d 边界流光卡在海岸碎环

- **ID**: CASE-2026-07-28-001
- **状态**: 已修复
- **影响**: fe
- **首次发现**: 2026-07-28

## 症状

- 3D 地图边界流光只在一小段锯齿岸线上来回转，不绕整圈外缘
- 另画的青色短线与已有省界顶边不对齐

## 根因

1. 从各省 `borderLines` 拼外轮廓时，邻省共享边浮点不一致 → 半边追踪闭成海岸碎环
2. `isViable` 只看段数 ≥ 8，碎环被当成合法路径优先采纳
3. 流光另起 `LineSegments` 重画路径，未沿已有顶盖边线行走

## 错误做法（避免）

- 仅用 cap 半边面追踪选环且无周长/整圈校验
- 用凸包「绕过去」代替贴岸外缘
- CatmullRom 削角导致离岸

## 修复方式

- 经纬度空间 `pickOuterPerimeterSegments` 后，对最大陆块做 `greedyBridgeOuterPath`（最近邻桥接缝隙），再投影到 mesh
- 半边/链式会把外缘拆成两千多个碎环，覆盖率选环仍会挑到 2° 海岸碎带
- `buildGeoOuterBorderFlowForMap`：上述整圈路径 → 吸附到已有最外圈 `borderLines` → 飞线沿路径运动
- 运行时验收看 `data-border-flow-box` 宽高须接近地图投影包围盒（勿只看 segs/perim）
- 文件：`fe/src/components/charts/engine/three/geoOuterBorderFlow.ts`

## 验证

- `vitest`：`geoOuterBorderFlow.test.ts`（全国环段数 >200、大视口宽高覆盖）
- 手动：硬刷新后 `data-border-flow-box` 例如跨数百单位，光点沿大陆外缘单向绕行

## 关联

- `docs/superpowers/specs/2026-07-27-map3d-border-flow-root-first.md`
- `renderThreeChoropleth.ts`（mount + `data-border-flow-perim`）
