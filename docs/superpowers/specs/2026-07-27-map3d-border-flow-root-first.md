# Root-First Briefing: 3D 地图外轮廓流光刷新后不可见（迭代 2）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-27 |
| 主模式 | **Thrash** |
| 子类型 | Bug（渲染观感 + 生命周期） |
| 状态 | draft（待 P0v2 审批） |
| 正确性标准 | 开启「行政区边界 + 边界流光」的 map-3d，硬刷新后外轮廓流光持续单向循环 ≥10s |
| 效果标准 | **浅色/深色看板**上均可辨认：淡色底线 + 高对比流光拖影/粒子；全国仅外海岸线 |
| 非目标 | 2D 地图流光；改默认配色；重写 Three 地图 |
| 启用维度 | 无 |

## 1. 现象 / 诉求（来自对话）

- 用户原意：3D 边界流光对标大屏边框；仅外轮廓；刷新后消失；多轮修复后**依旧无法使用**
- 明确反感：多条纹、若隐若现、烟花式外喷
- 期望：配置开启即可稳定看见动画流光
- 现状：P0（收敛 remount + 单次 resume）已落地，用户仍反馈不可用

## 2. 需求锚定

| 层级 | Must / Nice / Out |
|------|-------------------|
| Must | 浅/深主题下外轮廓流光肉眼可见且持续动画 |
| Must | 硬刷新后不需交互即恢复 |
| Must | `regionBorderFlow: true` 写入后渲染链路生效 |
| Nice | DEV 可诊断 bundle/loop 状态 |
| Out | 2D map 流光 |

## 3. 失败迭代复盘（Thrash 必填）

| # | 尝试了什么 | 为何失败/为何差 | 证据 | 下轮禁止 |
|---|------------|-----------------|------|----------|
| 1 | 外轮廓 Shader + 粒子 | 未覆盖挂载竞态 | L1 | 只加渲染 |
| 2 | kickThreeBorderFlow 三连 rAF | gen 竞态未消除 | L1 D3GeoMapView | 堆 kick 点 |
| 3 | setAnimationActive / IO 门控 | 误停循环 | L1 | 布尔门控停表 |
| 4 | Shader 淡色底线 | 动画停仍难见；**Additive 在浅底仍几乎不可见** | L1 geoBorderFlowMaterial.ts:98 | 只调 alpha 不换混合 |
| 5 | **P0：收敛 remount + 单次 resume** | 生命周期改善但**用户仍不可用** → 主因可能不在 remount | L2 用户反馈 | 继续只改 D3GeoMapView |

三问：
1. **根因错位**：P0 修了挂载风暴，但真正让用户「看不见」的可能是 **AdditiveBlending + 浅色看板/亮地形**（L1）。
2. **效果标准**：此前验收偏「动画在跑」，未要求浅色主题可辨认。
3. **沿用旧思路**：再调 resume 次数无法解决混合模式问题。

## 4. 代码取证

| 发现 | 等级 | 路径 |
|------|------|------|
| 流光材质 `blending: AdditiveBlending` | L1 | `geoBorderFlowMaterial.ts:98` |
| 粒子同为 Additive | L1 | `geoBorderFlowParticles.ts:131` |
| 看板浅色 `isDark=false` 传入地图 | L1 | `ChartRenderer.tsx:296,651` |
| Additive 在亮 framebuffer 上对比度极低 | L3 | 图形学常识；需真机验证 |
| `regionBorderFlow === true` 才 enabled | L1 | `geoRegionBorderStyle.ts:54` |
| P0 已：commit 不 force remount；完成时单次 resume | L1 | `D3GeoMapView.tsx:390-400,321-325` |
| outer 轮廓 bundle 单测通过 | L1 | `geoOuterBorderFlow.test.ts` |
| tsc 通过 | L1 | `pnpm exec tsc --noEmit` |

## 5. 对标调研

| 对标点 | 参考 | 可观察行为 | 借鉴 |
|--------|------|------------|------|
| 大屏边框流光 | `ScreenBorderSparkles` | SVG 描边 + mask，**非 WebGL Additive** | 浅底用不透明描边叠色 |
| Three 场景光晕 | 常见做法 | 深底 Additive / 浅底 Normal+alpha | 按主题切换混合 |

## 6. 根源结论

**一句话根源（迭代 2）：** 流光在 **WebGL Additive 混合**下对浅色看板/亮地形几乎不可见，叠加早期生命周期竞态，用户感知为「功能不可用」；P0 只解决了后者一半。

**主根因：** AdditiveBlending 与 embed 浅色 surface 不匹配（L1+L3）。

**次根因：** 挂载期 remount 曾打断 rAF（P0 已缓解，需回归验证）。

**排除：** 外轮廓几何提取错误（单测绿）；tsc/构建失败（当前无）。

## 7. 问题分解（P0v2）

| # | 子问题 | 优先级 |
|---|--------|--------|
| 1 | 按 `isDark` 切换 Normal / Additive（或统一 Normal+高 alpha 流光） | **P0** |
| 2 | 粒子同步混合策略；浅底提高 flow 色亮度 | **P0** |
| 3 | `data-border-flow` DEV 属性：enabled/bundle/loop | P1 |
| 4 | 生命周期单测：resume 后 `borderFlowLoopActive` | P1 |

## 8. 方案（P0v2 推荐）

### 推荐

1. **`geoBorderFlowMaterial.ts`**：`isDark ? AdditiveBlending : NormalBlending`；浅底提高 `uFlowColor` 权重/alpha 上限
2. **`geoBorderFlowParticles.ts`**：同上；浅底略增粒子 alpha
3. **`buildGeoOuterBorderFlowLines`**：传入 `isDark` 到材质/粒子创建（已有 isDark 参数）
4. **保留 P0** D3GeoMapView 收敛逻辑，不再加 kick
5. **DEV**：`container.dataset.borderFlow = enabled ? 'active' : 'off'`

**废弃：** 三连 rAF kick；仅调 resume 次数；仅加底线不换混合。

**风险：** 深底观感变化 → 深底仍用 Additive；浅底用 Normal 做 A/B。

### 验证计划

- [ ] 浅色看板 + map-3d：开启流光，外轮廓可见且运动
- [ ] 深色大屏预览：同上
- [ ] 硬刷新后 ≥10s 持续
- [ ] `vitest` geoBorderFlow* + renderThreeChoropleth

## 9. 审批记录

- 迭代 1：批准（用户「开始」）— P0 已实施，**未达效果标准**
- 迭代 2 决策：**待批**（用户「依旧无法使用 /root-first-solve」）
- 豁免审批：否
