# Evolution State

> 自我演化单一状态账本。Automations 可读写；人工可审计。不要另建并行运行态文件。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | P2_DONE |
| round_target | docs/superpowers/evolution/2026-07-03-round-target-r8.md |
| design | docs/superpowers/specs/2026-07-03-m1b-quality-r8-design.md |
| plan | docs/superpowers/plans/2026-07-03-m1b-quality-r8.md |
| branch |  |
| base_branch |  |
| prd_ids | DATA-003,DATA-002,DATA-004,DATA-001,DATA-005 |
| pr_number |  |
| last_verified_command |  |
| last_verified_exit_code |  |
| deployed_automate_rev | bf60b94ec4f4 |
| skill_rule_index_generated_at | 2026-07-03T12:30:00Z |
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

- G0 PASS：已 Squash merge PR #21（补救 P2 plan 文档）至 dev-auto；sha 73fb684；无剩余 Open PR
- 上轮 r7（PR #20）已合并；PR #21 补齐遗漏的 `docs/superpowers/plans/2026-07-03-m1b-quality-r7.md`
- phase 自 P5_DOCS_READY 重置 idle；deployed_automate_rev bf60b94 未变
- STUCK 表保留 12 行；技能规则索引 26 条未过期

## 选题卡住计数（连续未过 90 的功能项）

| prd ID | 连续未过轮次 | 最近加权总分 | 最近评分日期 |
|--------|:-----------:|:-----------:|------------|
| BOOT-002 | 10 | 87.7 | 2026-07-03 |
| BOOT-005 | 10 | 85.9 | 2026-07-03 |
| BOOT-006 | 10 | 85.9 | 2026-07-03 |
| BOOT-001 | 9 | 86.5 | 2026-07-03 |
| BOOT-004 | 9 | 87.4 | 2026-07-03 |
| BOOT-003 | 7 | 87.9 | 2026-07-03 |
| DATA-004 | 2 | 84.8 | 2026-07-03 |
| DATA-001 | 2 | 85.8 | 2026-07-03 |
| DATA-002 | 3 | 83.9 | 2026-07-03 |
| ETL-001 | 3 | 85.9 | 2026-07-03 |
| DATA-003 | 3 | 81.5 | 2026-07-03 |
| DATA-005 | 2 | 85.8 | 2026-07-03 |
