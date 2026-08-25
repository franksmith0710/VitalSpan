# Task 9 宿主验收 — DeepTalk × VitalSpan B 轨

| 字段 | 值 |
|------|-----|
| 日期 | 2026-08-25 |
| 插件 | `vitalspan` **v0.3.0** |
| 安装路径 | `%APPDATA%\DeepTalk\plugins\vitalspan` |
| 轨道 | **B 轻量工作区**（仅 `home` + `workspace-setup` + `vitalspan_health`） |
| 前置 | Phase 2 spike 8/10 · Phase 3 Task 1–8 · `npm run smoke` 绿 |

---

## 构建与安装

| 项 | 状态 | 证据 |
|----|------|------|
| assemble 产物可安装 | ✅ | `node scripts/assemble-plugin.mjs` → ok |
| 安装哈希与仓内一致 | ✅ | 见下表 |
| 重启宿主 | ✅ | 用户重装 zip 后完全退出 DeepTalk |

| 文件 | 仓内 SHA256 前 12 | 安装目录 SHA256 前 12 |
|------|-------------------|------------------------|
| `plugin.json` | FDDD08152AD0 | FDDD08152AD0 |
| `views/home.js` | 9B094D86BE3C | 9B094D86BE3C |
| `views/workspace-setup.js` | CCBEFEBC59F0 | CCBEFEBC59F0 |
| `exec-tools/vitalspan-health.cjs` | 9A5007B59B7A | 9A5007B59B7A |

**自动化探针**（2026-08-25）：`node scripts/spike-host-verify.mjs` → `passed=8/8`（#4/#10 手测项已单独勾）

---

## Task 9 十条（真实 DeepTalk 窗口）

| # | 验收项 | 状态 | 证据 / 备注 |
|---|--------|------|-------------|
| 1 | 设置页插件 loaded；停用后模板消失或导航不可选 | ✅ | `config.json` installedVersion 0.3.0；`main.log` PluginInstaller loaded |
| 2 | 用模板新建工作区；向导走完创建成功 | ✅ | 用户 Phase 4 手测：选 **VitalSpan BI** · 填 API/5173 · 完成向导 |
| 3 | 打开 `home`，内容是本页 | ✅ | 左侧 **VitalSpan** → 卡片「VitalSpan BI 工作区」+ 检测按钮 |
| 4 | 左侧切下一页，URL/选中态/iframe 一致 | ✅（B 轨） | **VitalSpan** ↔ **新智能体** ↔ **工作区首页** 切换一致；仅 1 个插件业务页 |
| 5 | 页内入口跳转改父级 URL | ⏸ N/A（B） | home 外链 5173 为 `target=_blank`，非 `workspace.navigate`；C 轨二期再验 |
| 6 | 连续切换 20 次无「页面加载失败」 | ✅ | 用户 Phase 4 手测：VitalSpan ↔ 新智能体 ~20 次无白屏 |
| 7 | 带 `?id=` 深链能定位 | ⏸ N/A（B） | 无 `resources` 视图；B 轨不声明多页深链 |
| 8 | 未绑定/不可达：可见错误，不假成功 | ✅ | spike #9 横幅文案；health 失败显示红色错误行 |
| 9 | iframe 无对外 fetch；取数走 pluginExec | ✅ | `views/*.js` 无 `fetch(`；检测 API → `pluginExec('vitalspan_health')` |
| 10 | `deeptalk` 引擎仓 git 干净 | ✅ | 本机无 deeptalk 工作树改动；插件仅装 `%APPDATA%` |

**B 轨计分：8/10 适用 + 2 条 N/A**（与契约 §5 一致，不阻塞交付）

---

## Task 1–8 自动化回归（同次会话）

```text
npm run smoke          → exit 0
node tests/ids-sync.test.mjs       → ok
node tests/instanceConfig.test.mjs → ok
node scripts/assemble-plugin.mjs   → ok
node scripts/spike-host-verify.mjs → passed 8/8
```

---

## 结论

| 项 | 值 |
|----|-----|
| **Task 9** | ✅ **通过**（B 轨范围） |
| **制品** | `deeptalk-plugins/release/vitalspan-v0.3.0.zip` |
| **wf2/wf3** | 仍经 Agent tools + 5173 验收（不变） |

---

## 关联

- [SPECIAL-WORKSPACE-PLUGIN-TASK.md §Task 9](../../api/vs-ai-spec/deeptalk-product/SPECIAL-WORKSPACE-PLUGIN-TASK.md)
- [Phase 4 手测](./2026-08-25-deeptalk-vitalspan-phase4-handtest.md)
- [Phase 4 E2E](./2026-08-25-deeptalk-vitalspan-phase4-e2e.md)
