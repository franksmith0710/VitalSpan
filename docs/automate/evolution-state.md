# Evolution State

> 自我演化单一状态账本。Automations 可读写；人工可审计。不要另建并行运行态文件。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | P5_DOCS_READY |
| round_target | docs/superpowers/evolution/2026-07-04-round-target-r39.md |
| design | docs/superpowers/specs/2026-07-04-m12-query-m11-meta-conn-companion-quality-r39-design.md |
| plan | docs/superpowers/plans/2026-07-04-m12-query-m11-meta-conn-companion-quality-r39.md |
| branch | cursor/bc-fda56918-b209-4fa3-b5bc-f75bf68e9cfe-8879 |
| base_branch | dev-auto |
| prd_ids | QUERY-008,CONN-022,META-003,CONN-017,CONN-010 |
| pr_number | 65 |
| last_verified_command | cd backend && python3 -m ruff check . && python3 -m pytest -v |
| last_verified_exit_code | 0 |
| last_ui_verified_command | N/A（纯后端，ui_design_skill none） |
| deployed_automate_rev | bf60b94ec4f4 |
| skill_rule_index_generated_at | 2026-07-04T06:25:00Z |
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
| QUERY-008 | 1 | 89.6 | 2026-07-04 |
| CONN-022 | 1 | 87.6 | 2026-07-04 |
| META-003 | 1 | 87.4 | 2026-07-04 |
| CONN-017 | 1 | 87.6 | 2026-07-04 |
| CONN-010 | 1 | 87.1 | 2026-07-04 |