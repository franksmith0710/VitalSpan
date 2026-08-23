# Feature Truth Audit: 权限体系 Phase A/B/C 完成度

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-24 |
| 核验范围 | AUTH-001～008 + Phase A/B/C 计划对账（`F02-AUTH.md` §Phase C） |
| 锚点 | `/admin/system/*` · `/api/v1/{roles,users,orgs,resource-grants,rls,column-masks,audit,users/*/resource-grants}` |
| 总体判定 | **PARTIAL+** |
| **总分 / 档位** | **8.5 / 10 · B+** |
| 状态 | draft |
| **sampling** | `full`（合同 12 项全枚举；FE 按 9 管理页 + Rls 5 Tab 下钻） |

## 1. 核验标准与预期

| ID | 期望行为（可观察） | 依据 |
|----|-------------------|------|
| T1 | 角色/组织/用户 CRUD + 权限码绑定可运营 | AUTH-001～003 · PRD |
| T2 | 资源 grant 控制 dashboard/datasource/report 可见；子路由不可 IDOR | AUTH-004 · Phase A |
| T3 | RLS 维度/分组/列映射可配置；查询注入谓词 | AUTH-005～007 · Phase B |
| T4 | 权限变更与域删除可审计 | AUTH-008 · Phase C3 |
| T5 | 组织范围管理员仅管子树用户/授权 | C1 |
| T6 | 用户例外授权 ± 覆盖角色默认且运行时生效 | C2 |
| T7 | 列脱敏配置后查询结果掩码 | C3 |
| T8 | LDAP/OIDC 规格门 + 管理入口（骨架） | C5 · spec |
| T9 | 仅 `is_root` bypass 资源 ACL/RLS | Phase A1 · `auth/bypass.py` |

- 非目标：LDAP/OIDC 真联调（C5 明确骨架）、Playwright 全站 E2E、MFA/多租户

## 2. 完整链路图（摘要）

```
Admin UI → apiFetch → FastAPI + require_permission → domain service
  → auth/resources|rls|user_overrides|masking → DB (Alembic 0052/0053)
  → 查询链 query/service + rls/guard → 结果 mask 后返回
```

| 序 | 层 | 状态 | L1 证据 |
|----|----|------|---------|
| 1 | FE 路由/守卫 | 通 | `routes.tsx` · `permission-codes.ts` · vitest 53/53 |
| 2 | API 鉴权 | 通 | `test_auth_rbac_l1.py` 122 passed |
| 3 | 资源 ACL + override | 通 | `test_auth_resource_acl_matrix.py` · `test_auth_user_override_enforcement.py`（含维度 RLS） |
| 4 | RLS 列映射/预览 | 通 | `test_auth_rls_column_bindings.py` · `rls.smoke` T-RLS-04 |
| 5 | 列脱敏后处理 | 通 | `test_auth_column_masks.py` 3 passed（含 query 全链） |
| 6 | LDAP/OIDC 登录 | 断（占位） | `login/oidc.py` → 501 |
| 7 | 首租户真机走查 | 未本轮复验 | graduation O1 仍 PARTIAL |

## 3. 子能力判定表

| ID | 子能力 | 判定 | 总分/档 | 证据摘要 |
|----|--------|------|---------|----------|
| T1 | 角色/组织/用户 | **REAL** | 8.5/B+ | rbac_l1 + roles/orgs/users smoke |
| T2 | 资源 ACL | **REAL** | 8.0/B | acl matrix + override enforcement |
| T3 | RLS 产品化 | **REAL** | 8.0/B+ | 列映射 CHAIN + `rls.smoke` T-RLS-04/05 |
| T4 | 审计 | **REAL** | 8.0/B | audit smoke + write_hooks 扩展 |
| T5 | 组织分权 | **REAL** | 7.5/B | `test_auth_org_scoped_admin.py` 3 passed |
| T6 | 用户例外 | **REAL** | 8.0/B+ | 资源链 + 维度 RLS e2e + `users.smoke` T-AUTH-C2-01 |
| T7 | 列脱敏 | **REAL** | 8.0/B+ | mask service + `execute_query` 全链 + `rls.smoke` T-RLS-05 |
| T8 | LDAP/OIDC | **STUB** | 4/D | 诚实骨架；不可标 REAL |
| T9 | is_root bypass | **REAL** | 8.5/B+ | rg 零 `"admin" in roles`；bypass.py |

## 3b. 前端控件下钻（管理面关键增量）

| ID | 文案/位置 | 期望 | 实际 | L | C | 判定 | 证据 |
|----|-----------|------|------|---|---|------|------|
| B1 | Rls「列映射」Tab | 可 CRUD + 预览 | vitest T-RLS-04 POST mock | 2 | 2 | **REAL** | `rls.smoke.test.tsx` |
| B2 | Rls「列脱敏」Tab | 可 CRUD mask | vitest T-RLS-05 POST mock | 2 | 2 | **REAL** | `rls.smoke.test.tsx` |
| B3 | 用户「例外授权」Tab | PUT resource/dimension override | vitest T-AUTH-C2-01 PUT mock | 2 | 2 | **REAL** | `users.smoke.test.tsx` |
| B4 | 「认证集成」页 | 展示 LDAP/OIDC 未启用 | 静态 Badge；无联调 | 2 | 2 | **REAL（骨架）** | `AuthIntegrationPage.tsx` |
| B5 | Grants 报表选取 | 按名称选 report 节点 | smoke 覆盖 datasource/dashboard | 2 | 2 | **PARTIAL** | `grants.smoke` 未断言 report picker |

已有 smoke 页（roles/orgs/users/grants/rls 全 Tab/audit/platform）：**REAL @ UI**（53/53 vitest）。

## 3d. 覆盖矩阵

| 实体 ID | 类型 | GATE | CHAIN | UI | 深度 | L | C | 判定 | 证据 |
|---------|------|------|-------|-----|------|---|---|------|------|
| AUTH-001 | 角色 | ✅ | ✅ | ✅ | UI | 2 | 2 | REAL | rbac_l1 R* · roles.smoke |
| AUTH-002 | 组织 | ✅ | ✅ | ✅ | UI | 2 | 2 | REAL | rbac_l1 O* · orgs.smoke |
| AUTH-003 | 用户 | ✅ | ✅ | ✅ | UI | 2 | 2 | REAL | rbac_l1 U* · users.smoke |
| AUTH-004 | 资源授权 | ✅ | ✅ | ✅ | UI | 2 | 2 | REAL | acl matrix · grants.smoke |
| AUTH-005 | 维度类型 | ✅ | ✅ | ✅ | UI | 2 | 2 | REAL | rbac_l1 D* · rls.smoke T-RLS-02/03 |
| AUTH-006 | 维度分组/角色绑定 | ✅ | ✅ | ✅ | UI | 2 | 2 | REAL | rls.smoke Tab 切换 |
| AUTH-007 | RLS 注入+列映射 | ✅ | ✅ | ✅ | CHAIN | 2 | 2 | REAL | col bindings pytest · rls.smoke T-RLS-04 |
| AUTH-008 | 审计 | ✅ | ✅ | ✅ | UI | 2 | 2 | REAL | audit.smoke |
| C1 | 组织范围管理 | ✅ | ✅ | ⚠️ | CHAIN | 2 | 2 | PARTIAL | org_scoped pytest；无专用 FE smoke |
| C2 | 用户例外授权 | ✅ | ✅ | ✅ | CHAIN | 2 | 2 | REAL | override enforcement + 维度 RLS · users.smoke |
| C3 | 列脱敏+域审计 | ✅ | ✅ | ✅ | CHAIN | 2 | 2 | REAL | mask service + query 全链 · rls.smoke T-RLS-05 |
| C5 | LDAP/OIDC | ✅ | ❌ | ✅ | GATE | 1 | 1 | STUB | spec + 501 占位 |

### 覆盖摘要

| 指标 | 值 |
|------|-----|
| 必验实体 | **12** |
| CHAIN 绿 | **11** |
| UI smoke 绿 | **11**（含 rls 全 Tab + 例外授权） |
| GATE only | **1**（C5） |
| NONE（未验 UI） | **1**（report grant picker） |
| REAL 达标 | **10 / 12** |
| **逐一校验** | **否** — C5 STUB + C1 无专用 FE smoke；未跑 browser O1 |
| 总体可否 REAL | **否** — C5 STUB + 多项 PARTIAL |

## 3c. 五维评分汇总（合同级）

| ID | L | C | D | E | F | 总分 | 档位 | 真假 |
|----|---|---|---|---|---|------|------|------|
| AUTH-001～003,008 | 2 | 2 | 2 | 2 | 1 | 9 | A- | REAL |
| AUTH-004,006 | 2 | 2 | 2 | 2 | 1 | 8.5 | B+ | REAL |
| AUTH-007,C1 | 2 | 2 | 2 | 2 | 1 | 8～8.5 | B+ | REAL/PARTIAL |
| C2,C3 | 2 | 2 | 2 | 2 | 1 | 8.5 | B+ | REAL |
| C5 | 1 | 1 | 2 | 1 | 1 | 4 | D | STUB |

## 4. 动态验证记录

| 步骤 | 操作 | 期望 | 实际 | 一致 |
|------|------|------|------|------|
| 1 | `pytest` 9 个 auth 专项文件 | 全绿 | **154 passed** | ✅ |
| 2 | `vitest run src/pages/admin/system` | 全绿 | **53 passed** | ✅ |
| 3 | `rg "admin" in roles` backend | 0 命中 | **0** | ✅ |
| 4 | override add 后 dashboard ACL | 可见 | `test_user_override_add_visible_in_acl_chain` PASS | ✅ |
| 5 | override deny 后 dashboard ACL | 不可见 | `test_user_override_deny_blocks_acl_chain` PASS | ✅ |
| 6 | 三角色安全链 | root bypass / grant / 403 | `test_auth_security_e2e.py` 3 PASS | ✅ |
| 7 | OIDC callback 未配置 | 501 | `ExternalAuthNotConfiguredError` | ✅（骨架预期） |
| 8 | 列映射/列脱敏 Tab vitest | 有下钻 | T-RLS-04/05 PASS | ✅ |
| 9 | 首租户 browser O1 | 数据大屏见授权资源 | **本轮未跑** | ❌ |

## 5. 修复文档（P1，非 P0）

### P1-A～D — **已闭合**（2026-08-24）

| ID | 状态 | 证据 |
|----|------|------|
| P1-A | ✅ | `rls.smoke.test.tsx` T-RLS-04/05 |
| P1-B | ✅ | `users.smoke.test.tsx` T-AUTH-C2-01 |
| P1-C | ✅ | `test_dimension_override_deny_*` in `test_auth_user_override_enforcement.py` |
| P1-D | ✅ | `test_execute_query_applies_column_masks` in `test_auth_column_masks.py` |

附：`ColumnMasksPanel` DataTable API 已对齐 `headers/rows`。

### P1-E — C5 LDAP/OIDC（非 bug）

**判定**：STUB（计划内）  
**说明**：不可标 REAL；须 spec gate + integration-research 后单独立项  

## 6. 修复优先级汇总

| 优先级 | ID | 一句话 |
|--------|-----|--------|
| ~~P1~~ | ~~P1-A/B/C/D~~ | **已闭合** |
| P2 | O1 | 复跑首租户 browser 走查回填 graduation |
| P2 | B5 | grants.smoke 补 report picker 断言 |

## 7. 交接

- **结论**：Phase A/B/C **核心 CHAIN 与新增 Tab smoke 已闭合**；**不能标「全量 REAL / 正式毕业」**（10 REAL，1 PARTIAL C1，1 STUB C5）。
- 剩余：C5 LDAP/OIDC 骨架、C1 专用 FE smoke、O1 browser 走查。
- 文档：`docs/material/code-review/2026-08-24-permission-phase-abc-review.md`（修复已合入）
