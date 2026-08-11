# Scan Mode

`scan` 只在用户明确要求全仓或 repository scan 时使用。它通过 Git 文件清单建立 Primary Target Manifest，再应用 OCR provider 目录、用户规则、扩展名、硬过滤器和 scope profile。每个幸存文件是独立任务；相关文件只作为按需 Context Evidence。

## Scope profile

- `runtime-code`（默认）：审查运行时代码，排除 `docs/**`、Markdown、`**/scripts/**`、examples、`.agents/**`、`.cursor/**` 等高噪声面。项目 OCR 规则显式 include 可覆盖软排除。
- `apps-packages`：在 runtime-code 基础上，仅保留常见 `apps/`、`packages/`、`services/`、`src/`、`lib/` 根内目标。
- `full`：扩大到支持的代码、文档和工具脚本；vendor、生成物、测试默认策略、OCR skill 安装副本等硬边界仍生效。

```text
ocr_review.py init --repo <repo> --mode scan --scope runtime-code [--token-budget N]
```

初始化结果中的 `composition` 按顶层目录、扩展名和 impact surface 给出目标数量，`token_estimate` 给出 low/likely/high 估算及预算告警。它是 dispatch 前的范围/成本预检，不等同于模型供应商的实际 token 计费。范围或成本 materially 超出用户授权时只确认一次；一旦进入调度，内部持续执行，不再逐文件打断。

## 调度

使用不带槽位猜测的 `orchestrate-tick` 主动申请动态租约，并用 `orchestrate-report` 回报宿主实际接受/拒绝结果，不再由 Controller 手工维护固定“第几波”。`auto` 首次期望至少 15 路，全接受后继续扩容；15 是请求下限，不是总上限。Tick 优先处理 verifier backlog，防止大量 high/security/cross-file Candidate 堵住最终门禁。

Reviewer 完成 Coverage 并调用 `complete` 后立即释放槽位，即使其 Finding 仍待 verifier。Reviewer 失败最多自动重试 2 次；耗尽后转 blocked、记录 material Blind Spot，并继续其余任务。clean 完成项静默写 Manifest，只用聚合 heartbeat 汇报进度。

## 单次运行契约

Scan 是一次用户可见操作：开始后自动调度、验证、去重和恢复，直到所有任务终态并成功 finalize。只有用户明确 pause/abort、Git/Python 完全不可用或仓库不可读时提前停止。中止必须由 `abort` 生成权威 partial artifacts，不能手写状态替代。

全仓 clean 必须满足 Manifest 全完成、普通 verifier 与 dedup verifier 均终态、Finding 新鲜且没有 material Blind Spot。跨文件问题应选择最适合承载修复的 Primary Target；不得把仅作为 Context Evidence 的历史问题借题报告。
