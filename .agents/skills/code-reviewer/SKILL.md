---
name: code-reviewer
description: >
  生产就绪 / 产品体验 code review（技术栈无关）：先识别栈再拆 subagent 并行扫描假绿·stub 零容忍、
  硬编码、可靠性缺口、路径/JSON/YAML 裸表单、UI 风格不一致、产品表面（能力无入口 / 有入口半成品）；
  输出标准分级报告；用户确认后批量修复。
  Use when reviewing any repo for production readiness, fake-green stubs (no flag exceptions), hardcoding,
  reliability gaps, bad form UX (raw path/yaml/json), UI style inconsistency, missing client entry points,
  skeleton/fake-data shells, incomplete interactions, or batch-fixing those findings — Go, Node, Python,
  Java, Rust, frontend SPA, mobile, infra as code, monorepo, etc.
---

# Code Reviewer（生产就绪 · 产品体验）

技术栈无关的专项评审。Agent 已懂通用 code review；本 Skill 补：**易漏检的共性问题**、**先识栈再扫**、**标准报告**、**确认后 subagent 批量修**。

不假设仓库是 Go / React / Ark / Nex。先分析技术栈与目录布局，再按栈选择搜法与并行 subagent。

## 何时启用

| 场景 | 动作 |
|------|------|
| 任意仓上线前 / 里程碑就绪评审 | 范围=整仓；识栈 → 并行扫描 → 标准报告 |
| PR / 改动涉及 stub、默认配置、表单、新页面 | 范围=PR·变更面（主根+上追一层）；按发现目录扫 |
| 「批量修假绿 / 硬编码 / 表单 / 风格」 | 先报告 → **等确认** → subagent 修 |
| 多仓对比共性问题 | 同一 rubric，分仓 Stack Card + 对照表 |

**不要**：替代完整安全审计、在未确认时大范围改代码、把单栈搜法硬套到所有语言。

## 必读顺序（≤3 次）

1. 本文件「识栈 → 并行扫」+「严重度」+「非问题」+「宣称判据」+「合并去重」
2. [references/stack-detection.md](references/stack-detection.md)（含 Phase 1 提示词模板）+ [references/finding-catalog.md](references/finding-catalog.md)
3. 报告用 [references/report-template.md](references/report-template.md)；批量修用 [references/batch-fix-workflow.md](references/batch-fix-workflow.md)；格式样例 [references/examples.md](references/examples.md)

严重度细则：[references/severity-rubric.md](references/severity-rubric.md)

## 严重度总则

| 级 | 含义 | 典型 |
|----|------|------|
| **P0** | 生产误导或必炸 | **假绿 / 任何可激活 stub**、生产硬编码密钥/假数据、**密钥/dev 默认门禁已写未调用或缺失**、宣称可用实未实现、静默做错事、**有入口的半成品**（骨架/假数据/残交互） |
| **P1** | 上线前应修 | 危险可靠性默认值、**裸 path/JSON/YAML 表单**、同产品 UI 风格严重不一致、无健康探针、**CI/部署门禁未接线**、**服务端有能力但宣称端全无入口** |
| **P2** | 技术债 | 未引用的死代码、文档漂移、版本元数据无意义（`0.0.0`/`*-dev`）、未宣称可用且无入口的规划缺口 |

**更致命（优先报、优先修）**：可靠性 · 真实缺口 · 硬编码 · **假绿/stub** · **半成品表面** · **坏表单 UX** · **风格不一致**。

**门禁分流**：拒绝已知 dev 密钥 / stub 逃逸进进程 → 缺失或未调用 = **P0**；仅 CI/Helm 未拦 dev values → **P1**（除非默认编排已把 stub/密钥打进准生产 → P0）。

## 非问题（勿报 / 勿进 findings）

1. **默认管理员 + 部分种子数据**：首次启动写超管与平台种子为预期；假定首次登录后改密。可作 P2「文档写清必改密」，勿当漏洞标题。
2. **测试双**：`*_test.*`、`*.spec.*`、`__mocks__`、fixture、**仅** Storybook/设计系统 demo 中的 mock → **永不进报告**。**非测试主路径** stub/mock 一律要报，哪怕挂在 env/flag/`profile=dev` 后面。
3. **未宣称可用、且全端无入口的规划缺口** → P2；已挂菜单/路由/按钮，或已「宣称」→ 升 P0/P1（见下）。

### 「宣称」判据（L7 / 假绿升级用）

下列**任一**成立即视为已宣称可用（用于升 P0/P1，勿凭感觉）：

1. UI 文案 / 空态 / CTA：写「已支持」「已具备」「可用」等交付语气（非「即将推出」且入口仍可点主流程 → 仍按半成品报）
2. 仓库 README / 对外 docs / 变更说明列出该能力为已交付
3. OpenAPI/SDK/产品对照表将该能力标为 GA / shipped（非 experimental 且无「API only」限定）

未命中以上且全端无入口 → P2 规划缺口；命中宣称但无入口 → P1；有入口但不完整 → P0/P1。

## 硬规则

1. **Stub 零容忍（非测试）**：业务/BFF/前端主路径只要存在 stub/mock/假成功/占位实现 → **必报**。显式 env/flag、Badge、`degraded`、诚实失败 **都不能**当「设计如此」降级放过；修法是删除 stub 并接真实实现，或撤掉入口与宣称，而不是加开关。
2. **假绿必报**：stub/mock 返回成功态、或 UI 用假数据/骨架冒充已交付 → P0。
3. **产品表面必对账**：服务端已有能力但宣称客户端**全端无入口** → 至少 P1；有入口但骨架屏常驻、假数据、按钮无动作、CRUD/提交流程残缺 → P0/P1（见 catalog §7）。
4. **硬编码分场景**：启动默认密钥 + 门禁缺失/未调用 → **P0**；live 写死内网 IP、假 KPI → P0/P1；仅本地默认 + 有 prod 模板且门禁已接线 → 不单开「弱口令种子」P0（可 P2 文档提醒）。
5. **表单禁裸协议**：主路径手填 **文件系统路径** 或 **原始 JSON/YAML** → 至少 P1；改为选择器、结构化表单、模板库、上传或可视化编排。
6. **风格不一致必评**：同级页面页头/筛选壳/空态/异步态混用 → P1；对齐**本仓**已有最完整标杆页或设计系统，禁止另起 UI 库「统一」。
7. **先识栈，再扫，优先 subagent 并行**：见下文；禁止用单一 Go/React 搜法扫完就交差。
8. **先报告后改代码**：确认后按 [batch-fix-workflow.md](references/batch-fix-workflow.md) 拆修。
9. **证据可定位**：路径 + 行为；区分「测试双」vs「生产路径 stub」。

---

## 识栈 → 并行扫（必须）

### Phase 0 · 技术栈与边界（主 agent，短）

用根目录清单 + 锁文件 + 入口，写出 **Stack Card**（写入报告总览）：

| 探测 | 看什么 |
|------|--------|
| 语言/运行时 | `go.mod`、`package.json`、`pyproject.toml`/`requirements.txt`、`pom.xml`/`build.gradle`、`Cargo.toml`、`*.csproj`、`Gemfile`… |
| 前端 | `fe/`/`web/`/`apps/*`、Vite/Next/Webpack、UI 库痕迹 |
| 后端形态 | REST/gRPC/GraphQL、worker/agent/sidecar、monorepo packages |
| 配置与密钥 | `etc/`、`.env*`、`values.yaml`、`docker-compose*`、IaC |
| 数据 | migrations、seed、ORM |
| 交付 | Dockerfile、Helm、systemd、Makefile、CI |
| 宣称材料 | README / docs / OpenAPI 标签（供 L7「宣称」判据） |

细节与按栈搜法：[references/stack-detection.md](references/stack-detection.md)。

**范围模式**（写入 Stack Card「范围」）：

| 模式 | 何时 | 扫法 |
|------|------|------|
| **整仓** | 上线前 / 里程碑 | 全 lane；根路径 = 仓根 |
| **PR / 变更面** | 用户指定 PR、分支 diff、模块 | 以 diff 触及目录为**主根**；L1/L2/L7 仍向上追 1 层调用方/路由表/菜单（防只改 stub 周围漏报）；无关 app 可跳过并写明 |
| **多仓对比** | 用户点名多仓 | 每仓独立 Stack Card + 同 lane 并行，主 agent 出对照表 |

**产出**：范围模式、栈列表、建议并行 lane（通常 4～7 条，含 L7）、本仓「非问题」补充（**勿**把 stub+flag 列入非问题）。

### Phase 1 · 并行扫描（默认用 Task/subagent）

主 agent **不要**在有多 lane 时独自串行扫整仓。按 lane **同时**起多个 `explore`（readonly）subagent，每条 lane 只领一类 finding + 明确根路径/扩展名。

| Lane | 查什么 | 典型指派 |
|------|--------|----------|
| L1 假绿 / stub | 任意非测试 stub/mock/占位（含 env/flag）、假成功、NotImplemented 挂菜单 | 后端 + BFF + 前端 |
| L2 硬编码 | 密钥默认值、内网 IP、假 KPI、**进程门禁是否调用** | 配置 + 启动入口 |
| L3 可靠性 | MQ/队列默认、吞错、无 health、租户/隔离、未接线 Driver | 服务端核心 |
| L4 坏表单 | path/JSON/YAML 主路径录入 | **前端**（有则必开） |
| L5 风格 | 页头/壳/空态不一致 | 前端；对照本仓标杆 |
| L6 可选 | IaC/CI 把 dev 逃逸打进 prod | deploy/ci；无 IaC/CI 则跳过并注明 |
| L7 产品表面 | API/能力 vs 宣称端入口对账；有入口的骨架/假数据/残交互 | 后端路由清单 × 各端路由/菜单 |

**并行降级**（仍须按 lane 勾选进度清单，禁止「只用 Go 搜法交差」）：

- 无 Task/subagent，或仓极小（约少于 30 源文件且单包）→ 主 agent 可按 lane **顺序**自扫，报告「扫描方式」写明 `主 agent 串行 lane`。
- 某 lane subagent **失败/超时**：重试 1 次 → 仍失败则主 agent 对该 lane 做一次受限补扫（关键词 + 入口文件）→ 仍不足则报告该 lane 为 **Blind spot**，**不得假装已扫**；其余 lane 照常汇总。

**Subagent 提示**：必须用 [stack-detection.md](references/stack-detection.md) 中的提示词模板；含项目根、范围模式、栈 Card、lane ID、搜法、排除测试、回传格式。

多仓或 monorepo 多 app：**按仓/app 再拆一层**，同 lane 可并行。

### Phase 2 · 汇总报告

1. 收集各 lane 结果 + Blind spots  
2. **合并去重**（见下）→ 分配稳定 ID  
3. 套 [report-template.md](references/report-template.md) → **停等确认**

#### 合并去重协议

| 规则 | 做法 |
|------|------|
| 去重键 | `类别归一` + 主证据路径（或同一路由/菜单键）+ 同一根因一句话 |
| 级别冲突 | **取更严**（P0 优先于 P1 优先于 P2） |
| L1 ∩ L7 | 同一 stub 既假绿又挂入口 → **一条 P0**，类别写 `假绿·stub / 产品表面`，证据两边都留 |
| L2 ∩ L1 | 假 KPI / 固定成功既是硬编码也是假绿 → 归 **假绿** P0 |
| 跨 lane 表述不同 | 保留信息更全的标题与建议；次条并入「证据」而非第二 finding |
| 稳定 ID | 按最终列表编号 `P0-1…` `P1-1…`；报告内一经发出，确认修复时**勿重排**已确认 ID（追加新发现用新号） |

### Phase 3 ·（确认后）批量修

见 [batch-fix-workflow.md](references/batch-fix-workflow.md)。

调度硬规则：**前置串行（公共面）→ 隔离并发（文件集合无交集 + 分发前冲突预检）→ 后置串行校验**；任务绑定报告稳定 finding ID；同表 DDL / 根依赖 / 共享模型禁止进并发队列。

---

## 扫描进度清单

```
- [ ] 0. 识栈 → Stack Card + 范围模式 + lane 划分
- [ ] 1. 并行（或降级串行）lane：假绿·stub / 硬编码 / 可靠性 / 坏表单 / 风格 / 产品表面（+可选 IaC）
- [ ] 1b. 失败 lane 已重试/补扫或标 Blind spot
- [ ] 2. 合并去重 + 稳定 ID；应用「非问题」过滤（**勿**把带开关的 stub 当非问题）
- [ ] 3. 标准报告（含 Blind spots / 跳过 lane）
- [ ] 4. 建议修复批次；停等用户确认
- [ ] 5. （确认后）前置串行 → 冲突预检 → 隔离并发修 → 后置校验 + 回归
```

通用搜法种子（**必须按栈改写**，完整表见 stack-detection；**一律排除测试双**）：

```bash
# 假绿 / stub（命中非测试代码一律记 finding，不论有无 flag）
rg -n -i 'stub|FORCE_STUB|TODO:\s*implement|NotImplemented|not implemented|coming soon|mockData|fakeSuccess|placeholder|isDemo|useMock' \
  --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/vendor/**' \
  --glob '!**/*_test.*' --glob '!**/*.test.*' --glob '!**/*.spec.*' --glob '!**/__mocks__/**'

# 半成品表面（前端）
rg -n -i 'skeleton|Skeleton|mockData|fakeData|coming soon|TODO|disabled.*soon|lorem ipsum' \
  --glob '!**/node_modules/**' --glob '!**/*_test.*' --glob '!**/*.test.*' --glob '!**/*.spec.*' --glob '!**/__mocks__/**'

# 硬编码密钥/内网
rg -n -i 'password\s*=\s*['\''"]|secret|api[_-]?key|192\.168\.|CHANGE_ME|dev-only' \
  --glob '!**/node_modules/**' --glob '!**/*_test.*' --glob '!**/*.test.*' --glob '!**/*.spec.*' --glob '!**/__mocks__/**'
```

## 标准报告（必须）

含 **Stack Card** + P0→P2 findings + 非问题已排除 + 待确认批次。模板见 report-template。

## 批量修复门闩

| 步骤 | 要求 |
|------|------|
| 报告已交 | 含栈与 P0/P1 |
| 用户确认 | 明确批次或「全部 P0」 |
| 再动手 | 按 [batch-fix-workflow](references/batch-fix-workflow.md)：串行公共 → 无冲突并发分片 → 后置校验；禁止一次混改无关域 / 共享文件 |

## 禁止

- 未识栈就用 Go/YAML 专用路径下结论
- 有多 lane 且可用 subagent 时仍整仓单线程死扫（极小仓/无 Task 的降级除外，且须按 lane 勾选）
- 把默认管理员种子写成安全漏洞标题
- 把「有 env/flag 的 stub」写成非问题或设计如此
- 只列文件名无行为说明
- 未确认就大范围改代码
- 为「统一风格」引入本仓没有的新 UI 库
- 把测试 mock / 纯 Storybook demo 计入生产假绿
- 只扫后端 stub、不对账「能力 vs 宣称端入口 / 有入口的半成品」
- lane 失败却在报告中当作已扫干净

## 集成研究 followup（条件触发）

报告末尾**不要**无条件广告外部研究技能。仅当 finding 同时像「外部集成」且「契约/真接路径不明」时，在报告加一小节 **集成研究建议**：

| 命中信号（示例） | 动作 |
|------------------|------|
| stub/假绿位于 OAuth/OIDC/LDAP/SMTP/短信/对象存储/云或 HCI 适配器 | 提示先跑 [integration-research](../integration-research/SKILL.md)，确认简报前勿盲目「真接」batch-fix |
| 宣称已对接某厂商/协议，但无真实外部调用或仅有假成功 | 同上；或本批次直接**撤入口**，研究完成后再开实现 |
| 普通业务 stub（自有 DB/API、无仓外依赖） | **不**提示 integration-research；按真接或撤入口修 |

格式示例：

```text
## 集成研究建议
- P0-3（深信服适配器 stub）→ integration-research；契约确认前本批可选：撤入口
- 其余 P0 按 batch-fix 真接/撤入口即可
```

## 关联

- [stack-detection.md](references/stack-detection.md) · [finding-catalog.md](references/finding-catalog.md)
- [severity-rubric.md](references/severity-rubric.md) · [report-template.md](references/report-template.md)
- [batch-fix-workflow.md](references/batch-fix-workflow.md) · [examples.md](references/examples.md)
- 姊妹 skill：[ui-ux-reviewer](../ui-ux-reviewer/SKILL.md)（上线前页级视觉·CRUD·空态·菜谱全量扫；本 Skill 的 L4/L5 为轻量版）· [browser-reviewer](../browser-reviewer/SKILL.md)（`.dev` 真机截图走查 + Console）· [integration-research](../integration-research/SKILL.md)（外部协议/厂商对接研究简报；仅上表条件触发）
- 若仓内有 page-craft / design-system skill → 风格 lane 叠加使用；深扫可改用 ui-ux-reviewer
