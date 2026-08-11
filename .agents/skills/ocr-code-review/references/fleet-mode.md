# Fleet Mode（学习 go-fast）

当 Primary Target 很多时，单工作区宿主常把并发锁在很小的窗口（例如 8）。OCR Fleet 对齐 go-fast：**worktree 分片 + 同波多 shard-controller**，把产品并发上限抬到 `fleet_cap`（默认 **20**）。

## 何时启用

- `start` 后若目标数 ≥ 16，返回 `next_action=fleet_plan_then_worktree_shards` 与 `fleet_recommendation`。
- 用户要求尽快扫完 / 明确要高并发时，**优先 fleet**，不要在单窗把剩余 lease 一律标成 `host_capacity` rejected。

## Controller 流程

```text
start
  → fleet-plan --fleet-cap 20
  → 为每个 shard: git worktree add .worktrees/ocr-fleet-shard-NN -b ocr-fleet/shard-NN
  → 同波：对每个 shard fleet-shard-open --repo <worktree>
  → 同波：派出 ≤20 个 shard-controller subagent（cwd=对应 worktree）
  → 每个 shard-controller 在子 session 上跑 orchestrate-tick 循环（concurrency=max）
  → 父 session fleet-status 直到 all_shards_terminal
  → fleet-merge → dedup-plan → dedup-verify* → finalize
  → 清理 .worktrees/ocr-fleet-*（同 go-fast）
```

## 命令

```text
ocr_review.py fleet-plan --session <parent> [--fleet-cap 20]
ocr_review.py fleet-shard-open --session <parent> --shard shard-01 --repo <worktree-abs>
ocr_review.py fleet-status --session <parent>
ocr_review.py fleet-merge --session <parent> [--partial]
```

## Worktree 约定

目录优先级与 go-fast 相同：`.worktrees/`（须 gitignore）→ `worktrees/`。

```bash
git check-ignore -q .worktrees || echo ".worktrees/" >> .gitignore
git worktree add ".worktrees/ocr-fleet-shard-01" -b "ocr-fleet/shard-01"
```

已在 linked worktree 内时不要再叠套；改为缩小 `fleet_cap` 或串行 shard。

## 并发模型

| 层 | 含义 |
|----|------|
| `fleet_cap` | 同波最多多少个 **shard-controller**（默认 20，>20 须用户预授权） |
| shard 内 `concurrency=max` | 该 worktree 内再请求全部 runnable；宿主拒绝后学习该窗 `host_capacity` |
| 总吞吐 | 约 `opened_shards × 单窗容量`，而不是单窗 8 |

审查只读：worktree 主要用于 **隔离 Cursor agent 容量**，不是为了并行改代码。

## 父 / 子 session

- 父 session：任务编排真相源；打开 shard 后对应任务状态变为 `fleeted`，父级不再 dispatch 它们。
- 子 session：只含该 shard 的任务；独立 `orchestrate-tick` / submit / complete。
- `fleet-merge`：把子 session 终态与 `findings/` 拷回父 session，再走统一 dedup/finalize。

## 红线

- 禁止在单窗 saturate 后把未尝试的上千个 lease 批量写成 `host_capacity` 拒绝，却不转 fleet。
- 禁止同波超过 `fleet_cap` 且无用户授权。
- 禁止 shard-controller 改写其他 shard 的路径或父 session 文件（只通过 CLI 写自己的 child session）。
- merge 前不要对父 session `finalize`。
- 沙箱拒绝建 worktree → 缩小 `fleet_cap` 或单窗滚窗，并在 status 写明降级。
