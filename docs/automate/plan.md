# 演化里程碑计划

> 人工维护（create-evolution-plan）；演化 agent 只读。  
> 当前节 = 第一个含未完成 `[ ]` 的节。  
> 权威规格：[自研 BI 分析平台需求规格说明书.md](../全生命周期系统需求规格说明书.md) V3.6 · [附录 F](../附录F-实施追溯矩阵.md)

**ID 体系**：本计划采用 **平台模块 ID / 平台 FR** 人工勾选跟踪。`prd.md` 分片尚未建立，**暂不接入** evolution orchestrator 自动对账。

**产品原则**：连接 MySQL/PostgreSQL 等数据源 → **图表绑定 SQL/表** → 仪表板展示。**数据集（Dataset）配置四期再做**。无场景包加载。

**前端技术栈（已定）**：React + shadcn/ui + Radix Primitives + Tailwind CSS v4（图表层 ECharts/AntV，与 UI 壳层解耦）。

**前端 Skill（唯一）**：`.agents/skills/b-design-system-tailadmin-radix`（TAR）；禁止配置其他前端 Skill。

**后端技术栈（已定）**：Python + FastAPI + Pydantic（开放 API、鉴权中间件、数据源连接与查询执行；OpenAPI 自描述）。

**范围裁剪**：

| 项 | 说明 |
|----|------|
| 一至三期 | 不做 Dataset 管理 UI |
| 四期 | 交付 M1-DATASET |
| **本期不做** | **FR-DATA**（同步入仓）、**FR-ETL**（清洗管道）；当前仅 **FR-2.0 直连查询**，不做 OGG/数仓同步架构 |

**文档对齐**：FR-2.1 完整图表插件以 **三期** 为准（SRS §9.1）；附录 A 优先级以本 plan 为准。

**一期执行顺序**（建议）：`FR-2.0` → `M7-RLS` → `M3-LITE` → `M4-MIN` → `FR-2.0b` → `M5-DASHBOARD` → 其余

**硬门禁**：标注 `⛔` 的条目未完成前，不得开工其依赖方。

---

## P0 — 工程基线（一期启动前置）

**目标**：建立可开发、可部署、可联调的最小工程底座。

- [ ] P0-BOOTSTRAP: React + shadcn/ui + Radix + Tailwind v4 前端工程 + **FastAPI** 后端骨架 + **数据源连接配置骨架**（凭证/连接池占位）+ 基础鉴权中间件  
  **Skills:** `.agents/skills/b-design-system-tailadmin-radix`（前端 UI）、`.agents/skills/fastapi`（后端 API）

---

## P1 — 一期：数据源 + 查询执行 + 最小图表 + Dashboard + 权限 + 总线 PoC

**目标**：MySQL/PG 可连接；带 RLS 的 SQL 可执行；至少表格+一种基础图可出数；M5 空 Dashboard。**不做 Dataset 配置**。

- [ ] FR-2.0: 数据源连接管理（MySQL/PostgreSQL 等）+ 连通性测试
- [ ] M7-RLS: RBAC + 行级权限骨架（数据源级 + 行过滤谓词占位）
- [ ] M3-LITE: ⛔ 轻量查询执行器（参数化 SQL/表查询、超时、错误返回；执行前合并 M7 谓词）
- [ ] M4-MIN: ⛔ 最小图表渲染（**表格 + 折线或柱状** 二选一；ECharts 封装）
- [ ] FR-2.0b: ⛔ 图表绑定 dataSourceId + SQL/物理表（依赖 M3-LITE、M7-RLS、M4-MIN）
- [ ] M5-DASHBOARD: Dashboard 引擎（空仪表板可创建、组件可插拔）
- [ ] FR-VIEW-1a: DashboardView 数据模型（管理员保存 defaultViewId）
- [ ] FR-8.1: 管理员配置角色与数据域规则（无预置业务角色）
- [ ] P1-SMOKE: 一期冒烟 — 建数据源 → 配 SQL → Dashboard 组件出数 + 越权用例失败
- [ ] WS-01: 查询接口分类 taxonomy 工作坊（一期第 2 月）
- [ ] WS-01-DONE: ⛔ 附录 E §一 分类状态改为「已确认」
- [ ] FR-1.1-PoC: ⛔ 接口 catalog + 半自动总线注册（≥2 API 含 FR-2.0b 查询 API；依赖 WS-01-DONE）
- [ ] NFR-01/03: Dashboard 首屏 ≤ 5s + HTTPS/审计日志（一期验收）

---

## P2 — 二期：主题分析 + 报表引擎 + 角色默认模板

**目标**：M6 报表引擎、M5 主题页、FR-VIEW-3；均由管理员配置，无自动导入。

> **执行顺序**：W1（二期初）→ W2（二期中）→ W3（二期末）

### P2-W1 二期初

- [ ] FR-2.0-EXT: 扩展数据源类型或第二批连接实例（仍属 FR-2.0 范畴，非 FR-DATA 同步）
- [ ] FR-VIEW-3: 角色默认 Dashboard/报表模板
- [ ] M1-ENTITY-MODEL: ⛔ 实体/表元数据轻量登记（供 FR-6.2；非 Dataset 层）

### P2-W2 二期中

- [ ] FR-6.2: 可配置实体总览页
- [ ] FR-3.1: 可配置实体生命周期预制分析页
- [ ] FR-4.1: 可配置实体主题分析（时间域 + GIS）

### P2-W3 二期末

- [ ] M6-REPORT-ENGINE: 报表引擎（管理员手工配置报表；复用 M3-LITE）
- [ ] FR-6.3: 报表指标/筛选器调整能力
- [ ] NFR-01: 报表查询 ≤ 10s（二期验收）
- [ ] NFR-02: 核心看板 SLA ≥ 99.5% 监控上线（二期起持续）

---

## P3 — 三期：完整图表插件 + 用户视图 + 模板调度

**目标**：在 M4-MIN 基础上扩展完整 M4；FR-VIEW-4；M6 调度。

- [ ] M4-CHART-PLUGIN: 图表类型 + 样式子类型 + ChartViewConfig（扩展 M4-MIN）
- [ ] FR-2.1: 多类型图表可配置；iframe/SDK 嵌入
- [ ] FR-VIEW-4: 用户「我的视图」保存（不突破 M7）
- [ ] FR-3.2: 模板定义/管理/调度 + IF-03 文档 API
- [ ] FR-6.4: 批量新增报表配置能力
- [ ] WS-03: 总线鉴权/限流规范工作坊（三期末）
- [ ] NFR-05/07: 兼容性 + 门户嵌入（三期验收）

---

## P4 — 四期：Dataset + 查询平台闭环（4 并行 Workstream）

**目标**：M1 Dataset、M2/M3/M8 完整交付；查询治理全流程；总线全自动注册。

### WS4-A — M1 语义层与 Dataset（四期月 1~2）

- [ ] M1-DATASET: 数据集管理（对标 DataEase 数据集 / Superset Dataset）
- [ ] FR-1.5a: 元模型存储与共享信息模型灌注
- [ ] FR-2.2-a: 语义定义与解析、数据模型管理、业务主题树、维度字典
- [ ] M1-MIGRATE: 既有 FR-2.0b 绑定迁移为 datasetId（验收：≥1 图表迁移成功且查询结果一致）

### WS4-B — M2 可视化设计器（四期月 1~3）

- [ ] FR-1.3: 可视化查询分析设计工具 + 运算规则

### WS4-C — M3 查询引擎（四期月 2~4）

- [ ] FR-1.5b: 配置→SQL/API 生成与参数化执行（承接并扩展 M3-LITE）
- [ ] FR-1.4a: 接口自动创建与实现逻辑生成

### WS4-D — M8 服务治理（四期月 2~4）

- [ ] FR-1.2: 流程化查询请求申请（可配置流程与角色）
- [ ] FR-1.4b: 流程化查询服务发布审批流
- [ ] FR-1.6: 数据访问权限与发布流程联动
- [ ] FR-1.1: ⛔ 总线全自动注册（替代 PoC；依赖 WS-03、FR-1.5b）
- [ ] FR-2.2-b: 传统 SQL/存储过程查询模式
- [ ] NFR-04/06/08: 扩展性 + 信创 + 自主可控（四期验收）

### P4 集成验收

- [ ] FR-1.x-INTEGRATION: 可配置工单流程→设计→发布→RLS→总线 端到端验收

---
