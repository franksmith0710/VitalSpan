# 本目录是什么（工程定位 · 必读）

> **禁止**把 `vs-ai-spec-deeptalk-test` 说成「VitalSpan 自定义可视化组件**项目目录**」。  
> 那是 **错误心智模型**，会导致只 `write_file`、不 POST、宣称「已完成」。

## 正确工程定义

本目录是 VitalSpan 平台对外分发的 **集成规范包（Integration Spec Pack）**：

| 类比 | 本目录对应物 |
|------|----------------|
| 不是产品源码仓 | 不是 `VitalSpan/fe`、`VitalSpan/backend` |
| 像 OpenAPI + 集成指南 | `PROTOCOL.md`、`00-REQUIREMENTS.md`、`schemas/` |
| 像 Postman 集合 + 样例请求体 | `examples/*.json` |
| 像 联调 CLI（调平台 API） | `tools/upload-*.py`、`validate-*.py` |
| 真系统运行时 | **`http://127.0.0.1:8000`** 上的 VitalSpan 后端 + **`5173`** 管理端 |

```
┌─────────────────────────────────────────────────────────┐
│  vs-ai-spec-deeptalk-test  （本目录 · 规范包）          │
│  文档 + 金样例 + 调 API 的脚本                           │
│  角色：甲方给乙方的「对接契约 + 工具」，不是乙方的产品仓   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP POST/PUT（必须）
                        ▼
┌─────────────────────────────────────────────────────────┐
│  VitalSpan 平台（真工程系统）                            │
│  API :8000  ·  DB ai_viz_artifacts / dashboards         │
│  前端 :5173  ·  CustomVizWidget 挂载 entry              │
└─────────────────────────────────────────────────────────┘
```

## 它是什么 / 不是什么

| ✅ 是 | ❌ 不是 |
|------|--------|
| 联调用的**规范与契约** | 可独立运行的「组件项目」 |
| 调用 VitalSpan **HTTP API** 的脚本壳 | 上传/部署**目的地** |
| 金样例与 JSON Schema | npm/Python 包发布源 |
| 外部 AI **读规范 → 产 JSON → 调脚本入库** 的工作区 | VS Code / DeepTalk「扩展工程」 |
| 草稿可暂存 `examples/xxx.json` | 用 `output/` 当交付目录 |

## 完成对接的工程含义

**不是**「本目录里多了一个 JSON 文件」。  
**是**「平台侧产生了可引用的持久化记录」：

| 路径 | 平台侧落点 | 完成证据 |
|------|-----------|----------|
| L3 customViz | 表 `ai_viz_artifacts` | `artifactId` uuid |
| L1/L2 图 | 校验通过后的 `chartConfig` 写入 layout | `POST /charts/validate` 200 |
| 大屏 | 表 `dashboards.layout_json` | `PUT .../editor-save` 200 + `dashboardId` |

## DeepTalk 常见错答（一律判错）

| 错说法 | 对说法 |
|--------|--------|
| 「这是 VitalSpan 自定义可视化组件**项目目录**」 | 这是 **VitalSpan 平台集成规范包**，组件运行在**平台进程**里 |
| 「组件已保存在 output/，符合规范」 | 本地文件 ≠ 入库；必须 `artifactId` |
| 「可在工作区 / 扩展中直接使用」 | 必须在 **VitalSpan 看板** 通过 `customVizConfig.artifactId` 引用 |
| 「共 1 步 write_file 完成」 | 至少：validate → upload → **汇报 uuid** |

## 联调真源路径

以 VitalSpan 方 `sync-vs-ai-spec-pack.ps1` 同步后的目录为准，例如：

`C:\Users\<你>\Desktop\vs-ai-spec-deeptalk-test`

不要使用过期副本、Documents 下旧工作区、或未同步的 zip（看 `CHANGELOG.md` 日期）。

## 下一步读什么

1. [START-HERE.md](./START-HERE.md) — 三条路径与命令  
2. [DEEPTALK-AGENT-PROMPT.md](./DEEPTALK-AGENT-PROMPT.md) — 贴进 DeepTalk 系统提示  
3. 按路径读对应 Runbook
