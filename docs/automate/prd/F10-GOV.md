# F10-GOV 查询服务治理

> 模块：M8 · 8 维评分见 [`../prd.md`](../prd.md)

### [GOV-001] 查询接口分类 catalog 附录 E

- **状态**：已实现（M6 appendix E L1）
- **goal_ref**：goal.md §2.5（G5）
- **期次**：一期
- **描述**：查询接口分类 catalog 附录 E（SRS 追溯项）。
- **验收标准**：
  - [x] CAT-01/02/03 三分法 taxonomy seed + list API（r30 L1）
  - [x] catalog 条目 CRUD + 分类挂载
  - [x] 非法 category 过滤 4xx + 分页边界 + DELETE 解绑（r31，`CATALOG_INVALID_CATEGORY`）
  - [x] 7 类 taxonomy 可配置（M6 r219：`GET /api/v1/gov/catalog/appendix-e` CAT-01~07 + `appendix_e.py` schema；`categories` 同步 7 类）
  - [x] appendix E probe ≤50ms + enterprise ACL `GOV_APPENDIX_E_FORBIDDEN`（`test_gov_001_catalog_appendix_e.py` T-GOV-001-04~05）
  - [ ] WS-01 对齐纪要
- **代码锚点**：`backend/app/governance/catalog/` · `backend/app/governance/catalog/appendix_e.py` · `backend/app/governance/catalog/probe.py` · `backend/migrations/versions/0014_gov_catalog.py` · `backend/app/api/v1/gov.py` · `tests/test_gov_001_catalog_appendix_e.py`
- **演化建议**：M6 L1 已闭合 7 类 appendix E taxonomy + probe/ACL；后续补 WS-01 对齐纪要与 Admin UI
- **里程碑对齐**：M6 · 已完成 · 2026-07-06
### [GOV-002] 总线 PoC 半自动注册 FR-1.1

- **状态**：部分实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：一期
- **描述**：总线 PoC 半自动注册 FR-1.1（SRS 追溯项）。
- **验收标准**：
  - [x] `POST /api/v1/gov/bus/register` 半自动注册（内存 adapter）
  - [x] OpenAPI operationId 与登记回执（traceId/busId）
  - [x] 总线失败路径：timeout/4xx/5xx + 幂等登记 + admin 403（r31）
  - [ ] ≥2 真实总线端点对接
  - [ ] 完整审批工单流水线
- **代码锚点**：`backend/app/governance/bus/poc.py` · `backend/app/governance/catalog/service.py`
- **演化建议**：r31 扩展 force-timeout/4xx/5xx、幂等 201→200、admin 守卫与失败不留 succeeded 行（T-GOV-R31-002~005）；后续接真实总线 HTTP 与全自动发布
- **里程碑对齐**：
### [GOV-003] 工单流程模板 FR-1.2

- **状态**：部分实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：工单流程模板 FR-1.2（SRS 追溯项）。
- **验收标准**：
  - [x] 草稿→待审批→设计中→待发布→已发布（r49 L1：`standard_query_release` 五态 FSM + transition API）
  - [x] 节点角色描述与 resolve（r52 companion：GET `workflow/templates/{id}/node-roles` + 并发/幂等/终态守卫）
  - [ ] 节点角色可配置（r52 内置模板固定角色；BPM UI 留远期）
- **代码锚点**：`backend/app/governance/workflow/` · `backend/app/governance/workflow/node_roles.py` · `backend/app/api/v1/gov.py` · `tests/test_design_conn_gov_query_r49.py` · `tests/test_design_conn_gov_query_r52.py` T-GOV-R52-003-01~10
- **演化建议**：r52 companion 闭合节点角色 API、双 submit 409、终态再迁移拦截、probe <50ms；后续补 BPM 可配置角色与审批 UI
- **里程碑对齐**：
### [GOV-004] 可视化查询设计 FR-1.3

- **状态**：部分实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：可视化查询设计 FR-1.3（SRS 追溯项）。
- **验收标准**：
  - [x] 查询条件 validate/save/get API（`visual_query_design` config_store，r34 L1）
  - [x] 未知 fieldId → 422 + `detail.fields`（r34）
  - [x] revision 乐观锁冲突 → 409 `CONFIG_VERSION_CONFLICT`（r34）
  - [x] 空 conditions、非法 aggregate、blank title、未知 dataSourceId、get 404 边界 + `detail.fields`（r35）
  - [ ] 拖拽配置查询条件与运算规则（前端）
  - [ ] 加减乘除/聚合运算规则链
- **代码锚点**：`backend/app/governance/query_design/` · `backend/app/api/v1/gov.py` · `tests/test_connectors_gov_r34.py` · `tests/test_connectors_gov_r35.py`
- **演化建议**：r35 巩固 gov validate/save/get 边界与 computeRules detail.fields；后续接 explore 拖拽 UI 与 compute_rules 链
- **里程碑对齐**：
### [GOV-005] 查询服务发布 FR-1.4

- **状态**：部分实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：查询服务发布 FR-1.4（SRS 追溯项）。
- **验收标准**：
  - [x] 发布审批后自动创建接口（draft→pending_publish→published FSM + integration list 可见，r46 L1）
  - [x] 审批通知钩子（submit/approve/reject 通知 + 幂等双批单通知，r51 companion）
- **代码锚点**：`backend/app/governance/publish/` · `backend/app/governance/publish/notifications.py` · `backend/app/api/v1/gov.py` · `tests/test_nfr_gov_conn_r51.py`
- **演化建议**：r51 companion 闭合审批通知契约与非法状态/并发拦截；后续补申请人 UI 通知与 BPM 工单流
### [GOV-006] 发布引擎 OpenAPI 映射

- **状态**：部分实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：发布引擎 OpenAPI 映射（SRS 追溯项）。
- **验收标准**：
  - [x] 配置项自动映射 OpenAPI（published catalog entry → openapi-mappings store）
  - [x] validate 端点支持 entityTypeRef 与 path 前缀校验
  - [x] apiVersion 边界 + operationId 校验 + deactivate 幂等（r55 companion）
  - [ ] 只读 GET 查询聚合与 OpenAPI 文档生成
- **代码锚点**：`backend/app/governance/openapi/` · `backend/app/api/v1/gov.py` · `tests/test_rpt_gov_meta_conn_r54.py` T-R54-GOV-01~08 · `tests/test_rpt_gov_meta_conn_r55.py` T-GOV-R55-01~08
- **演化建议**：r55 companion 闭合 apiVersion/operationId 校验、deactivate 409 守卫、draft entry 拒绝与 probe <200ms；后续补只读 GET 聚合与 OpenAPI 文档生成
### [GOV-007] 总线全自动注册 FR-1.1

- **状态**：部分实现（companion r68）
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：总线全自动注册 FR-1.1（SRS 追溯项）。
- **验收标准**：
  - [x] 发布引擎→总线全自动（r60 L1：`POST /api/v1/gov/bus/auto-register` + FSM draft→registering→succeeded/failed + 幂等 201/200）
  - [x] ≥ PoC 能力（integration/admin 角色；published catalog entry 前置；403 `GOV_AUTO_BUS_*` 守卫；mock busId）
  - [x] companion FSM 非法转移守卫 + path scope + HTTP probe（r68：`GOV_AUTO_BUS_INVALID_TRANSITION` 409 failed→retry；`set_user_auto_bus_scope` enterprise 403；`GET /api/v1/gov/bus/auto-register/probe` ≤50ms；r60 force_fail 回归保留）
  - [ ] 真实总线 HTTP 对接与失败重试/熔断
- **代码锚点**：`backend/app/governance/bus/auto.py` · `backend/app/governance/bus/probe.py` · `backend/app/api/v1/gov.py` · `tests/test_rpt_view_cat_gov_r60.py` T-GOV-R60-007-01~08 · `tests/test_nfr_gov_rpt_view_r68.py` T-GOV-R68-007-01~07
- **演化建议**：r68 companion 闭合 auto-register FSM 非法转移、enterprise path scope 与 HTTP probe；后续补真实总线 HTTP、失败重试链与 publish 引擎联动
- **里程碑对齐**：
### [GOV-008] 治理权限联动 FR-1.6

- **状态**：部分实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：治理权限联动 FR-1.6（SRS 追溯项）。
- **验收标准**：
  - [x] query-design save `pending_publish` ACL（viewer 403 `GOV_ACL_FORBIDDEN`，admin 200，r34）
  - [x] RLS 绑定 smoke（`resolve_user_org_node_ids` + `get_query_rls_fragment`，r34 mock）
  - [x] `POST preview-execute` ACL/RLS 链：viewer 403、designer 无 org 403、admin bypass 审计、空 RLS 链、save 联合回归（r35）
  - [ ] 完整发布流程与 M7 权限联动
  - [ ] 发布后 RLS 端到端生效
- **代码锚点**：`backend/app/governance/acl.py` · `backend/app/governance/query_design/service.py` · `backend/app/api/v1/gov.py` · `tests/test_connectors_gov_r34.py` · `tests/test_connectors_gov_r35.py`
- **演化建议**：r35 闭合 preview-execute ACL/RLS 链与 bypass 审计；后续接 publish 引擎与真实 org 绑定回归
- **里程碑对齐**：
