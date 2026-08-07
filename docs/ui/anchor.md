# UI 页面锚点

> **定位**：关键产品表面的页面 → 主组件映射；视觉 Token 与布局模式见 **b-design-system** skill · [layout.md](./layout.md)。  
> 路由真源：`fe/src/routes.tsx` · `fe/src/config/nav-manifest.tsx`。

## 可视化模板中心（DASH-009）

| 路由 | 页面 | 关键组件 |
|------|------|----------|
| `/admin/viz-templates` | `VizTemplatesHubPage` | `VizTemplateCard` · `TemplateCardPreview` · `TemplatePreviewDialog` |
| — | 删除确认 | `AlertDialog` + `deleteTemplate()`（`fe/src/lib/dashboardTemplates.ts`） |
| — | 权限 | 路由 `dashboard:read`；写操作 `dashboard:template.manage`；删除 `canDeleteTemplate()` |

## 看板 / 大屏编辑（DASH-002）

| 路由 | 页面 | 关键组件 |
|------|------|----------|
| `/admin/dashboards/:id/edit` | `DashboardEditPage` | `DashboardEditWorkspace` · `DashboardGrid`（v1 栅格） |
| `/admin/data-screens/:id/edit` | `DashboardEditPage` | `DataScreenEditViewport` · `PixelCanvas`（v2 像素） |
| 共用 | 三栏壳层 | `ChartEditRail` · `CanvasEditToolbar` · `PaletteDrawer` |
| 共用 | 图表挂载 | `ChartMountProvider` · `ChartMountInteractionBridge` · `chartMountScheduler.ts` |

## 报表中心（RPT-005）

| 路由 | 页面 | 关键组件 |
|------|------|----------|
| `/admin/reports/center` | `ReportCenterPage` | `ReportCenterScheduleHub` |
| `/admin/reports/templates` | `ReportTemplatesPage` | `useReportTemplates` · `TemplateDetailPanel` |

## 设计系统外部锚

- `.agents/skills/b-design-system-tailadmin-radix/SKILL.md`
- `references/layout-patterns/bi-dashboard-builder.md`
