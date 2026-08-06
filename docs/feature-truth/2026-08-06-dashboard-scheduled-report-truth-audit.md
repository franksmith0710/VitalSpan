# Feature Truth Audit：看板/大屏定时报告

| 字段 | 值 |
|---|---|
| 日期 | 2026-08-06 |
| 范围 | 看板/大屏分享页 → 草稿 → 激活 → 立即执行 → Playwright PDF → 投递 → 执行历史 → 重试 |
| 结论 | **BROKEN（主链路未打通）** |
| 总分 | **4.6 / 10 · D** |
| 核验方式 | 静态全量枚举、前后端隔离测试、本地浏览器走查、运行中前后端真实 PDF 探针 |
| 不在范围 | 不修改业务代码；仅记录证据与修复建议 |

## 1. 结论

不能宣称“看板定时报告链路已打通”：

1. 运行中的 `/api/v1/reports/schedules/export-health` 在界面显示“Playwright 渲染就绪”，但实际 PDF 导出返回 `502 DASH_EXPORT_RENDER_FAILED`。后端 Playwright 访问 `http://127.0.0.1:5173/export/...` 时被拒绝；本机前端仅能由 `localhost:5173` 访问。
2. 缺 SMTP 时，分享页明确显示不可达，但“创建定时报告”按钮仍可用；创建成功不代表投递可用，真实执行只能在 PDF 成功后才会暴露投递失败。
3. 看板主路径仍可选择“Excel 布局清单”，从而绕开视觉 PDF 与 Playwright 前置检查；这与“仅可视化 PDF 为主路径”的预期矛盾。
4. 因真实 PDF 生成失败，本轮未获得真实 `%PDF`、`artifactKind=visual_snapshot`、产物下载字节、真实邮件附件或真实失败后重试的正向证据。

## 2. T1–T7 能力与静态链路

```text
DashboardShareDialog
  → DashboardSchedulePanel
  → POST /api/v1/reports/schedules
  → POST /transition (schedule)
  → POST /execute (Idempotency-Key)
  → executor._export_dashboard_attachments
  → POST /api/v1/dashboards/{id}/export-jobs
  → render_dashboard_visual_pdf (Playwright)
  → dispatch_artifact (SMTP / 企业微信 / 钉钉)
  → executions history / artifact meta / retry
```

| ID | 能力 | 入口 / API | 判定 | 证据 |
|---|---|---|---|---|
| T1 | 创建草稿 | `POST /reports/schedules` | PARTIAL | 测试创建通过；浏览器控件存在 |
| T2 | 预检 | `delivery-health`、`export-health` | BROKEN | SMTP 状态真实；导出健康误报 |
| T3 | 激活 / 状态机 | `POST /schedules/{id}/transition` | PARTIAL | 隔离 API 测试通过；未做真实定时触发 |
| T4 | 立即执行与视觉 PDF | `POST /schedules/{id}/execute` → `export-jobs` | BROKEN | 真实 PDF 502 |
| T5 | 投递 | SMTP / 企业微信 / 钉钉 | PARTIAL | mock 测试通过；本机 SMTP 不可达，真实附件未验 |
| T6 | 历史 / 产物 | executions、artifact meta/download | PARTIAL | UI / mock 记录存在；无真实产物可下载 |
| T7 | 失败与重试 | `POST /executions/{id}/retry` | PARTIAL | smoke 覆盖按钮；真实失败重试未达 |

## 3. B1–B15 前端控件清单

| ID | 控件 | 处理 / 目的 | 判定 |
|---|---|---|---|
| B1 | 看板列表“更多操作 → 分享” | 打开分享路由 | REAL |
| B2 | “查看全部定时报告” | 跳转调度列表 | REAL |
| B3 | 频率、小时、分钟、高级 Cron | 形成 cron | PARTIAL |
| B4 | 接收人“添加”、类型 / 角色选择 | 填写 recipients | PARTIAL |
| B5 | 时区下拉 | 设置 timezone | PARTIAL |
| B6 | PDF 可视化快照单选 | 选择视觉 PDF | PARTIAL |
| B7 | Excel 布局清单单选 | 选择非视觉清单 | **BROKEN（不应出现在主路径）** |
| B8 | 邮件复选 | SMTP 投递 | PARTIAL |
| B9 | 企业微信复选 | webhook 投递 | PARTIAL |
| B10 | 钉钉复选 | webhook 投递 | PARTIAL |
| B11 | 创建定时报告 | 创建草稿 | PARTIAL |
| B12 | 激活 / 暂停 / 恢复 / 取消 | 状态迁移 | PARTIAL |
| B13 | 试发邮件 / 立即执行 | 执行调度 | PARTIAL |
| B14 | 执行历史“重试” | 重跑失败或降级执行 | PARTIAL |
| B15 | 文档模板折叠区与入口 | 次级能力导航 | REAL |

浏览器实际走查（admin 会话，`Visual PDF e4742b`）显示 B1–B11 均已渲染；页面有 1 个组件、PDF 服务“就绪”，同时 SMTP `localhost:1025` 连接失败。B11 没有因 SMTP 失败禁用。

## 4. 动态验证记录

| 场景 | 期望 | 实际 | 判定 |
|---|---|---|---|
| FE smoke | 分享、表单、预检、中心、导出页可交互 | 5 文件 / 19 测试通过 | PARTIAL |
| 后端隔离 | 创建、激活、空看板拒绝、历史、mock 附件 | 26 通过、2 跳过；PDF renderer 与 SMTP 均被 mock | PARTIAL |
| 现有诚实性门禁 | 回归应全绿 | 1 失败：`DashboardSharePage.tsx` 不再含旧 `layoutJson` 字面锚点 | PARTIAL（测试漂移，不能作绿灯） |
| 真实 FE 可达性 | live export 测试探测前端 | 默认配置下跳过；`127.0.0.1:5173` 不可达 | BROKEN |
| 真实 PDF | 201、visual snapshot、`%PDF` 下载 | `FE_BASE_URL=localhost:5173` 后进入真实路径，但后端自身仍访问 `127.0.0.1:5173`，返回 502 | BROKEN |
| 空看板 | 禁止创建 / 导出 | 隔离 API 返回 422 `DASHBOARD_EXPORT_EMPTY` | REAL |
| 缺 SMTP | 不假成功且阻断或明确失败 | UI 显示不可达但仍允许创建；真实执行被 PDF 失败抢先阻断 | PARTIAL |
| 缺 Chromium | 不允许创建且给出可操作提示 | 仅测试 import 缺失；未覆盖“包在、浏览器二进制缺失” | UNVERIFIED |
| 邮件附件 | MailHog 收到 PDF 附件 | 仅 `smtplib` mock；真实 SMTP 不可达 | UNVERIFIED |
| 失败后重试 | 失败记录→重试→可读新记录 | smoke/mock 覆盖；无真实失败执行可重试 | UNVERIFIED |

真实导出失败的原始关键输出：

```text
POST /api/v1/dashboards/{isolated-dashboard-id}/export-jobs → 502
DASH_EXPORT_RENDER_FAILED
Page.goto: net::ERR_CONNECTION_REFUSED at
http://127.0.0.1:5173/export/dashboard/{id}?token=...
```

本轮还运行了附加报告回归集合，得到 `47 passed / 33 failed`；失败主要来自 R58/R238 旧测试夹具向 UUID 参数传入非 UUID 字符串，未被计入主链路正向证据，也不能掩盖上述真实 502。

## 5. 五维评分与覆盖矩阵

评分：每维 0–2（连接 Link、正确性 Correctness、数据 Data、异常 Exception、反馈 Feedback）。

| 能力 | GATE | CHAIN | UI | BROWSER | L | C | D | E | F | 判定 |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|
| T1 创建草稿 | ✓ | ✓ | ✓ | ✓ | 2 | 2 | 2 | 1 | 2 | PARTIAL |
| T2 预检 | ✓ | ✓ | ✓ | ✓ | 2 | 0 | 1 | 1 | 2 | BROKEN |
| T3 激活 | ✓ | ✓ | △ | — | 2 | 2 | 1 | 1 | 1 | PARTIAL |
| T4 视觉 PDF | ✓ | **✗** | △ | — | 2 | 0 | 0 | 2 | 1 | BROKEN |
| T5 投递 | ✓ | △ | ✓ | ✓ | 1 | 1 | 0 | 1 | 2 | PARTIAL |
| T6 历史与产物 | ✓ | △ | ✓ | — | 2 | 1 | 0 | 1 | 2 | PARTIAL |
| T7 重试 | ✓ | △ | ✓ | — | 2 | 1 | 0 | 1 | 2 | PARTIAL |

汇总：**0 REAL、5 PARTIAL、2 BROKEN**。最短板是数据层：没有真实 PDF 字节、真实下载或真实邮件附件证据。

## 6. 非 REAL 修复项

| 优先级 | 修复项 | 验收证据 |
|---|---|---|
| P0 | 将 `export-health` 改为实际启动 Chromium、访问 export URL 并等待 ready selector 的短探针；失败必须 `unavailable` | 缺浏览器、FE 不可达、selector 超时均禁用创建 |
| P0 | 统一运行中后端与 Vite 的 `FE_BASE_URL` / host 配置，消除 `localhost` 与 `127.0.0.1` 不一致 | 真 `export-jobs` 201、下载 `%PDF`、`artifactKind=visual_snapshot` |
| P0 | 看板/大屏调度移除 Excel 布局清单选择，仅固定 PDF | B7 不存在；预检始终包含 renderer |
| P1 | SMTP 不可达时禁用“创建 / 激活”，或明确允许草稿但禁止激活 | UI 和 API 都不能将不可投递任务置为 scheduled |
| P1 | 添加无 mock 的 E2E：创建→激活→执行→下载→MailHog 附件→失败→重试 | CI/本地环境分别有可重复证据 |
| P1 | 修复或替换漂移的 `test_delivery_honesty_gate` 字面断言；修复 R58/R238 非 UUID 夹具 | 报告相关回归全绿，失败可归因 |

## 7. 复核准入

仅当 P0 全部完成，且一次隔离运行同时产出真实 `%PDF`、`visual_snapshot`、可下载产物、MailHog PDF 附件、SMTP/Chromium 失败的阻断反馈、以及失败后重试记录，才可把该能力升为 **REAL**。
