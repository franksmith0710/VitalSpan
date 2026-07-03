# F01-BOOT 工程基线

> 模块：P0 · 8 维评分见 [`../prd.md`](../prd.md)

### [BOOT-001] FastAPI 工程骨架

- **状态**：已实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：P0
- **里程碑对齐**：M1 · 已完成 · 2026-07-03
- **描述**：FastAPI 工程骨架（SRS 追溯项）。
- **验收标准**：
  - [x] `backend/app` 可启动且 `/health` 返回 200
  - [x] OpenAPI 文档可访问
- **代码锚点**：`backend/app/main.py` · `backend/app/api/v1/` · `backend/pyproject.toml`
- **演化建议**：`tests/test_health.py` 25 项覆盖 docs/openapi CORS 预检非法 Origin（T-HLT-23~24）、公开路径无鉴权（T-HLT-25）；`tests/test_router.py` T-RTR-03~04 空 v1 路由非 500 + 生产路由数 ≥2；二期扩展健康检查维度（DB 连通性）

### [BOOT-002] React 管理端壳层

- **状态**：已实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：P0
- **里程碑对齐**：M1 · 已完成 · 2026-07-03
- **描述**：React 管理端壳层（SRS 追溯项）。
- **验收标准**：
  - [x] `fe/` 可构建且 `/admin` 路由壳层可访问
  - [x] shadcn/ui + Tailwind v4 主题加载
- **代码锚点**：`fe/src/layouts/AdminLayout.tsx` · `fe/src/routes.tsx` · `fe/src/index.css` · `fe/scripts/check-design.mjs` · `fe/src/components/README.md`
- **演化建议**：vitest 44 项 + node:test 4 项覆盖 routes/AdminLayout a11y smoke（T-FE-08~31）含非法 `/admin/*` 壳层守卫（T-FE-28~29）、主题 localStorage 降级（T-FE-30~31）、check-design 混合 fixture（T-FE-DG-04）；二期补 TanStack Query、`@/lib/api.ts` 与业务页

### [BOOT-003] 鉴权中间件骨架

- **状态**：已实现
- **goal_ref**：goal.md §2.4（G4）
- **期次**：P0
- **里程碑对齐**：M1 · 已完成 · 2026-07-03
- **描述**：鉴权中间件骨架（SRS 追溯项）。
- **验收标准**：
  - [x] 未认证访问受保护路由返回 401
  - [x] 公开路径（`/health`、`/docs`、`/redoc`、`/openapi.json`）无需认证仍可访问
  - [x] 认证上下文可注入 handler
- **代码锚点**：`backend/app/auth/middleware.py` · `backend/app/auth/deps.py` · `backend/app/api/v1/me.py`（`main.py` 注册 `AuthMiddleware`）
- **演化建议**：`tests/test_me.py` 18 项覆盖 `/healthz` 非公开（T-ME-15）、Basic scheme（T-ME-16）、占位 token（T-ME-17）、DI 分支（T-ME-18）；`test_auth.py` T-AUTH-09~11 鉴权矩阵；二期替换 `Bearer dev` 为正式 JWT

### [BOOT-004] 配置与日志基线

- **状态**：已实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：P0
- **里程碑对齐**：M1 · 已完成 · 2026-07-03
- **描述**：配置与日志基线（SRS 追溯项）。
- **验收标准**：
  - [x] 环境变量配置可加载
  - [x] 结构化日志输出请求 traceId
- **代码锚点**：`backend/app/core/config.py` · `backend/app/core/logging.py` · `backend/app/core/middleware.py`
- **演化建议**：`tests/test_trace.py` 18 项 + `tests/test_config.py` 13 项覆盖 cors_origins 空串（T-CFG-11）、analytics mysql 拒绝（T-CFG-12）、production+sqlite 组合（T-CFG-13）、连续请求 traceId 隔离（T-TRC-17）、LOG_LEVEL 热切换（T-TRC-18）；二期补 Settings 热加载与异常分支

### [BOOT-005] 数据库迁移框架

- **状态**：已实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：P0
- **里程碑对齐**：M1 · 已完成 · 2026-07-03
- **描述**：数据库迁移框架（SRS 追溯项）。
- **验收标准**：
  - [x] Alembic 或等价迁移可执行（`alembic upgrade head`）
  - [x] 平台元数据库可连接（`docker-compose.yml` 本地 PostgreSQL）
- **代码锚点**：`backend/migrations/` · `docker-compose.yml` · `backend/migrations/env.py`
- **演化建议**：`tests/test_migrations.py` 31 项覆盖 alembic heads 单 head（T-MIG-25）、`upgrade --sql` smoke（T-MIG-29）、revision 链完整性（T-MIG-30）、不可达 host（T-MIG-31）；CI 仍不跑 docker `alembic upgrade`；M1B 增 ingestion 元表 revision

### [BOOT-006] CI 与质量门禁

- **状态**：已实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：P0
- **里程碑对齐**：M1 · 已完成 · 2026-07-03
- **描述**：CI 与质量门禁（SRS 追溯项）。
- **验收标准**：
  - [x] lint + 单元测试 CI 通过
  - [x] 前后端可本地联调
- **代码锚点**：`.github/workflows/ci.yml` · `tests/conftest.py` · `tests/test_health.py`
- **演化建议**：CI 已含 backend 273 pytest + frontend 68 vitest + node:test 4；`tests/test_ci_env_contract.py` 12 项含 collect 下限 ≥258（T-CI-10）、job timeout-minutes（T-CI-11）、pnpm cache-dependency-path（T-CI-12）；`tests/test_ruff_contract.py` 2 项 ruff 子进程契约；二期增 docker postgres job 与 Playwright E2E
