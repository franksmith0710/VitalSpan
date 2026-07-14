---
name: arch-reviewer
description: >
  架构重构审计（技术栈无关）：扫描加深机会（shallow→deep）、缝泄漏、测试 locality 差、
  适配器假缝；输出带 before/after 可视化的 HTML 报告；用户点选候选后进入 grilling 深挖，
  再落 ADR / CONTEXT / 重构切片。Use when architecture review, refactoring audit, deepen modules,
  seam leakage, shallow modules, codebase architecture friction, module depth, locality/leverage,
  ports and adapters audit, or when the user asks for 架构审计 / 架构重构 / 加深模块 / 边界泄漏.
---

# Arch Reviewer（架构重构 · 加深机会）

技术栈无关的**架构摩擦审计**。Agent 已懂通用重构；本 Skill 补：**加深词汇（depth / seam / locality）**、**有机探索而非死清单**、**视觉 HTML 候选报告**、**点选后 grilling**、**ADR 冲突标注**。

目标：可测试性 + AI 可导航性。把 **shallow module** 加深为 **deep module**，而不是再堆一层 wrapper。

与姊妹 skill 分工：

| Skill | 管什么 | 不管什么 |
|-------|--------|----------|
| **本 Skill** | 模块深度、缝泄漏、加深机会、重构候选 | 假绿/stub 清扫、页级 UX、写完整 arch.md |
| [code-reviewer](../code-reviewer/SKILL.md) | 假绿·stub·硬编码·可靠性·半成品表面 | 模块加深设计 |
| [docs-reviewer](../docs-reviewer/SKILL.md) | docs 分类完整与漂移 | 架构方案本身 |
| [create-evolution-arch](../create-evolution-arch/SKILL.md) | 交互写/体检 `docs/arch.md` | 扫代码出加深候选 |

重叠时：发现「模块浅」用本 Skill；发现「stub 冒充实现」转 code-reviewer。

## 何时启用

| 场景 | 动作 |
|------|------|
| 「架构审计 / 重构机会 / 加深模块」 | 读域语境 → Explore → HTML 候选报告 → 点选 grilling |
| 大模块难测 / 改一处牵全身 | 范围=该域；找 shallow + 泄漏缝 |
| 准备大型重构前选型 | 出 3～7 个候选 + Top recommendation；先设计后动手 |
| 对照 ADR 是否过时 | 候选与 ADR 冲突时标注「是否重开」 |

**不要**：未点选就大范围改目录结构；用「拆文件」冒充加深；把假绿/stub 当架构候选主战场；替代完整安全审计。

## 必读顺序（≤3 次）

1. 本文件「词汇」+「流程」+「推荐强度」+「硬规则」
2. [references/vocabulary.md](references/vocabulary.md) + [references/friction-catalog.md](references/friction-catalog.md)
3. HTML：[references/html-report.md](references/html-report.md)；探索：[references/scan-workflow.md](references/scan-workflow.md)；点选后：[references/grilling-loop.md](references/grilling-loop.md)

## 架构词汇（强制使用）

报告与对话中**只用**下列词（英文术语保持原样，勿换成 service/component/API/boundary）：

| 词 | 含义（一句话） |
|----|----------------|
| **module** | 有接口与实现的职责单元 |
| **interface** | 从外调用该 module 的表面（测试面） |
| **implementation** | interface 背后的细节 |
| **depth** | 实现复杂而接口简单 → deep；接口≈实现 → shallow |
| **seam** | 可替换一侧而不改另一侧的接缝 |
| **adapter** | 缝一侧的具体实现（HTTP / in-memory / 文件…） |
| **leverage** | 一处接口服务多处调用方 |
| **locality** | 相关行为/缺陷集中在同一 module |

原则（详见 vocabulary）：

1. **Deletion test**：删掉它是浓缩复杂度，还是只是搬家？浓缩 → 疑似 shallow 包装。
2. **Interface = test surface**：加深后测试应打在 deepened module 的 interface 上。
3. **Adapter 计数**：一个 adapter = 假想缝；两个及以上 = 真缝（值得保留）。

若仓内装有 `codebase-design` skill → 词汇与之对齐；无则只读本 Skill 的 vocabulary。

## 推荐强度（候选徽章）

| 强度 | 含义 | 何时 |
|------|------|------|
| **Strong** | 摩擦明确、加深路径清晰、测试/导航收益大 | 优先 Top recommendation |
| **Worth exploring** | 有摩擦，方案需 grilling 收窄 | 可进报告 |
| **Speculative** | 可能过早抽象或证据不足 | 少报；标明假设 |

**不是** code-reviewer 的 P0/P1/P2。架构候选默认不「必修」；只有用户点选并 grilling 收敛后才进重构切片。

若加深机会同时掩盖了假绿/stub → 在卡片加一行「交叉：建议另跑 code-reviewer」，**不要**把 stub 清扫写成加深方案。

## 非问题（勿报）

1. **测试双 / fixture / 仅测试 harness 的 mock adapter** — 可证明真缝存在，不算泄漏。
2. **已有 ADR 明确禁止且无新摩擦** — 勿复诉；有新摩擦才可「建议重开 ADR」。
3. **为加深而加深** — 删测不浓缩、调用方已清晰的 deep module，勿硬拆。
4. **纯风格/目录搬家** — 无 depth/locality/leverage 收益的 rename 不进报告。
5. **未宣称域的远期规划** — 除非当前摩擦已痛。

## 硬规则

1. **先读域语境**：`CONTEXT.md` / `docs/domain/` / `docs/arch.md` / `docs/adr/`（有则必读）；用域名词命名 module。
2. **有机探索**：默认 Task `explore` subagent；禁止只跑固定 rg 清单交差。
3. **候选用加深词汇**：Problem / Solution / Wins 必须能落到 depth、seam、locality、leverage。
4. **先 HTML 报告，后点选**：报告写 OS temp，**不要**默认写进仓；打开给用户；问「想深挖哪一个？」
5. **点选前不写业务重构代码**；grilling 中可更新 `CONTEXT.md` / 提议 ADR，大重构仍须确认。
6. **ADR 冲突必标注**：矛盾时仅在摩擦足够时出现，带 callout。
7. **Before/After 图承载论证**：图看不懂就重画，勿堆长文。
8. **禁止**用「再抽一层 service/wrapper」冒充 deepen（deletion test 不过就丢掉）。

---

## 流程（必须）

### Phase 0 · Arch Card（主 agent，短）

| 探测 | 产出 |
|------|------|
| 域语境 | `CONTEXT.md`、`docs/domain/*`、`docs/arch.md` 是否存在；关键名词 |
| ADR | `docs/adr/` 列表（主题一行）；已知禁区 |
| 栈与布局 | 语言/包边界/前后端根（摘要即可，细节不如 code-reviewer） |
| 范围 | 整仓 / 模块·包列表 / PR 变更面触及的 module |
| 已知痛点 | 用户口述「难测 / 改不动 / 看不懂」 |

写入后续报告 header。模板提示见 [scan-workflow.md](references/scan-workflow.md)。

### Phase 1 · Explore（有机摩擦）

用 `explore` subagent（可 2～3 路并行：调用热点 / 包边界 / 测试硬度），带着这些问题走代码：

- 理解一个概念是否要在多个小 module 间来回跳？
- 哪些 module **shallow**（interface ≈ implementation）？
- 纯函数是否仅为可测性抽出，而真 bug 在调用编排上（无 **locality**）？
- 哪些缝在泄漏（实现细节穿过 seam）？
- 哪些区域难测，或只能通过很宽的 interface 测？

对疑似 shallow 做 **deletion test**。摩擦类型清单见 [friction-catalog.md](references/friction-catalog.md)。

**产出**：3～7 个加深候选（少而硬；宁缺 Speculative 堆砌）。

### Phase 2 · HTML 报告

1. 解析临时目录：`$TMPDIR` → 否则 `/tmp`（Windows `%TEMP%`）
2. 写入：`<tmpdir>/architecture-review-<timestamp>.html`
3. 按 [html-report.md](references/html-report.md) 渲染（Tailwind CDN + Mermaid CDN；每卡 before/after）
4. 打开：`open`（macOS）/ `xdg-open`（Linux）/ `start`（Windows）
5. 对话里给出**绝对路径** + 一句 Top recommendation
6. **停问**：`这些候选里，想先深挖哪一个？`

每张候选卡必含：Files · Problem · Solution · Benefits（locality/leverage/测试）· Before/After · 强度徽章 ·（可选）ADR callout · 依赖类别标签（`in-process` / `local-substitutable` / `ports & adapters` / `mock`）。

此阶段 **不要**抛具体 interface 签名；grilling 再设计。

### Phase 3 · Grilling（用户点选后）

按 [grilling-loop.md](references/grilling-loop.md)：约束 → 依赖 → deepened module 形状 → 缝后放什么 → 哪些测试留下。

结晶时的副作用（就地做，仍避免未确认的大改）：

| 信号 | 动作 |
|------|------|
| 加深 module 用了 `CONTEXT.md` 没有的概念名 | 补词条；无文件则懒创建 |
| 对话中锐化了模糊术语 | 更新 `CONTEXT.md` |
| 用户以**可复用理由**拒绝候选 | 提议写 ADR：「要不要记下来，避免以后架构审计再提？」短暂「现在不做」不写 ADR |
| 需要对比两种 interface | 设计两次（可并行 subagent），再收敛 |

Grilling 收敛后给出：**重构切片清单**（文件集、顺序、验收：测试打在新 interface 上）。**停等确认**再改业务代码。

### Phase 4 ·（确认后）执行切片

- 按切片小步提交式改动；先加深再删 shallow 包装（deletion test 方向）
- 同步：必要时最小补丁 `docs/arch.md` / ADR「后果」；大章修订交给 create-evolution-arch
- 不做无关目录大搬家

---

## 扫描进度清单

```
- [ ] 0. Arch Card：域语境 + ADR + 范围 + 痛点
- [ ] 1. Explore（并行或降级）：shallow / 泄漏 / locality / 难测
- [ ] 1b. deletion test 过滤；ADR 冲突标注
- [ ] 2. HTML 报告写入 temp 并打开；Top recommendation
- [ ] 3. 停问点选；未点选不设计 interface、不改代码
- [ ] 4. Grilling → 重构切片；停等确认
- [ ] 5. （确认后）执行切片 + 测试面落到新 interface
```

## 禁止

- 未读 CONTEXT/ADR（有文件时）就出候选
- 用 service/component/API/boundary 替代规定词汇写报告
- 把「多拆几个文件」写成 deepen
- 报告默认提交进 git / 写进 `docs/`（除非用户要求落档）
- 未点选就抛完整 interface 或大范围重构
- 与 ADR 冲突却不标注
- 把 stub/假绿主问题包装成架构加深（应转 code-reviewer）
- Speculative 刷屏超过 Strong/Worth exploring

## 关联

- [vocabulary.md](references/vocabulary.md) · [friction-catalog.md](references/friction-catalog.md)
- [html-report.md](references/html-report.md) · [scan-workflow.md](references/scan-workflow.md)
- [grilling-loop.md](references/grilling-loop.md)
- 姊妹：[code-reviewer](../code-reviewer/SKILL.md) · [docs-reviewer](../docs-reviewer/SKILL.md) · [create-evolution-arch](../create-evolution-arch/SKILL.md)
- 灵感来源：加深机会扫描 + 视觉报告 + 点选 grilling（improve-codebase-architecture）
