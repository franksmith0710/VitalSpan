# F03-DS 数据源平台

> 模块：连接层 · 8 维评分见 [`../prd.md`](../prd.md)

### [DS-001] ConnectorRegistry 插件注册表

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：ConnectorRegistry 插件注册表（SRS 追溯项）。
- **验收标准**：
  - [ ] 连接器可注册 type/category/capabilities
  - [ ] 新增类型不改核心服务
- **代码锚点**：`backend/app/datasources/registry.py`
- **演化建议**：按 plan.md 期次优先级落地
### [DS-002] 数据源 CRUD API

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：数据源 CRUD API（SRS 追溯项）。
- **验收标准**：
  - [ ] GET/POST/PUT/DELETE `/api/v1/datasources`
  - [ ] 返回 dataSourceId
- **代码锚点**：`backend/app/datasources/api/`
- **演化建议**：按 plan.md 期次优先级落地
### [DS-003] 连通性测试

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：连通性测试（SRS 追溯项）。
- **验收标准**：
  - [ ] POST test 端点返回成功/失败原因
  - [ ] 超时与错误结构化
- **代码锚点**：`backend/app/datasources/test.py`
- **演化建议**：按 plan.md 期次优先级落地
### [DS-004] Schema 元数据浏览

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：Schema 元数据浏览（SRS 追溯项）。
- **验收标准**：
  - [ ] schemas/tables/columns 三级浏览 API
  - [ ] 仅返回已授权数据源
- **代码锚点**：`backend/app/datasources/metadata/`
- **演化建议**：按 plan.md 期次优先级落地
### [DS-005] 凭证加密存储

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：凭证加密存储（SRS 追溯项）。
- **验收标准**：
  - [ ] 密码 Fernet 加密落库
  - [ ] API 不返回明文密码
- **代码锚点**：`backend/app/datasources/credentials.py`
- **演化建议**：按 plan.md 期次优先级落地
### [DS-006] 连接池按 dataSourceId 隔离

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：连接池按 dataSourceId 隔离（SRS 追溯项）。
- **验收标准**：
  - [ ] 每数据源独立连接池
  - [ ] 池参数可配置
- **代码锚点**：`backend/app/datasources/pool.py`
- **演化建议**：按 plan.md 期次优先级落地
### [DS-007] 已注册类型清单 API

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：已注册类型清单 API（SRS 追溯项）。
- **验收标准**：
  - [ ] GET `/api/v1/datasources/types`
  - [ ] 未注册类型不在 UI 展示
- **代码锚点**：`backend/app/datasources/types.py`
- **演化建议**：按 plan.md 期次优先级落地
### [DS-008] 数据源授权与 M7 集成

- **状态**：未实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：数据源授权与 M7 集成（SRS 追溯项）。
- **验收标准**：
  - [ ] 用户仅见已授权 dataSourceId
  - [ ] 越权访问返回 403
- **代码锚点**：`backend/app/datasources/acl.py`
- **演化建议**：按 plan.md 期次优先级落地
