# Scenario Playbook 交接摘要 · 后台管理首租户

| 项 | 内容 |
|----|------|
| 日期 | 2026-08-09 |
| 模式 | **specified** |
| 来源蓝图 | `docs/material/blueprints/2026-08-09-system-admin-audit.md`（已确认） |
| 范围 | F1 配置向导 → F2 组织 → F3 用户 → F4 角色/授权 |
| 剧本目录 | `.dev/playbooks/2026-08-09/` |

## 产出文件

| 文件 | 用途 |
|------|------|
| `.dev/playbooks/2026-08-09/README.md` | 索引、环境准备、只读/写模式说明 |
| `.dev/playbooks/2026-08-09/critical.md` | **主剧本** S0～S6（browser-reviewer 默认加载） |
| `.dev/playbooks/2026-08-09/optional.md` | O1 业务用户登录 · O2 审计 · O3 RLS · O4 停用 |

## 场景统计

| 分类 | 数量 | 说明 |
|------|------|------|
| 主场景 ready | 7 | S0～S6 |
| 写步 needs_confirm | 4 | S2～S5（受 `allow_writes: false` 约束） |
| 可选 ready | 3 | O2～O4 |
| 可选 blocked | 1 | O1（缺业务用户夹具时） |

## 关键约束

- `.dev/config.yaml` 当前 **`allow_writes: false`**：默认走查只打开表单到「取消」，不提交。
- 完整首租户闭环需临时开启 `walkthrough.allow_writes: true`，并使用 critical.md「完整闭环夹具」表中的示例值。
- 菜单/按钮文案均来自代码真源（`system-admin-nav.tsx`、各页 `DialogTitle`/按钮）。

## blocked / 待确认

| 项 | 状态 |
|----|------|
| 岗位模板 B-7 | 未实现，未写入剧本 |
| O1 业务用户登录 | 无 seed 用户时 blocked |
| staging 真机 | 需切换 `active_env`，未在本轮展开 |

## 下一步

```text
browser-reviewer · 剧本路径 = .dev/playbooks/2026-08-09/critical.md
```

用户仅手工验收：按 `critical.md` 逐步勾选即可，无需启动 browser-reviewer。
