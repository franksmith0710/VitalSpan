# auth — 认证与权限

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/auth/` |
| PRD | [F02-AUTH](../automate/prd/F02-AUTH.md) · AUTH-001 ~ AUTH-008；M1 骨架 [BOOT-003](../automate/prd/F01-BOOT.md) |
| 里程碑 | M7（完整 RBAC）；M1 横切鉴权骨架 |
| 状态 | **已实现** |

## 职责

- 用户认证（会话 / Token，与部署模式对齐）
- RBAC：角色、权限点、资源绑定
- 资源可见性：`ensure_resource_visible`、`list_visible_resource_ids`、`require_resource_visible` deps
- 用户-组织：`auth_users.org_node_id` FK；`assign_user_org` / `clear_user_org`
- 组织维度、多维行级权限（RLS）策略
- 绑定操作审计 L1：`auth_audit_events` + `audit/service.py`（AUTH-003；非 AUTH-008 全平台）

## 边界

| In | Out |
|----|-----|
| 身份、授权、RLS 策略定义 | 查询执行细节（→ `query` 消费策略） |
| 租户/组织模型、用户组织归属 | 业务视图模板内容（→ `views`） |
| L1 资源可见性守卫（域 + deps） | AUTH-006 维度分组实现、AUTH-007 RLS 谓词注入、AUTH-008 全平台审计（登录/数据源等） |

## 依赖

- `core`

## 被依赖

- `datasources`、`query`、`dashboard`、`reports`、`governance`、`views`

## 主要类型 / 入口（M1 骨架）

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `AuthMiddleware` | ASGI 中间件；`main.py` 注册 | BOOT-003 | M1 骨架 |
| `PUBLIC_PATHS` | `/health`、`/docs`、`/redoc`、`/openapi.json` 豁免 | BOOT-003 | M1 骨架 |
| `get_current_user` | `auth/deps.py`；handler 依赖注入 | BOOT-003 | M1 骨架 |
| `GET /api/v1/me` | `api/v1/me.py`；`get_current_user` 注入 `UserContext` | BOOT-003 | M1 骨架 |
| `UserContext` | 占位用户上下文 | BOOT-003 | M1 骨架 |
| `Bearer dev` | 仅 `VITALSPAN_ENV=development` 接受 | BOOT-003 | M1 占位 |
| `audit/service.py` | 审计写入与分页查询 L1 | AUTH-003 | 已实现 |
| `GET /api/v1/audit/events` | 审计列表 API | AUTH-003 | 已实现 |
| `PermissionService` | RBAC 校验 | AUTH-002~004 | 待建 |
| `RlsPolicyService` | 行级策略 | AUTH-005~006 | 待建 |
| `AuditService` | 审计写入 | AUTH-007~008 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §认证 · §权限。

## 实现笔记

- `AuthMiddleware` 在 `backend/app/main.py` 通过 `app.add_middleware(AuthMiddleware)` 注册
- `OPTIONS` 预检直接放行，避免 CORS 被 401 拦截
- 完整 RBAC/RLS/审计属 M7，本期不展开
