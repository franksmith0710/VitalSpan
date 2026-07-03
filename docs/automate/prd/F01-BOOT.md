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
- **演化建议**：`tests/test_health.py` 22 项覆盖 CORS 多 Origin 矩阵（T-HLT-19）、TRACE 稳定非 500（T-HLT-20）、OpenAPI 路径快照（T-HLT-21）、5× GET P95 smoke <0.5s（T-HLT-22）；二期扩展健康检查维度（DB 连通性）

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
- **演化建议**：vitest 42 项 + node:test 3 项覆盖 routes/AdminLayout a11y smoke（T-FE-08~26）含 desktop tab 焦点序（T-FE-24）、mobile 菜单按钮可达（T-FE-25）、浮层不 trap focus（T-FE-26）；二期补 TanStack Query、`@/lib/api.ts` 与业务页

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
- **演化建议**：`tests/test_me.py` 14 项覆盖并发 5× `/me` 稳定（T-ME-12）、PUBLIC_PATHS 含 `/redoc`（T-ME-13）、malformed Bearer（T-ME-09~11）、OPTIONS 预检（T-ME-14）；`test_auth.py` 公开路径矩阵；二期替换 `Bearer dev` 为正式 JWT

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
- **演化建议**：`tests/test_trace.py` 12 项 + `tests/test_config.py` 7 项覆盖 `VITALSPAN_ENV` 枚举（T-CFG-04）、Fernet 非法（T-CFG-05）、`query_default_limit` 契约（T-CFG-06）、`LOG_LEVEL` WARNING（T-CFG-07）与 `request_finished` traceId 契约（T-TRC-11~12）；二期补 Settings 热加载与异常分支

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
- **演化建议**：`tests/test_migrations.py` 28 项覆盖 alembic heads 单 head（T-MIG-25）、NullPool online（T-MIG-26）、`mysql://` 协议拒绝（T-MIG-27）、OperationalError 传播（T-MIG-28）；`config.py` `validate_database_url`；CI 仍不跑 docker `alembic upgrade`；M1B 增 ingestion 元表 revision

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
- **演化建议**：CI 已含 backend 227 pytest + frontend 60 vitest + node:test 3；`tests/test_conftest_contract.py` 10 项含 lowercase/malformed Bearer（T-CFT-09~10）；`tests/test_ci_env_contract.py` 6 项含 collect ≥225（T-CI-04）与 elapsed smoke（T-CI-06）；`.github/workflows/ci.yml` 显式 env；二期增 docker postgres job 与 Playwright E2E
