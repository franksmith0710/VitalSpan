# 演化里程碑计划（活跃）

> 人工维护（`create-evolution-plan`）；演化 agent **只读**。
> **当前节** = **M-DASH-UX · Dashboard 编辑体验对标**（**唯一活跃节**）。**M-FINAL 已冻结**；**M-PRODUCT 排队**（F-A~E 已勾；**F-F 非默认 gate**）。  
> **全量路线图**：M1–M12 + M-FE-1~3 + M-FINAL 已完成；**PRD 总数 129**（合同已实现）；companion 见 §M-DASH-UX + §M-PRODUCT。  
> **完成定义**：`[x]` = companion 浏览器可感知 / 合同项分片「已实现」；`[ ]` = companion 未达；标「可选」不阻塞收官。  
> **实施细则**：架构见 [`../arch.md`](../arch.md)；验收见 [`prd/F07-DASH.md`](./prd/F07-DASH.md) · [`prd/F06-VIZ.md`](./prd/F06-VIZ.md)；壳层见 [`../ui/layout.md`](../ui/layout.md)。

```yaml
version: 2.8.0
last_updated: 2026-07-09
archive_ref: docs/automate/plan.archive.md
execute_scope: M-DASH-UX
frozen_milestone: M-FINAL
queued_milestone: M-PRODUCT
roadmap: M1-M12+M-FE-1~3+M-FINAL+M-PRODUCT+M-DASH-UX
prd_total: 129
prd_in_scope: 129
prd_completed_in_scope: 129
prd_remaining_in_scope: 0
companion_scope: M-DASH-UX-F-A,M-DASH-UX-F-B,M-DASH-UX-F-C,M-DASH-UX-F-D,M-PRODUCT-F-D,M-PRODUCT-F-E,M-PRODUCT-F-F
companion_remaining: 29
current_milestone: M-DASH-UX
intervention: create-evolution-plan-dash-ux-align-code-2026-07-09
scope_change: M-PRODUCT-queued-M-DASH-UX-active
plan_review: 2026-07-09-code-align-must-optional
prd_hub_ref: docs/automate/prd.md@v1.2.113
polish_checklist_ref: docs/automate/plans/2026-07-08-product-polish-checklist.md
e2e_pass_ref: docs/automate/plans/2026-07-09-graduation-e2e-pass.md
bug_case_ref: .agents/skills/bug-case-library/cases/fe-dashboard-zombie-edit-flicker.md
code_gap_note: edit-mode WidgetEditPreview blocks ChartRenderer; ChartConfigPanel unused in WidgetInspector
```

### 执行范围：M-FINAL 已冻结 · M-DASH-UX 当前节 · M-PRODUCT 排队（产品决策 2026-07-09 人工确认）

> **决策（2026-07-07）**：将 **M-FE-4/5**、**M13**、**F-G** 合并为 **§M-FINAL**；**2026-07-08 收官**（129/129 PRD 合同勾完）。  
> **决策（2026-07-08）**：追加 **§M-PRODUCT** 处理成品感、DataEase 数据源分类、IA 收敛与 companion 验收清扫。  
> **决策（2026-07-09）**：方案 A → **§M-DASH-UX** 为当前节；**§M-PRODUCT** queued。  
> **决策（2026-07-09 · 代码对齐）**：对照 `DashboardWidget`/`WidgetInspector`/`ChartConfigPanel`/`useChartExecute` 实扫 → **F-A 强调接线（非造能力）**；**F-C 稳定性已落地勾选**；**F-C/F-D 拆必做/可选**；**F-F 非默认 gate**。  
> **依据**：`goal.md` G1/G3；代码证据：编辑态 `WidgetEditPreview` 挡住 `ChartRenderer`；`ChartConfigPanel` 未接入检视器；`GlobalFilterBar` 仅 view。

| 范围 | 子批 | PRD 项 | 已实现 | 待完成 | 状态 |
|------|------|--------|--------|--------|------|
| P0 | M1 + M1B | 12 | 12 | 0 | 已完成 |
| FE 先导 | M-FE-1 ~ M-FE-3 | 13* | 13 | 0 | 已完成 |
| **最后一期** | **M-FINAL · F-A ~ F-G** | **38†** | **38** | **0** | **已冻结** |
| **成品收官** | **M-PRODUCT · F-A ~ F-F** | **companion** | **20‡** | **20** | **排队** |
| **编辑体验** | **M-DASH-UX · F-A ~ F-D** | **companion** | **1** | **9 必做 + 2 可选** | **当前节** |
| 一期–三期 | M2 – M12 | 88 | 88 | 0 | 已完成 |

\* M-FE 与 M2–M5 有 ID 重叠，为浏览器交付轨。  
† M-FINAL companion 行映射既有 PRD ID，合同 129 项已全部勾选。  
‡ M-PRODUCT F-A~E 已勾（F-D 书面 E2E 见 `plans/2026-07-09-graduation-e2e-pass.md`）；F-F 18 项非默认 gate。

**推荐执行顺序（全局 · 当前）**：

```
M-DASH-UX F-A（编辑态接线真出图 · SQL+Dataset）  ← 首轮必做
  → F-B（检视器接入 ChartConfigPanel）
  → F-C 必做（撤销）∥ F-C 已勾（稳定性）
  → F-D 必做（编辑页全局筛选）；联动=可选
  → M-PRODUCT F-D 书面 E2E 已记录（2026-07-09）；F-F 仅人工点名
```

**G2 选题约束**：每轮从 **§M-DASH-UX 含 `[ ]` 且非「可选」** 的子批取 **3–5 项**；**首轮必须 F-A**。**禁止**选题：M-PRODUCT F-F、M-DASH-UX 标「可选」项（除非人工点名）、AI/SQLBot、非图表积木。

**前三期完成信号**（不新增 PRD ID）：

| 验收 | 映射 |
|------|------|
| P1-SMOKE | M-FE-2 + M6 · MySQL/PG 建源 → SQL → Dashboard 出数 + 越权失败 |
| P2-SMOKE | M8–M10 · 扩展连接器 + 实体总览 + 预制报表/模板 |
| P3-SMOKE | M11–M12 · 调度 + 嵌入 SDK + 完整图表消费路径 |

### 对标校准（DataEase / Superset · 2026-07-07 调研）

> **结论**：**大方向不改**（`goal.md` G1–G5 仍成立）；差距主要在 **体验层（IA/RBAC FE）**、**四期语义层收官**、**F-G 连接器实现**；**不追** DataEase SQLBot/AI 问数（无 SRS/PRD，非当期对标项）。

| 维度 | DataEase 2.x | Superset 4.x+ | VitalSpan 现状 | plan 动作 |
|------|--------------|---------------|----------------|-----------|
| 产品形态 | 单应用；数据源→**数据集**→仪表板 | 单应用；Data→SQL Lab→Charts→Dashboards | 单应用 `/admin/*` + RBAC 分菜单 | ✅ 与 SRS ADR 一致；**M-FE-4** 收拢 IA |
| 数据路径 | 数据集（Calcite SQL）为中心 | Dataset + 新兴 Semantic Layer 扩展 | 一至三期 **直连 SQL**；四期 **Dataset**（M13-B） | ✅ 分期合理；M13-B 对齐 DE Dataset / SS Dataset，**不含** SS Semantic Layer 插件体系 |
| 连接器 | 20+ 型；缺项 CONN-023~027 | Database 连接器 + 多引擎 | **22** 方言已注册；F-G 五型已立项未实现 | **F-C** 信创收官 → **F-G** 补缺 |
| 权限 | 组织+角色+资源+行列权限 | Role+Permission；Dataset/Dashboard；`DASHBOARD_RBAC` | 后端 AUTH 全栈；FE 缺资源授权 UI；nav 硬编码三档 | **M-FE-5** |
| 报表/调度 | 定时报告、模板 | Alerts & Reports | RPT-001~007 已交付 | ✅ 已对标 |
| 嵌入 | SDK/iframe/API | Embed + SDK | VIZ-006/007 + `/embed/*` | ✅ 已对标 |
| 数据同步/ETL | SeaTunnel/同步任务 | 无原生（需外部） | **M1B ingestion** 已交付 | ✅ **差异化优势**，保持 |
| 查询治理/总线 | 无完整对标 | 无完整对标 | M8 GOV + 工单/发布（M13-C） | ✅ **G5 差异化**，保持优先于 AI |
| AI 问数 | SQLBot 集成（2026） | 社区探索，非核心 | 无 | **Out of Scope**；不纳入 M-FINAL，除非 `create-evolution-goal` 修订 |

**导航工作流对齐（供 M-FE-4 manifest 参考，非新 PRD）**：

```
数据（源/接入/类型） → 分析（Dashboard/探索） → 报表（模板/运行/调度） → 主题与实体 → 语义层 → 治理 → 系统
```

对标 DE「数据准备→可视化」与 SS「Data→Explore→Dashboard」；**不把 SQL Lab 单列为顶栏**——由「图表探索 + 查询设计器」分担（SRS FR-1.3 / M13-C）。

**G2 禁止选题（调研登记）**：AI/SQL 智能问数、Superset Semantic Layer 插件扩展、fork DE/SS 运行时。

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

## M-FE-1 — 认证与数据源 FE【已完成】

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

- [x] AUTH-001: 角色管理 Admin UI（`/admin/system/roles`）（完成于 2026-07-06）
- [x] AUTH-003: 用户角色绑定 Admin UI（`/admin/system/users`）（完成于 2026-07-06）
- [x] VIEW-003: 用户默认视图 FE（登录后按角色重定向默认 Dashboard）（完成于 2026-07-06）
- [x] DASH-004: 全局筛选器 FE 联动（分片未勾「筛选器驱动组件刷新」）（完成于 2026-07-06）

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
- [x] CONN-001: MySQL 连接器（完成于 2026-07-06）
- [x] CONN-002: PostgreSQL 连接器（完成于 2026-07-06）

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
- [x] DASH-003: Dashboard 组件库（完成于 2026-07-06）
- [x] VIEW-001: DashboardView 视图协议 FR-VIEW-1（完成于 2026-07-06）

---

## M6 — 一期集成验收与总线 PoC

**SRS**：P1-SMOKE、FR-1.1-PoC、NFR-01/03 · **验收**：§9.1 一期必过项

- [x] API-001: IF-06 数据源管理 API（完成于 2026-07-04）
- [x] API-002: IF-06 查询执行 API（完成于 2026-07-04）
- [x] API-007: OpenAPI 规范与版本策略（完成于 2026-07-04）
- [x] GOV-001: 查询接口分类 catalog 附录 E（完成于 2026-07-06）
- [x] GOV-002: 总线 PoC 半自动注册 FR-1.1（完成于 2026-07-06）
- [x] CAT-001: CAT-01 实体生命周期查询类（完成于 2026-07-06）
- [x] CAT-002: CAT-02 统计分析聚合类（完成于 2026-07-06）
- [x] CAT-003: CAT-03 地域维度查询类（完成于 2026-07-06）
- [x] NFR-001: NFR-01 Dashboard 首屏性能（完成于 2026-07-06）
- [x] NFR-004: NFR-03 HTTPS 脱敏审计（完成于 2026-07-06）

---

## M7 — 数据源类型扩展（二期 · FR-2.0-EXT）

**SRS**：二期关系型/OLAP · **验收**：§9.1 二期 FR-2.0-EXT

- [x] CONN-003: MariaDB / Hive 连接器（完成于 2026-07-06）
- [x] CONN-004: SQL Server / Oracle 连接器（完成于 2026-07-06）
- [x] CONN-005: Oracle / SQL Server 连接器（完成于 2026-07-06）
- [x] CONN-006: SQLite 连接器（完成于 2026-07-06）
- [x] CONN-007: ClickHouse 连接器（完成于 2026-07-06）
- [x] CONN-008: Apache Doris 连接器（完成于 2026-07-06）

---

## M8 — 实体元数据与总览页（二期）

**SRS**：M1-ENTITY-MODEL、FR-6.2 · **验收**：附录 F FR-6.2

- [x] META-005: 物理表元数据登记 M1-ENTITY（完成于 2026-07-06）
- [x] META-006: 实体类型 schema 配置（完成于 2026-07-06）
- [x] DASH-004: 全局筛选器联动（BE 已 L1；FE 刷新链见 M-FE-3）（完成于 2026-07-06）
- [x] DASH-005: 实体总览页 FR-6.2（完成于 2026-07-06）

---

## M9 — 主题分析与预制报表（二期）

**SRS**：FR-4.1、FR-3.1 · **验收**：§9.1 二期 FR-3.1/4.1

- [x] DASH-006: 可配置实体主题分析 FR-4.1（完成于 2026-07-06）
- [x] RPT-001: 报表引擎渲染（完成于 2026-07-06）
- [x] RPT-002: 预制分析报表体系 FR-3.1（完成于 2026-07-06）

---

## M10 — 报表模板与角色默认视图（二期）

**SRS**：FR-3.2 首包、FR-VIEW-3、FR-6.3、M6 · **验收**：报表展现 + 角色模板

- [x] RPT-003: Word/Excel/PDF 模板定义（完成于 2026-07-07）
- [x] RPT-004: 模板树形目录管理（完成于 2026-07-07）
- [x] RPT-006: 报表扩展配置 FR-6.3（完成于 2026-07-07）
- [x] VIEW-002: 角色默认模板 FR-VIEW-3（完成于 2026-07-07）
- [x] NFR-002: NFR-01 报表查询性能（完成于 2026-07-07）

---

## M11 — 原生连接器与完整图表插件（三期）

**SRS**：FR-2.0-EXT 三期、FR-2.1、NFR-07 · **验收**：§9.1 三期

- [x] CONN-009: StarRocks 连接器（完成于 2026-07-07）
- [x] CONN-010: Trino/Presto 连接器（完成于 2026-07-07）
- [x] CONN-011: InfluxDB 连接器（完成于 2026-07-07）
- [x] CONN-012: TDengine 连接器（完成于 2026-07-07）
- [x] CONN-013: TimescaleDB 连接器（完成于 2026-07-07）
- [x] CONN-014: MongoDB 连接器（完成于 2026-07-07）
- [x] CONN-015: Elasticsearch 连接器（完成于 2026-07-07）
- [x] CONN-016: OpenSearch 连接器（完成于 2026-07-07）
- [x] QUERY-003: Native 查询双路径（与 M4 合并验收）（完成于 2026-07-07）
- [x] QUERY-004: SQL 方言适配器（完成于 2026-07-04）
- [x] VIZ-003: 图表类型插件注册（完成于 2026-07-04）
- [x] VIZ-004: 图表样式子类型（完成于 2026-07-04）
- [x] VIZ-005: 维度指标筛选配置 UI（完成于 2026-07-07）
- [x] VIZ-006: iframe 嵌入门户（完成于 2026-07-04）
- [x] VIZ-007: SDK 嵌入门户（完成于 2026-07-07）
- [x] VIZ-008: ECharts/AntV 渲染适配层（完成于 2026-07-04）
- [x] CAT-004: CAT-04 时间序列分析类（完成于 2026-07-07）
- [x] CAT-005: CAT-05 工单与业务受理类（完成于 2026-07-07）
- [x] CAT-006: CAT-06 生产与销售统计类（完成于 2026-07-07）

---

## M12 — 报表调度与用户视图（三期）

**SRS**：FR-3.2、FR-6.4、FR-VIEW-4、IF-03 · **验收**：§9.1 三期调度与视图

- [x] RPT-005: 报表调度 FR-3.2（完成于 2026-07-07）
- [x] RPT-007: 批量新增报表 FR-6.4（完成于 2026-07-07）
- [x] VIEW-003: 用户视图覆盖 FR-VIEW-4（与 M-FE-3 合并验收）（完成于 2026-07-07）
- [x] API-005: IF-03 报表文档 API（完成于 2026-07-04）
- [x] API-006: IF-04 门户嵌入 API（完成于 2026-07-04）
- [x] NFR-006: NFR-05 浏览器与消息推送（完成于 2026-07-07）
- [x] CAT-007: CAT-07 组织行为审计类（完成于 2026-07-07）

---

## M-FINAL — 四期收官 + 连接器补缺【已冻结】

> **人工干预（2026-07-07）**：`create-evolution-plan` 最后一期收官确认；合并原 **M-FE-4/5**、**M13**、**F-G（CONN-023~027）** 为单一活跃节 **§M-FINAL**。  
> **目标**：**129** 项 PRD 全勾「已实现」；达成 `goal.md` §5 四期末治理验收、G3 Dataset 路径、G4 RBAC FE、G5 治理闭环。  
> **分片状态**：F-C~F-F 多为 **部分实现（L1/companion）**；勾选须 PRD 验收全勾 + 浏览器/集成 smoke。  
> **SRS**：§8.4 四期 Workstream、FR-1.2~1.6、FR-2.2、NFR-04/06/08 · **验收**：§8.4 端到端 + §9.1 四期 + F-G compose smoke

### F-A — 壳层 IA 与里程碑导航（原 M-FE-4）

> **现状**：`admin-nav.tsx` / `analyst-nav.tsx` / `user-nav.tsx` 平行维护；`resolve-nav.ts` 硬编码三档；**先于** F-B 与 F-D 语义层 FE。

- [x] BOOT-002: `fe/src/config/nav-manifest.ts` + `resolveNavGroups` 派生侧栏（废弃三份平行 nav 拷贝；「报表」父菜单 `subItems`：预制报表 / 模板 / 调度；路由守卫与 manifest 可见性矩阵一致）（完成于 2026-07-07）
- [x] DS-007: 连接器收拢为「数据」分组子项（保留 `/admin/connectors` 路由与 `ConnectorsPage` 只读目录；方案 A：`subItems`「连接管理」「连接器类型」）（完成于 2026-07-07）
- [x] BOOT-002: `layout.md` §6 里程碑可见性（viewer/analyst 过滤未到期项；admin 对四期未交付项标「预览」；禁止死链；同步 `docs/ui/layout.md` §3 分组表）（完成于 2026-07-07）

**验收信号**：`resolve-nav.test.ts` · `AdminLayout.smoke.test.tsx` · `routes.smoke.test.tsx` 覆盖三档角色；admin 报表为父菜单 + 子项。

### F-B — RBAC 授权与能力导航（原 M-FE-5）

> **依赖**：F-A `nav-manifest` 完成后再做能力过滤（避免双轨 nav）。

- [x] AUTH-004: 资源授权 Admin UI（`/admin/system/grants`；对接 `GET/POST /api/v1/resource-grants`；按角色×资源类型 datasource/dashboard/report 绑定）（完成于 2026-07-07）
- [x] BOOT-002: 侧栏能力驱动过滤（manifest 项绑定 capability；替代 `canManagePlatform` / `canEditDashboards` 硬编码三档 nav；自定义 role code 在能力满足时可见对应分组）（完成于 2026-07-07）

**验收信号**：dev-switch 切换演示用户后，侧栏由能力点驱动；未授权资源列表与侧栏不可见。

### F-C — 信创连接器 companion 收官（原 M13-A）

> **背景**：后端 L1 已注册（`dialects/dm.py` 等）；PRD 分片未勾「UI 可选」「只读查询集成测」。

- [x] CONN-017: 达梦 DM 连接器（完成于 2026-07-07）
- [x] CONN-018: 人大金仓 连接器（完成于 2026-07-07）
- [x] CONN-019: 南大通用 GBase 连接器（完成于 2026-07-07）
- [x] CONN-020: OceanBase 连接器（完成于 2026-07-07）
- [x] CONN-021: TiDB 连接器（完成于 2026-07-07）
- [x] CONN-022: GaussDB 连接器（完成于 2026-07-07）

### F-D — 语义层与 Dataset 路径（原 M13-B）

- [x] QUERY-007: 配置元模型存储（完成于 2026-07-07）
- [x] QUERY-008: 配置→SQL/API 翻译器（完成于 2026-07-07）
- [x] QUERY-009: Dataset 查询路径（完成于 2026-07-07）
- [x] META-001: 术语字典（完成于 2026-07-07）
- [x] META-002: 业务主题树（完成于 2026-07-07）
- [x] META-003: 维度字典注册（完成于 2026-07-07）
- [x] META-004: Dataset CRUD M1-DATASET（完成于 2026-07-07）

### F-E — 设计器与治理闭环（原 M13-C）

- [x] DESIGN-001: 拖拽查询条件配置（完成于 2026-07-07）
- [x] DESIGN-002: 运算规则维护（完成于 2026-07-07）
- [x] DESIGN-003: 输出字段与聚合配置（完成于 2026-07-07）
- [x] DESIGN-004: 设计器与工单关联（完成于 2026-07-07）
- [x] DESIGN-005: 传统 SQL 模式（完成于 2026-07-07）
- [x] GOV-003: 工单流程模板 FR-1.2（完成于 2026-07-07）
- [x] GOV-004: 可视化查询设计 FR-1.3（完成于 2026-07-07）
- [x] GOV-005: 查询服务发布 FR-1.4（完成于 2026-07-07）
- [x] GOV-006: 发布引擎 OpenAPI 映射（完成于 2026-07-07）
- [x] GOV-007: 总线全自动注册 FR-1.1（完成于 2026-07-07）
- [x] GOV-008: 治理权限联动 FR-1.6（完成于 2026-07-07）

### F-F — 四期 NFR（原 M13-D）

- [x] API-003: IF-02 查询服务 API（完成于 2026-07-04）
- [x] API-004: IF-01 总线注册适配（完成于 2026-07-04）
- [x] NFR-003: NFR-02 核心看板可用性（完成于 2026-07-07）
- [x] NFR-005: NFR-04 连接器插件扩展性（完成于 2026-07-07）
- [x] NFR-007: NFR-06 信创国产化（完成于 2026-07-07）
- [x] NFR-008: NFR-08 自主可控零 DE/SS（完成于 2026-07-07）

### F-G — DataEase 缺口连接器（CONN-023~027）

> **PRD**：`F04-CONN.md` · hub **v1.2.97** · 状态 **未实现** · `goal.md` §4 In Scope 已纳入。  
> **顺序**：API → Excel/CSV → Db2 → Impala → Redshift。

| 缺口类型 | 对标 DataEase | PRD ID | 优先级 |
|----------|---------------|--------|--------|
| API | API 数据源 | CONN-023 | P1 |
| 文件 | 本地 Excel/CSV、远程文件 | CONN-024 | P1 |
| OLTP | Db2 | CONN-025 | P2 |
| OLAP | Apache Impala | CONN-026 | P3 |
| 数据湖 | AWS Redshift | CONN-027 | P3 |

- [x] CONN-023: REST API 数据源连接器（完成于 2026-07-07）
- [x] CONN-024: Excel/CSV 文件源连接器（完成于 2026-07-07）
- [x] CONN-025: IBM Db2 连接器（完成于 2026-07-07）
- [x] CONN-026: Apache Impala 连接器（完成于 2026-07-07）
- [x] CONN-027: AWS Redshift 连接器（完成于 2026-07-07）

### M-FINAL 收官信号

| 验收 | 映射 |
|------|------|
| P4-SMOKE | F-D~F-E · Dataset 建表 → 设计器 → 工单审批 → 发布 → 总线注册 |
| 四期 NFR | F-F · 可用性/插件扩展/信创/零 DE·SS 部署报告 |
| 连接器补缺 | F-G · `GET /datasources/types` 含 5 新类型 + compose smoke |
| 全量回归 | M-FINAL 收官后 · P1~P3 smoke 不重跑绑定模型变更 |

> **前三期总验收**（不新增 PRD ID）：见文首「前三期完成信号」表。  
> **明确不含**：DataEase SQLBot / AI 问数（见文首「对标校准」）。

---

## M-DASH-UX — Dashboard 编辑体验对标【当前节】

> **人工干预（2026-07-09）**：方案 A + **代码对齐修订（v2.8.0）**。  
> **代码事实**：`ChartRenderer` / `useChartExecute` / `ChartConfigPanel` / `GlobalFilterBar` **已存在**；编辑页用 `WidgetEditPreview` **挡住真出图**，检视器未接 `ChartConfigPanel`，筛选条仅 `mode=view`。  
> **策略**：**接线优先于造能力**；子批拆 **必做 / 可选**；稳定性已落地先勾选。  
> **映射**：仅既有 PRD ID；**不含** SQLBot/AI、文本/Tab/查询控件（未立项）。  
> **完成定义**：`[x]` = 浏览器编辑页可感知 + 分片可回写；可选行不阻塞收官。

| 子批 | 主题 | 必做待办 | 可选 | 状态 |
|------|------|----------|------|------|
| **F-A** | 编辑态接线真出图 | 5 | 0 | **当前 · 首轮** |
| **F-B** | 检视器数据/样式 | 2 | 0 | 依赖 F-A |
| **F-C** | 撤销 + 稳定性 | 1 | 1 | 稳定性已勾 |
| **F-D** | 编辑页筛选/联动 | 1 | 1 | 依赖 F-A |

**推荐执行顺序**：

```
F-A  DashboardWidget 编辑分支 → ChartRenderer + useChartExecute（SQL + Dataset）
  → F-B  WidgetInspector 嵌入 ChartConfigPanel（数据/样式 Tab）
  → F-C  撤销/重做（必做）；对齐/多选=可选
  → F-D  GlobalFilterBar 进编辑页（必做）；组件联动=可选
```

**G2 选题约束**：每轮取 **3–5 项必做 `[ ]`**；**首轮 F-A 全量**。可选行默认跳过。

### F-A — 编辑态接线真出图【必做 · 首轮】

> **对标**：DataEase 拖入/配完即可看图。  
> **实现要点**：改 `DashboardWidget` 编辑分支；配置就绪时渲染 `ChartRenderer`；未就绪保留待配置态；复用 `useChartExecute`（勿新建执行器）。

- [x] VIZ-002: 编辑态 widget **真出图**（去掉「仅预览才出图」路径；`mode=edit` 可渲染 ChartRenderer）（完成于 2026-07-09）
- [x] QUERY-005: 编辑态 **SQL/table 直连**执行出图（`useChartExecute` mode≠dataset）（完成于 2026-07-09）
- [x] QUERY-009: 编辑态 **Dataset** 执行路径稳定（失败/空态可读，不阻断画布）（完成于 2026-07-09）
- [x] META-004: 检视器绑定 Dataset/boundConfigId（或改 SQL）后 **即时刷新**画布（完成于 2026-07-09）
- [x] VIZ-008: 编辑态复用 ChartPanel **loading/错误/空数据**覆盖层（无白屏）（完成于 2026-07-09）

**验收信号**：编辑页对已配 SQL **或** Dataset 的表格/折线/柱至少一类可见真实数据；改配置后无需进预览即可刷新；未配置仍显示清晰待配置态。

**代码锚点（现状）**：`DashboardWidget.tsx`（`WidgetEditPreview`）· `useChartExecute.ts` · `ChartRenderer.tsx` · `WidgetInspector.tsx` · `ChartPanel.tsx`

### F-B — 右侧数据 / 样式双轨【必做】

> **对标**：DE 数据/样式分 Tab。  
> **实现要点**：`WidgetInspector` **嵌入已有** `ChartConfigPanel`（维度/指标/筛选/styleVariant）；勿重写协议。

- [x] VIZ-005: 检视器「数据」Tab（维度/指标/筛选；对接 ChartConfigPanel）（完成于 2026-07-09）
- [x] VIZ-004: 检视器「样式」Tab（styleVariant 生效；先覆盖 bar/line/pie 主变体即可）（完成于 2026-07-09）

**验收信号**：选中组件可切换数据/样式；改 styleVariant 后编辑态可见差异。

**代码锚点（现状）**：`ChartConfigPanel.tsx`（已实现、未接入）· `WidgetInspector.tsx`（仅 Dataset/SQL）

### F-C — 撤销与稳定性

> **对标**：DE 可纠错；僵尸页/闪烁已修（CASE-2026-07-09-001）。

**必做**

- [x] DASH-002: 编辑态稳定性（僵尸 404 空态、删除后离开、关 RGL isDroppable 防闪烁；vitest T-DASH-DELETE-01/02）（完成于 2026-07-09）
- [x] DASH-002: 布局级撤销 / 重做（拖拽缩放与增删组件）（完成于 2026-07-09）

**可选（不阻塞收官 · G2 默认跳过）**

- [x] DASH-002: 多选或对齐辅助（吸附线 / 对齐）〔可选〕（完成于 2026-07-09）

**验收信号（收官）**：误操作可撤销；稳定性回归保持绿。

### F-D — 筛选与联动进编辑器

> **对标**：DE 编辑态可测筛选；联动为增强。  
> **实现要点**：复用 view 模式 `GlobalFilterBar` + `buildWidgetFilterParams`；编辑页去掉 `mode!==view` 早退。

**必做**

- [x] DASH-004: 编辑页挂载全局筛选条并可驱动 widget 刷新（完成于 2026-07-09）

**可选（不阻塞收官 · G2 默认跳过）**

- [x] DASH-004: 组件联动规则最小配置入口（点选→过滤）〔可选〕（完成于 2026-07-09）

**验收信号（收官）**：编辑页改全局筛选后图表刷新。

### M-DASH-UX 收官信号（G1 最小可交付）

| 验收 | 映射 | 阻塞？ |
|------|------|--------|
| 编辑态所见即所得（SQL+Dataset） | F-A 全勾 | **是** |
| 检视器数据+样式 | F-B 全勾 | **是** |
| 可撤销 + 稳定性 | F-C 必做 | **是** |
| 编辑页全局筛选 | F-D 必做 | **是** |
| 对齐/多选、组件联动 | F-C/F-D 可选 | 否 |
| 恢复排队节 | M-PRODUCT F-D 书面 E2E 已完成 | — |

> **明确不含**：SQLBot/AI；文本/图片/Tab/查询控件；F-F 大包 companion（见下节）。

---

## M-PRODUCT — 成品对标与体验收官【排队】

> **人工干预（2026-07-08）**：成品感 / DE 数据源分类 / IA / companion 清扫。  
> **状态（2026-07-09）**：**queued** — F-A~E 已勾（F-D 见 [`plans/2026-07-09-graduation-e2e-pass.md`](./plans/2026-07-09-graduation-e2e-pass.md)）；**F-F = 非默认 gate（G2 禁止选题）**。  
> **完成定义**：`[x]` = 浏览器可走通 + 分片可勾；F-F 仅合同点名才做。

| 子批 | 主题 | 待完成 | 状态 | G2 |
|------|------|--------|------|-----|
| F-A ~ F-C | 壳层 / 数据源分类 / IA | 0 | 已完成 | — |
| **F-D** | Goal 验收 E2E | 0 | **已完成**（书面记录） | — |
| **F-E** | 文档与契约对账 | 0 | 已完成（2026-07-09） | — |
| **F-F** | Companion 深度 | 18 | **非默认 gate** | **禁止** |

**恢复为当前节后顺序**：M-DASH-UX 收官后可选 M-PRODUCT F-F（仅人工点名）。

**G2 选题约束（排队期）**：**禁止**选题；M-DASH-UX 收官前不得从 F-F 取题。

### F-A — 壳层与主路径 FE

> **背景**：`product-polish-checklist` P0/P1；2026-07-08 已交付大部分，本节对账勾选。

- [x] BOOT-002: 登录默认工作台 + M13 去预览 + 「我的」导航（完成于 2026-07-08）
- [x] BOOT-002: 「数据」分组收拢语义建模（元数据/Dataset subItems）（完成于 2026-07-08）
- [x] QUERY-009: Dashboard Dataset 执行路径（`WidgetInspector` + `/query/dataset/execute`）（完成于 2026-07-08）
- [x] META-004: Dashboard 绑定 Dataset/boundConfigId 出图 FE（完成于 2026-07-08）
- [x] API-003: 已发布查询服务 Admin 页 `/admin/services`（完成于 2026-07-08）
- [x] GOV-005: 发布流水线 → 查询服务导航串联（完成于 2026-07-08）
- [x] DASH-002: Dashboard `/admin/dashboards/:id/share` 与编辑页分享入口（完成于 2026-07-08）
- [x] API-005: 预制报表页嵌入导出卡片（`ReportExportCard` · IF-03 基础链）（完成于 2026-07-08）
- [x] CONN-023: REST API 建源专用表单项（OAuth/探测路径 companion；当前仅 host 标签）（完成于 2026-07-08）
- [x] CONN-024: Excel/CSV 建源上传与远程文件 companion（当前仅 host 标签）（完成于 2026-07-08）

**验收信号**：`vitest` AdminLayout/resolve-nav/dashboard/charts 绿；手动 MySQL → Dataset → Dashboard 出图。

### F-B — DataEase 数据源分类（DS-007 companion）

> **对标**：DataEase 五类——OLTP / OLAP / 数仓库湖 / 文件 / API；扩展类（时序/搜索/文档）归「更多」。  
> **原则**：引擎 `category` 不改；新增 FE `displayGroup` + 中文 `categoryLabel`。

- [x] DS-007: `displayGroup` 展示 taxonomy（oltp · olap · warehouse · file · api · extension）（完成于 2026-07-08）
- [x] DS-007: `ConnectorsPage` 按类分组 Tab/手风琴 + 类型图标（完成于 2026-07-08）
- [x] DS-007: `DatasourceFormPage` 先选大类卡片再选具体库（对标 DE 新建源向导）（完成于 2026-07-08）

**验收信号**：新建数据源页与连接器目录均中文分组；与 DataEase 走查对照表通过。

### F-C — IA 主路径收敛

> **目标**：单故事线「连库 → Dataset → Dashboard」；治理/探索/设计器降权，不删 API。

- [x] BOOT-002: analyst/viewer 侧栏默认隐藏治理与数据工程分组（能力驱动已有，补默认 IA 文档）（完成于 2026-07-08）
- [x] VIZ-002: 「图表探索」降为高级入口或并入 Dashboard 新建图表向导（二选一，更新 `layout.md`）（完成于 2026-07-08）
- [x] DESIGN-004: 「查询设计器」标注治理专用，侧栏移入治理分组或折叠（完成于 2026-07-08）

**验收信号**：新用户 3 次点击内完成建源→Dataset→出图；侧栏项数 admin ≤ 当前 70%。

### F-D — Goal 成功指标浏览器 E2E

> **映射**：`goal.md` §5 P1/P4/DATA-SMOKE。

- [x] QUERY-009: P4-SMOKE 前半段——Dataset 建模 → Dashboard 组件出图（条件通过；见 [`plans/2026-07-09-graduation-e2e-pass.md`](./plans/2026-07-09-graduation-e2e-pass.md)）（完成于 2026-07-09）
- [x] GOV-005: P4-SMOKE 后半段——设计器(可选) → 工单 → 发布 → 查询服务试跑（条件通过；同上）（完成于 2026-07-09）
- [x] GOV-007: 发布 → 总线注册浏览器验收（含 `/admin/services` 可见）（条件通过；同上）（完成于 2026-07-09）
- [x] DATA-001: DATA-SMOKE——同步任务 → 托管库 → 建源 → SQL/Dataset 出数 E2E（条件通过；同上）（完成于 2026-07-09）

**验收信号**：`goal.md` §5 四行可判定指标有书面 pass 记录 → [`plans/2026-07-09-graduation-e2e-pass.md`](./plans/2026-07-09-graduation-e2e-pass.md)。

### F-E — 文档与契约对账

> **背景**：arch-inspect 2026-07-08 健康分 40（API auth 文档债）；`prd/README` 与 hub 不同步。

- [x] API-007: `docs/api/README.md` auth 声明与 `AuthMiddleware` 公开路径对账（消 P0 `api.auth`）（完成于 2026-07-09）
- [x] DS-007: `layout.md` §3 与 `nav-manifest` 同步（含 F-B 分类文案）（完成于 2026-07-09）
- [x] BOOT-006: `prd/README.md` hub 状态与分片「已实现」对账（129 合同 + companion 表）（完成于 2026-07-08）

**验收信号**：arch-inspect 复检 P0=0 或已登记豁免；hub `last_updated` 与 plan 一致。

### F-F — Companion 深度（按合同裁剪 · 不阻塞演示）

> **说明**：下列 ID 分片状态「已实现」但验收标准含 `[ ]` companion；全勾对标 DE/SS 全量，按需选题。

**语义层（F11-META）**

- [x] META-001: 术语字典与物理字段映射 companion（完成于 2026-07-09）
- [x] META-002: 业务主题树深层级拖拽导航 companion（完成于 2026-07-09）
- [x] META-003: 维度字典 M4/M5/M6 统一引用 companion（完成于 2026-07-09）
- [x] META-004: Dataset 对标 DE/SS 全量 + 计算字段引擎 companion（完成于 2026-07-09）
- [x] META-005: 实体总览 GOV catalog lineage companion（完成于 2026-07-09）
- [x] META-006: 实体 schema GOV 引用释放 companion（完成于 2026-07-09）

**报表（F08-RPT）**

- [x] RPT-001: PDF/Word 真实渲染 companion（完成于 2026-07-09）
- [x] RPT-002: 预制报表 Admin binding 编辑表单 companion（完成于 2026-07-09）
- [x] RPT-003: 模板 WYSIWYG 排版引擎 companion（完成于 2026-07-09）
- [x] RPT-005: 调度真实 SMTP/对象存储投递 companion（完成于 2026-07-09）
- [x] RPT-007: 批量报表异步导出链 companion（完成于 2026-07-09）

**目录/实体（F14-CAT · F07-DASH）**

- [ ] CAT-002: IF-02 真实聚合查询链（非 probe）
- [ ] CAT-003: 地域维度 RLS 联动 companion
- [ ] DASH-005: 实体总览跨组件口径一致 companion
- [ ] DASH-006: 主题分析 GIS 下钻 companion

**视图与非功能（F09-VIEW · F15-NFR）**

- [ ] VIEW-001: 全 BI 页面 DashboardView 统一 companion
- [ ] VIEW-003: 新用户 onboarding 视图继承链 companion
- [ ] NFR-003: Dashboard 并发压测真实 perf suite companion
- [ ] NFR-005: 报表并发压测 companion

### M-PRODUCT 收官信号

| 验收 | 映射 |
|------|------|
| DE 数据源分类 | F-B · 五类分组选型 + 中文标签 |
| 单主路径 IA | F-C · 连库→Dataset→Dashboard ≤3 步导航 |
| P4-SMOKE | F-D · 浏览器 E2E 书面 pass |
| 成品感 demo | F-A 全勾 + F-B 全勾 |
| 全量对标 DE/SS | F-F 按合同裁剪（非默认 gate） |

> **明确不含**：DataEase SQLBot / AI 问数；Superset Semantic Layer 插件体系（见 M-FINAL「对标校准」）。
