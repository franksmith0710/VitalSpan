# Compose + 样式补丁工作流（工作流 ③ 扩展）

> **铁律** → [IRON-RULES.md](../IRON-RULES.md) · **编排基础** → [DASHBOARD-LAYOUT.md](./DASHBOARD-LAYOUT.md)  
> **插件工具**：`vitalspan_compose_dashboard` → `vitalspan_get_dashboard_layout` → 改 JSON → `vitalspan_upload_dashboard`

## 原则

| 阶段 | 谁做 | 改什么 |
|------|------|--------|
| **① compose** | 插件 | 模板槽位、坐标、`chart_types`、演示 Dataset 绑定 |
| **② get** | 插件 | 拉回当前 `layoutJson` 到工作区 |
| **③ patch** | Agent | **只改样式**：`styleConfig`、`deStyle`、`customVizConfig.style` |
| **④ upload** | 插件 | `editor-save` 写回同一 `dashboardId` |

**禁止**在 patch 阶段重算 `x/y/width/height`（除非用户明确要求改布局）。

## 步骤

### 1. 搭骨架

```
vitalspan_compose_dashboard
  surface_kind=data-screen
  template=de-classic-cockpit
  chart_types=kpi,kpi,kpi,kpi,line,pie-donut,bar,map
  artifact_ids=<uuid>
  name=数据分析驾驶舱
```

记下输出的 `dashboardId=...`。

### 2. 导出 layout

```
vitalspan_get_dashboard_layout
  dashboard_id=<uuid>
  file=examples/my-screen.json
```

默认写入 `examples/dashboard-<id8>.json`（editor-save 可消费格式）。

### 3. 只改样式层

| 层级 | JSON 路径 | 示例 |
|------|-----------|------|
| 整屏 | `layoutJson.styleConfig` | `widgetStyle.borderRadius`、`titleStyle.color`、`canvasBackground` |
| 内置图 | `widgets[].chartConfig.nativeBody.deStyle` | `paletteColors`、`cartesian.barRadius`、`title.fontSize` |
| customViz | `widgets[].customVizConfig` | `style`（schema 键）、`displayStyle`、`widgetStyle` |

金样：[dashboard-style-patch.example.json](../examples/dashboard-style-patch.example.json)（纯 JSON，无 `_comment` 字段）

内置图若大改 `chartConfig`，建议先：

```bat
python tools\validate-chart-config.py --file examples\my-screen.json
```

（仅当文件内嵌了完整 `chartConfig` 对象时；整份 editor-save 需抽出单 widget 校验。）

### 4. 写回

```
vitalspan_upload_dashboard
  dashboard_id=<uuid>
  file=examples/my-screen.json
```

成功标志：输出含 `ok dashboardId=`；5173 打开 edit 链接验收。

## compose vs 写 JSON

两者最终都是同一份 `layoutJson` + `editor-save`：

- **compose**：自动生成坐标与演示绑定（快）
- **写 JSON**：从零或金样手写（细）
- **推荐**：compose → get → patch style → upload（兼顾速度与样式控制）

## compose 自动样式（v0.2.15+）

`vitalspan_compose_dashboard` 按**槽位高度**自动写入 `chartConfig.nativeBody.deStyle`：

| 场景 | 行为 |
|------|------|
| KPI / 仪表 槽高 ≤132px | **11px 紧凑标题** + 按高度缩放 KPI 字号（保留中文槽位名） |
| KPI 槽高 133–156px | 缩小标题字号 + 缩放 KPI |
| 图表槽高 &lt;200px | 缩小标题、隐藏图例 |
| 图表槽高 &lt;240px | 隐藏图例 |

已有大屏需 **重新 compose** 或 get 后手工 patch `deStyle` 再 upload。

## 数据绑定说明

- compose 内置图：官方演示 **Dataset**（`__demo:sample_db__` → 平台解析为 demo 数据源）
- 生产数据：用户在 5173 编辑器绑 Dataset；Agent 也可在 JSON 里写 `datasetId` + 字段编码
- customViz：layout 只引用 `artifactId`；实例样式走 `customVizConfig.style`

返回：[START-HERE.md](../START-HERE.md)
