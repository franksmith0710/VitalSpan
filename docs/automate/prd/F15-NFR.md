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
  - [x] GBase 登记路径 companion（`verify_zero_invasion` + `gbase_registration_path`，r51 companion）
  - [ ] 扩展演练 PR
- **代码锚点**：`backend/app/core/nfr/plugin_extension.py` · `backend/app/api/v1/nfr.py` · `tests/test_nfr_gov_conn_r46.py` · `tests/test_nfr_gov_conn_r51.py`
- **演化建议**：r51 companion 闭合 registry 探测预算与 GBase 插件登记路径；后续补扩展演练 PR 与第三方插件样例
### [NFR-006] NFR-05 浏览器与消息推送

- **状态**：部分实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：三期
- **描述**：NFR-05 浏览器与消息推送（SRS 追溯项）。
- **验收标准**：
  - [x] 主流浏览器兼容矩阵（`browser_matrix` ≥4 浏览器 + probe budget，r51 companion）
  - [x] 企微/钉钉推送配置契约 + 降级路径（`push_config` + `push_channels` mock/降级，r46 L1 + r51 companion）
- **代码锚点**：`backend/app/core/nfr/push_config.py` · `backend/app/core/nfr/browser_matrix.py` · `backend/app/core/nfr/push_channels.py` · `backend/app/api/v1/nfr.py` · `tests/test_nfr_gov_conn_r51.py`
- **演化建议**：r51 companion 闭合浏览器矩阵探测与推送通道降级链；后续补真实推送 SDK 全量对接与 Admin UI
### [NFR-007] NFR-06 信创国产化

- **状态**：部分实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：四期
- **描述**：NFR-06 信创国产化（SRS 追溯项）。
- **验收标准**：
  - [x] 信创 DB 按需连通（合规清单含 `registeredXinchuangConnectors` 含 gbase，r46 L1）
  - [x] 不合规项枚举与修复指引（`enumerate_non_compliant` + remediation，r51 companion）
  - [ ] 部署验收报告
- **代码锚点**：`backend/app/core/nfr/xinchuang.py` · `backend/app/api/v1/nfr.py` · `tests/test_nfr_gov_conn_r51.py`
- **演化建议**：r51 companion 闭合合规检查非阻塞探测与 strict 模式拦截；后续补部署验收报告与全量信创认证
### [NFR-008] NFR-08 自主可控零 DE/SS

- **状态**：部分实现（companion r57）
- **goal_ref**：goal.md §2.1（G1）
- **期次**：四期
- **描述**：NFR-08 自主可控零 DE/SS（SRS 追溯项）。
- **验收标准**：
  - [x] 生产无 Superset/DataEase 进程（r53 L1：`GET /api/v1/nfr/runtime-compliance` loaded-modules + pyproject 依赖扫描；非 OS 进程枚举）
  - [x] 依赖审计通过（pyproject-dependencies item + remediation；strict/permissive `POST assert`）
  - [x] 部署验收报告（r57 companion：`GET /api/v1/nfr/deployment-report` accepted/conditional/rejected + remediation_index；≤100ms）
- **代码锚点**：`backend/app/core/nfr/runtime_guard.py` · `backend/app/core/nfr/deployment_report.py` · `backend/app/api/v1/nfr.py` · `tests/test_dash_rpt_query_nfr_r53.py` T-NFR-R53-008-01~06 · `tests/test_dash_rpt_query_nfr_r57.py` T-NFR-R57-008-01~05
- **演化建议**：r57 companion 闭合 deployment-report API、strict 拒绝链与性能预算；后续补 ops 全量验收报告与 CI 门禁集成
- **里程碑对齐**：
