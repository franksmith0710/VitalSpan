# Browser Reviewer · 首租户真机走查 R2

| 项 | 内容 |
|----|------|
| 日期 | 2026-08-09 23:09 |
| 环境 | local · `http://localhost:5173` · API `http://localhost:8000` |
| 剧本 | `.dev/playbooks/2026-08-09/critical.md` + optional O1 |
| `allow_writes` | true（本轮回放为**只读验证**，未重复写入） |
| 结论 | **管理侧闭环数据在库**；**O1 未通过**（角色权限未落库） |

## 预检（S0）

| 检查项 | 结果 |
|--------|------|
| `GET /health` | ✅ 200 |
| `GET /login` | ✅ 200 |
| FE dev (`pnpm dev`) | ✅ 可访问 |
| BE API | ✅ 可访问 |

## 场景结果

| 场景 | 结果 | 证据 |
|------|------|------|
| S1 配置向导 | ✅ | 四步均显示完成勾；文案「基础配置已完成」；概览 组织61/用户14/角色4/授权1 |
| S2 组织架构 | ✅（数据） | 走查夹具「演示综合处」存在于库（前序写闭环） |
| S3 岗位角色 | ⚠️ | 角色 `demo_analyst` 存在，但**权限矩阵为空**（见 P1） |
| S4 用户绑定 | ✅（数据） | `walkthrough_analyst` 存在，列表显示已绑「演示分析员」 |
| S5 资源授权 | ✅ | 列表 1 条：演示分析员 → 仪表板 → `00000000-0000-4000-8003-000000000002` |
| S6 侧栏高亮 | ⏭ | 本轮未专项复测（R1 已通过） |
| O1 分析员登录 | ❌ | 可登录；看板 API 403；页面空列表（无卡片） |

## Findings

### P1 · `demo_analyst` 角色权限未落库 → 分析员无法读看板

**复现**

1. 管理员登录 → 角色管理 → 编辑 `demo_analyst` → 权限 Tab
2. 或 API：`GET /api/v1/roles/{id}/permissions` → `permissionCodes: []`，`version: 0`
3. `walkthrough_analyst` 登录 → `/admin/dashboards` 空白
4. `GET /api/v1/me` → `roles: ["demo_analyst"]`，`permissions: []`
5. `GET /api/v1/dashboards` → `PERMISSION_DENIED` · `Missing required permission: dashboard:read`

**根因（高置信）**

写闭环时 UI 勾选了「查看仪表板」并点击「保存权限」，但**后端 `auth_role_permissions` 未写入**（`permission_version` 仍为 0）。可能原因：保存请求未成功、版本冲突被吞、或自动化点击未触发有效提交。

**影响**

- 资源授权（S5） alone 不能替代功能权限 `dashboard:read`
- 首租户「分析员可用」验收无法通过

**建议修复**

1. 管理员在角色编辑 → 权限 Tab 勾选「查看仪表板」→「保存权限」，确认 toast 成功且 `version` 递增
2. 或 API `PUT /api/v1/roles/{id}/permissions` 写入 `dashboard:read`
3. `walkthrough_analyst` 重新登录后复测 O1

### P2 · 组织树测试数据噪声（继承 R1）

- 概览显示 61 个组织节点，含大量 `RLS Bind Org*` 测试残留，影响演示观感

## API 摘录（脱敏）

```
walkthrough_analyst /me:
  roles=["demo_analyst"], permissions=[], isRoot=false

GET /api/v1/dashboards:
  code=PERMISSION_DENIED, message=Missing required permission: dashboard:read

admin GET roles/demo_analyst/permissions:
  permissionCodes=[], version=0
```

## 截图

| 文件 | 说明 |
|------|------|
| `.dev/walkthrough/2026-08-09/shots/S1-wizard-complete.png` | 向导完成态 |
| `.dev/walkthrough/2026-08-09/shots/S5-grants-list.png` | 资源授权 1 条 |
| `.dev/walkthrough/2026-08-09/shots/S-O1-analyst-dashboards.png` | 分析员看板空页 |
| `.dev/walkthrough/2026-08-09/shots/P1-demo-analyst-zero-perms.png` | 角色编辑（基本信息） |

## Console / 网络

- 分析员看板页：未捕获持续 Console error（页面以空态呈现，非显式错误条）
- 网络：`/api/v1/dashboards` 预期 403（已记录为 P1，非假绿）

## 总评

| 维度 | 判定 |
|------|------|
| 管理写闭环数据 | ✅ 组织/用户/授权实体均在 |
| 权限矩阵有效性 | ❌ **阻断 O1** |
| 可交付（含业务账号验收） | ❌ 待修 P1 后复跑 |

## 下一步

1. 修复 `demo_analyst` 权限落库并复测 O1
2. 可选：清理 RLS 测试组织或隔离到非演示库
3. P1 修复后更新本报告为 R3「通过」
