# F06-VIZ 图表与可视化

> 模块：M4 · 8 维评分见 [`../prd.md`](../prd.md)

### [VIZ-001] ChartViewConfig 协议

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：ChartViewConfig 协议（SRS 追溯项）。
- **验收标准**：
  - [x] chartType/style/dimensions/metrics/filters Schema
  - [x] 前后端校验一致
- **代码锚点**：`backend/app/schemas/chart_view.py` · `backend/app/api/v1/charts.py` · `fe/src/lib/chartViewConfig.ts`
- **演化建议**：r29 字段级 `ChartViewError.fields` + POST validate `detail.fields`（T-VIZ-R29-001）；后续可补 `filters[]` SQL 注入防护与 styleVariant 全量枚举
- **里程碑对齐**：
### [VIZ-002] 最小图表集 M4-MIN

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **里程碑对齐**：M-FE-2 · 已完成 · 2026-07-06；M-PRODUCT · F-C · 已完成 · 2026-07-08；**M-DASH-UX · F-A · Wave1 · 2026-07-09**
- **描述**：最小图表集 M4-MIN（SRS 追溯项）；M-FE-2 补齐 Dashboard widget SQL 配置与 view 模式出数；M-PRODUCT F-C 图表探索降为高级入口（非 admin 侧栏隐藏）；**M-DASH-UX F-A** 编辑态配置就绪时复用 `ChartRenderer` 真出图（去掉「仅预览才出图」路径）。
- **验收标准**：
  - [x] 表格+折线+柱状可渲染
  - [x] 绑定 QUERY-005 出数
  - [x] Dashboard edit/view widget FE 出数（`WidgetSqlPanel` + `DashboardWidget`）
  - [x] 「图表类型目录」自「分析」移至「治理」；分析分组仅保留 Dashboard（T-VIZ-FC-02~03）；`/admin/charts/types` 为主路由，`/charts/explore` 重定向
  - [x] Dashboard `WidgetPalette` 按 catalog 分类展示全部 12 种注册类型（含饼图/仪表盘/桑基/漏斗/关系图）；底部链至类型目录（T-VIZ-FC-04）
  - [x] `layout.md` §3/§6 同步图表类型目录定位
  - [x] **M-DASH-UX F-A**：`mode=edit` 且 config 就绪时渲染 `ChartRenderer`（含 `filterParameters`/`executeKey`；未就绪保留待配置占位；`dashboard.smoke` F-A）
- **代码锚点**：`fe/src/components/charts/` · `fe/src/lib/chartTypeCatalogDisplay.ts` · `fe/src/components/dashboard/WidgetPalette.tsx` · `fe/src/components/dashboard/WidgetSqlPanel.tsx` · `fe/src/components/dashboard/DashboardWidget.tsx` · `fe/src/lib/chart-theme.ts` · `fe/src/pages/admin/dashboard/dashboard.smoke.test.tsx` · `fe/src/config/nav-manifest.tsx` · `fe/src/lib/resolve-nav.test.ts` T-VIZ-FC-01~02 · `docs/ui/layout.md`
- **演化建议**：饼图/地图与配置 UI（VIZ-005）；Apex 主题与大数据虚拟化；Playwright E2E 真实查询出数；plan §M-DASH-UX F-A 行待 Wave2 后回勾
### [VIZ-003] 图表类型插件注册

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：图表类型插件注册（SRS 追溯项）。r42 L1 kickoff 交付后端 `ChartTypeRegistry` + 9 类型骨架；r43 companion 交付 `fe/chartRegistry.ts` 镜像 catalog + 地图/桑基/漏斗/关系/仪表高级类型 ECharts 渲染骨架。
- **验收标准**：
  - [x] 折线/柱/饼/仪表/表格/地图最小集（registry 9 类型 + fe 高级渲染对接 render-spec）
  - [x] 新类型可插件注册（`ChartTypeRegistry.register` + `register_builtin_chart_types()` 幂等；`fetchChartTypeCatalog` 镜像）
- **代码锚点**：`backend/app/viz/registry.py` · `backend/app/viz/builtin.py` · `backend/app/api/v1/charts.py`（GET /charts/types）· `fe/src/lib/chartRegistry.ts` · `fe/src/components/charts/adapters/renderFromSpec.ts`
- **演化建议**：类型元数据（icon/预览缩略图）扩展；**离线**中国省/市 GeoJSON 分级与地名映射（GEO-IRON-01，禁止在线瓦片）；r250 补 `isKnownChartType` + `getFallbackChartType` → table fallback（T-VIZ-R250-003-01~02）
- **里程碑对齐**：
### [VIZ-004] 图表样式子类型

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：图表样式子类型（SRS 追溯项）。r42 交付每类型 `style_variants` 声明 + registry 驱动校验；r43 companion 交付 `ChartConfigPanel` styleVariant 选择与 `renderFromSpec` 变体渲染（stacked/grouped/area/donut 等）。
- **验收标准**：
  - [x] 堆叠/分组/面积/环形等（`bar`: stacked/grouped/horizontal；`line`: area/smooth；`pie`: donut）
  - [x] styleVariant 生效（后端校验 + 前端 `renderFromSpec`/`ChartConfigPanel` 变体渲染）
  - [x] **M-DASH-UX F-B**：`WidgetInspector` 嵌入 `ChartConfigPanel` 可改 styleVariant/筛选（Wave1；`columns=[]` 时维度/度量下拉禁用）
  - [ ] 检视器内维度/度量列驱动选择（需 schema/`columns` 接线；companion）
- **代码锚点**：`backend/app/viz/specs.py` · `backend/app/viz/builtin.py` · `fe/src/components/charts/ChartConfigPanel.tsx` · `fe/src/components/charts/adapters/renderFromSpec.ts` · `fe/src/components/dashboard/WidgetInspector.tsx` · `fe/src/components/dashboard/WidgetInspector.smoke.test.tsx`
- **演化建议**：styleVariant 与 dashboard 主题全局联动；更多高级类型变体；r250 补 `buildBarOption`/`buildPieOption` 显式构建函数（T-VIZ-R250-004-01~02：stacked→stack非空、donut→radius数组）
- **里程碑对齐**：
### [VIZ-005] 维度指标筛选配置 UI

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：维度指标筛选配置 UI（SRS 追溯项）。r42 交付 FieldRule + registry 驱动校验；r43 companion 交付 `ChartConfigPanel` 维度/指标字段绑定与 style_variant 选择；r236 交付多字段/筛选器动态增删与 native execute 联动；r237 交付 `timeRange` 相对/绝对 preset + sql `time_start`/`time_end` 注入链。
- **验收标准**：
  - [x] 维度/指标/筛选器可配置（`ChartConfigPanel` 多字段动态增删 + operator/value 筛选器 + 后端 FieldRule 校验链）
  - [x] native mode 图表执行链（r236：`useChartExecute` mode=native + `ChartRenderer` rerun）
  - [x] 时间范围选择（r237：`TimeRangeConfig` + `ChartTimeRangeRef` FE/BE 校验 + `buildTimeRangeParameters` sql 注入）
  - [x] **M-DASH-UX F-B**：检视器内嵌 `ChartConfigPanel` 筛选/时间范围 onChange 合并回 `chartConfig`（Wave1；`WidgetInspector.smoke` F-B）
- **代码锚点**：`backend/app/viz/specs.py`（FieldRule）· `backend/app/schemas/chart_view.py` · `fe/src/components/charts/ChartConfigPanel.tsx` · `fe/src/components/charts/TimeRangeConfig.tsx` · `fe/src/components/charts/useChartExecute.ts` · `fe/src/lib/chartViewConfig.ts` · `fe/src/components/dashboard/WidgetInspector.tsx` · `tests/test_m11_batch3_r237.py` T-VIZ-R237-005-01~02
- **演化建议**：Playwright E2E 真实出数；native mode timeRange 执行链扩展
- **里程碑对齐**：M11 · 已完成 · 2026-07-07
### [VIZ-006] iframe 嵌入门户

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：iframe 嵌入门户（SRS 追溯项）。r42 交付后端嵌入配置契约 + `POST /charts/embed/validate`；r43 companion 交付 `EmbedChartPage`/`EmbedSharePanel`/`EmbedLayout` + `is_origin_allowed` 前端守卫链。
- **验收标准**：
  - [x] 图表可 iframe 嵌入（`/embed/chart` 页面 + `EmbedSharePanel` origin 白名单配置）
  - [x] 跨域策略可配置（`allowedOrigins` 白名单 + `is_origin_allowed` + 非法 origin 错误态）
- **代码锚点**：`backend/app/viz/embed.py` · `backend/app/api/v1/charts.py`（POST /charts/embed/validate）· `fe/src/embed/EmbedChartPage.tsx` · `fe/src/embed/EmbedSharePanel.tsx`
- **演化建议**：CSP/X-Frame-Options 响应头 + 嵌入 token 签发/校验链
- **里程碑对齐**：
### [VIZ-007] SDK 嵌入门户

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：SDK 嵌入门户（SRS 追溯项）。r61 L1 后端 sdk_portal + lifecycle；r63 companion perf probe/ACL；r237 交付 FE `embedSdk.ts` + `public/sdk/vitalspan-embed.js` + `EmbedSdkDemoPage` token 透传 iframe 链。
- **验收标准**：
  - [x] JS SDK 初始化与销毁（r61 L1 backend：`POST /api/v1/charts/sdk/validate` + lifecycle init/destroy + capabilities + `VIZ_SDK_*` 错误域；embed/validate 回归不变）
  - [x] companion perf probe + lifecycle ACL（r63：`probe_validate_sdk_budget_ms`/`probe_lifecycle_budget_ms` ≤50ms；`VIZ_SDK_TOKEN_REQUIRED`/`VIZ_SDK_DUPLICATE_ORIGIN`/`VIZ_SDK_FORBIDDEN`）
  - [x] 鉴权 token 传递（r237：`fe/src/sdk/embedSdk.ts` init 调 `GET /embed/sdk-params` + iframe `token` query；`fe/src/sdk/embedSdk.test.ts` T-VIZ-R237-007-01~03）
- **代码锚点**：`backend/app/viz/sdk_portal/` · `backend/app/api/v1/embed.py`（GET /embed/sdk-params）· `fe/src/sdk/embedSdk.ts` · `fe/public/sdk/vitalspan-embed.js` · `fe/src/pages/embed/EmbedSdkDemoPage.tsx` · `tests/test_m11_batch3_r237.py` T-VIZ-R237-007-04
- **演化建议**：完整 iframe 跨域 SSO 与 embed token 签发轮换；M12 VIEW-003 用户视图覆盖联动
- **里程碑对齐**：M11 · 已完成 · 2026-07-07
### [VIZ-008] ECharts/AntV 渲染适配层

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：ECharts/AntV 渲染适配层（SRS 追溯项）。r42 交付后端 `build_render_spec` + `POST /charts/render-spec`；r43 companion 交付 `renderFromSpec`/`AdvancedEchartsChart`/`echarts-theme.ts` 消费 render-spec + Tailwind Token 主题协调。
- **验收标准**：
  - [x] 统一 ChartConfig→渲染器映射（`build_render_spec` + `renderFromSpec` ECharts option 构造）
  - [x] 主题与 Tailwind 协调（`echarts-theme.ts` + `createBarChartOptions` Token 对齐）
  - [x] **M-DASH-UX F-A**：编辑态复用 `ChartRenderer`/`ChartPanel` loading·错误·空数据覆盖层（非白屏；`DashboardWidget` mode=edit）
- **代码锚点**：`backend/app/viz/render.py` · `backend/app/api/v1/charts.py`（POST /charts/render-spec）· `fe/src/components/charts/adapters/renderFromSpec.ts` · `fe/src/components/charts/adapters/AdvancedEchartsChart.tsx` · `fe/src/lib/echarts-theme.ts`
- **演化建议**：AntV 适配器分支；大数据量虚拟化与性能 profiling；r250 补 rows=[] 空数据防护 + `AdvancedEchartsChart` 空态覆盖层（T-VIZ-R250-008-01~02：空数据不抛错、主路径 bar type 回归）
- **里程碑对齐**：
