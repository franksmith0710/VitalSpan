# BUG 登记簿

> 最近更新：2026-07-15

| ID | 文档 | 状态 | 优先级 | 摘要 |
|----|------|------|--------|------|
| BUG-7 | [BUG-7_dashboard-resize-no-collision_2026-07-15.md](./BUG-7_dashboard-resize-no-collision_2026-07-15.md) | qa_pending | P0 | resize 不走 onPreview；R1 已接入碰撞 preview |
| BUG-6 | [BUG-6_dashboard-layout-roundtrip-drift_2026-07-15.md](./BUG-6_dashboard-layout-roundtrip-drift_2026-07-15.md) | fixed | P0 | 保存/重载后像素布局漂移；移除 hydrate auto-pack |
| BUG-001 | [BUG-001_account-password-security_2026-07-13.md](./BUG-001_account-password-security_2026-07-13.md) | fixed | P0 | 修改密码误登出、布局与字段交互；已合并 fix/account-password-security |
| BUG-1 | [BUG-1_dashboard-chart-clipped_2026-07-13.md](./BUG-1_dashboard-chart-clipped_2026-07-13.md) | fixing | P1 | 看板 widget 内折线/柱状图被裁切 |
| BUG-2 | [BUG-2_dashboard-drag-resize-unusable_2026-07-13.md](./BUG-2_dashboard-drag-resize-unusable_2026-07-13.md) | qa_pending | P0 | Phase A 失败后切像素画布；代码完成，待真实 Pointer QA |
| BUG-3 | [BUG-3_dashboard-field-render-white-screen_2026-07-14.md](./BUG-3_dashboard-field-render-white-screen_2026-07-14.md) | fixed | P0 | 字段拖放白屏 + 图表渲染契约失配 |
| BUG-4 | [BUG-4_navigation-white-screen_2026-07-14.md](./BUG-4_navigation-white-screen_2026-07-14.md) | fixed | P0 | 切换页面整页白屏（路由 Error Boundary） |
| BUG-5 | [BUG-5_dashboard-style-overrides-background_2026-07-14.md](./BUG-5_dashboard-style-overrides-background_2026-07-14.md) | qa_pending | P1 | 仪表板主题覆盖自定义背景；样式分层修复 |

BUG-001 浏览器证据：`artifacts/BUG-001/`（9 张截图）。
