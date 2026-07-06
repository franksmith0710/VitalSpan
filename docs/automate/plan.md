# 演化里程碑计划（活跃）

> 人工维护（`create-evolution-plan`）；演化 agent **只读**。
> **当前节** = 第一个含未完成 `[ ]` 的节（**M-FE-1**）。
> **全量路线图**：本文件含 **M1–M13 + M-FE**（**124** 项 PRD）；**当前执行范围** = **前三期**（M-FE + M2–M12，**94** 项）；**M13 四期冻结**。
> **完成定义**：`[x]` = PRD 分片「已实现」且验收标准全勾；`[ ]` =「部分实现」或未达浏览器/集成验收（含 FE companion）。
> **实施细则**：架构见 [`../arch.md`](../arch.md)；验收见 [`prd/F01-BOOT.md`](./prd/F01-BOOT.md)；壳层见 [`../ui/layout.md`](../ui/layout.md)。

```yaml
version: 2.1.0
last_updated: 2026-07-06
archive_ref: docs/automate/plan.archive.md
execute_scope: P1-P3
frozen_milestone: M13
roadmap: M1-M12+M-FE
prd_total: 124
prd_in_scope: 94
prd_completed_in_scope: 45
prd_remaining_in_scope: 49
current_milestone: M-FE-1
queued_milestone: M-FE-2
intervention: scope-p1-p3-first-2026-07-06
scope_change: M13-deferred-until-P1-P2-P3-smoke-pass
plan_review: 2026-07-06-three-phase-execution
```

### 执行范围：前三期（产品决策 2026-07-06）

> **决策**：先交付 SRS **一期 + 二期 + 三期**核心 BI 能力（建源→查询→Dashboard/报表→嵌入）；**四期 M13**（Dataset、设计器、治理全流程、信创连接器）冻结，待 P1/P2/P3-SMOKE 全过后再 `create-evolution-plan` 激活。  
> **依据**：`goal.md` G1–G3 主体在一～三期；G5/M1-DATASET 属四期；一至三期图表仍 **直连 dataSourceId + SQL**（不经 Dataset）。

| 范围 | 里程碑 | PRD 项 | 已实现 | 待完成 | 状态 |
|------|--------|--------|--------|--------|------|
| P0 | M1 + M1B | 12 | 12 | 0 | 已完成 |
| FE 先导 | M-FE-1 ~ M-FE-3 | 13* | 0 | 13 | **当前执行** |
| **一期** | M2 – M6 | 38 | 26 | 12 | **当前执行** |
| **二期** | M7 – M10 | 25 | 0 | 25 | 排队 |
| **三期** | M11 – M12 | 26 | 7 | 19 | 排队 |
| ~~四期~~ | ~~M13~~ | ~~30~~ | ~~2~~ | ~~28~~ | **冻结** |

\* M-FE 与 M2–M5 有 ID 重叠，为浏览器交付轨。

**推荐执行顺序**：`M-FE-1 → M-FE-2 → M-FE-3 → M3 CONN → M5 → M6（P1-SMOKE）→ M7–M10 → M11–M12（P3-SMOKE）`

**前三期完成信号**（不新增 PRD ID）：

| 验收 | 映射 |
|------|------|
| P1-SMOKE | M-FE-2 + M6 · MySQL/PG 建源 → SQL → Dashboard 出数 + 越权失败 |
| P2-SMOKE | M8–M10 · 扩展连接器 + 实体总览 + 预制报表/模板 |
| P3-SMOKE | M11–M12 · 调度 + 嵌入 SDK + 完整图表消费路径 |

## M1 — P0 工程基线

**目标**：前后端可联调、鉴权与迁移骨架就绪。

### 路径与模块约定（M1 执行前必读）

| 主题 | 约定 | 真理源 |
|------|------|--------|
| 前端根目录 | **`fe/`**（非 `frontend/`） | `arch.md` §4.3 · `layout.md` |
| 鉴权模块 | **`backend/app/auth/`** 实现；**`main.py` 注册** `AuthMiddleware` | `arch.md` §4.2 · `F01-BOOT` BOOT-003 |
| 设计系统 Skill | `.agents/skills/b-design-system-tailadmin-radix/SKILL.md` | `fe-ui.mdc` |
| 公开路径（鉴权豁免） | `/health`、`/docs`、`/redoc`、`/openapi.json` | 本节 BOOT-003 |

### 推荐执行顺序

```
BOOT-004 → BOOT-001 → BOOT-005 → BOOT-003 → BOOT-002 → BOOT-006
```

> 004 提供 Settings/日志/trace 中间件；001 依赖配置启动并注册 CORS；005 依赖 `DATABASE_URL`；003 在 001 路由壳上挂载鉴权与 `/me`；002 前端壳层（M1 不要求 API 客户端）；006 收尾 CI 与联调。

### 勾选清单

- [x] BOOT-004: 配置与日志基线（完成于 2026-07-03）
- [x] BOOT-001: FastAPI 工程骨架（完成于 2026-07-03）
- [x] BOOT-005: 数据库迁移框架（完成于 2026-07-03）
- [x] BOOT-003: 鉴权中间件骨架（完成于 2026-07-03）
- [x] BOOT-002: React 管理端壳层（完成于 2026-07-03）
- [x] BOOT-006: CI 与质量门禁（完成于 2026-07-03）

### M1 实施展开（plan-execute 履约用）

#### BOOT-004 — 配置与日志基线

| 交付物 | 说明 |
|--------|------|
| `backend/app/core/config.py` | `pydantic-settings`：`Settings`（见 `arch.md` §7.2） |
| `backend/app/core/logging.py` | 结构化 JSON 日志；`traceId` 字段名与 PRD 一致 |
| `backend/app/core/middleware.py` | `TraceIdMiddleware`：每请求生成/透传 `traceId`（`X-Trace-Id` 头可选），写入日志 context |
| `backend/.env.example` | 对齐 `arch.md` §7.2 全表：`VITALSPAN_ENV`、`DATABASE_URL`、`SECRET_KEY`、`CREDENTIAL_FERNET_KEY`（占位，M1 可不启用）、`CORS_ORIGINS`、`LOG_LEVEL`、`QUERY_*`（注释「二期用」） |
| `fe/.env.example` | `VITE_API_BASE_URL` |

**验证**：`cd backend` → `Settings()` 可从 `.env` 加载；发起 `GET /health` 后，对应日志行 JSON 含 `traceId`。

#### BOOT-001 — FastAPI 工程骨架

| 交付物 | 说明 |
|--------|------|
| `backend/pyproject.toml` | 运行时依赖：fastapi、uvicorn、pydantic-settings、sqlalchemy、alembic、psycopg（二进制）等；**开发依赖**：`ruff`、`pytest`、`httpx`；含 `[tool.ruff]` 与 `[tool.pytest.ini_options]`（`testpaths = ["../tests"]`） |
| `backend/app/main.py` | `app` 入口；挂载 `/health`；启用 OpenAPI；注册 `TraceIdMiddleware`（004）；`CORSMiddleware`（`Settings.cors_origins` 解析自 `CORS_ORIGINS`） |
| `backend/app/api/v1/router.py` | `APIRouter` 聚合壳（M1 空路由表，供 003 挂载 `me`） |
| `backend/app/api/v1/__init__.py` | 导出 `api_v1_router` |

**验证**：

```bash
cd backend
uvicorn app.main:app --reload --port 8000
# 另开终端：curl -i http://localhost:8000/health  → 200
# 浏览器 /docs 可访问
# 预检：curl -i -X OPTIONS -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" http://localhost:8000/health  → 含 Access-Control-Allow-Origin
```

#### BOOT-005 — 数据库迁移框架

| 交付物 | 说明 |
|--------|------|
| `docker-compose.yml` | 本地 PostgreSQL（平台元库） |
| `backend/alembic.ini` | Alembic 配置 |
| `backend/migrations/env.py` | 从 `Settings.DATABASE_URL` 读取连接串 |
| `backend/migrations/versions/` | 初始空 revision（`upgrade`/`downgrade` 空操作） |
| `backend/migrations/script.py.mako` | Alembic 模板（`alembic init` 产出） |

**验证**（本地手动，**不纳入 CI**）：`docker compose up -d` → `cd backend && alembic upgrade head` 成功；元库可连接。

#### BOOT-003 — 鉴权中间件骨架

| 交付物 | 说明 |
|--------|------|
| `backend/app/auth/middleware.py` | 鉴权中间件（骨架：Bearer 占位；`Bearer dev` 为 M1 开发占位） |
| `backend/app/auth/deps.py` | `get_current_user` 依赖注入 |
| `backend/app/api/v1/me.py` | 受保护占位路由 `GET /api/v1/me`（M1 验收用；二期正式路径见 `api/README` §1 `auth/me`） |
| `backend/app/api/v1/router.py` | 挂载 `me` 路由到 `api_v1_router` |
| `backend/app/main.py` | 注册 `AuthMiddleware`；`app.include_router(api_v1_router, prefix="/api/v1")` |
| `PUBLIC_PATHS` | 豁免：`/health`、`/docs`、`/redoc`、`/openapi.json` |

**验证**：

```bash
curl -i http://localhost:8000/health          # → 200（无 Token）
curl -i http://localhost:8000/api/v1/me       # → 401（无 Token）
curl -i -H "Authorization: Bearer dev" http://localhost:8000/api/v1/me  # → 200 + 用户上下文（占位）
```

#### BOOT-002 — React 管理端壳层

> **M1 范围**：仅 Admin 静态壳层与主题；**不交付** TanStack Query、`@/lib/queryKeys`、`mapApiError`（二期联调业务 API 时补，见 `fe-ui.mdc`）。

| 交付物 | 说明 |
|--------|------|
| `fe/package.json` + `vite.config.ts` | **pnpm**；依赖：react、react-router v7、tailwind v4、shadcn/Radix 最小集；`dev` proxy 或 `VITE_API_BASE_URL` |
| `fe/src/index.css` | Tailwind v4 + 设计系统 Token（按 b-design-system `from-zero.md`） |
| `fe/src/components/ui/*` | shadcn 基元（button、input 等最小集） |
| `fe/src/components/README.md` | 公共组件索引（最小集，列 `ui/` 基元；见 `fe-ui.mdc`） |
| `fe/src/layouts/AdminLayout.tsx` | Admin 壳层（290px 侧栏，见 `layout.md` §2） |
| `fe/src/routes.tsx` | react-router v7 嵌套路由；`/admin/*` 挂 `AdminLayout` |
| `fe/scripts/check-design.mjs` | `check:design`：扫描 `fe/src` 禁止 `#hex`/`rgb(` 硬编码色（Token 豁免注释可标 `@design-token-ok`） |
| `fe/package.json` scripts | `"check:design": "node scripts/check-design.mjs"` |

**验证**：`cd fe && pnpm build` 成功；浏览器访问 `/admin` 壳层；主题加载；`pnpm run check:design` 退出码 0。

#### BOOT-006 — CI 与质量门禁

| 交付物 | 说明 |
|--------|------|
| `.github/workflows/ci.yml` | PR 触发；**backend job**：`working-directory: backend` → `pip install -e .` → `ruff check .` → `pytest`；**frontend job**：`fe/` 下 `pnpm install` + `build` + `check:design`；**不启动** docker postgres |
| `.gitignore` | 忽略 `.env`、`__pycache__/`、`.venv/`、`node_modules/`、`fe/dist/`、`.pytest_cache/`、`*.egg-info/` |
| `tests/conftest.py` | `TestClient(app)` fixture；`PYTHONPATH` 含 `backend`（或 `pip install -e backend` 后从 `backend/` 执行 pytest） |
| `tests/test_health.py` | smoke：`GET /health` → 200 |
| 工具链 | 配置在 `backend/pyproject.toml`（`[tool.ruff]`、`[tool.pytest.ini_options]` `testpaths = ["../tests"]`）；**工作目录 `backend/`** 执行 ruff/pytest（与 `backend-fastapi.mdc` 一致） |

**联调验收**（本地手动，对齐 `arch.md` §9；包管理以 **pnpm** 为准）：

```bash
docker compose up -d
cd backend && cp .env.example .env && uvicorn app.main:app --reload --port 8000
cd fe && cp .env.example .env && pnpm dev
# 浏览器 :5173/admin 可访问，API 请求无 CORS 错误
```

#### M1 完成 — 文档回写

- [x] `docs/api/README.md`：`/health` 状态 → `已实现`；**新增** `GET /api/v1/me`（M1 占位验收，锚点 `api/v1/me.py`）；§1 `auth/me` 保留「规划」并注「二期正式路径」（完成于 2026-07-03）
- [x] `docs/services/core.md`、`auth.md`：更新状态与代码锚点（含 CORS、TraceId、`main.py` 挂载 `AuthMiddleware`）（完成于 2026-07-03）
- [x] `docs/arch.md`：§4.2 `auth` 挂载改为 `main.py` 注册；§4.3 增 **M1 过渡布局**注记；§10 PRD hub 计数 → **124 项**（完成于 2026-07-03）
- [x] `prd/F01-BOOT.md`：各项状态 → `已实现`（勾选验收标准）；BOOT-003 代码锚点与 plan 一致（`auth/middleware.py` + `main.py` 注册）（完成于 2026-07-03）

---

## M1B — 数据接入与清洗（FR-DATA / FR-ETL）【已完成】

> **产品决策（2026-07-03）**：将 SRS §3.6 原「本期不做」的**同步入仓 + ETL 清洗**纳入平台范围。  
> **状态**：2026-07-03 全部勾选完成；L2 DATA-SMOKE 全链路见 **M-FE-2 · DATA-005**。  
> **文档同步**（2026-07-03 范围纳入已完成；**v1.2.1 SourceConnection 模型**待 DATA-005 回写）：  
> - [x] `goal.md` §4：ETL/同步移至 In Scope  
> - [x] `docs/srs/全生命周期系统需求规格说明书.md` §3.6、§8.1、附录追溯表  
> - [x] `docs/automate/prd/F16-DATA.md` + hub 索引（**DATA-001 描述**待 DATA-005 对齐 SourceConnection）  
> - [x] `plan.archive.md`：M1B 节目标与 124 项计数（完成于 2026-07-03）  
> - [x] `docs/arch.md`：`ingestion/` · `ANALYTICS_DATABASE_URL`  
> - [x] `docs/api/README.md` §9 数据接入 API  
> - [x] `docs/services/ingestion.md`：SourceConnection 边界（完成于 2026-07-03）
>
> **明确不含**：提前一至三期 Dataset（M1-DATASET 仍按四期 / M13）；嵌入 Superset/DataEase。

**目标**：用户配置源库与同步/清洗任务后，数据进入**平台托管分析库**；**M1B 当期**完成同步+清洗闭环；**`dataSourceId` 注册与 BI SQL 出数**在 M3/M4 对接（见 DATA-005 两级验收）。

### 路径与模块约定（M1B 执行前必读）

| 主题 | 约定 |
|------|------|
| 托管分析库 | 独立 PostgreSQL 实例或 schema（与平台**元库** `DATABASE_URL` 分离）；连接串 `ANALYTICS_DATABASE_URL` |
| 后端域 | `backend/app/ingestion/`（sync + etl + scheduler 骨架） |
| **源连接（M1B）** | 任务内联 **`SourceConnection`**（类型 mysql/postgres、主机、库、凭证）；凭证加密存**元库** ingestion 表；**不依赖** M3 `ConnectorRegistry` / `dataSourceId` |
| **源连接（M3+）** | 同步任务可选 `sourceDataSourceId` 引用已登记数据源（与内联二选一，M3 落地） |
| 与 FR-2.0 关系 | 托管库产物在 **M3 DS-002** 登记为普通 `dataSourceId` 后供 FR-2.0b；M1B 不替代 ConnectorRegistry |
| ingestion 元数据 | 任务/运行历史/规则表走**元库既有 Alembic**（`backend/migrations/`）；托管库**仅业务表**，不设第二套 Alembic |
| 一期 M1B 范围 | **库表级**同步 + **规则表**级轻量清洗；不做 OGG 实时复制、不做完整可视化 ETL 设计器 |

### 推荐执行顺序

```
DATA-004 → DATA-001 → DATA-002 → ETL-001 → DATA-003 → DATA-005
```

> 004 托管库与配置；001 同步任务模型；002 执行器；ETL-001 清洗规则；003 Admin UI；005 集成验收。

### 勾选清单

- [x] DATA-004: 托管分析库与配置项（完成于 2026-07-03）
- [x] DATA-001: 同步任务模型与 API（完成于 2026-07-03）
- [x] DATA-002: 同步执行器（定时/手动）（完成于 2026-07-03）
- [x] ETL-001: 清洗规则引擎（轻量）（完成于 2026-07-03）
- [x] DATA-003: Admin 配置台页面（完成于 2026-07-03）
- [x] DATA-005: 端到端验收与文档回写（完成于 2026-07-03）

### M1B 实施展开

#### DATA-004 — 托管分析库与配置项

| 交付物 | 说明 |
|--------|------|
| `docker-compose.yml` | 增 `analytics-postgres`；增 **`mysql` 与/或 `postgres` 样例源库**（L1 验收用，端口与元库错开） |
| `backend/app/core/config.py` | `ANALYTICS_DATABASE_URL` |
| `backend/.env.example` | 上述变量 + 样例源连接注释；**`CREDENTIAL_FERNET_KEY` 在 M1B 启用**（加密 `SourceConnection` 凭证） |
| `backend/migrations/versions/` | **元库**新增 revision：`ingestion_*` 表（同步任务、运行历史、清洗规则、`SourceConnection` 凭证引用） |
| `backend/pyproject.toml` | 增 `apscheduler`；增 **`pymysql` 或 `mysqlclient`**（MySQL 源）；`psycopg` 已有（PG 源） |

**验证**：`docker compose up -d` → 托管库 + 样例源库可连接；`cd backend && alembic upgrade head` 含 ingestion 元表；`Settings` 加载 `CREDENTIAL_FERNET_KEY`。

#### DATA-001 — 同步任务模型与 API

| 交付物 | 说明 |
|--------|------|
| `backend/app/ingestion/models.py` | 同步任务：`SourceConnection`（内联源连接）、源表、目标表、调度 cron、状态；`sourceDataSourceId` 字段预留（M3 启用，M1B 可空） |
| `backend/app/api/v1/ingestion/sync.py` | CRUD + `POST .../run` 手动触发 |
| `docs/api/README.md` | 登记同步 API（状态：规划→已实现） |

**验证**：API 用内联 `SourceConnection` 创建任务；OpenAPI 可见；**无需** M3 数据源 API。

#### DATA-002 — 同步执行器

| 交付物 | 说明 |
|--------|------|
| `backend/app/ingestion/sync_executor.py` | 全量/增量（M1B 可先全量）；读 `SourceConnection` 连源库；写入托管库 |
| `backend/app/ingestion/scheduler.py` | **APScheduler**；cron 触发 |
| 失败重试 | 至少 **1 次**自动重试；仍失败则运行历史记 `failed` + `errorMessage` + `traceId` |
| 日志 | 每次运行 `traceId` + 行数/失败原因 |

**验证**：compose 样例 MySQL/PG 源表 → 托管库目标表有数据；失败后历史可查且可手动重跑。

#### ETL-001 — 清洗规则引擎（轻量）

| 交付物 | 说明 |
|--------|------|
| `backend/app/ingestion/etl_rules.py` | 规则类型：列重命名、类型转换、空值填充、简单过滤（可 JSON 配置） |
| 挂载点 | 同步流水线 **写托管库前** 应用规则 |

**验证**：含脏值的源表经规则后目标表字段符合配置。

#### DATA-003 — Admin 配置台页面

| 交付物 | 说明 |
|--------|------|
| `fe/src/pages/admin/ingestion/` | 同步任务列表/编辑、运行历史、清洗规则表单 |
| 路由 | `/admin/ingestion/*` |

**验证**：浏览器完成创建任务 → 手动运行 → 查看历史。

#### DATA-005 — 端到端验收与文档回写

| 验收级别 | 场景 | 说明 |
|----------|------|------|
| **L1（M1B 当期必达）** | 同步+清洗闭环 | 内联源连接 → 配置同步+清洗 → 托管库目标表有正确数据；运行历史可查 |
| **L2（M3/M4 复测）** | **DATA-SMOKE 全链路** | 托管库登记为 `dataSourceId`（DS-002）→ FR-2.0b SQL 查询出数 |
| 文档 | M1B 收尾 | `prd/F16-DATA.md`（DATA-001 SourceConnection）、`services/ingestion.md`、`plan.archive.md`（124 项 + M1B 目标）、SRS §3.6 → 已实现 |

---

## M-FE-1 — 认证与数据源 FE（当前节）

> **人工干预（2026-07-06）**：G2 r188 **SATURATED** 熔断后新增；聚焦浏览器可感知缺口（登录、数据源 UI），不重复后端已交付 API。  
> **PRD 状态说明**：下列 ID 在分片标「已实现」者为本轮 **FE companion 深化**；验收以浏览器可走通 + 分片未勾 `[ ]` 为准，完成后再回写分片。

**目标**：用户可登录、可管理数据源；移除 `Bearer dev` / `session.ts` 硬编码；对齐 `layout.md` §3「数据」分组。

**依赖**：`docker compose up -d` + `alembic upgrade head`（平台元库）；数据源连通性测试需可连 MySQL/PG。

**推荐执行顺序**

```
BOOT-003 → BOOT-002 → DS-002 → DS-003 → DS-007
```

### 勾选清单

- [x] BOOT-003: 正式登录与会话（`POST /api/v1/auth/login`、JWT、`/login` 页、`api.ts` 读 token）（完成于 2026-07-06）
- [x] BOOT-002: API 客户端与 TanStack Query（`@/lib/api.ts`、`queryKeys`、`mapApiError`）（完成于 2026-07-06）
- [x] DS-002: 数据源管理页（`/admin/datasources` 列表/新建/编辑）（完成于 2026-07-06）
- [x] DS-003: 连通性测试 UI（详情页触发 test、展示结构化错误）（完成于 2026-07-06）
- [x] DS-007: 连接器类型只读页（`/admin/connectors` 对接 types API）（完成于 2026-07-06）

### M-FE-1 验收信号

- 未登录访问 `/admin/*` → 重定向 `/login`；登录后 `GET /api/v1/me` 200
- 浏览器完成 MySQL 或 PG 数据源新建 + 连通性测试成功
- `fe/src/routes.tsx` 注册 datasources/connectors；侧栏「数据源」可点击

---

## M-FE-2 — P1 最小出数闭环

> **目标对齐**：`goal.md` §5 **P1-SMOKE**（MySQL/PG 建源 → SQL → Dashboard 出数）+ **DATA-SMOKE L2**（`plan.md` M1B DATA-005 表）。

**目标**：从数据源到 Dashboard 图表出数的端到端浏览器验收；补齐分片「部分实现」项未勾验收。

**依赖**：M-FE-1 完成；至少一个可用 `dataSourceId`。

**推荐执行顺序**

```
DS-004 → VIZ-002 → DASH-002 → DATA-005
```

### 勾选清单

- [x] DS-004: Schema 浏览器 UI（schemas/tables/columns 三级浏览）（完成于 2026-07-06）
- [x] VIZ-002: 最小图表集 FE 渲染（表格/折线/柱在 Dashboard 出数）（完成于 2026-07-06）
- [x] DASH-002: Dashboard 网格拖拽布局（分片未勾「网格布局可拖拽」）（完成于 2026-07-06）
- [x] DATA-005: DATA-SMOKE L2 全链路验收（托管库登记 `dataSourceId` → SQL 查询出数 + 文档回写）（完成于 2026-07-06）

### M-FE-2 验收信号

- P1-SMOKE 手工或自动化用例：建源 → 配置图表 SQL → Dashboard view 模式可见数据
- `prd/F07-DASH.md` DASH-002 拖拽项可勾选；`prd/F16-DATA.md` L2 验收补录

---

## M-FE-3 — 系统管理与消费态

> **目标对齐**：`layout.md` §3 系统管理分组 + G4 可配置权限最小 Admin UI；Dashboard 消费体验。

**目标**：角色/用户管理页可用；角色默认视图与全局筛选器 FE 联动。

**依赖**：M-FE-2 完成（需 Dashboard 与数据源基础）。

**推荐执行顺序**

```
AUTH-001 → AUTH-003 → VIEW-003 → DASH-004
```

### 勾选清单

- [ ] AUTH-001: 角色管理 Admin UI（`/admin/system/roles`）
- [ ] AUTH-003: 用户角色绑定 Admin UI（`/admin/system/users`）
- [ ] VIEW-003: 用户默认视图 FE（登录后按角色重定向默认 Dashboard）
- [ ] DASH-004: 全局筛选器 FE 联动（分片未勾「筛选器驱动组件刷新」）

### M-FE-3 验收信号

- 侧栏「用户管理」不再是 `#`；可创建角色并绑定用户
- 消费账号登录后进入角色默认 Dashboard；全局筛选器变更驱动 widget 刷新

---

## M2 — 权限地基（一期 · M7-RLS）

**SRS**：FR-8.1、FR-1.6、M7-RLS · **验收**：越权 smoke test · **Admin UI**：M-FE-3

- [x] AUTH-001: RoleRegistry 角色注册（完成于 2026-07-04）
- [x] AUTH-002: 组织树配置（完成于 2026-07-04）
- [x] AUTH-003: 用户角色绑定（完成于 2026-07-04）
- [x] AUTH-004: 资源授权绑定（完成于 2026-07-04）
- [x] AUTH-005: 权限维度类型定义（完成于 2026-07-04）
- [x] AUTH-006: 权限维度分组与角色关联（完成于 2026-07-04）
- [x] AUTH-007: RLS 谓词生成与注入（完成于 2026-07-04）
- [x] AUTH-008: 操作审计日志（完成于 2026-07-04）

---

## M3 — 数据源平台与关系型连接器（一期）

**SRS**：FR-2.0 · **验收**：P1-SMOKE 前置 · **Admin UI**：M-FE-1

- [x] DS-001: ConnectorRegistry 插件注册表（完成于 2026-07-04）
- [x] DS-002: 数据源 CRUD API（完成于 2026-07-04）
- [x] DS-003: 连通性测试（完成于 2026-07-04）
- [x] DS-004: Schema 元数据浏览（完成于 2026-07-04）
- [x] DS-005: 凭证加密存储（完成于 2026-07-04）
- [x] DS-006: 连接池按 dataSourceId 隔离（完成于 2026-07-04）
- [x] DS-007: 已注册类型清单 API（完成于 2026-07-04）
- [x] DS-008: 数据源授权与 M7 集成（完成于 2026-07-04）
- [ ] CONN-001: MySQL 连接器
- [ ] CONN-002: PostgreSQL 连接器

---

## M4 — 轻量查询与图表直连（一期 · M3-LITE）

**SRS**：M3-LITE、FR-2.0b · **验收**：查询可返回且越权失败

- [x] QUERY-001: M3-LITE SQL 只读执行（完成于 2026-07-04）
- [x] QUERY-002: 物理表 mode=table 查询（完成于 2026-07-04）
- [x] QUERY-005: 图表直连绑定 FR-2.0b（完成于 2026-07-04）
- [x] QUERY-006: RLS 注入执行链（完成于 2026-07-04）

---

## M5 — 最小图表与 Dashboard（一期 · M4-MIN / M5）

**SRS**：M4-MIN、M5-DASHBOARD、FR-VIEW-1 · **验收**：组件可出数 · **FE**：M-FE-2

- [x] VIZ-001: ChartViewConfig 协议（完成于 2026-07-04）
- [x] VIZ-002: 最小图表集 M4-MIN（完成于 2026-07-04）
- [x] DASH-001: DashboardView 数据模型（完成于 2026-07-04）
- [x] DASH-002: Dashboard 容器与布局引擎（完成于 2026-07-06）
- [ ] DASH-003: Dashboard 组件库（地图/热力/KPI/时间轴待补）
- [ ] VIEW-001: DashboardView 视图协议 FR-VIEW-1

---

## M6 — 一期集成验收与总线 PoC

**SRS**：P1-SMOKE、FR-1.1-PoC、NFR-01/03 · **验收**：§9.1 一期必过项

- [x] API-001: IF-06 数据源管理 API（完成于 2026-07-04）
- [x] API-002: IF-06 查询执行 API（完成于 2026-07-04）
- [x] API-007: OpenAPI 规范与版本策略（完成于 2026-07-04）
- [ ] GOV-001: 查询接口分类 catalog 附录 E
- [ ] GOV-002: 总线 PoC 半自动注册 FR-1.1
- [ ] CAT-001: CAT-01 实体生命周期查询类
- [ ] CAT-002: CAT-02 统计分析聚合类
- [ ] CAT-003: CAT-03 地域维度查询类
- [ ] NFR-001: NFR-01 Dashboard 首屏性能
- [ ] NFR-004: NFR-03 HTTPS 脱敏审计

---

## M7 — 数据源类型扩展（二期 · FR-2.0-EXT）

**SRS**：二期关系型/OLAP · **验收**：§9.1 二期 FR-2.0-EXT

- [ ] CONN-003: MariaDB / Hive 连接器
- [ ] CONN-004: SQL Server / Oracle 连接器
- [ ] CONN-005: Oracle / SQL Server 连接器
- [ ] CONN-006: SQLite 连接器
- [ ] CONN-007: ClickHouse 连接器
- [ ] CONN-008: Apache Doris 连接器

---

## M8 — 实体元数据与总览页（二期）

**SRS**：M1-ENTITY-MODEL、FR-6.2 · **验收**：附录 F FR-6.2

- [ ] META-005: 物理表元数据登记 M1-ENTITY
- [ ] META-006: 实体类型 schema 配置
- [ ] DASH-004: 全局筛选器联动（BE 已 L1；FE 刷新链见 M-FE-3）
- [ ] DASH-005: 实体总览页 FR-6.2

---

## M9 — 主题分析与预制报表（二期）

**SRS**：FR-4.1、FR-3.1 · **验收**：§9.1 二期 FR-3.1/4.1

- [ ] DASH-006: 可配置实体主题分析 FR-4.1
- [ ] RPT-001: 报表引擎渲染
- [ ] RPT-002: 预制分析报表体系 FR-3.1

---

## M10 — 报表模板与角色默认视图（二期）

**SRS**：FR-3.2 首包、FR-VIEW-3、FR-6.3、M6 · **验收**：报表展现 + 角色模板

- [ ] RPT-003: Word/Excel/PDF 模板定义
- [ ] RPT-004: 模板树形目录管理
- [ ] RPT-006: 报表扩展配置 FR-6.3
- [ ] VIEW-002: 角色默认模板 FR-VIEW-3
- [ ] NFR-002: NFR-01 报表查询性能

---

## M11 — 原生连接器与完整图表插件（三期）

**SRS**：FR-2.0-EXT 三期、FR-2.1、NFR-07 · **验收**：§9.1 三期

- [ ] CONN-009: StarRocks 连接器
- [ ] CONN-010: Trino/Presto 连接器
- [ ] CONN-011: InfluxDB 连接器
- [ ] CONN-012: TDengine 连接器
- [ ] CONN-013: TimescaleDB 连接器
- [ ] CONN-014: MongoDB 连接器
- [ ] CONN-015: Elasticsearch 连接器
- [ ] CONN-016: OpenSearch 连接器
- [ ] QUERY-003: Native 查询双路径（与 M4 合并验收）
- [x] QUERY-004: SQL 方言适配器（完成于 2026-07-04）
- [x] VIZ-003: 图表类型插件注册（完成于 2026-07-04）
- [x] VIZ-004: 图表样式子类型（完成于 2026-07-04）
- [ ] VIZ-005: 维度指标筛选配置 UI
- [x] VIZ-006: iframe 嵌入门户（完成于 2026-07-04）
- [ ] VIZ-007: SDK 嵌入门户
- [x] VIZ-008: ECharts/AntV 渲染适配层（完成于 2026-07-04）
- [ ] CAT-004: CAT-04 时间序列分析类
- [ ] CAT-005: CAT-05 工单与业务受理类
- [ ] CAT-006: CAT-06 生产与销售统计类

---

## M12 — 报表调度与用户视图（三期）

**SRS**：FR-3.2、FR-6.4、FR-VIEW-4、IF-03 · **验收**：§9.1 三期调度与视图

- [ ] RPT-005: 报表调度 FR-3.2
- [ ] RPT-007: 批量新增报表 FR-6.4
- [ ] VIEW-003: 用户视图覆盖 FR-VIEW-4（与 M-FE-3 合并验收）
- [x] API-005: IF-03 报表文档 API（完成于 2026-07-04）
- [x] API-006: IF-04 门户嵌入 API（完成于 2026-07-04）
- [ ] NFR-006: NFR-05 浏览器与消息推送
- [ ] CAT-007: CAT-07 组织行为审计类

---

## M13 — 四期语义层与治理闭环【冻结 · 不在当前执行范围】

> **冻结（2026-07-06）**：待 **P1/P2/P3-SMOKE** 全通过后，经 `create-evolution-plan` 激活本节。  
> **演化 agent**：**只读**本节；G2 **禁止**从本节选题。  
> **SRS**：§8.4 四期 Workstream、FR-1.2~1.6、FR-2.2、NFR-04/06/08 · **验收**：§8.4 端到端 + §9.1 四期

- [ ] CONN-017: 达梦 DM 连接器
- [ ] CONN-018: 人大金仓 连接器
- [ ] CONN-019: 南大通用 GBase 连接器
- [ ] CONN-020: OceanBase 连接器
- [ ] CONN-021: TiDB 连接器
- [ ] CONN-022: GaussDB 连接器
- [ ] QUERY-007: 配置元模型存储
- [ ] QUERY-008: 配置→SQL/API 翻译器
- [ ] QUERY-009: Dataset 查询路径
- [ ] META-001: 术语字典
- [ ] META-002: 业务主题树
- [ ] META-003: 维度字典注册
- [ ] META-004: Dataset CRUD M1-DATASET
- [ ] DESIGN-001: 拖拽查询条件配置
- [ ] DESIGN-002: 运算规则维护
- [ ] DESIGN-003: 输出字段与聚合配置
- [ ] DESIGN-004: 设计器与工单关联
- [ ] DESIGN-005: 传统 SQL 模式
- [ ] GOV-003: 工单流程模板 FR-1.2
- [ ] GOV-004: 可视化查询设计 FR-1.3
- [ ] GOV-005: 查询服务发布 FR-1.4
- [ ] GOV-006: 发布引擎 OpenAPI 映射
- [ ] GOV-007: 总线全自动注册 FR-1.1
- [ ] GOV-008: 治理权限联动 FR-1.6
- [x] API-003: IF-02 查询服务 API（完成于 2026-07-04）
- [x] API-004: IF-01 总线注册适配（完成于 2026-07-04）
- [ ] NFR-003: NFR-02 核心看板可用性
- [ ] NFR-005: NFR-04 连接器插件扩展性
- [ ] NFR-007: NFR-06 信创国产化
- [ ] NFR-008: NFR-08 自主可控零 DE/SS

> **前三期总验收**（不新增 PRD ID）：见文首「前三期完成信号」表；四期全量回归待 M13 激活后执行。
