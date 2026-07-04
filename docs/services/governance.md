# governance — 治理与数据目录

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/governance/` |
| PRD | [F10-GOV](../automate/prd/F10-GOV.md) · [F14-CAT](../automate/prd/F14-CAT.md) |
| 里程碑 | M6（L1 kickoff） |
| 状态 | **L1 kickoff (r60)** |

## 职责

- 查询接口 catalog 三分法（CAT-01/02/03）分类与条目登记（GOV-001）
- 总线 PoC 半自动注册 adapter 与登记 API（GOV-002）
- 可视化查询设计聚合 validate/save/get（GOV-004）
- 查询设计权限联动与 RLS 绑定守卫（GOV-008）
- 查询服务发布状态机 submit/approve/reject（GOV-005）
- **分类树节点**（`catalog/classification/`）：内存树 CRUD/move、环检测与深度守卫（CAT-004）
- **工号行为审计**（`catalog/cat07/`）：mock seed + `GET /workno/behavior`（CAT-007）
- **总线全自动注册 FSM**（`bus/auto.py`）：`POST /gov/bus/auto-register`（GOV-007）
- 工单流程模板与五态 FSM 实例（GOV-003）
- 发布引擎 OpenAPI 映射 store（GOV-006）
- 为开放 API 登记与 BPM 流水线奠基

## 边界

| In | Out |
|----|-----|
| catalog 分类/条目 CRUD、bus PoC 登记记录 | 查询执行（→ `query`） |
| classification 树节点 CRUD/move（内存 L1；`MAX_CLASS_DEPTH=8`） | timeseries 模板完整实现（CAT-04 companion） |
| workflow 模板校验 + 五态 FSM 实例持久化 | 完整 BPM 工单与审批流水线 UI（GOV-003+） |
| openapi 映射 store（published entry 校验 + entityTypeRef） | 与 `publish_service` 串联的跨域发布（本域 workflow 独立） |
| `catalog/cat07/` workno behavior mock；`bus/auto.py` 全自动注册 FSM | 真实审计 DB、publish hook 内嵌、真实总线 HTTP |
| | 认证授权（→ `auth`） |

## 依赖

- `core`、`datasources`（元库 ORM Base）
- `governance`（publish 状态）、`metadata/entity`（entityTypeRef 校验）

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `CatalogCategory` / `CatalogEntry` | catalog ORM | GOV-001 | 已实现 |
| `BusRegistration` | 总线登记记录 | GOV-002 | 已实现 |
| `BusPoCAdapter` / `InMemoryBusPoCAdapter` | PoC 注册适配器 | GOV-002 | 已实现 |
| `GET/POST/DELETE /api/v1/gov/catalog/*` | catalog API | GOV-001 | 已实现 |
| `POST /api/v1/gov/bus/register` | 半自动注册 API（admin；幂等） | GOV-002 | 已实现 |
| `POST /api/v1/gov/bus/auto-register` | 全自动注册 FSM（integration/admin；幂等） | GOV-007 | L1 已实现 r60 |
| `GET /api/v1/workno/behavior` | CAT-07 工号行为审计查询 mock | CAT-007 | L1 已实现 r60 |
| `query_design/` | 可视化查询设计聚合 service/schemas | GOV-004 | 已实现 |
| `acl.py` | 查询设计 save/publish 权限联动 + RLS smoke | GOV-008 | 已实现 |
| `POST/PUT/GET /api/v1/gov/query-design*` | 可视化查询设计 validate/save/get | GOV-004/008 | 已实现 |
| `governance/publish/` | 查询服务发布状态机 submit/approve/reject | GOV-005 | 已实现 L1 |
| `governance/workflow/` | 工单模板 + 五态 FSM（draft→published） | GOV-003 | 已实现 L1 |
| `governance/openapi/` | 发布引擎 OpenAPI 映射 store + validate | GOV-006 | 已实现 L1 r54 |
| `POST/GET /api/v1/gov/publish/entries/{id}/*` | 发布工作流 REST 骨架 | GOV-005 | 已实现 L1 |
| `GET /api/v1/gov/publish/entries/{id}/notifications` | 审批通知事件列表（内存 store） | GOV-005 | 已实现 companion |
| `GET/POST /api/v1/gov/workflow/*` | 工单模板/实例/迁移 REST | GOV-003 | 已实现 L1 |
| `catalog/classification/service` | 分类树内存 store + cycle/depth 守卫 | CAT-004 | L1 已实现 r59 |

## 关联 API

见 [api/README.md](../api/README.md) §治理。

## 实现笔记

- migration `0014` seed CAT-01~03；`trace_id` 取自 `trace_id_var`
- `force-fail` path 段触发 PoC adapter 拒绝（502 `BUS_REGISTRATION_REJECTED`）
- r31：`list_entries` 非法 `category` → 400 `CATALOG_INVALID_CATEGORY`；`DELETE /gov/catalog/entries/{id}` → 204（CASCADE `bus_registrations`）
- r31：`POST /gov/bus/register` 需 admin 角色；幂等二次登记 200；失败码 `BUS_REGISTRATION_TIMEOUT`/`CLIENT_ERROR`/`SERVER_ERROR`；失败响应 `detail.traceId`
- r34：`query_design/` 聚合 `VisualQueryDesignIn/Out`；validate 委托 `designer.service`；持久化 `config_type=visual_query_design`；`acl.py` 按 status/角色守卫 save；非 UUID dev token 跳过 RLS binding smoke

### r35 companion 质量推分（GOV-004/008）

- **GOV-008**：`assert_query_design_execute` + `POST /api/v1/gov/query-design/preview-execute`；viewer 403 `GOV_ACL_FORBIDDEN`；designer 无 org 403 `GOV_RLS_BINDING_REQUIRED`；admin bypass 审计日志 `gov_acl_bypass`；空 RLS 链返回 `rlsFragment: "1=0"`
- **GOV-004**：gov validate 覆盖 `DESIGN_EMPTY_CONDITIONS`、`DESIGN_INVALID_AGGREGATE`（computeRules）、`GOV_QUERY_DESIGN_INVALID`、`GOV_QUERY_DESIGN_UNKNOWN_DATASOURCE`、`GOV_QUERY_DESIGN_NOT_FOUND`、`CONFIG_VERSION_CONFLICT` 均含 `detail.fields`（适用时）

### r46 L1 kickoff（GOV-005）

- **GOV-005**：`governance/publish/service` 在 `CatalogEntry.status` 上编排 `draft→pending_publish→published`；非法迁移 → 400 `GOV_PUBLISH_INVALID_TRANSITION`；pending 重复 submit → 409 `GOV_PUBLISH_ALREADY_PENDING`
- integration 快路径 `POST /api/v1/services/{id}/publish` 仍保留 `draft→published`（r45 companion 不变）

### r51 companion 质量推分（GOV-005）

- **GOV-005**：`governance/publish/notifications.py` 内存 `_PUBLISH_NOTIFICATIONS`；`submit`/`approve`/`reject` 成功后 `emit_publish_notification`；幂等 double approve 不重复发 approved 通知；`GET /gov/publish/entries/{id}/notifications` 只读；非持久化、非真实 IM 发送

### r49 L1 kickoff（GOV-003）

- **GOV-003**：`governance/workflow/service` 内置 `standard_query_release` 模板；五态 FSM `draft→pending_approval→designing→pending_publish→published`；实例持久化 `config_type=workflow_instance`；不调用 `publish_service`

### r52 companion 质量推分（GOV-003）

- **GOV-003**：`governance/workflow/node_roles.py` — `describe_node_roles` / `resolve_required_role` / `probe_transition_path`（<50ms smoke）；模板校验要求 `draft`+`published` 节点（缺节点 `detail.missingNodes`）；`GOV_WORKFLOW_CONFLICT`（重复 submit）、`GOV_WORKFLOW_ALREADY_TERMINAL`（published 后再迁移）；`GET /gov/workflow/templates/{id}/node-roles`

### r55 companion 质量推分（GOV-006）

- **GOV-006**：`SUPPORTED_API_VERSIONS` 仅 `v1`；`GOV_OPENAPI_MAP_UNSUPPORTED_VERSION` / `GOV_OPENAPI_MAP_INVALID_OPERATION_ID`；`validate_mapping` → `OpenApiMappingValidateOut`；`deactivate_mapping` + `GOV_OPENAPI_MAP_ALREADY_INACTIVE`（409）；`probe_openapi_validate_budget_ms=50`
