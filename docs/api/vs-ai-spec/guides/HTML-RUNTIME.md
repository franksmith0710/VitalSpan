# html runtime 配置严格清单

> 与 [PLATFORM-SLA.md](./PLATFORM-SLA.md) · [D3-OPTIONAL.md](./D3-OPTIONAL.md) 对称  
> `manifest.runtime`: **`html`**

## 必须

| 项 | 说明 |
|----|------|
| `vsCv.mount(render)` | payload/layout 变化时重绘 |
| `fieldSlots` | dimensions + metrics 均 `min >= 1` |
| `styleSchema.properties` | 至少 1 项（可仅扩展项；平台六块走 displayStyle） |
| Payload 状态机 | unbound → 绑定引导；empty/error → 人话提示 |
| 节点查找 | 宿主内 `querySelector('#vs-cv-*')` 或 [BUNDLE-BOILERPLATE.md](./BUNDLE-BOILERPLATE.md) `$()`；**禁** `document.getElementById` · **禁** `(host\|\|document).getElementById` |
| 禁 `id="root"` / `id="app"` | 入库 lint |
| 安全 | 禁 CDN script、内联事件、`javascript:` |

## 视觉自由区

- 任意 DOM 结构、CSS 动画、flex/grid 排版
- KPI 带、滚动条、告警 feed 等形态
- render 内读 `payload.style` → `--vs-style-*` 已注入宿主

## resize · 溢出

- 读 `payload.layout.width/height` 在 render 内调整字号/间距/图表尺寸；**不要**仅依赖首次 `clientWidth`；mount 会在拖大组件后重调 render
- **通用策略**：容器够大则全展示；内容过多或 widget 太小 → **组件内** `overflow-y: auto`（`flex:1; min-height:0`）；能展示多少就多少，其余滚动
- 数据条数用 styleSchema（如 `maxItems`）或平台 `truncated` 控制；**不要**为塞满而压扁行高
- 详见 [BUNDLE-BOILERPLATE.md](./BUNDLE-BOILERPLATE.md) §4

## 参考

- 官方示例：`examples/custom-viz-bundle.json` · `custom-viz-pulse-kpi.json` · `custom-viz-ring-progress.json`
