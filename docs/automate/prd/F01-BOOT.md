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
- **演化建议**：BOOT-006 补 `tests/test_health.py` 与 CI；M1 文档回写 checklist 待下轮

### [BOOT-002] React 管理端壳层

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：P0
- **描述**：React 管理端壳层（SRS 追溯项）。
- **验收标准**：
  - [ ] `fe/` 可构建且 `/admin` 路由壳层可访问
  - [ ] shadcn/ui + Tailwind v4 主题加载
- **代码锚点**：`fe/src/`
- **演化建议**：按 plan.md 期次优先级落地

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
- **演化建议**：二期替换 `Bearer dev` 为正式 JWT；补集成测试覆盖 401/200 分支

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
- **演化建议**：BOOT-006 补 Settings 加载与 traceId 日志断言测试

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
- **演化建议**：CI 环境补 docker postgres job（BOOT-006）；M1B 增 ingestion 元表 revision

### [BOOT-006] CI 与质量门禁

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：P0
- **描述**：CI 与质量门禁（SRS 追溯项）。
- **验收标准**：
  - [ ] lint + 单元测试 CI 通过
  - [ ] 前后端可本地联调
- **代码锚点**：`.github/`
- **演化建议**：按 plan.md 期次优先级落地
