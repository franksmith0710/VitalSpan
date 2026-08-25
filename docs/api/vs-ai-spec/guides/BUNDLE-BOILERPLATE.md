# customViz entry 脚本通用模板（html / d3）

> 入库前须与 [HTML-RUNTIME.md](./HTML-RUNTIME.md) · [CUSTOM-VIZ-AUTHOR.md](./CUSTOM-VIZ-AUTHOR.md) 一致。  
> 平台在挂载 bundle 前会为宿主补 `getElementById` 兼容层，但**新组件仍须按本模板写**，避免多实例与 resize 不同步。

## 1. 脚本外壳（复制即用）

```javascript
(function () {
  var host = document.currentScript && document.currentScript.parentElement;

  /** 宿主内查节点：禁止 document.getElementById；禁止 (host||document).getElementById */
  function $(id) {
    return host ? host.querySelector("#" + id) : document.getElementById(id);
  }

  function bindingStatus(p) {
    if (!p) return "unbound";
    return p.bindingStatus || (p.rows && p.rows.length ? "bound" : "unbound");
  }

  function statusHint(p) {
    var st = bindingStatus(p);
    if (st === "error") return (p && p.error) || "数据加载失败";
    if (st === "empty") return "暂无数据";
    if (st === "unbound") return "请在右侧绑定数据集与字段";
    return null;
  }

  function render(p) {
    p = p || {};
    var st = (p && p.style) || {};
    var hint = statusHint(p);
    // … 读 p.columns / p.rows / p.encoding / p.layout …
  }

  if (host && host.vsCv && host.vsCv.mount) {
    host.vsCv.mount(render);
  } else {
    render({});
  }
})();
```

## 2. DOM 查找（硬规则）

| ✅ 推荐 | ❌ 禁止 |
|--------|--------|
| `host.querySelector("#vs-cv-…")` | `document.getElementById`（同页多 customViz 抢节点） |
| 上表 `$("vs-cv-track")` 辅助函数 | `(host \|\| document).getElementById`（宿主是 `div`，无原生 `getElementById`） |
| 节点 `id` 前缀 `vs-cv-` | `id="root"` · `id="app"` |

d3 选区：

```javascript
var svg = host.vsCv.d3.select(host.querySelector("#vs-cv-chart"));
```

## 3. 数据与样式

| 项 | 约定 |
|----|------|
| 样式 | `var st = (p && p.style) \|\| {}`；禁 `getStyle()` / 自造 style 事件 |
| 列/行 | `p.columns` · `p.rows`；维/指字段名用 `p.encoding.dimensions` / `.metrics` |
| 尺寸 | 读 `p.layout.width` / `p.layout.height`；禁仅 `clientWidth \|\| 320` 作唯一依据 |
| 生命周期 | **必须** `host.vsCv.mount(render)`（html / d3 均如此） |

## 4. 容器自适应与溢出（DeepTalk 组件通用）

用户拖大/拖小 widget 时，**内容须随 `p.layout` 等比缩放**（字号、间距、柱高、图标等用 `--vs-scale` 或 `clamp()`，勿写死 px）。

**溢出策略**（列表/明细类默认）：

| 场景 | 做法 |
|------|------|
| 容器够大 | 全部可见，无滚动条 |
| 内容多于可视区 | **组件内** `overflow-y: auto`（或等价滚动区） |
| 容器太小 | **能展示多少就多少**，其余滚动查看 |
| 数据量控制 | **数据 Tab「结果展示」** 控制 LIMIT；bundle 用 `payload.rows` 全量渲染；溢出见 §4 滚动 |

结构建议：

```css
html, body { height: 100%; overflow: hidden; }
#vs-cv-root { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
#vs-cv-scroll { flex: 1; min-height: 0; overflow-y: auto; }
```

- 外层 `overflow: hidden` 防止撑破 widget 壳；**滚动发生在组件内 designated 区域**
- 禁止「固定 px 布局 + 忽略 layout 变化」；禁止为塞满而 `flex:1` 压扁每一行到不可读
- 特例：P1/P2 **自动滚动**范式（`scrolling-table` 等）用动画 viewport，不用用户手滚

金样：`examples/custom-viz-podium-leaderboard.json` · `examples/scrolling-table.bundle.html`

## 5. 预检告警码

| code | 含义 |
|------|------|
| `AIVIZ_WARN_DOM_HOST_LOOKUP` | 使用了 `(host\|\|document).getElementById` |
| `AIVIZ_WARN_DOM_DOCUMENT_LOOKUP` | entry 内使用 `document.getElementById` |
| `AIVIZ_WARN_MOUNT_RECOMMENDED` | html runtime 未 `vsCv.mount` |
| `AIVIZ_MOUNT_REQUIRED` | d3 runtime 未 `vsCv.mount`（422） |

修复提示见 `assets/aiviz-publish-hints.json`。

## 6. 金样

| 范式 | 模板 | 可编辑 `.bundle.html` |
|------|------|------------------------|
| P2 流动明细 | `scrolling-table` | `examples/scrolling-table.bundle.html` |
| P4 通用 DOM | `html-minimal` | `examples/html-minimal.bundle.html` |
| P1 滚动条图 | `dynamic-scroll-chart` | `examples/dynamic-scroll-chart.bundle.html` |

脚手架：`python tools/scaffold-custom-viz.py --id my-x --name 名称 --template scrolling-table`
