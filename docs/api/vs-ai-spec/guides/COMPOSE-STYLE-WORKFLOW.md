# Compose + 样式补丁工作流（工作流 ③）

> **铁律** → [IRON-RULES.md](../IRON-RULES.md) · **编排基础** → [DASHBOARD-LAYOUT.md](./DASHBOARD-LAYOUT.md)  
> **插件工具**：`vitalspan_compose_dashboard` ·（按需）`vitalspan_get_dashboard_layout` → 改 JSON → `vitalspan_upload_dashboard`

## 品大屏（compose 前）

模板 **借鉴** DataEase 式布局语法（顶栏 · KPI 带 · 主辅图区），**不是**抄 DE 成品。

| 步骤 | Agent 须想清 |
|------|----------------|
| 故事线 | 看谁 · 一屏答哪 3～5 问 · 上→下节奏 |
| 选 template | `chart`/`customViz` 槽数与高宽；矮槽禁折线/竞赛 |
| chart_types | 按槽位语义覆盖默认，禁止机械粘贴模板默认序列 |
| artifact_ids | 只填 cv 槽；`artifact` 数 > cv 槽须先向用户说明 |
| 槽位匹配 | 环图/竞赛不进 112px 底条；KPI 槽不进 customViz |

**禁止**穷举行业 template；Agent 根据用户话自选 template 与色值，只改通用 JSON 字段。

## 三条路径

| 路径 | 何时 | 步骤 |
|------|------|------|
| **快路径（默认）** | 故事线与 compose 一致；**未**要求改视觉/布局 | `compose` → `completion_gate` |
| **慢路径 A（样式）** | 用户要改风格/配色/边框/标题/品牌 | `compose` → `get` → patch 样式 → `upload` → gate |
| **慢路径 B（叙事/布局）** | 须删 widget / 改业务标题 / 挪位置才合逻辑 | `compose` → `get` → patch 标题·删 widget·x/y → `upload` → gate |

## 原则

| 阶段 | 谁做 | 改什么 |
|------|------|--------|
| **① compose** | 插件 | 模板槽位、坐标、语义化 `chart_types`、绑数（manual/demo） |
| **② get** | 插件 | 拉回 `layoutJson`（**慢路径**） |
| **③ patch** | Agent | **A** 只改样式 · **B** 改标题/删 widget/坐标（整文件 write） |
| **④ upload** | 插件 | `editor-save` 写回同一 `dashboardId` |

慢路径 A **禁止**改 `x/y/width/height`。慢路径 B 仅在叙事需要时改布局。

## 绑数

| 用户意思 | compose 参数 |
|----------|----------------|
| 演示 / 预览 / 能看 | `data_binding=demo` |
| 正式 / 未提 | `manual`（默认） |

## 快路径示例

```
vitalspan_compose_dashboard
  surface_kind=data-screen
  template=de-classic-cockpit
  chart_types=kpi,kpi,kpi,kpi,line,bar,bar,map
  name=数据分析驾驶舱
  data_binding=demo
```

`chart_types` 须与故事线一致，不是无脑用模板默认 `line,pie-donut,bar,map`。

记下 `dashboardId=` → `completion_gate workflow=3`（tool_stdout = compose 输出）。

## 慢路径 A — 样式

### 1. compose（同上）

### 2. 导出 layout

```
vitalspan_get_dashboard_layout
  dashboard_id=<uuid>
  file=examples/my-screen.json
```

**get 的 stdout 不是 wf3 完成证据** — 不能传给 completion_gate。

### 3. 只改样式层

| 层级 | JSON 路径 |
|------|-----------|
| 整屏 | `layoutJson.styleConfig` |
| 内置图 | `widgets[].chartConfig.nativeBody.deStyle` |
| customViz | `widgets[].customVizConfig.style` / `displayStyle` / `widgetStyle` |

### 4. 写回

```
vitalspan_upload_dashboard
  dashboard_id=<uuid>
  file=examples/my-screen.json
```

`completion_gate` 须用 **upload** 的 stdout（用户声称改风格时）。

## 慢路径 B — 叙事/布局

当 compose 填满所有 chart 槽但故事线只需要部分图，或占位标题须改成业务名、customViz 须更高槽位时：

1. `get_dashboard_layout` 同上
2. **整文件 write**：改 `widgets[].title` · 从 `layoutJson.widgets` **删除**多余项 · 按需改 `x/y/width/height`
3. `upload_dashboard` → gate 用 upload stdout（声称「布局/摆放已优化」时必须）

## compose 自动样式（v0.2.15+）

按槽位高度写入 `deStyle`（隐藏重复标题、KPI 缩放、小槽隐藏图例等）。未提换肤时通常够用。

## 数据说明

- `demo`：内置图绑官方演示 Dataset（走查）；须 sample-mysql + seed
- `manual`：5173 手绑 Dataset
- customViz：layout 只引用 `artifactId`；实例样式走 `customVizConfig`

返回：[START-HERE.md](../START-HERE.md)
