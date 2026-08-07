# FE Hub 列表预览灰块 / 卡顿（测试环境）

## 症状

- 数据大屏 / 看板列表部分卡片长期灰色占位，或首屏极慢。
- 测试环境更明显；生产弱 GPU / 远程桌面也会放大。

## 根因

1. 列表默认多路客户端 **live 渲染**整张大屏（每卡数十个 `query/execute`）。
2. 全局 slot 上限（3）+ WebGL 实例上限（4）→ 排队 Skeleton。
3. 测试环境 **sample_db 慢/缺失**、导航 `releaseAllListPreviewSlots` 曾导致 slot 永久等待。

## 修复（2026-08-07）

- **轻量真实预览**：不使用静态截图或线框兜底；视口内挂载真实 `DashboardLayoutPreview` / `DataScreenPresenter`。
- `previewProfile=card`：单图查询 `min(配置, 50)`；关闭标签/图例/tooltip/钻取/联动/动画；3D 地图 thumbnail 档低成本渲染。
- `MAX_LIST_PREVIEW_ACTIVATIONS=3`：同页最多 3 张卡片同时 live。
- `listPreviewActivation`：导航清空 slot 时拒绝排队 waiter，恢复后可重新申请。

## Staging 验真清单

1. `docker compose`：`sample-mysql` 可达；官方 `sample_db` 测试连接成功。
2. Network：列表页 `/query/execute` 应与可见卡片数量相关（≤3 并发 × 每卡 widget 数），不应无限挂起。
3. 控制台：大量 `webgl-cap-exceeded` 表示同页 3D 过多；卡片预览应回退 2D 区域图而非长期灰块。
4. 导航切换列表后返回，卡片应恢复 live（非永久 Skeleton）。

## 锚点

- `fe/src/lib/dashboardPreviewProfile.ts`
- `fe/src/components/dashboard/DashboardListCardPreview.tsx`
- `fe/src/components/dashboard/DashboardLayoutPreview.tsx`
- `fe/src/components/dashboard/DashboardWidget.tsx`
- `fe/src/components/charts/ChartRenderer.tsx`
- `fe/src/lib/listPreviewActivation.ts`
