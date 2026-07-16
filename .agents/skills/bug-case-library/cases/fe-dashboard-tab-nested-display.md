# Tab 内嵌组件拖入后不可见 / ECharts 0 尺寸

## 症状

- 像素画布：拖入/插入 Tab 页签后，右侧列表有子组件，画布页签内空白或仅见细条
- 控制台 ECharts `Can't get DOM width or height`（clientWidth/height 为 0）
- 待配置图表占位、`WidgetPendingPreview` 也可能高度塌陷

## 根因（分层）

| 层 | 原因 |
|----|------|
| **数据模型** | `parkPixelWidgetInTab` 故意 `width/height=0`；`pixelWidgetToLayoutWidget` 推导出 `colSpan/rowSpan=1` |
| **渲染壳层** | 嵌套子组件继承父 Tab 的 `shell:"shape"`，走 `absolute inset-0` 嵌入式图表路径，依赖像素 footprint |
| **尺寸传递** | `DashboardCanvasWidgetRenderer` 对 0×0 仍传 `pixelSize`，`embeddedBodyHeight` 回退不足 |
| **布局** | `TabsWidget` tabpanel 内容区 `min-h-[4rem]` 未参与 flex-1 链，子节点 `h-full` 无参照高度 |

## 修复

- Tab 子组件嵌套渲染统一 `shell: "tab-child"`（内容区 + 拖出把手，非栅格 12×2 顶栏）
- `pixelWidgetToLayoutWidget`：`parentTabsId` 时使用 `TAB_CHILD_DEFAULT_COL_SPAN/ROW_SPAN`（12×2，仅用于图表高度估算）
- `TabsWidget` tabpanel 加 `flex flex-col`，内容区 `flex-1` 撑满
- `unparkPixelWidgetFromTab` + 左侧把手拖出页签到画布顶层

## 锚点

- `fe/src/components/dashboard/TabChildWidgetChrome.tsx`
- `fe/src/components/dashboard/pixelCanvas/tabParking.ts`
- `fe/src/components/dashboard/pixelCanvas/tabChildExtractContext.tsx`

## 回归

- `dashboardCanvasMode.test.ts`：parked tab child colSpan/rowSpan
- 手测：拖柱状图进 Tab → 页签内可见待配置预览；配置后图表正常渲染
