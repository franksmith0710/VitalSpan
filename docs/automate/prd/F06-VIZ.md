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
- **描述**：最小图表集 M4-MIN（SRS 追溯项）。
- **验收标准**：
  - [x] 表格+折线+柱状可渲染
  - [x] 绑定 QUERY-005 出数
- **代码锚点**：`fe/src/components/charts/` · `fe/src/lib/chart-theme.ts`
- **演化建议**：r29 空/错/慢态 + table 客户端分页 PAGE_SIZE=50 + query 错误码映射（T-VIZ-R29-002）；缺饼图/地图与配置 UI（VIZ-005）；后续可补 Apex 主题与大数据虚拟化
- **里程碑对齐**：
### [VIZ-003] 图表类型插件注册

- **状态**：部分实现（L1 后端骨架）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：图表类型插件注册（SRS 追溯项）。r42 L1 kickoff 交付后端 `ChartTypeRegistry`（镜像 `datasources/registry.py`）+ 9 类型骨架（table/line/bar/pie/gauge/map/sankey/funnel/graph）+ `GET /charts/types` catalog；`fe/registry.ts` 镜像与真实渲染留 companion。
- **验收标准**：
  - [x] 折线/柱/饼/仪表/表格/地图最小集（registry 9 类型骨架含该最小集，含桑基/漏斗/关系高级类型）
  - [x] 新类型可插件注册（`ChartTypeRegistry.register` + `register_builtin_chart_types()` 幂等；插件性结构断言）
- **代码锚点**：`backend/app/viz/registry.py` · `backend/app/viz/builtin.py` · `backend/app/api/v1/charts.py`（GET /charts/types）· 前端镜像待建 `fe/src/components/charts/registry.ts`
- **演化建议**：companion — `fe/registry.ts` 镜像后端 catalog；最小集真实渲染落地；类型元数据（icon/预览）扩展
### [VIZ-004] 图表样式子类型

- **状态**：部分实现（L1 后端骨架）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：图表样式子类型（SRS 追溯项）。r42 交付每类型 `style_variants` 声明 + registry 驱动校验（`CHART_INVALID_STYLE_VARIANT`）；前端样式渲染生效留 companion。
- **验收标准**：
  - [x] 堆叠/分组/面积/环形等（`bar`: stacked/grouped/horizontal；`line`: area/smooth；`pie`: donut）
  - [ ] styleVariant 生效（后端校验非法样式拒绝已实现；前端渲染生效留 companion）
- **代码锚点**：`backend/app/viz/specs.py` · `backend/app/viz/builtin.py` · `backend/app/schemas/chart_view.py`
- **演化建议**：companion — 前端样式变体真实渲染；styleVariant 与主题联动
### [VIZ-005] 维度指标筛选配置 UI

- **状态**：部分实现（L1 后端骨架）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：维度指标筛选配置 UI（SRS 追溯项）。r42 交付每类型 `FieldRule`（维度/指标 min-max）+ registry 驱动校验（`CHART_FIELD_REQUIREMENT`，含 note 定位）；配置 UI 与时间范围选择留 companion。
- **验收标准**：
  - [ ] 维度/指标/筛选器可配置（后端字段规则校验已实现；配置 UI 留 companion）
  - [ ] 时间范围选择（未实现，留 companion）
- **代码锚点**：`backend/app/viz/specs.py`（FieldRule）· `backend/app/schemas/chart_view.py`（registry 驱动校验）
- **演化建议**：companion — 前端维度/指标/筛选器配置 UI + 时间范围选择器
### [VIZ-006] iframe 嵌入门户

- **状态**：部分实现（L1 后端骨架）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：iframe 嵌入门户（SRS 追溯项）。r42 交付后端嵌入配置契约（`ChartEmbedConfig` + `validate_chart_embed_config` + `EMBED_*` 错误域 + origin 白名单）+ `POST /charts/embed/validate`；iframe 嵌入页与响应头留 companion。
- **验收标准**：
  - [ ] 图表可 iframe 嵌入（后端嵌入配置契约已实现；iframe 页面 + CSP/X-Frame-Options 留 companion）
  - [x] 跨域策略可配置（`allowedOrigins` 白名单 + origin 形态校验 `EMBED_INVALID_ORIGIN`）
- **代码锚点**：`backend/app/viz/embed.py` · `backend/app/api/v1/charts.py`（POST /charts/embed/validate）· 前端页面待建 `fe/src/embed/`
- **演化建议**：companion — 前端 iframe 嵌入页 + CSP/X-Frame-Options 响应头 + 嵌入 token 签发/校验链
### [VIZ-007] SDK 嵌入门户

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：SDK 嵌入门户（SRS 追溯项）。
- **验收标准**：
  - [ ] JS SDK 初始化与销毁
  - [ ] 鉴权 token 传递
- **代码锚点**：`fe/src/sdk/`
- **演化建议**：按 plan.md 期次优先级落地
### [VIZ-008] ECharts/AntV 渲染适配层

- **状态**：部分实现（L1 后端骨架）
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：ECharts/AntV 渲染适配层（SRS 追溯项）。r42 交付后端引擎无关 render-spec 归一层（`build_render_spec`，`engine` 取自 spec.renderer）+ `POST /charts/render-spec`；真实 ECharts/AntV option 构造与 Tailwind 主题留 companion。
- **验收标准**：
  - [x] 统一 ChartConfig→渲染器映射（`build_render_spec` 引擎无关归一描述符，标注 echarts/table 目标）
  - [ ] 主题与 Tailwind 协调（前端渲染项，留 companion）
- **代码锚点**：`backend/app/viz/render.py` · `backend/app/api/v1/charts.py`（POST /charts/render-spec）· 前端适配器待建 `fe/src/components/charts/adapters/`
- **演化建议**：companion — 前端 ECharts/AntV 适配器消费 render-spec + Tailwind 主题协调
