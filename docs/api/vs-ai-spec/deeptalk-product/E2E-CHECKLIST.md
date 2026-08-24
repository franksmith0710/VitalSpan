# DeepTalk × VitalSpan 产品级联调验收

> 在 running VitalSpan（`:8000` + `:5173`）就绪后执行。  
> 产品形态真源：[WORKSPACE-PLUGIN-CONTRACT.md](./WORKSPACE-PLUGIN-CONTRACT.md)

## 1. 插件与工作区（产品路径）

- [ ] `deeptalk-plugins` 构建并安装 `release/vitalspan-v*.zip`
- [ ] DeepTalk 设置页插件 **loaded**
- [ ] 「新建工作区」列表出现 **VitalSpan BI**
- [ ] 走完创建向导（api/fe 地址写入 `instanceConfig.vitalspan`）
- [ ] 打开工作区 **首页** 视图：已绑定显示 API/FE 摘要；未绑定显示横幅 + reason
- [ ] 页内「打开 VitalSpan 管理面」跳转 **5173**（不在 iframe 内嵌完整编辑器）
- [ ] 工作区 iframe 无对外部 host 的 `fetch`（health 走 `pluginExec`）

## 2. Agent 工具（components.tools）

在 DeepTalk 工作区对话或工具面板：

| 步骤 | 工具 | 期望 |
|------|------|------|
| health | `vitalspan_health_check` | `ok health http://127.0.0.1:8000/health` |
| publish 金样 | `vitalspan_publish_artifact` | `ok artifactId=<uuid>` + `styleComplianceTier=full` |
| list | `vitalspan_list_artifacts` | 列表含该组件 |
| delete | `vitalspan_delete_artifact` | `ok deleted artifactId=...` |
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

- [ ] 图表盘「自定义」可见已 publish 组件
- [ ] 样式面板改色生效（bundle 读 `p.style`）
- [ ] 属主移除按钮 → DELETE 204

## 5. Agent 行为

- [ ] 趋势图问卷结束后 **自动 publish**，不再问「保存到 output/」
- [ ] 任务结束必须报 `artifactId` / `dashboardId`，不得仅报本地路径

## 6. 开发备用（可选 · CLI）

在 `integrations/vitalspan/`（sync 后）：

```bash
python executor/cli.py vitalspan_health_check
python executor/cli.py vitalspan_publish_artifact --file examples/custom-viz-trend-line.json
```

与插件工具输出语义应对齐；**不作为**客户交付验收主路径。

## VitalSpan CI 参考

- [backend/tests/test_deeptalk_product_integration.py](../../../backend/tests/test_deeptalk_product_integration.py)
- [backend/tests/test_vs_ai_spec_tools.py](../../../backend/tests/test_vs_ai_spec_tools.py)
- [tests/test_ai_viz_hybrid.py](../../../tests/test_ai_viz_hybrid.py)
