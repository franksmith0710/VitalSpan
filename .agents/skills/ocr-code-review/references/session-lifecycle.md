# Session and Lifecycle

## 所有权

Controller 只保存结构化状态、调度和聚合，不加载所有文件正文或子任务推理。每个 Primary Target 一个任务；宿主按可用能力动态调度，`concurrency=auto` 默认，无固定 4/8/50，也没有逻辑批次屏障。

语言、模块和 root-cause group 仅用于规则、路由、去重、汇总，不用于制造文件批次。

## 保存位置

默认通过 Git 解析私有目录：

```text
<git-dir>/ocr-code-review/sessions/<session-id>/
  session.json
  manifest.json
  tasks/<task-id>.json
  findings/<task-id>/<finding-id>.json
  checkpoints/<task-id>.json
  result.json
  result.md
```

它不进入工作树。Reviewer 不直接编辑这些文件，只通过脚本命令提交状态。各任务正文仍可并行审查；所有会修改 Session/Manifest/Finding 的命令使用跨进程 Session 锁串行提交，并以原子替换写 JSON，避免并发 Agent 的 lost update。

## 生命周期

```text
pending → running → checkpointed/interrupted → complete
                    stale → 重新审查 → complete
```

合法转换由程序强制：pending/stale 任务可在 dispatch 前 `task-plan`；只有 running 任务可以 `submit`、`checkpoint`、`complete`；只有 pending/interrupted/checkpointed/stale 可以重新 `task-start`；只有当前 revision 的 candidate Finding 可以 `verify`。聊天文本不改变状态。没有合法 `complete` 的 reviewer 即使说“没有问题”也必须重试或恢复。

## 恢复

`resume` 重新计算 task input hash：

- 未变化 complete：复用。
- 内容、规则、协议或 Requirement 变化：stale，重新审查。
- orphan running：interrupted。
- checkpoint 且指纹匹配：按 next_action 继续。
- 旧 Finding 标 superseded，不进入输出；新 revision 产生不同 Finding ID，迟到的 verifier 不能确认旧 Finding。

上下文依赖指纹能取得时也应存入 task；Context Evidence 变化且可能推翻 Finding 时，重新验证或审查。

## Checkpoint

只用于大文件、上下文压力或中断，不是普通文件默认流程：

```json
{
  "covered_symbols": ["CreatePayment"],
  "covered_ranges": [],
  "finding_ids": ["finding-..."],
  "rejected_candidates": [{"claim": "...", "counter_evidence": ["..."]}],
  "pending_questions": ["callback 是否可能重放"],
  "next_action": "读取 callback router 和幂等键生成逻辑"
}
```

## 聚合和输出

顺序：结构校验 → 确定性同项去重 → 选择性 verifier → confirmed Finding → root-cause grouping → 新鲜度检查 → 输出。聚合量很大时按序列化 Finding token/字节量分段，不按文件数分段。

项目摘要可以由模型起草，但每一项必须引用已有 Finding ID；程序复核 ID、数量、路径和严重度。摘要不得创造问题。
