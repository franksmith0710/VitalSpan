# Scan Workflow（Arch Card + Explore）

## Phase 0 · Arch Card 提示（主 agent）

快速读（有则读，无则记「缺失」）：

```text
优先路径：
- CONTEXT.md
- docs/arch.md
- docs/domain/**
- docs/adr/**
- README.md（仅域名词与模块地图，不深挖）
```

产出表（写入报告 header / 对话摘要）：

| 字段 | 例 |
|------|-----|
| 范围 | 整仓 / `internal/order` + `apps/api` |
| 域名词 | Order, Pricing, Entitlement… |
| ADR 禁区 | ADR-0007：禁止跨服务共享 DB… |
| 栈摘要 | Go monorepo + React console |
| 用户痛点 | 「改定价要动 8 个包」 |

## Phase 1 · Explore subagent 分工

默认并行 2～3 路 `explore`（readonly）。仓极小可主 agent 自扫。

| Lane | 焦点 | 回传 |
|------|------|------|
| E1 概念散射 | 同一域名词落在哪些路径；跳转次数 | 候选草稿：F4 |
| E2 浅包装 / 透传 | Handler→Service→Helper 同名链；deletion test | 候选草稿：F1 |
| E3 缝与测试 | 跨包依赖、adapter 数量、测试 mock 面宽度 | 候选草稿：F2/F5/F6 |

### Subagent 提示词骨架

```text
你在做架构摩擦探索（只读）。项目根：{{ROOT}}
范围：{{SCOPE}}
域名词：{{TERMS}}
已知 ADR 禁区：{{ADRS}}

只使用词汇：module, interface, implementation, depth, shallow, deep, seam, adapter, leverage, locality。
不要报假绿/stub（那是 code-reviewer）；不要建议「再加一层 service」。

请有机阅读代码，寻找：
- shallow module（interface ≈ implementation）
- seam leakage
- 无 locality 的纯函数拆分
- 单 adapter 假想缝
- 难测宽 interface

对每个嫌疑做 deletion test（一句话结论）。

回传格式（每个候选）：
### C-n · 标题
- Friction: F?
- Files: ...
- Problem: 一句
- Why deepen: locality/leverage/depth…
- Deletion test: …
- Strength: Strong | Worth exploring | Speculative
- ADR conflict: none | ADR-xxxx — 一句
```

## 主 agent 合并

1. 合并同根因候选；强度取更有把握者（勿无故升 Strong）
2. 控制 3～7 张；为每张选一种 before/after 图模式
3. 选 Top recommendation（优先 Strong + 用户痛点对齐）
4. 渲染 HTML（见 html-report.md）→ open → 提问点选

## 降级

- 无 Task/subagent：主 agent 按 E1→E2→E3 顺序，仍须覆盖三类摩擦
- 某 lane 失败：重试 1 次 → 主 agent 补读入口包 → 报告注明 Blind spot（该区探索不足）
