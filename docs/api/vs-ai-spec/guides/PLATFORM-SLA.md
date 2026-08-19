# customViz 平台 SLA（PLATFORM-SLA）

> 与 [PROTOCOL.md](../PROTOCOL.md) · [D3-OPTIONAL.md](./D3-OPTIONAL.md) · [HTML-RUNTIME.md](./HTML-RUNTIME.md) 配套  
> 开工规格：[`docs/specs/customviz-platform-sla.md`](../../../specs/customviz-platform-sla.md)

## 架构前提

L3 customViz 采用 **唯一 Base**（`CustomVizWidget`）+ `POST/PUT /api/v1/ai-viz/artifacts` 存库 + `GET .../entry` 异步挂载。**不**走内置 `renderD3Chart`、**不**动态注册 chartType（F17 Out）。

标准柱/线/表/地图 → 优先 **L1/L2 chartConfig**；仅 KPI/自定义 DOM/SVG 数据图走 customViz。

## 平台保证（html / d3 共有）

| 能力 | 说明 |
|------|------|
| 查数 | 合成 `table` execute；`bindingStatus` 注入 Payload |
| 筛选联动 | 看板 filter / linkage 已过滤 execute 结果 |
| 行数 cap | 500 行；`truncated` + **壳层横幅**（非 bundle 自写） |
| 宿主尺寸 | `payload.layout` 随 resize 更新 |
| 轴抽稀计划 | `payload.axisPlan.categoryTickIndices`（bound + 有 layout 时） |
| 生命周期 | **`host.vsCv.mount(renderFn)`** — payload/layout 变化时 Base 自动调用 render |
| 平台 d3 | `host.vsCv.d3`（禁内联整库） |
| 样式 token | `--dashboard-*` · `--vs-style-*` · `--vs-palette-*` |

## html runtime

| 必须 | 可选 |
|------|------|
| `vsCv.mount(render)` | 任意 DOM/CSS 结构 |
| Payload 状态机（unbound/empty/error/bound） | styleSchema 扩展项 |
| fieldSlots / styleSchema / 安全红线（入库 lint） | — |
| render 内读 `p.layout` 调整布局 | — |

平台**不**保证任意 DOM 自动美观；只保证数据/配置/生命周期纪律。

## d3 runtime

| 必须 | 可选 |
|------|------|
| `vsCv.mount(render)`（**入库 lint 422**） | `vsCv.draw.*` 参考 API（Phase 2） |
| 读 `payload.layout` 设定 SVG 尺寸 | 自写 d3 绘制逻辑 |
| 读 `payload.axisPlan.categoryTickIndices` 画 X 轴 tick | `helpers.thinCategoryTickIndices` 兜底 |
| Payload 状态机 | — |

禁止：`clientWidth || 320` 作为**唯一**尺寸来源（lint 建议避免）。

## vsCv.mount 契约

```javascript
host.vsCv.mount(function (payload) {
  // payload: protocolVersion, bindingStatus, columns, rows, style,
  //           layout?, axisPlan?, truncated?, rowCap?, error?
  render(payload);
});
```

- Base 在注册 mount 与每次 payload/layout 更新后调用 `renderFn(getPayload())`。
- 返回 disposer；重复 mount 替换上一 renderFn。
- `onPayload` / `onLayout` 仍可用（兼容），官方示例与 lint 以 **mount** 为准。

## Payload v1 扩展

```json
{
  "layout": { "width": 640, "height": 240 },
  "axisPlan": {
    "categoryCount": 40,
    "categoryTickIndices": [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 39]
  },
  "truncated": true,
  "rowCap": 500
}
```

## 入库 lint（POST/PUT）

| 规则 | 错误码 |
|------|--------|
| d3 须含 `vsCv.mount` | `AIVIZ_MOUNT_REQUIRED` |
| 禁 `id="root"` / `id="app"` | `AIVIZ_FORBIDDEN_HOST_ID` |
| 禁外链 script / 内联事件 / 内联 d3 整库 | 既有 AIVIZ_* |

## 老 artifact

已入库制品不会自动改写；须 **PUT 覆盖** 后才享受 mount/axisPlan/壳层 SLA。官方示例见 `docs/api/vs-ai-spec/examples/`。
