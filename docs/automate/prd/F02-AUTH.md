# F02-AUTH 权限子系统

> 模块：M7 · 8 维评分见 [`../prd.md`](../prd.md)

### [AUTH-001] RoleRegistry 角色注册

- **状态**：已实现（r19 quality push）
- **goal_ref**：goal.md §2.4（G4）
- **期次**：一期
- **描述**：RoleRegistry 角色注册（SRS 追溯项）。
- **验收标准**：
  - [x] 管理员可 CRUD 角色 code/显示名/描述
  - [x] 平台不预置业务角色
- **代码锚点**：`backend/app/auth/roles/service.py` · `backend/app/api/v1/roles.py` · `tests/test_auth_rbac_l1.py` T-AUTH-R01~R09
- **演化建议**：生产管理员鉴权守卫；与 AUTH-008 全平台审计联动
- **里程碑对齐**：

### [AUTH-002] 组织树配置

- **状态**：已实现（r19 quality push）
- **goal_ref**：goal.md §2.4（G4）
- **期次**：一期
- **描述**：组织树配置（SRS 追溯项）。
- **验收标准**：
  - [x] 可配置组织树节点
  - [x] 用户可绑定组织
- **代码锚点**：`backend/app/auth/org/service.py` · `backend/app/api/v1/orgs.py` · `backend/app/api/v1/users.py` · `tests/test_auth_rbac_l1.py` T-AUTH-O01~O11 · T-AUTH-OU01~OU04
- **演化建议**：Admin UI 组织树；生产 IAM 集成
- **里程碑对齐**：

### [AUTH-003] 用户角色绑定

- **状态**：已实现（r19 quality push）
- **goal_ref**：goal.md §2.4（G4）
- **期次**：一期
- **描述**：用户角色绑定（SRS 追溯项）。
- **验收标准**：
  - [x] 用户与角色多对多绑定
  - [x] 变更有审计记录
- **代码锚点**：`backend/app/auth/users/service.py` · `backend/app/auth/audit/service.py` · `backend/app/api/v1/users.py` · `backend/app/api/v1/audit.py` · `tests/test_auth_rbac_l1.py` T-AUTH-U01~U10 · T-AUTH-A01~A09
- **演化建议**：AUTH-008 全平台敏感操作审计；生产登录与用户生命周期
- **里程碑对齐**：

### [AUTH-004] 资源授权绑定

- **状态**：已实现（r19 quality push）
- **goal_ref**：goal.md §2.4（G4）
- **期次**：一期
- **描述**：资源授权绑定（SRS 追溯项）。
- **验收标准**：
  - [x] 角色可绑定数据源/Dashboard/报表资源
  - [x] 未授权资源不可见
- **代码锚点**：`backend/app/auth/resources/service.py` · `backend/app/auth/deps.py` · `backend/app/api/v1/resource_grants.py` · `tests/test_auth_rbac_l1.py` T-AUTH-G01~G12
- **演化建议**：M3 数据源 API 接入 `require_resource_visible`；列表端点过滤未授权资源
- **里程碑对齐**：

### [AUTH-005] 权限维度类型定义

- **状态**：已实现（r19 quality push）
- **goal_ref**：goal.md §2.4（G4）
- **期次**：一期
- **描述**：权限维度类型定义（SRS 追溯项）。
- **验收标准**：
  - [x] 可定义物理对象/地域/时间/自定义维度
  - [x] 维度类型可扩展注册
- **代码锚点**：`backend/app/auth/rls/dimensions/service.py` · `backend/app/api/v1/rls.py` · `tests/test_auth_rbac_l1.py` T-AUTH-D01~D08 · 维度分页 smoke
- **演化建议**：AUTH-006 维度分组；AUTH-007 RLS 谓词消费维度元数据
- **里程碑对齐**：

### [AUTH-006] 权限维度分组与角色关联

- **状态**：L1 已实现（r20 kickoff）
- **goal_ref**：goal.md §2.4（G4）
- **期次**：一期
- **描述**：权限维度分组与角色关联（SRS 追溯项）。
- **验收标准**：
  - [x] 维度分组可关联角色
  - [x] 用户继承角色权限（有效维度集 = 直绑 ∪ 分组展开）
- **代码锚点**：`backend/app/auth/rls/groups/service.py` · `backend/app/auth/rls/bindings/service.py` · `backend/app/api/v1/rls.py` · `backend/app/api/v1/roles.py` · `tests/test_auth_rbac_l1.py` T-AUTH-GP01~GP12
- **演化建议**：Admin UI 维度分组配置；生产维度值校验扩展
- **里程碑对齐**：

### [AUTH-007] RLS 谓词生成与注入

- **状态**：L1 已实现（r20 kickoff）
- **goal_ref**：goal.md §2.4（G4）
- **期次**：一期
- **描述**：RLS 谓词生成与注入（SRS 追溯项）。
- **验收标准**：
  - [x] 查询执行前合并 WHERE 谓词（`get_query_rls_fragment` hook）
  - [x] 越权 smoke test 通过
- **代码锚点**：`backend/app/auth/rls/predicate.py` · `backend/app/auth/rls/hooks.py` · `tests/test_auth_rbac_l1.py` T-AUTH-RLS01~RLS08
- **演化建议**：M4 `query` 域对接 hook；全方言 SQL 改写
- **里程碑对齐**：

### [AUTH-008] 操作审计日志

- **状态**：L1 已实现（r20 kickoff）
- **goal_ref**：goal.md §2.4（G4）
- **期次**：一期
- **描述**：操作审计日志（SRS 追溯项）。
- **验收标准**：
  - [x] 权限变更写入审计日志（auth 域写路径挂钩）
  - [x] 敏感操作可追溯（admin 守卫分页查询）
- **代码锚点**：`backend/app/auth/audit/write_hooks.py` · `backend/app/auth/audit/service.py` · `backend/app/api/v1/audit.py` · `tests/test_auth_rbac_l1.py` T-AUTH-AU01~AU10 · T-AUTH-A01~A09 回归
- **演化建议**：非 auth 域写操作扩展；生产留存策略
- **里程碑对齐**：
