---
name: integration-research
description: >
  外部集成对接研究（技术栈无关）：针对 PRD 分片、arch 外部依赖或 stub 假绿 finding，
  检索官方 SDK / 标准协议 / GitHub 参考实现与对接流程，产出集成简报（可行性、候选方案、
  失败语义、真实验收草案、阻塞项）；默认不改 PRD/业务代码，用户确认后再交 arch/PRD/plan。
  Use when researching OAuth, OIDC, LDAP, AD, SAML, SMTP/email, SMS, object storage,
  message queues, cloud/HCI vendor APIs (Aliyun, Sangfor, etc.), third-party SaaS adapters,
  external integration contracts, SDK selection, or when code-reviewer finds vendor/protocol
  stubs and needs a real integration path before batch-fix.
---

# Integration Research（外部集成研究）

技术栈无关。Agent 已会写适配器；本 Skill 补：**契约不明时先研究再交付**、**简报作中间产物**、**与 PRD/arch/reviewer 接力**、**禁止用 stub 顶替研究缺口**。

覆盖：**厂商云/HCI/专有 API** 与 **通用协议**（OAuth2/OIDC、LDAP/AD、SAML、SMTP/邮件 API、短信、对象存储、托管队列等）。凡主路径依赖**仓外协议或服务**均可进入；本仓自有业务 API / 纯内部库 → **不要**用本 Skill。

## 何时启用

| 场景 | 动作 |
|------|------|
| PRD 分片写了外部对接，但无契约/沙箱/验收真路径 | 研究 → 简报 → 待确认验收草案 |
| `docs/arch.md` §8 空/薄，或依赖失败语义不清 | 补契约素材，供 arch 写入 |
| code-reviewer 报厂商/协议适配器 stub、假成功 | **先研究**；确认前勿盲目 batch-fix「真接」 |
| 选型：官方 SDK vs 自研 HTTP vs 社区库 | 对比 2–3 方案 + 风险 |
| 用户点名「怎么对接 X / 找 SDK」 | 直接出简报 |

**不要**：替代 code-reviewer 清 stub；未确认就改 `prd.md` / 业务代码；把网上方案直接写成「已实现」；对无外部依赖的普通业务做「研究」。

## 与姊妹 skill 分工

| Skill | 本 Skill 边界 |
|-------|----------------|
| [create-evolution-prd](../create-evolution-prd/SKILL.md) | PRD 真理源；本 Skill 只产**待确认**验收草案，**默认不改**分片 |
| [create-evolution-arch](../create-evolution-arch/SKILL.md) | 简报确认后回填 §8；本 Skill 不整篇重写 arch |
| [create-evolution-plan](../create-evolution-plan/SKILL.md) | 有契约/沙箱后再排里程碑；本 Skill 标 BLOCKED 时禁止 mock 顶替 |
| [code-reviewer](../code-reviewer/SKILL.md) | 抓假绿；命中「外部集成 stub」时**条件提示**本 Skill，非整份报告通告 |
| [docs-reviewer](../docs-reviewer/SKILL.md) | 正式 api/adr 文档；简报可链出去，勿把未确认简报抄成已交付 api |

接力顺序（推荐）：

```text
缺口发现（PRD/arch/reviewer）
  → integration-research（简报）
  → 用户确认
  → arch §8 / PRD 验收·状态 / plan 排期
  → 实现（真接）或撤入口
  → 必要时再跑 code-reviewer
```

## 必读顺序（≤3 次）

1. 本文件「范围」+「流程」+「红线」+「回传」
2. [references/brief-template.md](references/brief-template.md)
3. 研究步骤细则 [references/research-workflow.md](references/research-workflow.md)

## 硬规则

1. **默认只写简报**：产物路径见下；**禁止**未经用户确认修改 `docs/automate/prd*`、业务主路径、或把 stub 改成真接。
2. **禁止 stub 方案**：候选方案不得含「先 mock / 假成功 / 内存假后端」作为交付路径；测试双可另述，不进生产验收。
3. **证据可追溯**：每个推荐须带官方文档或仓库链接；无公开资料 → 可行性标 **需人工手册/NDA**，状态 **BLOCKED**，建议 PRD 保持未实现或撤入口。
4. **失败诚实性必写**：依赖不可用时的错误/重试/降级；**禁止**「降级仍返回成功」。
5. **首版切片须真实路径**：可缩小范围（如仅鉴权+List），不可降验收标准。
6. **先仓内再外网**：先扫本仓已有适配器/配置/`.dev`；再 WebSearch / 官方 docs / GitHub。
7. **确认后才回写**：用户明确说「写入 arch/PRD」后，再最小 diff 交对应 skill 或本会话代写，并展示预览。

## 产物位置

| 产物 | 路径 | 说明 |
|------|------|------|
| 集成简报 | `docs/integrations/<slug>.md` | `slug` = `oauth-oidc` / `ldap-ad` / `smtp-mail` / `aliyun-ecs` / `sangfor-hci` 等 |
| 索引（可选） | `docs/integrations/README.md` | 一行一条：依赖名 → 简报 → 状态 |

无 `docs/` 时：先建 `docs/integrations/`；勿另起平行树。

---

## 流程（必须）

### Phase 0 · Integration Card（短）

写出卡片（可写入简报文首）：

| 项 | 内容 |
|----|------|
| 触发源 | PRD 分片 ID / arch §8 条目 / code-reviewer finding ID / 用户口述 |
| 依赖名 | 如「OIDC 登录」「深信服超融合 VM」 |
| 类型 | `protocol`（OAuth/LDAP/SMTP…） / `vendor`（云/HCI/SaaS） / `hybrid` |
| 仓内痕迹 | 适配器路径、配置键、stub 位置、已有 SDK 依赖 |
| 宣称 | README/菜单是否已宣称可用 |
| 环境 | 沙箱 URL、测试账号、`.dev` 是否具备（未知标待确认） |

### Phase 1 · 仓内勘察

1. 有界扫描适配器/config/env 模板（勿全仓无目的扫）
2. 读相关 PRD 分片验收句、arch §8（若存在）
3. 若已是完整真实实现且有契约 → 简报写「已就绪」+ 缺口（若有），**不要**重复选型

### Phase 2 · 外网研究

按 [research-workflow.md](references/research-workflow.md)：

1. 官方文档 / OpenAPI / SDK（优先）
2. 标准流程（鉴权 → 连通性 → 最小写/读 → 失败语义）
3. GitHub/社区参考（注明星数/维护活跃与风险，**不得**仅凭 star 定案）
4. 本栈契合度（语言、许可证、部署形态：公有云 vs 私有化）

每类至少尝试检索；闭源无结果 → 诚实 BLOCKED，列「需要用户提供的材料」。

### Phase 3 · 简报

按 [brief-template.md](references/brief-template.md) 写入 `docs/integrations/<slug>.md`。

必含：可行性、候选方案（2–3）、推荐标准对接流程、真实验收草案（待确认）、首版真实切片、阻塞项、给 arch/PRD/plan/reviewer 的 followups。

### Phase 4 · 停等确认

向用户展示：

1. Integration Card 摘要  
2. 推荐方案一句话 + 主要风险  
3. 阻塞项（若有）  
4. **可选下一步**（用户点名才做）：写入 arch §8 / 修订 PRD 验收与状态 / 调整 plan / 撤入口 vs 真接  

未确认 → **结束**；不得自行改真理源或清 stub。

### Phase 5 ·（仅确认后）最小回写

| 用户确认项 | 动作 |
|------------|------|
| 写入 arch | 最小补丁 §8（依赖方、协议、认证、超时/重试、失败语义、数据归属、链到简报） |
| 修订 PRD | 验收改为真实路径句式；无沙箱则状态 ≤ 未实现；禁止 mock 通过 |
| 调整 plan | 有契约才排入；BLOCKED 项移出当前完成定义 |
| 实现指引 | 可开实现任务；完成定义 = 真接或撤入口（对齐 code-reviewer） |

---

## 可行性刻度

| 级 | 含义 | 对 PRD/实现的建议 |
|----|------|-------------------|
| **A 可公开真接** | 官方 SDK/文档齐，沙箱可得或可自建 | 可排真实切片 |
| **B 有文档缺环境** | 契约清，缺账号/沙箱/证书 | PRD 未实现；plan 先「环境就绪」或并行准备 |
| **C 需人工材料** | 闭源手册/NDA/现场 API | BLOCKED；撤宣称/入口直至材料到位 |
| **D 不建议接入** | 无稳定 API、许可证/安全不可接受 | Out of Scope 或换依赖；勿 stub |

## 回传格式

```yaml
status: DONE | DONE_WITH_CONCERNS | BLOCKED
phase: integration-research
slug: ""
feasibility: A | B | C | D
artifacts:
  - docs/integrations/<slug>.md
summary:
  - ""
blockers:
  - ""
followups:
  - "用户确认后：create-evolution-arch 回填 §8"
  - "用户确认后：create-evolution-prd 修订验收/状态"
  - "契约就绪后再实现；或 code-reviewer 批次选择撤入口"
```

## 红线

- **禁止**将 stub/mock/假成功列为推荐交付方案
- **禁止**未确认修改 PRD hub/分片或批量改业务代码
- **禁止**无链接臆造「官方 API」
- **禁止**把测试 mock 算作集成完成
- **禁止**在 code-reviewer 每份报告末尾无条件广告本 Skill（仅 finding 命中外部集成 stub/契约不明时提示）
- 演化无人值守流程**不得**自动把简报验收草案标为「已实现」
