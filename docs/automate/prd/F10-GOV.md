# F10-GOV 查询服务治理

> 模块：M8 · 8 维评分见 [`../prd.md`](../prd.md)

### [GOV-001] 查询接口分类 catalog 附录 E

- **状态**：部分实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：一期
- **描述**：查询接口分类 catalog 附录 E（SRS 追溯项）。
- **验收标准**：
  - [x] CAT-01/02/03 三分法 taxonomy seed + list API（r30 L1）
  - [x] catalog 条目 CRUD + 分类挂载
  - [x] 非法 category 过滤 4xx + 分页边界 + DELETE 解绑（r31，`CATALOG_INVALID_CATEGORY`）
  - [ ] 7 类 taxonomy 可配置
  - [ ] WS-01 对齐纪要
- **代码锚点**：`backend/app/governance/catalog/` · `backend/migrations/versions/0014_gov_catalog.py` · `backend/app/api/v1/gov.py`
- **演化建议**：r31 扩展非法分类 4xx、分页与 DELETE 解绑 + bus 联动回归（T-GOV-R31-001~005）；后续扩展完整 7 类与 Admin UI
- **里程碑对齐**：
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

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：工单流程模板 FR-1.2（SRS 追溯项）。
- **验收标准**：
  - [ ] 草稿→待审批→设计中→待发布→已发布
  - [ ] 节点角色可配置
- **代码锚点**：`backend/app/governance/workflow/`
- **演化建议**：按 plan.md 期次优先级落地
### [GOV-004] 可视化查询设计 FR-1.3

- **状态**：部分实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：可视化查询设计 FR-1.3（SRS 追溯项）。
- **验收标准**：
  - [x] 查询条件 validate/save/get API（`visual_query_design` config_store，r34 L1）
  - [x] 未知 fieldId → 422 + `detail.fields`（r34）
  - [x] revision 乐观锁冲突 → 409 `CONFIG_VERSION_CONFLICT`（r34）
  - [ ] 拖拽配置查询条件与运算规则（前端）
  - [ ] 加减乘除/聚合运算规则链
- **代码锚点**：`backend/app/governance/query_design/` · `backend/app/api/v1/gov.py` · `tests/test_connectors_gov_r34.py`
- **演化建议**：r34 L1 后端 aggregate + config_store 持久化；后续接 explore 拖拽 UI 与 compute_rules 链
- **里程碑对齐**：
### [GOV-005] 查询服务发布 FR-1.4

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：查询服务发布 FR-1.4（SRS 追溯项）。
- **验收标准**：
  - [ ] 发布审批后自动创建接口
  - [ ] 通知申请人
- **代码锚点**：`backend/app/governance/publish/`
- **演化建议**：按 plan.md 期次优先级落地
### [GOV-006] 发布引擎 OpenAPI 映射

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：发布引擎 OpenAPI 映射（SRS 追溯项）。
- **验收标准**：
  - [ ] 配置项自动映射 OpenAPI
  - [ ] 仅只读 GET/POST 查询
- **代码锚点**：`backend/app/governance/openapi/`
- **演化建议**：按 plan.md 期次优先级落地
### [GOV-007] 总线全自动注册 FR-1.1

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：总线全自动注册 FR-1.1（SRS 追溯项）。
- **验收标准**：
  - [ ] 发布引擎→总线全自动
  - [ ] ≥ PoC 能力
- **代码锚点**：`backend/app/governance/bus/auto.py`
- **演化建议**：按 plan.md 期次优先级落地
### [GOV-008] 治理权限联动 FR-1.6

- **状态**：部分实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：治理权限联动 FR-1.6（SRS 追溯项）。
- **验收标准**：
  - [x] query-design save `pending_publish` ACL（viewer 403 `GOV_ACL_FORBIDDEN`，admin 200，r34）
  - [x] RLS 绑定 smoke（`resolve_user_org_node_ids` + `get_query_rls_fragment`，r34 mock）
  - [ ] 完整发布流程与 M7 权限联动
  - [ ] 发布后 RLS 端到端生效
- **代码锚点**：`backend/app/governance/acl.py` · `backend/app/governance/query_design/service.py` · `tests/test_connectors_gov_r34.py`
- **演化建议**：r34 L1 ACL hooks + RLS smoke；后续接 publish 引擎与真实 org 绑定回归
- **里程碑对齐**：
