# F01-BOOT 工程基线

> 模块：P0 · 8 维评分见 [`../prd.md`](../prd.md)

### [BOOT-001] FastAPI 工程骨架

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：P0
- **描述**：FastAPI 工程骨架（SRS 追溯项）。
- **验收标准**：
  - [ ] `backend/app` 可启动且 `/health` 返回 200
  - [ ] OpenAPI 文档可访问
- **代码锚点**：`backend/app/`
- **演化建议**：按 plan.md 期次优先级落地
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

- **状态**：未实现
- **goal_ref**：goal.md §2.4（G4）
- **期次**：P0
- **描述**：鉴权中间件骨架（SRS 追溯项）。
- **验收标准**：
  - [ ] 未认证访问受保护路由返回 401
  - [ ] 公开路径（`/health`、`/docs`、`/redoc`、`/openapi.json`）无需认证仍可访问
  - [ ] 认证上下文可注入 handler
- **代码锚点**：`backend/app/auth/`（中间件注册于 `backend/app/core/`）
- **演化建议**：按 plan.md 期次优先级落地
### [BOOT-004] 配置与日志基线

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：P0
- **描述**：配置与日志基线（SRS 追溯项）。
- **验收标准**：
  - [ ] 环境变量配置可加载
  - [ ] 结构化日志输出请求 traceId
- **代码锚点**：`backend/app/core/`
- **演化建议**：按 plan.md 期次优先级落地
### [BOOT-005] 数据库迁移框架

- **状态**：未实现
- **goal_ref**：goal.md §2.1（G1）
- **期次**：P0
- **描述**：数据库迁移框架（SRS 追溯项）。
- **验收标准**：
  - [ ] Alembic 或等价迁移可执行（`alembic upgrade head`）
  - [ ] 平台元数据库可连接（`docker-compose.yml` 本地 PostgreSQL）
- **代码锚点**：`backend/migrations/` · `docker-compose.yml`
- **演化建议**：按 plan.md 期次优先级落地
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
