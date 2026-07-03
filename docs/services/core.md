# core — 应用内核

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/core/` |
| PRD | [F01-BOOT](../automate/prd/F01-BOOT.md) · BOOT-001 ~ BOOT-006 |
| 里程碑 | M1 |
| 状态 | **骨架** |

## 职责

- 应用配置（`Settings`、环境变量校验）
- FastAPI 应用工厂、`lifespan`、全局异常处理
- 请求 ID、结构化日志、健康检查
- 安全中间件基座（CORS 来源 `Settings.cors_origins` / `CORS_ORIGINS`；鉴权委托 `auth/`）
- 数据库会话 / 依赖注入入口（`get_db`）

## 边界

| In | Out |
|----|-----|
| 配置、日志、中间件、健康端点 | 业务 RBAC（→ `auth`） |
| OpenAPI 元信息与路由挂载 | 领域查询与连接器（→ `query` / `datasources`） |

## 依赖

- 无业务域上游；被所有域服务依赖

## 主要类型 / 入口（M1 已实现）

| 符号 | 说明 | 锚点 |
|------|------|------|
| `app.main:app` | ASGI 入口；中间件与路由挂载 | `backend/app/main.py` |
| `Settings` / `get_settings` | pydantic-settings；含 `cors_origins` 计算字段 | `backend/app/core/config.py` |
| `configure_logging` | JSON 结构化日志 | `backend/app/core/logging.py` |
| `TraceIdMiddleware` | 请求 trace；响应头 `X-Trace-Id` | `backend/app/core/middleware.py` |
| `CORSMiddleware` | 由 `main.py` 挂载；来源 `Settings.cors_origins` | `backend/app/main.py` |
| `GET /health` | 存活探针 | `backend/app/main.py` |

## 关联 API

见 [api/README.md](../api/README.md) §系统。

## 实现笔记

- 中间件注册顺序（`main.py`）：CORS → TraceId → Auth（后注册者先执行）
- 鉴权逻辑委托 `auth/`；`AuthMiddleware` 由 `main.py` 注册，不在 `core/` 内实现
