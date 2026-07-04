# 本轮演化目标（共 5 项）— r49

> 生成：2026-07-04 · G2 evolution-picker · 来源：prd.md hub 8 维评分（薄弱项汇总 Top5）
> 主题：**M13 设计器 + M11 OpenSearch + 治理/查询 L1 kickoff**

## 本轮演化目标（共 5 项）

### 选题决策

- **批量主题**：设计器域（DESIGN-003/005）+ OpenSearch 连接器（CONN-016）+ 治理项（GOV-003）+ 查询项（QUERY-003）**L1 kickoff**（hub 当前绝对最低分簇，完整度均为 5%、可靠性/测试覆盖 0%，r46 后 Top5 已刷新为本簇）
- **来源**：`docs/automate/plan.md` §M1 + §M1B 勾选 **12/12 已完成**，无含 `[ ]` 的活跃节（已知 concern，回落纯 8 维选题）；`prd.md` hub 薄弱项 Top5 — **DESIGN-005 11.6**、**DESIGN-003 11.6**、**CONN-016 11.6**、**GOV-003 11.6**、**QUERY-003 12.0**；`evolution-state.md` 待办池空；选题卡住计数表为 r46 五 ID（NFR-005/006/007、GOV-005、CONN-019，各 1 轮，加权 79.2–84.1，已非 hub Top5）；`git log -5` r48 G1 bootstrap 已合并（sha 6a46f6d；r46 feat 已 Squash merge #73 sha 2d1f89a）
- **合并理由**：饱和熔断未触发（plan 无未完成 `[ ]` 故执行熔断检查；Top5 加权总分 11.6–12.0 均 ≪90，非评分饱和；待办池无未消化项）；r46 承接 NFR/GOV-005/CONN-019 后 hub Top5 已切换至本簇（r46 round-target 明示 DESIGN/CONN-016/GOV-003/QUERY-003 留后续）；五 ID 虽跨 DESIGN/CONN/GOV/QUERY 四域，但共享 **~11 分未实现 kickoff** 与「结构化错误域 + pytest smoke + 契约/方言骨架」交付模式，对齐 r32 DESIGN L1、r40 连接器 L1 批处理节奏；CONN-016 贴合 `goal.md` **G2**；GOV-003/QUERY-003 为 G5/G3 远期能力骨架，本轮仅 L1 契约不落全量 UI
- **范围框定**：
  - **模块**（≤3）：`backend/app/design/`（DESIGN-003/005 设计器契约与校验骨架，延续 r32 DESIGN-001/002 域）+ `backend/app/datasources/dialects/`（CONN-016 OpenSearch 方言 + registry 登记）+ `backend/app/governance/` 与 `backend/app/query/` 横切面（GOV-003 治理项 REST 骨架 + QUERY-003 查询项契约 smoke，共享错误域与 pytest 门控）
  - **文件**（合计约 16–19，≤20）：设计器 spec/校验 REST；OpenSearch dialect test_connection/metadata/types catalog + OPENSEARCH_* 错误域；GOV-003 治理项状态/契约 endpoint；QUERY-003 查询项契约与守卫 smoke；pytest L1（`test_design_conn_gov_query_r49` 或同级）+ r32 design / r40 connector / r46 governance 回归门控
  - **不含**：Admin 全量设计器 UI、OpenSearch 生产集群 HA、GOV BPM 全量工单、QUERY-003 Dataset 语义层全链路（M13 四期）、r46 STUCK 簇（79–84 分）companion 推分（留 r50+）；DESIGN-004 单独立项（12.1，本轮 Top5 已满）
- **不足 5 项原因**：不适用 — 本轮满 5 项（hub Top5 薄弱项 L1 kickoff）

### 候选对比

| 候选 prd ID | 加权总分 | 未选原因 |
|-------------|:--------:|----------|
| DESIGN-005 | 11.6 | **入选**（hub #1；用户价值簇内最低 44%） |
| DESIGN-003 | 11.6 | **入选**（hub #2；延续 r32 DESIGN-001/002 L1） |
| CONN-016 OpenSearch | 11.6 | **入选**（hub #3；G2 搜索类连接器 kickoff） |
| GOV-003 | 11.6 | **入选**（hub #4；治理域未 kickoff 项） |
| QUERY-003 | 12.0 | **入选**（hub #5；查询域契约 L1） |
| NFR-005 | 81.2 | r46 L1 已交付；加权总分高于 Top5，companion 推分留后续轮 |
| NFR-006 | 79.2 | 同上；STUCK 1 轮未达 ≥3 硬标注 |
| NFR-007 | 80.0 | 同上 |
| GOV-005 | 82.6 | r46 L1 已交付；STUCK 1 轮，本轮优先绝对最低分簇 |
| CONN-019 GBase | 84.1 | r46 L1 已交付；STUCK 1 轮 |
| DESIGN-004 | 12.1 | 略高于 Top5 第 5 名，本轮名额已满 |
| CONN-018/020 | 12.0–12.1 | 信创/分布式库连接器，次轮候选 |

### STUCK 标注

- 本轮五 ID 均不在选题卡住计数表 — **首次入选**（r46 STUCK 五 ID 未入选本轮），未达 ≥3 轮硬标注阈值，不标 `STUCK:` 硬阻塞

## 演化北极星自检

1. **用户感知**：数据源类型列表出现 OpenSearch；设计器域具备可探测的 spec/校验契约；治理与查询项具备 REST 骨架与非法入参拦截。
2. **补缺 or 创造**：补缺（PRD 已登记但完整度 5% 空壳）；CONN-016 符合 `goal.md` G2；GOV-003/QUERY-003 为 G5/G3 能力预埋骨架。
3. **不做代价**：hub 绝对最低分簇持续 ~11 分，设计器与 OpenSearch 无法进入 companion 推分轨道。
4. **能否批处理更小项**：已批处理为 Top5 跨域 L1 kickoff（单轮 ≤20 文件、≤3 模块域）。
5. **共几项/文件模块**：5 项；design + datasources + governance/query + tests，估 ≤19 文件、3 模块域。

---

### 子项 1：DESIGN-005 设计器项

- **选题理由**：hub **#1（11.6）**；用户价值 **44%** 为簇内最低；完整度 **5%**、可靠性 **0%**、测试覆盖 **0%** 均为未实现空壳；延续 r32 DESIGN-001/002 已破 90 的设计器域
- **选题时 PRD 加权总分**：11.6/100（用户价值 **44%** · 完整度 **5%** · 可靠性 **0%** · 架构 **12%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **13%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥76% spec/校验 REST 骨架）；测试覆盖（0%→≥96% pytest smoke）
- **用户感知**：设计器域具备可登记的设计项 spec 与基础校验入口（后端契约先行，无全量 Admin UI）
- **类型**：补缺（设计器 L1 kickoff）
- **验收标准**（来源 hub · DESIGN-005 + r32 设计器域基线）：
  - 设计项 spec schema + 校验 REST 骨架 + 结构化 DESIGN_* 错误域
  - pytest L1 smoke；与 DESIGN-001/002 域边界对齐
  - 加权总分 L1 目标 ≥85

### 子项 2：DESIGN-003 设计器项

- **选题理由**：hub **#2（11.6）**；与 DESIGN-005 同域同分，共享 `design/` 模块与交付模式
- **选题时 PRD 加权总分**：11.6/100（用户价值 **47%** · 完整度 **5%** · 可靠性 **0%** · 架构 **10%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **11%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥76%）；可靠性（0%→≥92% 非法 spec 拦截 smoke）
- **用户感知**：第二类设计器能力具备独立契约与校验，可与 DESIGN-005 组合探测
- **类型**：补缺
- **验收标准**（来源 hub · DESIGN-003）：
  - 设计器项 B 类契约 endpoint + 守卫 smoke
  - pytest L1 + DESIGN-005 联动回归
  - 加权总分 L1 目标 ≥85

### 子项 3：CONN-016 OpenSearch 连接器

- **选题理由**：hub **#3（11.6）**；搜索类数据源，补齐 M11 连接器族；完整度 **5%**；直接支撑 `goal.md` **G2 多类别数据源**
- **选题时 PRD 加权总分**：11.6/100（用户价值 **48%** · 完整度 **5%** · 可靠性 **0%** · 架构 **10%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **9%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥76% test_connection + metadata/types catalog）；测试覆盖（0%→≥96% dialect mock smoke）
- **用户感知**：数据源类型可选 OpenSearch，测试连接与索引/映射元数据探测可用（mock/compose smoke）
- **类型**：补缺
- **验收标准**（来源 hub · CONN-016 + r40/r41 连接器 L1 模式）：
  - OpenSearch dialect + types catalog + OPENSEARCH_* 错误域
  - test_connection/metadata HTTP 链 pytest smoke
  - registry 登记与 NFR-005 扩展点路径对齐；加权总分 L1 目标 ≥85

### 子项 4：GOV-003 治理项

- **选题理由**：hub **#4（11.6）**；治理域未 kickoff 项；与 r30/r31 GOV-001/002 及 r46 GOV-005 发布 FSM 形成治理面递进
- **选题时 PRD 加权总分**：11.6/100（用户价值 **48%** · 完整度 **5%** · 可靠性 **0%** · 架构 **10%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **9%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥76% 治理项 REST 骨架）；可靠性（0%→≥92% 非法状态/入参拦截）
- **用户感知**：治理域新增第三类治理项可探测、可登记（契约级，非全量 BPM UI）
- **类型**：补缺
- **验收标准**（来源 hub · GOV-003 + r46 governance 基线）：
  - 治理项契约 REST + GOV_* 错误域 smoke
  - 与 governance 域既有 catalog/bus 边界对齐
  - pytest L1；加权总分 L1 目标 ≥85

### 子项 5：QUERY-003 查询项

- **选题理由**：hub **#5（12.0）**；查询域未 kickoff；完整度 **5%**；本轮仅契约 L1，不含 M13 Dataset 全链路
- **选题时 PRD 加权总分**：12.0/100（用户价值 **47%** · 完整度 **5%** · 可靠性 **0%** · 架构 **12%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **12%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥76% 查询项契约 + 守卫）；架构（12%→≥66% 与 query 域分层对齐）
- **用户感知**：查询域第三类查询能力具备可探测契约与非法查询拦截（后端 smoke）
- **类型**：补缺
- **验收标准**（来源 hub · QUERY-003 + r38 QUERY-008 翻译器域边界）：
  - 查询项 spec/守卫 endpoint + QUERY_* 错误域
  - pytest L1；与既有 query API 无循环依赖
  - 加权总分 L1 目标 ≥85
