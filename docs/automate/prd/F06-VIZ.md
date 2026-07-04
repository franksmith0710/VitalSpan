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
- **演化建议**：r28 交付 L1 双端协议 + POST `/api/v1/charts/validate`；后续可补 `filters[]` SQL 注入防护与 styleVariant 全量枚举
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
- **演化建议**：r28 交付 ChartRenderer + useChartExecute（M4 execute）；缺饼图/地图与配置 UI（VIZ-005）；后续可补 Apex 主题与大数据虚拟化
- **里程碑对齐**：
### [VIZ-003] 图表类型插件注册

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：图表类型插件注册（SRS 追溯项）。
- **验收标准**：
  - [ ] 折线/柱/饼/仪表/表格/地图最小集
  - [ ] 新类型可插件注册
- **代码锚点**：`fe/src/components/charts/registry.ts`
- **演化建议**：按 plan.md 期次优先级落地
### [VIZ-004] 图表样式子类型

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：图表样式子类型（SRS 追溯项）。
- **验收标准**：
  - [ ] 堆叠/分组/面积/环形等
  - [ ] styleVariant 生效
- **代码锚点**：`fe/src/components/charts/styles/`
- **演化建议**：按 plan.md 期次优先级落地
### [VIZ-005] 维度指标筛选配置 UI

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：维度指标筛选配置 UI（SRS 追溯项）。
- **验收标准**：
  - [ ] 维度/指标/筛选器可配置
  - [ ] 时间范围选择
- **代码锚点**：`fe/src/components/charts/config/`
- **演化建议**：按 plan.md 期次优先级落地
### [VIZ-006] iframe 嵌入门户

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：iframe 嵌入门户（SRS 追溯项）。
- **验收标准**：
  - [ ] 图表可 iframe 嵌入
  - [ ] 跨域策略可配置
- **代码锚点**：`fe/src/embed/`
- **演化建议**：按 plan.md 期次优先级落地
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

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：ECharts/AntV 渲染适配层（SRS 追溯项）。
- **验收标准**：
  - [ ] 统一 ChartConfig→渲染器映射
  - [ ] 主题与 Tailwind 协调
- **代码锚点**：`fe/src/components/charts/adapters/`
- **演化建议**：按 plan.md 期次优先级落地
