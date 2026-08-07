# FE Hub 列表预览灰块 / 卡顿（测试环境）

## 症状

- 数据大屏 / 看板列表部分卡片长期灰色占位，或首屏极慢。
- 测试环境更明显；生产弱 GPU / 远程桌面也会放大。

## 根因

1. 列表曾默认 **8 路客户端 live 渲染**整张大屏（每卡数十个 `query/execute`），而非静态缩略图。
2. 全局 slot 上限（曾 6，现 3）+ WebGL 实例上限（4）→ 排队 Skeleton。
3. `thumbnailUrl` 后端已返回但 FE 未消费；保存截图 API 未接线 → 多数环境无静态图。
4. 测试环境 **sample_db 慢/缺失**、导航 `releaseAllListPreviewSlots` 曾导致 slot 永久等待。

## 修复（2026-08-07）

- `HubCardDashboardThumbnail`：Bearer 拉取 `GET .../thumbnail` 作列表默认层。
- `queueDashboardThumbnailUpload`：编辑保存成功后异步 `PUT .../thumbnail`。
- `DashboardListCardPreview`：有图仅 hover live；无图线框兜底 + 视口内 live（`MAX_LIST_PREVIEW_ACTIVATIONS=3`）。
- `listPreviewActivation`：`releaseAllListPreviewSlots` 拒绝排队 waiter，导航后可重新申请。

## Staging 验真清单

1. `docker compose`：`sample-mysql` 可达；管理面存在官方 `sample_db` 且测试连接成功。
2. Network：列表页不应在未 hover 时出现大量 `/query/execute`（有缩略图时）。
3. `GET /api/v1/dashboards/{id}/thumbnail`：保存过一次编辑后应 200；从未保存则 404 属正常（显示线框）。
4. 控制台：大量 `webgl-cap-exceeded` 表示同页 3D 过多，应依赖静态图而非加并发。

## 锚点

- `fe/src/components/dashboard/HubCardDashboardThumbnail.tsx`
- `fe/src/components/dashboard/DashboardListCardPreview.tsx`
- `fe/src/lib/queueDashboardThumbnailUpload.ts`
- `fe/src/lib/listPreviewActivation.ts`
