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
- **里程碑对齐**：M-FE-2 · 已完成 · 2026-07-06
- **描述**：最小图表集 M4-MIN（SRS 追溯项）；M-FE-2 补齐 Dashboard widget SQL 配置与 view 模式出数。
- **验收标准**：
  - [x] 表格+折线+柱状可渲染
  - [x] 绑定 QUERY-005 出数
  - [x] Dashboard edit/view widget FE 出数（`WidgetSqlPanel` + `DashboardWidget`）
- **代码锚点**：`fe/src/components/charts/` · `fe/src/components/dashboard/WidgetSqlPanel.tsx` · `fe/src/components/dashboard/DashboardWidget.tsx` · `fe/src/lib/chart-theme.ts` · `fe/src/pages/admin/dashboard/dashboard.smoke.test.tsx`
- **演化建议**：饼图/地图与配置 UI（VIZ-005）；Apex 主题与大数据虚拟化；Playwright E2E 真实查询出数
### [VIZ-003] 图表类型插件注册

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：图表类型插件注册（SRS 追溯项）。r42 L1 kickoff 交付后端 `ChartTypeRegistry` + 9 类型骨架；r43 companion 交付 `fe/chartRegistry.ts` 镜像 catalog + 地图/桑基/漏斗/关系/仪表高级类型 ECharts 渲染骨架。
- **验收标准**：
  - [x] 折线/柱/饼/仪表/表格/地图最小集（registry 9 类型 + fe 高级渲染对接 render-spec）
  - [x] 新类型可插件注册（`ChartTypeRegistry.register` + `register_builtin_chart_types()` 幂等；`fetchChartTypeCatalog` 镜像）
- **代码锚点**：`backend/app/viz/registry.py` · `backend/app/viz/builtin.py` · `backend/app/api/v1/charts.py`（GET /charts/types）· `fe/src/lib/chartRegistry.ts` · `fe/src/components/charts/adapters/renderFromSpec.ts`
- **演化建议**：类型元数据（icon/预览缩略图）扩展；生产级地图瓦片 CDN 与完整地理编码
- **里程碑对齐**：
### [VIZ-004] 图表样式子类型

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：图表样式子类型（SRS 追溯项）。r42 交付每类型 `style_variants` 声明 + registry 驱动校验；r43 companion 交付 `ChartConfigPanel` styleVariant 选择与 `renderFromSpec` 变体渲染（stacked/grouped/area/donut 等）。
- **验收标准**：
  - [x] 堆叠/分组/面积/环形等（`bar`: stacked/grouped/horizontal；`line`: area/smooth；`pie`: donut）
  - [x] styleVariant 生效（后端校验 + 前端 `renderFromSpec`/`ChartConfigPanel` 变体渲染）
- **代码锚点**：`backend/app/viz/specs.py` · `backend/app/viz/builtin.py` · `fe/src/components/charts/ChartConfigPanel.tsx` · `fe/src/components/charts/adapters/renderFromSpec.ts`
- **演化建议**：styleVariant 与 dashboard 主题全局联动；更多高级类型变体
- **里程碑对齐**：
### [VIZ-005] 维度指标筛选配置 UI

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：维度指标筛选配置 UI（SRS 追溯项）。r42 交付 FieldRule + registry 驱动校验；r43 companion 交付 `ChartConfigPanel` 维度/指标字段绑定与 style_variant 选择；时间范围选择器留后续。
- **验收标准**：
  - [x] 维度/指标/筛选器可配置（`ChartConfigPanel` 字段绑定 + 后端 FieldRule 校验链）
  - [ ] 时间范围选择（未实现，留后续轮次）
- **代码锚点**：`backend/app/viz/specs.py`（FieldRule）· `fe/src/components/charts/ChartConfigPanel.tsx` · `fe/src/lib/chartViewConfig.ts`
- **演化建议**：时间范围选择器 + 筛选器 UI 与 query 执行联动
- **里程碑对齐**：
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

- **状态**：部分实现（companion r63）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：SDK 嵌入门户（SRS 追溯项）。
- **验收标准**：
  - [x] JS SDK 初始化与销毁（r61 L1 backend：`POST /api/v1/charts/sdk/validate` + lifecycle init/destroy + capabilities + `VIZ_SDK_*` 错误域；embed/validate 回归不变）
  - [x] companion perf probe + lifecycle ACL（r63：`probe_validate_sdk_budget_ms`/`probe_lifecycle_budget_ms` ≤50ms；`VIZ_SDK_TOKEN_REQUIRED`/`VIZ_SDK_DUPLICATE_ORIGIN`/`VIZ_SDK_FORBIDDEN`）
  - [ ] 鉴权 token 传递（缺 fe `fe/src/sdk/` 与 embed token 签发/校验链）
- **代码锚点**：`backend/app/viz/sdk_portal/` · `backend/app/api/v1/charts.py` · `tests/test_viz_view_design_cat_r63.py` T-VIZ-R63-007-01~08 · `tests/test_cat_dash_viz_nfr_r61.py` T-VIZ-R61-007-01~07
- **演化建议**：r63 companion 闭合 sdk portal probe、token 必填、duplicate origin 与 lifecycle ACL；后续补 fe JS SDK 初始化/销毁与 token 传递链
- **里程碑对齐**：
### [VIZ-008] ECharts/AntV 渲染适配层

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：ECharts/AntV 渲染适配层（SRS 追溯项）。r42 交付后端 `build_render_spec` + `POST /charts/render-spec`；r43 companion 交付 `renderFromSpec`/`AdvancedEchartsChart`/`echarts-theme.ts` 消费 render-spec + Tailwind Token 主题协调。
- **验收标准**：
  - [x] 统一 ChartConfig→渲染器映射（`build_render_spec` + `renderFromSpec` ECharts option 构造）
  - [x] 主题与 Tailwind 协调（`echarts-theme.ts` + `createBarChartOptions` Token 对齐）
- **代码锚点**：`backend/app/viz/render.py` · `backend/app/api/v1/charts.py`（POST /charts/render-spec）· `fe/src/components/charts/adapters/renderFromSpec.ts` · `fe/src/components/charts/adapters/AdvancedEchartsChart.tsx` · `fe/src/lib/echarts-theme.ts`
- **演化建议**：AntV 适配器分支；大数据量虚拟化与性能 profiling
- **里程碑对齐**：
