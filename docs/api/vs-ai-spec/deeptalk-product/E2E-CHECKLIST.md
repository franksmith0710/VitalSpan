# DeepTalk × VitalSpan 产品级联调验收

> 在 running VitalSpan（`:8000` + `:5173`）与 DeepTalk `integrations/vitalspan` 就绪后执行。

## 1. 配置

- [ ] `integrations/vitalspan/config.yaml` 中 `vitalspan_root` 指向 VitalSpan 仓
- [ ] `VITALSPAN_DEV_ADMIN_PASSWORD` 已设置（或 config 对应 env）
- [ ] DeepTalk Agent 已内置 [AGENT-SYSTEM-PROMPT.md](./AGENT-SYSTEM-PROMPT.md)

## 2. CLI / 工具

在 `integrations/vitalspan/`：

```bash
python executor/cli.py vitalspan_health_check
python executor/cli.py vitalspan_publish_artifact --file examples/custom-viz-trend-line.json --health-first
python executor/cli.py vitalspan_list_artifacts
python executor/cli.py vitalspan_delete_artifact --artifact-id <uuid>
```

| 步骤 | 期望 |
|------|------|
| health | `ok health http://127.0.0.1:8000/health` |
| publish 趋势金样 | `ok artifactId=<uuid>` + `styleComplianceTier=full` |
| list | 列表含该组件 |
| delete | `ok deleted artifactId=...` → 204 |

## 3. 完成 Gate

```bash
python executor/cli.py vitalspan_completion_gate --workflow 2 --agent-summary "ok artifactId=00000000-0000-4000-8000-000000000001"
python executor/cli.py vitalspan_completion_gate --workflow 2 --agent-summary "已保存到 output/foo.json"
```

第二条应 **失败**（forbidden phrase）。

## 4. 前端 5173

- [ ] 图表盘「自定义」可见已 publish 组件
- [ ] 样式面板改色生效（bundle 读 `p.style`）
- [ ] 属主移除按钮 → DELETE 204

## 5. Agent 行为

- [ ] 趋势图问卷结束后 **自动 publish**，不再问「保存到 output/」
- [ ] 任务结束必须报 `artifactId`，不得仅报本地路径

## VitalSpan CI 参考

- [backend/tests/test_deeptalk_product_integration.py](../../../backend/tests/test_deeptalk_product_integration.py)
- [backend/tests/test_vs_ai_spec_tools.py](../../../backend/tests/test_vs_ai_spec_tools.py)
- [tests/test_ai_viz_hybrid.py](../../../tests/test_ai_viz_hybrid.py)
