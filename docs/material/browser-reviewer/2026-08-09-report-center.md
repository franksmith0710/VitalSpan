# VitalSpan 真机浏览器走查 · 报表中心产品闭环

## 总览

| 项 | 内容 |
|----|------|
| 范围 | 报表中心 r3 收官主路径：`/admin/reports/center` · `/admin/reports` · `/admin/reports/templates` · `/admin/reports/schedules` · `/admin/reports/view/:id` |
| 剧本 | **无业务剧本**（`.dev/playbooks/2026-08-09/critical.md` 为系统管理域）→ 降级 **generic 报表中心幕** |
| active_env | `local` |
| Dev Card | browser `http://localhost:5173/admin` · api `http://localhost:8000` · 角色 `admin` · 密码 `***`（`VITALSPAN_DEV_ADMIN_PASSWORD`） |
| 浏览器后端 | **MCP browser**（Cursor IDE Browser） |
| Viewport | desktop 1440×900（MCP 默认） |
| Baseline | **无**；本次新收候选金样 **4** 张 |
| 产物目录 | `.dev/walkthrough/2026-08-09/` |
| 勾选 | 过 **8** · fail **0** · 跳过 **1**（R8 最近访问无数据时跳过） |
| Console error | **0**（走查过程未捕获未处理 error） |
| P0 / P1 / P2 | **0** / **0** / **2** |
| 建议 | **真机可毕业**（主链）；SMTP 真投递与 G5 真 PDF 仍须 staging |

一句话结论：报表中心 Hub 双线叙事、单入口、失败队列、模板页 B-7 说明、查看页「示例态」Badge 均在本地真机验证通过；SMTP 未启动时的失败文案诚实可理解。

### Dev Card（摘要）

- active_env：`local`；health 200；fe dev + uvicorn 已监听
- 登录：API 注入 `vitalspan:access_token` 后进入壳层（表单登录页可达）
- allow_writes：`true` · allow_destructive：`false`
- .dev gitignore：OK

## Blind spots

| 项 | 说明 |
|----|------|
| 批量导入 dry-run UI | 未在本轮点开 `BatchImportPanel` 上传 JSON（只读抽检未覆盖写路径） |
| viewer 角色重试门控 | 未切换 `viewer` 账号验证 Hub 重试按钮隐藏（B-20 由 vitest 覆盖） |
| G5 Playwright 真 PDF | 需 FE+Chromium 联调；本轮未触发看板定时推送导出 |
| MailHog 附件 | 本地 SMTP :1025 未启动；Hub 已展示预期失败说明 |

## 走查勾选表（摘要）

| ID | 步骤 | 结果 | 截图 |
|----|------|------|------|
| R0 | health + admin 登录态 | 过 | — |
| R1 | 报表中心 Hub 标题与双线描述 | 过 | `R1-hub.png` |
| R2 | 侧栏仅「报表中心」单入口 | 过 | `R2-sidebar`（含 R1） |
| R3 | 展开文档模板区 + 双线副标题 | 过 | `R3-doc-templates-expanded.png` |
| R4 | 预制分析 `/admin/reports` 列表 | 过（DOM） | 截图超时 |
| R5 | 文档模板页 B-7 双线说明 Alert | 过 | `R5-templates.png` |
| R6 | 定时报告页 + 近期失败面板 | 过（DOM） | `R6-schedules.png` |
| R7 | 模板查看页 readiness「示例态」 | 过（DOM） | 截图超时 |
| R8 | Hub 最近访问 Link 深链 | 跳过 | 本轮会话未稳定复现最近访问条目 |

## Console / 网络

| 级 | 次数 | 样例 | 关联 step |
|----|------|------|-----------|
| error | 0 | — | — |
| 5xx | 0 | 主路径 API 均 200 | R0–R7 |
| 预期降级 | 2 | Hub/调度页展示 SMTP `localhost:1025` 连接失败说明 | R3/R6 |

API 抽检：`GET /api/v1/reports/schedules/executions/recent-failures` → 200，total=2（与 UI 一致）。

## 视觉 / 像素 / 风格

| ID | 类型 | 说明 | 证据 |
|----|------|------|------|
| V1 | 读图 | Hub 页头、运行概览、快捷创建双卡片叙事清晰；无「后续能力」 | `R1-hub.png` |
| V2 | 读图 | 文档模板页「两条报表产品线」Alert 与 B-7 hint 可见 | `R5-templates.png` |
| V3 | 风格（已知债） | Hub 卡片 vs 调度 ListKit 仍两套范式 | B-6 wontfix |

**无 baseline**：未做数字像素 diff。

## 待确认金样（新页自动收录）

| 路由 | viewport | 候选图 | 建议 |
|------|----------|--------|------|
| `/admin/reports/center` | desktop | `.dev/baselines/_candidates/report-center-R1-hub.png` | 认可为 Hub 金样 |
| `/admin/reports/center`（展开模板） | desktop | `…/report-center-R3-doc-templates-expanded.png` | 认可 |
| `/admin/reports/templates` | desktop | `…/report-center-R5-templates.png` | 认可 |
| `/admin/reports/schedules` | desktop | `…/report-center-R6-schedules.png` | 需人工确认（截图可能与路由竞态） |

## P2 Findings

### P2-1 · MCP 截图偶发超时

| 项 | 内容 |
|----|------|
| 现象 | `browser_take_screenshot` 在 `/admin/reports/view/:id` 与 `/admin/reports` 两次超时 |
| 影响 | 证据链缺 R4/R7 静态图；DOM 文本已验证通过 |
| 建议 | 下轮用 Playwright `pnpm exec playwright install chromium` 后跑 `fe/scripts/report-center-browser-walkthrough.mjs` 补图 |

### P2-2 · 深链导航偶发落回默认看板列表

| 项 | 内容 |
|----|------|
| 现象 | `browser_navigate` 至 `/admin/reports/schedules` 等路由时，偶发落到 `/admin/dashboards` |
| 复现 | 刷新 `vitalspan:access_token` 后 `location.assign` 可恢复 |
| 影响 | 自动化走查需每段路由前确认 token；人工使用 Link 点击正常 |
| 建议 | 非阻断；E2E 脚本用 API 登录 + `page.goto` 更稳 |

## 主路径验收对照（r3 闭环）

| 刺点 | 真机证据 |
|------|----------|
| B-13～B-17 单入口 + 双线叙事 | Hub 标题/描述/快捷创建文案一致 |
| B-18 dry-run | 未 UI 点检（API 已由 pytest 覆盖） |
| B-20 重试门控 | admin 可见「重试」；viewer 未测 |
| B-21 文档 sync | UI 无「后续能力」 |
| B-22 折叠副标题 | 「固定版式文档…」副标题在 Hub 展开区可见 |
| B-2 placeholder/readiness | 查看页 Badge「示例态」+ 导出禁用说明 |
| B-7 viz vs doc | 模板页 Alert「两条报表产品线」 |
| B-4 SMTP 诚实 | 失败面板展示 MailHog 配置提示 |

## 扫描方式

- MCP browser：登录态注入 → Hub 点击/展开 → 多路由 DOM 读数
- 辅助：Python API 抽检（health、catalog、recent-failures）
- Playwright 本地浏览器：**未安装**（`playwright install chromium` 进行中未完成）

## 后续

1. 用户确认候选金样 → 移入 `.dev/baselines/`
2. 可选：staging + MailHog 验证邮件附件
3. 可选：`pnpm exec playwright install chromium` 后补 R4/R7 截图
