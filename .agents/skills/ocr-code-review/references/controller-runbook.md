# Controller Runbook

这是 Controller 的一页式状态机。程序是生命周期真相源；Controller 尝试程序主动请求的 action，并如实回报宿主接受结果与真实 context ID。

## 状态机

```text
init → preflight → stack-card/task-plan
     → orchestrate-tick ─┬─ reviewer lease → task-start ─┬→ orchestrate-report
                        └─ verifier lease → verifier-start┘
                              ├─ reviewer → submit* → complete ───────────────┐
                              └─ verifier → verify ───────────────────────────┤
                                   ↑                                         │
                                   └──── verifier_backlog 优先 ───────────────┘
     → dedup-plan → dedup-verify* → finalize → result + fix queue

任意 running → pause → resume
任意 running/paused → abort → authoritative partial result
```

## 初始化与预检

通用“code review”默认 `review --workspace`；只有明确的全仓意图才传 `--mode scan`。Scan scope：

- `runtime-code`：默认，排除 docs、Markdown、scripts、examples 和代理配置。
- `apps-packages`：只保留常见 app/package/service/lib 根目录内的运行代码。
- `full`：保留受支持的全部代码、文档和工具脚本；生成物、vendor、OCR 安装副本仍受硬过滤器约束。

`init` 返回 `composition` 与 `token_estimate`（low/likely/high）。估算用于成本预告和预算告警，不是实际账单。只有 materially 超出授权时才在第一次派发前确认；确认后不中断逐文件询问。

## Tick 与租约

每当有空槽、reviewer 完成或 verifier 完成时调用：

```text
ocr_review.py orchestrate-tick --session <dir>
```

程序根据 `desired_concurrency` 主动返回一轮 action；每个 action 都包含 `kind`、目标 ID、`lease_id`、`session_epoch`、`expires_at`。Controller 应尝试全部 action，而不是先传一个自认为只有 4 的槽位数。创建 context 成功后立刻 ACK：

```text
reviewer: task-start --task <task_id> --reviewer-context <context-id> --lease <lease_id>
verifier: verifier-start --finding <finding_id> --verifier-context <context-id> --lease <lease_id>
```

然后把该 `launch_id` 的每个租约恰好报告一次：成功项写 `accepted[{lease_id, context_id}]`，宿主拒绝项写 `rejected[{lease_id, reason}]`，调用 `orchestrate-report --launch <id> --input <json>`。报告完成前不得再次 tick；拒绝项立即释放回 pending。

不要缓存 action，不要在创建 context 失败时 ACK，不要复用 context。过期租约会重新变为可派发；旧 `session_epoch` 的回调会被拒绝，避免 abort 后 orphan reviewer 写盘。

`auto` 首轮 `requested_concurrency` 至少是 15（任务不足时取任务数）；全接受后程序按 15→30→45… 继续探测。`accepted_concurrency` 是已 ACK 的实际活跃 context，`host_capacity` 是宿主反馈学到的容量。若宿主只接受 4 路，程序降到 4 并进入 saturated；达到重探条件后再试探。宿主真实硬上限仍不可绕过。

## Verifier 背压

`status.summary.verifier_backlog` 和顶层 `verifier_backlog` 是待验证真相源。Tick 总是先租 verifier；有 backlog 时至少保留约 25% 新槽，backlog 达到阈值时可整轮 drain verifier。

Reviewer `complete` 后任务进入 complete 并释放槽位，即使它提交的 high/security/cross-file Finding 仍待验证。不要让 reviewer context 因 `VERIFIER_PENDING` 占槽等待。`finalize` 会以 `VERIFIER_PENDING` 硬拒绝未排空队列。

## 回调规则

- `task-plan`：同一 plan hash 重放返回 `skipped_same_plan`；任务已开始后提交不同 plan 返回 `PLAN_CONFLICT`，只调和该任务，不中断整波。
- `task-fail`：只表示 reviewer 实际失败；宿主无槽不算 task failure。
- `complete`：Coverage 门禁通过后释放 reviewer；clean 只写状态，不通知用户。
- `verifier-start`：确认 verifier context 确实创建成功；之后才能在 launch report 中计为 accepted。
- `verify`：必须由已 ACK 的新 verifier context 完成；结论为 confirm/reject，并提供反证检查理由。
- `dedup-verify`：同样使用独立 context，对候选做完整分区；不确定成员保持独立。

## 暂停、中止、恢复

- `pause --reason <text>`：拒绝新 dispatch；允许已在途任务 checkpoint/complete/fail。`resume` 不把 pause 前仍运行的 reviewer 误判为 orphan。
- `abort --reason <text>`：提升 `session_epoch`，清理租约，把 running 标为 orphaned、未运行任务标为 aborted，并生成 `result.partial.json`、`_partial_summary.md`、`fix-queue.json/.md`。之后拒绝 submit/verify/finalize；重复 abort 幂等。
- `resume`：重算 Primary Target、规则、协议和 Context Evidence 指纹。变化项为 stale 并重审；非 pause 场景遗留 running 记一次失败后重试。

用户说暂停就 pause；用户说停止、取消或不要继续就 abort。不要只写一份手工 `ABORTED.md`。

## 进度与完成

平时使用 `status` 的 compact summary；仅排障使用 `status --verbose`。`heartbeat` 默认每 50 个终态任务或 300 秒允许一条聚合更新，避免通知风暴。

完成条件：所有活动 Primary Target 为 complete/blocked/removed，普通 verifier backlog 为 0，dedup verifier 全部终态，Finding 新鲜。然后 `finalize` 并直接展示一次聚合结果。不要为了展示全部问题而把所有分片读回 Controller 上下文。
