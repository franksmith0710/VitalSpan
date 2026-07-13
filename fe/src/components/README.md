# fe/src/components — 公共组件索引

> M1 最小集。新增/变更须同 PR 更新本表。

| 组件 | 路径 | 用途 |
|------|------|------|
| Button | `ui/button.tsx` | 主/次操作；尺寸 `xs` h-8 · `sm` h-9 · `md` h-10（默认）· `lg` h-11 · IconButton 默认 `sm` |
| Input | `ui/input.tsx` | 表单输入（skill 模板） |
| SearchField | `ui/search-field.tsx` | 列表页搜索框（图标 + 清除） |
| Label | `ui/label.tsx` | 表单标签 |
| Badge | `ui/badge.tsx` | 状态标签 |
| Breadcrumb | `ui/breadcrumb.tsx` | 页面面包屑 |
| Card | `ui/card.tsx` | 区块卡片（ComponentCard） |
| Table | `ui/table.tsx` | 数据表格（TailAdmin 风格） |
| Alert | `ui/alert.tsx` | 字段级/区块提示 |
| Skeleton | `ui/skeleton.tsx` | 加载占位 |
| PanelEmptyState | `ui/panel-empty-state.tsx` | 面板空态；`ListGhostEmptyState` 列表骨架空态、`PanelEmptyStateSteps` 引导步骤 |
| Select | `ui/select.tsx` | 下拉选择（Radix） |
| DropdownMenu | `ui/dropdown-menu.tsx` | 下拉菜单（Radix） |
| Avatar | `ui/avatar.tsx` | 用户头像 |
| AlertDialog | `ui/alert-dialog.tsx` | 破坏性操作确认 |
| FormContext | `ui/form-context.tsx` | Input 皮肤上下文 |
| AppSidebar | `layout/app-sidebar.tsx` | Admin 侧栏 290px；分组分隔、激活指示条 |
| AppHeader | `layout/app-header.tsx` | sticky 顶栏 72px：侧栏切换 + 可选 `leading` + `actions` |
| Backdrop | `layout/backdrop.tsx` | 移动端侧栏遮罩 |
| ThemeToggleButton | `layout/theme-toggle.tsx` | 深浅色切换 |
| UserDropdown | `layout/user-dropdown.tsx` | 顶栏用户菜单（资料/设置/开发态切换用户/退出） |
| DevUserSwitcher | `layout/dev-user-switcher.tsx` | 用户菜单内开发态 RBAC 用户切换 |
| RequireCapability | `auth/require-capability.tsx` | 路由级 RBAC 守卫（`RequireCapabilityName` 与侧栏 `resolveNavGroups` 对齐） |
| VitalSpanLogo | `layout/vitalspan-logo.tsx` | 侧栏品牌标（展开/折叠） |
| AdminPageShell | `layout/admin-page-shell.tsx` | PageHeader：标题 + 描述 + 操作区 + `gap-6` 主内容栅格 |
| ListPageSection / DataTable | `layout/list-page-kit.tsx` | 列表/Hub 页卡片容器、工具栏、表格、分页与空态 |
| PaginationBar | `ui/pagination-bar.tsx` | 列表底部分页（上一页/下一页/每页条数） |
| AdminLayout | `../layouts/AdminLayout.tsx` | `/admin/*` 布局入口 |
| ChartPanel | `charts/ChartPanel.tsx` | 图表壳：loading/empty/error |
| ChartRenderer | `charts/ChartRenderer.tsx` | 表格/折线/柱 + 高级 ECharts 渲染（VIZ-002/003） |
| AdvancedEchartsChart | `charts/adapters/AdvancedEchartsChart.tsx` | 高级 ECharts 渲染（map/sankey/funnel/graph/gauge/heatmap/timeline） |
| KpiCard | `charts/adapters/KpiCard.tsx` | KPI 指标卡（1–4 metrics，DASH-003）；供 `ChartRenderer` |
| ChartConfigPanel | `charts/ChartConfigPanel.tsx` | 字段 + styleVariant 配置 |
| EmbedChartPage | `../embed/EmbedChartPage.tsx` | `/embed/chart/:chartId` |
| EmbedSharePanel | `../embed/EmbedSharePanel.tsx` | `/embed/share` origin 配置 |
| EmbedToolShell | `embed/embed-tool-shell.tsx` | 嵌入工具页统一壳层（标题 + 取消 + 卡片） |
| EmbedLayout | `../layouts/EmbedLayout.tsx` | Embed chromeless 布局 |
| DashboardListCard | `dashboard/DashboardListCard.tsx` | 看板列表卡片（预览缩略图 + 操作） |
| DashboardPreviewThumb | `dashboard/DashboardPreviewThumb.tsx` | 看板布局迷你预览 |
| DashboardGrid | `dashboard/DashboardGrid.tsx` | 看板画布；引擎 **react-grid-layout**（`dashboardGridRgl.tsx` + WidthProvider 自适应宽度） |
| dashboardGridRgl | `dashboard/dashboardGridRgl.tsx` | RGL 封装：12 列拖拽/缩放/垂直紧凑（DASH-002） |
| DashboardEditWorkspace | `dashboard/DashboardEditWorkspace.tsx` | Dashboard 编辑三栏（图表组件 / 画布 / 数据配置） |
| chartTypeCatalogDisplay | `lib/chartTypeCatalogDisplay.ts` | 图表类型 catalog 分组/图标/分类文案（Palette + 类型目录共用） |
| WidgetPalette | `dashboard/WidgetPalette.tsx` | 按 catalog 分类插入全部注册图表类型（DASH-003 / VIZ-003） |
| CanvasEditToolbar | `dashboard/CanvasEditToolbar.tsx` | 看板编辑画布顶栏 DE middle-area（图表/查询组件/扩展 widget） |
| ChartPickerPopover | `dashboard/ChartPickerPopover.tsx` | DE 分区图表选择器（410px 网格） |
| QueryComponentPicker | `dashboard/QueryComponentPicker.tsx` | 查询组件控件类型选择（text/select/date/multiselect） |
| TextWidget / MediaWidget / TabsWidget | `dashboard/TextWidget.tsx` 等 | 扩展 layout widget 渲染 |
| ReuseWidgetDialog | `dashboard/ReuseWidgetDialog.tsx` | 跨看板复用组件（克隆 ID） |
| DashboardStyleDialog | `dashboard/DashboardStyleDialog.tsx` | 仪表板样式（间距/背景） |
| DashboardWidget | `dashboard/DashboardWidget.tsx` | 单组件卡片 + 删除/排序 |
| GlobalFilterBar | `dashboard/GlobalFilterBar.tsx` | Dashboard view 顶栏全局筛选器 |
| dashboardFilterUtils | `dashboard/dashboardFilterUtils.ts` | linkage 解析与 SQL `{{key}}` 占位符注入 |
| EntityOverviewPage | `../pages/admin/entities/EntityOverviewPage.tsx` | M8 DASH-005 Admin 实体总览（类型 Tab + 物理表 + 下钻） |
| SchemaBrowser | `datasources/SchemaBrowser.tsx` | 数据源详情三级 metadata 树 |
| WidgetInspector | `dashboard/WidgetInspector.tsx` | 图表编辑双列：配置区 + 字段库（DE chart-edit 布局） |
| ChartEditorColumn | `dashboard/ChartEditorColumn.tsx` | 图表配置列：Tab + 槽位 + 底栏「更新图表数据」 |
| DatasetFieldBank | `dashboard/DatasetFieldBank.tsx` | 数据集字段库（拖放/点击填入槽位） |
| ChartFieldSlot | `dashboard/ChartFieldSlot.tsx` | 单字段槽位（虚线框 + 拖放） |
| ChartDataSlots | `dashboard/ChartDataSlots.tsx` | 类别轴/值轴等语义槽位组 |
| ChartInspectorProvider | `dashboard/ChartInspectorContext.tsx` | 图表 Inspector 共享状态 |
| useInspectorColumns | `../hooks/useInspectorColumns.ts` | Inspector 字段探测（复用 `chartExecuteProbe`） |
| chartExecuteProbe | `../lib/chartExecuteProbe.ts` | 图表 query execute 共享探测与字段建议 |
| DashboardQuickCreateDialog | `dashboard/DashboardQuickCreateDialog.tsx` | 看板列表快速创建向导（数据源 + Dataset + 首图） |
