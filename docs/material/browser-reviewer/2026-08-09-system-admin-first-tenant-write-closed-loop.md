# Browser Reviewer · 首租户写闭环走查

| 项 | 内容 |
|----|------|
| 日期 | 2026-08-09 |
| 模式 | `allow_writes: true`（`.dev/config.yaml` 已开启） |
| 剧本 | `.dev/playbooks/2026-08-09/critical.md` + optional O1 |
| 环境 | local · `http://localhost:5173` |
| 结论 | **管理侧写闭环通过**；业务账号登录成功但看板列表 403（P1） |

## 执行摘要

在只读走查基础上，已完成首租户夹具的全链路写入：组织 → 角色（含权限）→ 用户（角色/组织绑定）→ 资源授权。配置向导显示「基础配置已完成」，概览统计与写入结果一致。可选场景 O1（`walkthrough_analyst` 登录）可进入工作台，但数据看板页提示「无权执行此操作」。

## 写入实体（夹具）

| 实体 | 值 | 状态 |
|------|-----|------|
| 组织 | `演示综合处` | ✅ 已创建 |
| 角色 | `demo_analyst` / 演示分析员 | ✅ 已创建 |
| 角色权限 | 查看仪表板 | ✅ UI 已勾选并保存 |
| 用户 | `walkthrough_analyst` / `Walkthrough1` | ✅ 已创建 |
| 用户角色 | 演示分析员 | ✅ 已绑定 |
| 用户组织 | 演示综合处 | ✅ 已绑定 |
| 资源授权 | 演示分析员 → 仪表板 → 数字政府 KPI 驾驶舱 | ✅ 已创建（列表 1 条） |

## 场景结果

| 场景 | 结果 | 说明 |
|------|------|------|
| S2 组织架构 | ✅ | 新建「演示综合处」成功 |
| S3 岗位角色 | ✅ | 新建并配置 `demo_analyst` |
| S4 用户绑定 | ✅ | 创建用户并完成角色/组织绑定 |
| S5 资源授权 | ✅ | 授权列表由空变为 1 条 |
| S6 侧栏高亮 | ⏭ | 写闭环未复测（只读走查已通过） |
| O1 分析员登录 | ⚠️ | 登录成功；`/admin/dashboards` 显示「无权执行此操作」 |

## Findings

### P1 · 分析员登录后看板列表 403

- **复现**：`walkthrough_analyst` / `Walkthrough1` 登录 → 默认进入 `/admin/dashboards` → 页面「无权执行此操作」
- **API**：`GET /api/v1/dashboards` → `PERMISSION_DENIED` · `Missing required permission: dashboard:read`
- **`GET /api/v1/me`**：`roles: ["demo_analyst"]`，`permissions: []`
- **推测**：角色权限矩阵保存后，JWT/`/me` 未展开有效权限，或 UI「查看仪表板」与 `dashboard:read` 映射/落库不一致
- **建议**：核对 `demo_analyst` 角色 `GET /api/v1/roles/{id}/permissions`；修复后重登 analyst 复测 O1

### P2 · 组织树测试数据噪声（继承只读走查）

- 组织列表仍含大量 `RLS Bind Org*` 测试节点（61 个组织节点），影响首租户演示观感

## 向导与概览（写闭环后）

- 文案：**「基础配置已完成，可按需调整各模块。」**
- 概览：组织节点 61 · 用户 14 · 角色 4 · **资源授权 1**

## 配置变更

- `.dev/config.yaml`：`walkthrough.allow_writes` 已由 `false` 改为 `true`（local + 全局）。若仅需只读走查，可改回 `false`。

## 后续

1. 修复 P1 后复跑 O1，确认 analyst 可见已授权看板
2. 可选：清理或隔离 RLS 测试组织数据，改善演示环境
3. 将本报告与只读报告一并作为 blueprint 验收附件
