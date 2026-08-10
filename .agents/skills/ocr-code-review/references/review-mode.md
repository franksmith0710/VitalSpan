# Review Mode

`review` 审查明确 base 与 head 的改动面。每个通过 OCR 过滤器的 changed file 是一个 Primary Target；其他 changed file 只以路径清单提示，正文按需读取。

Reviewer 主要检查新增/修改代码。删除代码只作改动证据，不在旧行上评论。Finding 必须与当前改动有因果关系：由本次改动引入、使既有问题可达、破坏契约，或删除了必要保护。

如果问题完全存在于未修改的 Context Evidence，且本次改动没有改变其风险或可达性，不报告。

初始化：

```text
ocr_review.py init --repo <repo> --mode review --base <merge-base-or-ref> --head <head>
```

审查当前工作区（包含自 base 以来的 tracked 修改和未跟踪文件）时使用：

```text
ocr_review.py init --repo <repo> --mode review --base <ref> --workspace
```

此时 Session 的 head 固定为 `WORKTREE`；不要只审查 `base...HEAD` 而遗漏未提交改动。

没有 base 返回 `BASE_REQUIRED`，Controller 必须询问用户。禁止把“无法确定 diff”解释为“改做全仓扫描”。

默认 OCR 排除仍生效：例如修改的 `payment_test.go`、生成文件、二进制和 vendor 文件通常不会成为任务，但 reviewer 可按需读取测试来证明 `payment.go` 的行为。
