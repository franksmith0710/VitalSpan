# DeepTalk × VitalSpan 一体集成铁律

> **会话/Agent 必读** · 与 [PACK-IDENTITY.md](./PACK-IDENTITY.md) · [guides/THREE-WORKFLOWS.md](./guides/THREE-WORKFLOWS.md) 配套  
> Cursor 规则：`.cursor/rules/deeptalk-vitalspan-integration.mdc`

## 1. 一体模型（产品铁律）

`vs-ai-spec-deeptalk-test` 是 **VitalSpan × DeepTalk 正式集成项目**，不是与 VitalSpan 无关的「外部手册包」。

| 谁 | 做什么 |
|----|--------|
| **DeepTalk 项目**（本目录 / 桌面包） | 写 customViz bundle、写大屏 layout、执行 validate + upload 脚本 |
| **VitalSpan 平台**（`:8000` + `:5173` + 元库） | 提供组件库 API、大屏保存、CustomViz 渲染、样式/数据注入、preflight、鉴权 |

```
DeepTalk 集成项目  ──HTTP──►  VitalSpan 平台能力
  写组件 / 拼大屏              入库 / 渲染 / 编辑
```

**用户心智**：在 DeepTalk 里做 BI，结果在 VitalSpan 里能拖、能改、能保存。  
**工程事实**：中间必须经过 HTTP；「一体」= Agent **默认跑完** upload/save，不是「写文件即同步」。

## 2. 三条工作流（不可混）

| 线 | 何时 | 完成证据 | 禁止 |
|----|------|----------|------|
| **② 组件库** | 开发**新** html/d3 组件 | **`artifactId=<uuid>`** | 同任务拼大屏；write_file 当完成 |
| **③ 大屏** | 编排 layout | **`dashboardId`** + editor-save | 写组件 HTML；内联 bundle |
| **① 内置图** | 标准 chartType | `/charts/validate` 200 | 走 customViz 入库 |

详见 [THREE-WORKFLOWS.md](./guides/THREE-WORKFLOWS.md)。

## 3. 交付铁律

| 规则 | 说明 |
|------|------|
| **无 uuid 不算完成** | ② 无 `artifactId`、③ 无 `dashboardId` → 禁止向用户说「已上传/已对接/已完成」 |
| **本地文件是草稿** | `examples/`、`write_file`、`output/` 均 ≠ 平台持久化 |
| **② 固定链路** | `validate-ai-viz-bundle.py` → `upload-ai-viz-artifact.py` → `ok artifactId=...` |
| **③ 固定链路** | `upload-dashboard-layout.py --dashboard-id ...` → 报 `dashboardId` |
| **HTTP 真源** | `POST/PUT http://127.0.0.1:8000/api/v1/...`（Bearer JWT） |

## 4. 组件实现铁律

| 规则 | 说明 |
|------|------|
| **读 `payload.style`** | `var st = (p && p.style) || {}`；禁止依赖不存在的 `vsCv.getStyle()` / `.vs-cv-style` |
| **d3 必须 mount** | `host.vsCv.mount(function (p) { ... })` |
| **样式合规** | 引用 `p.style` 或 CSS `--vs-style-*` / `--vs-palette-*`；金样见 `examples/custom-viz-*.json` |
| **六块 chrome** | 标题/卡片背景由平台 `CustomVizWidget` 负责，bundle 不自画标题栏 |

## 5. 组件库与金样

| 项 | 铁律 |
|----|------|
| 图表盘「自定义」 | **仅** `GET /api/v1/ai-viz/artifacts`（DB `ai_viz_artifacts`），按 `owner_user_id` 隔离 |
| 官方 `examples/` | 金样 + preflight/CI + 抄作业；**不自动进库**，须 upload 后才出现在图表盘 |
| 平台无自动 seed | 图表盘「自定义」仅来自 DB；官方 `examples/` 须 publish 后才进库 |
| 属主 DELETE | `DELETE /api/v1/ai-viz/artifacts/{id}` · CLI `delete-ai-viz-artifact.py` · 5173 图表盘移除按钮 |

## 6. 禁止说法（验收判错）

- 「这是 VitalSpan 组件**源码项目**」→ 错；是 **DeepTalk 集成项目**，源码在 `VitalSpan/fe`、`VitalSpan/backend`
- 「规范包与 VitalSpan 无关」→ 错；是 **唯一正式对接入口**
- 「output/ 已交付」→ 错；必须 **`artifactId`**
- 「DeepTalk 会自动打通平台」→ 错；**必须执行 upload 脚本**（一体 = 流程默认包含 upload，不是魔法同步）

## 7. 联调路径

| 项 | 值 |
|----|-----|
| 桌面包 | `C:\Users\<你>\Desktop\vs-ai-spec-deeptalk-test`（`scripts/sync-vs-ai-spec-pack.ps1` 同步） |
| DeepTalk 提示词 | [DEEPTALK-AGENT-PROMPT.md](./DEEPTALK-AGENT-PROMPT.md) |
| 仓内真源 | `docs/api/vs-ai-spec/` |
