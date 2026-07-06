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
- **演化建议**：生产 usage_checker 对接 data_sources 表；Admin UI 类型选择；多方言 schema_browser 扩展
- **里程碑对齐**：
### [DS-002] 数据源 CRUD API

- **状态**：已实现（L1 kickoff r22；quality r23/r24；M-FE-1 FE companion r195）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **里程碑对齐**：M-FE-1 · 已完成 · 2026-07-06
- **描述**：数据源 CRUD API（SRS 追溯项）；M-FE-1 补齐 `/admin/datasources` 列表/新建/编辑页。
- **验收标准**：
  - [x] GET/POST/PUT/DELETE `/api/v1/datasources`
  - [x] 返回 dataSourceId
  - [x] `/admin/datasources` 列表/新建/编辑路由注册
  - [x] 对接 `GET/POST/PATCH /api/v1/datasources`
  - [x] `fe/src/routes.tsx` 与侧栏「数据」分组对齐 `layout.md` §3
- **代码锚点**：`backend/app/api/v1/datasources.py` · `backend/app/datasources/service.py` · `fe/src/pages/admin/datasources/DatasourceListPage.tsx` · `fe/src/pages/admin/datasources/DatasourceFormPage.tsx` · `fe/src/config/admin-nav.tsx`
- **演化建议**：Admin UI 数据源管理页已交付；M7 ACL 列表过滤；`sourceDataSourceId` 与 ingestion 对接；二期 Playwright E2E 真实建源
### [DS-003] 连通性测试

- **状态**：已实现（L1 kickoff r22；quality r23/r24；M-FE-1 FE companion r195）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **里程碑对齐**：M-FE-1 · 已完成 · 2026-07-06
- **描述**：连通性测试（SRS 追溯项）；M-FE-1 补齐详情页触发 test 与结构化错误展示。
- **验收标准**：
  - [x] POST test 端点返回成功/失败原因
  - [x] 超时与错误结构化
  - [x] 详情页触发 `POST .../datasources/{id}/test`
  - [x] 展示结构化错误（非笼统「操作失败」）
- **代码锚点**：`backend/app/api/v1/datasources.py` · `backend/app/datasources/service.py` · `fe/src/pages/admin/datasources/DatasourceDetailPage.tsx` · `tests/test_datasources_l1.py` T-DS-T01~T05
- **演化建议**：可配置超时；真实 compose MySQL 集成测试 + 浏览器 E2E（M-FE-2）；分布式 inflight 锁
### [DS-004] Schema 元数据浏览

- **状态**：已实现
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **里程碑对齐**：M-FE-2 · 已完成 · 2026-07-06
- **描述**：Schema 元数据浏览（SRS 追溯项）。
- **验收标准**：
  - [x] schemas/tables/columns 三级浏览 API
  - [x] 仅返回已授权数据源
  - [x] Admin UI schema 三级浏览（数据源详情页）
- **代码锚点**：`backend/app/datasources/metadata/service.py` · `backend/app/api/v1/datasources.py` · `backend/app/datasources/dialects/base.py` · `tests/test_datasources_companion_r25.py` T-DS-MD01~MD06 · `fe/src/components/datasources/SchemaBrowser.tsx`
- **演化建议**：真实 compose MySQL/PostgreSQL 集成测试；大数据量 schema 分页；Playwright E2E 浏览器验收
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

- **状态**：已实现（L1 companion r25）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：连接池按 dataSourceId 隔离（SRS 追溯项）。
- **验收标准**：
  - [x] 每数据源独立连接池
  - [x] 池参数可配置
- **代码锚点**：`backend/app/datasources/pool.py` · `backend/app/datasources/service.py` · `tests/test_datasources_companion_r25.py` T-DS-PL01~PL05
- **演化建议**：池大小/TTL 可配置；分布式环境池驱逐；连接健康检查与自动重连
- **里程碑对齐**：
### [DS-007] 已注册类型清单 API

- **状态**：已实现（L1 companion r25；M-FE-1 FE companion r195）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **里程碑对齐**：M-FE-1 · 已完成 · 2026-07-06
- **描述**：已注册类型清单 API（SRS 追溯项）；M-FE-1 补齐 `/admin/connectors` 只读页。
- **验收标准**：
  - [x] GET `/api/v1/datasources/types`
  - [x] 未注册类型不在 UI 展示
  - [x] `/admin/connectors` 路由与只读列表页
  - [x] 对接 types API；侧栏可导航
- **代码锚点**：`backend/app/api/v1/datasources.py` · `backend/app/datasources/registry.py` · `fe/src/pages/admin/connectors/ConnectorsPage.tsx` · `fe/src/routes.tsx`
- **演化建议**：按 category 过滤；类型图标与文档链接；二期 connector 详情页
### [DS-008] 数据源授权与 M7 集成

- **状态**：已实现（L1 companion r25）
- **goal_ref**：goal.md §2.2（G2）
- **期次**：一期
- **描述**：数据源授权与 M7 集成（SRS 追溯项）。
- **验收标准**：
  - [x] 用户仅见已授权 dataSourceId
  - [x] 越权访问返回 403
- **代码锚点**：`backend/app/datasources/acl.py` · `backend/app/datasources/service.py` · `tests/test_datasources_companion_r25.py` T-DS-AC01~AC05
- **演化建议**：M7 RLS 执行链对接 QUERY；资源授权 Admin UI；批量授权与继承
- **里程碑对齐**：
