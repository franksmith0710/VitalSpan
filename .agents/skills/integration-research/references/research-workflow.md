# 研究工作流

配合主 Skill Phase 2。目标：可追溯证据，而非长文综述。

## 0. 先仓内

| 查什么 | 为何 |
|--------|------|
| 适配器目录、client 包名 | 避免重复选型 |
| `go.mod` / `package.json` 等已有 SDK | 优先沿用 |
| `.env.example` / `values.yaml` / `.dev` | 环境与配置键 |
| stub/mock/NotImplemented | 与 reviewer finding 对齐 |
| 现有 OAuth/LDAP/邮件实现 | 作本仓样板 |

## 1. 检索策略（按类型）

### protocol（OAuth / OIDC / LDAP / SMTP…）

1. 标准文档：RFC、OpenID、协议厂商（如 Microsoft Entra、Keycloak）概览页  
2. 本语言官方或事实标准库（如 `golang.org/x/oauth2`、平台 LDAP 库）  
3. 安全基线：PKCE、密钥不落库明文、TLS、连接池/超时  
4. 最小真路径：授权码/客户端凭证/bind + 一次只读查询或一封测试信  

### vendor（云 / HCI / SaaS）

1. 官方「API / SDK / 开发者中心」  
2. OpenAPI/Swagger 或签名规范  
3. 区域与版本差异（注明）  
4. 官方示例仓库；社区 fork 降权  
5. 无公开 API → 停止猜测，列需用户提供的手册/NDA/现场环境  

### hybrid

先 protocol 再 vendor 扩展（如「OIDC + 某云 IDaaS」）。

## 2. 工具使用

- **WebSearch**：官方 SDK 名、OpenAPI、错误码、快速开始  
- **WebFetch**：打开官方文档页提炼鉴权与最小 API（勿整本粘贴）  
- **GitHub 搜索**（若环境可）：`org:官方 language:本栈`；记录 last commit / license  
- 链接失效或矛盾 → 简报标风险，另列次选  

## 3. 对比维度（写入候选表）

| 维度 | 问题 |
|------|------|
| 官方性 | 是否厂商/标准维护 |
| 许可证 | 是否与本仓分发兼容 |
| 栈契合 | 语言、模块系统、CGO/原生依赖 |
| 运维 | 私有化离线、证书、代理 |
| 失败模型 | 超时、限流、幂等是否文档化 |
| 测试代价 | 有无沙箱/模拟器（模拟器≠生产 stub） |

## 4. 何时判 BLOCKED（C/D）

- 无任何可验证的公开或用户提供的契约  
- 仅有 UI 操作文档、无 API  
- 许可证禁止集成或要求不可接受条款  
- 用户明确无沙箱且无法在真实依赖上验收  

BLOCKED 时简报仍要写清：**需要什么材料才能升到 B/A**，以及 **在此之前 PRD/入口应如何诚实处理**。

## 5. 反模式

- 只丢一个 GitHub 链接、无流程与失败语义  
- 推荐「先返回固定成功再补真」  
- 把 Postman 假服务器当生产验收  
- 把厂商营销页当 API 契约  
- 研究邮件时忽略 SPF/DKIM/退信与密钥（若产品需要）  
- 研究 LDAP 时忽略 LDAPS、分页、服务账号最小权限  

## 6. 与真接实现的交界

本工作流**止于简报 + 确认后的文档回写**。写业务代码时：

- 完成定义对齐 code-reviewer：非测试主路径无 stub  
- 未就绪 → 撤入口与宣称，而不是加 flag 挂假实现  
