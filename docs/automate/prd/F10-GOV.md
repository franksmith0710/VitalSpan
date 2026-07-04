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
  - [ ] 7 类 taxonomy 可配置
  - [ ] WS-01 对齐纪要
- **代码锚点**：`backend/app/governance/catalog/` · `backend/migrations/versions/0014_gov_catalog.py` · `backend/app/api/v1/gov.py`
- **演化建议**：r30 migration 0014 + seed 三分法 + entries API（T-GOV-R30-001~010）；后续扩展完整 7 类与 Admin UI
- **里程碑对齐**：
### [GOV-002] 总线 PoC 半自动注册 FR-1.1

- **状态**：部分实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：一期
- **描述**：总线 PoC 半自动注册 FR-1.1（SRS 追溯项）。
- **验收标准**：
  - [x] `POST /api/v1/gov/bus/register` 半自动注册（内存 adapter）
  - [x] OpenAPI operationId 与登记回执（traceId/busId）
  - [ ] ≥2 真实总线端点对接
  - [ ] 完整审批工单流水线
- **代码锚点**：`backend/app/governance/bus/poc.py` · `backend/app/governance/catalog/service.py`
- **演化建议**：r30 InMemoryBusPoCAdapter + draft/force-fail 分支（T-GOV-R30-011~015）；后续接真实总线 HTTP 与全自动发布
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

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：可视化查询设计 FR-1.3（SRS 追溯项）。
- **验收标准**：
  - [ ] 拖拽配置查询条件与运算规则
  - [ ] 加减乘除/聚合
- **代码锚点**：`frontend/src/pages/explore/`
- **演化建议**：按 plan.md 期次优先级落地
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

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：治理权限联动 FR-1.6（SRS 追溯项）。
- **验收标准**：
  - [ ] 发布流程与 M7 权限联动
  - [ ] 发布后 RLS 生效
- **代码锚点**：`backend/app/governance/acl.py`
- **演化建议**：按 plan.md 期次优先级落地
