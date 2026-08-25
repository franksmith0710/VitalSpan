# customViz 组件开发指南（Agent / DeepTalk 独立开发）

> 平台 SLA：[PLATFORM-SLA.md](./PLATFORM-SLA.md) · 铁律：[IRON-RULES.md](../IRON-RULES.md)

DeepTalk **不必**猜 70 步。固定流程：**脚手架 → 改 render → 本地预检 → publish**。

## 1. 标准流程（工作流 ②）

```bat
REM 0) 健康检查
python tools\check-vitalspan-health.py

REM 1) 从金样复制（禁止从零写 manifest）
python tools\scaffold-custom-viz.py --id my-widget --name 我的组件
REM 专用范式才指定 template，例如流动表：
REM python tools\scaffold-custom-viz.py --id my-scroll --name 流动表 --template scrolling-table

REM 2) 改 examples\my-scroll-table.bundle.html 或 JSON 内 index.html
REM    保留：host.vsCv.mount · (p&&p.style) · id=vs-cv-* · fieldSlots

REM 3) 本地预检（与 API 同规则，必须先过）
python tools\validate-ai-viz-bundle.py --file examples\my-scroll-table.json

REM 4) 入库
python tools\publish-ai-viz-artifact.py --file examples\my-scroll-table.json
REM 必须看到: ok artifactId=... styleComplianceTier=full warnings: none
```

插件：`vitalspan_publish_artifact` **会先跑本地预检**（v0.2.7+），失败直接返回「修复提示」，禁止盲试 POST。

## 2. 范式 × 金样（全部 5 套 scaffold · 禁止混用）

| 范式 | 何时用 | template | runtime | dimensions | metrics |
|------|--------|----------|---------|------------|---------|
| **P1 笛卡尔** | 类别 + 数值；排名/趋势 | `ranking-bar` · `trend-line` | html / d3 | min≥1，通常 max=1 | min≥1 |
| **P2 多维明细** | 多列平铺、无聚合 | **`scrolling-table`** | html | min≥1，max>1 | **min=0, max=0** |
| **P3 滚动条** | 单列文案 + 等级 | `alert-feed` | html | min=1, max=1 | min=1, max=1 |
| **P4 通用 DOM** | KPI/简单双列/未定 | `html-minimal` | html | min≥1 | min≥1 |

DeepTalk 插件真源：`deeptalk-plugins/plugins/vitalspan/assets/custom-viz-paradigms.json`

**不要**为每个业务 id 新建金样；在 scaffold 出的 `examples/<id>.json` 上改 HTML，**fieldSlots 须与范式一致**。

## 3. manifest 必填（缺一 422）

fieldSlots **随范式变化**，勿一律抄下面示例（P4 示例）：

```json
{
  "fieldSlots": {
    "dimensions": { "min": 1, "max": 6, "label": "维度列" },
    "metrics": { "min": 1, "max": 6, "label": "数值列" }
  },
  "styleSchema": {
    "type": "object",
    "properties": {
      "scrollSpeed": { "type": "number", "title": "滚动周期（秒）", "default": 36 }
    }
  },
  "defaultStyle": { "scrollSpeed": 36 }
}
```

- 时间轴维度可加 `"expect": "date"`（编辑器会拒绝 province 等非日期字段）
- 每个 `properties.*` 必须有中文 `"title"`
- **P2** 须 `metrics.min=0,max=0`；**P1/P3/P4** 须 `metrics.min≥1`（仅 P2 在 `dimensions.max>1` 时允许 metrics 为 0）
- 预检 `[warn] AIVIZ_WARN_DETAIL_TABLE_METRICS` = fieldSlots **不符合 P2 范式**（与 manifest.id 无关）

## 4. entry HTML 硬规则

| 必须 | 禁止 |
|------|------|
| `host.vsCv.mount(function (p) { ... })` | `window.__openclaw` / 自造 API |
| `var st = (p && p.style) \|\| {}` | `getStyle()` · `vs-cv-style-update` |
| `p.rows` / `p.columns` / `p.encoding` | 写死 `columns[0]` 当维度（应用 helpers） |
| `id="vs-cv-*"` | **`id="app"` · `id="root"`** |
| CSS 滚动 + `:hover { animation-play-state: paused }` | HTML `onclick=` · **`.onmouseenter=`** |
| `addEventListener('mouseenter', fn)` 若必须用 JS | `<script src="https://...">` · `javascript:` |

cartesian 数据解析（平台注入）：

```javascript
var h = host.vsCv.helpers;
var parsed = h.parseCategorySeries(payload, 6);
```

## 5. 422 速查

| code | 修复 |
|------|------|
| `AIVIZ_INVALID_MANIFEST` | 补 fieldSlots + styleSchema；`min >= 1` |
| `AIVIZ_UNSAFE_CONTENT` | 见 §4 禁止列；悬停优先纯 CSS |
| `AIVIZ_FORBIDDEN_HOST_ID` | 换掉 app/root |
| `AIVIZ_MOUNT_REQUIRED` | 加 `host.vsCv.mount` |
| partial / warnings | 补中文 title + `p.style` 驱动 DOM |

预检失败时工具会打印 `→ 修复:` 行，**按提示改一处再 validate**，不要循环改十处。

## 6. 完成判据

- 终端：`ok artifactId=<uuid>` + `styleComplianceTier=full`
- `vitalspan_completion_gate workflow=2` + publish 的 tool_stdout
- 5173 图表盘「自定义」：无 ⚠，样式面板中文且改动能生效

**禁止**：write_file 当交付 · output/ 目录 · 无 uuid 说「已完成」。
