# Evolution State

> 自我演化单一状态账本。Automations 可读写；人工可审计。不要另建并行运行态文件。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | P1_DONE |
| round_target | docs/superpowers/evolution/2026-07-03-round-target-r10.md |
| design | docs/superpowers/specs/2026-07-03-m1b-data-quality-r10-design.md |
| plan |  |
| branch |  |
| base_branch |  |
| prd_ids | DATA-003,DATA-002,ETL-001,DATA-004,DATA-001 |
| pr_number |  |
| last_verified_command |  |
| last_verified_exit_code |  |
| last_ui_verified_command | cd fe && pnpm test && pnpm build && pnpm run check:design |
| last_ui_screenshots | NOT_RUN（无头环境；vitest viewport 375/1400 smoke + check:design 34 files PASS 覆盖 UI Acceptance） |
| deployed_automate_rev | bf60b94ec4f4 |
| skill_rule_index_generated_at | 2026-07-03T13:10:00Z |
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

- G1 doc-bootstrap：prd hub（124 项·16 域）含薄弱项汇总/8 维总表/功能索引；goal.md 只读未改
- plan M1+M1B 全 [x]（12 项 ID 与 prd 分片一致）；无活跃里程碑节
- G2 r10 选题完成：M1B DATA companion 推分 DATA-003/002/ETL-001/004/001；BOOT rotation 饱和本轮 pivot
- 上轮 r9 P5 完成；STUCK BOOT-* 最高 11 轮（BOOT-002/005/006）；DATA-* STUCK 3–4 轮
- deployed_automate_rev=bf60b94ec4f4；技能规则索引 26 条未过期

## 选题卡住计数（连续未过 90 的功能项）

| prd ID | 连续未过轮次 | 最近加权总分 | 最近评分日期 |
|--------|:-----------:|:-----------:|------------|
| BOOT-002 | 11 | 88.9 | 2026-07-03 |
| BOOT-005 | 11 | 88.6 | 2026-07-03 |
| BOOT-006 | 11 | 88.8 | 2026-07-03 |
| BOOT-001 | 10 | 89.2 | 2026-07-03 |
| BOOT-004 | 10 | 89.5 | 2026-07-03 |
| BOOT-003 | 7 | 87.9 | 2026-07-03 |
| DATA-004 | 3 | 87.5 | 2026-07-03 |
| DATA-001 | 3 | 88.1 | 2026-07-03 |
| DATA-002 | 4 | 85.5 | 2026-07-03 |
| ETL-001 | 3 | 85.9 | 2026-07-03 |
| DATA-003 | 4 | 85.4 | 2026-07-03 |
| DATA-005 | 3 | 88.4 | 2026-07-03 |
