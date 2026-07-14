---
name: ui-ux-reviewer
description: >
  上线前前端 UI/UX 全量扫描（技术栈无关）：路由勾选、标杆页对照、菜谱分类、视觉密度、CRUD 承载、
  列表行操作（幽灵按钮 / >4 收起为 … 菜单 / 删除红）、语义色与状态分色、空态/错误/分页/文案/深链、
  同构页应复用公共组件、壳与导航完整性、权限表面、异步提交反馈、响应式抽检、
  坏表单与半成品表面；输出可毕业报告；用户确认后按域批量修。
  Use when preparing a frontend/console/admin app for launch, full UI UX audit, page craft graduation,
  design-system consistency scan, shared component reuse audit, empty sidebar/nav integrity, permission UX,
  submit/loading feedback, responsive smoke checks, empty-state CTA review, CRUD surface review,
  list row actions ghost/overflow menu, semantic status colors, delete destructive red,
  or pre-release visual QA across all mounted routes — React, Vue, Svelte, Next, Vite SPA, desktop webviews, etc.
---

# UI/UX Reviewer（上线前 · 前端可毕业）

技术栈无关的**前端产品表面**终局扫描。Agent 已懂通用 UI 评审；本 Skill 补：**路由全量勾选**、**本仓标杆菜谱复制**、**同构页复用公共组件**、**壳·导航·交互**、**反模式零放过**、**可毕业闸门**、**确认后分域修**。

不假设某设计系统或某仓路由。先找前端根、设计 Token、1～3 个标杆页与已有共享壳，再按菜谱并行扫全部已挂路由。

与 [code-reviewer](../code-reviewer/SKILL.md) 分工：假绿/stub/硬编码/后端可靠性/越权深挖 → 用 code-reviewer；**页级视觉·CRUD·文案·密度·空态·组件复用·壳导航·权限表面·异步反馈** → 用本 Skill。重叠（裸 path/YAML、半成品壳）两边都可报，本 Skill 以 UX 证据为主。

## 何时启用

| 场景 | 动作 |
|------|------|
| 上线前 / 里程碑「前端可毕业」 | 路由清单 → 标杆+菜谱 → 并行扫 → 毕业报告 |
| 控制台/管理端大面积页风格漂移 | 标杆对照 + 反模式扫，按域出修复批次 |
| 「对齐 page-craft / 设计系统」 | 套本仓菜谱矩阵，禁止另起 UI 库 |
| 同构列表/详情各写一套壳 | 复用审计 → 先抽/对齐共享再铺页 |
| 空侧栏、菜单 404、提交无反馈、权限假可点 | 壳·导航·交互扫描（见 shell-interaction） |
| 用户只要修 UI 不扫后端 | 本 Skill；缺 API 的假 KPI 记 finding，不替后端深审 |

**不要**：重做已锁定标杆页（仅回归才小修）；借扫描做路由/壳/RBAC **模型**大重构；无契约却造假 KPI「好看」；替代完整无障碍/性能/安全审计。

## 必读顺序（≤3 次）

1. 本文件「流程」+「验收深度」+「严重度」+「非问题」
2. [references/anti-patterns.md](references/anti-patterns.md) + [references/page-recipes.md](references/page-recipes.md) + [references/component-reuse.md](references/component-reuse.md) + [references/shell-interaction.md](references/shell-interaction.md)
3. 报告 [references/report-template.md](references/report-template.md) + 改造方案 [references/remediation-plan.md](references/remediation-plan.md)；执行 [references/scan-workflow.md](references/scan-workflow.md)

## 验收深度（六维）

| 维 | 必须 |
|----|------|
| **视觉** | 统一页头（标题+说明+主操作）；工具栏与主内容分层；KPI/入口有色调表面；禁止卡片套卡片、散装筛选、大面积无意义空白；**Dialog/Sheet/抽屉遮罩宜浅（约 20%–30% 黑），禁半透明以上闷死背景**；**语义色**：页头/入口/KPI 图标勿全站纯蓝；状态（任务/工单/运行等）须分色；见 anti-patterns「语义色」 |
| **CRUD** | Create/Update/Delete/筛选有明确承载（Dialog / Sheet / 独立页 / 行内）；危险操作用确认框；同域无理由混用；**列表行操作 = 幽灵按钮**；**>4 个操作收起为 `…` 下拉**；**删除/危险操作为红色（destructive）**；遮罩见 [shell-interaction.md](references/shell-interaction.md) §6；行操作细则见 [page-recipes.md](references/page-recipes.md) 菜谱 B |
| **完整度** | 空态可行动（说明+CTA）；错误有统一壳+可读文案；列表有分页或明示「仅 N 条」；可深链的 KPI/摘要必须可点 |
| **文案与 Token** | 产品语言一致（无脚手架味标题）；无硬编码 hex（走 Token）；时间等人可读格式 |
| **组件复用** | 同菜谱/同构页须复用本仓页头、列表壳、空态、KPI、表单壳等；禁止平行手写第二套；见 [component-reuse.md](references/component-reuse.md) |
| **壳·导航·交互** | 侧栏/菜单非空壳；菜单↔路由一致；权限不足有诚实表面；主提交有 loading/防连点与成败反馈；弹层遮罩浅透；按产品承诺做响应式抽检；有暗色则抽检可读性。见 [shell-interaction.md](references/shell-interaction.md) |

**API 缺口**：只读字段/筛选/汇总缺契约 → 记 P1「缺契约」或书面**延期**（视觉仍可毕业，但禁止假数据冒充）；补契约须遵守**本仓**已有 codegen/envelope 纪律（勿手改生成物）。细节见 scan-workflow。

## 严重度

| 级 | 含义 | 典型 |
|----|------|------|
| **P0** | 不可毕业 | 有入口的半成品；假 KPI；主路径裸 path/JSON/YAML；危险操作无确认且易误触；**菜单进 404/空白页**；主提交静默失败 |
| **P1** | 上线前应修 | 反模式（套卡、裸 h1、空态无 CTA）；同构未复用；CRUD 混乱；**行操作非幽灵 / >4 未收起 / 删除非红**；**图标·状态全蓝无语义分色**；**空侧栏预留**；菜单路由漂移；权限假可点；提交无反馈/可双提交；**弹层遮罩过深（≥50% / 默认 /80）**；主路径响应式裁切；暗色不可读（若有主题） |
| **P2** | 可跟踪 | 文案微调、次要密度、书面延期 API、建议抽取、仅桌面产品的窄屏问题 |

**置信度**：P0 须带触发场景（谁在哪页做什么会踩中）。构不出场景 → 降 P1/P2 或进备注，勿虚报 P0。

## 非问题

1. **已锁定标杆页**：范围里标为对照的页面默认不改造；仅明显回归才报。
2. **测试 / Storybook 演示**：不进 findings。
3. **营销落地页**：本 Skill 默认面向 **App/Console/Admin**；落地页若用户点名再扫，且勿套控制台密度标准。
4. **已书面延期的 API**：总览登记延期即可，勿重复升 P0（假数据冒充除外 → 仍 P0）。
5. **正当差异**：不同菜谱或设计明确要求的布局差异，不因「没用同一个组件」误报（见 component-reuse「非问题」）。
6. **仅桌面产品**：FE Card 已声明 desktop-only 时，窄屏问题不升 P0/P1（可 P2）。

## 硬规则

1. **先路由清单，再扫**：以路由表/菜单为准做勾选；禁止只扫「顺眼的几个页」。
2. **对齐本仓标杆**：选最完整的 1～3 页（或设计系统 + page-craft skill）；禁止引入本仓没有的 UI 库「统一」。
3. **菜谱先分类再并行**：见 page-recipes；同菜谱用同一套壳。
4. **同构必须复用**：同菜谱 ≥3 页或明显同构 ≥2 页，须复用本仓共享壳；已有组件却平行手写 → P1；尚无共享但多页复制 → P1/P2 并进 S0 抽取。见 [component-reuse.md](references/component-reuse.md)。
5. **壳不可空、交互有回声**：预留导航槽必须有内容或收起；主提交有 pending/反馈；权限表面诚实。见 [shell-interaction.md](references/shell-interaction.md)。
6. **反模式即 fail**：见 anti-patterns（含**行操作幽灵/`…` 收起/删除红**、**语义色与状态分色**）。
7. **简陋/漂移必出改造方案**：P0·P1 的视觉·完整度·复用·壳类 finding 须挂 `RP-*`（菜谱 + 对标页 + 区块结构 + 复用/抽取 + 不做清单）。见 [remediation-plan.md](references/remediation-plan.md)。禁止只写「优化 UI」。
8. **先报告后改**：确认批次（含采用哪些 RP）后再动；按**域或菜谱**拆 subagent，共享壳只串行改。
9. **禁止假绿表面**：无 API 不造假 KPI；未就绪撤入口或空态诚实说明。
10. **方案只对齐本仓**：改造方案禁止新 UI 库、禁止无契约假 KPI、禁止借机改 RBAC/路由模型。
11. **列表行操作与语义色**：行末 ghost；>4 → `…` 菜单；删除 destructive 红；图标/状态勿全蓝。见 [page-recipes.md](references/page-recipes.md) 菜谱 B + anti-patterns。

---

## 流程（必须）

### Phase 0 · FE Card（主 agent，短）

| 探测 | 产出 |
|------|------|
| 前端根 | `fe/` / `web/` / `apps/web` / `src/`… |
| 框架与 UI | React/Vue/…；组件库；Token/CSS 变量位置 |
| 路由入口 | `main.tsx` / `router` / `app` 路由表、侧栏菜单 |
| 标杆页 | 1～3 个最完整页路径（用户可点名；否则自动挑） |
| 共享壳目录 | `components/` / `templates/` 中页头、列表壳、空态、KPI、表单壳等 |
| 响应式承诺 | 桌面 only / 含平板 / 含移动 |
| 主题 | 有无 dark / 多主题开关 |
| RBAC | 有无角色权限表面（有则必查权限 UX） |
| 设计 skill | 仓内 page-craft / design-system → 叠加遵守 |
| 范围 | 整前端 / 若干域 / 用户排除列表 |

写出 **FE Card**（进报告）。模板见 [scan-workflow.md](references/scan-workflow.md)。

### Phase 1 · 路由勾选表

列出全部**已挂**业务路由（排除 auth 回调、纯重定向、故事书）。每行：`路径 | 页面文件 | 菜谱 | 状态(待扫/通过/fail/延期)`。

实现前以路由源文件为准差分，避免漏路由。**同时**做菜单↔路由对账（见 shell-interaction）。

### Phase 2 · 菜谱分类

按 [page-recipes.md](references/page-recipes.md) 给每页贴菜谱 A–F（可扩展）。标杆页注明「锁定」。

### Phase 3 · 并行扫描 + 复用审计

按**域**或**菜谱**开多个 readonly explore subagent（提示词见 scan-workflow）。每页按**六维** + 反模式打分。

另开（或主 agent 兼任）：
- **复用审计**（[component-reuse.md](references/component-reuse.md)）
- **壳·导航·交互**抽检（[shell-interaction.md](references/shell-interaction.md)；可并入域 lane）

失败 lane：重试 1 次 → 主 agent 补扫 → 否则 Blind spot；有 Blind spot 不得宣称「可毕业」。

### Phase 4 · 毕业报告

合并 finding → 为简陋/复用/壳类补齐 **改造方案 RP-***（[remediation-plan.md](references/remediation-plan.md)）→ 套 [report-template.md](references/report-template.md) → **停等确认**（确认批次 = 默认采用所列 RP，除非用户改写）。

### Phase 5 ·（确认后）分域修复

- 共享壳抽取/对齐 / Token / 通用空态 → **串行**一代理（S0，优先于分域改皮）  
- 各域页面按 **已确认 RP** 施工（import 共享壳 + 区块顺序）→ 可并行；**禁止**并行改同一共享文件  
- 回归：反模式关键词 + 同菜谱抽检 ≥2 页 + 标杆页 + 菜单冒烟；有测则跑相关前端测  
- 完成摘要写明关闭的 finding ID 与 RP ID；若偏离方案须说明原因  

可选波次（大仓）：W1 共享壳结论与抽取 → W2 分域套菜谱 → W3 契约补齐 → W4 勾选 100% 或书面延期。小仓可压成「一报告 + 一批修」。

---

## 进度清单

```
- [ ] 0. FE Card + 标杆 + 共享壳 + 响应式/主题/RBAC 承诺
- [ ] 1. 路由勾选表 + 菜单对账
- [ ] 2. 菜谱分类
- [ ] 3. 并行扫（六维 + 反模式）+ 复用审计 + 壳/交互；Blind spots 已处理或标注
- [ ] 4. 毕业报告 + 改造方案 RP；停等确认
- [ ] 5. （确认后）按 RP：S0 共享 → 分域修 + 回归；勾选更新
```

## 与 code-reviewer

| 问题 | 用谁 |
|------|------|
| stub / 假绿 / 密钥门禁 / 后端可靠性 / API 越权 | code-reviewer |
| 页头/套卡/空态/CRUD/文案/密度/同构未复用/空侧栏/提交反馈/权限表面体验 | **本 Skill** |
| 能力无入口 / 半成品页 | 本 Skill 必报；整仓生产就绪可再跑 code-reviewer L7 |

## 禁止

- 未做路由勾选就宣称可上线  
- 用新 UI 库或新视觉语言「统一」  
- 无契约造假 KPI / 写死演示数当正式数据  
- 三页各改「看起来像」却仍不抽/不引用共享壳  
- 简陋页只写「优化 UI」却无 RP 改造方案  
- 未确认就大面积改页  
- 改造方案引入新 UI 库或无契约假 KPI  
- 并行舰队同时改同一共享组件  
- Blind spot 未披露却写「可毕业」
- 把完整 WCAG/性能/渗透测试塞进本 Skill 当必做项

## 关联

- [anti-patterns.md](references/anti-patterns.md) · [page-recipes.md](references/page-recipes.md)
- [component-reuse.md](references/component-reuse.md) · [shell-interaction.md](references/shell-interaction.md)
- [remediation-plan.md](references/remediation-plan.md) · [report-template.md](references/report-template.md) · [scan-workflow.md](references/scan-workflow.md)
- 姊妹 skill：[code-reviewer](../code-reviewer/SKILL.md) · [browser-reviewer](../browser-reviewer/SKILL.md)（真机登录截图走查 + Console；静态页级扫用本 Skill）
