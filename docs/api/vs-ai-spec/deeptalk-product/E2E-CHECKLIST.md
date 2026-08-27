# DeepTalk × VitalSpan 产品级联调验收

> 在 running VitalSpan（`:8000` + `:5173`）就绪后执行。  
> 产品形态真源：[WORKSPACE-PLUGIN-CONTRACT.md](./WORKSPACE-PLUGIN-CONTRACT.md)

## 1. 插件与工作区（产品路径）

- [x] `deeptalk-plugins` 构建并安装 `release/vitalspan-v*.zip`
- [x] DeepTalk 设置页插件 **loaded**
- [x] 「新建工作区」列表出现 **VitalSpan BI**
- [x] 走完创建向导（api/fe 地址写入 `instanceConfig.vitalspan`）
- [x] 打开工作区 **首页** 视图：已绑定显示 API/FE 摘要；未绑定显示横幅 + reason
- [x] 页内「打开 VitalSpan 管理面」跳转 **5173**（不在 iframe 内嵌完整编辑器）
- [x] 工作区 iframe 无对外部 host 的 `fetch`（health 走 `pluginExec`）

## 2. Agent 工具（components.tools）

在 DeepTalk 工作区对话或工具面板：

| 步骤 | 工具 | 期望 |
|------|------|------|
| health | `vitalspan_health_check` | `ok health http://127.0.0.1:8000/health` |
| publish 金样 | `vitalspan_publish_artifact` | `ok artifactId=<uuid>` + `styleComplianceTier=full` |
| list | `vitalspan_list_artifacts` | 列表含该组件 |
| get | `vitalspan_get_artifact` | `ok get artifactId=... file=examples/...` |
| refs | `vitalspan_list_artifact_dashboard_refs` | 被引用时列出 dashboardId |
| delete | `vitalspan_delete_artifact` | `ok deleted`；仍被引用时 **409** |
| delete dash | `vitalspan_delete_dashboard` | `ok deleted dashboardId=...` |
| route | `vitalspan_route_request` | JSON `workflow` 1/2/3 |
| compose | `vitalspan_compose_dashboard` | `ok dashboardId=` + `layout widgets: N`（N≥1） |

- [ ] DeepTalk Agent 已内置 [AGENT-SYSTEM-PROMPT.md](./AGENT-SYSTEM-PROMPT.md)

## 3. 完成 Gate

```
vitalspan_completion_gate workflow=2 + tool_stdout（publish 原始输出）
vitalspan_completion_gate workflow=3 + tool_stdout（compose/upload 含 ok dashboardId= 与 layout widgets:）
```

- [ ] wf2 summary 无 uuid 时被 gate **拒绝**
- [ ] wf2 summary 含 forbidden phrase（如「可在工作区直接使用」）时被 **拒绝**

## 4. 前端 5173

> IA 真源：[layout.md](../../../ui/layout.md) · `/admin` 默认重定向 **仪表板**；wf2 验收进 **分析 → 组件库**。

- [ ] **分析 → 组件库**（`/admin/viz-components`）可见已 publish 组件
- [ ] 组件编辑页样式面板改色生效（bundle 读 `p.style`）
- [ ] 组件库卡片 **属主移除** → DELETE 204
- [ ] **wf3**：`/admin/dashboards/:id/edit` 或 `/admin/data-screens/:id/edit` 可打开 compose 结果

## 5. Agent 行为

- [ ] 趋势图问卷结束后 **自动 publish**，不再问「保存到 output/」
- [ ] 任务结束必须报 `artifactId` / `dashboardId`，不得仅报本地路径

## 6. 开发备用（可选 · CLI）

在 `integrations/vitalspan/`（sync 后）或 VitalSpan 仓 `deeptalk-product/executor/`：

```bash
python executor/cli.py vitalspan_health_check
python executor/cli.py vitalspan_scaffold_artifact --id hex-kpi-grid --name "六边形KPI"
python tools/build-hex-kpi-example.py
python executor/cli.py vitalspan_validate_artifact --file examples/hex-kpi-grid.json
python executor/cli.py vitalspan_publish_artifact --file examples/hex-kpi-grid.json
python executor/cli.py vitalspan_completion_gate --workflow 2 --agent-summary "..." --tool-stdout "<publish stdout>"
```

与插件工具输出语义应对齐；**不作为**客户交付验收主路径。

## 7. L3-ZeroRef 闭环（VitalSpan 仓 · 2026-08-26）

| 步骤 | 命令/产物 | 期望 |
|------|-----------|------|
| 契约 | `vitalspan_get_contract_card` | JSON `contract_card` |
| 起盘 | `scaffold` → `generic-blank-*` | `examples/<id>.json` |
| 业务 | 只改 `renderBusiness` | 不抄 trend-line 金样 |
| 预检 | `validate --json` | `ok` + `full` + `fixes:[]` |
| 入库 | `publish` | `ok artifactId=<uuid>` + `full` |
| Gate | `completion_gate wf2` | passed |
| 5173 | 分析 → 组件库 | 可见 + 样式 Tab 六块有反应 |

- [x] `examples/hex-kpi-grid.json`（验收金样 · 已 publish 可复测）
- [x] validate → publish → `completion_gate wf2` 绿（CLI）
- [x] `AGENT-SYSTEM-PROMPT.md` ≤80 行 · `DEEPTALK-AGENT-PROMPT.md` 已对齐
- [x] 插件 **v0.3.6** sync + `release/vitalspan-v0.3.6.zip`（数据契约 rowsToSeries · DATA_* lint · 金样仅参考）
- [ ] DeepTalk 安装 zip 并重启 · 新 wf2 折线须 validate 0 warnings（含 DATA_ENCODING/SORT）

## VitalSpan CI 参考

- [backend/tests/test_deeptalk_product_integration.py](../../../backend/tests/test_deeptalk_product_integration.py)
- [backend/tests/test_vs_ai_spec_tools.py](../../../backend/tests/test_vs_ai_spec_tools.py)
- [tests/test_ai_viz_hybrid.py](../../../tests/test_ai_viz_hybrid.py)
