> 计划文件：`docs/automate/plans/2026-07-13-account-password-security-fix.md`

# 计划审核报告

## 背景理解

本计划要完整修复修改密码链路的会话误失效、字段反馈与可访问性、响应式布局、测试凭证污染和文档追溯错误。当前方案保留 API v1 的业务 401，通过端点级精确错误码 allowlist 区分业务失败与真实鉴权失效，并以隔离后端测试、真实 AuthProvider 集成测试、PRD/API/服务域索引纠错及九张浏览器截图形成闭环。

本轮只依据当前计划、当前代码、需求契约和项目规则判断，不因前两轮结论保留历史问题。

## 目标-实现一致性前置检查

| 成功承诺 | 对应实施点 | 结论 |
|----------|------------|------|
| 业务 401 保留 token、用户态与路由 | Task 1 精确 allowlist；Task 5 真实 AuthProvider 集成；Task 8 浏览器断言 | 🟢 |
| 真实/未知/不可解析 401 fail-closed | Task 1 RED 1、3～5 与 GREEN 默认分支 | 🟢 |
| 原始 `ApiRequestError` code/message/fields 保留 | Task 1 RED 2 与一次性错误体解析 | 🟢 |
| 字段错误、首错聚焦、显隐、防重复提交与可访问性 | Task 3 RED 1～10；Task 4 GREEN | 🟢 |
| 后端密码测试不污染共享 admin | Task 2 临时 SQLite、唯一用户、禁止 fallback token、finalizer | 🟢 |
| unauthorized handler 生命周期可清理 | Task 1 identity-safe unsubscribe/reset；AuthProvider cleanup；Task 5 正反顺序重复验证 | 🟢 |
| API/PRD 文档纠错无错误 ID、无延期占位 | Task 6 同步 hub/F02/README/API/services/Bug，计数不变并建立非计数事实追溯 | 🟢 |
| B Design 响应式、暗色和交互状态证据 | Task 8 六张默认态 + 三张交互态及精确路径 | 🟢 |

所有明确承诺均能定位到具体文件、实现分支、测试或浏览器验收，不存在目标空转。

## 耦合影响扫描

```text
profile/service.py 既有业务 401
  → api/v1/auth.py 原样透传
  → api.ts 端点级 allowlist
  → ChangePasswordSection 字段映射
  → AuthProvider 用户态 / 路由 / token
  → api 单测 + 组件测试 + 集成测试 + 浏览器验收

registerUnauthorizedHandler 模块单例
  → identity-safe unsubscribe / reset
  → AuthProvider effect cleanup
  → 测试 afterEach
  → 正反顺序与重复运行验证

test_auth_profile.py
  → DATABASE_URL / settings cache / engine cache
  → 临时 SQLite + 专用用户
  → TestClient / middleware / login / me / audit
  → finalizer 恢复环境与 dispose

账户自服务事实追溯
  → prd.md 非计数修订说明
  → F02-AUTH 边界块 / prd README
  → API 两条路由 PRD 列
  → services/auth 实现追溯
  → BUG-001 / Account Self-Service plan / 代码与测试锚点
```

依赖方向合理：请求层不硬编码全局业务码，页面负责端点字段语义；后端生产逻辑不为测试隔离而改动；PRD 边界说明不冒充 SRS 功能项。未发现遗漏的强制同步模块、循环依赖或跨层内部数据操作。

## 方案路径合理性

1. 保持 401 + 稳定业务 code，避免直接破坏 v1 状态契约；端点显式 allowlist 已足以修复误登出。
2. 未知 code、非字符串 code、缺 message、空/非法 body 均清会话，安全默认未弱化。
3. identity-safe unsubscribe 可防旧 provider cleanup 删除新 handler；reset 仅用于测试/teardown，未变成业务逃生开关。
4. 临时 SQLite 专用用户解决共享 admin 污染根因；异常回滚和环境/cache 恢复均有测试要求。
5. 文档方案在用户批准“不新增未经 SRS 授权的 ID”的边界内，同步 PRD 三处非计数说明、API、服务域和 Bug 索引，不再保留“待人工/待回流”占位，也不篡改 129 项计数与评分。
6. 六张默认态与三张交互态分开取证，可独立证明响应式、暗色、错误焦点、loading 和显隐布局。

整体方案解决根因，不是调用处临时绕过；改动量与安全、兼容和文档纪律相称。

## 关键问题闭合核验

| 问题 | 当前计划证据 | 结论 |
|------|--------------|------|
| v1 401→422 兼容风险 | 明确保留 401；后端生产文件不改 | 🟢 |
| 共享管理员密码污染 | 临时 SQLite、唯一用户、禁止 admin/fallback token | 🟢 |
| 显隐按钮意外 submit | 三按钮 `type="button"` + 合法表单零 API 调用测试 | 🟢 |
| 文档纠错留下外部人工 gate | PRD/API/services/Bug 同轮精确改动，无“待人工/待回流” | 🟢 |
| mock 测试不能证明会话组合行为 | 真实 AuthProvider + MemoryRouter + 原生 fetch stub 集成测试 | 🟢 |
| handler 跨测试残留 | unsubscribe/reset、effect cleanup、afterEach、正反顺序重复运行 | 🟢 |
| 六张截图无法覆盖交互态 | 追加错误焦点、loading、mobile 显式态三张证据 | 🟢 |
| 回退顺序重引入误登出 | 401 时 allowlist 不得单独回退；未来 v2/422 原子迁移 | 🟢 |

## 审核总览

| 指标 | 结果 |
|------|------|
| 计划项总数 | 8 |
| 🔴 阻塞项 | 0 |
| 🟡 警告项 | 0 |
| 🟢 通过项 | 8 |

## 维度汇总

| 维度 | 结论 | 问题数 |
|------|------|--------|
| 目标-实现一致性 | 🟢 | 0 |
| 必要性 | 🟢 | 0 |
| 正确性 | 🟢 | 0 |
| 完整性 | 🟢 | 0 |
| 一致性 | 🟢 | 0 |
| 副作用 | 🟢 | 0 |
| 顺序依赖 | 🟢 | 0 |
| 模块自治性 | 🟢 | 0 |
| 可验证性 | 🟢 | 0 |

## 逐项审核

### 通过项

- 🟢 Task 1. 建立 `apiFetch` 401 分类契约
- 🟢 Task 2. 隔离后端密码测试并锁定 v1 状态/会话/审计边界
- 🟢 Task 3. 先用交互测试定义安全表单契约
- 🟢 Task 4. 实现 TailAdmin/Radix 布局、字段交互与可访问状态
- 🟢 Task 5. 做前端集成回归并证明会话语义未弱化
- 🟢 Task 6. 在现有合同内闭合文档纠错并沉淀 Bug Case
- 🟢 Task 7. 执行代码与文档整体验证门禁
- 🟢 Task 8. 完成真实浏览器基线与交互状态验收

### 阻塞项 / 警告项

无。

## 补充建议

无必须写回计划的问题。执行时应严格遵守计划中的 RED→GREEN 顺序、handler identity-safe cleanup、临时数据库 finalizer、PRD 非计数边界和九张截图命名，不得把这些合同项降级为口头确认。

## 最终结论

✅ 直接执行 — 当前计划无阻塞、无警告，文档纠错和 unauthorized handler 清理均已成为精确、可执行、可验证的合同项。

## 推荐执行模型

任务核心度：核心

推荐梯队：T2 ∪ T3

首选：Opus 4.6 Max（Q=5.0，C=2.5，加权分=4.63）

备选：Opus 4.7 Max（Q=5.0，C=2.0，加权分=4.55）；GPT-5.5 High（Q=5.0，C=2.0，加权分=4.55）

判定依据：

- 步骤数：8
- 涉及文件：30 个（21 个代码/文档文件 + 9 张截图产物）
- 跨模块依赖：6 处（其中新增 2 处：handler 生命周期、PRD 非计数事实追溯；利用已有接口 4 处）
- 耦合风险：中（请求层/AuthProvider、测试数据库全局 cache、PRD/API/services/Bug 多文档同步）
- 高风险操作：有（鉴权会话副作用、密码修改测试、模块级 handler 生命周期）；均已有隔离与回退合同
- 推理深度：高
- 一票否决项是否触发：否
- 权衡过程：核心任务权重 `wQ=0.85`、`wC=0.15`；首选得分 `5.0×0.85 + 2.5×0.15 = 4.625≈4.63`；备选得分 `5.0×0.85 + 2.0×0.15 = 4.55`，与首选差距 0.08，满足 ≤0.3

## 下一步推荐

本环节已收敛。进入 dev-autopilot A5 `plan-execute`，严格按 Task 1～8 执行；完成后使用 `plan-verify` 对照本计划整体验收，无需再次 plan-review。

state: PASS
