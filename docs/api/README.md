# HTTP 路由索引

> **定位**：VitalSpan 对外/对内 HTTP 路由登记簿；与 [arch.md](../arch.md) §5 同步。
> **维护**：新增或修改路由时在本文件补一行；实现后把「状态」改为 `已实现` 并填代码锚点。
> **真理源**：行为需求见 [SRS §6](../srs/全生命周期系统需求规格说明书.md#6-接口需求)；功能项见 [PRD API-001~007](../automate/prd/F13-API.md)。

```yaml
version: 1.0.0
last_updated: 2026-07-04
api_prefix: /api/v1
openapi_docs: /docs
redoc: /redoc
```

## 约定

| 项 | 规则 |
|----|------|
| 前缀 | `/api/v1/`；破坏性变更升 `v2` |
| 认证 | `Authorization: Bearer <token>`（一期 BOOT-003 后启用） |
| 查询类 | 只读；禁止经 API 写入外部数据源 |
| 分页 | `?page=&page_size=`（三期起统一；前期可省略） |
| 错误体 | `{ "code": "...", "message": "...", "detail": ... }` |

**运行时 OpenAPI**：`http://localhost:8000/docs` · `http://localhost:8000/redoc`

---

## 0. 系统

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET | `/health` | 健康检查 | — | P0 | BOOT-001 | 已实现 | `backend/app/main.py` |
| GET | `/docs` | Swagger UI | — | 一期 | API-007 | 规划 | FastAPI 内置 |
| GET | `/redoc` | ReDoc | — | 一期 | API-007 | 规划 | FastAPI 内置 |
| GET | `/openapi.json` | OpenAPI 规范（IF-01~04/06 tag 后处理；`x-api-version-policy`；r44 IF operationId 前缀） | IF-06 | 一期 | API-001, API-002, API-007 | 已实现 | `backend/app/openapi/extensions.py` · `backend/app/openapi/version_policy.py` |

---

## 1. 认证与会话

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET | `/api/v1/me` | M1 占位：当前用户（开发 `Bearer dev`） | 内部 | P0 | BOOT-003 | 已实现 | `backend/app/api/v1/me.py` |
| POST | `/api/v1/auth/login` | 登录，返回 token | 内部 | 一期 | BOOT-003 | 已实现 | `backend/app/api/v1/auth.py` |
| POST | `/api/v1/auth/logout` | 注销 | 内部 | 一期 | BOOT-003 | 规划 | `backend/app/api/v1/auth.py` |
| GET | `/api/v1/auth/me` | 当前用户与角色；二期正式路径，M1 占位见 `GET /api/v1/me` | 内部 | 一期 | AUTH-003 | 规划 | `backend/app/api/v1/auth.py` |

---

## 2. 权限（M7 · IF-06 配套）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET/POST | `/api/v1/roles` | 角色列表/创建（`?code_prefix=&limit=&offset=`；响应 `total`；`RoleOut.is_active`） | 内部 | 一期 | AUTH-001 | 已实现 | `backend/app/api/v1/roles.py` |
| GET/PUT/DELETE | `/api/v1/roles/{id}` | 角色详情/更新/删除（PUT body 可选 `is_active`） | 内部 | 一期 | AUTH-001 | 已实现 | `backend/app/api/v1/roles.py` |
| GET/POST | `/api/v1/users` | 用户列表/创建 | 内部 | 一期 | AUTH-003 | 已实现 | `backend/app/api/v1/users.py` |
| GET/PUT | `/api/v1/users/{id}` | 用户详情/更新 | 内部 | 一期 | AUTH-003 | 规划 | `backend/app/api/v1/users.py` |
| PUT | `/api/v1/users/{id}/roles` | 用户角色绑定 | 内部 | 一期 | AUTH-003 | 已实现 | `backend/app/api/v1/users.py` |
| PUT/GET/DELETE | `/api/v1/users/{id}/org` | 用户组织归属 | 内部 | 一期 | AUTH-002 | 已实现 | `backend/app/api/v1/users.py` |
| GET/POST | `/api/v1/orgs` | 组织树节点 | 内部 | 一期 | AUTH-002 | 已实现 | `backend/app/api/v1/orgs.py` |
| GET/POST/DELETE | `/api/v1/resource-grants` | AUTH-004 资源授权 CRUD | 内部 | 一期 | AUTH-004 | 已实现 | `backend/app/api/v1/resource_grants.py` |
| GET/POST | `/api/v1/rls/dimensions` | 权限维度类型（写操作 admin 守卫 → 403 `DIMENSION_FORBIDDEN`） | 内部 | 一期 | AUTH-005 | 已实现 | `backend/app/api/v1/rls.py` |
| GET | `/api/v1/audit/events` | 审计事件查询（`?target_id=&action=&target_type=&actor_id=&created_after=&created_before=&limit=&offset=` ISO8601 时间窗；admin 守卫；detail 脱敏） | 内部 | 一期 | AUTH-003, AUTH-008 | 已实现 | `backend/app/api/v1/audit.py` |
| GET/POST | `/api/v1/rls/groups` | 维度分组列表/创建 | 内部 | 一期 | AUTH-006 | 已实现 | `backend/app/api/v1/rls.py` |
| GET/PUT/DELETE | `/api/v1/rls/groups/{id}` | 分组详情/更新/删除 | 内部 | 一期 | AUTH-006 | 已实现 | `backend/app/api/v1/rls.py` |
| GET/POST/PUT/DELETE | `/api/v1/rls/groups/{id}/values` | 分组成员值列表/添加/全量替换/删除 | 内部 | 一期 | AUTH-006 | 已实现 | `backend/app/api/v1/rls.py` |
| PUT | `/api/v1/roles/{id}/dimension-values` | 角色直绑维度值全量替换 | 内部 | 一期 | AUTH-006 | 已实现 | `backend/app/api/v1/roles.py` |
| PUT | `/api/v1/roles/{id}/dimension-groups` | 角色分组绑定全量替换 | 内部 | 一期 | AUTH-006 | 已实现 | `backend/app/api/v1/roles.py` |
| GET | `/api/v1/roles/{id}/effective-dimensions` | 角色有效维度集 | 内部 | 一期 | AUTH-006 | 已实现 | `backend/app/api/v1/roles.py` |

> **Admin 权限工作流（FE 下轮）**：`GET /roles` → `GET /rls/dimensions` → `GET /rls/groups` → `PUT /roles/{id}/dimension-groups` → `GET /audit/events`

---

## 3. 数据源（IF-06 · 连接层）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET | `/api/v1/datasources/types` | 已注册连接器类型清单（含 `oceanbase` relational；`type`、`displayName`、`category`、`capabilities`） | IF-06 | 一期 | DS-007 · CONN-020 | 已实现 | `backend/app/api/v1/datasources.py` |
| POST | `/api/v1/datasources` | 创建数据源；请求/响应可选 `connectionOptions`（charset/collation/sslMode/connectTimeoutSec/readTimeoutSec） | IF-06 | 一期 | DS-002 | 已实现 | `backend/app/api/v1/datasources.py` |
| GET | `/api/v1/datasources` | 数据源列表（`?limit=&offset=&type=&q=`）；列表项含 `connectionOptions` | IF-06 | 一期 | DS-002 | 已实现 | `backend/app/api/v1/datasources.py` |
| GET | `/api/v1/datasources/{id}` | 数据源详情（无明文密码）；含 `connectionOptions` | IF-06 | 一期 | DS-002 | 已实现 | `backend/app/api/v1/datasources.py` |
| PUT | `/api/v1/datasources/{id}` | 更新数据源 | IF-06 | 一期 | DS-002 | 已实现 | `backend/app/api/v1/datasources.py` |
| PATCH | `/api/v1/datasources/{id}` | 部分更新数据源；支持部分更新 `connectionOptions` | IF-06 | 一期 | DS-002 | 已实现 | `backend/app/api/v1/datasources.py` |
| DELETE | `/api/v1/datasources/{id}` | 软删数据源（引用中 409 `DATASOURCE_IN_USE`） | IF-06 | 一期 | DS-002 | 已实现 | `backend/app/api/v1/datasources.py` |
| POST | `/api/v1/datasources/test` | 连通性测试（草稿配置；响应含可选 `code`（`MYSQL_*`/`KINGBASE_*`）、`traceId`；**r67** kingbase 参数预校验 422；inflight 并发 429） | IF-06 | 一期 | DS-003 | 已实现 | `backend/app/api/v1/datasources.py` |
| POST | `/api/v1/datasources/{id}/test` | 连通性测试（已保存；同上；inflight 测试完成即释放槽位） | IF-06 | 一期 | DS-003 | 已实现 | `backend/app/api/v1/datasources.py` |
| GET | `/api/v1/datasources/{id}/schemas` | Schema 列表（ACL 过滤；连接失败 502 `METADATA_CONNECTION_FAILED`） | IF-06 | 一期 | DS-004 | 已实现 | `backend/app/api/v1/datasources.py` · `backend/app/datasources/metadata/service.py` |
| GET | `/api/v1/datasources/{id}/tables` | 表列表（`schema` 必填；缺参 400 `METADATA_INVALID_REQUEST`） | IF-06 | 一期 | DS-004 | 已实现 | `backend/app/api/v1/datasources.py` · `backend/app/datasources/metadata/service.py` |
| GET | `/api/v1/datasources/{id}/columns` | 列列表（`schema`+`table` 必填） | IF-06 | 一期 | DS-004 | 已实现 | `backend/app/api/v1/datasources.py` · `backend/app/datasources/metadata/service.py` |

**方言实现（r25）**：`mysql` → `backend/app/datasources/dialects/mysql.py`（CONN-001）；`postgresql` → `backend/app/datasources/dialects/postgres.py`（CONN-002）；`gbase` → `backend/app/datasources/dialects/gbase.py`（CONN-019）；`kingbase` → `backend/app/datasources/dialects/kingbase/`（CONN-018，PG 协议委托，默认 port 54321）。

---

## 3b. NFR 横切（r46 L1 + r51 companion）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET | `/api/v1/nfr/plugin-extension-points` | 连接器插件扩展点清单 | 内部 | 一期 | NFR-005 | 已实现 | `backend/app/api/v1/nfr.py` |
| GET | `/api/v1/nfr/push-config` | 推送配置契约（不泄露 webhook 明文） | 内部 | 一期 | NFR-006 | 已实现 | `backend/app/api/v1/nfr.py` |
| GET | `/api/v1/nfr/xinchuang/compliance` | 信创合规检查清单（strict 违规 → 422） | 内部 | 一期 | NFR-007 | 已实现 | `backend/app/api/v1/nfr.py` |
| GET | `/api/v1/nfr/browser-matrix` | 浏览器兼容矩阵 + 可选 UA 探测 | 内部 | 一期 | NFR-006 | 已实现 | `backend/app/api/v1/nfr.py` |
| POST | `/api/v1/nfr/push-probe` | 推送通道 mock 探测（不发送真实 HTTP） | 内部 | 一期 | NFR-006 | 已实现 | `backend/app/api/v1/nfr.py` |
| GET | `/api/v1/nfr/registration-path/{connector_type}` | 连接器插件登记路径文档 | 内部 | 一期 | NFR-005 | 已实现 | `backend/app/api/v1/nfr.py` |
| GET | `/api/v1/nfr/runtime-compliance` | 零 DE/SS 运行时合规扫描报告（`policyVersion=nfr08-l1`） | 内部 | 一期 | NFR-008 | 已实现 | `backend/app/api/v1/nfr.py` |
| POST | `/api/v1/nfr/runtime-compliance/assert` | strict 模式违规 → 503 `NFR_RUNTIME_VIOLATION`；permissive → 200 | 内部 | 一期 | NFR-008 | 已实现 | `backend/app/api/v1/nfr.py` |
| GET | `/api/v1/nfr/runtime-compliance/deployment-report` | 部署验收报告（`overallAcceptance` + `remediationIndex`） | 内部 | 一期 | NFR-008 | 已实现 | `backend/app/api/v1/nfr.py` |
| POST | `/api/v1/nfr/report-query-perf/probe` | 报表查询性能 mock probe（`withinBudget` + `elapsedMs` stub；**r67** enterprise ACL + `simulateFailure`） | 内部 | 一期 | NFR-002 | 已实现 | `backend/app/api/v1/nfr.py` |
| POST | `/api/v1/nfr/report-query-perf/validate` | 报表查询性能配置校验（`REPORT_PERF_*`；**r67** `sampleQueryId` pattern） | 内部 | 一期 | NFR-002 | 已实现 | `backend/app/api/v1/nfr.py` |
| POST | `/api/v1/nfr/dashboard-first-screen/validate` | NFR-001 首屏配置校验（**r67** enterprise ACL + `dashboardId` pattern） | 内部 | 一期 | NFR-001 | 已实现 | `backend/app/api/v1/nfr.py` |
| POST | `/api/v1/nfr/dashboard-first-screen/probe` | NFR-001 首屏 mock probe（**r67** enterprise ACL） | 内部 | 一期 | NFR-001 | 已实现 | `backend/app/api/v1/nfr.py` |
| POST | `/api/v1/nfr/dashboard-sla/validate` | NFR-003 SLA 配置校验（**r68** enterprise ACL + `dashboardId` pattern） | 内部 | 一期 | NFR-003 | 已实现 | `backend/app/api/v1/nfr.py` |
| POST | `/api/v1/nfr/dashboard-sla/probe` | NFR-003 SLA mock probe（**r68** actor 透传） | 内部 | 一期 | NFR-003 | 已实现 | `backend/app/api/v1/nfr.py` |
| GET | `/api/v1/nfr/dashboard-sla/alerts` | NFR-003 SLA 告警配置（**r68** `thresholdPercent` query） | 内部 | 一期 | NFR-003 | 已实现 | `backend/app/api/v1/nfr.py` |
| GET | `/api/v1/nfr/https-audit/status` | NFR-004 HTTPS 策略探测 | 内部 | 一期 | NFR-004 | 已实现 | `backend/app/api/v1/nfr.py` |
| POST | `/api/v1/nfr/https-audit/mask-probe` | NFR-004 脱敏审计 mock（**r68** `auditScope` ACL + `simulateAuditFailure`） | 内部 | 一期 | NFR-004 | 已实现 | `backend/app/api/v1/nfr.py` |

---

## 4. 查询执行（IF-06 · M3-LITE）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| POST | `/api/v1/query/execute` | 只读查询（sql/table） | IF-06 | 一期 | QUERY-001 | 已实现 | `backend/app/api/v1/query.py` |
| POST | `/api/v1/query/translate` | 可视化查询配置→参数化 SQL | IF-06 | 一期 | QUERY-008 | 已实现 | `backend/app/api/v1/query.py` |
| GET | `/api/v1/query/routing/modes` | 连接器路由模式（search/document/timeseries→native，其余→sql） | IF-06 | 一期 | QUERY-003 | 已实现 | `backend/app/api/v1/query.py` |
| POST | `/api/v1/query/native/validate` | Native 查询守卫（`QUERY_NATIVE_*`；禁止 sql 字段） | IF-06 | 一期 | QUERY-003 | 已实现 | `backend/app/api/v1/query.py` |
| POST | `/api/v1/query/readonly-guard` | 只读 SQL / native 路由守卫 smoke | IF-06 | 一期 | QUERY-003 | 已实现 | `backend/app/api/v1/query.py` |
| GET | `/api/v1/query/bindings` | 图表直连绑定列表 | IF-06 | 一期 | QUERY-005 | 已实现 | `backend/app/api/v1/query.py` |
| POST | `/api/v1/query/bindings` | 创建绑定（可选 `chartId` UUID；重复 → 409 `BINDING_CHART_CONFLICT`） | IF-06 | 一期 | QUERY-005 | 已实现 | `backend/app/api/v1/query.py` |
| GET | `/api/v1/query/bindings/{bindingId}` | 绑定详情 | IF-06 | 一期 | QUERY-005 | 已实现 | `backend/app/api/v1/query.py` |
| PUT | `/api/v1/query/bindings/{bindingId}` | 更新绑定（可选 `chartId` UUID；重复 → 409 `BINDING_CHART_CONFLICT`） | IF-06 | 一期 | QUERY-005 | 已实现 | `backend/app/api/v1/query.py` |
| DELETE | `/api/v1/query/bindings/{bindingId}` | 删除绑定 | IF-06 | 一期 | QUERY-005 | 已实现 | `backend/app/api/v1/query.py` |
| GET | `/api/v1/query/dataset/routing` | Dataset 第三路径路由文档（sql/native/dataset） | IF-06 | 一期 | QUERY-009 | 已实现 | `backend/app/api/v1/query.py` |
| POST | `/api/v1/query/dataset/validate` | Dataset 路径 ACL/readonly 守卫（`QUERY_DATASET_*`/`QUERY_PATH_AMBIGUOUS`） | IF-06 | 一期 | QUERY-009 | 已实现 | `backend/app/api/v1/query.py` |
| POST | `/api/v1/query/dataset/execute-plan` | Dataset execute-plan 四步链 companion（`dataset-plan-v1`；非真实 SQL execute） | IF-06 | 一期 | QUERY-009 | 已实现 | `backend/app/api/v1/query.py` |
| GET/PUT | `/api/v1/query/configs` | 配置元模型存取（`configType`/`schemaVersion`/`refType`/`refId`；可选 `expectedRevision` 乐观锁；revision upsert；payload >256KB → 413 `CONFIG_PAYLOAD_TOO_LARGE`；revision 冲突 → 409 `CONFIG_VERSION_CONFLICT`） | 内部 | 一期 | QUERY-007 | 已实现 | `backend/app/api/v1/query_configs.py` |
| GET | `/api/v1/query/configs/{config_id}` | 按 id 读取配置记录 | 内部 | 一期 | QUERY-007 | 已实现 | `backend/app/api/v1/query_configs.py` |
| POST | `/api/v1/designer/conditions/validate` | 查询条件配置校验（不落库；422 含 `detail.fields`；`DESIGN_UNKNOWN_FIELD`/`DESIGN_INVALID_CROSS_FIELD`） | 内部 | 一期 | DESIGN-001 | 已实现 | `backend/app/api/v1/designer.py` |
| PUT/GET | `/api/v1/designer/conditions` | 查询条件保存/读取（挂载 QUERY-007；可选 `expectedRevision`） | 内部 | 一期 | DESIGN-001 | 已实现 | `backend/app/api/v1/designer.py` |
| PUT/GET | `/api/v1/designer/compute-rules` | 运算规则保存/读取（挂载 QUERY-007；`DESIGN_RULE_TYPE_MISMATCH`/`DESIGN_RULE_BROKEN_CHAIN`/`DESIGN_INVALID_AGGREGATE`） | 内部 | 一期 | DESIGN-002 | 已实现 | `backend/app/api/v1/designer.py` |
| POST | `/api/v1/designer/sql-mode/validate` | SQL 只读校验（`DESIGN_SQL_NOT_READONLY`/`DESIGN_SQL_EMPTY`） | 内部 | 一期 | DESIGN-005 | 已实现 | `backend/app/api/v1/designer.py` |
| GET | `/api/v1/designer/sql-mode/capabilities` | SQL 模式能力（`maxSqlLength=65536`） | 内部 | 一期 | DESIGN-005 | 已实现 | `backend/app/api/v1/designer.py` |
| PUT/GET | `/api/v1/designer/sql-mode` | SQL 模式持久化（`config_type=sql_mode`；`?refId=`） | 内部 | 一期 | DESIGN-005 | 已实现 | `backend/app/api/v1/designer.py` |
| POST | `/api/v1/designer/output-fields/validate` | 输出字段/聚合校验（`DESIGN_EMPTY_OUTPUT_FIELDS`/`DESIGN_UNKNOWN_FIELD`/`DESIGN_INVALID_AGGREGATE`） | 内部 | 一期 | DESIGN-003 | 已实现 | `backend/app/api/v1/designer.py` |
| PUT/GET | `/api/v1/designer/output-fields` | 输出字段持久化（`config_type=output_fields`；`?refId=`） | 内部 | 一期 | DESIGN-003 | 已实现 | `backend/app/api/v1/designer.py` |
| POST/PUT/GET | `/api/v1/designer/workflow-link` | 设计器项与工单实例关联 validate/save/get（`config_type=designer_workflow_link`） | 内部 | 四期 | DESIGN-004 | 已实现 | `backend/app/api/v1/designer.py` |
| POST | `/api/v1/query/preview` | 查询预览（设计器/图表配置） | 内部 | 二期 | QUERY-005 | 规划 | `backend/app/api/v1/query.py` |

---

## 4b. 图表配置（M5 · VIZ）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| POST | `/api/v1/charts/validate` | ChartViewConfig 预校验；422 时 `detail.fields: [{field, message}]` | 内部 | 一期 | VIZ-001 | 已实现 | `backend/app/api/v1/charts.py` |
| GET | `/api/v1/charts/types` | 图表类型 catalog（9 类型注册表）；只读 | 内部 | 一期 | VIZ-003 | 已实现（骨架） | `backend/app/api/v1/charts.py` |
| POST | `/api/v1/charts/render-spec` | 校验并归一为引擎无关 render-spec；非法 type → 422 `CHART_INVALID_TYPE` | 内部 | 一期 | VIZ-008 | 已实现（骨架） | `backend/app/api/v1/charts.py` |
| POST | `/api/v1/charts/embed/validate` | 图表嵌入配置校验（目标唯一性 + origin 白名单） | 内部 | 一期 | VIZ-006 | 已实现（骨架） | `backend/app/api/v1/charts.py` |
| POST | `/api/v1/charts/sdk/validate` | SDK portal init 配置校验（`VIZ_SDK_*`） | 内部 | 一期 | VIZ-007 | 已实现 | `backend/app/api/v1/charts.py` |
| POST | `/api/v1/charts/sdk/lifecycle` | SDK lifecycle manifest（init/destroy） | 内部 | 一期 | VIZ-007 | 已实现 | `backend/app/api/v1/charts.py` |
| GET | `/api/v1/charts/sdk/capabilities` | SDK 支持的 targetType/authMode 列表 | 内部 | 一期 | VIZ-007 | 已实现 | `backend/app/api/v1/charts.py` |

> M9 r42 新增校验错误码：`CHART_INVALID_STYLE_VARIANT`（VIZ-004）、`CHART_FIELD_REQUIREMENT`（VIZ-005）；嵌入错误码 `EMBED_MISSING_TARGET`/`EMBED_TARGET_CONFLICT`/`EMBED_INVALID_ORIGIN`/`EMBED_INVALID`（VIZ-006）。域附录见 [services/viz.md](../services/viz.md)。

---

## 5. Dashboard 与视图（M5 · FR-VIEW）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET/POST | `/api/v1/dashboards` | Dashboard 列表/创建 | 内部 | 一期 | DASH-001 | 已实现 | `backend/app/api/v1/dashboards.py` |
| GET/PUT/DELETE | `/api/v1/dashboards/{id}` | Dashboard CRUD | 内部 | 一期 | DASH-001 | 已实现 | `backend/app/api/v1/dashboards.py` |
| PUT | `/api/v1/dashboards/{id}/layout` | 布局与组件列表；422 码：`DASH_DUPLICATE_WIDGET` / `DASH_MISSING_CHART_CONFIG` / `DASH_CHART_ID_MISMATCH` | 内部 | 一期 | DASH-002 | 已实现 | `backend/app/api/v1/dashboards.py` |
| POST | `/api/v1/dashboards/theme-analysis/execute-plan` | 主题分析 execute-plan 四步链（`theme-plan-v1`；yoy/mom compareWindow） | 内部 | 一期 | DASH-006 | 已实现 | `backend/app/api/v1/dashboards.py` |
| POST | `/api/v1/dashboards/theme-analysis/validate` | 实体主题分析 config 校验（`DASH_THEME_*`） | 内部 | 一期 | DASH-006 | 已实现 | `backend/app/api/v1/dashboards.py` |
| PUT/GET | `/api/v1/dashboards/theme-analysis` | 实体主题分析 config 持久化/读取（`config_type=entity_theme`） | 内部 | 一期 | DASH-006 | 已实现 | `backend/app/api/v1/dashboards.py` |
| GET | `/api/v1/dashboards/theme-analysis/chart-bindings` | chartViewBindings 联动查询（`linkedWidgetCount`） | 内部 | 一期 | DASH-006 | 已实现 | `backend/app/api/v1/dashboards.py` |
| POST | `/api/v1/dashboards/entity-overview/validate` | 实体总览 item 校验（`DASH_OVERVIEW_*`） | 内部 | 一期 | DASH-005 | 已实现 | `backend/app/api/v1/dashboards.py` |
| PUT/GET | `/api/v1/dashboards/{id}/entity-overview` | 实体总览 save/get（`config_type=entity_overview`；含 `publishStatus` 探测） | 内部 | 一期 | DASH-005 | 已实现 | `backend/app/api/v1/dashboards.py` |
| POST | `/api/v1/dashboards/global-filters/validate` | 全局筛选联动校验（`DASH_FILTER_*`） | 内部 | 一期 | DASH-004 | 已实现 | `backend/app/api/v1/dashboards.py` |
| PUT/GET | `/api/v1/dashboards/{id}/global-filters` | 全局筛选联动 save/get（`config_type=global_filter_linkage`；含 `affectedWidgetCount`） | 内部 | 一期 | DASH-004 | 已实现 | `backend/app/api/v1/dashboards.py` |
| POST | `/api/v1/views/validate` | DashboardView 协议校验；422 码：`VIEW_UNKNOWN_CHART_REF` / `VIEW_DEFAULT_SELF_REF` | IF-06 | 一期 | VIEW-001 | 已实现 | `backend/app/api/v1/views.py` |
| GET/PUT | `/api/v1/roles/{id}/default-views` | 角色默认视图模板 | 内部 | 二期 | VIEW-002 | 已实现 | `backend/app/api/v1/views.py` |
| GET/POST | `/api/v1/users/me/views` | 用户个人视图 | 内部 | 三期 | VIEW-003 | 已实现 | `backend/app/api/v1/views.py` |
| GET | `/api/v1/users/me/views/{view_id}` | IF-06 | 已实现 | `api/v1/views.py` | 用户视图覆盖按 id 读取（r63 VIEW-003） |
| POST | `/api/v1/embed/token` | 门户嵌入 token 签发（admin 或 `dashboard:share`；422 `EMBED_TARGET_CONFLICT`/`EMBED_INVALID_ORIGIN`） | IF-04 | 三期 | API-006 | 已实现（骨架） | `backend/app/api/v1/embed.py` |
| GET | `/api/v1/embed/sdk-params` | 按 token 解析 SDK 参数（`containerId`/`apiBase`） | IF-04 | 三期 | API-006 | 已实现（骨架） | `backend/app/api/v1/embed.py` |

---

## 6. 报表（M6 · IF-03）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| POST | `/api/v1/reports/templates/validate` | 模板块定义校验（`RPT_TEMPLATE_*`） | 内部 | 二期 | RPT-003 | 已实现 | `backend/app/api/v1/reports/templates.py` |
| PUT | `/api/v1/reports/templates/{templateKey}` | 模板块 upsert（**r67** viewer/enterprise ACL） | 内部 | 二期 | RPT-003 | 已实现 | `backend/app/api/v1/reports/templates.py` |
| GET | `/api/v1/reports/templates/{templateKey}` | 模板块查询（**r67** enterprise ACL） | 内部 | 二期 | RPT-003 | 已实现 | `backend/app/api/v1/reports/templates.py` |
| GET/POST/PATCH/DELETE | `/api/v1/reports/catalog/nodes*` | 报表模板树 catalog CRUD/move（`RPT_CATALOG_*`） | 内部 | 一期 | RPT-004 | 已实现 | `backend/app/api/v1/reports/__init__.py` |
| POST | `/api/v1/reports/catalog/nodes/{id}/move` | 模板树节点移动（循环/深度守卫） | 内部 | 一期 | RPT-004 | 已实现 | `backend/app/api/v1/reports/__init__.py` |
| POST/GET | `/api/v1/reports/schedules*` | 报表调度 FSM（draft→scheduled→paused/cancelled；`RPT_SCHEDULE_*`） | 内部 | 一期 | RPT-005 | 已实现 | `backend/app/api/v1/reports/__init__.py` |
| POST | `/api/v1/reports/schedules/{id}/execute` | 调度 semi-real 执行器（`X-Rpt-Semi-Real: 1`；mock 兼容默认；Idempotency-Key；`deliverySteps`） | 内部 | 一期 | RPT-005 | 已实现 | `backend/app/api/v1/reports/__init__.py` |
| GET | `/api/v1/reports/schedules/executions/{executionId}/artifact` | 执行产物元数据（`RPT_ARTIFACT_FORBIDDEN` ACL） | 内部 | 一期 | RPT-005, RPT-007 | 已实现 | `backend/app/api/v1/reports/__init__.py` |
| GET/PUT/DELETE | `/api/v1/reports/catalog/nodes/{id}/extension` | 模板节点扩展配置 CRUD（metrics/filters/compareMode；`RPT_EXT_*` ACL） | 内部 | 二期 | RPT-006 | 已实现 | `backend/app/api/v1/reports/__init__.py` |
| POST | `/api/v1/reports/catalog/nodes/{id}/extension/compare-preview` | 同比环比预览槽位（yoy/mom slots） | 内部 | 二期 | RPT-004 | 已实现 | `backend/app/api/v1/reports/__init__.py` |
| GET | `/api/v1/reports/catalog/nodes/{id}/extension/render-spec` | 扩展配置渲染规格（`renderVersion=1.0`；`compareMetrics`/`compareVersion`） | 内部 | 二期 | RPT-006 | 已实现 | `backend/app/api/v1/reports/__init__.py` |
| GET | `/api/v1/reports/catalog/nodes/{id}/extension/revisions` | 扩展配置修订历史（changeNote 审计） | 内部 | 二期 | RPT-006 | 已实现 | `backend/app/api/v1/reports/__init__.py` |
| POST | `/api/v1/reports/batch` | 批量创建模板节点（Idempotency-Key；`RPT_BATCH_*`） | 内部 | 三期 | RPT-007 | 已实现 | `backend/app/api/v1/reports/__init__.py` |
| POST | `/api/v1/reports/templates/{id}/run` | 手工执行报表 | 内部 | 二期 | RPT-001 | 已实现 | `backend/app/api/v1/reports/engine.py` |
| GET | `/api/v1/reports/export` | 按模板/时间同步导出（`templateId`+`format`；seed 模板 `status=ready` + `downloadUrl`；502/413 边界；429 `REPORT_EXPORT_RATE_LIMITED`；`X-RateLimit-*` 头） | IF-03 | 三期 | API-005 | 已实现（companion） | `backend/app/api/v1/reports/export.py` |
| GET | `/api/v1/reports/export/{exportId}` | 导出任务状态（未知 → 404 `REPORT_EXPORT_NOT_FOUND`） | IF-03 | 三期 | API-005 | 已实现（companion） | `backend/app/api/v1/reports/export.py` |
| GET | `/api/v1/reports/export/{exportId}/download` | 导出文件下载（`Content-Disposition: attachment`） | IF-03 | 三期 | API-005 | 已实现（companion） | `backend/app/api/v1/reports/export.py` |
| GET/PUT | `/api/v1/reports/prefab/bindings*` | 预制报表绑定 list/upsert（`RPT_PREFAB_*`） | 内部 | 二期 | RPT-002 | 已实现 | `backend/app/api/v1/reports/prefab.py` |
| GET | `/api/v1/reports/prefab/bindings/{binding_key}` | 预制 binding 单条读取（`RPT_PREFAB_NOT_FOUND`） | 内部 | 二期 | RPT-002 | 已实现（companion） | `backend/app/api/v1/reports/prefab.py` |
| POST | `/api/v1/reports/prefab/bindings/validate` | 预制绑定校验（allowedRoles/analysisType 联动） | 内部 | 二期 | RPT-002 | 已实现 | `backend/app/api/v1/reports/prefab.py` |
| GET | `/api/v1/reports/prefab/probe` | prefab validate/list perf probe 预算探测 | 内部 | 二期 | RPT-002 | 已实现（companion） | `backend/app/api/v1/reports/prefab.py` |

---

## 7. 元数据与 Dataset（M1 · 四期）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET/POST | `/api/v1/metadata/glossary` | 术语字典 CRUD/list（`TERM_MAX_TEXT_LENGTH=4000`；空白 name → 422 `META_TERM_INVALID_NAME`） | 内部 | 四期 | META-001 | 已实现 | `backend/app/api/v1/metadata.py` |
| GET/PUT/DELETE | `/api/v1/metadata/glossary/{term_id}` | 术语详情/更新/删除（非法 status → 422 `META_TERM_INVALID_STATUS`） | 内部 | 四期 | META-001 | 已实现 | `backend/app/api/v1/metadata.py` |
| GET/POST | `/api/v1/metadata/themes` | 业务主题树 CRUD/list（`?parent_id=null` 根过滤；深度 >8 → 422 `META_THEME_MAX_DEPTH`） | 内部 | 四期 | META-002 | 已实现 | `backend/app/api/v1/metadata.py` |
| GET/PUT/DELETE | `/api/v1/metadata/themes/{node_id}` | 主题节点详情/更新/删除 | 内部 | 四期 | META-002 | 已实现 | `backend/app/api/v1/metadata.py` |
| POST | `/api/v1/metadata/themes/{node_id}/move` | 主题节点移动（环检测；超深 → 422 `META_THEME_MAX_DEPTH`） | 内部 | 四期 | META-002 | 已实现 | `backend/app/api/v1/metadata.py` |
| GET/POST | `/api/v1/metadata/dimensions` | 维度字典 list/create（`?code_prefix=`；重复 code → 409 `META_DIM_CODE_CONFLICT`） | 内部 | 四期 | META-003 | 已实现 | `backend/app/api/v1/metadata.py` |
| GET/PUT/DELETE | `/api/v1/metadata/dimensions/{dimension_id}` | 维度详情/更新/删除（级联 values） | 内部 | 四期 | META-003 | 已实现 | `backend/app/api/v1/metadata.py` |
| GET/POST | `/api/v1/metadata/dimensions/{dimension_id}/values` | 枚举值 list/批量注册（重复 value code → 409 `META_DIM_VALUE_CODE_CONFLICT`） | 内部 | 四期 | META-003 | 已实现 | `backend/app/api/v1/metadata.py` |
| GET/POST | `/api/v1/metadata/entity-types` | 实体类型 schema list/create（`META_ENTITY_TYPE_*`） | 内部 | 二期 | META-006 | 已实现 | `backend/app/api/v1/metadata.py` |
| POST | `/api/v1/metadata/entity-types/validate` | 实体 schema 校验链（`META_ENTITY_SCHEMA_INVALID` + `detail.fields`） | 内部 | 二期 | META-006 | 已实现 | `backend/app/api/v1/metadata.py` |
| GET | `/api/v1/metadata/entity-types/{typeCode}/query-bindings` | 只读 query bindings（`readOnly=true`；json 不可 filter） | 内部 | 二期 | META-006 | 已实现 | `backend/app/api/v1/metadata.py` |
| GET/PUT/DELETE | `/api/v1/metadata/entity-types/{typeCode}` | 实体类型详情/更新/删除（引用中 → 409 `META_ENTITY_TYPE_IN_USE`） | 内部 | 二期 | META-006 | 已实现 | `backend/app/api/v1/metadata.py` |
| DELETE | `/api/v1/metadata/dimensions/{dimension_id}/values/{value_id}` | 删除单条枚举值 | 内部 | 四期 | META-003 | 已实现 | `backend/app/api/v1/metadata.py` |
| GET/POST | `/api/v1/datasets` | Dataset list/create（内存 store L1；`META_DATASET_*`） | 内部 | 四期 | META-004 | 已实现 | `backend/app/api/v1/datasets.py` |
| GET | `/api/v1/datasets/{dataset_id}` | Dataset 详情 | 内部 | 四期 | META-004 | 已实现 | `backend/app/api/v1/datasets.py` |
| POST | `/api/v1/datasets/validate` | Dataset 草稿校验（不落库） | 内部 | 四期 | META-004 | 已实现 | `backend/app/api/v1/datasets.py` |
| GET/POST | `/api/v1/entities/types` | 实体类型 schema | 内部 | 二期 | META-006 | 规划 | `backend/app/api/v1/metadata/entities.py` |
| POST | `/api/v1/datasets/migrate-binding` | 直连→datasetId 迁移 | 内部 | 四期 | QUERY-009 | 规划 | `backend/app/api/v1/datasets.py` |

---

## 8. 查询服务治理（M8 · IF-01/02）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET | `/api/v1/gov/catalog/categories` | catalog 分类列表（CAT-01~03 seed） | IF-06 | 一期 | GOV-001 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/catalog/entries` | catalog 条目列表（`?category=&limit=&offset=`） | IF-06 | 一期 | GOV-001 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/catalog/entries` | 创建 catalog 条目 | IF-06 | 一期 | GOV-001 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/catalog/entries/{id}` | catalog 条目详情 | IF-06 | 一期 | GOV-001 | 已实现 | `backend/app/api/v1/gov.py` |
| DELETE | `/api/v1/gov/catalog/entries/{entry_id}` | 删除 catalog 条目（204；CASCADE bus_registrations） | IF-06 | 一期 | GOV-001 | 已实现 | `backend/app/api/v1/gov.py` |
| GET/POST | `/api/v1/gov/catalog/classification/nodes` | 分类树节点 list/create（`?parentId=`；`CAT_CLASS_*`） | IF-06 | 一期 | CAT-004 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/catalog/classification/nodes/{id}/move` | 分类树节点移动（环检测；超深 → 422 `CAT_CLASS_MAX_DEPTH`） | IF-06 | 一期 | CAT-004 | 已实现 | `backend/app/api/v1/gov.py` |
| DELETE | `/api/v1/gov/catalog/classification/nodes/{id}` | 删除叶节点（含子节点 → 409 `CAT_CLASS_HAS_CHILDREN`） | IF-06 | 一期 | CAT-004 | 已实现 | `backend/app/api/v1/gov.py` |
| GET/POST | `/api/v1/gov/catalog/geo-regions/nodes` | 地域 geo 树 list/create（`?parentId=`；`CAT03_*`） | IF-06 | 一期 | CAT-003 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/catalog/geo-regions/nodes/{id}/move` | geo 树节点移动（环检测；超深 → 422 `CAT03_MAX_DEPTH`） | IF-06 | 一期 | CAT-003 | 已实现 | `backend/app/api/v1/gov.py` |
| DELETE | `/api/v1/gov/catalog/geo-regions/nodes/{id}` | 删除叶节点（含子节点 → 409 `CAT03_HAS_CHILDREN`） | IF-06 | 一期 | CAT-003 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/catalog/tickets/validate` | 工单 stats item 校验（`CAT05_*`） | IF-06 | 一期 | CAT-005 | 已实现 | `backend/app/api/v1/gov.py` |
| POST/GET | `/api/v1/gov/catalog/tickets/items` | 工单 stats item 登记/列表 | IF-06 | 一期 | CAT-005 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/catalog/tickets/items/{key}/stats` | 工单 stats mock probe | IF-06 | 一期 | CAT-005 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/catalog/lifecycle-templates/validate` | CAT-001 lifecycle 校验 | IF-06 | 一期 | CAT-001 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/catalog/lifecycle-templates` | CAT-001 lifecycle 创建 | IF-06 | 一期 | CAT-001 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/catalog/lifecycle-templates` | CAT-001 lifecycle 列表 | IF-06 | 一期 | CAT-001 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/catalog/lifecycle-templates/{templateKey}` | CAT-001 lifecycle 按 key 查询 | IF-06 | 一期 | CAT-001 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/catalog/lifecycle-templates/{templateKey}/stages/move` | CAT-001 lifecycle 阶段重排 | IF-06 | 一期 | CAT-001 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/catalog/aggregate-templates/validate` | CAT-002 aggregate 校验 | IF-06 | 一期 | CAT-002 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/catalog/aggregate-templates` | CAT-002 aggregate 创建 | IF-06 | 一期 | CAT-002 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/catalog/aggregate-templates` | CAT-002 aggregate 列表 | IF-06 | 一期 | CAT-002 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/catalog/aggregate-templates/{aggregate_key}/attribution` | CAT-002 PoC 归属 | IF-06 | 一期 | CAT-002 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/bus/register` | 总线 PoC 半自动注册（`catalogEntryId`；需 admin；幂等 201/200；403 `BUS_REGISTER_FORBIDDEN`） | IF-06 | 一期 | GOV-002 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/bus/auto-register` | 总线全自动注册 FSM（`catalogEntryId`；integration/admin；幂等 201/200；403 `GOV_AUTO_BUS_FORBIDDEN`） | IF-06 | 四期 | GOV-007 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/bus/auto-register/probe` | auto-register perf probe（`elapsedMs`/`withinBudget`） | IF-06 | 四期 | GOV-007 | 已实现（companion） | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/query-design/validate` | 可视化查询设计校验（422 `detail.fields`） | IF-06 | 一期 | GOV-004 | 已实现 | `backend/app/api/v1/gov.py` |
| PUT | `/api/v1/gov/query-design` | 可视化查询设计保存（409 `CONFIG_VERSION_CONFLICT`；403 ACL） | IF-06 | 一期 | GOV-004/008 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/query-design` | 可视化查询设计读取（`?refId=`） | IF-06 | 一期 | GOV-004 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/query-design/preview-execute` | 查询设计执行预览（RLS fragment；GOV-008） | 内部 | 一期 | GOV-008 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/publish/entries/{entry_id}/submit` | draft→pending_publish | IF-06 | 一期 | GOV-005 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/publish/entries/{entry_id}/approve` | pending_publish→published | IF-06 | 一期 | GOV-005 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/publish/entries/{entry_id}/reject` | pending_publish→draft | IF-06 | 一期 | GOV-005 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/publish/entries/{entry_id}/status` | 发布状态 + allowedActions | IF-06 | 一期 | GOV-005 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/publish/entries/{entry_id}/notifications` | 审批通知事件列表（内存 store） | IF-06 | 一期 | GOV-005 | 已实现 | `backend/app/api/v1/gov.py` |
| GET/POST | `/api/v1/gov/openapi-mappings` | 发布引擎 OpenAPI 映射 list/register（`GOV_OPENAPI_MAP_*`） | IF-06 | 四期 | GOV-006 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/openapi-mappings/{id}` | OpenAPI 映射详情 | IF-06 | 四期 | GOV-006 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/openapi-mappings/validate` | OpenAPI 映射校验（apiVersion/operationId/path + entityTypeRef） | IF-06 | 四期 | GOV-006 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/openapi-mappings/{id}/deactivate` | OpenAPI 映射停用（409 `GOV_OPENAPI_MAP_ALREADY_INACTIVE`） | IF-06 | 四期 | GOV-006 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/workflow/templates` | 工单流程模板列表（`standard_query_release`） | IF-06 | 一期 | GOV-003 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/workflow/templates/validate` | 工单模板校验 | IF-06 | 一期 | GOV-003 | 已实现 | `backend/app/api/v1/gov.py` |
| GET | `/api/v1/gov/workflow/templates/{template_id}/node-roles` | 工单模板节点角色配置 | IF-06 | 一期 | GOV-003 | 已实现 | `backend/app/api/v1/gov.py` |
| POST/GET | `/api/v1/gov/workflow/instances` | 工单实例创建/读取（`config_type=workflow_instance`） | IF-06 | 一期 | GOV-003 | 已实现 | `backend/app/api/v1/gov.py` |
| POST | `/api/v1/gov/workflow/instances/{id}/transition` | 五态 FSM 迁移（`GOV_WORKFLOW_*`） | IF-06 | 一期 | GOV-003 | 已实现 | `backend/app/api/v1/gov.py` |
| GET/POST | `/api/v1/governance/tickets` | 查询工单 | 内部 | 四期 | GOV-003 | 规划 | `backend/app/api/v1/governance/tickets.py` |
| POST | `/api/v1/governance/tickets/{id}/submit` | 提交审批 | 内部 | 四期 | GOV-003 | 规划 | `backend/app/api/v1/governance/tickets.py` |
| POST | `/api/v1/governance/publish` | 发布查询服务 | 内部 | 四期 | GOV-005 | 规划 | `backend/app/api/v1/governance/publish.py` |
| POST | `/api/v1/integration/bus/register` | IF-01 总线注册（`catalogEntryId`；nil UUID → 422；integration/admin；幂等 201/200；retry `maxAttempts`） | IF-01 | 四期 | API-004 | 已实现（companion） | `backend/app/api/v1/integration_bus.py` |
| POST | `/api/v1/integration/bus/register/retry` | IF-01 总线注册重试 | IF-01 | 四期 | API-004 | 已实现（companion） | `backend/app/api/v1/integration_bus.py` |
| GET | `/api/v1/services` | 已发布查询服务列表（仅 `published`；`?category=&limit=&offset=`） | IF-02 | 四期 | API-003 | 已实现（companion） | `backend/app/api/v1/services.py` |
| GET | `/api/v1/services/{serviceId}` | 已发布查询服务详情 | IF-02 | 四期 | API-003 | 已实现（companion） | `backend/app/api/v1/services.py` |
| POST | `/api/v1/services/{serviceId}/execute` | 查询服务执行（`;requires=` 参数校验；`Idempotency-Key`；502 `SERVICE_EXECUTE_FAILED`） | IF-02 | 四期 | API-003 | 已实现（companion） | `backend/app/api/v1/services.py` |
| POST | `/api/v1/services/{serviceId}/publish` | draft→published + 自动总线注册（201/200 幂等） | IF-02 | 四期 | API-003/004 | 已实现（companion） | `backend/app/api/v1/services.py` |
| GET | `/api/v1/services/{serviceId}/openapi` | 服务 OpenAPI 描述片段 | IF-02 | 四期 | API-003, GOV-006 | 已实现（companion） | `backend/app/api/v1/services.py` |

> **OpenAPI 注记（API-007）**：`GET /openapi.json` 的 `info.x-supported-versions` 含 `v1` 与 `v2`；IF-01~04 平行 `/api/v2/*` 为稳定文档面（`x-implements-version: v2`），**无**真实 `/api/v2/*` 运行时路由。

---

## 9. 已发布查询 API（IF-02 · 对外 · 四期）

> 由 M8 发布引擎根据配置动态注册；路径前缀示例，实际以发布时 OpenAPI 为准。

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET | `/api/v1/entities/{entityType}/{entityId}` | CAT-01 实体生命周期查询 | IF-02 | 一期 PoC+ | CAT-001 | 规划 | `backend/app/governance/catalog/cat01.py` |
| GET | `/api/v1/stats/aggregate` | CAT-02 统计分析聚合 | IF-02 | 一期 PoC+ | CAT-002 | 规划 | `backend/app/governance/catalog/cat02.py` |
| GET | `/api/v1/geo/distribution` | CAT-03 地域维度查询 | IF-02 | 一期 PoC+ | CAT-003 | 规划 | `backend/app/governance/catalog/cat03.py` |
| GET | `/api/v1/timeseries` | CAT-04 时间序列分析 | IF-02 | 二期+ | CAT-004 | 规划 | `backend/app/governance/catalog/cat04.py` |
| GET | `/api/v1/tickets/stats` | CAT-05 工单与受理统计 | IF-02 | 二期+ | CAT-005 | 规划 | `backend/app/governance/catalog/cat05.py` |
| GET | `/api/v1/production/stats` | CAT-06 生产销售统计 | IF-02 | 二期+ | CAT-006 | 规划 | `backend/app/governance/catalog/cat06.py` |
| GET | `/api/v1/workno/behavior` | CAT-07 组织行为审计（r64 companion：enterprise/viewer scope ACL + perf probe） | IF-02 | 三期+ | CAT-007 | 已实现 | `backend/app/api/v1/workno.py` |

---

## 9. 数据接入（M1B · FR-DATA / FR-ETL）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET/POST | `/api/v1/ingestion/sync-jobs` | 同步任务 CRUD | 内部 | M1B | DATA-001 | 已实现 | `backend/app/api/v1/ingestion/sync.py` |
| DELETE | `/api/v1/ingestion/sync-jobs/{id}` | 删除同步任务 | 内部 | M1B | DATA-001 | 已实现 | `backend/app/api/v1/ingestion/sync.py` |
| POST | `/api/v1/ingestion/sync-jobs/{id}/run` | 手动触发同步 | 内部 | M1B | DATA-002 | 已实现 | `backend/app/ingestion/sync_executor.py` |
| GET | `/api/v1/ingestion/sync-jobs/{id}/runs` | 运行历史 | 内部 | M1B | DATA-002 | 已实现 | `backend/app/api/v1/ingestion/sync.py` |
| GET/PUT | `/api/v1/ingestion/sync-jobs/{id}/etl-rules` | 清洗规则配置 | 内部 | M1B | ETL-001 | 已实现 | `backend/app/ingestion/etl_rules.py` |

### SourceConnection（`source` 嵌套对象）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| type | `mysql` \| `postgres` | ✓ | M1B executor 仅 mysql |
| host | string | ✓ | 源库主机 |
| port | int | ✓ | 1–65535 |
| database | string | ✓ | 库名 |
| username | string | ✓ | 用户名 |
| password | string | ✓ | 请求明文；响应 `***` |
| table | string | ✓ | 源表名 |

### 请求/响应示例

**POST `/api/v1/ingestion/sync-jobs`**（201）：

```json
{
  "name": "sample-mysql-orders",
  "source": {
    "type": "mysql",
    "host": "127.0.0.1",
    "port": 3307,
    "database": "sample_db",
    "username": "sample",
    "password": "sample",
    "table": "dirty_orders"
  },
  "target_table": "orders_clean",
  "schedule_cron": null
}
```

响应 `source.password` 为 `"***"`。

**POST `/api/v1/ingestion/sync-jobs/{id}/run`**（202）：

```json
{ "run_id": "550e8400-e29b-41d4-a716-446655440000", "status": "running" }
```

并发冲突（已有 `status=running` 的运行记录）返回 **409**：

```json
{ "code": "RUN_ALREADY_IN_PROGRESS", "message": "该任务正在运行中", "detail": null }
```

**GET `/api/v1/ingestion/sync-jobs/{id}/runs`**（200）：

```json
{
  "items": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "status": "succeeded",
      "started_at": "2026-07-03T08:00:00Z",
      "finished_at": "2026-07-03T08:00:01Z",
      "rows_synced": 4,
      "error_message": null,
      "trace_id": "e2e-trace-001",
      "retry_count": 0
    }
  ]
}
```

---

## 10. 范围外（不实现）

| 接口 | 原因 |
|------|------|
| 未登记路径 | 禁止上线；须先更新本索引 |

---

## 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.2 | 2026-07-04 | M8/M12/M13 r44：IF-01~04 集成 API L1（services/integration_bus/reports/export/embed）；OpenAPI 版本策略 |
| 1.0.1 | 2026-07-03 | FR-DATA/FR-ETL 纳入 M1B；§9 数据接入 API；移除 IF-05 范围外 |
