# 演化轮次选题 — 2026-07-04（M5 VIEW-001 L1 + M6 集成 companion kickoff r30）

## 本轮演化目标（共 5 项）

### 选题决策

- **批量主题**：M5 收官项 **VIEW-001 DashboardView 视图协议 L1 kickoff** + **M6 一期集成验收 companion**（r28/r29 已交付 VIZ-001/002 + DASH-001/002/003 并推分至 90.7–92.4；M5 归档仅剩 VIEW-001 未立项；同轮从 `plan.archive.md` §M6 选取 4 项 P1-SMOKE / 总线 PoC 前置 API 与 catalog 骨架，闭合「Dashboard 出数 → 视图协议 → 开放 API 登记」链路）
- **来源**：`docs/automate/plan.md` §M1 + §M1B 勾选 **12/12 已完成**，无含 `[ ]` 的活跃节；`plan.archive.md` §M5 六项中 VIEW-001 仍为未实现；`prd.md` hub 8 维 — **已实现簇** BOOT/AUTH/DS/QUERY/VIZ/DASH 均 ≥90.7，**最近期未实现簇** VIEW-001(13.7) + M6 GOV/API(12.9–13.5)；`evolution-state.md` 待办池空、STUCK 表空；`git log -5` r29 已合并（PR #52，M5 VIZ/DASH quality push）
- **合并理由**：饱和熔断未触发（plan 无未完成项故执行熔断检查；Top5 薄弱汇总 META-001~CONN-009 均为远期未实现 10.8–11.1，均 <90，非评分饱和；待办池无未消化项）；对齐 r25 M3 companion 节奏（主里程碑 L1+quality 后补归档剩余项 + 下一里程碑 kickoff）；VIEW-001 与已交付 DASH-001~003 同域依赖，GOV-001/002 + API-001/002 同属 M6 P1-SMOKE 集成面，可单轮批处理 L1；符合 `goal.md` **G3 BI 展现全链路** 与 **G5 查询服务治理与总线对接** PoC 方向
- **范围框定**：
  - **模块**（3）：`backend/app/` 视图协议域（VIEW-001，与 dashboards 衔接）、`backend/app/api/v1/`（开放 API 登记与 IF-06 对齐）、`backend/app/gov/` 或等价治理/catalog 子包（GOV-001/002 L1）
  - **文件**（合计约 16–20，≤20）：VIEW 协议 schema/validate、OpenAPI 扩展与版本策略钩子、catalog 三分法模型、总线 PoC 注册 stub、pytest smoke；**不修改** `goal.md` / `plan.md` 结构
  - **不含**：远期 META-001/DESIGN-001/CONN-021/QUERY-007（M8–M13）；M7 全量 OLAP 连接器；完整 BPM 工单流水线；VIEW-002/003（M10+ 角色/用户视图）；Admin 完整治理 UI（本期 API L1 + 文档登记）
- **不足 5 项原因**：不适用 — 本轮满 5 项（M5 VIEW-001 1 项 + M6 companion 4 项）

### 候选对比

| 候选 prd ID | 加权总分 | 未选原因 |
|-------------|:--------:|----------|
| META-001 | 10.8 | F11-META 术语字典，M8+ 远期，完整度 5% 因未实现 |
| DESIGN-001 | 10.8 | F12-DESIGN 拖拽查询，M13 治理设计器 |
| CONN-021 | 10.9 | TiDB 连接器，M13 信创扩展 |
| QUERY-007 | 10.9 | 配置元模型存储，M13 Dataset 语义层 |
| CONN-009 | 11.1 | StarRocks 连接器，M11 OLAP 扩展 |
| CAT-001 | 13.5 | M6 同类 CAT 项，本轮优先 GOV/API 骨架，留 r31 companion |
| NFR-004 | 13.5 | HTTPS/脱敏审计偏运维验收，依赖本轮 API 登记后再推 |
| VIZ-002 | 91.6 | r29 已 ≥90，非薄弱 |
| DASH-002 | 90.7 | r29 已破 90，非本轮主攻 |

### STUCK 标注

- 无 — `evolution-state.md` 选题卡住计数表为空（r29 VIZ-002/DASH-002/003 已破 90 清零）

---

### 子项 1：VIEW-001 DashboardView 视图协议 FR-VIEW-1

- **选题理由**：M5 归档**唯一未立项项**；hub 加权总分 **13.7**；**完整度 5%**、**可靠性 0%**、**测试覆盖 0%** 均未实现；r28/r29 已交付 Dashboard 数据模型与布局，缺 FR-VIEW-1 视图协议层（序列化、校验、与 DASH 互操作契约）
- **选题时 PRD 加权总分**：13.7/100（用户价值 **58%** · 完整度 **5%** · 可靠性 **0%** · 架构 **12%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **10%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥60% L1）；可靠性（0%→≥40% schema 校验与异常路径）
- **用户感知**：Dashboard 具备标准视图协议（创建/读取/校验），与图表组件绑定语义一致，为后续角色默认视图与用户覆盖奠基
- **类型**：创造（M5 收官立项，符合 goal G3）
- **验收标准**（来源 `plan.archive.md` §M5 · VIEW-001 + FR-VIEW-1）：
  - DashboardView 协议 schema（Pydantic）+ validate API 或等价服务入口
  - 与 DASH-001~003 已有模型互操作（layout/widgets 引用不破坏 r29 基线）
  - pytest：合法/非法视图配置、空 widget、未知 chart 引用结构化 4xx

### 子项 2：GOV-002 总线 PoC 半自动注册 FR-1.1

- **选题理由**：M6 **加权总分最低 12.9**；**完整度 5%**；`goal.md` **G5** 要求总线对接 PoC；在已有 query/dashboard API 上交付半自动注册 stub（元数据抽取 + 登记记录），不实现完整 BPM
- **选题时 PRD 加权总分**：12.9/100（用户价值 **57%** · 完整度 **5%** · 可靠性 **0%** · 架构 **9%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **8%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥55% PoC L1）；架构健康（9%→≥40% 可扩展注册适配器）
- **用户感知**：管理员可将已发布查询/视图类接口登记至总线 PoC 清单，获得登记状态与 traceId 可追踪回执
- **类型**：创造（M6 kickoff，符合 goal G5 PoC）
- **验收标准**（来源 `plan.archive.md` §M6 · GOV-002）：
  - 总线注册 PoC 模型 + `POST` 半自动注册 API（接受 catalog 条目引用）
  - 登记成功/失败结构化响应；pytest smoke（mock 总线端点或内存 stub）
  - 不含完整审批工单与全自动发布流水线

### 子项 3：GOV-001 查询接口分类 catalog 附录 E

- **选题理由**：加权总分 **13.2**；**完整度 5%**；GOV-002 前置 — 附录 E 三分法（CAT-01/02/03）catalog 元数据；与 API 登记共用分类枚举
- **选题时 PRD 加权总分**：13.2/100（用户价值 **56%** · 完整度 **5%** · 可靠性 **0%** · 架构 **8%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **13%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥55%）；架构健康（8%→≥40% catalog 模型与三分法枚举）
- **用户感知**：平台内查询类接口可按附录 E 分类浏览与检索，为总线注册与开放 API 文档提供统一 taxonomy
- **类型**：创造
- **验收标准**（来源 `plan.archive.md` §M6 · GOV-001 + CAT-01~03 引用）：
  - catalog 分类模型（entity/aggregate/geo 三分法 L1）+ CRUD 或 seed + list API
  - 接口条目可挂载 catalog 分类 code
  - pytest：分类枚举完整性、非法分类 4xx、条目挂载 smoke

### 子项 4：API-001 IF-06 数据源管理 API

- **选题理由**：加权总分 **13.1**；**完整度 5%**（hub 对开放 API 层评分，M3 内部 API 已 L1 但 IF-06 对外开放契约未对齐）；M6 P1-SMOKE 要求开放 API 登记与版本策略
- **选题时 PRD 加权总分**：13.1/100（用户价值 **55%** · 完整度 **5%** · 可靠性 **0%** · 架构 **13%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **8%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥55% OpenAPI 对齐）；测试覆盖（0%→≥50% 契约 smoke）
- **用户感知**：外部集成方可通过标准化 IF-06 数据源管理 OpenAPI 发现路径、参数与示例（与内部 M3 API 行为一致或显式映射）
- **类型**：补缺（内部已实现，开放契约与文档登记 L1）
- **验收标准**（来源 `plan.archive.md` §M6 · API-001）：
  - `docs/api/README.md` 登记 IF-06 数据源路由 + OpenAPI tag/示例
  - 对外路径或 alias 与鉴权策略明确（只读/管理分离 L1）
  - pytest：OpenAPI schema 含数据源 CRUD 路径；契约 smoke 全绿

### 子项 5：API-002 IF-06 查询执行 API

- **选题理由**：加权总分 **13.5**；**完整度 5%**；M4 QUERY-001/002 已 L1，缺 IF-06 查询执行对外开放面与 catalog 联动；闭合 P1-SMOKE「建源 → SQL 出数」开放 API 半环
- **选题时 PRD 加权总分**：13.5/100（用户价值 **56%** · 完整度 **5%** · 可靠性 **0%** · 架构 **14%** · 测试覆盖 **0%** · 性能 **0%** · 安全性 **9%** · 交互 N/A）
- **主攻薄弱维**：完整度（5%→≥55%）；可靠性（0%→≥40% 只读守卫与 RLS 链在开放 API 复用）
- **用户感知**：外部系统可经标准 API 提交只读 SQL/表查询并获结构化结果，错误码与内部 execute 一致
- **类型**：补缺
- **验收标准**（来源 `plan.archive.md` §M6 · API-002 + `goal.md` §5 P1-SMOKE）：
  - IF-06 查询执行 OpenAPI 登记（`POST /api/v1/query/execute` 或对外等价路径）
  - 只读守卫 + RLS 链复用 r27 基线不回归
  - pytest：execute 契约 smoke、越权 403、OpenAPI 文档参数与示例完整
