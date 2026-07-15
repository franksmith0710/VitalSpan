# fe/src/components — 公共组件索引

> M1 最小集。新增/变更须同 PR 更新本表。

| 组件 | 路径 | 用途 |
|------|------|------|
| Button | `ui/button.tsx` | 主/次操作；尺寸 `xs` h-8 · `sm` h-9 · `md` h-10（默认）· `lg` h-11 · IconButton 默认 `sm` |
| Input | `ui/input.tsx` | 表单输入（skill 模板） |
| SearchField | `ui/search-field.tsx` | 列表页搜索框（图标 + 清除） |
| Label | `ui/label.tsx` | 表单标签；`RequiredLabel` 必填标签（星号 + 屏幕阅读器“必填”） |
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
| RouteErrorBoundary / AppErrorBoundary | `ui/route-error-boundary.tsx` | 路由/应用级渲染异常隔离，防止整页 `#root` 空白 |
| FormContext | `ui/form-context.tsx` | Input 皮肤上下文 |
| AppSidebar | `layout/app-sidebar.tsx` | Admin 侧栏 290px；分组分隔、激活指示条 |
| AppHeader | `layout/app-header.tsx` | sticky 顶栏 72px：侧栏切换 + 可选 `leading` + `actions` |
| Backdrop | `layout/backdrop.tsx` | 移动端侧栏遮罩 |
| ThemeToggleButton | `layout/theme-toggle.tsx` | 深浅色切换 |
| UserDropdown | `layout/user-dropdown.tsx` | 顶栏用户菜单（资料/设置/开发态切换用户/退出） |
| DevUserSwitcher | `layout/dev-user-switcher.tsx` | 开发态 RBAC 用户切换（已从用户菜单移除，组件保留供 dev 复用） |
| RequireCapability | `auth/require-capability.tsx` | 路由级 RBAC 守卫（`RequireCapabilityName` 与侧栏 `resolveNavGroups` 对齐） |
| VitalSpanLogo | `layout/vitalspan-logo.tsx` | 侧栏品牌标（展开/折叠） |
| AdminPageShell | `layout/admin-page-shell.tsx` | PageHeader：标题 + 描述 + 操作区 + `gap-6` 主内容栅格 |
| ListPageSection / DataTable | `layout/list-page-kit.tsx` | 列表/Hub 页卡片容器、工具栏、表格、分页与空态 |
| ListBatchDeleteBar / BatchDeleteDialog | `layout/list-batch-delete.tsx` | 列表多选勾选列 + 批量删除工具条与确认框；配合 `hooks/useListRowSelection.ts` · `lib/runBatchDelete.ts` |
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
| DashboardPreviewThumb | `dashboard/DashboardPreviewThumb.tsx` | 色块占位缩略图（独立页/测试）；列表卡片已改用 DashboardListCardPreview |
| DashboardListCardPreview | `dashboard/DashboardListCardPreview.tsx` | 列表真渲染预览（实验）；列表页已改回色块缩略图，保留供分享/截图方案 |
| DashboardLayoutPreview | `dashboard/DashboardLayoutPreview.tsx` | v1/v2 只读预览分发：v1 → DashboardGrid，v2 → PixelCanvas |
| DashboardGrid | `dashboard/DashboardGrid.tsx` | v1 栅格画布；引擎 **react-grid-layout**（`dashboardGridRgl.tsx` + WidthProvider 自适应宽度），仅历史兼容/紧急回退 |
| dashboardGridRgl | `dashboard/dashboardGridRgl.tsx` | v1 RGL 封装：12 列拖拽/缩放/垂直紧凑（DASH-002） |
| PixelCanvas / PixelShape | `dashboard/pixelCanvas/` | v2 公共像素画布边界：规范坐标、Pointer Capture 拖移/八向缩放、只读渲染、像素历史与 widget 工厂；不负责页面数据加载、保存或 Inspector |
| dashboard-edit（内部） | `dashboard/dashboard-edit/` | Dashboard 编辑页内部编排边界：在 v1/v2 画布间分发并适配 widget 内容；仅供 `DashboardEditPage` 使用，不作为跨页面公共组件 API |
| DashboardEditWorkspace | `dashboard/DashboardEditWorkspace.tsx` | Dashboard 编辑三栏（图表组件 / 画布 / 数据配置） |
| chartTypeCatalogDisplay | `lib/chartTypeCatalogDisplay.ts` | 图表类型 catalog 分组/图标/分类文案（Palette + 类型目录共用） |
| WidgetPalette | `dashboard/WidgetPalette.tsx` | 按 catalog 分类插入全部注册图表类型（DASH-003 / VIZ-003） |
| CanvasEditToolbar | `dashboard/CanvasEditToolbar.tsx` | 看板编辑画布顶栏 DE middle-area（图表/查询组件/扩展 widget） |
| ChartPickerPopover | `dashboard/ChartPickerPopover.tsx` | DE 分区图表选择器（410px 网格） |
| QueryComponentPicker | `dashboard/QueryComponentPicker.tsx` | 查询组件控件类型选择（text/select/date/multiselect） |
| TextWidget / MediaWidget / TabsWidget | `dashboard/TextWidget.tsx` 等 | 扩展 layout widget 渲染 |
| RichTextEditor / RichTextFloatingToolbar / RichTextToolbar | `dashboard/RichTextEditor.tsx` · `RichTextFloatingToolbar.tsx` | Tiptap 3 富文本画布内联编辑（独立浮动工具栏） |
| richTextHtml | `dashboard/richTextHtml.ts` | 旧格式转 HTML、白名单净化与空值判断 |
| ReuseWidgetDialog | `dashboard/ReuseWidgetDialog.tsx` | 跨看板复用组件（克隆 ID） |
| DashboardStyleDialog | `dashboard/DashboardStyleDialog.tsx` | 仪表板样式（间距/背景） |
| DashboardWidget | `dashboard/DashboardWidget.tsx` | 单组件卡片 + 删除/排序 |
| WidgetErrorBoundary | `dashboard/WidgetErrorBoundary.tsx` | widget 级渲染异常隔离（重试/删除，不拖垮整页） |
| chartConfigState | `../lib/chartConfigState.ts` | 图表 binding/query/render 阶段判定与字段 reconcile |
| buildChartRenderModel | `../lib/buildChartRenderModel.ts` | 图表列映射校验与 Apex/pie 渲染模型 |
| GlobalFilterBar | `dashboard/GlobalFilterBar.tsx` | Dashboard view 顶栏全局筛选器 |
| dashboardFilterUtils | `dashboard/dashboardFilterUtils.ts` | linkage 解析与 SQL `{{key}}` 占位符注入 |
| EntityOverviewPage | `../pages/admin/entities/EntityOverviewPage.tsx` | M8 DASH-005 Admin 实体总览（类型 Tab + 物理表 + 下钻） |
| SchemaBrowser | `datasources/SchemaBrowser.tsx` | 数据源详情三级 metadata 树 |
| WidgetInspector | `dashboard/WidgetInspector.tsx` | 图表编辑双列：配置区 + 字段库（DE chart-edit 布局） |
| ChartEditorColumn | `dashboard/ChartEditorColumn.tsx` | 图表配置列：数据/样式/高级 Tab |
| ChartStylePanel | `dashboard/ChartStylePanel.tsx` | DE 样式 Tab（配色/标题/图例/标签/背景/边框） |
| DashboardContextInspector | `dashboard/DashboardContextInspector.tsx` | 无选中时看板级配置轨 |
| chartDeStyle / chartValueFormat | `lib/chartDeStyle.ts` · `lib/chartValueFormat.ts` | 组件级 DE 样式与数值格式契约 |
| DatasetFieldBank | `dashboard/DatasetFieldBank.tsx` | 数据集字段库（拖放/点击填入槽位） |
| ChartFieldSlot | `dashboard/ChartFieldSlot.tsx` | 单字段槽位（虚线框 + 拖放） |
| ChartDataSlots | `dashboard/ChartDataSlots.tsx` | 类别轴/值轴等语义槽位组 |
| ChartInspectorProvider | `dashboard/ChartInspectorContext.tsx` | 图表 Inspector 共享状态 |
| useInspectorColumns | `../hooks/useInspectorColumns.ts` | Inspector 字段探测（复用 `chartExecuteProbe`） |
| chartExecuteProbe | `../lib/chartExecuteProbe.ts` | 图表 query execute 共享探测与字段建议 |
| DashboardQuickCreateDialog | `dashboard/DashboardQuickCreateDialog.tsx` | 看板列表快速创建向导（数据源 + Dataset + 首图） |

## 看板样式配置优先级（右栏 ↔ 画布）

```
看板 styleConfig（theme / widgetStyle / titleStyle / paletteId / numberFormat）
  └─ 组件 widget.title / filterConfig / …
       └─ 图表 nativeBody.deStyle / deDisplay / deFeatures（覆盖同类看板默认）
```

| 冲突项 | 规则 |
|--------|------|
| 配色 | `deStyle.paletteId` > 看板 `paletteId` |
| 标题样式 | `deStyle.title` > 看板 `titleStyle`；显示开关仅 `deStyle.title.show` |
| 查询条数 | `deDisplay.resultLimit` > 看板 `defaultQueryLimit` |
| 数值格式 | `deStyle.label` 格式 > 看板 `numberFormat`（柱/线 tooltip/标签、表格数值列） |
| 刷新 | 组件 `deDisplay.refreshMode` 轮询单图；看板 `refreshIntervalSec` 仅分享页整页 reload |
