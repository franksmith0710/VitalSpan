# F03-DS 数据源平台

> 模块：连接层 · 8 维评分见 [`../prd.md`](../prd.md)

### [DS-001] ConnectorRegistry 插件注册表

- **状态**：已实现（L1 kickoff r22；quality r23/r24）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：ConnectorRegistry 插件注册表（SRS 追溯项）。
- **验收标准**：
  - [x] 连接器可注册 type/category/capabilities
  - [x] 新增类型不改核心服务
- **代码锚点**：`backend/app/datasources/registry.py` · `backend/app/datasources/dialects/` · `tests/test_datasources_l1.py` T-DS-R01~R04 · `tests/test_datasources_quality_r23.py` T-DS-R05~R08 · `tests/test_datasources_quality_r24.py` T-DS-R09~R12
- **演化建议**：DS-007 GET `/types` API 对接 export_type_catalog；CONN-002 PostgreSQL 方言；连接池 DS-006；生产 usage_checker 对接 data_sources 表
- **里程碑对齐**：
### [DS-002] 数据源 CRUD API

- **状态**：已实现（L1 kickoff r22；quality r23/r24）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：数据源 CRUD API（SRS 追溯项）。
- **验收标准**：
  - [x] GET/POST/PUT/DELETE `/api/v1/datasources`
  - [x] 返回 dataSourceId
- **代码锚点**：`backend/app/api/v1/datasources.py` · `backend/app/datasources/service.py` · `backend/app/datasources/schemas.py` · `backend/migrations/versions/0010_datasources_connection_options.py` · `tests/test_datasources_l1.py` T-DS-C01~C08 · `tests/test_datasources_quality_r23.py` T-DS-C09~C16 · `tests/test_datasources_quality_r24.py` T-DS-C17~C22
- **演化建议**：Admin UI 数据源管理页；M7 ACL 列表过滤；`sourceDataSourceId` 与 ingestion 对接
- **里程碑对齐**：
### [DS-003] 连通性测试

- **状态**：已实现（L1 kickoff r22；quality r23/r24）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：连通性测试（SRS 追溯项）。
- **验收标准**：
  - [x] POST test 端点返回成功/失败原因
  - [x] 超时与错误结构化
- **代码锚点**：`backend/app/api/v1/datasources.py` · `backend/app/datasources/service.py` · `tests/test_datasources_l1.py` T-DS-T01~T05 · `tests/test_datasources_quality_r23.py` T-DS-T06~T10 · `tests/test_datasources_quality_r24.py` T-DS-T11~T15
- **演化建议**：可配置超时；真实 compose MySQL 集成测试；分布式 inflight 锁
- **里程碑对齐**：
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

- **状态**：已实现（L1 kickoff r22；quality r23/r24）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：凭证加密存储（SRS 追溯项）。
- **验收标准**：
  - [x] 密码 Fernet 加密落库
  - [x] API 不返回明文密码
- **代码锚点**：`backend/app/datasources/credentials.py` · `backend/app/datasources/models.py` · `tests/test_datasources_l1.py` T-DS-K01~K04 · `tests/test_datasources_quality_r23.py` T-DS-K05~K08 · `tests/test_datasources_quality_r24.py` T-DS-K09~K12
- **演化建议**：凭证轮换 runbook；访问审计与 M7 ACL 联动；密钥轮换生产化
- **里程碑对齐**：
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
