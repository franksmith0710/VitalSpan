# F07-DASH 驾驶舱与主题

> 模块：M5 · 8 维评分见 [`../prd.md`](../prd.md)

### [DASH-001] DashboardView 数据模型

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：DashboardView 数据模型（SRS 追溯项）。
- **验收标准**：
  - [x] 布局+组件列表+全局筛选器
  - [x] 可序列化保存
- **代码锚点**：`backend/app/dashboard/models.py` · `backend/app/dashboard/service.py` · `backend/migrations/versions/0013_dashboards.py`
- **演化建议**：r29 layout 业务校验 DASH_DUPLICATE_WIDGET/DASH_MISSING_CHART_CONFIG 等独立 code（T-DASH-R29-001）；后续可补版本历史与并发乐观锁
- **里程碑对齐**：
### [DASH-002] Dashboard 容器与布局引擎

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：Dashboard 容器与布局引擎（SRS 追溯项）。
- **验收标准**：
  - [x] 空 Dashboard 可创建展示
  - [ ] 网格布局可拖拽
- **代码锚点**：`fe/src/pages/admin/dashboard/` · `fe/src/components/dashboard/`
- **演化建议**：r29 resizeWidget/标题编辑 + 增强空态引导（T-DASH-R29-002）；仍缺 react-grid-layout 拖拽，待后续轮次
- **里程碑对齐**：
### [DASH-003] Dashboard 组件库

- **状态**：部分实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：Dashboard 组件库（SRS 追溯项）。
- **验收标准**：
  - [ ] 地图/热力/KPI/时间轴可插拔
  - [x] 出厂无预装页
- **代码锚点**：`fe/src/components/dashboard/` · `fe/src/components/charts/ChartRenderer.tsx`
- **演化建议**：r29 WidgetPalette 标题/栅格编排 + chart 组件插槽（T-DASH-R29-003）；地图/热力/KPI/时间轴待后续轮次；保持无预装业务页
- **里程碑对齐**：
### [DASH-004] 全局筛选器联动

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：全局筛选器联动（SRS 追溯项）。
- **验收标准**：
  - [ ] 筛选器驱动组件刷新
  - [ ] 联动规则可配置
- **代码锚点**：`fe/src/components/dashboard/filters/`
- **演化建议**：按 plan.md 期次优先级落地
### [DASH-005] 实体总览页 FR-6.2

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：实体总览页 FR-6.2（SRS 追溯项）。
- **验收标准**：
  - [ ] 统计卡片+详情筛选+下钻
  - [ ] 跨组件口径一致
- **代码锚点**：`fe/src/pages/entity-overview/`
- **演化建议**：按 plan.md 期次优先级落地
### [DASH-006] 实体主题分析 FR-4.1

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：实体主题分析 FR-4.1（SRS 追溯项）。
- **验收标准**：
  - [ ] 时间域日/周/月/同比环比
  - [ ] GIS 分布与行政区划下钻
- **代码锚点**：`fe/src/pages/theme-analysis/`
- **演化建议**：按 plan.md 期次优先级落地
