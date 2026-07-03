# F10-GOV 查询服务治理

> 模块：M8 · 8 维评分见 [`../prd.md`](../prd.md)

### [GOV-001] 查询接口分类 catalog 附录 E

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：一期
- **描述**：查询接口分类 catalog 附录 E（SRS 追溯项）。
- **验收标准**：
  - [ ] 7 类 taxonomy 可配置
  - [ ] WS-01 对齐纪要
- **代码锚点**：`backend/app/governance/catalog/`
- **演化建议**：按 plan.md 期次优先级落地
### [GOV-002] 总线 PoC 半自动注册 FR-1.1

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：一期
- **描述**：总线 PoC 半自动注册 FR-1.1（SRS 追溯项）。
- **验收标准**：
  - [ ] ≥2 API 半自动注册
  - [ ] OpenAPI 描述
- **代码锚点**：`backend/app/governance/bus/poc.py`
- **演化建议**：按 plan.md 期次优先级落地
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
