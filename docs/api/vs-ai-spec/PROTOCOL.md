# Custom Viz 组件库协议（v1）

> 一个 Base（`CustomVizWidget`）从接口异步加载库中源码，挂进看板主页面。  
> 仓库不为每个组件增加 tsx/py。  
> **对接完成标准、合法请求体、本机上传**：见 [00-REQUIREMENTS.md](./00-REQUIREMENTS.md)。

## Bundle 结构

```json
{
  "manifest": {
    "id": "ranking-strip-v1",
    "displayName": "排名条",
    "version": "1.0.0",
    "entry": "index.html",
    "fieldSlots": {
      "dimensions": { "min": 1, "max": 1, "label": "类别" },
      "metrics": { "min": 1, "max": 1, "label": "数值" }
    },
    "styleSchema": {
      "type": "object",
      "properties": {
        "accentColor": { "type": "string", "format": "color" },
        "barHeight": { "type": "number", "minimum": 8, "maximum": 48 }
      }
    },
    "defaultStyle": {
      "accentColor": "#3b82f6",
      "barHeight": 24
    },
    "runtime": "html",
    "rendererHint": "vanilla"
  },
  "files": {
    "index.html": "<!DOCTYPE html>..."
  }
}
```

## 渲染器（仅 html / d3）

customViz **只支持两种 runtime**。ECharts / AntV 不提供；标准图走 L1/L2 `chartConfig`。

| `manifest.runtime` | 说明 |
|--------------------|------|
| `html`（默认） | DOM / CSS / SVG / Canvas；读 `host.vsCv` 的 payload |
| `d3` | 使用平台注入的 **d3@7.9.0**（`host.vsCv.d3`），**禁止**把 d3 整库打进制品 |

未声明 `runtime` 时：若旧字段 `rendererHint === "d3"` 则视为 `d3`，否则 `html`。`rendererHint` 仅为兼容别名。

Base 在跑 bundle 脚本前给宿主挂 `host.vsCv`：`getPayload()`、`onPayload(fn)`、`d3`。见下方 vsCv。

## 加载方式

1. AI：`POST /api/v1/ai-viz/artifacts` 把 HTML 源码存进库；同一 ID 用 `PUT` 覆盖
2. 大屏 layout 只记 `customVizConfig.artifactId`
3. Base（`CustomVizWidget`）`GET .../entry` 拉源码（带 `?h=<contentHash>` 防缓存）；**页签重新可见时**再拉 meta+entry，以便 PUT 覆盖后不必关页也能换新 HTML。挂进主页面宿主 DOM。

## 约束

| 规则 | 说明 |
|------|------|
| 单文件入口 | `manifest.entry` 默认 `index.html`，须存在于 `files` |
| 禁外链脚本 | 不得含 `<script src="http...">` 或 `//cdn` |
| 禁内联事件 | 不得含 `onload=`、`onclick=` 等 |
| 大小上限 | 整包 ≤ **2MB**（仅组件 HTML/CSS/内联脚本；**不含**平台 d3） |
| 禁内联 d3 整库 | 单文件 ≥200KB 且含 `d3.version` → 422 `AIVIZ_INLINE_D3_FORBIDDEN`，改用 `host.vsCv.d3` |
| runtime | `html` 或 `d3`（见上表） |
| 数据槽位 | **必填** `manifest.fieldSlots`：`dimensions` 与 `metrics` 均须 `min >= 1` |
| 样式声明 | **必填** `manifest.styleSchema.properties`（至少 1 项）；推荐同时提供 `defaultStyle`；**可声明平台从未出现过的样式键**，见 [guides/STYLE-SCHEMA.md](./guides/STYLE-SCHEMA.md) |
| 节点查找 | 禁止 `document.getElementById`（同页多实例会抢节点）。画图节点用宿主内 `querySelector`。禁止 `id="root"` / `id="app"`（与平台 SPA 冲突） |
| CSS 作用域 | 挂载时选择器会收到 `.vs-custom-viz-host`；宿主已注入 `--dashboard-*`，不必再用 `:root` 改全局 |

## 注册与更新 API

`POST /api/v1/ai-viz/artifacts` — 新建，响应 `{ "artifactId": "<uuid>", "manifest": { ... } }`

`PUT /api/v1/ai-viz/artifacts/{id}` — 覆盖同一组件源码；引用该 ID 的看板/大屏下次打开即新代码

## 挂到看板/大屏

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "customViz",
  "title": "AI 排名条",
  "x": 0,
  "y": 0,
  "width": 480,
  "height": 240,
  "order": 0,
  "customVizConfig": {
    "artifactId": "<artifactId>",
    "dataBinding": { "status": "manual" }
  }
}
```

## 运行时数据与样式（平台 → 宿主）

Base 在绑定就绪后走 `query/execute`，并**始终**向 `.vs-custom-viz-host` 注入 payload（含未绑定时 `bindingStatus: "unbound"`）：

1. **JSON 载荷**：宿主内 `<script type="application/json" class="vs-cv-payload">`，结构见 **Payload v1**（下方）
2. **样式变量**：`style` 各键映射为 `--vs-style-<kebab-case>` 写在宿主元素 `style` 上（与 manifest `defaultStyle` + layout `customVizConfig.style` 合并）；boolean 为 `true`/`false` 字符串

### Payload v1

```json
{
  "protocolVersion": 1,
  "bindingStatus": "bound",
  "columns": ["region", "amount"],
  "rows": [["华东", 100]],
  "style": { "accentColor": "#3b82f6" },
  "error": "可选；仅 bindingStatus=error 时出现"
}
```

| `bindingStatus` | 含义 |
|-----------------|------|
| `unbound` | 未绑 Dataset / 字段，或 execute 尚未就绪 |
| `bound` | 已绑定且 execute 返回行 |
| `empty` | 已绑定但结果集为空 |
| `error` | execute 失败；读 `error` 人话说明 |

AI 可在 `styleSchema` 中自由声明颜色、滑块、开关、下拉、文本等控件类型，平台自动生成配置栏，详见 [guides/STYLE-SCHEMA.md](./guides/STYLE-SCHEMA.md)。

### vsCv（推荐）

```js
var host = document.currentScript.parentElement;
var vsCv = host.vsCv;
function render(p) {
  p = p || vsCv.getPayload();
  if (!p || p.bindingStatus !== "bound") return;
  vsCv.d3.select(host).select("#vs-cv-chart"); // 不要 document.getElementById
}
render();
vsCv.onPayload(render);
```

也可继续监听 **`vs-cv-payload-update`**。**禁止** MutationObserver 盯宿主。推荐 `getComputedStyle(host)` 读 `--vs-style-*`。

未绑定时依据 `bindingStatus === "unbound"` 显示引导，**不要**假装已有业务数据。

## Schema 文件（磁盘名）

| 路径 | 说明 |
|------|------|
| `schemas/layout.schema.json` | layoutJson v2（**请用此文件名**） |
| `schemas/layout-v2.schema.json` | 同上，兼容旧 `$id` / 误写的文件名 |
| `schemas/custom-viz-plugin.schema.json` | 注册 artifact 请求体 |
| `schemas/styles.schema.json` | `manifest.styleSchema` |
| `schemas/tokens.schema.json` | `theme-tokens.json` 外形 |

## 数据（第一期）

- `dataBinding.status: "manual"`：用户稍后在平台绑字段；bundle 可用静态演示数据
- 平台绑字段后走与内置 chart 相同的 `query/execute`；**不在 layout 写入合成 chartType**
