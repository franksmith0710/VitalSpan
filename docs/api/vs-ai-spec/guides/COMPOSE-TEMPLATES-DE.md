# Compose 大屏模板 · DataEase 工整参考

> **铁律** → [IRON-RULES.md](../IRON-RULES.md) · **工作流** → [COMPOSE-STYLE-WORKFLOW.md](./COMPOSE-STYLE-WORKFLOW.md)

DeepTalk **workflow ③** 拼大屏时，优先用带 **`de-recommended`** 标签的模板；compose 会自动：

1. 插入 **顶栏标题 + 时钟**（对标 DataEase 大屏壳）
2. 按槽位 **`defaultChartType`** 填内置图（不必手传完整 `chart_types`）
3. customViz 槽无 `artifact_ids` 时 → **富文本占位**（不再留空带）

## 推荐模板（数据大屏 · 1920×1080）

| template id | 场景 | 结构 |
|-------------|------|------|
| **`de-classic-cockpit`** | **默认首选** | 四 KPI + 线/饼/柱/地图 + AI 洞察带 |
| `de-sales-command` | 销售指挥 | 四 KPI + 宽趋势 + 饼/地图 + 明细表 |
| `de-balanced-four` | 最工整四象限 | 2×2 柱/线/饼/雷达 |
| `de-map-command` | 地理分析 | 居中大地图 + 侧栏 KPI/排名/占比 |
| `de-kpi-flow-wall` | 链路/流向 | 四 KPI + sankey + 四象限 |
| `gov-cockpit` | 政务风（同经典布局） | 与 de-classic 同类，cyan accent |

清单：`vitalspan_list_layout_templates` · 索引 `assets/layout-templates/index.json` 的 `recommendedDataScreen`。

## Agent 最小调用

```
vitalspan_compose_dashboard
  surface_kind=data-screen
  template=de-classic-cockpit
  name=数据分析驾驶舱
```

可选：

- `chart_types=` — **覆盖**槽位默认类型（顺序与模板 chart 槽一致）
- `artifact_ids=` — 填入 customViz 槽（如 AI 洞察）；不传则用占位文案

## 与 DataEase 内置模板的区别

| 项 | compose 模板 | 5173「从模板创建」 |
|----|--------------|-------------------|
| 入口 | DeepTalk Agent | 管理面 UI |
| 壳层 | compose 自动 title+clock | 平台 `presets.py` 含边框/背景图 |
| 数据 | 演示 Dataset | 官方 demo SQL |
| 改布局 | 换 `template=` 重 compose | 编辑器拖拽 |

要 **DE 官方种子级**视觉（边框装饰、专用 SQL）→ 5173 从 **`workspace-digital-cockpit`** 等平台模板创建；  
要 **Agent 一键可复现** → 用本页 **`de-*`** 模板。

## 样式微调

compose 后：`get_dashboard_layout` → 只 patch `styleConfig` / `deStyle` → `upload_dashboard`（勿改 x/y）。

返回：[DASHBOARD-LAYOUT.md](./DASHBOARD-LAYOUT.md)
