# Evolution State

> 自我演化单一状态账本。Automations 可读写；人工可审计。不要另建并行运行态文件。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | P5_DOCS_READY |
| round_target | docs/superpowers/evolution/2026-07-03-round-target-r28.md |
| design | docs/superpowers/specs/2026-07-03-m5-viz-dash-r28-design.md |
| plan | docs/superpowers/plans/2026-07-03-m5-viz-dash-r28.md |
| branch | feat/evolution-r28-m5-viz-dash-kickoff |
| base_branch | dev-auto |
| prd_ids | VIZ-001,VIZ-002,DASH-001,DASH-002,DASH-003 |
| pr_number |  |
| last_verified_command | cd backend && python3 -m ruff check . && python3 -m pytest -q; cd fe && pnpm run check:design && pnpm test && pnpm run build |
| last_verified_exit_code | 0 |
| last_ui_verified_command | cd fe && pnpm run check:design && pnpm vitest run src/pages/admin/dashboard/dashboard.smoke.test.tsx src/components/charts/charts.smoke.test.tsx src/routes.smoke.test.tsx -t "dashboard|ChartRenderer"; screenshots N/A (headless CI: no docker/postgres for full stack) |
| deployed_automate_rev | bf60b94ec4f4 |
| skill_rule_index_generated_at | 2026-07-03T23:20:00Z |
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

- P5 r28 PRD 重评：VIZ-001/002 + DASH-001/002/003 L1 kickoff 13.2–13.9→86.8–91.0（VIZ-001/DASH-001 破 90；VIZ-002/DASH-002/003 <90 STUCK upsert）；pytest 600/2 skipped；test_viz_dash_l1_r28 26/26；fe vitest 81/81
- P4 r28 独立验证：backend ruff PASS + pytest 600 passed/2 skipped（≥600 目标；r27 570+4 未跌破）；test_viz_dash_l1_r28 26/26；test_migrations T-MIG-41~42 3/3；fe vitest 81/81 + node:test 4/4；check:design+build PASS；round-target 文件缺失，按 plan VIZ-001~002/DASH-001~003 验收绿；UI: PASS（check:design + dashboard/chart vitest smoke 11/11；截图 N/A headless CI）；exit_code 0；branch feat/evolution-r28-m5-viz-dash-kickoff；base_branch dev-auto
- P3 r28 实现完成：8 Task 全绿；backend ruff+pytest 600 passed/2 skipped（+30 VIZ/DASH L1）；fe vitest 81/81；build+check:design PASS；ui_design_skill: b-design-system-tailadmin-radix；branch feat/evolution-r28-m5-viz-dash-kickoff；base_branch dev-auto
- P5 r27 PRD 重评：QUERY-001/002/004/005/006 质量推分 88.5–91.4→91.4–92.8（QUERY-004 破 90 STUCK 清零）；pytest 570 + 4 skipped；test_query_quality_r27 36/36；ClickHouse dialect + readonly/table/binding/RLS 边界
- P4 r27 独立验证：backend ruff PASS + pytest 570 passed/4 skipped（≥560 目标）；test_query_quality_r27 36/36（≥28）；round-target QUERY-004/001/002/005/006 + plan T-MIG-40 验收绿；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r27-m4-query-quality；base_branch dev-auto
- P3 r27 实现完成：7 Task 全绿；backend ruff+pytest 570 passed/4 skipped（+38 query quality）；test_query_quality_r27 36/36；ui_design_skill: none；branch feat/evolution-r27-m4-query-quality；base_branch dev-auto
- P5 r26 PRD 重评：QUERY-001/002/004/005/006 L1 kickoff 12.8–13.5→88.5–91.4（四 ID 破 90；QUERY-004 ClickHouse 缺口 STUCK upsert）；pytest 532 + 4 skipped；T-Q-020~055 + T-MIG-38~39
- P4 r26 独立验证：backend ruff PASS + pytest 532 passed/4 skipped；test_query_l1_r26 29/29；test_migrations T-MIG-38~39 2/2；plan 验收 ≥531/4 skipped 绿（round-target-r26.md 缺失，按 plan Step 5 对照）；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r26-m4-query-l1-kickoff；base_branch dev-auto
- P3 r26 实现完成：7 Task 全绿；backend ruff+pytest 532 passed/4 skipped（+31 query L1）；ui_design_skill: none；branch feat/evolution-r26-m4-query-l1-kickoff；base_branch dev-auto
- G0 PR #46 遗留合并：rebase 至 dev-auto 后重置 phase=idle（r25 已在 PR #47 合并）
- P5 r25 MERGED：PR #47 squash 至 dev-auto@d1b6c91；DS-004/006/007/008 + CONN-002 重评 90.1–91.6；pytest 501/4 skipped；head 分支已删
- P5 r25 PRD 重评：DS-004/006/007/008 + CONN-002 companion kickoff 12.8–13.7→90.1–91.6（五 ID 破 90）；pytest 501 + 4 skipped；T-DS-TY/PL/MD/AC + T-CONN-P + M15
- P4 r25 独立验证：backend ruff PASS + pytest 501 passed/4 skipped；test_datasources_companion_r25 25/25；round-target DS-008/DS-007/DS-004/CONN-002/DS-006 验收绿（plan Spec Self-Review）；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r25-m3-datasource-companion；base_branch dev-auto
- P3 r25 实现完成：7 Task 全绿；backend ruff+pytest 501 passed/4 skipped（+25 companion）；ui_design_skill: none；branch feat/evolution-r25-m3-datasource-companion；base_branch dev-auto
- P5 r24 PRD 重评：DS-001/002/003/005 + CONN-001 质量推分 89.1–91.9→90.1–92.1（CONN-001 破 90 STUCK 清零）；pytest 476 + 4 skipped；T-DS-R09~R12、C17~C22、T11~T15、K09~K12、CONN-M11~M16
- P4 r24 独立验证：backend ruff PASS + pytest 476 passed/4 skipped；test_datasources_quality_r24 27/27 + r23/L1 53/53；round-target CONN-001/DS-001/002/003/005 验收绿；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r24-m3-datasource-quality；base_branch dev-auto
- P5 r23 PRD 重评：DS-001/002/003/005 + CONN-001 质量推分 86.8–91.1→89.1–91.9（DS-001 破 90 STUCK 清零；CONN-001 round 2）；pytest 449 + 4 skipped；T-DS-R05~R08、C09~C16、T06~T10、K05~K08、CONN-M05~M10
- P4 r23 独立验证：backend ruff PASS + pytest 449 passed/4 skipped；round-target CONN-001/DS-001/002/003/005 验收绿；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r23-m3-datasource-quality；base_branch dev-auto
- P3 r23 实现完成：7 Task 全绿；backend ruff+pytest 449 passed/4 skipped（+30 datasources quality）；ui_design_skill: none；branch feat/evolution-r23-m3-datasource-quality；base_branch dev-auto
- P5 r22 PRD 重评：DS-001/002/005/003 + CONN-001 L1 kickoff 12.8–13.6→86.8–91.1（DS-002/003/005 破 90；DS-001/CONN-001 <90 STUCK upsert）；pytest 419 + 4 skipped；T-DS-R/C/T/K + CONN-M smoke
- P4 r22 独立验证：backend ruff PASS + pytest 419 passed/4 skipped；test_datasources_l1 23/23；round-target DS-001/002/005/003 + CONN-001 验收绿；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r22-m3-datasource-kickoff；base_branch dev-auto
- P3 r22 实现完成：7 Task 全绿；backend ruff+pytest 419 passed/4 skipped（+25 datasources L1）；ui_design_skill: none；branch feat/evolution-r22-m3-datasource-kickoff；base_branch dev-auto
- P2 r22 计划完成：7 Task（注册表/MySQL→凭证→ORM/0008→service→API→迁移测试→文档）；17 文件；subagent-driven-development option 1；全 Task UI skill: none
- P4 r21 独立验证：backend ruff PASS + pytest 394 passed/4 skipped；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r21-m2-auth-quality-push；base_branch dev-auto
- P3 r21 实现完成：7 Task 全绿；backend ruff+pytest 394 passed/4 skipped（+17 AUTH quality）；ui_design_skill: none；branch feat/evolution-r21-m2-auth-quality-push；base_branch dev-auto
- P5 r20 PRD 重评：AUTH-006~008 L1 kickoff 13.2–13.6→89.5–89.9（均 <90 STUCK upsert）；pytest 377 + 4 skipped；T-AUTH-GP/RLS/AU 30 smoke
- P4 r20 独立验证：backend ruff PASS + pytest 377 passed/4 skipped；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r20-m2-auth-kickoff；base_branch dev-auto
- P5 r19 PRD 重评：AUTH-001~005 巩固 90.8–92.1（89.4–91.2→）；AUTH-003 审计闭环破 90 STUCK 清零；pytest 348 + 4 skipped
- P4 r19 独立验证：backend ruff PASS + pytest 348 passed/4 skipped；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r19-m2-auth-quality-push@fe8c799；base_branch dev-auto
- P3 r19 实现完成：7 Task 全绿；backend ruff+pytest 348 passed/4 skipped（+23 AUTH audit/boundary）；ui_design_skill: none；branch feat/evolution-r19-m2-auth-quality-push@b472e9a；base_branch dev-auto
- P4 r18 独立验证：backend ruff PASS + pytest 325 passed/4 skipped；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r18-m2-auth-quality-push@62fdc65；base_branch dev-auto
- P3 r18 实现完成：7 Task 全绿；backend ruff+pytest 325 passed/4 skipped（+23 AUTH quality）；ui_design_skill: none；branch feat/evolution-r18-m2-auth-quality-push@2ce436a；base_branch dev-auto
- P2 r18 计划完成：7 Task（AUTH-004→002→005→003→001 + 迁移/文档）；15 文件；subagent-driven-development option 1；全 Task UI skill: none
- P4 r17 独立验证：backend ruff PASS + pytest 302 passed/4 skipped；UI: N/A（纯后端）；exit_code 0；branch feat/evolution-r17-m2-auth-rbac-kickoff；base_branch dev-auto
- P3 r17 实现完成：7 Task 全绿；backend ruff+pytest 302 passed/4 skipped（+29 AUTH smoke）；ui_design_skill: none；branch feat/evolution-r17-m2-auth-rbac-kickoff@62a80b8；base_branch dev-auto
- P2 r17 计划完成：7 Task（基建 + AUTH-001~005 + 路由/迁移/文档）；18 文件；subagent-driven-development option 1；全 Task UI skill: none
- P1 r17 设计完成：M2 AUTH RBAC 地基 — AUTH-001~005 L1（6 表 + 0003 migration + 5 API router + pytest smoke）
- G2 r17 选题完成：M2 AUTH 地基 kickoff — AUTH-001/002/003/004/005（5 项）；最低分 AUTH-002(12.8)
- P5 r16 PRD 重评：BOOT-001/006/004 + DATA-003 + ETL-001 巩固 91.0–91.5（90.4–90.7→）；pytest 273 + vitest 68 + node:test 4
- P4 r16 独立验证：backend ruff+pytest 273 passed/2 skipped；fe vitest 68/68 + node:test 4/4；build+check:design PASS；ingestion smoke 35/35 + routes 16/16；UI viewport 1400/375 PASS；exit_code 0；branch feat/evolution-r16-m1-m1b-floor-polish@95f0e34
- P3 r16 实现完成：5 Task 全绿；backend ruff+pytest 273 passed/2 skipped；fe vitest 68/68（ingestion 35）+ node:test 4/4；build+check:design PASS；ui_design_skill: b-design-system-tailadmin-radix；screenshots: N/A headless CI；branch feat/evolution-r16-m1-m1b-floor-polish@84738cf；base_branch dev-auto
- P5 r15 PRD 重评：BOOT-004 破 90（89.5→90.6 STUCK 清零）；BOOT-003/005/006/002 巩固 90.2–90.9；middleware traceId 契约修复；pytest 254 + vitest 64 + node:test 4
- P4 r15 独立验证：backend ruff+pytest 254 passed/2 skipped；fe vitest 64/64 + node:test 4/4；build+check:design PASS；UI smoke+design drift PASS；exit_code 0；branch feat/evolution-r15-boot-quality-push@362c8fb
- P3 r15 实现完成：5 Task 全绿；backend ruff+pytest 254 passed/2 skipped；fe vitest 64/64 + node:test 4/4；build+check:design PASS；branch feat/evolution-r15-boot-quality-push@c8c75ce；base_branch dev-auto
- P5 r14 PRD 重评：BOOT-003/005/006/002/001 破 90（90.0–90.4）；BOOT 簇 STUCK 五 ID 清零；BOOT-004 仍 89.5
- P4 r14 独立验证：backend ruff+pytest 227 passed/2 skipped；fe vitest 60/60；build+check:design PASS；exit_code 0
- P3 r14 实现完成：5 Task 全绿；backend 227 passed/2 skipped；fe vitest 60/60；build+check:design PASS；branch feat/evolution-r14-boot-quality-push@6af6604
- P5 r13 PRD 重评：DATA-004/002/003/ETL-001 破 90（91.1/91.0/90.6/90.7）；DATA-001 巩固 91.3；STUCK DATA 簇清零
- P4 r13 独立验证：backend ruff+pytest 207 passed/2 skipped；ingestion 105 passed/1 skipped；fe vitest 56/56（ingestion 31/31）；build+check:design PASS
- G2 r13 选题完成：M1B DATA companion 质量推分 r13 — DATA-004/003/002 + ETL-001 + DATA-001（5 项）；最低分 ETL-001(89.3)
- G2 r15 选题完成：M1 BOOT quality push r15 — BOOT-004/005/006/002/003（5 项）；最低分 BOOT-004(89.5)；STUCK BOOT-004 连续 10 轮
- plan M1+M1B 全 [x]（12 项勾选）；无含 `[ ]` 的活跃节；饱和熔断未触发（远期未实现占 Top10）
- G0 PASS：PR #31 已 merge 至 dev-auto@43cbf98；BOOT 簇五 ID 破 90，仅 BOOT-004 仍 <90

## 选题卡住计数（连续未过 90 的功能项）

| prd ID | 连续未过轮次 | 最近加权总分 | 最近评分日期 |
|--------|:-----------:|:-----------:|------------|
| VIZ-002 | 1 | 89.6 | 2026-07-04 |
| DASH-002 | 1 | 88.1 | 2026-07-04 |
| DASH-003 | 1 | 86.8 | 2026-07-04 |