# F15-NFR 非功能需求

> 模块：NFR · 8 维评分见 [`../prd.md`](../prd.md)

### [NFR-001] NFR-01 Dashboard 首屏性能

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：一期
- **描述**：NFR-01 Dashboard 首屏性能（SRS 追溯项）。
- **验收标准**：
  - [ ] 首屏 ≤ 5s
  - [ ] 并发压测报告
- **代码锚点**：`tests/perf/nfr01_dashboard/`
- **演化建议**：按 plan.md 期次优先级落地
### [NFR-002] NFR-01 报表查询性能

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：二期
- **描述**：NFR-01 报表查询性能（SRS 追溯项）。
- **验收标准**：
  - [ ] 报表查询 ≤ 10s
  - [ ] 抽样通过
- **代码锚点**：`tests/perf/nfr01_report/`
- **演化建议**：按 plan.md 期次优先级落地
### [NFR-003] NFR-02 核心看板可用性

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：二期
- **描述**：NFR-02 核心看板可用性（SRS 追溯项）。
- **验收标准**：
  - [ ] SLA ≥ 99.5%
  - [ ] 监控告警配置
- **代码锚点**：`ops/sla/`
- **演化建议**：按 plan.md 期次优先级落地
### [NFR-004] NFR-03 HTTPS 脱敏审计

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：一期
- **描述**：NFR-03 HTTPS 脱敏审计（SRS 追溯项）。
- **验收标准**：
  - [ ] 全站 HTTPS
  - [ ] 敏感字段脱敏+审计
- **代码锚点**：`backend/app/core/security/`
- **演化建议**：按 plan.md 期次优先级落地
### [NFR-005] NFR-04 连接器插件扩展性

- **状态**：部分实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：NFR-04 连接器插件扩展性（SRS 追溯项）。
- **验收标准**：
  - [x] 新增连接器不改核心（`register_connector_plugin` + ConnectorRegistry 零侵入守卫，r46 L1）
  - [ ] 扩展演练 PR
- **代码锚点**：`backend/app/core/nfr/plugin_extension.py` · `backend/app/api/v1/nfr.py` · `tests/test_nfr_gov_conn_r46.py`
- **演化建议**：r46 L1 闭合扩展点清单与 registry 钩子；后续 companion 补扩展演练 PR 与第三方插件样例
### [NFR-006] NFR-05 浏览器与消息推送

- **状态**：部分实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：三期
- **描述**：NFR-05 浏览器与消息推送（SRS 追溯项）。
- **验收标准**：
  - [ ] 主流浏览器兼容矩阵
  - [x] 企微/钉钉推送配置契约 + 降级路径（`push_config` + GET `/nfr/push-config`，r46 L1）
- **代码锚点**：`backend/app/core/nfr/push_config.py` · `backend/app/api/v1/nfr.py` · `tests/test_nfr_gov_conn_r46.py`
- **演化建议**：r46 L1 闭合配置 schema 与非法 webhook 拦截；后续 companion 补浏览器矩阵与真实推送通道
### [NFR-007] NFR-06 信创国产化

- **状态**：部分实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：NFR-06 信创国产化（SRS 追溯项）。
- **验收标准**：
  - [x] 信创 DB 按需连通（合规清单含 `registeredXinchuangConnectors` 含 gbase，r46 L1）
  - [ ] 部署验收报告
- **代码锚点**：`backend/app/core/nfr/xinchuang.py` · `backend/app/api/v1/nfr.py` · `tests/test_nfr_gov_conn_r46.py`
- **演化建议**：r46 L1 闭合合规清单与 strict 模式守卫；后续 companion 补部署验收报告与全量信创认证
### [NFR-008] NFR-08 自主可控零 DE/SS

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：四期
- **描述**：NFR-08 自主可控零 DE/SS（SRS 追溯项）。
- **验收标准**：
  - [ ] 生产无 Superset/DataEase 进程
  - [ ] 依赖审计通过
- **代码锚点**：`ops/compliance/nfr08/`
- **演化建议**：按 plan.md 期次优先级落地
