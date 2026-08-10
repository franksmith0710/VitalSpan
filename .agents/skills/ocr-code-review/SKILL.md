---
name: ocr-code-review
description: Use when reviewing a diff, branch, merge request, changed files, or an entire repository for confirmed code defects with auditable scope, resumable sessions, precise locations, and controlled context; triggers include code review, CR, review changes, scan repository, full-repo scan, 全仓扫描, 审查改动, and OCR review.
---

# OCR Code Review

## Overview

以 Primary Target 为审查边界，以 Context Evidence 为按需证据。模型判断语义，程序控制范围、指纹、位置、生命周期、覆盖度和最终输出。

本 Skill **只审查，不修改代码**。修复必须由用户另行明确触发。

## 入口

| 用户意图 | 模式 | 默认 Profile |
|---|---|---|
| diff、分支、MR、当前改动、未明确说全仓 | `review` | `correctness` |
| 全仓、全部代码、repository scan | `scan` | `correctness` |
| 明确要求上线就绪、产品完整性、假绿、外部集成 | 原模式 | `production-readiness` |

`review` 没有可靠 base 时先问用户，禁止悄悄降级成 `scan`。

## 必读顺序

1. [reviewer-protocol.md](references/reviewer-protocol.md)
2. [finding-contract.md](references/finding-contract.md)
3. [rules.md](references/rules.md)
4. [coverage-routing.md](references/coverage-routing.md)
5. [session-lifecycle.md](references/session-lifecycle.md)
6. 按入口读 [review-mode.md](references/review-mode.md) 或 [scan-mode.md](references/scan-mode.md)
7. 只有命中选择性验证门时读 [verifier-protocol.md](references/verifier-protocol.md)

## 运行时门禁

本 Skill 自带 `scripts/ocr_review.py`，仅依赖 Python 3 标准库。依次探测 `python3`、`python`、Windows `py -3`。无 Python 3 时返回 `BLOCKED`：机器控制的生命周期和位置校验不可被自由文本替代。

所有命令都只输出 JSON；非零退出时按 `error` 与 `next_action` 处理。先运行：

```text
<python3> <skill-root>/scripts/ocr_review.py --help
```

## Controller 工作流

1. `init`：冻结模式、规则、过滤器、Primary Target Manifest、输入指纹和 Session。
2. 完成 Stack Card，记录栈、入口、数据/鉴权/外部集成边界和扫描工具新鲜度。
3. 按信号给任务挂载审查维度，调用 `task-plan` 写入 Manifest。**维度不是独立任务**；禁止 `文件 × Lane`。
4. 每个 Primary Target 使用一个只读 reviewer subagent/context。并发默认 `auto`，由宿主能力调度；无固定批次和固定并发数。
5. Reviewer 按需 Read/Search/Grep/Git/Shell 获取 Context Evidence。搜索命中只是 Candidate。
6. 已证实问题调用 `submit`；程序从 Manifest 和 `existing_code` 推导文件与行号。
7. critical/high、专项高风险或不确定问题使用新 verifier context 调用 `verify`。
8. Reviewer 必须提交 Coverage 并调用 `complete`。聊天中说 complete 没有状态意义。
9. 中断后调用 `resume`；大文件或中断任务才使用 `checkpoint`。
10. 所有任务终态后调用 `finalize`。只发布 `result.json` 中的 confirmed Finding；`result.md` 是确定性渲染。

## 不可协商的边界

- Primary Target 是唯一可报告对象。其他文件可以读取，但其中的历史 Bug 不得转成当前 Finding。
- `review` 只报告与当前改动有因果关系的问题；删除导致的问题必须提供删除证据并锚定仍存在的当前代码。
- Candidate、rg/AST 命中、失败测试、过期调用图结论都不等于 Finding。
- 模型不得提供受信任的路径或行号；`submit` 只接受 `task_id + existing_code + 语义证据`。
- 没有唯一代码锚点、证据不足、验证未完成或 Finding 已失效时，不得发布。
- 不设“每个维度至少 N 个问题”配额；以 Coverage/EXHAUSTED 证据证明完成。
- 测试、生成物和默认排除文件不是 Primary Target；需要时可以作为 Context Evidence。
- 工具缺失不会自动安装软件或创建索引。使用 Cursor 原生工具/rg 降级，并如实记录实质性盲区。
- 有实质性 Blind Spot 时不得输出 clean。

## 命令速查

```text
ocr_review.py init --repo <repo> --mode review --base <ref> [--head HEAD]
ocr_review.py init --repo <repo> --mode review --base <ref> --workspace
ocr_review.py init --repo <repo> --mode scan
ocr_review.py stack-card --session <dir> --input <stack-card.json>
ocr_review.py task-plan --session <dir> --task <task-id> --input <task-plan.json>
ocr_review.py task-start --session <dir> --task <task-id>
ocr_review.py submit --session <dir> --task <task-id> --input <finding.json>
ocr_review.py verify --session <dir> --finding <id> --decision confirm|reject --reason <text>
ocr_review.py checkpoint --session <dir> --task <id> --input <checkpoint.json>
ocr_review.py complete --session <dir> --task <id> --coverage <coverage.json>
ocr_review.py resume --session <dir>
ocr_review.py status --session <dir>
ocr_review.py finalize --session <dir>
```

## 完成语义

- `completion_status=complete`：Manifest 的所有 Primary Target 已合法 `complete`，无待验证或失效 Finding。
- `assurance=limited`：流程完成但存在实质性声明盲区。
- `clean=true`：仅当 Session complete、零 confirmed Finding、零实质性 Blind Spot。
- clean 固定措辞：**“在当前范围和 OCR 规则下，没有发现已确认问题。”** 禁止声称“代码没有 Bug”。

## 常见错误

| 错误 | 正确做法 |
|---|---|
| 800 文件 × 11 维度 | 800 个文件任务；维度按信号挂载到相关任务 |
| `rg` 命中后直接评论 | 读取定义、调用方和契约，形成因果证据后再 submit |
| 在 `account.go` 顺便报告历史问题 | 只把它当 Context Evidence；不报告 |
| Reviewer 自报 `payment.go:42` | 提交原样 `existing_code`，由程序定位 |
| 为省时间把多个文件代码塞进一个 prompt | 每个 Primary Target 独立上下文；相关代码按需读取 |
| 工具失败后写“未发现问题” | 降级复核或记录 Blind Spot；Finalizer 降低 assurance |
