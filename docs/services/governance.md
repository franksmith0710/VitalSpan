# governance — 治理与数据目录

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/governance/` |
| PRD | [F10-GOV](../automate/prd/F10-GOV.md) · [F14-CAT](../automate/prd/F14-CAT.md) |
| 里程碑 | M6（L1 kickoff） |
| 状态 | **部分（L1）** |

## 职责

- 查询接口 catalog 三分法（CAT-01/02/03）分类与条目登记（GOV-001）
- 总线 PoC 半自动注册 adapter 与登记 API（GOV-002）
- 可视化查询设计聚合 validate/save/get（GOV-004）
- 查询设计权限联动与 RLS 绑定守卫（GOV-008）
- 查询服务发布状态机 submit/approve/reject（GOV-005）
- 工单流程模板与五态 FSM 实例（GOV-003）
- 为开放 API 登记与 BPM 流水线奠基

## 边界

| In | Out |
|----|-----|
| catalog 分类/条目 CRUD、bus PoC 登记记录 | 查询执行（→ `query`） |
| workflow 模板校验 + 五态 FSM 实例持久化 | 完整 BPM 工单与审批流水线 UI（GOV-003+） |
| | 与 `publish_service` 串联的跨域发布（本域 workflow 独立） |
| | 真实总线 HTTP 对接（GOV-007+） |
| | 认证授权（→ `auth`） |

## 依赖

- `core`、`datasources`（元库 ORM Base）
- `query`（登记条目常引用 execute 类路径）

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `CatalogCategory` / `CatalogEntry` | catalog ORM | GOV-001 | 已实现 |
| `BusRegistration` | 总线登记记录 | GOV-002 | 已实现 |
| `BusPoCAdapter` / `InMemoryBusPoCAdapter` | PoC 注册适配器 | GOV-002 | 已实现 |
| `GET/POST/DELETE /api/v1/gov/catalog/*` | catalog API | GOV-001 | 已实现 |
| `POST /api/v1/gov/bus/register` | 半自动注册 API（admin；幂等） | GOV-002 | 已实现 |
| `query_design/` | 可视化查询设计聚合 service/schemas | GOV-004 | 已实现 |
| `acl.py` | 查询设计 save/publish 权限联动 + RLS smoke | GOV-008 | 已实现 |
| `POST/PUT/GET /api/v1/gov/query-design*` | 可视化查询设计 validate/save/get | GOV-004/008 | 已实现 |
| `governance/publish/` | 查询服务发布状态机 submit/approve/reject | GOV-005 | 已实现 L1 |
| `governance/workflow/` | 工单模板 + 五态 FSM（draft→published） | GOV-003 | 已实现 L1 |
| `POST/GET /api/v1/gov/publish/entries/{id}/*` | 发布工作流 REST 骨架 | GOV-005 | 已实现 L1 |
| `GET/POST /api/v1/gov/workflow/*` | 工单模板/实例/迁移 REST | GOV-003 | 已实现 L1 |

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

### r49 L1 kickoff（GOV-003）

- **GOV-003**：`governance/workflow/service` 内置 `standard_query_release` 模板；五态 FSM `draft→pending_approval→designing→pending_publish→published`；实例持久化 `config_type=workflow_instance`；不调用 `publish_service`
