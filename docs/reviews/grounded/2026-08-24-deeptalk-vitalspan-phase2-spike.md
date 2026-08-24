# Phase 2 Spike 验收记录 — DeepTalk × VitalSpan B 轨

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-24 |
| 轨道 | **B — 轻量工作区** |
| Spike 包 | `deeptalk-plugins/release/vitalspan-v0.3.0.zip`（**Phase 2 最小 mock**，非 Phase 3 正式交付） |
| 安装路径 | `%APPDATA%\DeepTalk\plugins\vitalspan`（自 v0.2.14 升级；备份 `vitalspan-v0.2.14-backup`） |
| 前置 | VitalSpan `:8000` / `:5173` 已就绪 |
| 通过门槛 | **≥8/10** 才进 Phase 3 |

---

## Spike 10 条

| # | 项 | 状态 | 证据 |
|---|-----|------|------|
| 1 | 插件 settings loaded | ⏳ 待 DeepTalk 重启后手测 | 设置 → 插件列表应显示 **vitalspan 0.3.0** |
| 2 | 新建工作区列表有 **VitalSpan BI** | ⏳ 待手测 | 依赖 `workspaceTemplates` |
| 3 | 向导 `vitalspan:workspace-setup` 可加载 | ⏳ 待手测 | 新建工作区应进入向导 |
| 4 | `workspaceSetup.complete` → 磁盘 `instanceConfig.vitalspan` | ⏳ 待手测 | 完成向导后检查工作区目录 JSON |
| 5 | 导航打开 `vitalspan:home` | ⏳ 待手测 | 左侧 **VitalSpan** 导航项 |
| 6 | iframe 无对 `:8000` 的 `fetch` | ✅ 静态审查 | `views/*.js` 无 `fetch(`；health 走 `pluginExec` |
| 7 | `pluginExec('vitalspan_health')` 成功 | ✅ Node 探针 | `exec-tools/vitalspan-health.cjs` → `{"ok":true,"healthUrl":"http://127.0.0.1:8000/health"}` |
| 8 | 外链 5173 正常 | ✅ HTTP | `GET http://127.0.0.1:5173/admin` → 200 |
| 9 | 未绑定显示横幅 | ⏳ 待手测 | home 视图 `readDomainBinding` 失败时应显示 reason |
| 10 | 连续切视图 20 次稳定 | ⏳ 待手测 | home ↔ 聊天 ↔ home |

**当前计分**：**3/10**（自动化）+ **7 项待 DeepTalk 真机**

---

## 手测步骤（DeepTalk 重启后）

1. **完全退出并重启 DeepTalk**（加载新 `plugin.json`）。
2. **设置 → 插件**：确认 vitalspan **0.3.0**、状态 loaded；若有错误记录截图。
3. **新建工作区**：列表应出现 **VitalSpan BI** → 进入向导。
4. **向导填写**：
   - API：`http://127.0.0.1:8000/api/v1`
   - 管理面：`http://127.0.0.1:5173/admin`
   - 完成向导。
5. **检查 instanceConfig**：在工作区数据目录查找 `instanceConfig` 是否含 `plugin.id=vitalspan` 与 `vitalspan.apiBaseUrl/feAdminUrl`。
6. **打开 VitalSpan 导航**：点「检测 API 连接」应绿；点「打开 VitalSpan 管理面」应新开 5173 标签。
7. **未绑定场景**（可选）：新建工作区跳过/清空绑定 → home 应显示横幅 reason。
8. **稳定性**：home ↔ 新智能体 ↔ home 重复 20 次，无白屏/崩溃。

---

## 结论

| 项 | 值 |
|----|-----|
| **Phase 2 状态** | **进行中** — spike 包已安装，待 DeepTalk 重启 + 手测 7 项 |
| **可否进 Phase 3** | **否**（须 ≥8/10） |
| **失败降级** | 若宿主字段不兼容 → 记录 blocker，改 Task 或降级 A |

---

## 关联

- 执行路径：[2026-08-24-deeptalk-vitalspan-how-to-execute-adjudication.md](./2026-08-24-deeptalk-vitalspan-how-to-execute-adjudication.md)
- Task Spike 清单：[SPECIAL-WORKSPACE-PLUGIN-TASK.md](../../api/vs-ai-spec/deeptalk-product/SPECIAL-WORKSPACE-PLUGIN-TASK.md)
