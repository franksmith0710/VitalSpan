# Evolution State

> 自我演化单一状态账本。Automations 可读写；人工可审计。不要另建并行运行态文件。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | P5_DOCS_READY |
| round_target | docs/superpowers/evolution/2026-07-03-round-target-r13.md |
| design | docs/superpowers/specs/2026-07-03-m1b-data-quality-r13-design.md |
| plan | docs/superpowers/plans/2026-07-03-m1b-data-quality-r13.md |
| branch | feat/evolution-r13-data-companion-push |
| base_branch | dev-auto |
| prd_ids | DATA-004,DATA-003,DATA-002,ETL-001,DATA-001 |
| pr_number | 30 |
| last_verified_command | cd backend && ruff check . && pytest -v; cd backend && pytest -v ../tests/test_ingestion_config.py ../tests/test_sync_executor.py ../tests/test_scheduler.py ../tests/test_etl_rules.py ../tests/test_ingestion_api.py ../tests/test_ingestion_l1_smoke.py; cd fe && pnpm install --frozen-lockfile && pnpm test && pnpm build && pnpm run check:design |
| last_verified_exit_code | 0 |
| last_ui_verified_command | cd fe && pnpm exec vitest run src/pages/admin/ingestion/ingestion.smoke.test.tsx && pnpm run check:design |
| last_ui_screenshots | N/A headless CI — T-ING-28 desktop1400 run confirm, T-ING-29 mobile375 cancel, T-ING-30 mobile375 401 error; ingestion vitest 31/31 PASS; check:design 34 files |
| deployed_automate_rev | bf60b94ec4f4 |
| skill_rule_index_generated_at | 2026-07-03T15:55:00Z |
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

- P5 r13 PRD 重评：DATA-004/002/003/ETL-001 破 90（91.1/91.0/90.6/90.7）；DATA-001 巩固 91.3；STUCK DATA 簇清零
- P4 r13 独立验证：backend ruff+pytest 207 passed/2 skipped；ingestion 105 passed/1 skipped；fe vitest 56/56（ingestion 31/31）；build+check:design PASS
- P3 r13 实现完成：6 Task 全绿；DATA-003 run AlertDialog ≤25 行；ingestion vitest 31 项；backend 207 passed
- G2 r13 选题完成：M1B DATA companion 质量推分 r13 — DATA-004/003/002 + ETL-001 + DATA-001（5 项）；最低分 ETL-001(89.3)
- plan M1+M1B 全 [x]（12 项勾选）；无含 `[ ]` 的活跃节；饱和熔断未触发（远期未实现占 Top10）
- G0 PASS：PR #29 已 merge 至 dev-auto@31c3fec；BOOT 簇 STUCK 7–11 轮本轮跳过

## 选题卡住计数（连续未过 90 的功能项）

| prd ID | 连续未过轮次 | 最近加权总分 | 最近评分日期 |
|--------|:-----------:|:-----------:|------------|
| BOOT-002 | 11 | 88.9 | 2026-07-03 |
| BOOT-005 | 11 | 88.6 | 2026-07-03 |
| BOOT-006 | 11 | 88.8 | 2026-07-03 |
| BOOT-001 | 10 | 89.2 | 2026-07-03 |
| BOOT-004 | 10 | 89.5 | 2026-07-03 |
| BOOT-003 | 7 | 87.9 | 2026-07-03 |
