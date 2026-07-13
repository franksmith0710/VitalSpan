---
name: bug-case-library
description: >-
  项目 Bug Case 知识库：记录已踩坑、症状、根因与修复方式。修复 bug 前先检索 cases/ 是否有类似问题；
  确认并修复 bug 后必须新增或更新 case。适用于前端/后端/UI 交互/部署等一切缺陷排查与预防。
---

# Bug Case 知识库

## 何时使用

| 场景 | 动作 |
|------|------|
| **开始修 bug** | 先读 `cases/` 目录，按症状/模块关键词检索是否有类似 case |
| **根因确认并合入修复** | 新增或更新对应 case 文件 |
| **新增弹窗/portal/全局 DOM 副作用** | 读 `cases/fe-modal-portal-cleanup.md` |

## 修 Bug 工作流

```
1. 用户报告 / 测试失败
2. 打开 .agents/skills/bug-case-library/cases/ 检索（症状、文件路径、库名）
3. 若命中类似 case → 优先验证同一根因，避免重复踩坑
4. 若无命中 → 正常 debug（假设 → 运行时证据 → 最小修复）
5. 修复验证通过后 → 新增/更新 case（见下方模板）
6. PR 描述中可链接 case 文件名
```

## Case 文件命名

```
cases/<域>-<简短主题>.md
```

示例：`fe-modal-portal-cleanup.md`、`api-stream-finish-reason.md`

## Case 模板（新建时复制）

```markdown
# [标题]

- **ID**: CASE-YYYY-MM-DD-001
- **状态**: 已修复 | 已知限制 | 进行中
- **影响**: fe | be | admin-ui | 部署
- **首次发现**: YYYY-MM-DD

## 症状

- 用户可见现象（一步一说）

## 根因

- 技术根因（含库/生命周期/时序）

## 错误做法（避免）

- 列具体反模式

## 修复方式

- 文件路径 + 原则（非仅贴 diff）

## 验证

- 如何确认已修好

## 关联

- 相关文件、PR、规则
```

## Case 索引

| ID | 文件 | 关键词 |
|----|------|--------|
| CASE-2026-06-09-001 | [fe-modal-portal-cleanup.md](./cases/fe-modal-portal-cleanup.md) | modal, AlertDialog, Radix, portal, inert, pointer-events, 整页不可点 |
| CASE-2026-06-10-001 | [gateway-ark-coding-json-object.md](./cases/gateway-ark-coding-json-object.md) | ark_coding, json_object, DeepSeek, upstream_error, BUG-28 |
| CASE-2026-06-12-001 | [auth-legacy-admin-password.md](./cases/auth-legacy-admin-password.md) | login, invalid credentials, admin, seed, admin-change-me, 激活后登录 |
| CASE-2026-06-12-002 | [fe-api-null-items-list.md](./cases/fe-api-null-items-list.md) | items null, length, ChatEndpointsPage, 白屏, 空列表 |
| CASE-2026-06-17-001 | [user-last-super-admin-demote-race.md](./cases/user-last-super-admin-demote-race.md) | user, super_admin, demote, race, atomic update |
| CASE-2026-07-09-001 | [fe-dashboard-zombie-edit-flicker.md](./cases/fe-dashboard-zombie-edit-flicker.md) | dashboard, 404, zombie edit, RGL isDroppable, 闪烁, 无法保存 |
| CASE-2026-07-13-001 | [auth-password-401-session-semantics.md](./cases/auth-password-401-session-semantics.md) | change-password, 401, apiFetch, logout, preserveSessionOn401Codes, AUTH_INVALID_CURRENT_PASSWORD |

## 维护规则

- 一个根因一个 case；同一根因多次复发则 **更新** 原 case 的「验证」「关联」
- case 写 **可复用的原则**，不要只写「改了某行」
- 修复与 case 同步提交（或同一 PR）
