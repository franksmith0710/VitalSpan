# Evolution State

> 自我演化单一状态账本。Automations 可读写；人工可审计。不要另建并行运行态文件。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | P5_DOCS_READY |
| round_target | docs/superpowers/evolution/2026-07-03-round-target-r12.md |
| design | docs/superpowers/specs/2026-07-03-m1b-data-quality-r12-design.md |
| plan | docs/superpowers/plans/2026-07-03-m1b-data-quality-r12.md |
| branch | feat/m1b-data-quality-r12 |
| base_branch | dev-auto |
| prd_ids | DATA-002,ETL-001,DATA-004,DATA-003,DATA-005 |
| pr_number | 28 |
| last_verified_command | cd backend && ruff check . && pytest -v; cd backend && pytest -v ../tests/test_ingestion_config.py ../tests/test_sync_executor.py ../tests/test_scheduler.py ../tests/test_etl_rules.py ../tests/test_ingestion_api.py ../tests/test_ingestion_l1_smoke.py ../tests/test_doc_anchors_data.py; cd fe && pnpm install --frozen-lockfile && pnpm test && pnpm build && pnpm run check:design |
| last_verified_exit_code | 0 |
| last_ui_verified_command | cd fe && pnpm exec vitest run src/pages/admin/ingestion/ingestion.smoke.test.tsx && pnpm run check:design |
| last_ui_screenshots | N/A headless CI — ingestion vitest 27/27 PASS; check:design passed (34 files) |
| deployed_automate_rev | bf60b94ec4f4 |
| skill_rule_index_generated_at | 2026-07-03T13:45:00Z |
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

- G1 doc-bootstrap（r12 入口）：goal.md 只读；prd hub 124 项·16 域含薄弱项汇总/8 维总表/功能索引
- plan M1+M1B 全 [x]（16 项）；无含 `[ ]` 的活跃节
- G0 PASS：无 Open PR；PR #26 已 Squash merge 至 dev-auto@0d63f3b；state 对账 phase→idle
- 技能规则索引 26 条未过期；deployed_automate_rev=bf60b94ec4f4
- P5 r12 收尾：DATA-005 破 90（90.8）；DATA-004 89.8、DATA-003 89.6、DATA-002 89.4、ETL-001 89.3 仍 <90；pytest 194 + vitest ingestion 27

## 选题卡住计数（连续未过 90 的功能项）

| prd ID | 连续未过轮次 | 最近加权总分 | 最近评分日期 |
|--------|:-----------:|:-----------:|------------|
| BOOT-002 | 11 | 88.9 | 2026-07-03 |
| BOOT-005 | 11 | 88.6 | 2026-07-03 |
| BOOT-006 | 11 | 88.8 | 2026-07-03 |
| BOOT-001 | 10 | 89.2 | 2026-07-03 |
| BOOT-004 | 10 | 89.5 | 2026-07-03 |
| BOOT-003 | 7 | 87.9 | 2026-07-03 |
| DATA-004 | 5 | 89.8 | 2026-07-03 |
| DATA-002 | 7 | 89.4 | 2026-07-03 |
| DATA-003 | 7 | 89.6 | 2026-07-03 |
| ETL-001 | 6 | 89.3 | 2026-07-03 |
