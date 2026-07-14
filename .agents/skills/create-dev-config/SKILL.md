---
name: create-dev-config
description: >
  苏格拉底式交互创建、体检或修订仓库根目录 .dev：多环境地图（本机/测试/生产）、浏览器与
  API 访问、部署位置、连接摘要、日志/指标入口，以及走查用 active_env 与账号密钥。
  一次只问一个问题，先扫仓推断默认值，写入前预览确认；禁止无人值守自动化调用、禁止默认写入生产密码。
  Use when initializing .dev, multi-env setup, staging/prod URLs, deploy/log links, missing
  base_url or admin password for walkthrough, browser-reviewer blocked on .dev, or user asks
  for 初始化.dev / 环境地图 / 配置走查账号 / 补全 .dev — Console/Admin/SPA.
---

# Create Dev Config（人工交互 · `.dev`）

苏格拉底式引导用户产出或修好**仓库根** `.dev/`：既是**环境地图**（本机 / 测试 / 生产的访问、部署、日志、连接），也是**走查枪口**（`active_env` + 账号）。

- **Schema 真源**：[browser-reviewer/references/dev-config.md](../browser-reviewer/references/dev-config.md)
- **禁止**：无人值守调用；默认写入生产密码；未确认把 `active_env` 设为生产并开启走查

与姊妹 skill：

| Skill | 关系 |
|-------|------|
| **本 Skill** | 交互写出/修好 `.dev`（地图 + 走查目标） |
| [scenario-playbook](../scenario-playbook/SKILL.md) | 读 active 环境的 allow_* / roles |
| [browser-reviewer](../browser-reviewer/SKILL.md) | 只打 `active_env`；缺配置先本 Skill |

## 何时使用

| 场景 | 动作 |
|------|------|
| `.dev` 不存在 | **新建**：最小走查 →（推荐）环境地图 → 预览落盘 |
| 只有本机 URL、缺测试/生产地图 | **补地图**：只问环境相关 |
| 缺必填（browser_url / 账号） | **补缺** |
| 切换走查目标环境 | **修订** `active_env` + 同步顶栏 app/auth |
| browser-reviewer 发现缺 `.dev` | 停走查，转本 Skill |

## 工作模式

| 模式 | 触发 | 输出 |
|------|------|------|
| 新建 | 无 config.yaml | 完整骨架 + gitignore + secrets |
| 补缺 / 补地图 | 缺必填或缺 environments | 最小 diff |
| 体检 | 用户要求检查 | 走查可跑分 + 地图完整度；默认不写 |
| 修订 | 用户确认改某项 | 逐条确认 |

## 提问纪律（苏格拉底式）

1. **一次只问一个问题**；选项 + **推荐项**
2. 先只读扫仓（[question-bank.md](references/question-bank.md)）
3. 跳过 → 用推荐，预览标 `（待确认）`
4. **写入前**脱敏预览 → 明确确认
5. 密码优先 `password_env` + `secrets.env`；**生产默认不收密码**
6. 两阶段：`A 最小可走查` 可先落盘；`B 环境地图` 可同会话继续或下次补

## 两阶段收敛

### 阶段 A · 最小可走查（必做）

| 顺序 | 主题 | 写入 |
|------|------|------|
| A1 | 走查瞄准哪套环境 | `active_env`（推荐 `local`） |
| A2 | 该环境浏览器 URL | `environments.*.browser_url` + `app.base_url` |
| A3 | 启动命令（local） | `start` / `start_cwd` 或手动 |
| A4 | 登录方式 | `auth` |
| A5 | 用户名 | `auth.username` |
| A6 | 密码存放 | `password_env` / secrets（非 prod） |
| A7 | 写操作边界 | `walkthrough.allow_*` |
| A8 | API URL（可选） | `api_url` / `external.api_base` |

### 阶段 B · 环境地图（强烈推荐）

| 顺序 | 主题 | 写入 |
|------|------|------|
| B0 | 要建哪些环境 | `local` / `staging` / `prod` 多选 |
| B1… | 每环境：browser + api | `browser_url` / `api_url` |
| B2… | 每环境：部署位置/方式/链接 | `deploy` |
| B3… | 每环境：日志（+ 可选指标/链路） | `logs` / `metrics_url` / `traces_url` |
| B4… | 每环境：VPN/跳板/kubectl 名 | `network` |
| B5… | 每环境：依赖连接摘要（非密） | `connections` |
| B6… | health/ready（可选） | `health_url` / `ready_url` |
| B7 | 项目 owner / 文档链接（可选） | `project` |
| B8 | 生产确认 | `walkthrough.enabled=false`；无生产密码；`allow_prod=false` |

细节：[question-bank.md](references/question-bank.md)。落盘：[write-checklist.md](references/write-checklist.md)。

### 建议一并想过的补充项（问到或写入 notes）

| 项 | 为何 |
|----|------|
| health / ready URL | 走查前探活，区分「服务挂了」与「前端挂了」 |
| 指标 / Trace 入口 | 排障与验收不只靠页面 |
| VPN / 堡垒机 | 测试/生产常不可直连 |
| kubectl context / 云账号名 | 定位部署，不含密钥 |
| DB/Redis/MQ/S3 主机端口 | 联调地图；密码仍进 secrets |
| 多租户 tenant / 功能开关 | 走查夹具 |
| 负责人 / oncall / 文档链 | 出事找谁 |
| 时区与测试数据策略 | staging 可否清数、是否含 PII |
| CI/流水线链接 | 与 deploy.link 呼应 |

**不要塞进 `.dev`**：生产私钥、kubeconfig 全文、客户真实 PII、长期个人 Token（用团队密钥库）。

---

## 流程（必须）

### Phase 0 · 侦察

`.dev` 现状、gitignore、推断本机 URL/start/login/API → **Dev Setup Card**。

### Phase 1 · 提问

先 A；用户要「完整环境」或体检地图不完整 → 再 B。一次一问。

### Phase 2 · 预览

列出：`active_env`、各环境 URL、deploy/logs 是否填写、密码仅 secrets、生产无密码且走查关闭。

### Phase 3 · 落盘

按 write-checklist；同步顶栏 `app`/`auth`/`external` 与 `active_env`；不 git add 密钥。

### Phase 4 · 交接

```markdown
## 下一步
- scenario-playbook → browser-reviewer（瞄准 active_env=…）
- 地图仍缺 staging/prod：可再说「补环境地图」
```

---

## 进度清单

```
- [ ] 0. 侦察 + Dev Setup Card
- [ ] 1a. 阶段 A 最小可走查
- [ ] 1b. （推荐）阶段 B 环境地图
- [ ] 2. 预览确认
- [ ] 3. 落盘 + gitignore + 生产安全自检
- [ ] 4. 交接
```

## 红线

- 未确认不写文件  
- **默认不收集、不写入生产密码**  
- **默认 `allow_prod: false`**；生产环境 `walkthrough.enabled: false`  
- 真实密码不进报告 / 可提交源码  
- `.dev` 含密且被 git 跟踪 → P0  
- 禁止自动化批量写密码  

## 关联

- Schema：[dev-config.md](../browser-reviewer/references/dev-config.md)
- [question-bank.md](references/question-bank.md) · [write-checklist.md](references/write-checklist.md)
- 下游：[scenario-playbook](../scenario-playbook/SKILL.md) · [browser-reviewer](../browser-reviewer/SKILL.md)
