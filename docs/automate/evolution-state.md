# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A8_DONE** |
| status | **DONE** |
| request | 组件库 Hub P0：真实预览、插入看板、引用明细 |
| type | small-change |
| plan | 内联（Superset 对标缺口 P0） |
| goal | Hub 卡片展示 payload 预览；支持插入到看板；展示引用明细 |
| last_verified | 2026-07-27：`pytest` viz-components 4 passed；`vitest` vizComponentEdit 4 passed |
| repair_rounds | 0 |

## 当前需求契约

- **request**: `/dev-autopilot 修复问题`（组件库对标缺口）
- **type**: small-change
- **goal**: 补齐组件库 Hub 三项 P0 能力
- **scope_include**: viz-components API/Hub 卡片、DashboardEditPage insertComponent 深链
- **scope_exclude**: pinnedRevision、组件详情页、全类型 plugins 迁移
- **acceptance**: 列表 batch-resolve 驱动真实预览；插入对话框 + edit 页自动插入；GET references API + 对话框
- **risk_level**: low
- **autonomy_policy**: auto_accept_low_risk（默认）

## 本轮修复摘要

| 项 | 修复 |
|----|------|
| P0 真实预览 | `ComponentPayloadPreview` + Hub `batchResolveVizComponents` |
| P0 插入看板 | `InsertVizComponentDialog` + `?insertComponent=` 编辑页自动插入 |
| P0 引用明细 | `GET /viz-components/{id}/references` + `ComponentReferencesDialog` |

## artifacts

- `backend/app/viz/components/reference_counts.py`
- `backend/app/api/v1/viz_components.py`
- `fe/src/components/dashboard/viz-components/ComponentPayloadPreview.tsx`
- `fe/src/components/dashboard/viz-components/InsertVizComponentDialog.tsx`
- `fe/src/components/dashboard/viz-components/ComponentReferencesDialog.tsx`
- `fe/src/pages/admin/viz-components/VizComponentsHubPage.tsx`
- `fe/src/pages/admin/dashboard/DashboardEditPage.tsx`
- `docs/api/README.md`

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-27 | 组件库 Hub P0：预览/插入/引用明细 |
| 2026-07-23 | 性能门控 code-review 修复落地 |
