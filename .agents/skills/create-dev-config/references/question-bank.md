# 问题库与扫仓默认

一次只问**一题**。先扫仓填推荐项。

## 扫仓推断（提问前）

| 目标 | 搜什么 |
|------|--------|
| 本机 browser / 端口 | README localhost；vite/next port；compose ports；`package.json` scripts |
| start | `npm/pnpm/yarn dev`；monorepo → `start_cwd` |
| login_path | `/login` `/signin` `/auth` |
| api_url | `VITE_*` / `NEXT_PUBLIC_*` / proxy / compose 后端端口 |
| staging/prod URL | README、docs/service、helm values、CI 环境变量名（只采 URL，不采密） |
| 日志/Grafana | docs/runbook、README「观测」、compose 里 grafana 端口 |
| 部署 | `deploy/`、Helm、`.github/workflows`、docs/service 部署节 |

---

## 阶段 A · 最小可走查

### A1 · active_env

> 这次走查 / 默认瞄准哪套环境？  
> **推荐**：`local`（本机）  
> A) local  B) staging  C) 其他（命名）  D) 先配地图，active 稍后再定（仍推荐先 local）

→ `active_env`（禁止无确认选 prod；若用户坚持 → 警告 + 要求 `allow_prod` 明示）

### A2 · 浏览器 URL

> `active_env` 的**浏览器访问地址**？  
> **推荐**：扫到的本机 URL  
> A) 用推荐  B) 我提供  C) 占位稍后改

→ `environments.<id>.browser_url` + `app.base_url`

### A3 · 启动（local）

> 需要 agent 走查前启动应用吗？（非 local 可跳过）  
> A) 用推荐命令  B) 我提供  C) 手动已启动 / 远端无需 start

→ `start` / `start_cwd` / `ready_timeout_sec`

### A4 · 登录策略

> 登录方式？  
> A) 表单  B) Basic  C) Cookie/Header  D) 无登录

→ `auth.strategy` + `login_path`

### A5 · 用户名

> 管理员用户名？ **推荐** `admin`  
> A) 推荐  B) 我提供

### A6 · 密码存放

> 密码怎么放？（**推荐 A**；若 active 将是生产 → 跳过收密，只做地图）  
> A) `secrets.env` + `password_env`  
> B) 写入 yaml（须 gitignore 整 `.dev`）  
> C) 占位稍后改

### A7 · 写边界

> 是否允许走查写数据 / 删除？  
> **推荐**：A 只读  
> A) 只读  B) 可写不可删  C) 可写可删（高风险）

### A8 · API URL

> 服务接口基址（与页面不同源时）？  
> A) 跳过（同源）  B) 用推荐  C) 我提供

→ `api_url` + `external.api_base`

---

## 阶段 B · 环境地图

### B0 · 建哪些环境

> `.dev` 里要登记哪些环境？（可多选）  
> **推荐**：local + staging + prod（prod 仅 URL/运维地图）  
> A) 仅 local  B) local+staging  C) local+staging+prod  D) 自定义列表

### 对每个选中环境循环（一次只问当前环境的一题）

#### Bx.1 浏览器 URL

> 【&lt;env&gt;】浏览器访问 URL？

#### Bx.2 API URL

> 【&lt;env&gt;】服务 API 基址？  
> A) 与浏览器同源 / 未知先空  B) 我提供

#### Bx.3 部署

> 【&lt;env&gt;】部署在哪？怎么发？有控制台/流水线链接吗？  
> 可答：`location` / `method` / `region` / `link`；未知则「跳过」

→ `deploy`

#### Bx.4 日志

> 【&lt;env&gt;】日志在哪查？（控制台 URL + 可选查询提示）  
> A) 跳过  B) 我提供 url 与 query_hint

→ `logs`；可顺带问一句指标/Trace 是否有 URL（合并为一问若用户愿意）

#### Bx.5 网络

> 【&lt;env&gt;】是否要 VPN/堡垒机？kubectl context 名？（不要贴 kubeconfig）  
> A) 无需  B) 要 VPN  C) 说明…

→ `network`

#### Bx.6 连接摘要（可选）

> 【&lt;env&gt;】需要登记 DB/Redis/MQ 等主机端口吗？（不要密码）  
> A) 跳过  B) 逐条提供 name/kind/host/port

→ `connections`

#### Bx.7 health（可选）

> 【&lt;env&gt;】health/ready 探活 URL？  
> A) 跳过  B) 提供

### B-prod · 生产收尾（含 prod 时必问）

> 生产环境将：**只存访问/部署/日志地图**，不收生产密码，且 `walkthrough.enabled=false`。确认？  
> A) 确认  B) 我坚持要配置生产走查账号（须同时确认 `allow_prod=true`，并警告风险）

默认只接受 A。

### B-meta · 项目元信息（可选）

> 负责人 / oncall、架构或 runbook 文档路径要写进 project 吗？  
> A) 跳过  B) 提供

---

## 补缺速查

| 缺什么 | 问 |
|--------|-----|
| browser_url / base_url | A2 |
| 账号密码 | A5–A6 |
| 无 environments | B0 起 |
| 无 staging/prod 地图 | B0 选中后循环 |
| 无日志入口 | Bx.4 |
| active=prod 且未 allow_prod | 改回 staging/local 或明示允许 |

## 体检评分

| 维 | 分 | 标准 |
|----|-----|------|
| 走查必填 | 35 | active 可打开 + 非 prod 认证齐或 prod 未启用走查 |
| 安全 | 25 | secrets 分离；生产无密码；allow_prod 默认 false；gitignore |
| 地图覆盖 | 25 | local+staging 有 browser/api；prod 有 URL+deploy 或 logs 之一 |
| 可运维 | 15 | 至少一环境有 logs 或 deploy.link；VPN 已声明 |

&lt;70 走查维 → 不宣称可走查；地图维低 → 报告「地图不完整」但不阻塞只读本机走查。
