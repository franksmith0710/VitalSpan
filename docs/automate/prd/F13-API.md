# F13-API 开放接口

> 模块：IF · 8 维评分见 [`../prd.md`](../prd.md)

### [API-001] IF-06 数据源管理 API

- **状态**：已实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：IF-06 数据源管理 API（SRS 追溯项）。
- **验收标准**：
  - [x] datasources CRUD+test+metadata
  - [x] OpenAPI IF-06 tag/示例（`openapi/extensions.py`）
  - [x] path 参数与 POST/GET response example + 401 smoke（r31）
- **代码锚点**：`backend/app/api/v1/datasources.py` · `backend/app/openapi/extensions.py`
- **演化建议**：r31 IF-06 datasources path/response 示例与鉴权 smoke（T-API-R31-001~004）；后续可补对外 alias 与只读/管理分离策略文档
- **里程碑对齐**：
### [API-002] IF-06 查询执行 API

- **状态**：已实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：IF-06 查询执行 API（SRS 追溯项）。
- **验收标准**：
  - [x] POST query/execute
  - [x] 只读约束（复用 r27 readonly guard + RLS 链）
  - [x] IF-06 execute OpenAPI 200 example + 401/403/只读拒绝 pytest（r31）
- **代码锚点**：`backend/app/api/v1/query.py` · `backend/app/openapi/extensions.py`
- **演化建议**：r31 execute response example 与越权/多语句拒绝回归（T-API-R31-002~004）；后续可补对外限流与 catalog 联动
- **里程碑对齐**：
### [API-003] IF-02 查询服务 API

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：IF-02 查询服务 API（SRS 追溯项）。
- **验收标准**：
  - [ ] 配置生成的标准查询接口
  - [ ] 版本 v1 前缀
- **代码锚点**：`backend/app/api/v1/services/`
- **演化建议**：按 plan.md 期次优先级落地
### [API-004] IF-01 总线注册适配

- **状态**：未实现
- **goal_ref**：goal.md §2.5（G5）
- **期次**：四期
- **描述**：IF-01 总线注册适配（SRS 追溯项）。
- **验收标准**：
  - [ ] 已发布接口自动注册总线
  - [ ] 注册失败可重试
- **代码锚点**：`backend/app/governance/bus/adapter.py`
- **演化建议**：按 plan.md 期次优先级落地
### [API-005] IF-03 报表文档 API

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：IF-03 报表文档 API（SRS 追溯项）。
- **验收标准**：
  - [ ] 按模板/时间提取 Word/PDF/Excel
  - [ ] 鉴权与限流
- **代码锚点**：`backend/app/api/v1/reports/export.py`
- **演化建议**：按 plan.md 期次优先级落地
### [API-006] IF-04 门户嵌入 API

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：三期
- **描述**：IF-04 门户嵌入 API（SRS 追溯项）。
- **验收标准**：
  - [ ] embed token 签发
  - [ ] SDK 初始化参数
- **代码锚点**：`backend/app/api/v1/embed.py`
- **演化建议**：按 plan.md 期次优先级落地
### [API-007] OpenAPI 规范与版本策略

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：一期
- **描述**：OpenAPI 规范与版本策略（SRS 追溯项）。
- **验收标准**：
  - [ ] `/api/v1/` 前缀统一
  - [ ] 破坏性变更升 v2 文档
- **代码锚点**：`backend/app/openapi/`
- **演化建议**：按 plan.md 期次优先级落地
