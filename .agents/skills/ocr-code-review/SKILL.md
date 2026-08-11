---
name: ocr-code-review
description: Use when reviewing a diff, branch, merge request, workspace changes, or an explicitly requested repository scan for confirmed code defects with auditable scope, isolated reviewers, precise locations, and resumable execution; triggers include code review, CR, OCR review, 审查改动, 全仓扫描, and scan repository.
---

# OCR Code Review

## 核心模型

以 Primary Target 为唯一可报告对象，以 Context Evidence 为按需证据。模型负责理解语义、提出并反证 Bug；程序负责范围、规则、指纹、位置、租约、生命周期、去重和输出。

本 Skill **只审查，不修改源码**。`fix-queue.json/.md` 只是给后续修复流程的输入。

## 入口选择

- 用户只说“code review / OCR”而没有指定范围：默认 `review --workspace`，并提示“当前审查工作区改动；全仓扫描需显式指定”。不要默认启动全仓扫描。
- diff、分支、MR、base/head：使用 `review`。
- 用户明确说全仓、全部代码或 repository scan：使用 `scan`。
- 明确要求上线就绪、产品完整性、假绿或外部集成：使用 `production-readiness`；其他情况默认 `correctness`。

显式 `scan` 默认使用 `runtime-code`；用户强调应用/包时可用 `apps-packages`，明确要求连文档和工具脚本都扫时用 `full`。`init` 后先展示一次 composition preview、token 估算和预算告警；只有范围或成本 materially 超出用户授权时才暂停确认。开始调度后持续到最终结果，禁止逐文件询问。

## 执行前必读

Controller 必须读：

1. [controller-runbook.md](references/controller-runbook.md)
2. [session-lifecycle.md](references/session-lifecycle.md)
3. [rules.md](references/rules.md)
4. [coverage-routing.md](references/coverage-routing.md)
5. 按模式读 [review-mode.md](references/review-mode.md) 或 [scan-mode.md](references/scan-mode.md)

创建 reviewer 前还要读 [reviewer-protocol.md](references/reviewer-protocol.md) 和 [finding-contract.md](references/finding-contract.md)。收到 verifier action 时再读 [verifier-protocol.md](references/verifier-protocol.md)。

## 运行时

使用随 Skill 安装的 `scripts/ocr_review.py`；只依赖 Python 3 标准库。先探测 `python3`、`python`、Windows `py -3`，再运行：

```text
<python3> <skill-root>/scripts/ocr_review.py --help
```

没有 Python 3 时返回 `BLOCKED`。所有命令只输出 UTF-8 JSON；只按 `error` 和 `next_action` 推进，不用聊天文本代替状态写入。

## Controller 主循环

1. `init` 冻结范围、规则、Primary Target Manifest、指纹，并返回 composition/token preflight。
2. 写入 Stack Card；按信号用幂等 `task-plan` 为文件挂载维度。维度不是任务，禁止“文件 × lane”。
3. 反复调用不带槽位猜测的 `orchestrate-tick`。`auto` 首次主动请求至少 15 路；全部接受后继续按 15→30→45… 探测，15 不是上限。
4. 对每个 action 尝试创建新的独占 context。创建成功后，Reviewer 用 `task-start --lease` ACK，verifier 用 `verifier-start --lease` ACK；随后把本轮所有接受/拒绝项一次性写入 `orchestrate-report`。程序据此学习真实宿主容量；不得把 Controller 猜测的 4 个空槽直接当上限。
5. Reviewer 只审一个 Primary Target，按需调用 Cursor 原生 Read/Search/Grep/Git/Shell 读取相关上下文。Controller 不顺手审小文件，不复用 reviewer context。
6. 证据闭环才 `submit`。Reviewer 提交 `existing_code`，程序校正 path/line/fingerprint；模型提供的路径和行号不受信任。
7. Reviewer 提交 Coverage 后调用 `complete`，立即释放 reviewer 槽位；待验证 Finding 留在 verifier backlog。下一次 tick 优先 verifier，并为 backlog 保留容量。
8. 所有 reviewer 和 Finding verifier 完成后执行 `dedup-plan`，再由独立 context 逐候选 `dedup-verify`。不确定即保持独立，原始 Finding 永不删除。
9. 调用 `finalize`。遇到 `VERIFIER_PENDING` 或 `DEDUP_VERIFIER_PENDING` 必须继续排空对应队列，不能发布 partial 冒充最终结果。
10. 自动向用户展示一次最终摘要与 `result.md` 路径；不要把全部分片重新读回上下文。

## 中止、恢复与进度

- 用户说“暂停”：立即 `pause --reason ...`，停止新派发；`resume` 后继续。
- 用户说“停止/取消”：立即 `abort --reason ...`。程序提升 `session_epoch`、拒绝 orphan 写入并生成 `result.partial.json`、`_partial_summary.md` 和 partial fix queue。
- 长扫描默认静默运行；用 `heartbeat` 每 50 个完成项或 5 分钟输出一条聚合进度，不发 clean 通知风暴。
- `status` 默认只取一行 summary；诊断才用 `status --verbose`。
- 会话或上下文中断后先 `resume`。文件、规则、协议或 Context Evidence 指纹变化时重新审查，不复用旧结论。

## 不可协商边界

- 其他文件可以作为 Context Evidence 读取，但其中与 Primary Target/当前 diff 无因果关系的历史 Bug 不得报告。
- Candidate、搜索命中、失败测试和静态规则命中都不等于 Finding；必须证明可达触发、契约差异、实际行为和实质影响。
- Finding 必须声明 `impact_surface`、`reachability`、`current_input_reproducible`；cross-file 由程序根据 `xref` 派生，模型不能自报。
- `correctness` 下的 docs/tooling 候选只有在当前输入可复现且可达性已证明时才可发布。
- 没有唯一 `existing_code` 锚点、证据不足、验证未结束或指纹已失效时不得发布。
- `review` 只报告与本次改动有因果关系的问题；删除导致的问题要有 deletion evidence，并锚定仍存在的当前代码。
- 明确测试目录 `test/tests/__tests__/spec/specs` 和标准测试命名默认不是 Primary Target，但可作为上下文；按分隔符与语言惯例识别，不按任意 `test` 子串过滤。生成物、安装后的 OCR skill 副本和规则排除项同样默认排除。
- 有 material Blind Spot 时不得输出 clean；clean 只能表述为“在当前范围和 OCR 规则下，没有发现已确认问题”。

## 输出

`finalize` 生成可独立交付的 `result.md`、机器可读 `result.json`、原始 `findings/`、去重审计记录和 `fix-queue.json/.md`。

结果在 512 KiB 内使用 `output_mode=inline`；超出时使用 `output_mode=sharded`，完整问题写入 `results/findings-NNNN.json/.md`，摘要只保留最多 20 条 `finding_preview` 和完整 `finding_shards` 索引。最终回复必须给出结论、覆盖度、三层计数、严重度预览、blocked/Blind Spot、assurance 和报告路径。

## 命令速查

```text
ocr_review.py init --repo <repo> [--mode review --workspace]
ocr_review.py init --repo <repo> --mode scan --scope runtime-code|apps-packages|full [--token-budget N]
ocr_review.py orchestrate-tick --session <dir>
ocr_review.py orchestrate-report --session <dir> --launch <id> --input <launch-report.json>
ocr_review.py task-start --session <dir> --task <id> --reviewer-context <id> --lease <lease-id>
ocr_review.py verifier-start --session <dir> --finding <id> --verifier-context <id> --lease <lease-id>
ocr_review.py submit --session <dir> --task <id> --input <finding.json>
ocr_review.py complete --session <dir> --task <id> --coverage <coverage.json>
ocr_review.py verify --session <dir> --finding <id> --decision confirm|reject --reason <text> --lease <lease-id> --verifier-context <id>
ocr_review.py pause --session <dir> --reason <text>
ocr_review.py abort --session <dir> --reason <text>
ocr_review.py resume --session <dir>
ocr_review.py status --session <dir> [--verbose]
ocr_review.py heartbeat --session <dir> [--force]
ocr_review.py dedup-plan --session <dir>
ocr_review.py dedup-verify --session <dir> --candidate <id> --input <decision.json> --verifier-context <id>
ocr_review.py finalize --session <dir>
ocr_review.py export-fix-queue --session <dir>
```
