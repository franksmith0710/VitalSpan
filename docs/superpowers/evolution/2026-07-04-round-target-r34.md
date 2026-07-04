# 演化轮次选题 — 2026-07-04（M11 连接器 + M13 治理 L1 kickoff r34）

## 本轮演化目标（共 5 项）

### 选题决策

- **批量主题**：**M11 连接器 L1 kickoff**（TiDB / StarRocks / Elasticsearch）+ **M13 治理 L1 kickoff**（可视化查询设计 FR-1.3、权限联动 FR-1.6）— r33 已交付 META-001/002 + QUERY-007 + DESIGN-001/002 质量推分并全破 90；GOV-004 在 r33 中明确「依赖 DESIGN 破 90 后再立项」，条件已满足；连接器三项为 hub 最低分 CONN 簇，闭合 `goal.md` **G2 多类别数据源** 在 OLAP/HTAP/搜索方向的插件扩展
- **来源**：`docs/automate/plan.md` §M1 + §M1B 勾选 **12/12 已完成**，无含 `[ ]` 的活跃节（M11/M12 无活跃节，已知 concern，不阻塞）；`prd.md` hub 薄弱项 Top5 — **CONN-021(10.9)**、**GOV-004(11.1)**、**CONN-009(11.1)**、**CONN-015(11.2)**、**GOV-008(11.2)**；同分 tie-break 取 **user_value** 更低者优先（GOV-004 44% > CONN-009 46%）；`evolution-state.md` 待办池空、STUCK 表空；`git log -5` r33 已合并（PR #57，M11 META + M12 query/design companion quality push）
- **合并理由**：饱和熔断未触发（plan 无未完成 `[ ]` 故执行熔断检查；Top5 加权总分 10.9–11.2 均远 <90，非评分饱和；待办池无未消化项）；对齐 r30 M5 VIEW + M6 companion 跨里程碑 kickoff 节奏（主域 L1 + 关联域 companion）；CONN-001/002（MySQL/PG）与 r25 M3 基线可复用 dialect/registry 模式；GOV-004/008 承接 r32/r33 DESIGN + QUERY-007 元模型，不重复立项 META/DESIGN 已破 90 项；符合 `goal.md` **G2** 与 **G5 查询服务治理**
- **范围框定**：
  - **模块**（3）：`backend/app/datasources/dialects/` + `datasources/` registry（CONN-021/009/015 L1）、`backend/app/gov/` 或等价治理子包（GOV-004/008 L1）
  - **文件**（合计约 16–20，≤20）：3 个连接器 dialect 插件 + registry 登记 + test/pool/metadata smoke；GOV-004 可视化查询设计 schema/validate stub；GOV-008 权限联动钩子（与 auth/RLS 链对接 L1）；pytest 新套件；**不修改** `goal.md` / `plan.md` 结构
  - **不含**：CONN-022 GaussDB 等信创扩展（留 r35）；QUERY-008/009 Dataset 翻译器（依赖本轮 GOV-004 基线）；META-003~006；完整 BPM 工单流水线；Admin 治理全量 UI；五连接器同轮（>20 文件风险）
- **不足 5 项原因**：不适用 — 本轮满 5 项（hub Top5 严格入选）

### 候选对比

| 候选 prd ID | 加权总分 | 未选原因 |
|-------------|:--------:|----------|
| QUERY-008 | 11.3 | 配置→SQL 翻译器，依赖 GOV-004 可视化查询设计 L1 后再立项 |
| CONN-022 | 11.3 | GaussDB 信创扩展，本轮优先更低分 CONN-021/009/015 三角 |
| META-003 | 11.6 | 维度字典，META-001/002 已破 90，留 r35 META companion |
| VIZ-003 | 11.7 | 地图可视化 M5 远期，非 hub Top5 |
| QUERY-009 | 11.7 | Dataset 查询路径，四期 M13，依赖 QUERY-008 |
| DESIGN-003 | 11.6 | 设计器后续项，r33 已闭合 DESIGN-001/002 |
| META-001 | 90.0 | r33 已破 90，非薄弱 |
| DESIGN-001 | 90.1 | r33 已破 90，非薄弱 |

### STUCK 标注

- 无 — `evolution-state.md` 选题卡住计数表为空（r33 五 ID 全破 90 已清零）

---

### 子项 1：CONN-021 TiDB 连接器

- **选题理由**：hub **加权总分最低 10.9**；**完整度 5%**、**可靠性 0%**、**测试覆盖 0%** 均未实现；TiDB 为 MySQL 协议兼容 HTAP，可复用 CONN-001 MySQL dialect 骨架扩展；对齐 `goal.md` **G2** 与 NFR-04 插件化
- **选题时 PRD 加权总分**：10.9/100（用户价值 **46%** · 完整度 **5%** · 可靠性 **0%** · 架构 **8%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **8%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥55% L1 dialect + registry）；测试覆盖（0%→≥50% connect/test/metadata smoke）
- **用户感知**：管理员可登记 TiDB 数据源、测试连通性并浏览库表元数据，与 MySQL/PG 体验一致
- **类型**：创造（M11 连接器扩展 kickoff）
- **验收标准**（来源 hub F04-CONN · CONN-021 + CONN-001/002 基线）：
  - TiDB dialect 插件注册至 ConnectorRegistry；`test`/`metadata` API 可用
  - pytest：连通性 mock/smoke、非法连接串 4xx、与 CONN-001 不回归
  - 加权总分目标 L1 ≥55（下轮 quality push 破 90）

### 子项 2：GOV-004 可视化查询设计 FR-1.3

- **选题理由**：hub **11.1**（同分次于 CONN-009，**user_value 44%** 更低优先）；**完整度 5%**；r33 已交付 DESIGN-001/002 ≥90.1，满足 r33 延期条件「DESIGN 破 90 后再立项」；衔接 QUERY-007 config_store 与 designer validate 链
- **选题时 PRD 加权总分**：11.1/100（用户价值 **44%** · 完整度 **5%** · 可靠性 **0%** · 架构 **11%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **10%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥55% 可视化查询设计 schema + validate）；架构健康（11%→≥40% 与 DESIGN/QUERY-007 边界清晰）
- **用户感知**：治理域可登记/校验「可视化查询设计」配置，与 designer API 互操作，为审批发布流水线奠基
- **类型**：创造（M13 治理 kickoff，符合 goal G5）
- **验收标准**（来源 hub F10-GOV · GOV-004 + r33 DESIGN 基线）：
  - 可视化查询设计模型 + validate/save API L1（引用 config_store/designer 不破坏 r33 回归）
  - pytest：合法/非法设计配置、未知字段、版本冲突结构化 4xx
  - 不含完整 BPM 审批 UI

### 子项 3：CONN-009 StarRocks 连接器

- **选题理由**：hub **11.1**；**完整度 5%**；OLAP 分析库扩展，M11 连接器簇；与 TiDB/ES 同轮批处理 registry 模式
- **选题时 PRD 加权总分**：11.1/100（用户价值 **46%** · 完整度 **5%** · 可靠性 **0%** · 架构 **10%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **8%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥55%）；可靠性（0%→≥40% 连接超时与错误映射）
- **用户感知**：可登记 StarRocks 数据源并执行连通性测试与 schema 浏览，支撑 OLAP 分析场景
- **类型**：创造
- **验收标准**（来源 hub F04-CONN · CONN-009）：
  - StarRocks dialect（MySQL 协议变体或专用驱动 L1）+ registry 登记
  - pytest：test/metadata smoke、结构化错误码
  - 与 CONN-001 MySQL 方言边界文档化（不复用冲突配置）

### 子项 4：CONN-015 Elasticsearch 连接器

- **选题理由**：hub **11.2**；**完整度 5%**；搜索/文档类数据源，闭合 G2「搜索」类别；本轮 CONN 三角（TiDB/StarRocks/ES）覆盖 HTAP+OLAP+搜索
- **选题时 PRD 加权总分**：11.2/100（用户价值 **47%** · 完整度 **5%** · 可靠性 **0%** · 架构 **9%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **8%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥55%）；架构健康（9%→≥40% 非 SQL 连接器适配器接口）
- **用户感知**：可登记 Elasticsearch 集群、测试连通并浏览 index/mapping 元数据（L1 子集）
- **类型**：创造
- **验收标准**（来源 hub F04-CONN · CONN-015）：
  - ES connector L1：连接配置、ping/test、index 列表或 mapping 摘要 API
  - pytest：mock ES 或 testcontainer smoke、非法 host 4xx
  - 不含完整 DSL 查询执行（留 M4 扩展）

### 子项 5：GOV-008 治理权限联动 FR-1.6

- **选题理由**：hub **11.2**；**完整度 5%**；与 GOV-004 同域治理 kickoff，衔接 AUTH/RLS 与可视化查询设计权限链；hub Top5 末位
- **选题时 PRD 加权总分**：11.2/100（用户价值 **48%** · 完整度 **5%** · 可靠性 **0%** · 架构 **8%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **8%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥55% 权限联动模型 L1）；安全性（8%→≥40% 与 RLS/admin bypass 链一致）
- **用户感知**：治理配置变更（如查询设计发布）触发权限联动校验，越权操作被结构化阻断
- **类型**：创造（M13 治理 companion，符合 goal G4/G5）
- **验收标准**（来源 hub F10-GOV · GOV-008 + AUTH/RLS 基线）：
  - 权限联动钩子：设计/发布状态变更时校验角色与 RLS 链 L1
  - pytest：admin/普通用户/越权 403 smoke；与 GOV-004 联合 save 回归
  - 不含完整多维 RLS 编辑器（M7 远期）
