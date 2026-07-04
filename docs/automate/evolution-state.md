# Evolution State

> 自我演化单一状态账本。Automations 可读写；人工可审计。不要另建并行运行态文件。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | P5_DOCS_READY |
| round_target | docs/superpowers/evolution/2026-07-04-round-target-r46.md |
| design | docs/superpowers/specs/2026-07-04-nfr-gov-gbase-l1-r46-design.md |
| plan | docs/superpowers/plans/2026-07-04-nfr-gov-gbase-l1-r46.md |
| branch | feat/evolution-r46-nfr-gov-gbase-l1 |
| base_branch | dev-auto |
| prd_ids | NFR-005,NFR-006,NFR-007,GOV-005,CONN-019 |
| pr_number |  |
| last_verified_command | cd backend && python3 -m ruff check . && python3 -m pytest -q |
| last_verified_exit_code | 0 |
| deployed_automate_rev | bf60b94ec4f4 |
| skill_rule_index_generated_at | 2026-07-04T11:35:00Z |
| skill_rule_index_source_count | 26 |

## 待办池

<!-- bounded-explorer 追加未消化候选；P5/G0 合并后勾选已完成项。 -->

## 模块地图

<!-- prd-bootstrap / bounded-explorer 维护：模块路径、职责、一行风险或机会。 -->

## 项目技能规则索引

> P2/P3 按需刷新；仅保存路径、frontmatter 摘要、globs，不保存全文。
> 当 `.agents/skills`、`.cursor/skills`、`.cursor/rules` 文件数量变化，或 plan 触及未覆盖路径时，视为过期并刷新。

| 类型 | 路径 | globs | 摘要 | 更新时间 |
|------|------|-------|------|----------|
| skill | `.agents/skills/fastapi/SKILL.md` | — | FastAPI best practices, Pydantic, DI, SSE | 2026-07-03 |
| skill | `.agents/skills/verification-before-completion/SKILL.md` | — | Evidence before completion claims | 2026-07-03 |
| skill | `.agents/skills/subagent-driven-development/SKILL.md` | — | Fresh subagent per task + review | 2026-07-03 |
| skill | `.agents/skills/bug-case-library/SKILL.md` | — | Bug case retrieval before fixes | 2026-07-03 |
| skill | `.agents/skills/test-driven-development/SKILL.md` | — | TDD before implementation | 2026-07-03 |
| skill | `.agents/skills/systematic-debugging/SKILL.md` | — | Debug before proposing fixes | 2026-07-03 |
| skill | `.agents/skills/writing-plans/SKILL.md` | — | Multi-step plan before code | 2026-07-03 |
| skill | `.agents/skills/executing-plans/SKILL.md` | — | Execute plan with checkpoints | 2026-07-03 |
| skill | `.agents/skills/using-git-worktrees/SKILL.md` | — | Isolated worktree for feature work | 2026-07-03 |
| skill | `.agents/skills/requesting-code-review/SKILL.md` | — | Code review before merge | 2026-07-03 |
| skill | `.agents/skills/receiving-code-review/SKILL.md` | — | Rigorous review response | 2026-07-03 |
| skill | `.agents/skills/finishing-a-development-branch/SKILL.md` | — | Branch completion options | 2026-07-03 |
| skill | `.agents/skills/dispatching-parallel-agents/SKILL.md` | — | Parallel independent tasks | 2026-07-03 |
| skill | `.agents/skills/using-superpowers/SKILL.md` | — | Skill discovery at conversation start | 2026-07-03 |
| skill | `.agents/skills/brainstorming/SKILL.md` | — | Creative work prerequisite | 2026-07-03 |
| skill | `.agents/skills/b-design-system-tailadmin-radix/SKILL.md` | — | TailAdmin + shadcn UI system | 2026-07-03 |
| skill | `.agents/skills/create-evolution-goal/SKILL.md` | — | Manual goal.md authoring | 2026-07-03 |
| skill | `.agents/skills/create-evolution-plan/SKILL.md` | — | Manual plan.md authoring | 2026-07-03 |
| skill | `.agents/skills/create-evolution-prd/SKILL.md` | — | Manual PRD authoring | 2026-07-03 |
| skill | `.agents/skills/writing-skills/SKILL.md` | — | Create/edit agent skills | 2026-07-03 |
| rule | `.cursor/rules/vitalspan-project.mdc` | alwaysApply | Project identity, doc layers, paths | 2026-07-03 |
| rule | `.cursor/rules/common.mdc` | alwaysApply | Layering, size limits, shared code | 2026-07-03 |
| rule | `.cursor/rules/prd-sync.mdc` | alwaysApply | Doc sync after code changes | 2026-07-03 |
| rule | `.cursor/rules/backend-fastapi.mdc` | `backend/**/*.py`, `tests/**/*.py` | FastAPI layout, API, security | 2026-07-03 |
| rule | `.cursor/rules/fe-ui.mdc` | `fe/**` | Frontend fe/ design system | 2026-07-03 |
| rule | `.cursor/rules/docs-layer.mdc` | `docs/**` | Document editing boundaries | 2026-07-03 |

## 上次扫描摘要

<!-- bounded-explorer 写 3-5 条，禁止贴源码。 -->

- P5 r46 PRD 重评：NFR-005/006/007 + GOV-005 + CONN-019 L1 kickoff；pytest 1170/4 skipped；test_nfr_gov_conn_r46 36/36 + r45 30/30 + r41 36/36；总分 11.4–11.6→79.2–84.1（五 ID <90 STUCK upsert round 1）；phase P4_DONE→P5_DOCS_READY
- P3 r46 实现完成：8 Task 全绿；NFR 横切 + GOV-005 发布状态机 + CONN-019 GBase L1 — NFR-005/006/007 + GOV-005 + CONN-019；36 测 test_nfr_gov_conn_r46 + r45 30/30 + r41 36/36 + datasources_l1 回归；pytest 1170/4 skipped；ruff clean；ui_design_skill none；branch feat/evolution-r46-nfr-gov-gbase-l1；base_branch dev-auto；phase P2_DONE→P3_DONE
- P2 r46 计划完成：8 Task（nfr scaffold→NFR-005 plugin→CONN-019 gbase→NFR-007 xinchuang→NFR-006 push→NFR API→GOV-005 publish FSM→联动+回归+docs）；18 P3 文件 ≤20；subagent-driven-development option 1；全 Task UI skill none；≥37 新测 test_nfr_gov_conn_r46（门槛 ≥32）+ r45 30/30 + r41 36/36 + datasources_l1 回归；plan=docs/superpowers/plans/2026-07-04-nfr-gov-gbase-l1-r46.md；phase P1_DONE→P2_DONE
- P1 r46 设计完成：NFR 横切 + GOV-005 发布状态机 + CONN-019 GBase L1 kickoff — NFR-006/007/005 + GOV-005 + CONN-019；18 文件框定（core/nfr 5 + governance/publish 4 + gbase 4 + api 3 + r46 smoke ≥32 测）；插件扩展/registry 零侵入 + 推送降级 + 信创清单 + publish FSM + GBase MySQL 委托；ui_design_skill none（纯后端）；phase G2_DONE→P1_DONE
- G2 r46 选题完成：NFR 非功能横切 + GOV-005 查询服务发布 + CONN-019 GBase L1 kickoff — NFR-006/007/005 + GOV-005 + CONN-019（5 项）；最低分 NFR-006/007(11.4)；饱和熔断未触发（Top5 11.4–11.6≪90）；plan M1/M1B 无活跃勾选行（已知 concern，回落纯 8 维选题）；STUCK 表空（5 项首次入选）；phase idle→G2_DONE
- G1 r46 bootstrap：r45 PR #72 已 Squash merge dev-auto（65548c7）；G0 PASS 工作区干净；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（活跃节标注 M1 与演化进度漂移，已知 concern）；deployed_automate_rev bf60b94ec4f4；薄弱项 Top3 NFR-006(11.4)/NFR-007(11.4)/GOV-005(11.5)；STUCK 表空（r45 P5 五 ID 破 90 清零）；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r45 PRD 重评：API-003/004/005/006/007 companion 质量推分；pytest 1134/4 skipped；test_integration_api_l1_r45 30/30 + r44 38/38 + r31 24/24；总分 86.5–87.4→90.2–90.8（五 ID 破 90 STUCK 清零）；phase P4_DONE→P5_DOCS_READY；PR #72
- G1 r45 bootstrap：r44 PR #70 已合并 dev-auto（9f00e8e）；G0 PASS 工作区干净；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（活跃节标注 M1 与演化进度漂移，已知 concern）；deployed_automate_rev bf60b94ec4f4；薄弱项 Top3 NFR-006(11.4)/NFR-007(11.4)/GOV-005(11.5)；STUCK 五 ID 各 1 轮（API-003/004/005/006/007，未达 ≥3 硬标注阈值）；phase P5_DOCS_READY→idle；待 G2 选题
- P3 r45 实现完成：8 Task 全绿；M8/M12/M13 集成 API companion — API-003/004/005/006/007；报表同步生成+download、publish→bus、参数幂等、embed 生命周期、OpenAPI v2 文档面；30 测 test_integration_api_l1_r45 + r44 38/38 + r31 24/24 回归；pytest 1134/4 skipped；ruff clean；ui_design_skill none；branch feat/evolution-r45-m8-m12-m13-integration-api-companion；base_branch dev-auto；phase P2_DONE→P3_DONE
- P2 r45 计划完成：8 Task（fixture→API-005 export→API-003 publish/params/idempotency→API-004 bus on publish→API-006 embed lifecycle→API-007 openapi v2→回归门控→docs）；17 文件 ≤20；subagent-driven-development option 1；全 Task UI skill none；≥22 新测 test_integration_api_l1_r45 + r44 38 + r31 24 回归；pytest 目标 ≥1126；plan=docs/superpowers/plans/2026-07-04-m8-m12-m13-integration-api-companion-r45.md；phase P1_DONE→P2_DONE
- P1 r45 设计完成：M8/M12/M13 集成 API companion 质量推分 — API-003/004/005/006/007；17 文件框定（integration 5 + catalog publish_entry + api/v1 四路由簇 + openapi 2 + r45 smoke ≥22 测 + docs）；闭合报表生成/download、publish→bus、参数幂等、embed 生命周期、OpenAPI v2 文档面；ui_design_skill none（纯后端）；phase G2_DONE→P1_DONE
- P5 r44 PRD 重评：API-003/004/005/006/007 L1 kickoff；pytest 1104/4 skipped；test_integration_api_l1_r44 38/38 + r31 24/24；总分 11.3–13.1→86.5–87.4（五 ID <90 STUCK round 1）；phase P4_DONE→P5_DOCS_READY
- P4 r44 验证通过：ruff clean；pytest 1104 passed/4 skipped（全量二次运行 exit_code 0；首轮 1 例环境级 flaky test_me_concurrent_requests_stable 隔离通过、与 r44 无关）；test_integration_api_l1_r44 38/38 + test_view_gov_api_r31 24/24 回归 62/62；UI: N/A（纯后端）；phase P3_DONE→P4_DONE
- P3 r44 实现完成：8 Task 全绿；M8/M12/M13 集成 API L1 — API-003/004/005/006/007；IF-01~04 四路由簇 + integration 域 + bus/adapter + openapi/version_policy；38 测 test_integration_api_l1_r44 + r31 24/24 回归；pytest 1104/4 skipped；ruff clean；ui_design_skill none；branch feat/evolution-r44-m8-m12-m13-integration-api-l1；base_branch dev-auto；phase P2_DONE→P3_DONE
- P2 r44 计划完成：8 Task（errors→API-003 services→API-004 bus adapter/retry→API-005 reports export→API-006 embed token→API-007 openapi version_policy→回归门控→docs）；18 文件 ≤20；subagent-driven-development option 1；全 Task UI skill none；≥38 新测 test_integration_api_l1_r44 + r31 24 回归；pytest 目标 ≥1096；plan=docs/superpowers/plans/2026-07-04-m8-m12-m13-integration-api-l1-r44.md；phase P1_DONE→P2_DONE
- P1 r44 设计完成：M8/M12/M13 集成 API L1 kickoff — API-003/004/005/006/007；18 文件框定（integration 域 6 + api/v1 四路由簇 + bus/adapter + openapi/version_policy + r44 smoke ≥28 测）；IF-01~04 与 GOV-002/VIZ-006 边界闭合；ui_design_skill none（纯后端）；phase G2_DONE→P1_DONE
- G2 r44 选题完成：M8/M12/M13 集成 API L1 kickoff — API-003/004/005/006/007（5 项，同 F13-API 域）；最低分 API-003(11.3) 全表最低；饱和熔断未触发（Top5 11.3–11.5«90）；plan M1/M1B 全勾选无活跃 `[ ]` 行（已知 concern，回落纯 8 维选题）；STUCK 表空（5 项首次入选）；phase idle→G2_DONE
- G1 r44 bootstrap：r43 PR #69 已合并 dev-auto；G0 PASS 工作区干净；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（活跃节标注 M1 与演化进度漂移，已知 concern）；deployed_automate_rev bf60b94ec4f4；薄弱项 Top3 API-003(11.3)/NFR-006(11.4)/NFR-007(11.4)；STUCK 表空（r43 P5 五 ID 破 90 清零）；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r43 PRD 重评：VIZ-003/004/005/006/008 companion 质量推分；pytest 1068/2 skipped；test_viz_advanced_l1_r43 28/28 + r42 35/35；vitest charts.advanced.smoke 22/22；总分 57.1–61.1→90.0–90.2（五 ID 破 90 STUCK 清零）；phase P4_DONE→P5_DOCS_READY
- P3 r43 实现完成：8 Task 全绿；VIZ-003/004/005/006/008 companion 质量推分 — fe 高级 ECharts（chartRegistry/renderFromSpec/AdvancedEchartsChart/ChartConfigPanel/ChartRenderer 集成）+ embed 表面 + is_origin_allowed；pytest r43 28/28 + r42 35/35；vitest charts 22/22（smoke 7 + advanced 15）；check:design exit 0；ui_design_skill b-design-system-tailadmin-radix；screenshots N/A（headless vitest，无浏览器 dev server）；branch feat/evolution-r43-m9-viz-companion-quality；base_branch dev-auto；phase P2_DONE→P3_DONE
- P2 r43 计划完成：8 Task（deps+registry→theme+geo→renderFromSpec→AdvancedEchartsChart→ChartConfigPanel→ChartRenderer→Embed+is_origin_allowed→tests+README）；19 文件 ≤20；subagent-driven-development option 1；UI skill b-design-system-tailadmin-radix（6 个 fe Task）；pytest r43 ≥28 + vitest advanced + r42/r28 回归门控；plan=docs/superpowers/plans/2026-07-04-m9-viz-companion-quality-r43.md；phase P1_DONE→P2_DONE
- P4 r42 验证通过：从 `backend/` 全量运行 `python3 -m pytest -q` → exit_code 0，1038 passed/4 skipped（未抽样，含 test_viz_advanced_l1_r42 35 断言 + r28/r30 pie→radar 回归）；ruff clean；UI: N/A（纯后端不触 fe/）；注：从 `/workspace` 顶层运行会有 1 例 cwd 依赖失败（test_ingestion_migration_0002 读相对路径 migrations/versions/），CI 规约（backend-fastapi.mdc）即从 `backend/` 执行，属既有测试写法非本轮回归；phase P3_DONE→P4_DONE
- P3 r42 实现完成：8 Task 全绿（双 review 通过）；VIZ-003/004/005/006/008 —— 新域 `app/viz/`（specs/registry/builtin 9 类型/render/embed）+ chart_view registry 驱动校验 + charts.py 3 新路由（GET /charts/types · POST /charts/render-spec · POST /charts/embed/validate）；35 测 test_viz_advanced_l1_r42（≥30 目标达标）+ r28/r30 `pie`→`radar` 回归修复；ruff clean；pytest 1038 passed/4 skipped（排除 2 个环境级 flaky 计时/并发测 test_pytest_subset_elapsed_under_budget、test_me_concurrent_requests_stable，二者隔离运行均通过、与 viz 无关）；触及 14 文件；UI: none（纯后端不触 fe/）；response_model=None 为 FastAPI union 返回必要微调；branch feat/evolution-r42-m9-viz-advanced-l1；base_branch dev-auto；phase P2_DONE→P3_DONE
- P2 r42 计划完成：8 Task（specs+registry→builtin 9 类型→GET /charts/types→chart_view registry 驱动校验 VIZ-004/005→render-spec VIZ-008→embed VIZ-006→pie→radar 回归门控→docs）；≥30 新测 test_viz_advanced_l1_r42（34 断言）；14 文件框定 ≤20；subagent-driven-development option 1；全 Task UI skill none（纯后端）；shared→domain 惰性 import 消循环；plan=docs/superpowers/plans/2026-07-04-m9-viz-advanced-charts-l1-r42.md；phase P1_DONE→P2_DONE
- P1 r42 设计完成：M9 可视化高级图表类型 L1 kickoff — VIZ-003/004/005/006/008（后端 chart-spec 契约先行）；14 文件框定（新域 `app/viz/` registry/specs/builtin/render/embed + chart_view 校验改 registry 驱动 + charts.py 3 新路由 + r42 smoke ≥30 测）；核心洞察 VIZ-003=ChartTypeRegistry（镜像 datasources/registry.py），9 类型骨架含桑基/关系/地图/漏斗/仪表/饼；PRD 分片语义漂移注记（PRD 字面为准，高级类型作注册表载体，VIZ-006=iframe 嵌入契约）；P4 blocker 预置修复 r28/r30 `pie`→`radar` 非法 type 样例（4 例）；ui_design_skill none（纯后端不触 fe/）；phase G2_DONE→P1_DONE
- G2 r42 选题完成：M9 可视化高级图表类型 L1 kickoff — VIZ-004/VIZ-008/VIZ-003/VIZ-005/VIZ-006（5 项，同 VIZ 域）；最低分 VIZ-004(11.3)，捕获全表两个绝对最低分 VIZ-004(11.3)/VIZ-008(11.4)；饱和熔断未触发（Top5 11.3–11.7«90）；plan M1/M1B 全勾选无活跃 `[ ]` 行（已知 concern，回落纯 8 维选题）；STUCK 表空（5 项首次入选）；phase idle→G2_DONE
- G1 r42 bootstrap：r41 PR #67 已合并 dev-auto；G0 PASS 工作区干净；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（活跃节标注 M1 与演化进度漂移，已知 concern）；deployed_automate_rev bf60b94ec4f4；薄弱项 Top3 VIZ-004(11.3)/VIZ-008(11.4)/CONN-016(11.6)；STUCK 表空（r41 P5 五 ID 破 90 清零）；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r41 PRD 重评：CONN-006/011/012/013/014 companion 质量推分；pytest 1003/4 skipped；test_connectors_gov_r41 36/36 + connector 回归 189/189；总分 86.1–88.8→90.0–91.2（五 ID 破 90 STUCK 清零）；phase P4_DONE→P5_DOCS_READY
- P4 r41 验证通过：ruff clean；pytest 1003 passed/4 skipped；test_connectors_gov_r41 36/36 + connector 回归 189/189（r40 43 + r39 33 + r37 40 + r36 37）；UI: N/A（纯后端）；phase P3_DONE→P4_DONE
- P3 r41 实现完成：8 Task 全绿；CONN-006/011/012/013/014 companion 质量推分；36 测 test_connectors_gov_r41 + r40 43/43 + r39 33/33 + r37 40/40 + r36 37/37；pytest 1003/4 skipped；branch cursor/bc-239ae5b7-e62d-4698-9d7c-67793ddde421-db0d；base_branch dev-auto；phase P2_DONE→P3_DONE
- P2 r41 计划完成：8 Task（errors→MongoDB→InfluxDB→TDengine→SQLite→TimescaleDB→回归门控→docs）；35 新测 test_connectors_gov_r41；9 P3 文件；subagent-driven-development option 1；全 Task UI skill none；phase P1_DONE→P2_DONE
- P1 r41 设计完成：M11 嵌入式/时序/文档连接器 companion 质量推分 — CONN-014/011/012/006/013；16 文件框定；五方言错误域/HTTP 链/schema-types 边界闭合；ui_design_skill none；phase G2_DONE→P1_DONE
- G2 r41 选题完成：M11 嵌入式/时序/文档连接器 companion 质量推分 — CONN-006/011/012/013/014（5 项）；最低分 CONN-014(86.1)；饱和熔断未触发；plan M1/M1B 无活跃勾选行（已知 concern）；STUCK 五 ID 各 1 轮（未达 ≥3 硬标注阈值）；phase idle→G2_DONE
- G1 r41 bootstrap：r40 PR #66 已 Squash merge dev-auto（ddfeb11）；G0 PASS 工作区干净；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（活跃节标注 M1 与演化进度漂移，已知 concern）；deployed_automate_rev bf60b94ec4f4；薄弱项 Top3 VIZ-004(11.3)/VIZ-008(11.4)/CONN-016(11.6)；STUCK 五 ID 各 1 轮（CONN-006/011/012/013/014）；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r40 PRD 重评：CONN-006/011/012/013/014 L1 kickoff；pytest 967/4 skipped；test_connectors_gov_r40 43/43 + r39 33/33 + r37 40/40 + r36 37/37 回归；总分 11.5–12.8→86.1–88.8（五 ID <90 STUCK round 1）；phase P4_DONE→P5_DOCS_READY
- P4 r40 验证通过：ruff clean；pytest 967 passed/4 skipped；test_connectors_gov_r40 43/43 + r39 33/33 + r37 40/40 + r36 37/37 + test_invalid_connector_type 回归 154/154；UI: N/A（纯后端）；phase P3_DONE→P4_DONE
- P3 r40 实现完成：8 Task 全绿；CONN-014/011/012/006/013 五方言 L1；43 测 test_connectors_gov_r40 + r39 33/33 + r37 40/40 + r36 37/37；test_invalid_connector_type 修复；pytest 967/4 skipped；branch cursor/bc-03449787-f1c8-4cd0-b5c3-3a2ddb487945-3ca8；base_branch dev-auto；phase P2_DONE→P3_DONE
- P2 r40 计划完成：8 Task（errors+scaffold→MongoDB→InfluxDB→TDengine→SQLite→TimescaleDB→registry→回归+docs）；≥37 新测 test_connectors_gov_r40；11 P3 文件；subagent-driven-development option 1；全 Task UI skill none；phase P1_DONE→P2_DONE
- P1 r40 设计完成：M11 嵌入式/时序/文档连接器 L1 kickoff — CONN-014/011/012/006/013；17 文件框定；五方言 mock smoke + test_invalid_connector_type 修复（P4 blocker）；ui_design_skill none；phase G2_DONE→P1_DONE
- G2 r40 选题完成：M11 嵌入式/时序/文档连接器 L1 kickoff — CONN-006/011/012/013/014（5 项）；最低分 CONN-014(11.5)；饱和熔断未触发；plan M1/M1B 无活跃勾选行（已知 concern）；STUCK 表空；phase idle→G2_DONE
- G1 r40 bootstrap：r39 PR #65 已 Squash merge dev-auto（c09246a）；G0 PASS 工作区干净；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（活跃节标注 M1 与演化进度漂移，已知 concern）；deployed_automate_rev bf60b94ec4f4；薄弱项 Top3 VIZ-003(11.7)/QUERY-009(11.7)/CONN-006(12.6)；STUCK 表空（r39 P5 五 ID 破 90 清零）；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r39 PRD 重评：QUERY-008/CONN-022/META-003/CONN-017/CONN-010 companion 质量推分；pytest 924/4 skipped；test_query_meta_conn_r39 33/33 + r38 36/36 + r37 40/40 回归 109/109；总分 87.1–89.6→90.1–90.4（五 ID 破 90 STUCK 清零）；phase P4_DONE→P5_DOCS_READY
- P4 r39 验证通过：ruff clean；pytest 924 passed/4 skipped；test_query_meta_conn_r39 33/33 + r38 36/36 + r37 40/40 回归 109/109；UI: N/A（纯后端）；PR #65 已提前创建（SOP 顺序 concern）；phase P3_DONE→P4_DONE
- P3 r39 实现完成：8 Task 全绿；CONN-010/022/017 + META-003 values 校验 + QUERY-008 translator 守卫；33 测 test_query_meta_conn_r39 + r38 36/36 + r37 40/40；pytest 924/4 skipped；branch cursor/bc-fda56918-b209-4fa3-b5bc-f75bf68e9cfe-8879；base_branch dev-auto；phase P2_DONE→P3_DONE
- P2 r39 计划完成：8 Task（errors 脚手架→Trino→GaussDB→DM→dimensions values→translator 守卫→回归门控→docs）；≥31 新测 test_query_meta_conn_r39；11 P3 文件；subagent-driven-development option 1；全 Task UI skill none；phase P1_DONE→P2_DONE
- P1 r39 设计完成：M12 Query 翻译器 + M11 信创/专项连接器 + META 维度 companion 质量推分 — QUERY-008/CONN-022/META-003/CONN-017/CONN-010；18 文件框定；三连接器 HTTP 链 + values 校验 + translator 算子守卫；ui_design_skill none；phase G2_DONE→P1_DONE
- G2 r39 选题完成：M12 Query 翻译器 + M11 信创/专项连接器 + META 维度 companion 质量推分 — QUERY-008/CONN-022/META-003/CONN-017/CONN-010（5 项）；最低分 CONN-010(87.1)；饱和熔断未触发；plan M11/M12/M13 无活跃勾选行（已知 concern）；STUCK 五 ID 各 1 轮（未达 ≥3 硬标注阈值）；phase idle→G2_DONE
- G1 r39 bootstrap：r38 PR #64 已 Squash merge dev-auto（fee8a9c）；G0 PASS 工作区干净；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（活跃节标注 M1 与演化进度漂移，已知 concern）；deployed_automate_rev bf60b94ec4f4；薄弱项 Top3 VIZ-003(11.7)/QUERY-009(11.7)/CONN-006(12.6)；STUCK 五 ID 各 1 轮；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r38 PRD 重评：QUERY-008/CONN-022/META-003/CONN-017/CONN-010 L1 kickoff；pytest 891/4 skipped；test_query_meta_conn_r38 36/36 + test_connectors_gov_r37 40/40 回归 76/76；总分 11.3–11.6→87.1–89.6（五 ID <90 STUCK round 1）；phase P4_DONE→P5_DOCS_READY
- P3 r38 实现完成：8 Task 全绿；QUERY-008 translate API + GaussDB/DM/Trino 三方言 + META-003 dimensions；36 测 test_query_meta_conn_r38 + r37 40/40；pytest 891/4 skipped；branch feat/r38-query-meta-conn-l1；base_branch dev-auto；phase P2_DONE→P3_DONE
- P5 r37 PRD 重评：CONN-003/007/005/008/004 companion 质量推分；pytest 854/4 skipped；test_connectors_gov_r37 40/40 + r36 37/37 + r35 35/35 + r34 15/15 回归 127/127；总分 86.2–87.8→90.0–91.2（五 ID 破 90 STUCK 清零）；phase P4_DONE→P5_DOCS_READY
- P3 r37 实现完成：8 Task 全绿；CONN-004/008/005/003/007 companion 质量推分；40 新测 test_connectors_gov_r37；connector 回归 127/127；pytest 853/4 skipped；branch cursor/bc-031e3641-9a45-48b5-b7f1-1fea5c376dab-817d；base_branch dev-auto；phase P2_DONE→P3_DONE
- P2 r37 计划完成：8 Task（errors 上浮→Oracle→Doris→SQL Server→Hive→ClickHouse→registry 回归→docs）；≥33 新测 test_connectors_gov_r37；9 P3 文件；subagent-driven-development option 1；全 Task UI skill none；phase P1_DONE→P2_DONE
- P1 r37 设计完成：M11 关系型/OLAP 连接器 companion 质量推分 — CONN-004/008/005/003/007；16 文件框定；五方言错误域/limit/HTTP 链闭合；ui_design_skill none；phase G2_DONE→P1_DONE
- G2 r37 选题完成：M11 关系型/OLAP 连接器 companion 质量推分 — CONN-004/008/005/003/007（5 项）；最低分 CONN-004(86.2)；饱和熔断未触发；plan M11/M12/M13 无活跃勾选行（已知 concern）；STUCK 五 ID 各 1 轮（未达 ≥3 硬标注阈值）；phase idle→G2_DONE
- G1 r37 bootstrap：r36 PR #61 已 Squash merge dev-auto（059d222）；G0 PR #62 已合并（8354ba6）；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（活跃节标注 M1 与演化进度漂移，已知 concern）；deployed_automate_rev bf60b94ec4f4；薄弱项 Top3 QUERY-008(11.3)/CONN-022(11.3)/META-003(11.6)；STUCK 五 ID 各 1 轮；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r36 PRD 重评：CONN-003/007/005/008/004 L1 kickoff；pytest 814/4 skipped；test_connectors_gov_r36 37/37 + r35 35/35 + r34 15/15 回归 87/87；总分 11.8–12.3→86.2–87.8（五 ID <90 STUCK round 1）；phase P4_DONE→P5_DOCS_READY
- P3 r36 实现完成：8 Task 全绿；CONN-003/007/005/008/004 五方言 L1；37 新测 test_connectors_gov_r36；pytest 814/4 skipped；r35 35/35 + r34 15/15 回归；branch cursor/bc-4f2610de-f832-4ff1-8eff-1773a9d832a3-b1db；base_branch dev-auto；phase P2_DONE→P3_DONE
- P2 r36 计划完成：8 Task（infra→Hive→ClickHouse→SQL Server→Doris→Oracle→registry HTTP→docs+回归）；≥32 新测 test_connectors_gov_r36；11 P3 文件；subagent-driven-development option 1；全 Task UI skill none；phase P1_DONE→P2_DONE
- P1 r36 设计完成：M11 关系型/OLAP 连接器 L1 kickoff — CONN-003/007/005/008/004；16 文件框定；五方言 hive/clickhouse/sqlserver/doris/oracle；PRD 分片 ID 漂移注记；ui_design_skill none；phase G2_DONE→P1_DONE
- G2 r36 选题完成：M11 关系型/OLAP 连接器 L1 kickoff — CONN-003/007/005/008/004（5 项）；最低分 CONN-004(11.8)；饱和熔断未触发；plan M11/M12/M13 无活跃勾选行（已知 concern）；STUCK 表空；phase idle→G2_DONE
- G1 r36 bootstrap：r35 PR #60 已合并 dev-auto；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（活跃节标注 M1 与演化进度漂移，已知 concern）；deployed_automate_rev bf60b94ec4f4；薄弱项 Top3 CONN-003(12.3)/CONN-007(12.2)/CONN-005(12.2)；STUCK 表空；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r35 PRD 重评：CONN-021/009/015 + GOV-004/008 companion 质量推分；pytest 777/4 skipped；test_connectors_gov_r35 35/35 + r34 15/15 + r33 19/19；总分 86.0–88.1→90.1–91.0（五 ID 破 90 STUCK 清零）；phase P4_DONE→P5_DOCS_READY
- P4 r35 验证通过：ruff clean；pytest 777 passed/4 skipped；r35 35/35 + r34 15/15 + r33 19/19 回归 69/69；UI: N/A（纯后端）；phase P3_DONE→P4_DONE
- P3 r35 实现完成：7 Task 全绿；CONN-021/009/015 + GOV-004/008 companion 质量推分；35 新测 test_connectors_gov_r35；pytest 777/4 skipped；r34 15/15 + r33 19/19 回归；branch cursor/bc-8c18737e-0c44-4d37-a690-cf6681f61819-520c；base_branch dev-auto；phase P2_DONE→P3_DONE
- G2 r35 选题完成：M11 连接器 + M13 治理 companion 质量推分 — CONN-021/009/015 + GOV-004/008（5 项）；最低分 CONN-021(86.0)；STUCK 五 ID 各 1 轮（未达 ≥3 硬标注阈值）；饱和熔断未触发；plan M11/M12/M13 无活跃勾选行（已知 concern）；phase idle→G2_DONE
- P1 r35 设计完成：CONN-021/009/015 + GOV-004/008 companion 质量推分；17 文件框定；preview-execute ACL/RLS；TIDB_/STARROCKS_/ES 边界；ui_design_skill none；phase G2_DONE→P1_DONE
- G1 r35 bootstrap：r34 PR #58 已合并 dev-auto；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（活跃节标注 M1 与演化进度漂移，已知 concern）；deployed_automate_rev bf60b94ec4f4；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r34 PRD 重评：CONN-021/009/015 + GOV-004/008 L1 kickoff；pytest 742/4 skipped；test_connectors_gov_r34 15/15 + r33 19/19；总分 10.9–11.2→86.0–88.1（五 ID <90 STUCK round 1）；phase P4_DONE→P5_DOCS_READY
- P4 r34 验证通过：ruff clean；pytest 742 passed/4 skipped；test_connectors_gov_r34 15/15 + test_meta_design_r33 19/19 回归；UI: N/A（纯后端）；phase P3_DONE→P4_DONE
- P5 r33 PRD 重评：META-001/002 + QUERY-007 + DESIGN-001/002 companion 质量推分；pytest 727/4 skipped；test_meta_design_r33 19/19 + r32 21/21；总分 86.4–89.8→90.0–91.7（五 ID 破 90 STUCK 清零）；phase P4_DONE→P5_DOCS_READY
- P4 r33 验证通过：ruff clean；pytest 727 passed/4 skipped；test_meta_design_r33 19/19 + test_meta_design_r32 21/21 回归；UI: N/A（纯后端）；phase P3_DONE→P4_DONE
- P3 r33 实现完成：7 Task 全绿；META-001/002 + QUERY-007 + DESIGN-001/002 质量推分；19 新测 test_meta_design_r33；pytest 727/4 skipped；r32 21/21 回归；branch feat/evolution-r33-m11-meta-m12-companion-quality；base_branch dev-auto；phase P2_DONE→P3_DONE
- G1 r33 bootstrap：r32 PR #55 已合并 dev-auto（ff3de75）；goal/prd hub+分片就绪（16 域 · 124 项）；plan 只读 M1/M1B 全勾选无 `[ ]`（M11/M12 无活跃节，已知 concern）；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r32 PRD 重评：META-001/002 + QUERY-007 + DESIGN-001/002 L1 kickoff；pytest 708/4 skipped；test_meta_design_r32 21/21；总分 10.8–11.2→86.4–89.8（五 ID <90 STUCK round 1）；phase P4_DONE→P5_DOCS_READY
- P4 r32 验证通过：ruff clean；pytest 708 passed/4 skipped；test_meta_design_r32 21/21；test_view_gov_api_r31 24/24 回归；UI: N/A（纯后端）；phase P3_DONE→P4_DONE
- P3 r32 实现完成：7 Task 全绿；META-001/002 + QUERY-007 + DESIGN-001/002 L1；migration 0015；21 新测 test_meta_design_r32；pytest 707/4 skipped；r31 回归 24/24；branch feat/evolution-r32-m11-meta-m12-design-l1；base_branch dev-auto；phase P2_DONE→P3_DONE
- P5 r31 PRD 重评：VIEW-001/GOV-002 破 90（90.2/90.4）STUCK 清零；GOV-001/API-001/002 巩固 90.0–90.2；pytest 686/4 skipped；test_view_gov_api_r31 24/24；phase P4_DONE→P5_DOCS_READY
- P4 r31 验证通过：ruff clean；pytest 686 passed/4 skipped；test_view_gov_api_r31 24/24；test_view_gov_api_r30 30/30 回归；UI: N/A（纯后端）；phase P3_DONE→P4_DONE
- P3 r31 实现完成：7 Task 全绿；VIEW bounds/cycle、GOV bus/catalog、IF-06 OpenAPI；24 新测；pytest 686/4 skipped；branch feat/evolution-r31-m5-view-m6-companion-quality；base_branch dev-auto
- P2 r31 计划完成：7 Task（VIEW bounds/cycle→GOV bus 失败/幂等/鉴权→catalog DELETE→IF-06 OpenAPI×2→集成回归→文档）；≥18 新测；15+3 docs 文件；subagent-driven-development option 1；全 Task UI skill none；phase P1_DONE→P2_DONE
- P1 r31 设计完成：VIEW validate 边界 + GOV bus 失败/幂等/鉴权 + catalog DELETE + IF-06 OpenAPI 补全；18 文件框定；ui_design_skill none；phase G2_DONE→P1_DONE
- G2 r31 选题完成：M5 VIEW-001 + M6 companion 质量推分 — VIEW-001/GOV-002/GOV-001/API-001/API-002（5 项）；最低分 GOV-002(88.7)；STUCK VIEW-001/GOV-002 各 1 轮；饱和熔断未触发；phase idle→G2_DONE
- G1 r31 bootstrap：r30 PR #53 已合并 dev-auto；phase P5_DOCS_READY→idle；待 G2 选题
- P5 r30 PRD 重评：VIEW-001/GOV-001/002/API-001/002 L1 kickoff；pytest 662/4 skipped；test_view_gov_api_r30 30/30；总分 12.9–13.7→88.6–90.9（VIEW-001/GOV-002 <90 STUCK upsert）
- P4 r30 验证通过：pytest 662 passed/4 skipped；test_view_gov_api_r30 30/30；ruff clean
- P3 r30 实现完成：7 Task 全绿；views/governance/openapi L1；migration 0014；branch feat/evolution-r30-m5-view-m6-companion；base_branch dev-auto

## 选题卡住计数（连续未过 90 的功能项）

| prd ID | 连续未过轮次 | 最近加权总分 | 最近评分日期 |
|--------|:-----------:|:-----------:|------------|
| NFR-006 | 1 | 79.2 | 2026-07-04 |
| NFR-007 | 1 | 80.0 | 2026-07-04 |
| NFR-005 | 1 | 81.2 | 2026-07-04 |
| GOV-005 | 1 | 82.6 | 2026-07-04 |
| CONN-019 | 1 | 84.1 | 2026-07-04 |