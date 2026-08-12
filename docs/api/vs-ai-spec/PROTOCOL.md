# Custom Viz 沙箱插件协议（v1）

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
    "rendererHint": "vanilla"
  },
  "files": {
    "index.html": "<!DOCTYPE html>..."
  }
}
```

## 渲染器选择（可选，不强制）

customViz bundle **不限定**渲染技术栈。可选用原生 DOM/CSS、Canvas、SVG、内联 D3 等任意方式，须仍遵守下方安全约束。

| 项 | 说明 |
|----|------|
| 默认 | 不声明 `rendererHint`，平台不推断、不校验 |
| 可选元数据 | `manifest.rendererHint`: `"d3"` \| `"vanilla"` \| `"canvas"` \| `"svg"` |
| 平台行为 | **仅元数据**；[`validate_bundle_files`](../../../backend/app/ai_viz/models.py) 不校验、不拒绝 |
| D3 说明 | 选用 D3 **不等于**平台内置 D3 引擎；须在 bundle 内 **内联** D3 或子集，见 [guides/D3-OPTIONAL.md](./guides/D3-OPTIONAL.md) |
| 风格对齐 | **推荐**（非强制）使用 [theme-tokens.json](./theme-tokens.json) 中的 CSS 变量，与内置 chart 视觉接近 |
| 渲染器索引 | 见 [guides/RENDERERS.md](./guides/RENDERERS.md) |

## 安全约束

| 规则 | 说明 |
|------|------|
| 单文件入口 | `manifest.entry` 默认 `index.html`，须存在于 `files` |
| 禁外链脚本 | 不得含 `<script src="http...">` 或 `//cdn` |
| 禁内联事件 | 不得含 `onload=`、`onclick=` 等 |
| 大小上限 | 整包 ≤ 512KB（含 HTML） |
| 沙箱 | 平台以 `sandbox="allow-scripts"` 渲染（无 `allow-same-origin`） |

## 注册 API

`POST /api/v1/ai-viz/artifacts`

响应：`{ "artifactId": "<uuid>", "manifest": { ... } }`

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

## 数据（第一期）

- `dataBinding.status: "manual"`：用户稍后在平台绑字段；bundle 可用静态演示数据
- 第二期：`postMessage` 查询桥（`vs:query` / `vs:result`）另行文档化
