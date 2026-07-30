# Feature Truth Audit: 分享 / 嵌入（Share & Embed）

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-30 |
| 核验范围 | 看板/大屏分享页、公开链接、单图嵌入、Embed 消费页、`/embed/share` 高级配置 |
| 锚点 | `/admin/dashboards/:id/share` · `/admin/data-screens/:id/share` · `/embed/chart/*` · `/embed/screen/*` · `/embed/share` · `/api/v1/embed/*` |
| 总体判定 | **PARTIAL** |
| **总分 / 档位** | **6.5/10 · C**（T 汇总取 P0 Bx 最低分加权） |
| 状态 | approved-fix（2026-07-30 P0 修复已落地） |

## 1. 核验标准与预期（来自用户/对话/PRD）

| ID | 期望行为（可观察） | 依据 |
|----|-------------------|------|
| T1 | 登录用户在分享页可签发链接；复制/预览可用 | F07-DASH 分享页 · 对话 |
| T2 | **公开链接**持有者无需登录即可在浏览器直开查看 | API-006 F-D · 用户反馈「公开连接需要登录」 |
| T3 | 单图表链接必须带 token；无 token 裸链应明确提示，而非误导为登录问题 | 用户截图 `/embed/chart/{id}` 无 token |
| T4 | iframe 嵌入链可在外部页面 iframe 中加载（同源或白名单 origin） | F06-VIZ-006 · API-006 Origin 守卫 |
| T5 | 大屏整屏公开/嵌入与单组件公开均从分享页可完成 | DataScreenSharePanel · ChartEmbedShareActions |

- **非目标**：SDK demo 页生产可用性；token 持久化/撤销 API；跨进程 token 共享

## 2. 完整链路图

```
分享入口 → 签发 POST /embed/token → 生成 embedUrl
  → 消费页 /embed/chart|screen?token&shareMode=public
  → 匿名 GET chart-view | dashboard-layout（middleware 放行）
  → ChartRenderer | DataScreenPresenter 渲染
```

| 序 | 层 | 状态 | L1 证据 | 说明 |
|----|----|------|---------|------|
| 1 | 入口 | 通 | `fe/src/routes.tsx` · share 路由可达 | 分享页需登录；embed 消费页无壳 |
| 2 | 触发 | 通 | `PublicShareLinkCard` · `ChartEmbedShareActions` · `DataScreenSharePanel` | 均已接 `POST /embed/token` |
| 3 | 协议 | 通 | `pytest tests/test_integration_api_l1_r44.py -k embed` **12 passed** | token 签发/公开/dashboard-layout 匿名 |
| 4 | 域逻辑 | 部分 | `embed_token.py` · `embed_resolve.py` | 无 `EMBED_NOT_DATA_SCREEN` 实现（文档仍写） |
| 5 | 数据 | 部分 | `_TOKEN_STORE` 内存 | 进程重启 token 失效；无 DB 持久化 |
| 6 | 渲染 | 部分 | smoke + 代码读 | v1 看板公开链走 `/embed/screen` + `DataScreenPresenter` 回退 grid；无浏览器 E2E |
| 7 | 异常态 | 通 | `EmbedChartPage.tsx:29-33` · `api.ts` embed 401 不跳登录 | 裸链/缺 token 文案诚实 |

## 3. 子能力判定表

| ID | 子能力 | 判定 | 总分/档 | 证据摘要 |
|----|--------|------|---------|----------|
| T1 | 分享页签发与 UI | **PARTIAL** | 7/B | smoke 4/4 绿；签发 API pytest 绿；无签发→打开 E2E |
| T2 | 公开链匿名访问 | **PARTIAL** | 6/C | middleware + `api.ts` 修复已落地；浏览器直开 **UNVERIFIED**（dev 未跑通 E2E） |
| T3 | 单图 token 门禁 | **REAL** | 8/B | 裸 URL 明确报错；分享页已改 `ChartEmbedShareActions` |
| T4 | iframe 跨域嵌入 | **PARTIAL** | 5/C | 同源可通；跨站 parent origin 与 API Origin 模型未闭环 |
| T5 | 大屏分享 | **PARTIAL** | 7/B | 整屏+公开+单组件 UI 齐；跨域 iframe 同 T4 |

**T 汇总**：取 P0 最低 → **6.5/C · PARTIAL**（打通但不对/不全 2 项）

## 3b. 前端控件下钻表

| ID | 文案/位置 | handler | 期望 | 实际 | L | C | D | E | F | 总分 | 判定 | 证据 |
|----|-----------|---------|------|------|---|---|---|---|---|------|------|------|
| B1 | 返回编辑 | `Link` | 跳编辑页 | 路由正确 | 2 | 2 | — | — | 2 | 8 | REAL | `DashboardSharePage.tsx:93` |
| B2 | 错误重试 | `PageErrorBanner.onRetry` | 重拉 dashboard | 调 `GET /dashboards/:id` | 2 | 2 | — | 2 | 2 | 8 | REAL | `:98` |
| B3 | 公开链接·生成 | `PublicShareLinkCard.issuePublicLink` | 签发 dashboard 公开 URL | POST `{dashboardId, shareMode:public}` → `/embed/screen/...` | 2 | 1 | 2 | 2 | 2 | 9 | PARTIAL | pytest `test_embed_public_share_token_r44`；看板走 screen 路径语义偏 |
| B4 | 公开链接·复制/预览 | `copyUrl` / `<a>` | 复制/新 tab 打开 | 本地 state URL | 2 | 2 | 1 | 2 | 2 | 9 | PARTIAL | 依赖 B3 已签发 |
| B5 | 单图·生成公开链接 | `ChartEmbedShareActions.issueLink` | chart 公开 URL 含 token | POST `{chartId, shareMode:public}` | 2 | 2 | 2 | 2 | 2 | 10 | REAL | 代码+smoke；**无 chart-view 匿名 pytest** |
| B6 | 单图·复制/预览 | 同上 | 同上 | 同上 | 2 | 2 | 1 | 2 | 2 | 9 | PARTIAL | 消费链未 E2E |
| B7 | 打开嵌入分享 | `Link /embed/share` | 进高级嵌入页 | 可达 | 2 | 2 | — | — | 2 | 8 | REAL | `:158` |
| B8 | 打开全屏预览 | `dataScreenPreviewPath` | 预览大屏 | Link 正确 | 2 | 2 | — | — | 2 | 8 | REAL | `DataScreenSharePanel.tsx:65` |
| B9 | 签发整屏嵌入链接 | `issueScreenEmbed` | iframe 整屏链 | POST `{dashboardId, allowedOrigins}` | 2 | 2 | 2 | 2 | 2 | 10 | REAL | r44 dashboard screen path test |
| B10 | 整屏复制/预览 | clipboard / `<a>` | 同上 | 同上 | 2 | 2 | 1 | 2 | 2 | 9 | PARTIAL | 跨域 iframe 未验 |
| B11 | 大屏单组件·生成公开链接 | `ChartEmbedShareActions` | 同 B5 | 已接线（2026-07-30 修复） | 2 | 2 | 2 | 2 | 2 | 10 | REAL | 替换原裸 `/embed/chart/` 静态链 |
| B12 | Embed 页·重试（失败） | `reload` | 重载重试 | 刷新页面 | 2 | 2 | — | 2 | 1 | 7 | REAL | `EmbedChartPage.tsx:101` |
| B13 | Embed 页·重试（成功） | `reload` | — | 成功渲染仍显示重试 | 2 | 0 | — | — | 0 | 2 | PARTIAL | `:111-113` UX 噪声 |
| B14–B18 | `/embed/share` 校验并生成 | `EmbedSharePanel.validateAndGenerate` | validate→token→iframe | validate+token 有 r42/r44 测 | 2 | 2 | 2 | 2 | 2 | 10 | REAL | `EmbedSharePanel.tsx:50-76` |
| B19 | SDK `targetType=dashboard` | `embedSdk.buildEmbedSrc` | 应打开 `/embed/screen/{id}` | **仍拼 `/embed/chart/{id}`** | 2 | 0 | — | 1 | 1 | 4 | **BROKEN** | `embedSdk.ts:42-48` |

**Out 控件**：布局预览区只读；大屏 `DataScreenPresenter` 预览无业务写操作。

**功能块映射**：T1→B1–B7 · T2→B3–B4,B9–B11 · T3→B5–B6,B12 · T4→B9–B10,B14–B19 · T5→B8–B11

## 3c. 五维评分汇总

| ID | L | C | D | E | F | 总分 | 档位 | 真假 | 备注 |
|----|---|---|---|---|---|------|------|------|------|
| B3 | 2 | 1 | 2 | 2 | 2 | 9 | B | PARTIAL | 看板公开 URL 用 `/embed/screen/` |
| B5 | 2 | 2 | 2 | 2 | 2 | 10 | A | REAL | |
| B19 | 2 | 0 | — | 1 | 1 | 4 | D | BROKEN | SDK dashboard 路径错误 |
| T2 | — | — | — | — | — | 6 | C | PARTIAL | 匿名链主路径缺浏览器 L1 |
| T4 | — | — | — | — | — | 5 | C | PARTIAL | 跨域 iframe 未闭环 |

**打通但不对**（L≥2 且 C≤1）：**B3、B13、B19**（3 项）  
**假功能/损坏**：**B19**（SDK dashboard）

评分细则：`.cursor/skills/feature-truth-verify/scoring-rubric.md`

## 4. 动态验证记录（期望 vs 实际）

| 步骤 | 操作 | **期望** | **实际** | 一致？ | 证据 |
|------|------|----------|----------|--------|------|
| 1 | `pytest -k embed` | 12 pass | 12 pass | ✅ | 2026-07-30 命令输出 |
| 2 | `vitest` share/embed 相关 | 23 pass | 23 pass | ✅ | smoke+embedAccess+api.test |
| 3 | 打开 `/embed/chart/{id}` 无 token | 明确缺 token 提示 | 「缺少嵌入令牌…」 | ✅ | 用户截图 + `EmbedChartPage.tsx:29-33` |
| 4 | 分享页单图链 | 须点「生成公开链接」 | 已改 `ChartEmbedShareActions` | ✅ | 代码 diff 2026-07-30 |
| 5 | 公开 dashboard token 匿名读 layout | 200 + layoutJson | pytest `test_embed_dashboard_layout_anonymous_r44` 绿 | ✅ | r44 |
| 6 | 公开 chart token 匿名读 chart-view | 200 + ChartViewConfig | **无专项 pytest** | ❓ | UNVERIFIED |
| 7 | 浏览器直开 `?token&shareMode=public` | 无需登录渲染 | dev vite 曾报 embedAccess 解析错误 | ❓ | `terminals/3.txt`；**UNVERIFIED** |
| 8 | SDK init `targetType=dashboard` | iframe → `/embed/screen/` | 代码仍 → `/embed/chart/` | ❌ | `embedSdk.ts:45-46` |

## 5. 修复文档（非 REAL / C≤1 / 总分<7 的 P0）

### B19 — SDK dashboard 嵌入路径

**判定 / 得分**：BROKEN 4/10，C=0  
**期望 vs 实际**：`targetType=dashboard` 应加载整屏 `/embed/screen/{dashboardId}?token=…`；实际与 chart 相同拼 `/embed/chart/…`  
**下钻链**：`init` → `buildEmbedSrc` → iframe.src  
**根因**：`fe/src/sdk/embedSdk.ts:42-48` 两分支 URL 相同且未区分 screen  
**修复方向**：`dashboard` → `/embed/screen/${targetId}`；补 `embedSdk.test.ts`  
**修后验收**：C≥2，总分≥8，REAL  

### B3 — 看板「公开链接」URL 语义

**判定 / 得分**：PARTIAL 9/10，C=1  
**期望 vs 实际**：用户心智为「看板只读链接」；实际 URL 为 `/embed/screen/{dashboardId}`，大屏消费页壳（v1 回退 grid 预览可渲染，但路径/文案易混淆）  
**根因**：`embed_token.py:134-135` 凡 `dashboardId` 一律 screen 路径；无独立 `/embed/dashboard/`  
**修复方向**（二选一）：  
- A) 文档+UI 文案明确「整板公开走 screen 路由」；或  
- B) 新增 dashboard 消费路由/签发分支，grid 用 `DashboardLayoutPreview` 专页  
**修后验收**：C≥2  

### T4 — 跨域 iframe 数据加载

**判定**：PARTIAL 5/10  
**期望 vs 实际**：外部 portal iframe 嵌入后图表应加载；FE 用 iframe 自身 origin 做门禁，API 请求 Origin 为 VitalSpan FE，与签发时 `allowedOrigins`（外部站）可能不一致  
**根因**：`EmbedChartPage` 用 `window.location.origin`；token URL 不含 `allowedOrigins` query；后端 `assert_embed_origin` 对 embed 模式校验 API 请求的 Origin  
**修复方向**：iframe 模式 FE 跳过 origin 或从 token meta 解析；query 执行走 `X-Embed-Token` 已支持；补跨域 E2E  
**优先级**：P1（政企 iframe 场景）  

### T2 — 公开链浏览器 E2E

**判定**：PARTIAL 6/10  
**期望 vs 实际**：登录态过期用户直开公开链不应跳 `/login`  
**根因**：已修 `api.ts` + `auth-context`；缺真实浏览器回归  
**修复方向**：补 smoke/E2E：带 embed token URL 打开 → 无 navigate login  
**修后验收**：L1 浏览器证据  

### 文档漂移 — `EMBED_NOT_DATA_SCREEN`

**判定**：文档错误（非功能 STUB）  
**期望 vs 实际**：`docs/api/README.md:247` 称非 data-screen 会拒；`embed_resolve.py:61-89` 无此检查  
**修复方向**：更新 API README 删除或改为「已移除限制」  

### B13 — 成功态多余「重试」

**判定**：PARTIAL C=0（UX）  
**根因**：`EmbedChartPage.tsx:111-113`  
**修复方向**：成功渲染后移除重试按钮  
**优先级**：P2  

## 6. 修复优先级汇总

| 优先级 | ID | 一句话 |
|--------|-----|--------|
| **P0** | B19 | SDK dashboard 仍指向 `/embed/chart/`，整屏嵌入损坏 |
| **P0** | T2 | 公开链匿名访问缺浏览器 E2E，回归风险 |
| **P1** | B3 | 看板公开链走 `/embed/screen/` 语义与用户预期偏差 |
| **P1** | T4 | 跨域 iframe origin 模型未闭环 |
| **P1** | — | 补 `GET chart-view` 公开 token pytest |
| **P2** | B13 | 嵌入成功页多余重试按钮 |
| **P2** | — | API README `EMBED_NOT_DATA_SCREEN` 文档漂移 |

## 7. 交接

- **结论**：分享/嵌入 **未全部符合要求**。签发侧与 token 门禁主路径已 REAL；**匿名公开消费、跨域 iframe、SDK dashboard** 仍有 P0/P1 缺口。
- 建议：`root-first-solve` 先修 **B19 SDK 路径** + 补 **chart-view 匿名 pytest** + 浏览器公开链 smoke。
- 用户批准修复：**否**（本轮仅审计落盘）

---

## 附录：已闭合的用户反馈项（2026-07-30 前序修复）

| 反馈 | 状态 | 证据 |
|------|------|------|
| 公开链仍跳登录 | 已修（代码层） | `fe/src/lib/api.ts` · `auth-context.tsx` · api.test 16/16 |
| localhost:5174 origin 未授权 | 已修 | `fe/src/embed/embedAccess.ts` · embedAccess.test 3/3 |
| 单图裸链无 token | 已修 UI | `ChartEmbedShareActions` 替换静态 URL |
