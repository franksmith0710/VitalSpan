# 集成简报：IM 平台对接（企微 / 钉钉 / 飞书）

| 字段 | 值 |
|------|-----|
| slug | `im-platform-connect` |
| 触发源 | 已确认蓝图 `docs/material/blueprints/2026-08-13-im-app-config-self-bind.md` S3；用户「按步骤执行」 |
| 类型 | hybrid（外部契约 + 实现选型） |
| 可行性 | **B** 有文档缺环境 |
| 凭据 | **need**（仓库 `.dev` 与家目录均无 IM 应用 `credential_env`） |
| smoke | `contracts/im-platform-connect.smoke.py` ｜ 最近成功工件：未跑（缺应用凭证） |
| 状态 | draft（选型已八维推荐；待凭据真打后升 A） |
| 日期 | 2026-08-13 |

## 1. 目标与边界

- **要对齐的产品能力**：后台保存公司应用后可探测；已登录用户授权跳转后自动记住账号；定时工作通知发到该账号。
- **In Scope（首版真实路径）**：三通道 **gettoken/探测**、**浏览器授权拿账号**、**工作通知发送**（文字 + 产物链接）。
- **Out of Scope**：用 IM 登录 VitalSpan（替代 JWT）；通讯录同步；群 webhook 当按人投递；stub/mock 标已配置或已送达；IM 内嵌 PDF。

## 1.1 术语对齐

| 采用（规范名） | 含义 | 避免混用 |
|----------------|------|----------|
| 平台对接 | 管理员配置公司应用凭证与回调域名 | 群机器人 webhook |
| 授权跳转 | 已登录 VitalSpan 的用户去公司应用确认身份，回传账号 | 扫码登录本系统、免登进 VitalSpan |
| 应用 access_token | 用 CorpId/Secret 等换的应用凭证，用于探测与发信 | 用户 JWT、授权码 code |
| 成员账号 | 投递用的企微 UserId / 钉钉 userid / 飞书 user_id | 手机号、显示名、open_id（飞书发信须与 receive_id_type 一致） |
| 探测 | 调 gettoken（或飞书 tenant_access_token）且厂商成功码 | 消息已送达 |
| 已送达 | 发信接口成功且无「全部接收人无效」 | 钉钉任务仅受理、入队、mock |

仓内蓝图术语表已裁定「绑定 ≠ 登录」；本表不覆盖。

## 2. Integration Card（摘要）

- 仓内痕迹：`backend/app/reports/scheduler/channels/work_notice.py` 已用 **httpx** 调官方 HTTPS（gettoken + 发信）；`probe_im_apps` **只检查 env 是否非空**，未打厂商。依赖 `httpx>=0.28`。无官方 SDK。
- 宣称 vs 代码：**矛盾（待实现闭合）** — PRD/arch 写按人投递已实现（发信路径真 HTTP）；「应用已配置」现为字段非空，不是探测；绑定仍为管理员手填，无授权跳转。
- 环境：无沙箱账号；env 名已在 `backend/.env.example`。`.dev` `integrations[]` 未登记 IM。

## 3. 可行性结论

**B**：官方契约公开可接；本机/家目录无应用 Secret，不能真打 smoke。不得宣称已对接授权跳转。发信适配器已存在，但探测与绑定仍缺。

## 4. 候选方案（2–3）

| 方案 | 来源 | 契合本栈 | 风险 | 备注 |
|------|------|----------|------|------|
| A 自研 httpx 调官方 REST | 企微/钉钉/飞书开发者文档（下表链接） | 高：仓内已用于发信 | 须自维护 token 缓存与错误码 | **推荐** |
| B 三家官方 Python SDK | 钉钉/飞书官方 SDK；企微无单一官方 PySDK | 中：三套依赖 | 体积、许可证、版本漂移 | 不选 |
| C 社区聚合库 | 如 wechatpy 等 | 低 | 维护与国密边界 | 不选 |

### 4.1 八维对照

无成功 smoke → 「生产诚实」「交付可验证」各 ≤ 60。

| 维度 | A httpx 官方 REST | B 官方/厂商 SDK | C 社区聚合 |
|------|-------------------|-----------------|------------|
| 长远规划 | 88 | 80 | 55 |
| 产品体验 | 82 | 80 | 70 |
| 生产诚实 | 58 | 58 | 50 |
| 架构边界 | 92 | 68 | 55 |
| 可靠性 | 78 | 80 | 60 |
| 可运维 | 86 | 70 | 55 |
| 安全合规 | 88 | 75 | 58 |
| 交付可验证 | 55 | 55 | 45 |
| **总分** | **78** | **71** | **56** |

**选定**：方案 A（总分 78）。tie-break：与现有 `work_notice.py` 同端口，厂商类型不进核心。  
`auto_best`：否（attended 调研；用户已确认蓝图选型方向）。

### 4.2 非显然否决

| 否决方案 | 否决理由 |
|----------|----------|
| 仅用企微内 oauth2/authorize | 绑定发生在 **浏览器里的 VitalSpan**，不是企微会话内；须用 [Web 登录](https://developer.work.weixin.qq.com/document/path/98174) |
| 钉钉 H5 免登 requestAuthCode | 同上，用户不在钉钉微应用 WebView 内 |
| 把 asyncsend_v2 受理当用户已读 | 官方为异步任务；已送达口径见 §5 |

## 5. 标准对接 / 落地流程（推荐）

1. **配置与密钥**：管理面入库 SM4（蓝图 S1）；字段含回调域名。env 仅「从未保存」回落。写权限 `system:im_connect.manage`。
2. **鉴权（应用）**：用应用凭证换 access_token；缓存至 expires_in，失败再取。
3. **连通性探测**：与发信同一 gettoken；`errcode==0`（飞书 `code==0` 且有 `tenant_access_token`）才标已配置。
4. **授权跳转（浏览器）**：已登录用户点绑定 → 302 到厂商授权页（state 防 CSRF，绑定 VitalSpan 用户）→ 回调带 code → 服务端换成员账号 → 写入 `user_im_bindings`。code 一次性、短时有效，**不作发信令牌**。
5. **发信**：沿用工作通知；企微须检查 `invaliduser`；全部无效 → 失败。
6. **失败语义**：超时/非 0 码/401 类凭证错 → 人话失败，**禁止**假成功。
7. **可观测**：日志通道+errcode+traceId，无 Secret、无完整账号。

### 5.0 官方契约（禁止改 URL 除非官方变更）

**探测（只读）**

| 通道 | 方法 | URL | 成功 |
|------|------|-----|------|
| 企微 | GET | `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=&corpsecret=` | errcode=0 | [文档](https://developer.work.weixin.qq.com/document/90000/90135/91039) |
| 钉钉 | GET | `https://oapi.dingtalk.com/gettoken?appkey=&appsecret=` | errcode=0 | 与现 `work_notice.py` 一致 |
| 飞书 | POST | `https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal` body `{app_id,app_secret}` | code=0 + token | [文档](https://open.feishu.cn/document/server-docs/api-call-guide/calling-process/get-access-token) |

**浏览器授权拿账号（绑定）**

| 通道 | 用户跳转 | 回调用 code | 文档 |
|------|----------|-------------|------|
| 企微 | `https://login.work.weixin.qq.com/wwlogin/sso/login?login_type=CorpApp&appid=CORPID&agentid=AGENTID&redirect_uri=&state=` | GET `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=&code=` → `userid` | [Web 登录](https://developer.work.weixin.qq.com/document/path/98174) · [getuserinfo](https://developer.work.weixin.qq.com/document/path/91023) |
| 钉钉 | `https://login.dingtalk.com/oauth2/auth`（client_id=AppKey，redirect_uri 须登记） | code → 用户 token → 用户信息中的 userid | [网页登录教程](https://open.dingtalk.com/document/isvapp/tutorial-enabling-login-to-third-party-websites.md) |
| 飞书 | `https://accounts.feishu.cn/open-apis/authen/v1/authorize` | POST token → GET user_info → 存 **user_id**（与发信 `receive_id_type=user_id` 对齐） | [登录概述](https://open.feishu.cn/document/sso/web-application-sso/login-overview) |

可信域名 / 重定向 URL 必须与平台对接里填的回调域名一致，否则厂商直接拒绝。

**发信（已有代码）**

| 通道 | URL | 注意 |
|------|-----|------|
| 企微 | POST `https://qyapi.weixin.qq.com/cgi-bin/message/send` | errcode=0 仍可能有 `invaliduser`；全员无效 errcode=81013。[发送应用消息](https://developer.work.weixin.qq.com/document/path/90236) |
| 钉钉 | POST `https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2` | 成功=任务受理，不是已读 |
| 飞书 | POST `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=user_id` | 需机器人能力；content 为 JSON 字符串。[发送消息](https://open.feishu.cn/document/server-docs/im-v1/message/create) |

### 5.1 场景探针 → 测试

| 场景 | 期望可见行为 | 对应测试 |
|------|----------------|----------|
| 依赖超时 | 8s 超时后该通道失败，不标已配置/已送达 | 未落（`failure_semantics_tested: false`） |
| 鉴权失效 | gettoken 非 0 / 401 → 探测失败、发信失败人话 | 未落 |
| 限流 429 | 有限退避后仍失败则失败，不假成功 | 未落 |
| 幂等 / 重试 | 授权 code 禁止重放；发信按执行记录不重复当成功 | 未落 |

现网 `tests/test_im_person_delivery.py` 对 `send_work_notices` **打桩**，不能顶替上表。

### 5.2 smoke（真打留证）

| 项 | 值 |
|----|-----|
| 脚本 | `contracts/im-platform-connect.smoke.py` |
| 打向 | `qyapi.weixin.qq.com` / `oapi.dingtalk.com` / `open.feishu.cn`（非本地 mock） |
| 凭据来源 | `WECOM_CORP_ID` `WECOM_SECRET`；`DINGTALK_APP_KEY` `DINGTALK_APP_SECRET`；`FEISHU_APP_ID` `FEISHU_APP_SECRET`（只记名） |
| 断言 | HTTP 2xx + 厂商成功码 + 返回 token 字段 |
| 最近一次结果 | 未跑（缺凭据，见 §9） |

授权跳转无法无浏览器/无用户完成，不进本 smoke；首版 smoke = 探测。

## 6. 契约要点（供 arch §8）

| 项 | 内容 |
|----|------|
| 依赖方 | 企微 / 钉钉 / 飞书开放平台（平台对接 + 授权跳转 + 工作通知） |
| 协议 | HTTPS REST |
| 认证 | 应用 Secret → access_token；绑定另走浏览器 OAuth code |
| 超时 / 重试 | 出站 8s；仅幂等读（gettoken）可有限重试；code 换用户禁止重放 |
| 失败语义 | 非 0 码、超时、invaliduser 全员无效 → failed；禁止回落群 |
| 数据归属 | 应用凭证：core 配置 SoR；成员账号：auth `user_im_bindings`；发信：reports |
| 参考链接 | 本节 §5.0；蓝图 `2026-08-13-im-app-config-self-bind.md` |

## 7. 真实验收草案（待确认 → PRD）

> （待确认）给定平台对接已保存且探测 smoke 通过，当用户完成企微 Web 登录授权回调，则资料显示已绑定脱敏 UserId。
> （待确认）依赖 gettoken 不可用时，不得标已配置，绑定按钮不可点，定时该通道失败人话，不得返回成功。

## 8. 首版真实切片建议

- 切片名：探测 + 企微绑定 + 企微工作通知
- 路径：保存凭证 → smoke gettoken → 授权跳转存 UserId → 调度发信看 invaliduser
- 明确不做：钉钉/飞书可同切片接适配器，但验收可先企微真打

## 9. 阻塞项

- [ ] 缺凭据：在企业微信/钉钉/飞书开放平台建自建应用，把下列变量写入本机 `backend/.env` 或家目录 `secrets.env`，并在 `.dev` `integrations[]` 只登记**变量名**：
  - `WECOM_CORP_ID` `WECOM_SECRET` `WECOM_AGENT_ID`
  - `DINGTALK_APP_KEY` `DINGTALK_APP_SECRET` `DINGTALK_AGENT_ID`
  - `FEISHU_APP_ID` `FEISHU_APP_SECRET`
- [ ] 应用须配置 **可信域名 / 重定向 URL** 指向 VitalSpan 回调（与平台对接「回调域名」一致）
- [ ] 成员须在应用可见范围内，否则扫码无权限或 invaliduser

## 10. Followups

- [x] 简报 + smoke 脚本（本文件）
- [ ] 用户确认后写入 `docs/arch.md` §8
- [ ] 用户确认后修订 RPT-005 / auth.md 验收
- [ ] 过稀疏门槛：建议扩 ADR-19（凭证 SoR + 授权绑定），确认后写
- [ ] 实现（go-fast）或等凭据后再跑 smoke 升 A
