# 演化轮次选题 — 2026-07-03（M5 图表与 Dashboard kickoff r28）

## 本轮演化目标（共 5 项）

### 选题决策

- **批量主题**：M5 最小图表与 Dashboard — **VIZ/DASH 核心 kickoff r28**（M4 QUERY 簇 QUERY-001/002/004/005/006 已于 r26 L1 + r27 质量推分全破 90；本轮从 **plan.archive.md §M5** 首批 5 项立项，交付 ChartViewConfig 协议、最小图表集（表格/折线/柱）、DashboardView 数据模型、容器布局引擎与组件库的 **L1 模型 + 元库迁移 + API/FE 骨架 + pytest/vitest smoke**）
- **来源**：`docs/automate/plan.md` §M1 + §M1B 勾选 **12/12 已完成**，无含 `[ ]` 的活跃节；`plan.archive.md` §M5 VIZ-001~002 + DASH-001~003 为下一里程碑；`prd.md` hub 8 维 — **已实现簇** BOOT/DATA/AUTH/DS/CONN/QUERY 均 ≥90.1，**未实现最近期簇** VIZ/DASH 加权总分 13.2–13.9（完整度 5%、可靠性 0%、测试覆盖 0%）；`evolution-state.md` 待办池空、STUCK 表空；`git log -5` r27 已合并（PR #49，M4 query quality push）
- **合并理由**：饱和熔断未触发（plan 无未完成项故执行熔断检查；Top5 薄弱汇总 META-001~CONN-009 均为远期未实现 10.8–11.1，均 <90，非评分饱和；待办池无未消化项）；VIZ-001/002 + DASH-001/002/003 同属 FR-2.0b 出数后的展现闭环、相互依赖（协议→图表渲染→Dashboard 模型→布局→组件挂载），可单轮批处理 L1 交付；对齐 `goal.md` **G3 BI 展现全链路** 与 P1-SMOKE「SQL → Dashboard 出数」前置
- **范围框定**：
  - **模块**（3）：`backend/app/`（viz/dashboard 域模型与 API 入口，按 `arch.md` 约定落位）、`fe/src/`（图表组件与 Dashboard 页面骨架）、`backend/migrations/`（元库 Alembic revision）
  - **文件**（合计约 16–20，≤20）：schemas/models、service、router、chart 协议类型、最小图表组件、Dashboard 布局壳、migration、tests；**不修改** `goal.md` / `plan.md` 结构
  - **不含**：VIEW-001（视图协议 FR-VIEW-1，留 r29 companion）；M6 P1-SMOKE 集成验收；远期 META/DESIGN/QUERY-007~009（M13 Dataset）；完整 GIS/主题分析（M9）；QUERY-003 Native 双路径（M11）；生产级图表主题与全量 ECharts 能力（本期最小三件套 L1 only）
- **不足 5 项原因**：不适用 — 本轮满 5 项，均为 M5 VIZ/DASH 同批地基主题

### 候选对比

| 候选 prd ID | 加权总分 | 未选原因 |
|-------------|:--------:|----------|
| META-001 | 10.8 | F11-META 术语字典，M13 远期，完整度 5% 因未实现 |
| DESIGN-001 | 10.8 | F12-DESIGN 拖拽查询，M13 治理设计器 |
| CONN-021 | 10.9 | TiDB 连接器，M13 信创扩展 |
| QUERY-007 | 10.9 | 配置元模型存储，M13 Dataset 语义层 |
| QUERY-003 | 12.0 | Native 查询双路径属 M11；M5 kickoff 优先闭合 G3 展现链 |
| CONN-009 | 11.1 | StarRocks 连接器，M11 OLAP 扩展 |
| VIEW-001 | 13.7 | DashboardView 视图协议，依赖 DASH-001 模型先落地，留 r29 |
| QUERY-001 | 92.8 | M4 已实现且 ≥90，非薄弱 |
| VIZ-003 | 11.7 | 图表类型插件注册，依赖 VIZ-001/002 L1 先通 |

### STUCK 标注

- 无 — `evolution-state.md` 选题卡住计数表为空

---

### 子项 1：VIZ-001 ChartViewConfig 协议

- **选题理由**：M5 首推项；hub **VIZ 簇协议地基**；**完整度 5%**、**可靠性 0%**、**测试覆盖 0%** 均未实现；M4 QUERY/FR-2.0b 已可出数，缺统一图表配置契约衔接前端渲染
- **选题时 PRD 加权总分**：13.9/100（用户价值 **57%** · 完整度 **5%** · 可靠性 **0%** · 架构 **12%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **13%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥60% L1）；架构健康（12%→≥40% 协议与类型定义）
- **用户感知**：平台有统一的图表配置结构（数据源/SQL 绑定、维度指标槽位、图表类型枚举），前后端契约一致
- **类型**：创造（M5 新功能立项，符合 goal G3）
- **验收标准**（来源 `plan.archive.md` §M5 · VIZ-001）：
  - `ChartViewConfig` Pydantic/TS 类型定义；与 QUERY-005 bindings 字段对齐
  - 后端 schemas + 校验（非法 chartType、缺失 dataSourceId 结构化 4xx）
  - pytest/vitest：协议序列化 round-trip、非法配置拒绝 smoke

### 子项 2：VIZ-002 最小图表集 M4-MIN

- **选题理由**：hub 加权总分 **13.6**；**完整度 5%**；P1-SMOKE 要求表格/折线/柱可渲染；依赖 VIZ-001 协议 + M4 execute 出数
- **选题时 PRD 加权总分**：13.6/100（用户价值 **58%** · 完整度 **5%** · 可靠性 **0%** · 架构 **13%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **8%** · 交互 **待评**）
- **主攻薄弱维**：完整度（5%→≥60%）；交互体验（整维由 0 建立 L1 加载/空态/错误态）
- **用户感知**：在 Admin 或预览页可看到表格、折线图、柱状图三种最小组件，绑定 SQL 后有数据展示
- **类型**：创造
- **验收标准**（来源 `plan.archive.md` §M5 · VIZ-002）：
  - `fe/src/components/`（或 `pages/` 下）最小三图表组件；消费 `ChartViewConfig` + execute API
  - 空数据、加载中、执行失败有明确 UI 反馈（非空白）
  - vitest：组件渲染 smoke；mock execute 成功/失败路径

### 子项 3：DASH-001 DashboardView 数据模型

- **选题理由**：hub **DASH 簇最低分 13.2**（与 DASH-003 并列）；**完整度 5%**；Dashboard 持久化模型为布局引擎与组件库前置
- **选题时 PRD 加权总分**：13.2/100（用户价值 **55%** · 完整度 **5%** · 可靠性 **0%** · 架构 **13%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **9%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥60% L1）；可靠性（0%→≥40% CRUD 校验与冲突处理）
- **用户感知**：可创建/查询/更新 Dashboard 实例（名称、描述、布局 JSON 占位），获得 `dashboardId`
- **类型**：创造
- **验收标准**（来源 `plan.archive.md` §M5 · DASH-001）：
  - `backend/` Dashboard 模型；Alembic revision 含 dashboards 表
  - `POST/GET/PUT/DELETE /api/v1/dashboards`（或等价）OpenAPI 可见
  - pytest：CRUD smoke、重复 slug/name 冲突、非法布局 JSON 4xx

### 子项 4：DASH-002 Dashboard 容器与布局引擎

- **选题理由**：加权总分 **13.6**；**完整度 5%**；空 Dashboard 可创建展示为 M5 目标；依赖 DASH-001 模型
- **选题时 PRD 加权总分**：13.6/100（用户价值 **56%** · 完整度 **5%** · 可靠性 **0%** · 架构 **14%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **10%** · 交互 **待评**）
- **主攻薄弱维**：完整度（5%→≥60%）；交互体验（布局网格、拖拽占位或静态栅格 L1）
- **用户感知**：打开 Dashboard 编辑/预览页可见容器与基础栅格布局，可添加组件槽位
- **类型**：创造
- **验收标准**（来源 `plan.archive.md` §M5 · DASH-002）：
  - `fe/src/pages/admin/dashboard/`（或等价）Dashboard 容器页；路由 `/admin/dashboards/*`
  - 布局 JSON 与 DASH-001 模型读写一致；保存/加载不丢组件引用
  - vitest：布局序列化 smoke；空 Dashboard 引导态

### 子项 5：DASH-003 Dashboard 组件库

- **选题理由**：加权总分 **13.2**；**完整度 5%**；将 VIZ-002 图表挂载到 Dashboard 槽位，闭合「查询出数 → 图表 → Dashboard」L1 链
- **选题时 PRD 加权总分**：13.2/100（用户价值 **57%** · 完整度 **5%** · 可靠性 **0%** · 架构 **8%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **11%** · 交互 **待评**）
- **主攻薄弱维**：完整度（5%→≥60%）；架构健康（8%→≥40% 组件注册与复用）
- **用户感知**：在 Dashboard 上添加图表组件并绑定已有 ChartViewConfig，保存后刷新仍可展示
- **类型**：创造
- **验收标准**（来源 `plan.archive.md` §M5 · DASH-003）：
  - Dashboard 组件面板可插入 VIZ-002 三类型；组件 config 存入 layout JSON
  - 与 DASH-002 布局引擎集成；删除/移动组件不破坏其余槽位
  - vitest + pytest：组件挂载 integration smoke；Dashboard 含至少 1 图表端到端（mock 数据）
