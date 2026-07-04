# 演化轮次选题 — 2026-07-04（跨域 STUCK 簇收尾 companion 质量推分 r68）

## 本轮演化目标（共 5 项）

### 选题决策

- **批量主题**：**跨域 STUCK 簇收尾 companion 质量推分**（r67 已将 DASH-004/NFR-001/NFR-002/CONN-018/RPT-003 推至 **90.0–90.2** 并 STUCK 清零；hub 薄弱项汇总仅剩 **NFR-003/NFR-004/GOV-007** 三 ID **<90**（84.2–84.4），共享 **性能 58%** + **完整度 76%**；本轮聚焦 perf probe ≤50ms + ACL/validate/NOT_FOUND 边界闭合，目标加权总分 **≥90** 破 STUCK；辅以 RPT-002/VIEW-002 边界 **90.0–90.1** companion 巩固）
- **来源**：`docs/automate/plan.md` §M1 + §M1B 勾选 **12/12 已完成**，无含 `[ ]` 的活跃节（已知 concern，回落纯 8 维选题）；`prd.md` hub 薄弱项 Top3 — **NFR-003 84.2**、**NFR-004 84.2**、**GOV-007 84.4**（r67 明确留 r68+）；`evolution-state.md` **选题卡住计数：三 ID 各连续 1 轮**（NFR-003/NFR-004 84.2、GOV-007 84.4，未达 ≥3 硬标注阈值）；待办池空；`git log -5` G1 r68 bootstrap（sha 349a6ae）+ r67 已 Squash merge #102（sha 926c21b）
- **合并理由**：饱和熔断未触发（plan 无未完成 `[ ]` 故执行熔断检查；hub Top5 前三 84.2–84.4 均 <90、#4/#5 为 90.0，非评分饱和；待办池无未消化项）；对齐 r67 companion 质量推分节奏（r67 将 NFR-003/NFR-004/GOV-007 留 r68+）；五 ID 跨 NFR/GOV/RPT/VIEW 四域、三核心 STUCK 同属 r60–r64 L1/stub 交付簇且共享 **性能 58%** 与 **完整度 76%** 薄弱维，RPT-002（r62 prefab 簇）与 VIEW-002（r60 role-default-views 簇）为边界 90.0 companion 巩固；符合 `goal.md` **G5 治理**（GOV-007/NFR 横切）、**G3 BI 展现**（RPT-002/VIEW-002）
- **范围框定**：
  - **模块**（≤3 后端域 + 薄 entry，合计 ≤20 文件）：`backend/app/core/nfr/` 或同级横切模块（NFR-003 dashboard_sla、NFR-004 https-audit mask-probe companion：ACL/边界/probe）+ `backend/app/governance/` 或 bus 子模块（GOV-007 gov bus auto-register FSM companion：ACL/validate/probe）+ `backend/app/reports/` prefab 子模块（RPT-002 prefab binding ACL/validate/probe）+ `backend/app/views/` 或 role-default-views（VIEW-002 bounds/cycle companion：ACL/probe）+ `api/v1` 薄 entry + pytest（`test_nfr_gov_rpt_view_r68` 或同级）
  - **文件**（估 16–19，≤20）：四域 companion errors/validate/probe + 最小路由增量 + r68 新测 ≥32 断言 + r67 `test_dash_nfr_conn_rpt_r67` 34/34 + r66 `test_cat_dash_rpt_meta_r66` 33/33 + r65 `test_cat_rpt_meta_r65` 32/32 + r64 `test_nfr_cat_r64` 33/33 + r62 `test_cat_nfr_rpt_meta_r62` 32/32 + r60 `test_rpt_view_cat_gov_r60` 34/34 回归门控
  - **不含**：Admin 全量 fe 页面、真实 SLA metrics 生产采集、PDF 全链路渲染、M7 地域权限 fe、只读查询集成测、生产 TLS/真实审计 store；fe 首屏/IF-02 查询深化；CAT-001/CAT-002 等同分 90.0 用户价值维留后续 companion 轮
- **不足 5 项原因**：不适用 — 本轮满 5 项（hub 仅余 3 项 <90，辅以 2 项 r60/r62 L1 簇边界 90.0 companion 凑批）

### 候选对比

| 候选 prd ID | 加权总分 | 未选原因 |
|-------------|:--------:|----------|
| NFR-003 | 84.2 | **入选**（hub #1，性能 58%，r62 dashboard_sla L1 簇） |
| NFR-004 | 84.2 | **入选**（hub #2，性能 58%，r64 https-audit mask-probe stub 簇） |
| GOV-007 | 84.4 | **入选**（hub #3，性能 58%，r60 gov bus auto-register L1 簇） |
| CAT-001 | 90.0 | hub #4，已 ≥90，用户价值维薄弱，本轮聚焦 <90 STUCK 簇留后续 |
| CAT-002 | 90.0 | hub #5，已 ≥90，与 CAT-001 同质留后续 |
| RPT-002 | 90.0 | **入选**（r62 prefab 簇，与 NFR-003 同批 L1，边界 90.0 companion 巩固） |
| VIEW-002 | 90.1 | **入选**（r60 role-default-views 簇，与 GOV-007 同批 L1，边界 companion 巩固） |
| DASH-005 | 90.4 | hub #6，r66 已破 90，非本轮优先 |
| RPT-001 | 90.2 | hub #7，r66 已破 90，非本轮优先 |

### STUCK 标注

- 三核心入选 ID（NFR-003、NFR-004、GOV-007）均在选题卡住计数表 **连续 1 轮 <90**（84.2–84.4）— **未达 ≥3 轮硬标注阈值**，summary 不标 `STUCK:` 硬阻塞
- RPT-002/VIEW-002 本轮为边界 90.0 companion 巩固，无 STUCK 计数

## 演化北极星自检

1. **用户感知**：仪表板 SLA 探测更稳、HTTPS 审计 mask-probe 边界明确、治理总线自动注册 FSM 可回归、报表预制绑定与角色默认视图 ACL 闭合；各域 perf probe ≤50ms 可 smoke 验收。
2. **补缺 or 创造**：补缺（三核心 STUCK companion 质量推分 + 两边界 90.0 巩固，性能 58%→≥88%、完整度 76%→≥90%）；符合 `goal.md` G3/G5。
3. **不做代价**：hub 最后三 ID <90 持续无法破 90，系统接近评分饱和，后续需人工 `create-evolution-plan` 排新里程碑。
4. **能否批处理更小项**：已批处理为跨四域 companion（单轮 ≤20 文件、每项薄增量 perf/ACL/probe）。
5. **共几项/文件模块**：5 项；core/nfr + governance + reports/prefab + views + tests，估 ≤19 文件、4 薄域。

---

### 子项 1：NFR-003 非功能项

- **选题理由**：hub **#1（84.2）**；**性能 58%**、**完整度 76%** 为全表最低档之一；r62 已 L1 kickoff `dashboard_sla` probe/alerts，本轮 companion 深化 SLA 探测链、边界与 ACL
- **选题时 PRD 加权总分**：84.2/100（用户价值 **84%** · 完整度 **76%** · 可靠性 **94%** · 架构 **90%** · 测试覆盖 **96%** · 性能 **58%** · 安全性 **90%** · 交互 N/A）
- **主攻薄弱维**：性能（58%→≥88% dashboard_sla probe ≤50ms）；完整度（76%→≥90% SLA 指标契约与 alerts 边界闭合）
- **用户感知**：仪表板 SLA 探测 API 可回归，非法 dashboardId/threshold 被结构化拦截
- **类型**：补缺（NFR 横切 companion 质量推分，承接 r62 L1）
- **验收标准**（来源 hub · NFR-003 + r62 惯例）：
  - dashboard_sla ACL/probe/alerts 深化
  - 非法 SLA 参数 smoke pytest
  - 加权总分目标 **≥90**（破 STUCK）

### 子项 2：NFR-004 非功能项

- **选题理由**：hub **#2（84.2）**；**性能 58%**、**完整度 76%**；r64 已 stub L1 kickoff `https-audit` mask-probe，本轮 companion 深化审计 mask 探测、边界与降级
- **选题时 PRD 加权总分**：84.2/100（用户价值 **84%** · 完整度 **76%** · 可靠性 **94%** · 架构 **88%** · 测试覆盖 **98%** · 性能 **58%** · 安全性 **90%** · 交互 N/A）
- **主攻薄弱维**：性能（58%→≥88% https-audit mask-probe ≤50ms）；完整度（76%→≥90% mask 契约与参数校验闭合）
- **用户感知**：HTTPS 审计 mask-probe API 响应可探测，非法 audit scope 被拦截
- **类型**：补缺（NFR 横切 companion 质量推分，承接 r64 stub L1）
- **验收标准**（来源 hub · NFR-004 + r64 惯例）：
  - https-audit mask-probe ACL/validate 深化
  - 非法 mask 参数 smoke pytest
  - 加权总分目标 **≥90**

### 子项 3：GOV-007 治理项

- **选题理由**：hub **#3（84.4）**；**性能 58%**、**完整度 76%**；r60 已 L1 kickoff gov bus auto-register FSM，本轮 companion 深化总线自动注册状态机、ACL 与 perf probe
- **选题时 PRD 加权总分**：84.4/100（用户价值 **84%** · 完整度 **76%** · 可靠性 **94%** · 架构 **90%** · 测试覆盖 **98%** · 性能 **58%** · 安全性 **90%** · 交互 N/A）
- **主攻薄弱维**：性能（58%→≥88% bus auto-register probe ≤50ms）；完整度（76%→≥90% FSM 转移与注册边界闭合）
- **用户感知**：治理总线自动注册 API 越权被拦截，非法 FSM 转移返回可定位错误
- **类型**：补缺（GOV 域 companion 质量推分，承接 r60 L1）
- **验收标准**（来源 hub · GOV-007 + r60 治理域惯例）：
  - gov bus auto-register FSM ACL/probe 深化
  - 非法 FSM 转移 smoke pytest
  - 加权总分目标 **≥90**

### 子项 4：RPT-002 报表项

- **选题理由**：hub 边界 **90.0**；r62 与 NFR-003 同批 L1 kickoff `prefab` bindings，本轮 companion 巩固预制绑定 ACL、validate 与 perf probe，防止 STUCK 簇破 90 后 RPT 域回退
- **选题时 PRD 加权总分**：90.0/100（用户价值 **84%** · 完整度 **90%** · 可靠性 **94%** · 架构 **90%** · 测试覆盖 **96%** · 性能 **88%** · 安全性 **88%** · 交互 N/A）
- **主攻薄弱维**：用户价值（84%→≥88% prefab 绑定语义与错误域上浮）；性能（88%→≥90% prefab probe ≤50ms 巩固）
- **用户感知**：报表预制绑定 API 非法 binding 类型被结构化拦截，列表/读取 perf 可回归
- **类型**：补缺（RPT 域边界 companion 巩固，承接 r62 L1）
- **验收标准**（来源 hub · RPT-002 + r62 报表域惯例）：
  - prefab binding ACL/validate/probe 深化
  - 非法 binding smoke pytest
  - 加权总分目标 **≥90**（巩固）

### 子项 5：VIEW-002 视图项

- **选题理由**：hub 边界 **90.1**；r60 与 GOV-007 同批 L1 kickoff `role default-views` bounds，本轮 companion 巩固角色默认视图边界、cycle 检测与 perf probe
- **选题时 PRD 加权总分**：90.1/100（用户价值 **84%** · 完整度 **90%** · 可靠性 **94%** · 架构 **88%** · 测试覆盖 **98%** · 性能 **88%** · 安全性 **90%** · 交互 N/A）
- **主攻薄弱维**：用户价值（84%→≥88% 默认视图 bounds 语义闭合）；架构健康（88%→≥90% cycle 检测与依赖方向）
- **用户感知**：角色默认视图 API 越权与循环引用被拦截，bounds probe 可回归
- **类型**：补缺（VIEW 域边界 companion 巩固，承接 r60 L1）
- **验收标准**（来源 hub · VIEW-002 + r60 视图域惯例）：
  - role default-views bounds/cycle ACL/probe 深化
  - 非法 bounds/cycle smoke pytest
  - 加权总分目标 **≥90**（巩固）
