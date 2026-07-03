# F07-DASH 驾驶舱与主题

> 模块：M5 · 8 维评分见 [`../prd.md`](../prd.md)

### [DASH-001] DashboardView 数据模型

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：DashboardView 数据模型（SRS 追溯项）。
- **验收标准**：
  - [ ] 布局+组件列表+全局筛选器
  - [ ] 可序列化保存
- **代码锚点**：`backend/app/dashboard/models.py`
- **演化建议**：按 plan.md 期次优先级落地
### [DASH-002] Dashboard 容器与布局引擎

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：Dashboard 容器与布局引擎（SRS 追溯项）。
- **验收标准**：
  - [ ] 空 Dashboard 可创建展示
  - [ ] 网格布局可拖拽
- **代码锚点**：`frontend/src/pages/dashboard/`
- **演化建议**：按 plan.md 期次优先级落地
### [DASH-003] Dashboard 组件库

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：Dashboard 组件库（SRS 追溯项）。
- **验收标准**：
  - [ ] 地图/热力/KPI/时间轴可插拔
  - [ ] 出厂无预装页
- **代码锚点**：`frontend/src/components/dashboard/`
- **演化建议**：按 plan.md 期次优先级落地
### [DASH-004] 全局筛选器联动

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：全局筛选器联动（SRS 追溯项）。
- **验收标准**：
  - [ ] 筛选器驱动组件刷新
  - [ ] 联动规则可配置
- **代码锚点**：`frontend/src/components/dashboard/filters/`
- **演化建议**：按 plan.md 期次优先级落地
### [DASH-005] 实体总览页 FR-6.2

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：实体总览页 FR-6.2（SRS 追溯项）。
- **验收标准**：
  - [ ] 统计卡片+详情筛选+下钻
  - [ ] 跨组件口径一致
- **代码锚点**：`frontend/src/pages/entity-overview/`
- **演化建议**：按 plan.md 期次优先级落地
### [DASH-006] 实体主题分析 FR-4.1

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：二期
- **描述**：实体主题分析 FR-4.1（SRS 追溯项）。
- **验收标准**：
  - [ ] 时间域日/周/月/同比环比
  - [ ] GIS 分布与行政区划下钻
- **代码锚点**：`frontend/src/pages/theme-analysis/`
- **演化建议**：按 plan.md 期次优先级落地
