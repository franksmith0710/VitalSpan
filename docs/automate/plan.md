# 演化里程碑计划（活跃）

> 人工维护（`create-evolution-plan`）；演化 agent **只读**。
> **当前节** = 第一个含未完成 `[ ]` 的节（**M1**）。
> **全量归档**：见 [`plan.archive.md`](./plan.archive.md)（M1–M13 + M1B，**124** 项 PRD 映射）。
> **实施细则**：架构见 [`../arch.md`](../arch.md)；验收见 [`prd/F01-BOOT.md`](./prd/F01-BOOT.md)；壳层见 [`../ui/layout.md`](../ui/layout.md)。

```yaml
version: 1.2.3
last_updated: 2026-07-03
archive_ref: docs/automate/plan.archive.md
current_milestone: M1
queued_milestone: M1B
m1b_activation: after-M1-complete-not-in-current-execute-scope
scope_change: FR-DATA/FR-ETL-in-scope-docs-synced-2026-07-03
plan_review: 2026-07-03-plan-fix-m1b-r2
```

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

## M1B — 数据接入与清洗（FR-DATA / FR-ETL）【待激活】

> **产品决策（2026-07-03）**：将 SRS §3.6 原「本期不做」的**同步入仓 + ETL 清洗**纳入平台范围。  
> **执行顺序**：**M1 全部完成后**再启动本节；演化 agent **只读**本节直至激活。  
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

<!-- M2–M13 见 plan.archive.md；M1 完成后激活 M1B 或迁入本节为当前节；M1B 完成后由 create-evolution-plan 调整 M2+ 顺序 -->
