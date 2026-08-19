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
| 节点查找 | 宿主内 `querySelector`；禁 `document.getElementById` |
| 禁 `id="root"` / `id="app"` | 入库 lint |
| 安全 | 禁 CDN script、内联事件、`javascript:` |

## 视觉自由区

- 任意 DOM 结构、CSS 动画、flex/grid 排版
- KPI 带、滚动条、告警 feed 等形态
- render 内读 `payload.style` → `--vs-style-*` 已注入宿主

## resize

- 读 `payload.layout.width/height` 在 render 内调整
- **不要**仅依赖首次 `clientWidth`；mount 会在拖大组件后重调 render

## 参考

- 官方示例：`examples/custom-viz-bundle.json` · `custom-viz-pulse-kpi.json` · `custom-viz-ring-progress.json`
