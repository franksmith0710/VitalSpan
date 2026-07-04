# 本轮演化目标（共 5 项）— r53

> 生成：2026-07-04 · G2 evolution-picker · 来源：prd.md hub 8 维评分（薄弱项汇总 Top5）
> 主题：**M9 主题分析 + M10/M12 报表模板调度 + M13 Dataset 查询路径与 NFR-08 自主可控 L1 kickoff**

## 本轮演化目标（共 5 项）

### 选题决策

- **批量主题**：hub 绝对最低分 Top5 跨里程碑 **L1 kickoff** — DASH-006 可配置实体主题分析（M9）+ RPT-004 模板树形目录 + RPT-005 报表调度（M10/M12）+ QUERY-009 Dataset 查询路径 + NFR-008 自主可控零 DE/SS（M13）；五 ID 完整度均为 **5%**、可靠性/测试覆盖/性能 **0%**，从未 kickoff
- **来源**：`docs/automate/plan.md` §M1 + §M1B 勾选 **12/12 已完成**，无含 `[ ]` 的活跃节（已知 concern，回落纯 8 维选题）；`prd.md` hub 薄弱项 Top5 — **QUERY-009 11.7**、**RPT-004 11.7**、**DASH-006 11.8**、**RPT-005 11.8**、**NFR-008 11.8**；`plan.archive.md` 映射 M9/M10/M12/M13；`evolution-state.md` 待办池空、**选题卡住计数表空**（五 ID 首次入选）；`git log -5` r52 已合并（PR #81，sha 40e4832；G1 r53 bootstrap sha a89783b）
- **合并理由**：饱和熔断未触发（plan 无未完成 `[ ]` 故执行熔断检查；Top5 加权总分 11.7–11.8 均 ≪90，非评分饱和；待办池无未消化项）；r52 已破 90 的 GOV/DESIGN/QUERY/CONN companion 簇完成，hub 刷新后 Top5 回落远期未实现项；五 ID 虽跨 DASH/RPT/QUERY/NFR 四域，但共享 **~11 分未实现 kickoff** 与「结构化错误域 + pytest smoke + 契约骨架」交付模式，对齐 r40/r44/r46 L1 kickoff 批处理节奏；RPT-004/RPT-005 同 `reports` 模块内聚；QUERY-009 与 NFR-008 同属 M13 四期语义层/合规轨，符合 `goal.md` **G1 零第三方 BI 运行时**与 **G3 Dataset 四期补齐**
- **范围框定**：
  - **模块**（≤3）：`backend/app/reports/`（RPT-004 模板树目录 + RPT-005 调度 FSM 骨架）+ `backend/app/dashboards/` 或主题分析域（DASH-006 实体主题分析配置契约）+ `backend/app/query/` + `backend/app/core/nfr/`（QUERY-009 Dataset 查询路径路由骨架 + NFR-008 零 DE/SS 运行时守卫 smoke）
  - **文件**（合计约 16–18，≤20）：reports 模板树 CRUD/catalog + schedule 状态机 REST 骨架；dashboards/theme 实体主题分析 schema + 校验 smoke；query dataset 路径路由 + readonly guard 契约；NFR-008 runtime 依赖扫描/声明守卫；pytest L1 smoke（`test_dash_rpt_query_nfr_r53` 或同级）+ r52 `test_design_conn_gov_query_r52` 回归门控
  - **不含**：Admin 全量 UI、报表引擎真实渲染、GIS 地图生产集成、Dataset CRUD 全链路（META-004 ~12 分留 companion）、调度 cron 生产执行器、信创连接器 CONN-018/020；r52 已破 90 的设计器/OpenSearch/治理簇
- **不足 5 项原因**：不适用 — 本轮满 5 项（hub Top5 薄弱项 L1 kickoff）

### 候选对比

| 候选 prd ID | 加权总分 | 未选原因 |
|-------------|:--------:|----------|
| QUERY-009 Dataset 查询路径 | 11.7 | **入选**（hub #1 并列最低；M13 四期语义层） |
| RPT-004 模板树形目录管理 | 11.7 | **入选**（hub #2 并列最低；M10 报表模板） |
| DASH-006 可配置实体主题分析 | 11.8 | **入选**（hub #3；M9 FR-4.1） |
| RPT-005 报表调度 | 11.8 | **入选**（hub #4；M12 FR-3.2；与 RPT-004 同 reports 模块） |
| NFR-008 自主可控零 DE/SS | 11.8 | **入选**（hub #5；M13 NFR-08；G1 零运行时依赖） |
| CONN-020 OceanBase | 12.0 | 信创连接器域，M13 已有多轮 CONN companion，本轮优先 hub Top5 |
| META-004 Dataset CRUD | 12.0 | 与 QUERY-009 强相关但排名 #7；QUERY-009 kickoff 后可 companion 推分 |
| CONN-018 人大金仓 | 12.1 | 信创连接器，hub #8，本轮 Top5 优先 |
| CONN-004 / VIZ-005 | 90.0 | 已实现 companion 达标，非薄弱 |

### STUCK 标注

- 五 ID 均不在选题卡住计数表 — **首次入选**，未达 ≥3 轮硬标注阈值，不标 `STUCK:` 硬阻塞

## 演化北极星自检

1. **用户感知**：平台具备实体主题分析配置入口骨架、报表模板树目录与调度状态机契约、Dataset 查询路径声明与零 Superset/DataEase 运行时依赖守卫；集成方感知 reports/query/NFR 横切 REST 契约。
2. **补缺 or 创造**：补缺（PRD 已登记但完整度 5% 空壳）；符合 `goal.md` G1/G3 与 M9–M13 归档里程碑。
3. **不做代价**：hub 绝对最低分簇持续 ~11 分，主题分析/报表调度/Dataset 路径/NFR-08 无法进入 companion 推分轨道。
4. **能否批处理更小项**：已批处理为 Top5 跨域 L1 kickoff（单轮 ≤20 文件、≤3 模块）。
5. **共几项/文件模块**：5 项；reports + dashboards + query/core，估 ≤18 文件、3 模块。

---

### 子项 1：QUERY-009 Dataset 查询路径

- **选题理由**：hub **绝对最低分并列 #1（11.7）**；完整度 **5%**、可靠性 **0%**、测试覆盖 **0%** 均为未实现空壳；M13 四期 Dataset 语义层查询路径，衔接 r52 已交付的 QUERY-003 native guard 与远期 META-004
- **选题时 PRD 加权总分**：11.7/100（用户价值 **46%** · 完整度 **5%** · 可靠性 **0%** · 架构 **11%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **12%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥76% Dataset 查询路径路由 + 契约骨架）；可靠性（0%→≥92% 非法 datasetId/越权拦截 smoke）
- **用户感知**：查询 API 可声明 Dataset 查询路径（相对直连 SQL），非法路径被结构化拦截
- **类型**：补缺（M13 Dataset 查询 L1 kickoff）
- **验收标准**（来源 hub · plan.archive M13 · QUERY-009）：
  - Dataset 查询路径路由契约 + readonly/ACL guard smoke
  - 与 QUERY-003 native 路径边界对齐
  - pytest L1；加权总分 L1 目标 ≥85

### 子项 2：RPT-004 模板树形目录管理

- **选题理由**：hub **绝对最低分并列 #1（11.7）**；完整度 **5%**；M10 报表模板体系目录管理 kickoff，与 RPT-005 同 reports 模块批处理
- **选题时 PRD 加权总分**：11.7/100（用户价值 **48%** · 完整度 **5%** · 可靠性 **0%** · 架构 **8%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **12%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥76% 模板树 catalog CRUD 骨架）；架构（8%→≥66% 树形目录模型与 API 契约）
- **用户感知**：管理员可维护报表模板树形目录结构（创建/移动/删除节点骨架），非法操作有结构化错误
- **类型**：补缺
- **验收标准**（来源 hub · plan.archive M10 · RPT-004）：
  - 模板树目录 REST 骨架 + 结构化 RPT_* 错误域
  - 树形层级校验 smoke（循环引用/孤儿节点拦截）
  - pytest L1；加权总分 L1 目标 ≥85

### 子项 3：DASH-006 可配置实体主题分析

- **选题理由**：hub **#3（11.8）**；完整度 **5%**；M9 FR-4.1 可配置实体主题分析 kickoff，GIS/时间域主题分析远期 UI 留 companion
- **选题时 PRD 加权总分**：11.8/100（用户价值 **49%** · 完整度 **5%** · 可靠性 **0%** · 架构 **11%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **8%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥76% 实体主题分析配置 schema + 校验）；可靠性（0%→≥92% 非法实体/维度配置拦截）
- **用户感知**：平台具备实体主题分析配置契约，可声明实体与维度绑定骨架
- **类型**：补缺
- **验收标准**（来源 hub · plan.archive M9 · DASH-006）：
  - 实体主题分析 config schema + 校验 endpoint smoke
  - 与 DASH-001~003 已交付 dashboard 域边界对齐
  - pytest L1；加权总分 L1 目标 ≥85

### 子项 4：RPT-005 报表调度

- **选题理由**：hub **#4（11.8）**；完整度 **5%**；M12 FR-3.2 报表调度 kickoff，与 RPT-004 同 reports 模块内聚
- **选题时 PRD 加权总分**：11.8/100（用户价值 **47%** · 完整度 **5%** · 可靠性 **0%** · 架构 **9%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **13%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥76% 调度状态机 REST 骨架）；可靠性（0%→≥92% 非法 cron/状态迁移拦截）
- **用户感知**：报表模板可绑定调度计划（draft→scheduled 骨架），非法调度被结构化拦截
- **类型**：补缺
- **验收标准**（来源 hub · plan.archive M12 · RPT-005）：
  - 报表调度 FSM API 骨架 + 错误域
  - 与 RPT-004 模板树目录关联 smoke
  - pytest L1；加权总分 L1 目标 ≥85

### 子项 5：NFR-008 自主可控零 DE/SS

- **选题理由**：hub **#5（11.8）**；完整度 **5%**；直接支撑 `goal.md` **G1 零 Superset/DataEase 运行时依赖**与成功指标 NFR-08
- **选题时 PRD 加权总分**：11.8/100（用户价值 **46%** · 完整度 **5%** · 可靠性 **0%** · 架构 **13%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **11%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥76% 运行时依赖扫描/声明契约）；安全性（11%→≥88% 检测到 DE/SS 运行时依赖时结构化告警 smoke）
- **用户感知**：部署验收可验证平台无 Superset/DataEase 运行时绑定，违规依赖有明确告警
- **类型**：补缺
- **验收标准**（来源 hub · plan.archive M13 · NFR-008 + goal G1）：
  - 零 DE/SS 运行时守卫/声明 endpoint + pytest smoke
  - 与 `pyproject.toml`/依赖清单边界对齐（扫描 mock 即可，非生产 SBOM 全量）
  - pytest L1；加权总分 L1 目标 ≥85
