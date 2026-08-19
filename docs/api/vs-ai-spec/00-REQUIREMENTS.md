# 规范要求（L3 customViz · 必读）

解压后**先读本文件**。不满足下列任一条 = 未对接成功。

## 1. 完成定义

必须对 **正在运行的 VitalSpan** 发出 HTTP，并拿到 `artifactId`。

```
POST {API}/ai-viz/artifacts
Authorization: Bearer {JWT}
Content-Type: application/json
```

- `{API}` 本机：`http://127.0.0.1:8000/api/v1`（服务要先启动）
- 成功：**201** + JSON 含 `artifactId`
- 更新：同一 id 再 `PUT {API}/ai-viz/artifacts/{artifactId}`

下列**全部不算完成**：

- 只把 HTML/JSON 写到操作者桌面或 `examples/`
- 用浏览器打开 `demo-*.html`
- 产出 `runtime: vanilla` / React / WebGL / `.iife.js` / 外链打包

## 2. 请求体形状（唯一合法）

与 `examples/custom-viz-d3-bundle.json` 相同层级：

```json
{
  "manifest": {
    "id": "my-widget-v1",
    "displayName": "名称",
    "version": "1.0.0",
    "entry": "index.html",
    "runtime": "html",
    "fieldSlots": {
      "dimensions": { "min": 1, "max": 1, "label": "类别" },
      "metrics": { "min": 1, "max": 1, "label": "数值" }
    },
    "styleSchema": {
      "type": "object",
      "properties": { "accentColor": { "type": "string", "format": "color" } }
    },
    "defaultStyle": { "accentColor": "#465fff" }
  },
  "files": {
    "index.html": "<!DOCTYPE html><html>…内联 style 与 script…</html>"
  }
}
```

| 必填 | 规则 |
|------|------|
| `manifest.runtime` | 仅 `html` 或 `d3` |
| d3 入口脚本 | 必须含 `host.vsCv.mount(`，否则 **422** `AIVIZ_MOUNT_REQUIRED` |
| `manifest.entry` | 必须是 `index.html` 且出现在 `files` |
| `files` | 仅 `.html` / `.css` / `.svg`；脚本须写在 HTML 内联 `<script>` |
| `fieldSlots` | dimensions、metrics 的 `min >= 1` |
| `styleSchema.properties` | 至少 1 个样式键 |
| 体积 | 整包 ≤ 2MB；禁止内联 d3 整库 |

## 3. 画图怎么读数

平台注入 `host.vsCv`（见 [guides/PLATFORM-SLA.md](./guides/PLATFORM-SLA.md) · `PROTOCOL.md`）：

- **必须** `host.vsCv.mount(renderFn)`（d3 入库 lint；html 强烈推荐）
- 读 `payload.layout` / `payload.axisPlan.categoryTickIndices`
- **不要**自己定义 `dataSchema`、`eventSchema`、向 VitalSpan 推业务行

未绑数：`bindingStatus === "unbound"`，显示「请在右侧绑定数据集与字段」。

## 4. 路径决策

| 要做的事 | 用什么 |
|----------|--------|
| 标准柱/线/表/地图 | L1/L2 `chartConfig`（**不是** customViz） |
| KPI / DOM / 滚动 | L3 `runtime: html` |
| 自定义 D3/SVG | L3 `runtime: d3` |

## 5. 本机怎么传（Windows）

1. 后端：`uvicorn` 监听 8000（`GET http://127.0.0.1:8000/health` 要通）
2. 在本包根目录：

```bat
python tools\upload-ai-viz-artifact.py
```

默认上传 `examples/custom-viz-d3-bundle.json`。换文件：

```bat
python tools\upload-ai-viz-artifact.py --file examples\custom-viz-bundle.json
```

账号默认 `admin`，密码 `VITALSPAN_DEV_ADMIN_PASSWORD`（未设则 `changeme`）。  
打印出的 `artifactId` 填进大屏 `customVizConfig.artifactId`。

## 6. 拒收示例（不要生成）

- `runtime: "vanilla"` / `"react"` / `"webgl"`
- `"entry": "dist/realtime-chart.iife.js"`
- 顶层 `dataSchema`、`eventSchema`、`authors` 当主契约
- `<script src="https://cdn...">`

黄金样例只用：`examples/custom-viz-bundle.json`、`custom-viz-d3-bundle.json`，以及 pulse / ring / alert。

## 7. 怎么发 HTTP（不要用 DeepTalk 网页跨域 fetch）

必须从 **DeepTalk 服务端** 或本机脚本 POST（`tools/upload-ai-viz-artifact.py` / `curl`）。

浏览器里从 DeepTalk 自己的域名去打 VitalSpan，会被 CORS 拦住（平台 `CORS_ORIGINS` 默认只放行本机前端）。**打开本地 html、把文件写到桌面，都不算上传。**

联调若必须浏览器直打，由 VitalSpan 把 DeepTalk 源站加入 `CORS_ORIGINS`，不要改组件契约。

