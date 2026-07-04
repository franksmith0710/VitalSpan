# integration — 对外集成 API 门面

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/integration/` |
| PRD | [F13-API](../automate/prd/F13-API.md)（API-003~007） |
| 里程碑 | M8 / M12 / M13 |
| 状态 | **L1 已实现** |

## 职责

- IF-01 总线注册适配编排（`bus_register` → catalog + `governance/bus/adapter`）
- IF-02 已发布查询服务列表/详情/OpenAPI 片段/执行骨架（`query_services`）
- IF-03 报表导出元数据骨架（`reports_export`）
- IF-04 门户嵌入 token 签发与 SDK 参数解析（`embed_token`）
- 统一 `IntegrationError` 错误域

## 边界

| In | Out |
|----|-----|
| catalog 已发布条目、bus adapter、seed 报表模板、embed origin 校验 | 真实总线 HTTP 对接（→ GOV-007+） |
| viz.embed `_ORIGIN_RE` 复用 | 报表渲染引擎与文件生成（→ `reports`） |
| | 前端 SDK 与 iframe 页面（→ `fe/`） |
| | 持久化 embed token store（L1 内存） |

## 依赖

- `governance.catalog` — 已发布服务列表与总线登记
- `governance.bus.adapter` — `BusAdapter` / `register_with_retry`
- `viz.embed` — origin 正则校验
- `auth` — `UserContext` 角色守卫（`integration` / `admin` / `dashboard:share`）
- `core.logging` — `trace_id_var`

## 主要类型 / 入口

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `IntegrationError` | 集成 API 统一错误 | API-003~007 | 已实现 |
| `list_published_services` / `execute_published_service` | IF-02 查询服务门面 | API-003 | L1 |
| `register_catalog_to_bus` | IF-01 总线注册 + retry | API-004 | L1 |
| `create_export_request` | IF-03 导出元数据 | API-005 | L1 |
| `issue_embed_token` / `resolve_sdk_params` | IF-04 嵌入 token | API-006 | L1 |
| `GET/POST /api/v1/services*` | IF-02 entry | API-003 | L1 |
| `POST /api/v1/integration/bus/register` | IF-01 entry | API-004 | L1 |
| `GET /api/v1/reports/export` | IF-03 entry | API-005 | L1 |
| `POST /api/v1/embed/token` · `GET /api/v1/embed/sdk-params` | IF-04 entry | API-006 | L1 |
| `openapi/version_policy.apply_version_policy` | IF tag + 版本策略 | API-007 | L1 |

## 关联 API

见 [api/README.md](../api/README.md) §5（嵌入）、§6（报表）、§8（查询服务与 IF-01）。

## 实现笔记

- L1 不新增 Alembic migration；embed token 为进程内 `_TOKEN_STORE`。
- `POST /gov/bus/register`（GOV-002）与 `POST /integration/bus/register`（IF-01）并存：前者 admin-only PoC，后者 integration/admin 开放集成路径。
- `POST /charts/embed/validate`（VIZ-006）校验配置；`POST /embed/token`（IF-04）签发运行时 token。
