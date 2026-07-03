# core — 应用内核

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/core/` |
| PRD | [F01-BOOT](../automate/prd/F01-BOOT.md) · BOOT-001 ~ BOOT-006 |
| 里程碑 | M1 |
| 状态 | **未实现** |

## 职责

- 应用配置（`Settings`、环境变量校验）
- FastAPI 应用工厂、`lifespan`、全局异常处理
- 请求 ID、结构化日志、健康检查
- 安全中间件基座（CORS、TrustedHost；鉴权委托 `auth`）
- 数据库会话 / 依赖注入入口（`get_db`）

## 边界

| In | Out |
|----|-----|
| 配置、日志、中间件、健康端点 | 业务 RBAC（→ `auth`） |
| OpenAPI 元信息与路由挂载 | 领域查询与连接器（→ `query` / `datasources`） |

## 依赖

- 无业务域上游；被所有域服务依赖

## 主要类型 / 入口（规划）

| 符号 | 说明 | 状态 |
|------|------|------|
| `app.main:app` | ASGI 入口 | 待建 |
| `core.config.Settings` | pydantic-settings | 待建 |
| `core.logging` | 结构化日志 | 待建 |
| `GET /health` | 存活探针 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §系统。

## 实现笔记

<!-- 随 BOOT-001~006 落地补充 -->
