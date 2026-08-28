# Compose + 样式补丁工作流（工作流 ③）

> **铁律** → [IRON-RULES.md](../IRON-RULES.md) · **编排基础** → [DASHBOARD-LAYOUT.md](./DASHBOARD-LAYOUT.md)  
> **插件工具**：`vitalspan_compose_dashboard` ·（按需）`vitalspan_get_dashboard_layout` → 改 JSON → `vitalspan_upload_dashboard`

## 两条路径

| 路径 | 何时 | 步骤 |
|------|------|------|
| **快路径（默认）** | 用户只要拼大屏/看板，**未**要求改视觉 | `compose` → `completion_gate` |
| **慢路径（按需）** | 用户要改风格/配色/边框/标题/品牌 | `compose` → `get` → patch → `upload` → gate |

**禁止**穷举行业 template；Agent 根据用户话自选 template 与色值，只改通用 JSON 字段。

## 原则

| 阶段 | 谁做 | 改什么 |
|------|------|--------|
| **① compose** | 插件 | 模板槽位、坐标、`chart_types`、绑数（manual/demo） |
| **② get** | 插件 | 拉回 `layoutJson`（**仅慢路径**） |
| **③ patch** | Agent | **只改样式**（整文件 write，勿碎片 edit_file） |
| **④ upload** | 插件 | `editor-save` 写回同一 `dashboardId` |

**禁止** patch 阶段改 `x/y/width/height`（除非用户明确要求改布局）。

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
  name=数据分析驾驶舱
  data_binding=demo
```

记下 `dashboardId=` → `completion_gate workflow=3`（tool_stdout = compose 输出）。

## 慢路径步骤

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

金样：[dashboard-style-patch.example.json](../examples/dashboard-style-patch.example.json)

### 4. 写回

```
vitalspan_upload_dashboard
  dashboard_id=<uuid>
  file=examples/my-screen.json
```

`completion_gate` 须用 **upload** 的 stdout（用户声称改风格时）。

## compose 自动样式（v0.2.15+）

按槽位高度写入 `deStyle`（隐藏重复标题、KPI 缩放、小槽隐藏图例等）。未提换肤时通常够用。

## 数据说明

- `demo`：内置图绑官方演示 Dataset（走查）；须 sample-mysql + seed
- `manual`：5173 手绑 Dataset
- customViz：layout 只引用 `artifactId`；实例样式走 `customVizConfig`

返回：[START-HERE.md](../START-HERE.md)
