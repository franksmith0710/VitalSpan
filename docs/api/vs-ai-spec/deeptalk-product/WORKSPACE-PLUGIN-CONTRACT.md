# DeepTalk × VitalSpan 产品对接契约（工作区插件形态）

> **产品定论（2026-08）**：与 DeepTalk 的最终对接形态是 **先安装 VitalSpan 插件 → 新建特殊工作区 → 工作区内是业务页面**；**不是**向 DeepTalk 源码仓同步 `integrations/vitalspan/` 作为交付路径。  
> 实施 SOP（Task 1–9）：[`SPECIAL-WORKSPACE-PLUGIN-TASK.md`](./SPECIAL-WORKSPACE-PLUGIN-TASK.md)  
> BI 交付铁律不变：[../IRON-RULES.md](../IRON-RULES.md) · 平台验收仍在 **5173**

---

## 1. 三层模型（产品最终形态）

| 层 | 载体 | 职责 |
|----|------|------|
| **DeepTalk 插件** | `deeptalk-plugins/plugins/vitalspan/`（安装 zip） | `plugin.json`：`components.tools`（Agent）、`workspaceTemplates`、`views`、`execTools`（按需） |
| **特殊工作区** | 用户「新建工作区」选 VitalSpan 模板 | 左侧导航、`instanceConfig` 绑定、iframe 全页视图（`fill`） |
| **VitalSpan 平台** | `:8000` API · `:5173` 管理面 · DB | 组件库、大屏、customViz 渲染、preflight、鉴权；**wf2/wf3 完成证据不变** |

```
用户安装 vitalspan 插件
    → 新建「VitalSpan BI」特殊工作区（向导写入 instanceConfig）
    → 工作区视图：连接状态 / 资源列表 / 跳转 5173（iframe 内 pluginExec 取数）
    → Agent 聊天仍可调 components.tools 做 wf2/wf3
    → 正式 BI 编辑与验收：5173（artifactId / dashboardId）
```

**禁止**再向客户/内部描述「对接 = 改 DeepTalk 源码 + `integrations/vitalspan/executor/cli.py`」。

---

## 2. 与旧契约的差异

| 项 | 旧描述（已降级） | **产品最终形态** |
|----|------------------|------------------|
| 安装物 | sync 到 `deeptalk/integrations/vitalspan/` | **插件目录**（根上即 `plugin.json`） |
| 用户入口 | 主要靠聊天 + Agent 工具 | **工作区导航** + 聊天 Agent **并存** |
| 环境配置 | 全局 `config.yaml` / env | **每工作区** `instanceConfig.{domain}`（向导 `workspaceSetup.complete`） |
| 视图取数 | 工具进程 HTTP（无 iframe 限制） | iframe **禁止 fetch**；外连 VitalSpan 走 **`pluginExec` / execTools** |
| 源码改动 | `sync-vs-ai-spec-to-deeptalk-repo.ps1` | **只改插件仓**；**不改** DeepTalk 引擎 |

### 仍有效（不变）

- ② **`artifactId`**、③ **`dashboardId`** 为完成证据；无 uuid 不算交付
- bundle：`host.vsCv.mount` + `(p && p.style) || {}`
- 5173 为 BI 真 UI；不在 iframe 重做完整编辑器
- `components.tools` 与 `components.execTools` **分工**：前者给 Agent，后者给工作区 iframe

### 开发备用（非产品交付描述）

以下仅用于 VitalSpan 仓内联调、CI、无 DeepTalk 宿主时的脚本验真，**不得**写进对外产品对接说明：

- `deeptalk-product/executor/cli.py`
- `scripts/sync-vs-ai-spec-to-deeptalk-repo.ps1`
- `integrations/vitalspan/` 目录结构

---

## 3. 插件仓应交付什么（当前缺口 → Task 1–9）

现有 [`deeptalk-plugins/plugins/vitalspan`](../../../../deeptalk-plugins/plugins/vitalspan) 已有 **`components.tools`**（v0.2.x），**尚缺**工作区形态：

| 组件 | 状态 | 说明 |
|------|------|------|
| `components.tools` | 已有 | Agent wf2/wf3 |
| `workspace-templates/*.workspace.json` | **待做** | 「新建工作区」列表 |
| `views/*.js` | **待做** | iframe 业务页（构建产物） |
| `views/workspace-setup.js` | **待做** | 创建向导（有绑定时） |
| `execTools` | **按需** | 视图内调 VitalSpan API（替代 iframe fetch） |
| `scripts/assemble-plugin.mjs` | **待做** | 只打包 `plugin/`，不拷 `src/` |

实施顺序与验收：**严格**按 [SPECIAL-WORKSPACE-PLUGIN-TASK.md](./SPECIAL-WORKSPACE-PLUGIN-TASK.md) Task 1→9。

---

## 4. instanceConfig 约定（VitalSpan 域 · Task 1 已冻结）

绑定权威：`instanceConfig.plugin` + `instanceConfig.vitalspan`。

| 键 | 冻结值 |
|----|--------|
| `plugin.id` | `vitalspan` |
| `templateId` | `vitalspan.bi.default` |
| `instanceConfig` 域键 | `vitalspan` |

```json
{
  "plugin": {
    "id": "vitalspan",
    "version": "0.3.0",
    "templateId": "vitalspan.bi.default",
    "templateVersion": "1.0.0"
  },
  "vitalspan": {
    "mode": "demo",
    "apiBaseUrl": "http://127.0.0.1:8000/api/v1",
    "feAdminUrl": "http://127.0.0.1:5173/admin"
  }
}
```

- **模板 JSON 禁止**写实例 ID、token、内网地址
- 凭据不进 Agent 工具参数；execTools worker 读 env（见 Task 8）
- 视图未绑定：横幅 + `reason`，**禁止**静默演示数据冒充已绑定

---

## 5. 轨道决策（2026-08-24 · 已选 **B 轻量工作区**）

| 选项 | 范围 | 决策 |
|------|------|------|
| A 维持现状 | 仅 Agent 工具 + 5173 | 否 |
| **B 轻量工作区** | 模板 + 导航 + 连接/health + 跳 5173 + 最小 execTools | **是（MVP）** |
| C 完整 BI 工作区 | iframe 内 list/compose/delete | 否（二期；仍不替代 5173 编辑器） |

B 范围：视图 `vitalspan:home` · 向导 `vitalspan:workspace-setup` · execTool `vitalspan_health` · **不含** iframe 内 compose/upload。

---

## 6. 文档索引

| 文档 | 用途 |
|------|------|
| 本文 | **产品对接形态**（工作区 + 插件） |
| [SPECIAL-WORKSPACE-PLUGIN-TASK.md](./SPECIAL-WORKSPACE-PLUGIN-TASK.md) | 插件仓实施清单 Task 1–9 |
| [../IRON-RULES.md](../IRON-RULES.md) | wf2/wf3、uuid、bundle 铁律 |
| [AGENT-SYSTEM-PROMPT.md](./AGENT-SYSTEM-PROMPT.md) | Agent 工具与禁止说法 |
| [agent-tools.schema.json](./agent-tools.schema.json) | `components.tools` 注册表 |
| DeepTalk 宿主契约 | `plugin-views.md` · `plugin-exec-bridge.md` · `wizard-plugin-step-contract.md`（在 DeepTalk 仓核对） |
