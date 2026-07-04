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
- 为开放 API 登记与 BPM 流水线奠基

## 边界

| In | Out |
|----|-----|
| catalog 分类/条目 CRUD、bus PoC 登记记录 | 查询执行（→ `query`） |
| | 完整 BPM 工单与审批流水线（GOV-003+） |
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

## 关联 API

见 [api/README.md](../api/README.md) §治理。

## 实现笔记

- migration `0014` seed CAT-01~03；`trace_id` 取自 `trace_id_var`
- `force-fail` path 段触发 PoC adapter 拒绝（502 `BUS_REGISTRATION_REJECTED`）
- r31：`list_entries` 非法 `category` → 400 `CATALOG_INVALID_CATEGORY`；`DELETE /gov/catalog/entries/{id}` → 204（CASCADE `bus_registrations`）
- r31：`POST /gov/bus/register` 需 admin 角色；幂等二次登记 200；失败码 `BUS_REGISTRATION_TIMEOUT`/`CLIENT_ERROR`/`SERVER_ERROR`；失败响应 `detail.traceId`
