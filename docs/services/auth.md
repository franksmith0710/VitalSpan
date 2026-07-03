# auth — 认证与权限

| 字段 | 值 |
|------|-----|
| 模块路径 | `backend/app/auth/` |
| PRD | [F02-AUTH](../automate/prd/F02-AUTH.md) · AUTH-001 ~ AUTH-008 |
| 里程碑 | M7 |
| 状态 | **未实现** |

## 职责

- 用户认证（会话 / Token，与部署模式对齐）
- RBAC：角色、权限点、资源绑定
- 组织维度、多维行级权限（RLS）策略
- 操作审计日志

## 边界

| In | Out |
|----|-----|
| 身份、授权、RLS 策略定义 | 查询执行细节（→ `query` 消费策略） |
| 租户/组织模型 | 业务视图模板内容（→ `views`） |

## 依赖

- `core`

## 被依赖

- `datasources`、`query`、`dashboard`、`reports`、`governance`、`views`

## 主要类型 / 入口（规划）

| 符号 | 说明 | PRD | 状态 |
|------|------|-----|------|
| `AuthMiddleware` / `get_current_user` | 请求鉴权 | AUTH-001 | 待建 |
| `PermissionService` | RBAC 校验 | AUTH-002~004 | 待建 |
| `RlsPolicyService` | 行级策略 | AUTH-005~006 | 待建 |
| `AuditService` | 审计写入 | AUTH-007~008 | 待建 |

## 关联 API

见 [api/README.md](../api/README.md) §认证 · §权限。

## 实现笔记

<!-- 随 AUTH-* 落地补充 -->
