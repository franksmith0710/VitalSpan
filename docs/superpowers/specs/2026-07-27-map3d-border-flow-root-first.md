# Root-First Briefing: 3D 地图流光仍错位 + 下钻离线资产缺失（迭代 4）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-27 |
| 主模式 | **Thrash** |
| 子类型 | Bug（下钻 P0 阻断）+ 效果未达标（流光路径） |
| 状态 | **draft — 待审批** |
| 正确性标准 | 全国→湖南省下钻后 3D 地图正常渲染市级轮廓；无「离线地图资产缺失」 |
| 效果标准 | 流光沿**当前层级外轮廓顶边**连续单向绕行（大陆主体/省界外缘），非侧壁局部闪烁；不改用户自定义 `regionBorderFlowColor` |
| 启用维度 | `ui-vertical`（地图下钻→3D 渲染全链路）、`async`（资产注册与渲染竞态） |
| 非目标 | 改流光配色/混合模式；在线地图；2D 地图流光；本期不做省以下全新资产打包 |

## 1. 现象 / 诉求（来自对话）

- 多轮修复后：**流光移动仍不对**（局部蓝点 + 侧壁竖直拖影，非顶面外轮廓连续绕行）
- **新阻断**：下钻到「湖南省」后整图失败，居中红字「离线地图资产缺失，无法渲染」
- 明确约束：**不要改颜色**；仅当前层级外轮廓；全国绕大陆主体非台湾

## 2. 需求锚定

| 层级 | Must | 来源 |
|------|------|------|
| 对话 | 流光沿外轮廓顶边连续运动；下钻后地图能加载 | 用户截图 + 本轮反馈 |
| 对话 | 不改 `regionBorderFlowColor` | 迭代 2/3 澄清 |
| 工作区 | 面包屑「全部 / 湖南省」+ 3D 区域地图空态报错 | 截图 |
| 文档 | GEO-IRON-01 离线中国；VIZ-003 地图能力 | `geo-map-offline-china.mdc` |

**Out**：用改色/加对比度掩盖流光；引入在线瓦片

## 3. 失败迭代复盘（Thrash）

| # | 尝试了什么 | 为何失败/为何差 | 证据 | 下轮禁止 |
|---|------------|-----------------|------|----------|
| 1 | 生命周期 / rAF / dispose 防误清 | 用户仍见流光错位 | 迭代 3 spec | 继续在生命周期上叠补丁当主方案 |
| 2 | 半边面追踪 + 最大陆块 + 台湾用例 | 单测过，视觉仍像贴 cliff | `geoOuterBorderFlow.test.ts` | 只靠 GeoJSON 图论换行走规则，不核对**顶盖 Z 与网格** |
| 3 | `orderRingExterior` + `buildRingLineGeometry` + 降粒子 lift | 用户仍反馈不对；并出现下钻失败 | 本轮对话 | 在错误坐标系上优化弧长参数化 |
| 4 | `flowGeometries` 改读全量 offline map | 与 mesh 顶盖边线仍可能不一致 | `renderThreeChoropleth.ts:483-486` | 继续从 GeoJSON 重算与挤出网格脱节的线 |

**三问**

1. **根因错位**：下钻是「注册表与渲染不同步」；流光是「动画路径与已正确的 cap-top 边线脱节」
2. **效果标准**：要的是**顶面外轮廓**运动，不是任意闭合折线或侧壁投影
3. **再失败原因**：继续在 `geoOuterBorderFlow.ts` 调图算法，而不复用 `buildPlateTopOutline` 已对齐的 Z

## 4. 代码取证

| 发现 | 等级 | 路径 |
|------|------|------|
| 报错文案唯一入口：`getOfflineGeoMap(mapId)` 无 features | L1 | `renderThreeChoropleth.ts:232-241` |
| 省/市 GeoJSON 经 `registerGeoMap` 注册；**已登记则跳过写入** | L1 | `geoMapLevels.ts:157-161` |
| `registeredMapIds` 与 `OfflineGeoPort.registeredMaps` **双存储**，HMR/重载可失步 | L1 | `geoMapLevels.ts:38` + `OfflineGeoPort.ts:31-58` |
| 下钻 mapId 形如 `vs-geo-430000`；湖南资产文件存在 | L1 | `assets/geo/cities/430000.json` |
| `useGeoMapLevel` 异步 resolve；`D3GeoMapView` 用 `geoMapLoading` 门闩 | L1 | `useGeoMapLevel.ts:29-43`、`D3GeoMapView.tsx:407-412` |
| 每块挤出已有 **cap-top 边线** `buildPlateTopOutline(..., capTopZ + GEO_BORDER_ABOVE_CAP_Z)` | L1 | `buildGeoFlatPlateMesh.ts:184-190` |
| 流光另起炉灶 `buildGeoOuterBorderFlowLines`，Z 用 `borderZ+0.02` 与 GeoJSON 投影 | L1 | `renderThreeChoropleth.ts:481-502` |
| 地图组 `rotation.x = -π/2` 躺平；局部 Z 抬升在视觉上易偏侧壁 | L1 | `threeGeoOrbit.ts:66` |

### 5.a `ui-vertical`（已启用）

**画面验收**：全国 3D → 点湖南 → 见市级 3D  choropleth；外轮廓流光沿省界顶边单向循环。

| 序 | 层 | 状态 | 本 P0 是否改 |
|----|----|------|--------------|
| 1 | 离线资产 | 有 430000.json | 修注册逻辑 |
| 2 | domain `geoMapLevels` | `registerGeoMap` 可跳过写入 | **是** |
| 3 | hook `useGeoMapLevel` | 异步 resolve | 加固门闩（version） |
| 4 | `renderThreeChoropleth` | 同步查 map，无则硬失败 | **是**（ensure 或友好降级） |
| 5 | 流光 | 与 mesh 顶边脱节 | **是**（改数据源） |

## 7. 根源结论

**一句话根源（双轨）：**

1. **下钻**：`registerGeoMap` 以 `registeredMapIds` 短路，导致 `registeredMaps` 在模块重载后**空表但 id 已登记**，`getOfflineGeoMap('vs-geo-430000')` 返回空 → 硬错误。
2. **流光**：动画路径在 **GeoJSON 投影平面** 单独重建，未与 **`buildPlateTopOutline` 顶盖边线** 对齐；在 `-π/2` 旋转与挤出厚度下，视觉上像贴在侧壁/局部，而非外轮廓顶边连续绕行。

与失败史：迭代 2–4 在错误层（图论/弧长）优化，未绑定已正确的 mesh 边线。

**排除**：纯配色问题（用户已否定）；湖南无资产（文件存在、单测 drill pipeline 通过）。

## 8. 问题分解

| # | 子问题 | 依赖 | 优先级 |
|---|--------|------|--------|
| 1 | 修复离线 map 注册幂等/可恢复 | — | **P0** |
| 2 | 下钻渲染门闩：map 未就绪不调用 three 硬失败 | 1 | **P0** |
| 3 | 流光路径改从 **外轮廓 cap-top 线段** 合并生成（与 `borderZ` 一致） | 1 | **P0** |
| 4 | 回归单测：湖南 430000 注册 + 下钻 render 前置条件 | 1–2 | P1 |
| 5 | 全国绕大陆非台湾 + 连续弧长动画 | 3 | P1 |

## 9. 方案

### 推荐（P0 最小闭环）

**A. 下钻资产（先做，解除阻断）**

- `registerGeoMap` 改为**始终** `registerOfflineGeoMap`（upsert），或：若 `registeredMapIds.has` 但 `getOfflineGeoMap` 为空则强制重载
- 导出 `ensureOfflineGeoMap(mapId)`：全国直接返回；省级/市级走现有 `ensureCityMap` / `ensureDistrictMap`
- `renderThreeChoropleth` 入口：若 `getOfflineGeoMap` 为空且 `drillDepth>0`，**不**立刻红字失败——由 `D3GeoMapView` 在 `geoMapLoading`/`missingAsset` 阶段拦截（或 await ensure，超时再报错）
- `useGeoMapLevel` 渲染门闩增加 `version`，避免 loading 翻转竞态

**B. 流光路径（策略转向，废弃纯 GeoJSON 重算）**

- 在 `renderThreeChoropleth` 构建完所有 `built.borderLines` 后：
  1. 收集各 feature 顶盖边线段（世界/组内坐标，已与 `capTopZ + GEO_BORDER_ABOVE_CAP_Z` 对齐）
  2. 用现有 `pickOuterPerimeterSegments` **逻辑**对边做「仅出现一次」过滤 → 得外轮廓
  3. 将过滤后的线段作为 `buildGeoOuterBorderFlowLines` 输入（新 API：`buildGeoOuterBorderFlowFromSegments`），**不再二次投影**
- 删除或降级 `flowGeometries` 从全量 GeoJSON 重算路径（保留单测用的 GeoJSON 入口）

**废弃的旧思路**

- 继续在 `traceFacesWithHalfEdges` / `orderRingExterior` 上叠规则期望对齐视觉
- 用降 lift / 改 blending 修「像侧壁」

**触及文件**

- `geoMapLevels.ts`、`OfflineGeoPort.ts`（可选 ensure API）
- `useGeoMapLevel.ts`、`D3GeoMapView.tsx`
- `renderThreeChoropleth.ts`、`geoOuterBorderFlow.ts`
- 测试：`geoMapLevels.test.ts`、`geoOuterBorderFlow.test.ts`、新增湖南下钻注册用例

**风险与回滚**

- 风险：外轮廓过滤在 mesh 线段量化后可能断链 → 用与 plate 相同的投影量化步长
- 回滚：保留旧 `buildGeoOuterBorderFlowLines(geometries)` 作 fallback flag（DEV only）

### 备选

- **B1**：直接把流光 shader 挂到合并后的单条 `LineSegments`（不新建 group）— 改动更小，但合并逻辑仍要做
- **B2**：下钻失败时回退 2D choropleth 而非红字 — 不解决 3D 诉求，仅作兜底

## 10. 验证计划

**正确性**

- [ ] 全国 3D 正常
- [ ] 下钻湖南省 → 市级 3D 渲染，无「离线地图资产缺失」
- [ ] 硬刷新后再次下钻仍正常（模拟 HMR：注册表清空后 ensure 可恢复）
- [ ] `pnpm exec vitest run src/lib/geoMapLevels.test.ts src/lib/geoMapDrill.test.ts src/components/charts/engine/three/geoOuterBorderFlow.test.ts`

**效果**

- [ ] 全国视图：流光沿大陆外海岸线顶边单向连续运动 ≥10s，不绕台湾
- [ ] 湖南省视图：流光沿省界外轮廓（不含市内省界内线）顶边运动
- [ ] 未改 `regionBorderFlowColor` 语义

**ui-vertical**

- [ ] 面包屑「全部 / 湖南省」与地图内容一致
- [ ] DEV：`data-border-flow=ready` 且 `ringSegments` 合理

## 11. 审批记录

- 决策：**待批准**
- 请回复：**批准** / **改方向**（说明） / **缩范围**（例如先只做下钻 P0）

---

> **HARD-GATE**：审批前不改业务代码。
