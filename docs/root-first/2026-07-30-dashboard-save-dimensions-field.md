# Root-First Briefing: 看板保存 422（dimensions.field）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-30 |
| 主模式 | Thrash |
| 子类型 | Bug |
| 状态 | done |
| 正确性标准 | 含区域/3D 地图占位维度的看板可 PUT layout 成功，无 `widgets.chartConfig.dimensions.field` 422 |
| 效果标准 | 保存后刷新，图表配置与样式仍在 |
| 启用维度 | 无 |
| 非目标 | 修地图锚点解析警告；global-filters 404 |

## 1. 现象 / 诉求

- 用户原意：多轮修复后看板仍无法保存，toast 显示 `数据校验失败（widgets.chartConfig.dimensions.field）`
- 期望：保存并离开成功
- 现状：PUT `/api/v1/dashboards/{id}/layout` 422

## 2. 需求锚定

| 层级 | Must | 来源 |
|------|------|------|
| 对话 | 保存不再 422 | 截图 +「未修复」 |
| 工作区 | dimensions.field 校验失败 | 控制台 |
| 文档 | 地图 chartType 允许多维槽位 | chartFieldRules map minDimensions |

## 3. 失败迭代复盘

| # | 尝试了什么 | 为何失败 | 证据 | 下轮禁止 |
|---|------------|----------|------|----------|
| 1 | styleConfig 归一、col_span 剥离、refetch 不阻断 | 未触及 chartConfig 空 field | L2 截图仍报 dimensions.field | 只修 style 不修字段净化 |
| 2 | batch-resolve UUID 过滤 | 次要噪声，非 layout 422 主因 | L1 useVizComponentMap enabled guard | 把 batch-resolve 当主根因 |

三问：根因错位（净化函数存在但未接入保存链）；正确性缺口；再只 patch 外围仍会 422。

## 4. 代码取证

| 发现 | 等级 | 路径 |
|------|------|------|
| BE `ChartFieldRef.field` min_length=1 | L1 | `backend/app/schemas/chart_view.py:31` |
| FE 已有 `sanitizeChartFieldsForValidate` 剔空 field | L1 | `fe/src/lib/chartFieldRules.ts:111` |
| 仅校验 API 调用，layout 保存未用 | L1 | `ChartConfigPanel.tsx` vs `dashboardCanvasMode.ts` |
| 占位 `{ field: "" }` 来自 reconcile/slots | L1 | `chartFieldSlots.ts`, `chartConfigState.ts` |

## 7. 根源结论

**一句话：** UI 编辑态允许空维度槽位，校验 API 会净化，但 `buildDashboardLayoutForSave` / `extractWidgetPayload` 保存前未净化，后端 Pydantic 拒绝空 `field`。

## 8. 问题分解

| # | 子问题 | 优先级 |
|---|--------|--------|
| 1 | layout 保存前 sanitize chartConfig | P0 |
| 2 | flush 关联组件 payload 同步 sanitize | P0 |
| 3 | BE 防御性过滤（可选） | P2 |

## 9. 方案（推荐）

- `buildDashboardLayoutForSave`：非关联 chart widget 调用 `sanitizeChartFieldsForValidate`
- `extractWidgetPayload`：chart 分支同样净化（覆盖 flush）
- 单测：`dimensions: [{ field: "" }]` 经 persist 后为空数组
- 风险：地图未配维度时 dimensions 变空——与 BE 校验一致，编辑态仍可用占位槽

## 10. 验证计划

- [x] vitest `dashboardCanvasMode.test.ts` 新增用例
- [x] vitest `chartFieldRules` 相关回归
- [ ] 手工：含地图看板保存成功

## 11. 审批记录

- 决策：豁免审批 — 用户「未修复」明示需落地 P0
- 范围：仅 P0 #1 #2
