# F15-NFR 非功能需求

> 模块：NFR · 8 维评分见 [`../prd.md`](../prd.md)

### [NFR-001] NFR-01 Dashboard 首屏性能

- **状态**：部分实现（companion M5 perf smoke）
- **goal_ref**：goal.md §2.1（G1）
- **期次**：一期
- **描述**：NFR-01 Dashboard 首屏性能（SRS 追溯项）。
- **验收标准**：
  - [x] 首屏 ≤ 5s（r64 L1：`POST validate` + `POST /api/v1/nfr/dashboard-first-screen/probe` mock elapsedMs=800 + budgetMs default 5000 + `DASHBOARD_FIRST_SCREEN_*` 错误域 + simulateSlow breach）
  - [x] companion ACL/probe 边界（r67：enterprise 越权 dashboardId 403、dashboardId 含空格 422；`probe_validate_first_screen_budget_ms`/`probe_first_screen_probe_budget_ms` ≤50ms）
  - [x] fe 首屏 P95 smoke（M5：`dashboard-first-screen.perf.smoke.test.tsx` 四类扩展 widget 首屏 P95 ≤3000ms + `test_nfr_001_first_screen_smoke.py`）
  - [ ] 并发压测报告（mock probe only；无 `tests/perf/nfr01_dashboard/` 真实 perf suite）
- **代码锚点**：`backend/app/core/nfr/dashboard_first_screen.py` · `backend/app/api/v1/nfr.py` · `fe/src/pages/admin/dashboard/dashboard-first-screen.perf.smoke.test.tsx` · `tests/test_nfr_cat_r64.py` T-NFR-R64-001-01~06 · `tests/test_nfr_001_first_screen_smoke.py` · `tests/test_dash_nfr_conn_rpt_r67.py` T-NFR-R67-001-01~06
- **演化建议**：M5 companion 闭合 fe 首屏 P95 smoke；后续补真实首屏 perf suite 与并发压测报告
- **里程碑对齐**：
### [NFR-002] NFR-01 报表查询性能

- **状态**：部分实现（companion r67）
- **goal_ref**：goal.md §2.1（G1）
- **期次**：二期
- **描述**：NFR-01 报表查询性能（SRS 追溯项）。
- **验收标准**：
  - [x] 报表查询 ≤ 10s（r61 L1：`POST validate` + `POST /api/v1/nfr/report-perf/probe` + mock elapsedMs=120 + budgetMs default 10000 + `REPORT_PERF_*` 错误域）
  - [x] companion ACL/probe 边界（r67：enterprise 越权 reportId 403、非法 sampleQueryId 422、simulateFailure 降级；`probe_validate_report_perf_budget_ms`/`probe_report_perf_probe_budget_ms` ≤50ms）
  - [ ] 抽样通过（mock probe only；无 `tests/perf/nfr01_report/` 真实 perf suite）
- **代码锚点**：`backend/app/core/nfr/report_perf.py` · `backend/app/api/v1/nfr.py` · `tests/test_cat_dash_viz_nfr_r61.py` T-NFR-R61-002-01~06 · `tests/test_dash_nfr_conn_rpt_r67.py` T-NFR-R67-002-01~06
- **演化建议**：r67 companion 闭合 report-perf ACL、sampleQueryId 校验与 validate/probe perf probe；后续补真实报表查询 perf suite 与抽样门禁
- **里程碑对齐**：
### [NFR-003] NFR-02 核心看板可用性

- **状态**：部分实现（companion r68）
- **goal_ref**：goal.md §2.1（G1）
- **期次**：二期
- **描述**：NFR-02 核心看板可用性（SRS 追溯项）。
- **验收标准**：
  - [x] SLA ≥ 99.5%（r62 L1：`POST /api/v1/nfr/dashboard-sla/probe` mock uptime 99.7% + breach 模拟 + `withinSla` 判定）
  - [x] 监控告警配置（r62 L1：`GET /api/v1/nfr/dashboard-sla/alerts` channels/threshold stub）
  - [x] companion enterprise ACL + dashboardId 校验 + alerts threshold + perf probe（r68：`set_user_dashboard_sla_scope` + `NFR_SLA_DASHBOARD_ID_INVALID`/`NFR_SLA_ALERTS_THRESHOLD_OUT_OF_RANGE` 422；enterprise scope 403；`probe_dashboard_sla_validate_budget_ms`/`probe_dashboard_sla_budget_ms` ≤50ms）
  - [ ] 生产级 SLA 采集与 ops 告警联动（无真实 metrics store 与 PagerDuty 集成）
- **代码锚点**：`backend/app/core/nfr/dashboard_sla.py` · `backend/app/api/v1/nfr.py` · `tests/test_cat_nfr_rpt_meta_r62.py` T-NFR-R62-003-01~06 · `tests/test_nfr_gov_rpt_view_r68.py` T-NFR-R68-003-01~10
- **演化建议**：r68 companion 闭合 dashboard SLA enterprise ACL、dashboardId pattern、alerts threshold 与 validate/probe perf probe；后续补生产 metrics 采集与 ops 告警全链路
- **里程碑对齐**：
### [NFR-004] NFR-03 HTTPS 脱敏审计

- **状态**：部分实现（companion r68）
- **goal_ref**：goal.md §2.1（G1）
- **期次**：一期
- **描述**：NFR-03 HTTPS 脱敏审计（SRS 追溯项）。
- **验收标准**：
  - [x] 全站 HTTPS（r64 L1：`GET /api/v1/nfr/https-audit/status` httpsEnforced/webhookHttpsOnly/tlsMinVersion stub）
  - [x] 敏感字段脱敏+审计（r64 L1：`POST /api/v1/nfr/https-audit/mask-probe` password/apiKey/token 脱敏 + maskedFields + auditLogged mock）
  - [x] companion auditScope ACL + simulateAuditFailure + perf probe（r68：`set_user_https_audit_scope` + `NFR_HTTPS_AUDIT_SCOPE_INVALID` 422；enterprise scope 403；`simulateAuditFailure` 503；`probe_https_audit_mask_budget_ms`/`probe_https_audit_status_budget_ms` ≤50ms）
  - [ ] 生产 TLS 终止与全链路审计 store（无 ingress 强制与持久化审计写入）
- **代码锚点**：`backend/app/core/nfr/https_audit.py` · `backend/app/api/v1/nfr.py` · `tests/test_nfr_cat_r64.py` T-NFR-R64-004-01~06 · `tests/test_nfr_gov_rpt_view_r68.py` T-NFR-R68-004-01~09
- **演化建议**：r68 companion 闭合 https-audit auditScope ACL、simulateAuditFailure 与 mask/status perf probe；后续补生产 TLS 强制与审计 store 全链路
- **里程碑对齐**：
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
