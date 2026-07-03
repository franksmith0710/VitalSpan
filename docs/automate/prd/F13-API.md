# F13-API 开放接口

> 模块：IF · 8 维评分见 [`../prd.md`](../prd.md)

### [API-001] IF-06 数据源管理 API

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：IF-06 数据源管理 API（SRS 追溯项）。
- **验收标准**：
  - [ ] datasources CRUD+test+metadata
  - [ ] OpenAPI 文档完整
- **代码锚点**：`backend/app/api/v1/datasources.py`
- **演化建议**：按 plan.md 期次优先级落地
### [API-002] IF-06 查询执行 API

- **状态**：未实现
- **goal_ref**：goal.md §2.3（G3）
- **期次**：一期
- **描述**：IF-06 查询执行 API（SRS 追溯项）。
- **验收标准**：
  - [ ] POST query/execute
  - [ ] 只读约束
- **代码锚点**：`backend/app/api/v1/query.py`
- **演化建议**：按 plan.md 期次优先级落地
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
