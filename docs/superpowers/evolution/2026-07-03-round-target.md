# 演化轮次选题 — 2026-07-03

## 本轮演化目标（共 4 项）

### 选题决策

- **批量主题**：M1 P0 工程基线 — 后端启动链（配置/日志 → API 骨架 → 迁移 → 鉴权）
- **来源**：`docs/automate/plan.md` §M1 当前节未完成勾选清单 + 推荐执行顺序；`prd.md` hub 8 维评分作同分 tie-break
- **合并理由**：plan 推荐顺序 `BOOT-004 → BOOT-001 → BOOT-005 → BOOT-003` 构成可联调后端最小闭环（Settings/日志/trace → FastAPI 壳 → 元库迁移 → 鉴权与 `/me`）；四项依赖链完整，可单 PR 批处理
- **范围框定**：
  - **模块**（≤3）：`backend/app/core/`、`backend/app/`（`main.py` + `api/v1/`）、`backend/app/auth/`；`docker-compose.yml` + `backend/migrations/` 计为基础设施交付物，不扩第四业务域
  - **文件**（合计约 19，触及 ≤20 上限）：见各子项
  - **不含**：`fe/` 前端壳层（BOOT-002）、CI 门禁（BOOT-006）、M1 文档回写 checklist
- **不足 5 项原因**：若纳入 BOOT-002（前端 ~10+ 文件）或 BOOT-006（CI + tests ~4 文件）将突破单轮 ≤20 文件上限；BOOT-002、BOOT-006 顺延下轮

### 候选对比

| 候选 prd ID | 加权总分 | 未选原因 |
|-------------|:--------:|----------|
| META-001 | 10.8 | 属 F11-META 远期能力，不在 M1 当前节 plan 勾选范围 |
| DESIGN-001 | 10.8 | 属 F12-DESIGN 治理设计器，里程碑 M10+，与 M1 基线无关 |
| CONN-021 | 10.9 | TiDB 连接器属 M4 数据源域，M1 未激活 |
| QUERY-007 | 10.9 | 查询元模型属 M5+，非当前里程碑 |
| CONN-009 | 11.1 | StarRocks 连接器，同 CONN-021 |
| BOOT-002 | 12.0 | **本轮顺延**：纳入将超 20 文件上限；依赖 BOOT-001 后端可联调后实施 |
| BOOT-006 | 12.8 | **本轮顺延**：依赖本轮及 BOOT-002 交付物；CI 宜在壳层就绪后启用 |

---

### 子项 1：BOOT-004 配置与日志基线

- **选题理由**：plan §M1 推荐执行顺序首位；无 Settings/日志/trace 则后续 BOOT-001 无法按 arch 加载配置与输出结构化日志
- **选题时 PRD 加权总分**：12.8/100（用户价值 53% · 完整度 5% · 可靠性 0% · 架构 11% · 测试 0% · 性能 0% · 安全 11% · 交互 N/A）
- **主攻薄弱维**：完整度、可靠性、测试覆盖（均 ≤40%）
- **用户感知**：后端启动后可读 `.env` 配置；`GET /health` 日志行含 `traceId`，排障可追踪请求
- **类型**：补缺（M1 工程基线未落地）
- **验收标准**（来源 plan §BOOT-004）：
  - `Settings()` 从 `backend/.env` 加载（`pydantic-settings`）
  - `TraceIdMiddleware` 每请求生成/透传 `traceId` 并写入 JSON 日志
  - `backend/.env.example`、`fe/.env.example` 对齐 `arch.md` §7.2
- **范围框定**：
  - `backend/app/core/config.py`
  - `backend/app/core/logging.py`
  - `backend/app/core/middleware.py`
  - `backend/.env.example`
  - `fe/.env.example`

### 子项 2：BOOT-001 FastAPI 工程骨架

- **选题理由**：plan 顺序第 2 项；提供 `/health`、OpenAPI、CORS 与 v1 路由壳，BOOT-003 挂载 `/me` 之前置
- **选题时 PRD 加权总分**：11.6/100（用户价值 50% · 完整度 5% · 可靠性 0% · 架构 8% · 测试 0% · 性能 0% · 安全 8% · 交互 N/A）
- **主攻薄弱维**：完整度、可靠性、测试覆盖
- **用户感知**：`uvicorn` 启动后 `/health` 返回 200；`/docs` 可浏览 API；前端 dev 预检无 CORS 错误
- **类型**：补缺
- **验收标准**（来源 plan §BOOT-001）：
  - `cd backend && uvicorn app.main:app --reload --port 8000` 成功
  - `curl http://localhost:8000/health` → 200
  - OPTIONS 预检含 `Access-Control-Allow-Origin`
  - `pyproject.toml` 含 fastapi、uvicorn、pydantic-settings、sqlalchemy、alembic、psycopg、ruff、pytest、httpx
- **范围框定**：
  - `backend/pyproject.toml`
  - `backend/app/main.py`（挂载 TraceId、CORS、`/health`）
  - `backend/app/api/v1/router.py`
  - `backend/app/api/v1/__init__.py`

### 子项 3：BOOT-005 数据库迁移框架

- **选题理由**：plan 顺序第 3 项；元库 PostgreSQL + Alembic 空 revision 为二期业务表与 M1B ingestion 元表奠基
- **选题时 PRD 加权总分**：13.2/100（用户价值 54% · 完整度 5% · 可靠性 0% · 架构 12% · 测试 0% · 性能 0% · 安全 12% · 交互 N/A）
- **主攻薄弱维**：完整度、可靠性、测试覆盖
- **用户感知**：`docker compose up` 后本地元库可连；`alembic upgrade head` 成功，团队有统一 schema 演进通道
- **类型**：补缺
- **验收标准**（来源 plan §BOOT-005）：
  - `docker compose up -d` 启动 PostgreSQL
  - `cd backend && alembic upgrade head` 成功（初始空 revision）
  - `migrations/env.py` 从 `Settings.DATABASE_URL` 读取连接串
- **范围框定**：
  - `docker-compose.yml`
  - `backend/alembic.ini`
  - `backend/migrations/env.py`
  - `backend/migrations/versions/`（初始空 revision）
  - `backend/migrations/script.py.mako`

### 子项 4：BOOT-003 鉴权中间件骨架

- **选题理由**：plan 顺序第 4 项；在 001 路由壳上挂载鉴权与受保护 `/api/v1/me`，完成 M1 后端「公开/受保护」路径分界
- **选题时 PRD 加权总分**：12.4/100（用户价值 52% · 完整度 5% · 可靠性 0% · 架构 10% · 测试 0% · 性能 0% · 安全 10% · 交互 N/A）
- **主攻薄弱维**：完整度、可靠性、测试覆盖、安全性
- **用户感知**：无 Token 访问 `/api/v1/me` 得 401；`Authorization: Bearer dev` 得 200 占位用户；`/health` 仍无需鉴权
- **类型**：补缺
- **验收标准**（来源 plan §BOOT-003）：
  - `GET /health` → 200（无 Token）
  - `GET /api/v1/me` 无 Token → 401
  - `GET /api/v1/me` + `Bearer dev` → 200 + 用户上下文
  - `PUBLIC_PATHS` 豁免 `/health`、`/docs`、`/redoc`、`/openapi.json`
  - `main.py` 注册 `AuthMiddleware` 并 `include_router(api_v1_router, prefix="/api/v1")`
- **范围框定**：
  - `backend/app/auth/middleware.py`
  - `backend/app/auth/deps.py`
  - `backend/app/api/v1/me.py`
  - `backend/app/api/v1/router.py`（挂载 me）
  - `backend/app/main.py`（注册 AuthMiddleware）
