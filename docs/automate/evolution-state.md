# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A8_DONE** |
| status | **DONE** |
| request | code-review 批次 A–D：编辑页性能门控 P0/P1 修复 |
| type | bug |
| plan | 内联（code-reviewer 报告批次 A+B+C+D） |
| goal | 修复挂载槽泄漏、加载语义、视口 root、缩略图时序 |
| last_verified | 2026-07-23：`vitest` chartMount/asyncLimiter/chartExecute/DashboardLayoutPreview 14 passed |

## 当前需求契约

- **request**: 修复 code-review P0-1 + P1-1..6
- **type**: bug
- **goal**: 多图编辑页不因空数据死锁；排队/屏外/加载语义诚实；缩略图等待挂载完成
- **scope_include**: ChartRenderer、DashboardWidget、useInViewport、chartMountScheduler、DashboardEditPage persistThumbnail
- **scope_exclude**: 3D 地图、L7 视觉回退范围外文件
- **acceptance**: 相关 vitest 通过；空数据场景不阻塞队列
- **risk_level**: low
- **autonomy_policy**: auto_accept_low_risk

## 本轮修复摘要

| Finding | 修复 |
|---------|------|
| P0-1 空数据不 markReady | `ChartRenderer` 查询终态即 `onMountReady` |
| P1-1 排队误标加载中 | embedded 先判断 `queryEnabled/renderEnabled` |
| P1-2 IO 首帧 burst | `useInViewport` 初值 `false` |
| P1-3 IO root | 栅格 `.dashboard-grid-edit` / 像素 `[data-canvas-scale-viewport]` |
| P1-4 关闭 hint 空白 | 始终保留淡色 Skeleton |
| P1-5 缩略图抢跑 | `waitForActiveChartMountDrain` 后再截图 |
| P1-6 屏外 vs 排队 | `mountGateStatus` 区分文案 |
| P2-3 请求取消 | `useChartExecute` cleanup bump generation |

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-23 | 性能门控 code-review 修复落地 |
