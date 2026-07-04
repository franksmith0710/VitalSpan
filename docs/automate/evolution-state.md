# Evolution State

> 自我演化单一状态账本。Automations 可读写；人工可审计。不要另建并行运行态文件。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | P5_DOCS_READY |
| round_target | docs/superpowers/evolution/2026-07-04-round-target-r31.md |
| design | docs/superpowers/specs/2026-07-04-m5-view-m6-companion-quality-r31-design.md |
| plan | docs/superpowers/plans/2026-07-04-m5-view-m6-companion-quality-r31.md |
| branch | feat/evolution-r31-m5-view-m6-companion-quality |
| base_branch | dev-auto |
| prd_ids | VIEW-001,GOV-002,GOV-001,API-001,API-002 |
| pr_number |  |
| last_verified_command | cd backend && python3 -m ruff check . && python3 -m pytest -v |
| last_verified_exit_code | 0 |
| last_ui_verified_command |  |
| deployed_automate_rev | bf60b94ec4f4 |
| skill_rule_index_generated_at | 2026-07-04T01:52:00Z |
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
