# Finding Contract

## 状态

```text
search/scan hit → Candidate → semantic investigation → Finding
Finding → optional verifier → confirmed/rejected → finalizer → published comment
```

Candidate 是待查假设；Finding 是有结构化因果证据的审查结论。只有 `state=confirmed` 且位置/指纹仍新鲜的 Finding 可以输出。

## Reviewer 提交字段

```json
{
  "title": "扣款错误被忽略",
  "claim": "charge 返回的错误被丢弃，失败后仍继续使用 result",
  "severity": "high",
  "category": "bug",
  "existing_code": "result, _ := charge()\nreturn use(result)",
  "expected": "扣款失败时终止并传播错误",
  "actual": "忽略错误并继续处理返回值",
  "impact": "可能把失败扣款记录为成功",
  "delivery_impact": "P1（仅 production-readiness，可选）",
  "evidence": ["charge 的第二个返回值被丢弃", "调用方随后写入成功状态"],
  "change_evidence": "可选；review 模式的改动因果证据",
  "change_kind": "addition|modification|deletion",
  "risk_flags": ["cross-file"]
}
```

禁止提供 `path/file/line/start_line/end_line`。程序从 task 的 Primary Target 和 `existing_code` 计算它们。

## 位置

- `existing_code` 必须是当前 Primary Target 中连续、原样、足以唯一匹配的代码。
- 唯一命中后，程序计算 1-based 起止行并保存位置指纹。
- 多次命中：`LOCATION_AMBIGUOUS`，扩大片段。
- 未命中：`LOCATION_FAILED`，重新读取当前代码。
- `review` 默认要求锚点与 new-side diff hunk 相交。
- 删除引发的问题：`change_kind=deletion`、提供删除 hunk 中原样存在的完整行序列 `change_evidence`；程序拒绝任意子串或单字符“证据”。`existing_code` 仍锚定当前幸存代码，禁止发布旧文件行号。

## 严重度与类别

严重度：`critical | high | medium | low`。

类别兼容 OCR：`bug | security | performance | maintainability | test | style | documentation | other`，并允许选择性验证用的 `concurrency | transaction | data-consistency | data-loss`。

默认只报告实质性正确性、安全、数据、并发、明确性能或维护缺陷。style/documentation 只有项目 OCR 规则明确要求时才报告。

`production-readiness` 可另记 `delivery_impact=P0|P1|P2`，但不得替换主严重度。

## 去重与关联

- 相同位置、相同 claim 指纹：确定性去重。
- Finding ID 还包含 task input revision；代码、规则或 Requirement 变化后，旧 Finding 会 superseded，新证据必须重新提交。
- 同根因但不同文件：保留独立 Finding ID，使用 `xref` 或 root-cause group。
- 同一个跨文件问题被多任务重复报告：选择最能承载修复的 Primary Target 为 canonical owner，其他标 `duplicate_of`。
- 汇总器只能引用现有 Finding ID；新怀疑必须重新进入 Candidate 流程。

## 选择性验证

以下 Finding 必须验证：critical/high；security、concurrency、transaction、data-consistency、data-loss；跨文件、框架/版本依赖或证据仍不确定的判断。其余 medium/low 可以直接 confirmed，但 Finalizer 仍检查位置新鲜度。
