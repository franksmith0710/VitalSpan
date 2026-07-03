# HTTP 路由索引

> **定位**：VitalSpan 对外/对内 HTTP 路由登记簿；与 [arch.md](../arch.md) §5 同步。
> **维护**：新增或修改路由时在本文件补一行；实现后把「状态」改为 `已实现` 并填代码锚点。
> **真理源**：行为需求见 [SRS §6](../srs/全生命周期系统需求规格说明书.md#6-接口需求)；功能项见 [PRD API-001~007](../automate/prd/F13-API.md)。

```yaml
version: 1.0.0
last_updated: 2026-07-03
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
| GET | `/openapi.json` | OpenAPI 规范 | — | 一期 | API-007 | 规划 | FastAPI 内置 |

---

## 1. 认证与会话

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET | `/api/v1/me` | M1 占位：当前用户（开发 `Bearer dev`） | 内部 | P0 | BOOT-003 | 已实现 | `backend/app/api/v1/me.py` |
| POST | `/api/v1/auth/login` | 登录，返回 token | 内部 | 一期 | BOOT-003 | 规划 | `backend/app/api/v1/auth.py` |
| POST | `/api/v1/auth/logout` | 注销 | 内部 | 一期 | BOOT-003 | 规划 | `backend/app/api/v1/auth.py` |
| GET | `/api/v1/auth/me` | 当前用户与角色；二期正式路径，M1 占位见 `GET /api/v1/me` | 内部 | 一期 | AUTH-003 | 规划 | `backend/app/api/v1/auth.py` |

---

## 2. 权限（M7 · IF-06 配套）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET/POST | `/api/v1/roles` | 角色列表/创建 | 内部 | 一期 | AUTH-001 | 规划 | `backend/app/api/v1/roles.py` |
| GET/PUT/DELETE | `/api/v1/roles/{id}` | 角色详情/更新/删除 | 内部 | 一期 | AUTH-001 | 规划 | `backend/app/api/v1/roles.py` |
| GET/POST | `/api/v1/users` | 用户列表/创建 | 内部 | 一期 | AUTH-003 | 规划 | `backend/app/api/v1/users.py` |
| GET/PUT | `/api/v1/users/{id}` | 用户详情/更新 | 内部 | 一期 | AUTH-003 | 规划 | `backend/app/api/v1/users.py` |
| PUT | `/api/v1/users/{id}/roles` | 用户角色绑定 | 内部 | 一期 | AUTH-003 | 规划 | `backend/app/api/v1/users.py` |
| GET/POST | `/api/v1/orgs` | 组织树节点 | 内部 | 一期 | AUTH-002 | 规划 | `backend/app/api/v1/orgs.py` |
| GET/POST | `/api/v1/rls/dimensions` | 权限维度类型 | 内部 | 一期 | AUTH-005 | 规划 | `backend/app/api/v1/rls.py` |
| GET/POST | `/api/v1/rls/groups` | 维度分组 | 内部 | 一期 | AUTH-006 | 规划 | `backend/app/api/v1/rls.py` |
| GET | `/api/v1/audit-logs` | 操作审计 | 内部 | 一期 | AUTH-008 | 规划 | `backend/app/api/v1/audit.py` |

---

## 3. 数据源（IF-06 · 连接层）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET | `/api/v1/datasources/types` | 已注册连接器类型与 category | IF-06 | 一期 | DS-007 | 规划 | `backend/app/api/v1/datasources.py` |
| GET | `/api/v1/datasources` | 数据源列表（M7 过滤） | IF-06 | 一期 | DS-002 | 规划 | `backend/app/api/v1/datasources.py` |
| POST | `/api/v1/datasources` | 创建数据源 | IF-06 | 一期 | DS-002 | 规划 | `backend/app/api/v1/datasources.py` |
| GET | `/api/v1/datasources/{id}` | 数据源详情（无明文密码） | IF-06 | 一期 | DS-002 | 规划 | `backend/app/api/v1/datasources.py` |
| PUT | `/api/v1/datasources/{id}` | 更新数据源 | IF-06 | 一期 | DS-002 | 规划 | `backend/app/api/v1/datasources.py` |
| DELETE | `/api/v1/datasources/{id}` | 删除数据源 | IF-06 | 一期 | DS-002 | 规划 | `backend/app/api/v1/datasources.py` |
| POST | `/api/v1/datasources/test` | 连通性测试（草稿配置） | IF-06 | 一期 | DS-003 | 规划 | `backend/app/api/v1/datasources.py` |
| POST | `/api/v1/datasources/{id}/test` | 连通性测试（已保存） | IF-06 | 一期 | DS-003 | 规划 | `backend/app/api/v1/datasources.py` |
| GET | `/api/v1/datasources/{id}/schemas` | Schema 列表 | IF-06 | 一期 | DS-004 | 规划 | `backend/app/api/v1/datasources.py` |
| GET | `/api/v1/datasources/{id}/tables` | 表列表 | IF-06 | 一期 | DS-004 | 规划 | `backend/app/api/v1/datasources.py` |
| GET | `/api/v1/datasources/{id}/columns` | 字段列表 | IF-06 | 一期 | DS-004 | 规划 | `backend/app/api/v1/datasources.py` |

---

## 4. 查询执行（IF-06 · M3-LITE）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| POST | `/api/v1/query/execute` | 只读查询（sql/table/native） | IF-06 | 一期 | QUERY-001 | 规划 | `backend/app/api/v1/query.py` |
| POST | `/api/v1/query/preview` | 查询预览（设计器/图表配置） | 内部 | 二期 | QUERY-005 | 规划 | `backend/app/api/v1/query.py` |

---

## 5. Dashboard 与视图（M5 · FR-VIEW）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET/POST | `/api/v1/dashboards` | Dashboard 列表/创建 | 内部 | 一期 | DASH-001 | 规划 | `backend/app/api/v1/dashboards.py` |
| GET/PUT/DELETE | `/api/v1/dashboards/{id}` | Dashboard CRUD | 内部 | 一期 | DASH-002 | 规划 | `backend/app/api/v1/dashboards.py` |
| PUT | `/api/v1/dashboards/{id}/layout` | 布局与组件列表 | 内部 | 一期 | DASH-002 | 规划 | `backend/app/api/v1/dashboards.py` |
| GET/PUT | `/api/v1/roles/{id}/default-views` | 角色默认视图模板 | 内部 | 二期 | VIEW-002 | 规划 | `backend/app/api/v1/views.py` |
| GET/POST | `/api/v1/users/me/views` | 用户个人视图 | 内部 | 三期 | VIEW-003 | 规划 | `backend/app/api/v1/views.py` |
| POST | `/api/v1/embed/token` | 门户嵌入 token 签发 | IF-04 | 三期 | API-006 | 规划 | `backend/app/api/v1/embed.py` |

---

## 6. 报表（M6 · IF-03）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET/POST | `/api/v1/reports/templates` | 报表模板目录 | 内部 | 二期 | RPT-003 | 规划 | `backend/app/api/v1/reports/templates.py` |
| GET/PUT/DELETE | `/api/v1/reports/templates/{id}` | 模板 CRUD | 内部 | 二期 | RPT-004 | 规划 | `backend/app/api/v1/reports/templates.py` |
| POST | `/api/v1/reports/templates/{id}/run` | 手工执行报表 | 内部 | 二期 | RPT-001 | 规划 | `backend/app/api/v1/reports/engine.py` |
| GET/POST | `/api/v1/reports/schedules` | 调度任务 | 内部 | 三期 | RPT-005 | 规划 | `backend/app/api/v1/reports/schedules.py` |
| GET | `/api/v1/reports/export` | 按模板/时间导出文档 | IF-03 | 三期 | API-005 | 规划 | `backend/app/api/v1/reports/export.py` |

---

## 7. 元数据与 Dataset（M1 · 四期）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET/POST | `/api/v1/metadata/glossary` | 术语字典 | 内部 | 四期 | META-001 | 规划 | `backend/app/api/v1/metadata/glossary.py` |
| GET/POST | `/api/v1/metadata/themes` | 业务主题树 | 内部 | 四期 | META-002 | 规划 | `backend/app/api/v1/metadata/themes.py` |
| GET/POST | `/api/v1/metadata/dimensions` | 维度字典 | 内部 | 四期 | META-003 | 规划 | `backend/app/api/v1/metadata/dimensions.py` |
| GET/POST | `/api/v1/datasets` | Dataset CRUD | 内部 | 四期 | META-004 | 规划 | `backend/app/api/v1/datasets.py` |
| GET/PUT | `/api/v1/datasets/{id}` | Dataset 详情 | 内部 | 四期 | META-004 | 规划 | `backend/app/api/v1/datasets.py` |
| GET/POST | `/api/v1/entities/types` | 实体类型 schema | 内部 | 二期 | META-006 | 规划 | `backend/app/api/v1/metadata/entities.py` |
| POST | `/api/v1/datasets/migrate-binding` | 直连→datasetId 迁移 | 内部 | 四期 | QUERY-009 | 规划 | `backend/app/api/v1/datasets.py` |

---

## 8. 查询服务治理（M8 · IF-01/02）

| 方法 | 路径 | 说明 | IF | 期次 | PRD | 状态 | 代码锚点 |
|------|------|------|-----|------|-----|------|----------|
| GET | `/api/v1/governance/catalog` | 查询接口分类 catalog（附录 E） | 内部 | 一期 | GOV-001 | 规划 | `backend/app/api/v1/governance/catalog.py` |
| POST | `/api/v1/governance/bus/register` | 半自动/全自动总线注册 | IF-01 | 一期/四期 | GOV-002, API-004 | 规划 | `backend/app/governance/bus/` |
| GET/POST | `/api/v1/governance/tickets` | 查询工单 | 内部 | 四期 | GOV-003 | 规划 | `backend/app/api/v1/governance/tickets.py` |
| POST | `/api/v1/governance/tickets/{id}/submit` | 提交审批 | 内部 | 四期 | GOV-003 | 规划 | `backend/app/api/v1/governance/tickets.py` |
| POST | `/api/v1/governance/publish` | 发布查询服务 | 内部 | 四期 | GOV-005 | 规划 | `backend/app/api/v1/governance/publish.py` |
| GET | `/api/v1/services` | 已发布查询服务列表 | IF-02 | 四期 | API-003 | 规划 | `backend/app/api/v1/services/` |
| GET | `/api/v1/services/{serviceId}/openapi` | 服务 OpenAPI 描述 | IF-02 | 四期 | GOV-006 | 规划 | `backend/app/api/v1/services/` |

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
| GET | `/api/v1/workno/behavior` | CAT-07 组织行为审计 | IF-02 | 三期+ | CAT-007 | 规划 | `backend/app/governance/catalog/cat07.py` |

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
| 1.0.1 | 2026-07-03 | FR-DATA/FR-ETL 纳入 M1B；§9 数据接入 API；移除 IF-05 范围外 |
